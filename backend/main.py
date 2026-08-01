"""
main.py — GeoTrack API v3
Features: 2FA, OTP email verification, audit logs, session timeout,
          account lockout, password policy, charts data, export endpoints.
"""
import os, secrets, random, string
from datetime import datetime, timedelta
from typing import List, Optional
from io import BytesIO

import pyotp
from fastapi import FastAPI, Depends, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models, schemas
from database import engine, get_db, Base
from auth import hash_password, verify_password, create_access_token, require_student, require_osas_admin

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GeoTrack API", version="3.0.0")

_origins_env = os.getenv("ALLOWED_ORIGINS", "")
# Browsers reject "Access-Control-Allow-Origin: *" together with credentialed
# requests (the frontend sends a Bearer token / cookies), so "*" can never be
# used here. Fall back to the known deployed frontend domains instead of a
# wildcard when ALLOWED_ORIGINS isn't set in the environment.
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()] or [
    "https://geotrack-osas.vercel.app",
    "https://geotrack-lspu.vercel.app",
    "http://localhost:5173",
]
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

MAX_FAILED = 5
LOCKOUT_MINS = 5
ARCHIVE_YEARS = 3
DELETE_YEARS = 5


# ─── Helpers ─────────────────────────────────────────────────────────────────
def log_action(db: Session, actor: Optional[models.User], action: str,
               resource_type: str, resource_id: Optional[int] = None,
               resource_label: Optional[str] = None, detail: Optional[str] = None):
    db.add(models.AuditLog(
        actor_id=actor.id if actor else None,
        actor_name=actor.full_name if actor else "System",
        actor_role=actor.role if actor else "system",
        action=action, resource_type=resource_type,
        resource_id=resource_id, resource_label=resource_label, detail=detail,
    ))
    db.commit()


def make_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def lifecycle_sweep(db: Session):
    now = datetime.utcnow()
    for s in db.query(models.User).filter(models.User.role == "student").all():
        if s.archived_at is None:
            last = (db.query(models.StatusUpdate)
                    .filter(models.StatusUpdate.student_id == s.id,
                            models.StatusUpdate.status_type.in_(["same", "transferred"]))
                    .order_by(models.StatusUpdate.created_at.desc()).first())
            if (last.created_at if last else s.created_at) < now - timedelta(days=365*ARCHIVE_YEARS):
                s.archived_at = now
        elif s.archived_at < now - timedelta(days=365*DELETE_YEARS):
            db.delete(s)
    db.commit()


# ─── AUTH ─────────────────────────────────────────────────────────────────────
@app.post("/api/auth/register/student", response_model=schemas.TokenResponse)
def register_student(payload: schemas.RegisterStudentRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(400, "Email already registered.")
    otp = make_otp()
    user = models.User(
        full_name=payload.full_name, email=payload.email,
        hashed_password=hash_password(payload.password),
        role="student", course_section=payload.course_section, gender=payload.gender,
        is_email_verified=False,
        email_otp=otp, email_otp_expires=datetime.utcnow() + timedelta(minutes=15),
    )
    db.add(user); db.commit(); db.refresh(user)

    if payload.boarding_house_name and payload.boarding_house_barangay:
        house = db.query(models.BoardingHouse).filter(
            models.BoardingHouse.name == payload.boarding_house_name).first()
        if not house:
            house = models.BoardingHouse(
                name=payload.boarding_house_name, barangay=payload.boarding_house_barangay,
                latitude=payload.boarding_house_latitude, longitude=payload.boarding_house_longitude,
                is_verified=False, submitted_by=f"Student — {user.full_name}")
            db.add(house); db.commit(); db.refresh(house)
        db.add(models.StatusUpdate(student_id=user.id, boarding_house_id=house.id,
                                   status_type="same", month_label=datetime.utcnow().strftime("%B %Y")))
        db.commit()

    log_action(db, user, "create", "user", user.id, user.full_name, "Student registered")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    # requires_otp=True tells frontend to show the OTP verification screen
    return schemas.TokenResponse(access_token=token, role=user.role,
                                 full_name=user.full_name, requires_otp=True,
                                 pending_token=otp)   # demo: return OTP so UI can prefill it


@app.post("/api/auth/verify-otp")
def verify_email_otp(payload: schemas.VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or user.email_otp != payload.otp:
        raise HTTPException(400, "Invalid OTP code.")
    if user.email_otp_expires and user.email_otp_expires < datetime.utcnow():
        raise HTTPException(400, "OTP has expired. Please request a new one.")
    user.is_email_verified = True
    user.email_otp = None; user.email_otp_expires = None
    db.commit()
    log_action(db, user, "verify", "email", user.id, user.email, "Email OTP verified")
    return {"message": "Email verified successfully."}


@app.post("/api/auth/resend-otp")
def resend_otp(email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user: raise HTTPException(404, "User not found.")
    otp = make_otp()
    user.email_otp = otp; user.email_otp_expires = datetime.utcnow() + timedelta(minutes=15)
    db.commit()
    return {"message": "New OTP generated.", "demo_otp": otp}


@app.post("/api/auth/register/osas", response_model=schemas.TokenResponse)
def register_osas(payload: schemas.RegisterOsasRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(400, "Email already registered.")
    user = models.User(full_name=payload.full_name, email=payload.email,
                       hashed_password=hash_password(payload.password),
                       role="osas_admin", position=payload.position,
                       is_email_verified=True)
    db.add(user); db.commit(); db.refresh(user)
    log_action(db, user, "create", "user", user.id, user.full_name, "OSAS admin registered")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return schemas.TokenResponse(access_token=token, role=user.role, full_name=user.full_name)


@app.post("/api/auth/token", response_model=schemas.TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    generic = "Incorrect email or password."
    if not user: raise HTTPException(401, generic)
    if user.locked_until and user.locked_until > datetime.utcnow():
        mins = int((user.locked_until - datetime.utcnow()).total_seconds() // 60) + 1
        raise HTTPException(429, f"Account locked for {mins} more minute(s).")
    if not verify_password(form_data.password, user.hashed_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= MAX_FAILED:
            user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINS)
            user.failed_login_attempts = 0
            db.commit()
            log_action(db, user, "lockout", "user", user.id, user.email, f"Locked after {MAX_FAILED} failed attempts")
            raise HTTPException(429, f"Too many failed attempts. Account locked for {LOCKOUT_MINS} minutes.")
        db.commit()
        raise HTTPException(401, generic)

    user.failed_login_attempts = 0; user.locked_until = None; db.commit()

    # 2FA check
    if user.two_fa_enabled:
        pending = secrets.token_urlsafe(24)
        user.pending_2fa_token = pending
        user.pending_2fa_expires = datetime.utcnow() + timedelta(minutes=5)
        db.commit()
        return schemas.TokenResponse(access_token="", role=user.role,
                                     full_name=user.full_name, requires_2fa=True,
                                     pending_token=pending)

    log_action(db, user, "login", "user", user.id, user.full_name)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return schemas.TokenResponse(access_token=token, role=user.role, full_name=user.full_name)


@app.post("/api/auth/2fa/verify", response_model=schemas.TokenResponse)
def verify_2fa(payload: schemas.TwoFAVerifyRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.pending_2fa_token == payload.pending_token).first()
    if not user: raise HTTPException(400, "Invalid or expired 2FA session.")
    if user.pending_2fa_expires and user.pending_2fa_expires < datetime.utcnow():
        raise HTTPException(400, "2FA session expired. Please sign in again.")
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(payload.totp_code, valid_window=1):
        raise HTTPException(400, "Invalid 2FA code.")
    user.pending_2fa_token = None; user.pending_2fa_expires = None; db.commit()
    log_action(db, user, "login", "user", user.id, user.full_name, "2FA verified")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return schemas.TokenResponse(access_token=token, role=user.role, full_name=user.full_name)


@app.post("/api/auth/2fa/setup", response_model=schemas.TwoFASetupResponse)
def setup_2fa(db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    secret = pyotp.random_base32()
    user.totp_secret = secret; db.commit()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user.email, issuer_name="GeoTrack LSPU")
    return schemas.TwoFASetupResponse(secret=secret, qr_uri=uri)


@app.post("/api/auth/2fa/enable")
def enable_2fa(code: str, db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    if not user.totp_secret: raise HTTPException(400, "Run /api/auth/2fa/setup first.")
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(code, valid_window=1): raise HTTPException(400, "Invalid TOTP code.")
    user.two_fa_enabled = True; db.commit()
    log_action(db, user, "update", "user", user.id, user.email, "2FA enabled")
    return {"message": "2FA enabled."}


@app.post("/api/auth/2fa/disable")
def disable_2fa(db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    user.two_fa_enabled = False; user.totp_secret = None; db.commit()
    log_action(db, user, "update", "user", user.id, user.email, "2FA disabled")
    return {"message": "2FA disabled."}


@app.post("/api/auth/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        return {"message": "If that email is registered, a reset link has been sent.", "demo_token": None}
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used == False).delete()
    db.commit()
    token = secrets.token_urlsafe(32)
    db.add(models.PasswordResetToken(user_id=user.id, token=token,
                                     expires_at=datetime.utcnow() + timedelta(hours=1)))
    db.commit()
    return {"message": "Reset token generated.", "demo_token": token,
            "demo_note": "In production this is emailed. Copy and paste into the reset form."}


@app.post("/api/auth/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == payload.token,
        models.PasswordResetToken.used == False).first()
    if not record: raise HTTPException(400, "Invalid or already-used reset token.")
    if record.expires_at < datetime.utcnow(): raise HTTPException(400, "Token expired.")
    record.user.hashed_password = hash_password(payload.new_password)
    record.user.failed_login_attempts = 0; record.user.locked_until = None
    record.used = True; db.commit()
    log_action(db, record.user, "update", "user", record.user.id, record.user.email, "Password reset via token")
    return {"message": "Password updated. You can now sign in."}


# ─── STUDENT endpoints ────────────────────────────────────────────────────────
@app.get("/api/student/me", response_model=schemas.MyProfileOut)
def my_profile(user: models.User = Depends(require_student)):
    return user

@app.put("/api/student/me", response_model=schemas.MyProfileOut)
def update_profile(payload: schemas.MyProfileUpdate, db: Session = Depends(get_db),
                   user: models.User = Depends(require_student)):
    old_name = user.full_name
    for f, v in payload.dict(exclude_unset=True).items(): setattr(user, f, v)
    db.commit(); db.refresh(user)
    log_action(db, user, "update", "user", user.id, user.full_name,
               f"Profile updated (was: {old_name})" if old_name != user.full_name else "Profile updated")
    return user

@app.get("/api/student/boarding-houses", response_model=List[schemas.BoardingHouseOut])
def student_list_bh(db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    return db.query(models.BoardingHouse).all()

@app.get("/api/student/boarding-houses/{hid}/reviews", response_model=List[schemas.ReviewOut])
def student_get_reviews(hid: int, db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    if not db.query(models.BoardingHouse).get(hid): raise HTTPException(404, "Not found")
    return db.query(models.Review).filter(models.Review.boarding_house_id == hid).all()

@app.post("/api/student/boarding-houses/{hid}/reviews", response_model=schemas.ReviewOut)
def student_post_review(hid: int, payload: schemas.ReviewCreate, db: Session = Depends(get_db),
                        user: models.User = Depends(require_student)):
    h = db.query(models.BoardingHouse).get(hid)
    if not h: raise HTTPException(404, "Not found")
    if not (1 <= payload.rating <= 5): raise HTTPException(400, "Rating must be 1–5")
    r = models.Review(boarding_house_id=hid, author_id=user.id, rating=payload.rating, text=payload.text)
    db.add(r); db.commit(); db.refresh(r)
    log_action(db, user, "create", "review", r.id, h.name, f"Rating: {payload.rating}/5")
    return r

@app.get("/api/student/my-reviews", response_model=List[schemas.ReviewOut])
def my_reviews(db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    return db.query(models.Review).filter(models.Review.author_id == user.id).all()

@app.put("/api/student/reviews/{rid}", response_model=schemas.ReviewOut)
def update_review(rid: int, payload: schemas.ReviewUpdate, db: Session = Depends(get_db),
                  user: models.User = Depends(require_student)):
    r = db.query(models.Review).get(rid)
    if not r: raise HTTPException(404, "Not found")
    if r.author_id != user.id: raise HTTPException(403, "Not your review")
    if payload.rating is not None:
        if not (1 <= payload.rating <= 5): raise HTTPException(400, "Rating 1–5")
        r.rating = payload.rating
    if payload.text is not None: r.text = payload.text
    db.commit(); db.refresh(r)
    log_action(db, user, "update", "review", r.id, None, "Review updated")
    return r

@app.delete("/api/student/reviews/{rid}")
def delete_review(rid: int, db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    r = db.query(models.Review).get(rid)
    if not r: raise HTTPException(404, "Not found")
    if r.author_id != user.id: raise HTTPException(403, "Not your review")
    db.delete(r); db.commit()
    log_action(db, user, "delete", "review", rid, None, "Review deleted")
    return {"message": "Deleted"}

@app.post("/api/student/status-updates", response_model=schemas.StatusUpdateOut)
def submit_status(payload: schemas.StatusUpdateCreate, db: Session = Depends(get_db),
                  user: models.User = Depends(require_student)):
    if payload.status_type == "transferred" and not payload.new_boarding_house_name:
        raise HTTPException(400, "new_boarding_house_name required when transferred")
    u = models.StatusUpdate(student_id=user.id, boarding_house_id=payload.boarding_house_id,
                            status_type=payload.status_type,
                            new_boarding_house_name=payload.new_boarding_house_name,
                            new_barangay=payload.new_barangay,
                            note=payload.note, month_label=payload.month_label)
    db.add(u); db.commit(); db.refresh(u)
    log_action(db, user, "create", "status_update", u.id, payload.month_label,
               f"Status: {payload.status_type}" + (f" → {payload.new_boarding_house_name}" if payload.new_boarding_house_name else ""))
    return u

@app.get("/api/student/status-updates", response_model=List[schemas.StatusUpdateOut])
def my_status_updates(db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    return (db.query(models.StatusUpdate).filter(models.StatusUpdate.student_id == user.id)
            .order_by(models.StatusUpdate.created_at.desc()).all())

@app.put("/api/student/status-updates/{uid}", response_model=schemas.StatusUpdateOut)
def edit_status(uid: int, payload: schemas.StatusUpdateEdit, db: Session = Depends(get_db),
                user: models.User = Depends(require_student)):
    u = db.query(models.StatusUpdate).get(uid)
    if not u: raise HTTPException(404, "Not found")
    if u.student_id != user.id: raise HTTPException(403, "Not yours")
    for f, v in payload.dict(exclude_unset=True).items(): setattr(u, f, v)
    db.commit(); db.refresh(u)
    log_action(db, user, "update", "status_update", uid, u.month_label, "Status update edited")
    return u

@app.delete("/api/student/status-updates/{uid}")
def delete_status(uid: int, db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    u = db.query(models.StatusUpdate).get(uid)
    if not u: raise HTTPException(404, "Not found")
    if u.student_id != user.id: raise HTTPException(403, "Not yours")
    db.delete(u); db.commit()
    log_action(db, user, "delete", "status_update", uid, None, "Status update deleted")
    return {"message": "Deleted"}

@app.post("/api/student/concerns", response_model=schemas.ConcernOut)
def report_concern(payload: schemas.ConcernCreate, db: Session = Depends(get_db),
                   user: models.User = Depends(require_student)):
    c = models.Concern(student_id=user.id, category=payload.category, details=payload.details)
    db.add(c); db.commit(); db.refresh(c)
    log_action(db, user, "create", "concern", c.id, payload.category, payload.details[:80])
    return c

@app.get("/api/student/my-boarding-house", response_model=Optional[schemas.BoardingHouseOut])
def my_boarding_house(db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    u = (db.query(models.StatusUpdate)
         .filter(models.StatusUpdate.student_id == user.id,
                 models.StatusUpdate.boarding_house_id.isnot(None))
         .order_by(models.StatusUpdate.created_at.desc()).first())
    return u.boarding_house if u else None


# ─── OSAS endpoints ───────────────────────────────────────────────────────────
@app.get("/api/osas/dashboard", response_model=schemas.DashboardStats)
def dashboard(db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    students = db.query(models.User).filter(models.User.role == "student").all()
    updates  = db.query(models.StatusUpdate).all()

    # Charts data
    gender_counts: dict = {}
    dept_counts:   dict = {}
    for s in students:
        g = (s.gender or "not_specified").replace("_", " ").title()
        gender_counts[g] = gender_counts.get(g, 0) + 1
        d = s.course_section or "Not specified"
        dept_counts[d] = dept_counts.get(d, 0) + 1

    bar_counts: dict = {}
    status_counts: dict = {}
    for u in updates:
        if u.boarding_house:
            b = u.boarding_house.barangay
            bar_counts[b] = bar_counts.get(b, 0) + 1
        st = {"same":"Same house","transferred":"Transferred","moved_home":"Moved home"}.get(u.status_type, u.status_type)
        status_counts[st] = status_counts.get(st, 0) + 1

    # Recent activities (last 10 audit log entries)
    recent = (db.query(models.AuditLog)
              .order_by(models.AuditLog.created_at.desc()).limit(10).all())
    activities = [{"id":r.id,"actor":r.actor_name,"action":r.action,
                   "resource_type":r.resource_type,"resource_label":r.resource_label,
                   "detail":r.detail,"created_at":r.created_at.isoformat()} for r in recent]

    return schemas.DashboardStats(
        total_students=len(students),
        updates_submitted=len(updates),
        flagged_students=db.query(models.StatusUpdate).filter(models.StatusUpdate.is_flagged==True).count(),
        pending_verifications=db.query(models.BoardingHouse).filter(models.BoardingHouse.is_verified==False).count(),
        by_gender=[{"label":k,"count":v} for k,v in sorted(gender_counts.items())],
        by_department=[{"label":k,"count":v} for k,v in sorted(dept_counts.items())],
        by_barangay=[{"label":k,"count":v} for k,v in sorted(bar_counts.items())],
        by_status=[{"label":k,"count":v} for k,v in sorted(status_counts.items())],
        recent_activities=activities,
    )

@app.get("/api/osas/geo-map", response_model=List[schemas.StudentMapPoint])
def geo_map(db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    points = []
    for s in db.query(models.User).filter(models.User.role == "student").all():
        u = (db.query(models.StatusUpdate)
             .filter(models.StatusUpdate.student_id == s.id,
                     models.StatusUpdate.boarding_house_id.isnot(None))
             .order_by(models.StatusUpdate.created_at.desc()).first())
        if not u or not u.boarding_house: continue
        h = u.boarding_house
        if h.latitude is None: continue
        points.append(schemas.StudentMapPoint(student_name=s.full_name, boarding_house_name=h.name,
                                              barangay=h.barangay, latitude=h.latitude,
                                              longitude=h.longitude, is_flagged=u.is_flagged))
    return points

@app.get("/api/osas/status-updates", response_model=List[schemas.StatusUpdateAdminOut])
def all_status_updates(
    search: Optional[str] = None,
    is_flagged: Optional[bool] = None,
    gender: Optional[str] = None,
    month_label: Optional[str] = None,
    is_verified: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_osas_admin),
):
    q = db.query(models.StatusUpdate)
    if is_flagged is not None: q = q.filter(models.StatusUpdate.is_flagged == is_flagged)
    if month_label: q = q.filter(models.StatusUpdate.month_label == month_label)
    updates = q.order_by(models.StatusUpdate.created_at.desc()).all()
    results = []
    for u in updates:
        if not u.student: continue
        if search and search.lower() not in u.student.full_name.lower() and search.lower() not in u.student.email.lower(): continue
        if gender and (u.student.gender or "").lower() != gender.lower(): continue
        if is_verified is not None and u.boarding_house and u.boarding_house.is_verified != is_verified: continue
        results.append(schemas.StatusUpdateAdminOut(
            id=u.id, status_type=u.status_type,
            new_boarding_house_name=u.new_boarding_house_name, new_barangay=u.new_barangay,
            note=u.note, month_label=u.month_label, is_flagged=u.is_flagged,
            flag_reason=u.flag_reason, created_at=u.created_at,
            student_name=u.student.full_name, student_email=u.student.email,
        ))
    return results

@app.patch("/api/osas/status-updates/{uid}/flag")
def flag_update(uid: int, reason: str, db: Session = Depends(get_db),
                user: models.User = Depends(require_osas_admin)):
    u = db.query(models.StatusUpdate).get(uid)
    if not u: raise HTTPException(404, "Not found")
    u.is_flagged = True; u.flag_reason = reason; db.commit()
    log_action(db, user, "flag", "status_update", uid,
               u.student.full_name if u.student else None, f"Reason: {reason}")
    return {"message": "Flagged"}

@app.get("/api/osas/boarding-houses", response_model=List[schemas.BoardingHouseOut])
def list_bh(db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    return db.query(models.BoardingHouse).all()

@app.patch("/api/osas/boarding-houses/{hid}/verify", response_model=schemas.BoardingHouseOut)
def verify_bh(hid: int, db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    h = db.query(models.BoardingHouse).get(hid)
    if not h: raise HTTPException(404, "Not found")
    h.is_verified = True; db.commit(); db.refresh(h)
    log_action(db, user, "verify", "boarding_house", hid, h.name, "Boarding house verified")
    return h

@app.put("/api/osas/boarding-houses/{hid}", response_model=schemas.BoardingHouseOut)
def update_bh(hid: int, payload: schemas.BoardingHouseUpdate, db: Session = Depends(get_db),
              user: models.User = Depends(require_osas_admin)):
    h = db.query(models.BoardingHouse).get(hid)
    if not h: raise HTTPException(404, "Not found")
    for f, v in payload.dict(exclude_unset=True).items(): setattr(h, f, v)
    db.commit(); db.refresh(h)
    log_action(db, user, "update", "boarding_house", hid, h.name, "Details updated")
    return h

@app.delete("/api/osas/boarding-houses/{hid}")
def delete_bh(hid: int, db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    h = db.query(models.BoardingHouse).get(hid)
    if not h: raise HTTPException(404, "Not found")
    log_action(db, user, "delete", "boarding_house", hid, h.name, "Boarding house deleted")
    db.delete(h); db.commit()
    return {"message": "Deleted"}

@app.get("/api/osas/boarding-houses/{hid}/reviews", response_model=List[schemas.ReviewOut])
def bh_reviews(hid: int, db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    if not db.query(models.BoardingHouse).get(hid): raise HTTPException(404, "Not found")
    return db.query(models.Review).filter(models.Review.boarding_house_id == hid).all()

@app.get("/api/osas/concerns", response_model=List[schemas.ConcernAdminOut])
def all_concerns(db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    return [schemas.ConcernAdminOut(id=c.id, category=c.category, details=c.details,
                                    status=c.status, created_at=c.created_at,
                                    student_name=c.student.full_name, student_email=c.student.email)
            for c in db.query(models.Concern).order_by(models.Concern.created_at.desc()).all()]

@app.patch("/api/osas/concerns/{cid}/status")
def update_concern(cid: int, new_status: str, db: Session = Depends(get_db),
                   user: models.User = Depends(require_osas_admin)):
    if new_status not in ("open","in_progress","resolved"): raise HTTPException(400,"Invalid")
    c = db.query(models.Concern).get(cid)
    if not c: raise HTTPException(404, "Not found")
    c.status = new_status; db.commit()
    log_action(db, user, "update", "concern", cid,
               c.student.full_name if c.student else None, f"Status → {new_status}")
    return {"message": "Updated"}

@app.delete("/api/osas/concerns/{cid}")
def delete_concern(cid: int, db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    c = db.query(models.Concern).get(cid)
    if not c: raise HTTPException(404, "Not found")
    log_action(db, user, "delete", "concern", cid,
               c.student.full_name if c.student else None, "Concern deleted")
    db.delete(c); db.commit()
    return {"message": "Deleted"}

@app.get("/api/osas/accounts", response_model=List[schemas.OsasAccountOut])
def list_osas_accounts(db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    return db.query(models.User).filter(models.User.role == "osas_admin").all()

@app.put("/api/osas/accounts/{aid}", response_model=schemas.OsasAccountOut)
def update_osas_account(aid: int, payload: schemas.OsasAccountUpdate,
                        db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    a = db.query(models.User).filter(models.User.id == aid, models.User.role == "osas_admin").first()
    if not a: raise HTTPException(404, "Not found")
    for f, v in payload.dict(exclude_unset=True).items(): setattr(a, f, v)
    db.commit(); db.refresh(a)
    log_action(db, user, "update", "osas_account", aid, a.full_name, "Account updated")
    return a

@app.delete("/api/osas/accounts/{aid}")
def delete_osas_account(aid: int, db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    if aid == user.id: raise HTTPException(400, "Cannot delete your own account.")
    a = db.query(models.User).filter(models.User.id == aid, models.User.role == "osas_admin").first()
    if not a: raise HTTPException(404, "Not found")
    log_action(db, user, "delete", "osas_account", aid, a.full_name, "OSAS account deleted")
    db.delete(a); db.commit()
    return {"message": "Deleted"}

@app.get("/api/osas/students", response_model=List[schemas.StudentAccountOut])
def list_students(
    search: Optional[str] = None,
    gender: Optional[str] = None,
    is_archived: Optional[bool] = None,
    course_section: Optional[str] = None,
    db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin),
):
    lifecycle_sweep(db)
    students = db.query(models.User).filter(models.User.role == "student").all()
    results = []
    for s in students:
        if search and search.lower() not in s.full_name.lower() and search.lower() not in s.email.lower(): continue
        if gender and (s.gender or "").lower() != gender.lower(): continue
        if is_archived is not None and (s.archived_at is not None) != is_archived: continue
        if course_section and (s.course_section or "").lower() != course_section.lower(): continue
        results.append(schemas.StudentAccountOut(
            id=s.id, full_name=s.full_name, email=s.email,
            course_section=s.course_section, gender=s.gender, created_at=s.created_at,
            is_archived=s.archived_at is not None, archived_at=s.archived_at,
        ))
    return results

@app.patch("/api/osas/students/{sid}/archive")
def archive_student(sid: int, db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    s = db.query(models.User).filter(models.User.id == sid, models.User.role == "student").first()
    if not s: raise HTTPException(404, "Not found")
    s.archived_at = datetime.utcnow(); db.commit()
    log_action(db, user, "archive", "student", sid, s.full_name, "Student archived")
    return {"message": "Archived"}

@app.patch("/api/osas/students/{sid}/unarchive")
def unarchive_student(sid: int, db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    s = db.query(models.User).filter(models.User.id == sid, models.User.role == "student").first()
    if not s: raise HTTPException(404, "Not found")
    s.archived_at = None; db.commit()
    log_action(db, user, "unarchive", "student", sid, s.full_name, "Student unarchived")
    return {"message": "Unarchived"}

@app.delete("/api/osas/students/{sid}")
def delete_student(sid: int, db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    s = db.query(models.User).filter(models.User.id == sid, models.User.role == "student").first()
    if not s: raise HTTPException(404, "Not found")
    log_action(db, user, "delete", "student", sid, s.full_name, "Student account deleted")
    db.delete(s); db.commit()
    return {"message": "Deleted"}

@app.get("/api/osas/audit-logs", response_model=List[schemas.AuditLogOut])
def get_audit_logs(
    limit: int = 50, action: Optional[str] = None, resource_type: Optional[str] = None,
    db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin),
):
    q = db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc())
    if action: q = q.filter(models.AuditLog.action == action)
    if resource_type: q = q.filter(models.AuditLog.resource_type == resource_type)
    return q.limit(limit).all()


# ─── TALLY / EXPORT ───────────────────────────────────────────────────────────
def _compute_tally(db, group_by_list, month_label):
    valid = {"barangay","boarding_house","gender","department","monthly_status"}
    def compute_section(g):
        groups: dict = {}
        if g in ("gender","department"):
            for s in db.query(models.User).filter(models.User.role=="student").all():
                label = (s.gender or "Not specified").replace("_"," ").title() if g=="gender" else (s.course_section or "Not specified")
                groups.setdefault(label,[]).append(s.full_name)
        else:
            q = db.query(models.StatusUpdate)
            if month_label: q = q.filter(models.StatusUpdate.month_label==month_label)
            for u in q.all():
                nm = u.student.full_name if u.student else "Unknown"
                if g=="monthly_status":
                    label = {"same":"Same boarding house","transferred":"Transferred","moved_home":"Moved home"}.get(u.status_type,u.status_type)
                    groups.setdefault(label,[]).append(nm); continue
                if u.status_type=="transferred": hn,bar = u.new_boarding_house_name or "Unknown",u.new_barangay or "Unknown"
                elif u.boarding_house: hn,bar = u.boarding_house.name,u.boarding_house.barangay
                else: continue
                label = bar if g=="barangay" else hn
                groups.setdefault(label,[]).append(nm)
        rows = [schemas.TallyReportRow(group_label=k,count=len(v),student_names=sorted(v)) for k,v in sorted(groups.items())]
        return schemas.TallyReportSection(group_by=g,rows=rows,total=sum(len(v) for v in groups.values()))
    sections = [compute_section(g) for g in group_by_list if g in valid]
    return sections

@app.get("/api/osas/reports/tally", response_model=schemas.TallyReportOut)
def tally_report(group_by: str, month_label: Optional[str] = None,
                 db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    requested = [g.strip() for g in group_by.split(",") if g.strip()]
    sections = _compute_tally(db, requested, month_label)
    return schemas.TallyReportOut(group_by=",".join(requested), month_label=month_label,
                                  sections=sections, rows=sections[0].rows if sections else [],
                                  total=sections[0].total if len(sections)==1 else sum(s.total for s in sections))

@app.get("/api/osas/reports/export/csv")
def export_csv(group_by: str, month_label: Optional[str] = None,
               db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    import csv, io
    requested = [g.strip() for g in group_by.split(",") if g.strip()]
    sections  = _compute_tally(db, requested, month_label)
    buf = io.StringIO()
    w = csv.writer(buf)
    for sec in sections:
        w.writerow([f"Group by: {sec.group_by}",f"Month: {month_label or 'All'}"])
        w.writerow(["Group", "Count", "Students"])
        for row in sec.rows:
            w.writerow([row.group_label, row.count, "; ".join(row.student_names)])
        w.writerow(["Total", sec.total])
        w.writerow([])
    log_action(db, user, "export", "report", None, group_by, f"CSV export — {month_label or 'all months'}")
    return StreamingResponse(io.BytesIO(buf.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition":f"attachment; filename=geotrack_report.csv"})

@app.get("/api/osas/reports/export/excel")
def export_excel(group_by: str, month_label: Optional[str] = None,
                 db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    requested = [g.strip() for g in group_by.split(",") if g.strip()]
    sections  = _compute_tally(db, requested, month_label)
    wb = Workbook()
    for i, sec in enumerate(sections):
        ws = wb.create_sheet(title=sec.group_by[:31]) if i > 0 else wb.active
        ws.title = sec.group_by[:31]
        ws.append([f"GeoTrack Tally Report — {sec.group_by}", f"Month: {month_label or 'All months'}"])
        ws.append(["Group", "Count", "Students"])
        for cell in ws[2]: cell.font = Font(bold=True)
        for row in sec.rows:
            ws.append([row.group_label, row.count, "; ".join(row.student_names)])
        ws.append(["Total", sec.total])
        for col in range(1, 4):
            ws.column_dimensions[get_column_letter(col)].width = [30, 10, 60][col-1]
    buf = BytesIO(); wb.save(buf); buf.seek(0)
    log_action(db, user, "export", "report", None, group_by, f"Excel export — {month_label or 'all months'}")
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition":"attachment; filename=geotrack_report.xlsx"})

@app.get("/api/osas/reports/export/pdf")
def export_pdf(group_by: str, month_label: Optional[str] = None,
               db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
    from reportlab.lib import colors
    requested = [g.strip() for g in group_by.split(",") if g.strip()]
    sections  = _compute_tally(db, requested, month_label)
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    story = [Paragraph("GeoTrack Tally Report", styles["Title"]),
             Paragraph(f"Month: {month_label or 'All months'} | Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC", styles["Normal"]),
             Spacer(1, 16)]
    for sec in sections:
        story.append(Paragraph(f"Group by: {sec.group_by}", styles["Heading2"]))
        data = [["Group", "Count", "Students"]]
        for row in sec.rows:
            data.append([row.group_label, str(row.count), "\n".join(row.student_names)])
        data.append(["Total", str(sec.total), ""])
        t = Table(data, colWidths=[130, 50, 320])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#203f36")),
            ("TEXTCOLOR",  (0,0), (-1,0), colors.white),
            ("FONTNAME",   (0,0), (-1,0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f6f4ee")]),
            ("FONTNAME",   (0,-1), (-1,-1), "Helvetica-Bold"),
            ("GRID",       (0,0), (-1,-1), 0.5, colors.HexColor("#d9d3c4")),
            ("FONTSIZE",   (0,0), (-1,-1), 9),
            ("VALIGN",     (0,0), (-1,-1), "TOP"),
        ]))
        story += [t, Spacer(1, 16)]
    doc.build(story)
    buf.seek(0)
    log_action(db, user, "export", "report", None, group_by, f"PDF export — {month_label or 'all months'}")
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition":"attachment; filename=geotrack_report.pdf"})


@app.get("/api/")
def root():
    return {"message": "GeoTrack API v3 — /docs for explorer."}

"""
main.py — GeoTrack API
Single FastAPI app serving two separate frontends (Student + OSAS Admin)
from one database.

Routes:
  /api/auth/*      shared login/register (role-checked)
  /api/student/*   require_student only
  /api/osas/*      require_osas_admin only

Run locally: uvicorn main:app --reload
"""

import os
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models, schemas
from database import engine, get_db, Base
from auth import (
    hash_password, verify_password, create_access_token,
    require_student, require_osas_admin,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GeoTrack API", version="2.0.0")

# In production set ALLOWED_ORIGINS to comma-separated Vercel URLs, e.g.:
#   ALLOWED_ORIGINS=https://geotrack-student.vercel.app,https://geotrack-osas.vercel.app
_origins_env = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Constants ────────────────────────────────────────────────────────────────
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 5
ARCHIVE_AFTER_YEARS = 3
DELETE_AFTER_YEARS = 5


# ─── Lifecycle sweep ─────────────────────────────────────────────────────────
def run_student_lifecycle_sweep(db: Session):
    now = datetime.utcnow()
    archive_cutoff = now - timedelta(days=365 * ARCHIVE_AFTER_YEARS)
    delete_cutoff  = now - timedelta(days=365 * DELETE_AFTER_YEARS)
    for student in db.query(models.User).filter(models.User.role == "student").all():
        if student.archived_at is None:
            last = (
                db.query(models.StatusUpdate)
                .filter(
                    models.StatusUpdate.student_id == student.id,
                    models.StatusUpdate.status_type.in_(["same", "transferred"]),
                )
                .order_by(models.StatusUpdate.created_at.desc())
                .first()
            )
            last_active_at = last.created_at if last else student.created_at
            if last_active_at < archive_cutoff:
                student.archived_at = now
        elif student.archived_at < delete_cutoff:
            db.delete(student)
    db.commit()


# ─── AUTH ─────────────────────────────────────────────────────────────────────
@app.post("/api/auth/register/student", response_model=schemas.TokenResponse)
def register_student(payload: schemas.RegisterStudentRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    user = models.User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="student",
        course_section=payload.course_section,
        gender=payload.gender,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Auto-create boarding house + initial status update from sign-up data.
    if payload.boarding_house_name and payload.boarding_house_barangay:
        house = db.query(models.BoardingHouse).filter(
            models.BoardingHouse.name == payload.boarding_house_name
        ).first()
        if not house:
            house = models.BoardingHouse(
                name=payload.boarding_house_name,
                barangay=payload.boarding_house_barangay,
                latitude=payload.boarding_house_latitude,
                longitude=payload.boarding_house_longitude,
                is_verified=False,
                submitted_by=f"Student — {user.full_name}",
            )
            db.add(house)
            db.commit()
            db.refresh(house)

        month_label = datetime.utcnow().strftime("%B %Y")
        db.add(models.StatusUpdate(
            student_id=user.id,
            boarding_house_id=house.id,
            status_type="same",
            month_label=month_label,
        ))
        db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return schemas.TokenResponse(access_token=token, role=user.role, full_name=user.full_name)


@app.post("/api/auth/register/osas", response_model=schemas.TokenResponse)
def register_osas(payload: schemas.RegisterOsasRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
    user = models.User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="osas_admin",
        position=payload.position,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return schemas.TokenResponse(access_token=token, role=user.role, full_name=user.full_name)


@app.post("/api/auth/token", response_model=schemas.TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    generic = "Incorrect email or password."
    if not user:
        raise HTTPException(status_code=401, detail=generic)

    if user.locked_until and user.locked_until > datetime.utcnow():
        mins = int((user.locked_until - datetime.utcnow()).total_seconds() // 60) + 1
        raise HTTPException(status_code=429,
            detail=f"Too many failed attempts. Try again in {mins} minute(s).")

    if not verify_password(form_data.password, user.hashed_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            user.failed_login_attempts = 0
            db.commit()
            raise HTTPException(status_code=429,
                detail=f"Account locked for {LOCKOUT_DURATION_MINUTES} minutes.")
        db.commit()
        raise HTTPException(status_code=401, detail=generic)

    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return schemas.TokenResponse(access_token=token, role=user.role, full_name=user.full_name)


# ─── STUDENT endpoints ────────────────────────────────────────────────────────
@app.get("/api/student/me", response_model=schemas.MyProfileOut)
def my_profile(user: models.User = Depends(require_student)):
    return user


@app.put("/api/student/me", response_model=schemas.MyProfileOut)
def update_my_profile(payload: schemas.MyProfileUpdate,
                      db: Session = Depends(get_db),
                      user: models.User = Depends(require_student)):
    for f, v in payload.dict(exclude_unset=True).items():
        setattr(user, f, v)
    db.commit(); db.refresh(user)
    return user


@app.get("/api/student/boarding-houses", response_model=List[schemas.BoardingHouseOut])
def list_boarding_houses(db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    return db.query(models.BoardingHouse).all()


@app.get("/api/student/boarding-houses/{house_id}/reviews", response_model=List[schemas.ReviewOut])
def get_reviews(house_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    if not db.query(models.BoardingHouse).filter(models.BoardingHouse.id == house_id).first():
        raise HTTPException(404, "Boarding house not found")
    return db.query(models.Review).filter(models.Review.boarding_house_id == house_id).all()


@app.post("/api/student/boarding-houses/{house_id}/reviews", response_model=schemas.ReviewOut)
def post_review(house_id: int, payload: schemas.ReviewCreate,
                db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    if not db.query(models.BoardingHouse).filter(models.BoardingHouse.id == house_id).first():
        raise HTTPException(404, "Boarding house not found")
    if not (1 <= payload.rating <= 5):
        raise HTTPException(400, "Rating must be 1-5")
    r = models.Review(boarding_house_id=house_id, author_id=user.id,
                      rating=payload.rating, text=payload.text)
    db.add(r); db.commit(); db.refresh(r)
    return r


@app.get("/api/student/my-reviews", response_model=List[schemas.ReviewOut])
def my_reviews(db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    return db.query(models.Review).filter(models.Review.author_id == user.id).all()


@app.put("/api/student/reviews/{review_id}", response_model=schemas.ReviewOut)
def update_review(review_id: int, payload: schemas.ReviewUpdate,
                  db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    r = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not r: raise HTTPException(404, "Review not found")
    if r.author_id != user.id: raise HTTPException(403, "Can only edit your own review")
    if payload.rating is not None:
        if not (1 <= payload.rating <= 5): raise HTTPException(400, "Rating must be 1-5")
        r.rating = payload.rating
    if payload.text is not None: r.text = payload.text
    db.commit(); db.refresh(r)
    return r


@app.delete("/api/student/reviews/{review_id}")
def delete_review(review_id: int, db: Session = Depends(get_db),
                  user: models.User = Depends(require_student)):
    r = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not r: raise HTTPException(404, "Review not found")
    if r.author_id != user.id: raise HTTPException(403, "Can only delete your own review")
    db.delete(r); db.commit()
    return {"message": "Deleted", "review_id": review_id}


@app.post("/api/student/status-updates", response_model=schemas.StatusUpdateOut)
def submit_status(payload: schemas.StatusUpdateCreate,
                  db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    if payload.status_type == "transferred" and not payload.new_boarding_house_name:
        raise HTTPException(400, "new_boarding_house_name required when transferred")
    u = models.StatusUpdate(
        student_id=user.id,
        boarding_house_id=payload.boarding_house_id,
        status_type=payload.status_type,
        new_boarding_house_name=payload.new_boarding_house_name,
        new_barangay=payload.new_barangay,
        note=payload.note,
        month_label=payload.month_label,
    )
    db.add(u); db.commit(); db.refresh(u)
    return u


@app.get("/api/student/status-updates", response_model=List[schemas.StatusUpdateOut])
def my_status_updates(db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    return (db.query(models.StatusUpdate)
            .filter(models.StatusUpdate.student_id == user.id)
            .order_by(models.StatusUpdate.created_at.desc()).all())


@app.put("/api/student/status-updates/{uid}", response_model=schemas.StatusUpdateOut)
def edit_status(uid: int, payload: schemas.StatusUpdateEdit,
                db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    u = db.query(models.StatusUpdate).filter(models.StatusUpdate.id == uid).first()
    if not u: raise HTTPException(404, "Not found")
    if u.student_id != user.id: raise HTTPException(403, "Not your update")
    for f, v in payload.dict(exclude_unset=True).items():
        setattr(u, f, v)
    db.commit(); db.refresh(u)
    return u


@app.delete("/api/student/status-updates/{uid}")
def delete_status(uid: int, db: Session = Depends(get_db),
                  user: models.User = Depends(require_student)):
    u = db.query(models.StatusUpdate).filter(models.StatusUpdate.id == uid).first()
    if not u: raise HTTPException(404, "Not found")
    if u.student_id != user.id: raise HTTPException(403, "Not your update")
    db.delete(u); db.commit()
    return {"message": "Deleted"}


@app.post("/api/student/concerns", response_model=schemas.ConcernOut)
def report_concern(payload: schemas.ConcernCreate,
                   db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    c = models.Concern(student_id=user.id, category=payload.category, details=payload.details)
    db.add(c); db.commit(); db.refresh(c)
    return c


@app.get("/api/student/my-boarding-house", response_model=Optional[schemas.BoardingHouseOut])
def my_boarding_house(db: Session = Depends(get_db), user: models.User = Depends(require_student)):
    u = (db.query(models.StatusUpdate)
         .filter(models.StatusUpdate.student_id == user.id,
                 models.StatusUpdate.boarding_house_id.isnot(None))
         .order_by(models.StatusUpdate.created_at.desc()).first())
    return u.boarding_house if u else None


# ─── OSAS endpoints ───────────────────────────────────────────────────────────
@app.get("/api/osas/dashboard-summary")
def dashboard_summary(db: Session = Depends(get_db),
                      user: models.User = Depends(require_osas_admin)):
    return {
        "total_students":       db.query(models.User).filter(models.User.role == "student").count(),
        "updates_submitted":    db.query(models.StatusUpdate).count(),
        "flagged_students":     db.query(models.StatusUpdate).filter(models.StatusUpdate.is_flagged == True).count(),
        "pending_verifications":db.query(models.BoardingHouse).filter(models.BoardingHouse.is_verified == False).count(),
    }


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
        if h.latitude is None or h.longitude is None: continue
        points.append(schemas.StudentMapPoint(
            student_name=s.full_name, boarding_house_name=h.name,
            barangay=h.barangay, latitude=h.latitude, longitude=h.longitude,
            is_flagged=u.is_flagged,
        ))
    return points


@app.get("/api/osas/status-updates", response_model=List[schemas.StatusUpdateAdminOut])
def all_status_updates(db: Session = Depends(get_db),
                       user: models.User = Depends(require_osas_admin)):
    results = []
    for u in (db.query(models.StatusUpdate)
              .order_by(models.StatusUpdate.created_at.desc()).all()):
        results.append(schemas.StatusUpdateAdminOut(
            id=u.id, status_type=u.status_type,
            new_boarding_house_name=u.new_boarding_house_name,
            new_barangay=u.new_barangay, note=u.note,
            month_label=u.month_label, is_flagged=u.is_flagged,
            flag_reason=u.flag_reason, created_at=u.created_at,
            student_name=u.student.full_name, student_email=u.student.email,
        ))
    return results


@app.patch("/api/osas/status-updates/{uid}/flag")
def flag_update(uid: int, reason: str, db: Session = Depends(get_db),
                user: models.User = Depends(require_osas_admin)):
    u = db.query(models.StatusUpdate).filter(models.StatusUpdate.id == uid).first()
    if not u: raise HTTPException(404, "Not found")
    u.is_flagged = True; u.flag_reason = reason
    db.commit()
    return {"message": "Flagged", "update_id": uid}


@app.get("/api/osas/boarding-houses", response_model=List[schemas.BoardingHouseOut])
def list_bh(db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    return db.query(models.BoardingHouse).all()


@app.patch("/api/osas/boarding-houses/{hid}/verify", response_model=schemas.BoardingHouseOut)
def verify_bh(hid: int, db: Session = Depends(get_db),
              user: models.User = Depends(require_osas_admin)):
    h = db.query(models.BoardingHouse).filter(models.BoardingHouse.id == hid).first()
    if not h: raise HTTPException(404, "Not found")
    h.is_verified = True; db.commit(); db.refresh(h)
    return h


@app.put("/api/osas/boarding-houses/{hid}", response_model=schemas.BoardingHouseOut)
def update_bh(hid: int, payload: schemas.BoardingHouseUpdate,
              db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    h = db.query(models.BoardingHouse).filter(models.BoardingHouse.id == hid).first()
    if not h: raise HTTPException(404, "Not found")
    for f, v in payload.dict(exclude_unset=True).items():
        setattr(h, f, v)
    db.commit(); db.refresh(h)
    return h


@app.delete("/api/osas/boarding-houses/{hid}")
def delete_bh(hid: int, db: Session = Depends(get_db),
              user: models.User = Depends(require_osas_admin)):
    h = db.query(models.BoardingHouse).filter(models.BoardingHouse.id == hid).first()
    if not h: raise HTTPException(404, "Not found")
    db.delete(h); db.commit()
    return {"message": "Deleted"}


@app.get("/api/osas/boarding-houses/{hid}/reviews", response_model=List[schemas.ReviewOut])
def bh_reviews_admin(hid: int, db: Session = Depends(get_db),
                     user: models.User = Depends(require_osas_admin)):
    if not db.query(models.BoardingHouse).filter(models.BoardingHouse.id == hid).first():
        raise HTTPException(404, "Not found")
    return db.query(models.Review).filter(models.Review.boarding_house_id == hid).all()


@app.get("/api/osas/concerns", response_model=List[schemas.ConcernAdminOut])
def all_concerns(db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    results = []
    for c in db.query(models.Concern).order_by(models.Concern.created_at.desc()).all():
        results.append(schemas.ConcernAdminOut(
            id=c.id, category=c.category, details=c.details,
            status=c.status, created_at=c.created_at,
            student_name=c.student.full_name, student_email=c.student.email,
        ))
    return results


@app.patch("/api/osas/concerns/{cid}/status")
def update_concern(cid: int, new_status: str,
                   db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    if new_status not in ("open", "in_progress", "resolved"):
        raise HTTPException(400, "Invalid status")
    c = db.query(models.Concern).filter(models.Concern.id == cid).first()
    if not c: raise HTTPException(404, "Not found")
    c.status = new_status; db.commit()
    return {"message": "Updated"}


@app.delete("/api/osas/concerns/{cid}")
def delete_concern(cid: int, db: Session = Depends(get_db),
                   user: models.User = Depends(require_osas_admin)):
    c = db.query(models.Concern).filter(models.Concern.id == cid).first()
    if not c: raise HTTPException(404, "Not found")
    db.delete(c); db.commit()
    return {"message": "Deleted"}


@app.get("/api/osas/accounts", response_model=List[schemas.OsasAccountOut])
def list_osas_accounts(db: Session = Depends(get_db),
                       user: models.User = Depends(require_osas_admin)):
    return db.query(models.User).filter(models.User.role == "osas_admin").all()


@app.put("/api/osas/accounts/{aid}", response_model=schemas.OsasAccountOut)
def update_osas_account(aid: int, payload: schemas.OsasAccountUpdate,
                        db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    a = db.query(models.User).filter(models.User.id == aid, models.User.role == "osas_admin").first()
    if not a: raise HTTPException(404, "Not found")
    for f, v in payload.dict(exclude_unset=True).items():
        setattr(a, f, v)
    db.commit(); db.refresh(a)
    return a


@app.delete("/api/osas/accounts/{aid}")
def delete_osas_account(aid: int, db: Session = Depends(get_db),
                        user: models.User = Depends(require_osas_admin)):
    if aid == user.id:
        raise HTTPException(400, "Cannot delete your own account while logged in.")
    a = db.query(models.User).filter(models.User.id == aid, models.User.role == "osas_admin").first()
    if not a: raise HTTPException(404, "Not found")
    db.delete(a); db.commit()
    return {"message": "Deleted"}


@app.get("/api/osas/students", response_model=List[schemas.StudentAccountOut])
def list_students(db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    run_student_lifecycle_sweep(db)
    return [
        schemas.StudentAccountOut(
            id=s.id, full_name=s.full_name, email=s.email,
            course_section=s.course_section, gender=s.gender,
            created_at=s.created_at,
            is_archived=s.archived_at is not None,
            archived_at=s.archived_at,
        )
        for s in db.query(models.User).filter(models.User.role == "student").all()
    ]


@app.patch("/api/osas/students/{sid}/archive")
def archive_student(sid: int, db: Session = Depends(get_db),
                    user: models.User = Depends(require_osas_admin)):
    s = db.query(models.User).filter(models.User.id == sid, models.User.role == "student").first()
    if not s: raise HTTPException(404, "Not found")
    s.archived_at = datetime.utcnow(); db.commit()
    return {"message": "Archived"}


@app.patch("/api/osas/students/{sid}/unarchive")
def unarchive_student(sid: int, db: Session = Depends(get_db),
                      user: models.User = Depends(require_osas_admin)):
    s = db.query(models.User).filter(models.User.id == sid, models.User.role == "student").first()
    if not s: raise HTTPException(404, "Not found")
    s.archived_at = None; db.commit()
    return {"message": "Unarchived"}


@app.delete("/api/osas/students/{sid}")
def delete_student(sid: int, db: Session = Depends(get_db),
                   user: models.User = Depends(require_osas_admin)):
    s = db.query(models.User).filter(models.User.id == sid, models.User.role == "student").first()
    if not s: raise HTTPException(404, "Not found")
    db.delete(s); db.commit()
    return {"message": "Deleted"}


@app.get("/api/osas/reports/tally", response_model=schemas.TallyReportOut)
def tally_report(group_by: str, month_label: Optional[str] = None,
                 db: Session = Depends(get_db), user: models.User = Depends(require_osas_admin)):
    valid = {"barangay", "boarding_house", "gender", "department", "monthly_status"}
    requested = [g.strip() for g in group_by.split(",") if g.strip()]
    bad = [g for g in requested if g not in valid]
    if bad:
        raise HTTPException(400, f"Invalid group_by: {', '.join(bad)}")

    def compute(single: str) -> schemas.TallyReportSection:
        groups: dict[str, list[str]] = {}
        if single in ("gender", "department"):
            for s in db.query(models.User).filter(models.User.role == "student").all():
                label = ((s.gender or "Not specified").replace("_", " ").title()
                         if single == "gender"
                         else (s.course_section or "Not specified"))
                groups.setdefault(label, []).append(s.full_name)
        else:
            q = db.query(models.StatusUpdate)
            if month_label:
                q = q.filter(models.StatusUpdate.month_label == month_label)
            for u in q.all():
                nm = u.student.full_name if u.student else "Unknown"
                if single == "monthly_status":
                    label = {"same": "Same boarding house", "transferred": "Transferred",
                             "moved_home": "Moved back home"}.get(u.status_type, u.status_type)
                    groups.setdefault(label, []).append(nm)
                    continue
                if u.status_type == "transferred":
                    hn, bar = u.new_boarding_house_name or "Unknown", u.new_barangay or "Unknown"
                elif u.boarding_house:
                    hn, bar = u.boarding_house.name, u.boarding_house.barangay
                else:
                    continue
                label = bar if single == "barangay" else hn
                groups.setdefault(label, []).append(nm)
        rows = [schemas.TallyReportRow(group_label=k, count=len(v), student_names=sorted(v))
                for k, v in sorted(groups.items())]
        return schemas.TallyReportSection(group_by=single, rows=rows,
                                          total=sum(len(v) for v in groups.values()))

    sections = [compute(g) for g in requested]
    return schemas.TallyReportOut(
        group_by=",".join(requested),
        month_label=month_label,
        sections=sections,
        rows=sections[0].rows if sections else [],
        total=sections[0].total if len(sections) == 1 else sum(s.total for s in sections),
    )


# ─── Password reset ───────────────────────────────────────────────────────────
import secrets as _secrets

@app.post("/api/auth/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Generates a 1-hour password-reset token for the given email.

    In production you would send this token to the user's email (via
    SendGrid, SMTP, etc.). Here it is returned in the response so the
    flow can be demonstrated without an email server — copy the token
    shown on the 'check your email' screen and paste it into the reset
    form that opens at /student/reset-password?token=...
    """
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    # Always return 200 even when the email doesn't exist to prevent
    # account enumeration (attacker can't tell if an email is registered).
    if not user:
        return {"message": "If that email is registered, a reset link has been sent.",
                "demo_token": None}

    # Invalidate any existing unused tokens for this user
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used == False,
    ).delete()
    db.commit()

    token = _secrets.token_urlsafe(32)
    db.add(models.PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1),
    ))
    db.commit()

    # In production: send email here with a link like:
    #   https://geotrack-student.vercel.app/student/reset-password?token={token}
    # For the school demo we return the token directly.
    return {
        "message": "Password reset token generated. In production this would be emailed.",
        "demo_token": token,
        "demo_note": "Copy this token and paste it into the reset-password form.",
    }


@app.post("/api/auth/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == payload.token,
        models.PasswordResetToken.used == False,
    ).first()

    if not record:
        raise HTTPException(status_code=400, detail="Invalid or already-used reset token.")
    if record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")

    record.user.hashed_password = hash_password(payload.new_password)
    # Clear any lockout so the student can sign in immediately
    record.user.failed_login_attempts = 0
    record.user.locked_until = None
    record.used = True
    db.commit()

    return {"message": "Password updated successfully. You can now sign in with your new password."}


@app.get("/api/")
def root():
    return {"message": "GeoTrack API v2 — see /docs for the API explorer."}

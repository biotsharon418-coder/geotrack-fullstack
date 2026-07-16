"""
schemas.py — Pydantic request/response shapes for GeoTrack.
"""

import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Literal
from datetime import datetime


# ─── Password validator ───────────────────────────────────────────────────────
def validate_strong_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", v):
        raise ValueError("Must contain at least one lowercase letter.")
    if not re.search(r"\d", v):
        raise ValueError("Must contain at least one number.")
    if not re.search(r"[!@#$%^&*()\-_=+\[\]{};:,.<>/?]", v):
        raise ValueError("Must contain at least one special character (!@#$%…).")
    return v


# ─── Auth ─────────────────────────────────────────────────────────────────────
class RegisterStudentRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    course_section: Optional[str] = None
    gender: Optional[Literal["male", "female", "prefer_not_to_say"]] = None
    # Boarding house collected at sign-up so they appear on the OSAS
    # map immediately after their first login.
    boarding_house_name: Optional[str] = None
    boarding_house_barangay: Optional[str] = None
    boarding_house_latitude: Optional[float] = None
    boarding_house_longitude: Optional[float] = None

    @field_validator("email")
    @classmethod
    def check_lspu_domain(cls, v: str) -> str:
        import re as _re
        v = str(v).lower().strip()
        if not v.endswith("@lspu.edu.ph"):
            raise ValueError(
                "Only LSPU institutional emails are accepted. "
                "Your email should follow the format: STUDENTID@lspu.edu.ph "
                "(e.g. 0323-4198@lspu.edu.ph)."
            )
        local = v.split("@")[0]
        # Accept student-ID format: digits and hyphens only (e.g. 0323-4198)
        if not _re.fullmatch(r"[\d][\d\-]+[\d]", local):
            raise ValueError(
                "Your institutional email must use your Student ID as the username "
                "(e.g. 0323-4198@lspu.edu.ph). Personal name formats are not accepted."
            )
        return v

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_strong_password(v)


class RegisterOsasRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    position: Optional[str] = None

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_strong_password(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str


# ─── Boarding houses ──────────────────────────────────────────────────────────
class BoardingHouseOut(BaseModel):
    id: int
    name: str
    barangay: str
    monthly_rate: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_verified: bool

    class Config:
        from_attributes = True


class BoardingHouseCreate(BaseModel):
    name: str
    barangay: str
    monthly_rate: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    submitted_by: Optional[str] = None


class BoardingHouseUpdate(BaseModel):
    name: Optional[str] = None
    barangay: Optional[str] = None
    monthly_rate: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    submitted_by: Optional[str] = None


# ─── Status updates ───────────────────────────────────────────────────────────
class StatusUpdateCreate(BaseModel):
    status_type: Literal["same", "transferred", "moved_home"]
    boarding_house_id: Optional[int] = None
    new_boarding_house_name: Optional[str] = None
    new_barangay: Optional[str] = None
    note: Optional[str] = None
    month_label: str


class StatusUpdateEdit(BaseModel):
    status_type: Optional[Literal["same", "transferred", "moved_home"]] = None
    new_boarding_house_name: Optional[str] = None
    new_barangay: Optional[str] = None
    note: Optional[str] = None


class StatusUpdateOut(BaseModel):
    id: int
    status_type: str
    new_boarding_house_name: Optional[str] = None
    new_barangay: Optional[str] = None
    note: Optional[str] = None
    month_label: str
    is_flagged: bool
    flag_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StatusUpdateAdminOut(StatusUpdateOut):
    student_name: str
    student_email: str


# ─── Reviews ─────────────────────────────────────────────────────────────────
class ReviewCreate(BaseModel):
    rating: int
    text: str


class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    text: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    rating: int
    text: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Concerns ────────────────────────────────────────────────────────────────
class ConcernCreate(BaseModel):
    category: Literal["safety", "landlord", "maintenance", "other"]
    details: str


class ConcernOut(BaseModel):
    id: int
    category: str
    details: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConcernAdminOut(ConcernOut):
    student_name: str
    student_email: str


# ─── Account management ───────────────────────────────────────────────────────
class OsasAccountOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    position: Optional[str] = None

    class Config:
        from_attributes = True


class OsasAccountUpdate(BaseModel):
    full_name: Optional[str] = None
    position: Optional[str] = None


class StudentAccountOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    course_section: Optional[str] = None
    gender: Optional[str] = None
    created_at: datetime
    is_archived: bool = False
    archived_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MyProfileOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    course_section: Optional[str] = None
    gender: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MyProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    course_section: Optional[str] = None
    gender: Optional[Literal["male", "female", "prefer_not_to_say"]] = None


# ─── Password reset ───────────────────────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_strength(cls, v: str) -> str:
        return validate_strong_password(v)


# ─── Tally report ─────────────────────────────────────────────────────────────
class TallyReportRow(BaseModel):
    group_label: str
    count: int
    student_names: list[str] = []


class TallyReportSection(BaseModel):
    group_by: str
    rows: list[TallyReportRow]
    total: int


class TallyReportOut(BaseModel):
    group_by: str           # comma-joined selected groupings
    month_label: Optional[str] = None
    sections: list[TallyReportSection] = []
    rows: list[TallyReportRow] = []   # first section rows, for backward compat
    total: int


# ─── Geo-map ─────────────────────────────────────────────────────────────────
class StudentMapPoint(BaseModel):
    student_name: str
    boarding_house_name: str
    barangay: str
    latitude: float
    longitude: float
    is_flagged: bool

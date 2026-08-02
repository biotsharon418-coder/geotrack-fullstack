"""
models.py — SQLAlchemy table definitions for GeoTrack.
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="student")
    course_section = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    position = Column(String, nullable=True)

    # Login security
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)

    # Email verification
    is_email_verified = Column(Boolean, default=False)
    email_otp = Column(String, nullable=True)
    email_otp_expires = Column(DateTime, nullable=True)

    # 2FA
    totp_secret = Column(String, nullable=True)   # base32 secret for TOTP
    two_fa_enabled = Column(Boolean, default=False)
    pending_2fa_token = Column(String, nullable=True)  # short-lived token after pwd check
    pending_2fa_expires = Column(DateTime, nullable=True)

    # Lifecycle
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    status_updates  = relationship("StatusUpdate",       back_populates="student",  cascade="all, delete-orphan")
    reviews         = relationship("Review",             back_populates="author",   cascade="all, delete-orphan")
    concerns        = relationship("Concern",            back_populates="student",  cascade="all, delete-orphan")
    reset_tokens    = relationship("PasswordResetToken", back_populates="user",     cascade="all, delete-orphan")


class BoardingHouse(Base):
    __tablename__ = "boarding_houses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    barangay = Column(String, nullable=False)
    monthly_rate = Column(Float, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_verified = Column(Boolean, default=False)
    submitted_by = Column(String, nullable=True)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    status_updates = relationship("StatusUpdate", back_populates="boarding_house", cascade="all, delete-orphan")
    reviews        = relationship("Review",        back_populates="boarding_house", cascade="all, delete-orphan")
    submitter      = relationship("User", foreign_keys=[submitted_by_id])


class StatusUpdate(Base):
    __tablename__ = "status_updates"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    boarding_house_id = Column(Integer, ForeignKey("boarding_houses.id"), nullable=True)
    status_type = Column(String, nullable=False)
    new_boarding_house_name = Column(String, nullable=True)
    new_barangay = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    month_label = Column(String, nullable=False)
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student        = relationship("User",          back_populates="status_updates")
    boarding_house = relationship("BoardingHouse", back_populates="status_updates")


class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    boarding_house_id = Column(Integer, ForeignKey("boarding_houses.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    boarding_house = relationship("BoardingHouse", back_populates="reviews")
    author         = relationship("User",          back_populates="reviews")


class Concern(Base):
    __tablename__ = "concerns"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    status = Column(String, default="open")
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", back_populates="concerns")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reset_tokens")


class AuditLog(Base):
    """
    Every significant action is logged here:
    who did what, to which resource, and when.
    actor_role: "student" | "osas_admin" | "system"
    action:     "create" | "update" | "delete" | "flag" | "verify" |
                "archive" | "login" | "logout" | "export"
    """
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_name = Column(String, nullable=False, default="System")
    actor_role = Column(String, nullable=False, default="system")
    action = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)   # e.g. "boarding_house", "student", "status_update"
    resource_id = Column(Integer, nullable=True)
    resource_label = Column(String, nullable=True)   # human-readable label, e.g. dorm name
    detail = Column(Text, nullable=True)             # optional extra context
    created_at = Column(DateTime, default=datetime.utcnow)

class StudentCompliance(Base):
    __tablename__ = "student_compliance"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    month = Column(String, nullable=False)

    year = Column(Integer, nullable=False)

    submission_status = Column(String, default="Pending")

    submitted_at = Column(DateTime)

    deadline = Column(DateTime, nullable=False)

    remarks = Column(String)

    student = relationship(
        "User",
        backref="compliance_records"
    )


class StudentFlag(Base):
    __tablename__ = "student_flags"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("users.id"), unique=True)

    missed_count = Column(Integer, default=0)

    compliance_status = Column(String, default="Good")

    is_flagged = Column(Boolean, default=False)

    reason = Column(String, nullable=True)

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    student = relationship("User")


class Notification(Base):
    """An in-app notification for one recipient (student or osas_admin).
    category is a short machine key (e.g. 'sos_alert', 'flagging',
    'monthly_reminder', 'approval', 'rejection', 'announcement',
    'resolution', 'emergency_alert') that the frontend maps to a label."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class EmergencyCase(Base):
    """An SOS alert a student has triggered. category is one of the fixed
    EMERGENCY_CATEGORIES in main.py. status moves Active -> Responding ->
    Resolved (or Cancelled if the student calls it off themselves)."""
    __tablename__ = "emergency_cases"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    category = Column(String, nullable=False)
    details = Column(Text, nullable=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    status = Column(String, default="Active")  # Active | Responding | Resolved | Cancelled

    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    student = relationship("User")
    timeline = relationship(
        "EmergencyTimelineEntry",
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="EmergencyTimelineEntry.created_at",
    )


class EmergencyTimelineEntry(Base):
    """One entry in an emergency case's timeline: the initial SOS trigger,
    every OSAS status change, and every response note, in order. This is
    what powers both the "Emergency Timeline" and "Response Tracking"
    features."""
    __tablename__ = "emergency_timeline"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("emergency_cases.id"), nullable=False)

    actor_name = Column(String, nullable=False)
    actor_role = Column(String, nullable=False)  # student | osas_admin | system
    event = Column(String, nullable=False)        # short label, e.g. "SOS triggered", "Status: Responding"
    note = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("EmergencyCase", back_populates="timeline")
"""
models.py — SQLAlchemy table definitions for GeoTrack.
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
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
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    status_updates = relationship("StatusUpdate", back_populates="student", cascade="all, delete-orphan")
    reviews        = relationship("Review",        back_populates="author",  cascade="all, delete-orphan")
    concerns       = relationship("Concern",       back_populates="student", cascade="all, delete-orphan")
    reset_tokens   = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")


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
    created_at = Column(DateTime, default=datetime.utcnow)

    status_updates = relationship("StatusUpdate", back_populates="boarding_house", cascade="all, delete-orphan")
    reviews        = relationship("Review",        back_populates="boarding_house", cascade="all, delete-orphan")


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

    student       = relationship("User",          back_populates="status_updates")
    boarding_house= relationship("BoardingHouse", back_populates="status_updates")


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
    """Short-lived token for password reset. In production, token is
    emailed to the user. Here it is returned in the API response for
    demo purposes."""
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reset_tokens")

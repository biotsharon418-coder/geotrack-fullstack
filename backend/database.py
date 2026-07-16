"""
database.py
Supports both SQLite (local dev) and PostgreSQL (Railway production).
Set DATABASE_URL environment variable in Railway to switch to PostgreSQL.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Railway sets DATABASE_URL automatically when you add a PostgreSQL plugin.
# Locally it falls back to SQLite so you don't need any setup.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./geotrack.db")

# Railway's PostgreSQL URL starts with "postgres://" but SQLAlchemy needs "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

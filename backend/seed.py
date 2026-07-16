"""
seed.py — populate geotrack.db with sample data.
Run once: python seed.py
"""
from database import SessionLocal, engine, Base
import models
from auth import hash_password
from datetime import datetime

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(models.User).count() == 0:
    juan  = models.User(full_name="Juan Dela Cruz",  email="0323-4198@lspu.edu.ph",  hashed_password=hash_password("Student1!"),  role="student",    course_section="BSIT-3A", gender="male")
    maria = models.User(full_name="Maria Santos",    email="0421-5512@lspu.edu.ph",    hashed_password=hash_password("Student1!"),  role="student",    course_section="BSIT-3A", gender="female")
    pedro = models.User(full_name="Pedro Bautista",  email="0318-7743@lspu.edu.ph",  hashed_password=hash_password("Student1!"),  role="student",    course_section="BSIT-2B", gender="male")
    admin = models.User(full_name="Ms. Reyes",       email="reyes.osas@lspu.edu.ph",       hashed_password=hash_password("OsasAdmin1!"), role="osas_admin", position="OSAS Head")
    db.add_all([juan, maria, pedro, admin]); db.commit()

    h1 = models.BoardingHouse(name="Sto. Niño Lodge",  barangay="Brgy. Del Remedio", monthly_rate=1800, latitude=14.0712, longitude=121.3204, is_verified=True,  submitted_by="Student — Juan Dela Cruz")
    h2 = models.BoardingHouse(name="Green Haven Dorm", barangay="Brgy. San Benito",  monthly_rate=2000, latitude=14.0651, longitude=121.3281, is_verified=True,  submitted_by="Student — Pedro Bautista")
    h3 = models.BoardingHouse(name="Pamela's Place",   barangay="Brgy. Balayhangin", monthly_rate=1500, latitude=14.0723, longitude=121.3177, is_verified=False, submitted_by="Student — Maria Santos")
    db.add_all([h1, h2, h3]); db.commit()

    month = datetime.utcnow().strftime("%B %Y")
    db.add_all([
        models.Review(boarding_house_id=h1.id, author_id=juan.id,  rating=5, text="Maayos ang water supply at malapit lang sa campus."),
        models.Review(boarding_house_id=h1.id, author_id=maria.id, rating=4, text="Sulit sa price, pero medyo maingay tuwing weekend."),
        models.Review(boarding_house_id=h2.id, author_id=pedro.id, rating=4, text="Malinis at secure, may CCTV sa gate."),
        models.StatusUpdate(student_id=juan.id,  boarding_house_id=h1.id, status_type="same", month_label=month),
        models.StatusUpdate(student_id=maria.id, boarding_house_id=h3.id, status_type="same", month_label=month),
        models.StatusUpdate(student_id=pedro.id, boarding_house_id=h2.id, status_type="same", month_label=month, is_flagged=True, flag_reason="No update for 2 months prior"),
    ])
    db.commit()

    print("Seed data created:")
    print("  Students:  0323-4198@lspu.edu.ph / Student1!")
    print("             0421-5512@lspu.edu.ph / Student1!")
    print("             0318-7743@lspu.edu.ph / Student1!  (flagged)")
    print("  OSAS:      reyes.osas@lspu.edu.ph / OsasAdmin1!")
else:
    print("Database already seeded — skipping.")

db.close()

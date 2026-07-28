# GeoTrack v3 — Deployment Guide
## Your live URLs
- Student app: https://geotrack-lspu.vercel.app/student/login
- OSAS admin:  https://geotrack-lspu.vercel.app/osas/login

---

## How to push updates to the live site

Since you're already deployed on Railway + Vercel, updating is just:

```powershell
# 1. Make sure you are in the geotrack-fullstack folder
cd geotrack-fullstack

# 2. Stage all changes
git add .

# 3. Commit with a message describing what changed
git commit -m "Add 2FA, OTP, audit logs, charts, export"

# 4. Push — Railway and Vercel will auto-deploy within ~2 minutes
git push
```

That's it. Both Railway (backend) and Vercel (frontend) watch your
GitHub repo and redeploy automatically on every push.

---

## New environment variables needed in Railway

Go to Railway → your project → Variables and add:

| Variable | Value |
|---|---|
| `SECRET_KEY` | (already set — keep it) |
| `ALLOWED_ORIGINS` | `https://geotrack-lspu.vercel.app` |
| `DATABASE_URL` | (auto-set by Railway PostgreSQL — keep it) |

No new env vars needed in Vercel.

---

## After pushing — seed the production database

Open the Railway shell (or use the Railway CLI):

```powershell
# Install Railway CLI if you don't have it yet
npm install -g @railway/cli

# Login
railway login

# Open a shell in your backend service
railway shell

# Inside the Railway shell:
python seed.py
```

Or call the API directly to create the first OSAS account:
```
POST https://YOUR_RAILWAY_URL/api/auth/register/osas
Body: {
  "full_name": "Ms. Reyes",
  "email": "reyes.osas@lspu.edu.ph",
  "password": "YourPass1!"
}
```

---

## What's new in v3

### Security
- **Account lockout** — 5 failed login attempts locks the account for 5 minutes
- **Email OTP verification** — new student accounts must verify their email with a 6-digit code before the account is active. In production, wire up SendGrid (see below). In the school demo the code is shown on screen.
- **Two-Factor Authentication (2FA / TOTP)** — students can enable 2FA in their profile using any authenticator app (Google Authenticator, Authy, etc.)
- **Session timeout** — OSAS admins are automatically signed out after 15 minutes of inactivity, with a 1-minute warning popup
- **Password policy** — 8–12 characters, must have uppercase, lowercase, number, and special character
- **Forgot password** — generates a reset token (emailed in production via SendGrid, shown on screen in the demo)

### Dashboard
- **4 stat cards** — total students, updates submitted, flagged, pending verifications
- **Pie charts** — students by gender, monthly status breakdown
- **Bar charts** — students by department, students by barangay
- **Geo-map** — real Leaflet/OpenStreetMap with student boarding house pins
- **Latest activities** — last 10 audit log entries shown on the dashboard
- **Flagged students panel** — list with reason

### Activity logs (Audit trail)
- Every action is recorded: who created, updated, deleted, flagged, verified, archived, exported
- Searchable and filterable by action type and resource type
- Accessible via the "Activity logs" sidebar item

### Student status monitor
- **Search** — filter by student name or email
- **Checkbox filters** — Verified / Pending / Flagged / Male / Female / Month

### Reports
- **Multi-select groupings** — check any combination of Barangay, Boarding house, Gender, Department, Monthly status
- **Charts inside the report** — pie chart (≤5 groups) or bar chart (>5 groups) per section
- **Report preview** before downloading
- **Export formats** — PDF (formatted table), Excel (.xlsx), CSV
- **Print** — browser native print, sidebar and controls hidden

### Boarding house verification
- Boarding houses are submitted by students at sign-up (no manual OSAS registration form)
- OSAS can verify, edit (with Nominatim address geocoding), view inline reviews, delete

---

## Connecting real email (SendGrid) for OTP and password reset

1. Sign up at https://sendgrid.com (free: 100 emails/day)
2. Create an API key in SendGrid dashboard
3. Add `SENDGRID_API_KEY` to Railway environment variables
4. In `backend/main.py`, find the comment `# In production: send email here` and replace with:

```python
import sendgrid
from sendgrid.helpers.mail import Mail
sg = sendgrid.SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
sg.send(Mail(
    from_email="noreply@geotrack-lspu.edu.ph",
    to_emails=user.email,
    subject="GeoTrack — Verify your email",
    html_content=f"<p>Your verification code is: <strong>{otp}</strong></p><p>Expires in 15 minutes.</p>"
))
```

5. Do the same for the password reset token endpoint.

---

## Local development (no changes from before)

```powershell
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Local URLs:
- Student: http://localhost:5173/student/login
- OSAS:    http://localhost:5173/osas/login
- API docs: http://127.0.0.1:8000/docs

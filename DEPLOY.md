# GeoTrack — Deployment Guide
Deploy backend to Railway (free), frontend to Vercel (free).
Student app = mobile-friendly URL · OSAS app = separate URL · Same backend/DB.

---

## STEP 1 — Push to GitHub (do this first)

```powershell
# In your project folder
git init
git add .
git commit -m "Initial GeoTrack deploy"
```

Create a new repo at https://github.com/new (name it geotrack-fullstack, keep it Public).

```powershell
git remote add origin https://github.com/YOUR_USERNAME/geotrack-fullstack.git
git branch -M main
git push -u origin main
```

---

## STEP 2 — Deploy Backend to Railway

1. Go to https://railway.app → sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo** → select `geotrack-fullstack`
3. Railway will detect the `backend/` folder. If asked for root directory, enter `backend`
4. Add a **PostgreSQL** plugin:
   - In your Railway project, click **+ New** → **Database** → **Add PostgreSQL**
   - Railway automatically sets `DATABASE_URL` in your backend service — nothing to copy
5. Set these environment variables in Railway (Settings → Variables):

   | Variable | Value |
   |---|---|
   | `SECRET_KEY` | (generate: `python -c "import secrets; print(secrets.token_hex(32))"`) |
   | `ALLOWED_ORIGINS` | (fill in after Step 3 once you have Vercel URLs) |
   | `PORT` | `8000` |

6. Click **Deploy** — wait ~2 minutes
7. Copy your Railway URL: looks like `https://geotrack-production-xxxx.up.railway.app`

---

## STEP 3 — Deploy Student App to Vercel

The student app is the same React app accessed via `/student/...` routes.

1. Go to https://vercel.com → sign up with GitHub
2. Click **Add New Project** → import `geotrack-fullstack`
3. Set **Root Directory** to `frontend`
4. Add Environment Variable:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://YOUR_RAILWAY_URL.up.railway.app/api` |

5. Click **Deploy**
6. Once deployed, go to **Settings → Domains** and add a custom subdomain like:
   `geotrack-student.vercel.app`
7. Copy this URL — students use: `https://geotrack-student.vercel.app/student/login`

---

## STEP 4 — Deploy OSAS Admin App to Vercel

The OSAS web app is the SAME codebase, just a second Vercel deployment pointing at `/osas/...` routes.

1. In Vercel, click **Add New Project** again → import `geotrack-fullstack` again
2. Set **Root Directory** to `frontend` (same as before)
3. Add the SAME environment variable:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://YOUR_RAILWAY_URL.up.railway.app/api` |

4. Click **Deploy**
5. Go to **Settings → Domains** → rename to `geotrack-osas.vercel.app`
6. OSAS staff use: `https://geotrack-osas.vercel.app/osas/login`

---

## STEP 5 — Update CORS in Railway

Now that you have both Vercel URLs, go back to Railway and update `ALLOWED_ORIGINS`:

```
ALLOWED_ORIGINS=https://geotrack-student.vercel.app,https://geotrack-osas.vercel.app
```

Click **Redeploy** in Railway.

---

## STEP 6 — Seed the production database

Open the Railway backend shell (or use the /docs endpoint) and run:

```bash
# In Railway shell or via railway CLI:
python seed.py
```

Or POST directly to the API:
```
POST https://YOUR_RAILWAY_URL.up.railway.app/api/auth/register/osas
{
  "full_name": "Ms. Reyes",
  "email": "reyes.osas@lspu.edu.ph",
  "password": "YourStrongPassword1!"
}
```

---

## Final URLs

| Who | URL | What they see |
|---|---|---|
| Students | `https://geotrack-student.vercel.app/student/login` | Mobile-style boarding house app |
| OSAS Admin | `https://geotrack-osas.vercel.app/osas/login` | Full web dashboard |
| API Docs | `https://YOUR_RAILWAY_URL.up.railway.app/docs` | Interactive API explorer |

---

## Powershell commands summary (Windows)

```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Check your deployment status
railway status

# View logs
railway logs

# Open shell to run seed.py
railway shell
python seed.py
```

---

## Forgot Password — How it works in production

In the school demo, the reset token is shown on screen.
In production, connect an email service:

1. Sign up at https://sendgrid.com (free 100 emails/day)
2. Add `SENDGRID_API_KEY` to Railway env vars
3. In `main.py`, replace the `# In production: send email here` comment with:

```python
import sendgrid
from sendgrid.helpers.mail import Mail

sg = sendgrid.SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
message = Mail(
    from_email="noreply@geotrack.lspu.edu.ph",
    to_emails=user.email,
    subject="GeoTrack — Password Reset",
    html_content=f"""
        <p>Click this link to reset your password (expires in 1 hour):</p>
        <p><a href="https://geotrack-student.vercel.app/student/reset-password?token={token}">
        Reset my password</a></p>
    """
)
sg.send(message)
```

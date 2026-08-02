"""
email_utils.py - Real email delivery for GeoTrack's notification module.

Reads SMTP credentials from environment variables so the same code works
locally (where SMTP usually isn't configured) and on Railway (where it is):

    SMTP_HOST        e.g. smtp.gmail.com
    SMTP_PORT        e.g. 587
    SMTP_USER        the mailbox to send from
    SMTP_PASSWORD    an app password (NOT the account password, for Gmail)
    SMTP_FROM_NAME   display name, defaults to "GeoTrack - LSPU-SPCC"

If SMTP_HOST/SMTP_USER/SMTP_PASSWORD aren't set, send_email() logs a note
and returns False instead of raising -- a missing mail configuration should
never take down an unrelated request (registration, flagging, an SOS
alert, etc). Every call site treats the return value as best-effort.
"""
import os
import smtplib
import ssl
from email.message import EmailMessage

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "GeoTrack - LSPU-SPCC")

_warned_once = False


def email_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def send_email(to_email: str, subject: str, body_text: str) -> bool:
    """Send a plain-text email. Returns True on success, False otherwise
    (including "not configured") -- never raises, so callers can fire this
    off without wrapping every call in try/except."""
    global _warned_once
    if not email_configured():
        if not _warned_once:
            print("[email_utils] SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD) "
                  "- notification emails will be skipped.")
            _warned_once = True
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
    msg["To"] = to_email
    msg.set_content(body_text)

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[email_utils] Failed to send to {to_email!r}: {e}")
        return False


# ─── Notification templates ────────────────────────────────────────────────
# Kept as plain functions (not a class) so each call site stays a one-liner.

def notify_monthly_reminder(to_email, full_name, month_label, deadline_day):
    return send_email(
        to_email,
        f"Reminder: submit your GeoTrack status update for {month_label}",
        f"Hi {full_name},\n\n"
        f"This is a reminder from OSAS that you haven't submitted your monthly "
        f"boarding house status update for {month_label} yet.\n\n"
        f"Please log in to GeoTrack and submit it before the {deadline_day}th of the month.\n\n"
        f"- GeoTrack, LSPU-SPCC OSAS",
    )


def notify_final_reminder(to_email, full_name, month_label):
    return send_email(
        to_email,
        f"Final reminder: GeoTrack status update for {month_label} is due",
        f"Hi {full_name},\n\n"
        f"This is a FINAL reminder that your monthly boarding house status update "
        f"for {month_label} is still missing. Submissions left unsubmitted past the "
        f"deadline will be marked Missed and may affect your compliance record.\n\n"
        f"Please submit it as soon as possible.\n\n"
        f"- GeoTrack, LSPU-SPCC OSAS",
    )


def notify_flagged(to_email, full_name, missed_count):
    return send_email(
        to_email,
        "Your GeoTrack compliance status has been flagged",
        f"Hi {full_name},\n\n"
        f"Your account has been flagged by OSAS after {missed_count} missed monthly "
        f"status updates. Please submit your current status as soon as possible and "
        f"reach out to OSAS if you have concerns about this.\n\n"
        f"- GeoTrack, LSPU-SPCC OSAS",
    )


def notify_boarding_house_approved(to_email, full_name, house_name):
    return send_email(
        to_email,
        f'"{house_name}" has been verified',
        f"Hi {full_name},\n\n"
        f'Good news - the boarding house "{house_name}" you submitted has been '
        f"reviewed and verified by OSAS. It's now visible to other students in the "
        f"GeoTrack directory.\n\n"
        f"- GeoTrack, LSPU-SPCC OSAS",
    )


def notify_boarding_house_rejected(to_email, full_name, house_name, reason):
    return send_email(
        to_email,
        f'"{house_name}" was not verified',
        f"Hi {full_name},\n\n"
        f'The boarding house "{house_name}" you submitted was reviewed by OSAS and '
        f"could not be verified at this time.\n\n"
        f"Reason: {reason or 'Not specified.'}\n\n"
        f"You're welcome to update the details and it will be reviewed again.\n\n"
        f"- GeoTrack, LSPU-SPCC OSAS",
    )


def notify_emergency_alert(to_email, category, student_name, details):
    return send_email(
        to_email,
        f"[URGENT] SOS alert - {category}",
        f"An SOS alert was just triggered on GeoTrack.\n\n"
        f"Student: {student_name}\n"
        f"Category: {category}\n"
        f"Details: {details or '(none provided)'}\n\n"
        f"Please open the OSAS Emergencies page to respond.\n\n"
        f"- GeoTrack",
    )


def notify_announcement(to_email, full_name, subject, message):
    return send_email(
        to_email,
        f"[GeoTrack announcement] {subject}",
        f"Hi {full_name},\n\n{message}\n\n- GeoTrack, LSPU-SPCC OSAS",
    )


def notify_email_otp(to_email, full_name, otp):
    return send_email(
        to_email,
        "Your GeoTrack verification code",
        f"Hi {full_name},\n\n"
        f"Your GeoTrack email verification code is: {otp}\n\n"
        f"This code expires in 15 minutes.\n\n"
        f"- GeoTrack, LSPU-SPCC OSAS",
    )

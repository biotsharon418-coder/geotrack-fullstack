@app.post("/api/student/status-updates", response_model=schemas.StatusUpdateOut)
def submit_status(payload: schemas.StatusUpdateCreate, db: Session = Depends(get_db),
                  user: models.User = Depends(require_student)):

    if payload.status_type == "transferred" and not payload.new_boarding_house_name:
        raise HTTPException(400, "new_boarding_house_name required when transferred")

    # Always use the current month/year automatically
    current_month = datetime.now().strftime("%B %Y")

    u = models.StatusUpdate(
        student_id=user.id,
        boarding_house_id=payload.boarding_house_id,
        status_type=payload.status_type,
        new_boarding_house_name=payload.new_boarding_house_name,
        new_barangay=payload.new_barangay,
        note=payload.note,
        month_label=current_month
    )

    db.add(u)
    db.commit()
    db.refresh(u)

    log_action(
        db,
        user,
        "create",
        "status_update",
        u.id,
        current_month,
        f"Status: {payload.status_type}" +
        (f" -> {payload.new_boarding_house_name}" if payload.new_boarding_house_name else "")
    )

    return u
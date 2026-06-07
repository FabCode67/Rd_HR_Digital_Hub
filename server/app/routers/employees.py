"""
Employee API routes.
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.models import Employee, EmployeeStatus, EmployeePosition, Position
from app.schemas import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeePositionCreate,
    EmployeePositionResponse,
    EmployeePositionDetail,
)
from app.services import EmployeeService, PositionService, auth_service
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/employees", tags=["employees"])


# ── Create ─────────────────────────────────────────────────────────────────────

@router.post("", response_model=EmployeeResponse)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    existing = EmployeeService.get_by_email(db, employee.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    emp_data = employee.dict()
    emp_data["hashed_password"] = auth_service.get_password_hash("NCBAStaff@123")
    return EmployeeService.create(db, emp_data)


# ── Fixed-path routes (MUST come before /{employee_id}) ────────────────────────

@router.get("/stats", dependencies=[Depends(require_admin)])
def get_employee_stats(db: Session = Depends(get_db)):
    """Return employee summary stats in one query."""
    from sqlalchemy import func
    rows = db.query(Employee.status, func.count(Employee.id)).group_by(Employee.status).all()
    counts = {str(r[0].value if hasattr(r[0], "value") else r[0]): r[1] for r in rows}
    total = sum(counts.values())
    return {
        "total":      total,
        "active":     counts.get("ACTIVE", 0),
        "inactive":   counts.get("INACTIVE", 0),
        "suspended":  counts.get("SUSPENDED", 0),
        "terminated": counts.get("TERMINATED", 0),
    }


@router.get("/department/{department_id}", response_model=List[EmployeeResponse])
def get_employees_by_department(
    department_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    return EmployeeService.get_by_department(db, department_id, skip=skip, limit=limit)


# ── List ───────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[EmployeeResponse])
def list_employees(
    status: EmployeeStatus = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    q = db.query(Employee)
    if status:
        q = q.filter(Employee.status == status)
    if search:
        term = f"%{search}%"
        q = q.filter(
            (Employee.full_name.ilike(term)) | (Employee.email.ilike(term))
        )
    return q.order_by(Employee.full_name).offset(skip).limit(limit).all()


# ── /{employee_id} routes ──────────────────────────────────────────────────────

@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    from app.models import UserRole
    if current_user.role != UserRole.ADMIN and current_user.id != employee.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return employee


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: UUID,
    employee: EmployeeUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    db_emp = EmployeeService.get_by_id(db, employee_id)
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if employee.email and employee.email != db_emp.email:
        if EmployeeService.get_by_email(db, employee.email):
            raise HTTPException(status_code=400, detail="Email already registered")
    return EmployeeService.update(db, employee_id, employee)


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    if not EmployeeService.delete(db, employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted successfully"}


@router.post("/{employee_id}/assign-position", response_model=EmployeePositionResponse)
def assign_to_position(
    employee_id: UUID,
    assignment: EmployeePositionCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    try:
        return EmployeeService.assign_to_position(
            db, employee_id, assignment.position_id, assignment.start_date
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{employee_id}/reassign-position", response_model=EmployeePositionResponse)
def reassign_to_position(
    employee_id: UUID,
    assignment: EmployeePositionCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    try:
        return EmployeeService.assign_to_position(
            db, employee_id, assignment.position_id, assignment.start_date
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{employee_position_id}/unassign")
def unassign_from_position(
    employee_position_id: UUID,
    end_date: datetime = Query(None),
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    result = EmployeeService.unassign_from_position(db, employee_position_id, end_date)
    if not result:
        raise HTTPException(status_code=404, detail="Employee position record not found")
    return {"message": "Employee unassigned successfully"}


@router.get("/{employee_id}/current-position", response_model=EmployeePositionDetail)
def get_current_position(
    employee_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    from app.models import UserRole
    if current_user.role != UserRole.ADMIN and current_user.id != employee.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    position_record = EmployeeService.get_current_position(db, employee_id)
    if not position_record:
        raise HTTPException(status_code=404, detail="Employee has no current position assigned")
    return position_record


@router.get("/{employee_id}/position-history", response_model=List[EmployeePositionDetail])
def get_position_history(
    employee_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    from app.models import UserRole
    if current_user.role != UserRole.ADMIN and current_user.id != employee.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return EmployeeService.get_position_history(db, employee_id)


@router.post("/{employee_id}/upload-avatar")
def upload_avatar(
    employee_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Upload a profile image to Cloudinary and save the URL."""
    from app.models import UserRole
    from app.core.config import settings
    import cloudinary
    import cloudinary.uploader

    # Only admin or the employee themselves can upload
    if current_user.role != UserRole.ADMIN and str(current_user.id) != str(employee_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    # Configure Cloudinary
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )

    try:
        result = cloudinary.uploader.upload(
            file.file,
            folder="hr_profiles",
            public_id=f"employee_{employee_id}",
            overwrite=True,
            transformation=[
                {"width": 400, "height": 400, "crop": "fill", "gravity": "face"},
                {"quality": "auto", "fetch_format": "auto"},
            ],
        )
        image_url = result["secure_url"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {str(e)}")

    # Save URL to employee record
    employee.profile_image_url = image_url
    db.add(employee)
    db.commit()

    return {"profile_image_url": image_url}


@router.delete("/{employee_id}/avatar")
def delete_avatar(
    employee_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Remove profile image."""
    from app.models import UserRole
    if current_user.role != UserRole.ADMIN and str(current_user.id) != str(employee_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee.profile_image_url = None
    db.add(employee)
    db.commit()
    return {"message": "Avatar removed"}


@router.get("/{employee_id}/career-timeline")
def get_career_timeline(
    employee_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """Full career timeline — positions + departments, enriched."""
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    history = (
        db.query(EmployeePosition)
        .options(joinedload(EmployeePosition.position).joinedload(Position.department))
        .filter(EmployeePosition.employee_id == employee_id)
        .order_by(EmployeePosition.start_date.desc())
        .all()
    )

    timeline = []
    for ep in history:
        pos  = ep.position
        dept = pos.department if pos else None
        end  = ep.end_date or datetime.utcnow()
        duration_days = (end - ep.start_date).days if ep.start_date else None
        timeline.append({
            "id":              str(ep.id),
            "position_id":     str(ep.position_id),
            "position_title":  pos.title if pos else None,
            "position_level":  pos.level if pos else None,
            "position_band":   pos.band  if pos else None,
            "department_id":   str(dept.id) if dept else None,
            "department_name": dept.name    if dept else None,
            "start_date":      ep.start_date.isoformat() if ep.start_date else None,
            "end_date":        ep.end_date.isoformat()   if ep.end_date   else None,
            "is_current":      ep.is_current,
            "duration_days":   duration_days,
        })

    return {
        "employee_id":    str(employee.id),
        "employee_name":  employee.full_name,
        "employee_email": employee.email,
        "total_entries":  len(timeline),
        "timeline":       timeline,
    }

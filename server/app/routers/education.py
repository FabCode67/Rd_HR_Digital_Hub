"""
Education & Training records API routes.
Staff can manage their own. Admin can view all.
"""
import uuid
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import EducationRecord, Employee, UserRole
from app.routers.auth import get_current_user

router = APIRouter(prefix="/education", tags=["education"])


class EducationRecordCreate(BaseModel):
    record_type: str
    title: str
    institution: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_current: bool = False
    grade: Optional[str] = None


class EducationRecordUpdate(BaseModel):
    record_type: Optional[str] = None
    title: Optional[str] = None
    institution: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_current: Optional[bool] = None
    grade: Optional[str] = None


def _to_dict(r: EducationRecord) -> dict:
    return {
        "id":              str(r.id),
        "employee_id":     str(r.employee_id),
        "record_type":     r.record_type,
        "title":           r.title,
        "institution":     r.institution,
        "description":     r.description,
        "start_date":      r.start_date.isoformat() if r.start_date else None,
        "end_date":        r.end_date.isoformat()   if r.end_date   else None,
        "is_current":      r.is_current,
        "certificate_url": r.certificate_url,
        "grade":           r.grade,
        "created_at":      r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/me")
def get_my_education_records(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get the authenticated employee's own education records."""
    records = (
        db.query(EducationRecord)
        .filter(EducationRecord.employee_id == current_user.id)
        .order_by(EducationRecord.start_date.desc())
        .all()
    )
    return [_to_dict(r) for r in records]


@router.post("/me")
def create_my_education_record(
    payload: EducationRecordCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Create an education record for the authenticated employee."""
    record = EducationRecord(
        id=uuid.uuid4(),
        employee_id=current_user.id,
        **payload.dict(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_dict(record)


@router.get("/employee/{employee_id}")
def get_education_records(
    employee_id: UUID,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN and str(current_user.id) != str(employee_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    records = (
        db.query(EducationRecord)
        .filter(EducationRecord.employee_id == employee_id)
        .order_by(EducationRecord.start_date.desc())
        .all()
    )
    return [_to_dict(r) for r in records]


@router.post("/employee/{employee_id}")
def create_education_record(
    employee_id: UUID,
    payload: EducationRecordCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN and str(current_user.id) != str(employee_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    if not db.query(Employee).filter(Employee.id == employee_id).first():
        raise HTTPException(status_code=404, detail="Employee not found")
    record = EducationRecord(
        id=uuid.uuid4(),
        employee_id=employee_id,
        **payload.dict(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_dict(record)


@router.put("/{record_id}")
def update_education_record(
    record_id: UUID,
    payload: EducationRecordUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    record = db.query(EducationRecord).filter(EducationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if current_user.role != UserRole.ADMIN and str(current_user.id) != str(record.employee_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(record, field, value)
    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return _to_dict(record)


@router.delete("/{record_id}")
def delete_education_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    record = db.query(EducationRecord).filter(EducationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if current_user.role != UserRole.ADMIN and str(current_user.id) != str(record.employee_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(record)
    db.commit()
    return {"message": "Record deleted"}


@router.post("/{record_id}/upload-certificate")
def upload_certificate(
    record_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    from app.core.config import settings
    import cloudinary, cloudinary.uploader

    record = db.query(EducationRecord).filter(EducationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if current_user.role != UserRole.ADMIN and str(current_user.id) != str(record.employee_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only images and PDFs are allowed")

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    try:
        result = cloudinary.uploader.upload(
            file.file,
            folder="hr_certificates",
            public_id=f"cert_{record_id}",
            overwrite=True,
            resource_type="auto",
        )
        record.certificate_url = result["secure_url"]
        record.updated_at = datetime.utcnow()
        db.commit()
        return {"certificate_url": result["secure_url"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

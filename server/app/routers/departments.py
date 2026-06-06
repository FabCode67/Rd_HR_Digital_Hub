"""
Department API routes.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import Department, Position
from app.schemas import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.services import DepartmentService
from app.routers.auth import require_admin

router = APIRouter(prefix="/departments", tags=["departments"], dependencies=[Depends(require_admin)])


@router.post("", response_model=DepartmentResponse)
def create_department(department: DepartmentCreate, db: Session = Depends(get_db)):
    """Create a new department."""
    if DepartmentService.get_by_name(db, department.name):
        raise HTTPException(status_code=400, detail="Department with this name already exists")
    if department.parent_id and not DepartmentService.get_by_id(db, department.parent_id):
        raise HTTPException(status_code=404, detail="Parent department not found")
    return DepartmentService.create(db, department)


@router.get("/stats")
def get_department_stats(db: Session = Depends(get_db)):
    """Return department summary stats in one query."""
    from sqlalchemy import func
    total   = db.query(func.count(Department.id)).filter(Department.is_active == True).scalar() or 0
    root    = db.query(func.count(Department.id)).filter(Department.is_active == True, Department.parent_id.is_(None)).scalar() or 0
    w_pos   = db.query(func.count(Department.id.distinct())).join(Position, Position.department_id == Department.id).filter(Department.is_active == True, Position.is_active == True).scalar() or 0
    return {"total": total, "root": root, "with_positions": w_pos, "empty": total - w_pos}


@router.get("", response_model=List[DepartmentResponse])
def list_departments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List departments with optional search."""
    from sqlalchemy.orm import joinedload
    q = db.query(Department).filter(Department.is_active == True)
    if search:
        q = q.filter(Department.name.ilike(f"%{search}%"))
    return q.order_by(Department.name).offset(skip).limit(limit).all()


@router.get("/root/list", response_model=List[DepartmentResponse])
def get_root_departments(db: Session = Depends(get_db)):
    """Get all root departments."""
    return DepartmentService.get_root_departments(db)


@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(department_id: UUID, db: Session = Depends(get_db)):
    dept = DepartmentService.get_by_id(db, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept


@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(department_id: UUID, department: DepartmentUpdate, db: Session = Depends(get_db)):
    db_dept = DepartmentService.get_by_id(db, department_id)
    if not db_dept:
        raise HTTPException(status_code=404, detail="Department not found")
    if department.parent_id and department.parent_id != db_dept.parent_id:
        if not DepartmentService.get_by_id(db, department.parent_id):
            raise HTTPException(status_code=404, detail="Parent department not found")
    return DepartmentService.update(db, department_id, department)


@router.delete("/{department_id}")
def delete_department(department_id: UUID, db: Session = Depends(get_db)):
    if not DepartmentService.delete(db, department_id):
        raise HTTPException(status_code=404, detail="Department not found")
    return {"message": "Department deleted successfully"}


@router.get("/{department_id}/hierarchy")
def get_department_hierarchy(department_id: UUID, db: Session = Depends(get_db)):
    hierarchy = DepartmentService.get_hierarchy(db, department_id)
    if not hierarchy:
        raise HTTPException(status_code=404, detail="Department not found")
    return hierarchy

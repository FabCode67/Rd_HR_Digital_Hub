"""
Department API routes.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import Department
from app.schemas import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.services import DepartmentService

router = APIRouter(prefix="/departments", tags=["departments"])


@router.post("", response_model=DepartmentResponse)
def create_department(
    department: DepartmentCreate,
    db: Session = Depends(get_db)
):
    """Create a new department."""
    # Check if name already exists
    existing = DepartmentService.get_by_name(db, department.name)
    if existing:
        raise HTTPException(status_code=400, detail="Department with this name already exists")

    # Validate parent department exists if provided
    if department.parent_id:
        parent = DepartmentService.get_by_id(db, department.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent department not found")

    return DepartmentService.create(db, department)


@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(
    department_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a department by ID."""
    department = DepartmentService.get_by_id(db, department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department


@router.get("", response_model=List[DepartmentResponse])
def list_departments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List all departments."""
    return DepartmentService.get_all(db, skip=skip, limit=limit)


@router.get("/root/list", response_model=List[DepartmentResponse])
def get_root_departments(db: Session = Depends(get_db)):
    """Get all root departments (without parent)."""
    return DepartmentService.get_root_departments(db)


@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: UUID,
    department: DepartmentUpdate,
    db: Session = Depends(get_db)
):
    """Update a department."""
    db_dept = DepartmentService.get_by_id(db, department_id)
    if not db_dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Validate parent department if being changed
    if department.parent_id and department.parent_id != db_dept.parent_id:
        parent = DepartmentService.get_by_id(db, department.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent department not found")

    return DepartmentService.update(db, department_id, department)


@router.delete("/{department_id}")
def delete_department(
    department_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete (soft delete) a department."""
    if not DepartmentService.delete(db, department_id):
        raise HTTPException(status_code=404, detail="Department not found")
    return {"message": "Department deleted successfully"}


@router.get("/{department_id}/hierarchy")
def get_department_hierarchy(
    department_id: UUID,
    db: Session = Depends(get_db)
):
    """Get department hierarchy tree."""
    hierarchy = DepartmentService.get_hierarchy(db, department_id)
    if not hierarchy:
        raise HTTPException(status_code=404, detail="Department not found")
    return hierarchy

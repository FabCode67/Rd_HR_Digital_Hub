"""
Employee API routes.
"""
from typing import List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import Employee, EmployeeStatus
from app.schemas import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeePositionCreate,
    EmployeePositionResponse,
    EmployeePositionDetail,
)
from app.services import EmployeeService, PositionService

router = APIRouter(prefix="/employees", tags=["employees"])


@router.post("", response_model=EmployeeResponse)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db)
):
    """Create a new employee."""
    # Check if email already exists
    existing = EmployeeService.get_by_email(db, employee.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    return EmployeeService.create(db, employee)


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: UUID,
    db: Session = Depends(get_db)
):
    """Get an employee by ID."""
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.get("", response_model=List[EmployeeResponse])
def list_employees(
    status: EmployeeStatus = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List employees with optional status filter."""
    if status:
        return EmployeeService.get_by_status(db, status, skip=skip, limit=limit)
    return EmployeeService.get_all(db, skip=skip, limit=limit)


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: UUID,
    employee: EmployeeUpdate,
    db: Session = Depends(get_db)
):
    """Update an employee."""
    db_emp = EmployeeService.get_by_id(db, employee_id)
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Validate email is unique if being changed
    if employee.email and employee.email != db_emp.email:
        existing = EmployeeService.get_by_email(db, employee.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

    return EmployeeService.update(db, employee_id, employee)


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete an employee."""
    if not EmployeeService.delete(db, employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted successfully"}


@router.post("/{employee_id}/assign-position", response_model=EmployeePositionResponse)
def assign_to_position(
    employee_id: UUID,
    assignment: EmployeePositionCreate,
    db: Session = Depends(get_db)
):
    """Assign an employee to a position."""
    try:
        return EmployeeService.assign_to_position(
            db,
            employee_id,
            assignment.position_id,
            assignment.start_date
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{employee_id}/reassign-position", response_model=EmployeePositionResponse)
def reassign_to_position(
    employee_id: UUID,
    assignment: EmployeePositionCreate,
    db: Session = Depends(get_db)
):
    """Reassign an employee to a new position."""
    try:
        return EmployeeService.assign_to_position(
            db,
            employee_id,
            assignment.position_id,
            assignment.start_date
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{employee_position_id}/unassign")
def unassign_from_position(
    employee_position_id: UUID,
    end_date: datetime = Query(None),
    db: Session = Depends(get_db)
):
    """Unassign an employee from a position."""
    result = EmployeeService.unassign_from_position(db, employee_position_id, end_date)
    if not result:
        raise HTTPException(status_code=404, detail="Employee position record not found")
    return {"message": "Employee unassigned successfully"}


@router.get("/{employee_id}/current-position", response_model=EmployeePositionDetail)
def get_current_position(
    employee_id: UUID,
    db: Session = Depends(get_db)
):
    """Get current position of an employee."""
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    position_record = EmployeeService.get_current_position(db, employee_id)
    if not position_record:
        raise HTTPException(status_code=404, detail="Employee has no current position assigned")

    return position_record


@router.get("/{employee_id}/position-history", response_model=List[EmployeePositionDetail])
def get_position_history(
    employee_id: UUID,
    db: Session = Depends(get_db)
):
    """Get position history of an employee."""
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    return EmployeeService.get_position_history(db, employee_id)


@router.get("/department/{department_id}", response_model=List[EmployeeResponse])
def get_employees_by_department(
    department_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all employees in a department."""
    return EmployeeService.get_by_department(db, department_id, skip=skip, limit=limit)

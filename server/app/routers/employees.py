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
from app.services import EmployeeService, PositionService, auth_service
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/employees", tags=["employees"])


@router.post("", response_model=EmployeeResponse)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """Create a new employee."""
    # Check if email already exists
    existing = EmployeeService.get_by_email(db, employee.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Set default password for new employees
    emp_data = employee.dict()
    default_password = "NCBAStaff@123"
    emp_data["hashed_password"] = auth_service.get_password_hash(default_password)
    
    return EmployeeService.create(db, emp_data)


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get an employee by ID. Staff users may only access their own profile."""
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Allow access if requester is admin or requesting their own profile
    from app.models import UserRole
    if current_user.role != UserRole.ADMIN and current_user.id != employee.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    return employee


@router.get("", response_model=List[EmployeeResponse])
def list_employees(
    status: EmployeeStatus = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """List employees with optional status filter."""
    if status:
        return EmployeeService.get_by_status(db, status, skip=skip, limit=limit)
    return EmployeeService.get_all(db, skip=skip, limit=limit)


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: UUID,
    employee: EmployeeUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
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
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """Delete an employee."""
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
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
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
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """Unassign an employee from a position."""
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
    """Get current position of an employee."""
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Only admin or the employee themself may view current position
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
    """Get position history of an employee."""
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    from app.models import UserRole
    if current_user.role != UserRole.ADMIN and current_user.id != employee.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    return EmployeeService.get_position_history(db, employee_id)


@router.get("/department/{department_id}", response_model=List[EmployeeResponse])
def get_employees_by_department(
    department_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    """Get all employees in a department."""
    return EmployeeService.get_by_department(db, department_id, skip=skip, limit=limit)

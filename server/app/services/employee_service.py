"""
Employee service layer.
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Employee, EmployeePosition, Position
from app.schemas import EmployeeCreate, EmployeeUpdate
from app.services.position_service import PositionService


class EmployeeService:
    """Service for Employee operations."""

    @staticmethod
    def create(db: Session, obj_in: EmployeeCreate) -> Employee:
        """Create a new employee."""
        db_obj = Employee(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def get_by_id(db: Session, employee_id: UUID) -> Optional[Employee]:
        """Get employee by ID."""
        return db.query(Employee).filter(Employee.id == employee_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[Employee]:
        """Get employee by email."""
        return db.query(Employee).filter(Employee.email == email).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 50) -> List[Employee]:
        """Get all employees with pagination."""
        return db.query(Employee).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_status(db: Session, status: str, skip: int = 0, limit: int = 50) -> List[Employee]:
        """Get employees by status."""
        return db.query(Employee).filter(Employee.status == status).offset(skip).limit(limit).all()

    @staticmethod
    def update(db: Session, employee_id: UUID, obj_in: EmployeeUpdate) -> Optional[Employee]:
        """Update an employee."""
        db_obj = EmployeeService.get_by_id(db, employee_id)
        if db_obj:
            update_data = obj_in.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_obj, field, value)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

    @staticmethod
    def delete(db: Session, employee_id: UUID) -> bool:
        """Delete an employee."""
        db_obj = EmployeeService.get_by_id(db, employee_id)
        if db_obj:
            db.delete(db_obj)
            db.commit()
            return True
        return False

    @staticmethod
    def assign_to_position(
        db: Session,
        employee_id: UUID,
        position_id: UUID,
        start_date: datetime
    ) -> EmployeePosition:
        """Assign employee to a position."""
        # Validate employee and position exist
        employee = EmployeeService.get_by_id(db, employee_id)
        position = PositionService.get_by_id(db, position_id)

        if not employee:
            raise ValueError(f"Employee {employee_id} not found")
        if not position:
            raise ValueError(f"Position {position_id} not found")

        # End any current assignments to this position
        current_assignment = db.query(EmployeePosition).filter(
            EmployeePosition.position_id == position_id,
            EmployeePosition.is_current == True
        ).first()

        if current_assignment:
            current_assignment.is_current = False
            current_assignment.end_date = datetime.utcnow()
            db.add(current_assignment)

        # Create new assignment
        assignment = EmployeePosition(
            employee_id=employee_id,
            position_id=position_id,
            start_date=start_date,
            is_current=True
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)

        # Update position vacancy status
        PositionService.update_vacancy_status(db, position_id)

        return assignment

    @staticmethod
    def unassign_from_position(
        db: Session,
        employee_position_id: UUID,
        end_date: Optional[datetime] = None
    ) -> Optional[EmployeePosition]:
        """Unassign employee from position."""
        assignment = db.query(EmployeePosition).filter(
            EmployeePosition.id == employee_position_id
        ).first()

        if assignment:
            assignment.is_current = False
            assignment.end_date = end_date or datetime.utcnow()
            db.add(assignment)
            db.commit()

            # Update position vacancy status
            PositionService.update_vacancy_status(db, assignment.position_id)

            return assignment

        return None

    @staticmethod
    def get_current_position(db: Session, employee_id: UUID) -> Optional[EmployeePosition]:
        """Get current position of an employee."""
        return db.query(EmployeePosition).filter(
            EmployeePosition.employee_id == employee_id,
            EmployeePosition.is_current == True
        ).first()

    @staticmethod
    def get_position_history(db: Session, employee_id: UUID) -> List[EmployeePosition]:
        """Get all position history of an employee."""
        return db.query(EmployeePosition).filter(
            EmployeePosition.employee_id == employee_id
        ).order_by(EmployeePosition.start_date.desc()).all()

    @staticmethod
    def get_by_department(db: Session, department_id: UUID, skip: int = 0, limit: int = 50) -> List[Employee]:
        """Get all employees in a department."""
        return db.query(Employee).join(
            EmployeePosition
        ).join(
            Position
        ).filter(
            Position.department_id == department_id,
            EmployeePosition.is_current == True
        ).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_position(db: Session, position_id: UUID) -> Optional[Employee]:
        """Get employee currently assigned to a position."""
        assignment = db.query(EmployeePosition).filter(
            EmployeePosition.position_id == position_id,
            EmployeePosition.is_current == True
        ).first()
        return assignment.employee if assignment else None

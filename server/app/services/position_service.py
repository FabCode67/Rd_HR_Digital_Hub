"""
Position service layer.
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from datetime import datetime
from app.models import Position, EmployeePosition
from app.schemas import PositionCreate, PositionUpdate, PositionTreeNode, EmployeeSimple


class PositionService:
    """Service for Position operations."""

    @staticmethod
    def create(db: Session, obj_in: PositionCreate) -> Position:
        """Create a new position."""
        db_obj = Position(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def get_by_id(db: Session, position_id: UUID) -> Optional[Position]:
        """Get position by ID."""
        return db.query(Position).filter(Position.id == position_id).first()

    @staticmethod
    def get_all(db: Session, department_id: Optional[UUID] = None, skip: int = 0, limit: int = 50) -> List[Position]:
        """Get all positions with optional department filter."""
        query = db.query(Position).filter(Position.is_active == True)
        if department_id:
            query = query.filter(Position.department_id == department_id)
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def update(db: Session, position_id: UUID, obj_in: PositionUpdate) -> Optional[Position]:
        """Update a position."""
        db_obj = PositionService.get_by_id(db, position_id)
        if db_obj:
            update_data = obj_in.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_obj, field, value)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

    @staticmethod
    def delete(db: Session, position_id: UUID) -> bool:
        """Soft delete a position."""
        db_obj = PositionService.get_by_id(db, position_id)
        if db_obj:
            db_obj.is_active = False
            db.add(db_obj)
            db.commit()
            return True
        return False

    @staticmethod
    def is_vacant(db: Session, position_id: UUID) -> bool:
        """Check if a position is vacant (no current employee assigned)."""
        current_assignment = db.query(EmployeePosition).filter(
            EmployeePosition.position_id == position_id,
            EmployeePosition.is_current == True
        ).first()
        return current_assignment is None

    @staticmethod
    def update_vacancy_status(db: Session, position_id: UUID) -> None:
        """Update vacancy status based on current employee assignments."""
        position = PositionService.get_by_id(db, position_id)
        if position:
            position.is_vacant = PositionService.is_vacant(db, position_id)
            db.add(position)
            db.commit()

    @staticmethod
    def get_current_employee(db: Session, position_id: UUID) -> Optional[object]:
        """Get the currently assigned employee for a position."""
        assignment = db.query(EmployeePosition).filter(
            EmployeePosition.position_id == position_id,
            EmployeePosition.is_current == True
        ).first()
        return assignment.employee if assignment else None

    @staticmethod
    def get_organization_tree(db: Session, department_id: Optional[UUID] = None) -> List[PositionTreeNode]:
        """Get organization hierarchy tree of positions."""
        # Get root positions (no parent)
        query = db.query(Position).filter(
            Position.is_active == True,
            Position.parent_position_id.is_(None)
        )
        if department_id:
            query = query.filter(Position.department_id == department_id)
        
        root_positions = query.all()

        def build_tree(position: Position) -> PositionTreeNode:
            employee = PositionService.get_current_employee(db, position.id)
            employee_schema = EmployeeSimple.from_orm(employee) if employee else None

            return PositionTreeNode(
                id=position.id,
                title=position.title,
                description=position.description,
                department_id=position.department_id,
                parent_position_id=position.parent_position_id,
                level=position.level,
                band=position.band,
                is_active=position.is_active,
                is_vacant=PositionService.is_vacant(db, position.id),
                created_at=position.created_at,
                updated_at=position.updated_at,
                employee=employee_schema,
                children=[build_tree(child) for child in (position.child_positions or [])]
            )

        return [build_tree(position) for position in root_positions]

    @staticmethod
    def get_position_by_title(db: Session, title: str, department_id: UUID) -> Optional[Position]:
        """Get position by title and department."""
        return db.query(Position).filter(
            Position.title == title,
            Position.department_id == department_id
        ).first()

    @staticmethod
    def get_subordinates(db: Session, position_id: UUID) -> List[Position]:
        """Get all direct subordinates of a position."""
        return db.query(Position).filter(Position.parent_position_id == position_id).all()

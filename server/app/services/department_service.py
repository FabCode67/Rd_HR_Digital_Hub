"""
Department service layer.
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Department
from app.schemas import DepartmentCreate, DepartmentUpdate


class DepartmentService:
    """Service for Department operations."""

    @staticmethod
    def create(db: Session, obj_in: DepartmentCreate) -> Department:
        """Create a new department."""
        db_obj = Department(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def get_by_id(db: Session, department_id: UUID) -> Optional[Department]:
        """Get department by ID."""
        return db.query(Department).filter(Department.id == department_id).first()

    @staticmethod
    def get_by_name(db: Session, name: str) -> Optional[Department]:
        """Get department by name."""
        return db.query(Department).filter(Department.name == name).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 50) -> List[Department]:
        """Get all active departments with pagination."""
        return db.query(Department).filter(Department.is_active == True).offset(skip).limit(limit).all()

    @staticmethod
    def get_root_departments(db: Session) -> List[Department]:
        """Get all root departments (without parent)."""
        return db.query(Department).filter(
            Department.parent_id.is_(None),
            Department.is_active == True
        ).all()

    @staticmethod
    def update(db: Session, department_id: UUID, obj_in: DepartmentUpdate) -> Optional[Department]:
        """Update a department."""
        db_obj = DepartmentService.get_by_id(db, department_id)
        if db_obj:
            update_data = obj_in.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_obj, field, value)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

    @staticmethod
    def delete(db: Session, department_id: UUID) -> bool:
        """Soft delete a department."""
        db_obj = DepartmentService.get_by_id(db, department_id)
        if db_obj:
            db_obj.is_active = False
            db.add(db_obj)
            db.commit()
            return True
        return False

    @staticmethod
    def get_hierarchy(db: Session, department_id: UUID) -> Optional[dict]:
        """Get department hierarchy tree."""
        dept = DepartmentService.get_by_id(db, department_id)
        if not dept:
            return None

        def build_tree(dept: Department) -> dict:
            return {
                "id": str(dept.id),
                "name": dept.name,
                "description": dept.description,
                "children": [build_tree(child) for child in (dept.children or [])]
            }

        return build_tree(dept)

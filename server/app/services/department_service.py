"""
Department service layer.
"""
from typing import List, Optional, Dict, Set
from uuid import UUID
from sqlalchemy.orm import Session
from app.models import Department, Position, EmployeePosition, Employee
from app.schemas import DepartmentCreate, DepartmentUpdate, EmployeeSimple


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

        all_departments = db.query(Department).filter(Department.is_active == True).all()
        children_by_parent: Dict[Optional[UUID], List[Department]] = {}
        for department in all_departments:
            children_by_parent.setdefault(department.parent_id, []).append(department)

        def collect_subtree_ids(root_id: UUID) -> Set[UUID]:
            subtree_ids: Set[UUID] = set()
            stack = [root_id]
            while stack:
                current_id = stack.pop()
                if current_id in subtree_ids:
                    continue
                subtree_ids.add(current_id)
                for child in children_by_parent.get(current_id, []):
                    stack.append(child.id)
            return subtree_ids

        subtree_department_ids = collect_subtree_ids(department_id)
        subtree_departments = [
            department for department in all_departments if department.id in subtree_department_ids
        ]

        positions = db.query(Position).filter(
            Position.is_active == True,
            Position.department_id.in_(subtree_department_ids)
        ).all()
        position_ids = [position.id for position in positions]

        current_employee_by_position: Dict[UUID, EmployeeSimple] = {}
        if position_ids:
            assignments = (
                db.query(EmployeePosition, Employee)
                .join(Employee, Employee.id == EmployeePosition.employee_id)
                .filter(
                    EmployeePosition.position_id.in_(position_ids),
                    EmployeePosition.is_current == True,
                )
                .all()
            )
            for assignment, employee in assignments:
                current_employee_by_position[assignment.position_id] = EmployeeSimple.from_orm(employee)

        positions_by_department: Dict[UUID, List[Position]] = {}
        positions_by_parent: Dict[Optional[UUID], List[Position]] = {}
        for position in positions:
            positions_by_department.setdefault(position.department_id, []).append(position)
            positions_by_parent.setdefault(position.parent_position_id, []).append(position)

        def build_position_tree(position: Position) -> dict:
            return {
                "id": str(position.id),
                "title": position.title,
                "description": position.description,
                "department_id": str(position.department_id),
                "parent_position_id": str(position.parent_position_id) if position.parent_position_id else None,
                "level": position.level,
                "band": position.band,
                "is_active": position.is_active,
                "is_vacant": position.is_vacant,
                "created_at": position.created_at,
                "updated_at": position.updated_at,
                "employee": current_employee_by_position.get(position.id),
                "children": [build_position_tree(child) for child in positions_by_parent.get(position.id, [])],
            }

        def build_tree(current_dept: Department) -> dict:
            return {
                "id": str(current_dept.id),
                "name": current_dept.name,
                "description": current_dept.description,
                "parent_id": str(current_dept.parent_id) if current_dept.parent_id else None,
                "is_active": current_dept.is_active,
                "created_at": current_dept.created_at,
                "updated_at": current_dept.updated_at,
                "children": [
                    build_tree(child)
                    for child in children_by_parent.get(current_dept.id, [])
                    if child.id in subtree_department_ids
                ],
                "positions": [
                    build_position_tree(position)
                    for position in positions_by_department.get(current_dept.id, [])
                    if position.parent_position_id is None
                ],
            }

        return build_tree(dept)

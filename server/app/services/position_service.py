"""
Position service layer.
"""
from typing import List, Optional, Dict, Set
from uuid import UUID
from sqlalchemy.orm import Session
from datetime import datetime
from app.models import Position, EmployeePosition, Department, Employee
from app.schemas import PositionCreate, PositionUpdate, PositionTreeNode, EmployeeSimple, DepartmentHierarchyNode


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
    def get_department_hierarchy_tree(
        db: Session, department_id: Optional[UUID] = None
    ) -> List[DepartmentHierarchyNode]:
        """
        Get optimized department hierarchy tree with nested positions.
        
        This method is highly optimized to avoid N+1 queries by:
        1. Fetching all departments in one query (or subtree if department_id provided)
        2. Fetching all positions with their current employee assignments in one query
        3. Building the tree structure in Python memory
        
        Args:
            db: Database session
            department_id: Optional parent department ID to filter results
            
        Returns:
            List of DepartmentHierarchyNode with full tree structure
        """
        # Fetch departments based on filter
        if department_id:
            # Get the specific department and verify it exists
            parent_dept = db.query(Department).filter(Department.id == department_id).first()
            if not parent_dept:
                return []
            # Get only the specified department as root
            departments = [parent_dept]
            # Helper to recursively get all child departments for position fetching
            def get_all_child_dept_ids(dept_id: UUID) -> set:
                result = {dept_id}
                children = db.query(Department).filter(
                    Department.parent_id == dept_id,
                    Department.is_active == True
                ).all()
                for child in children:
                    result.update(get_all_child_dept_ids(child.id))
                return result
            
            all_dept_ids = get_all_child_dept_ids(department_id)
        else:
            # Get all root departments
            departments = db.query(Department).filter(
                Department.is_active == True,
                Department.parent_id.is_(None)
            ).all()
            all_dept_ids = None  # Will fetch all positions
        
        # Fetch all active positions with their employee assignments
        positions_query = (
            db.query(Position)
            .filter(Position.is_active == True)
            .outerjoin(EmployeePosition, 
                      (Position.id == EmployeePosition.position_id) & 
                      (EmployeePosition.is_current == True))
            .outerjoin(Employee)
        )
        
        if all_dept_ids:
            # Only fetch positions from departments in the subtree
            positions_query = positions_query.filter(Position.department_id.in_(all_dept_ids))
        
        # Execute query and organize positions by department_id
        positions = positions_query.all()
        
        # Build index of positions by department_id
        positions_by_dept: Dict[UUID, List[Position]] = {}
        for position in positions:
            if position.department_id not in positions_by_dept:
                positions_by_dept[position.department_id] = []
            positions_by_dept[position.department_id].append(position)
        
        # Fetch all employee assignments to build a lookup
        current_assignments = {}
        if positions:
            position_ids = [p.id for p in positions]
            assignments = (
                db.query(EmployeePosition, Employee)
                .join(Employee)
                .filter(
                    EmployeePosition.position_id.in_(position_ids),
                    EmployeePosition.is_current == True
                )
                .all()
            )
            for assignment, employee in assignments:
                current_assignments[assignment.position_id] = employee
        
        def build_position_tree(position: Position) -> PositionTreeNode:
            """Build a position tree node with its children."""
            employee = current_assignments.get(position.id)
            employee_schema = EmployeeSimple.from_orm(employee) if employee else None
            
            # Get children from the already-loaded relationships
            children = [
                build_position_tree(child) 
                for child in (position.child_positions or [])
            ]
            
            return PositionTreeNode(
                id=position.id,
                title=position.title,
                description=position.description,
                department_id=position.department_id,
                parent_position_id=position.parent_position_id,
                level=position.level,
                band=position.band,
                is_active=position.is_active,
                is_vacant=position.is_vacant,  # Use the model's is_vacant field
                created_at=position.created_at,
                updated_at=position.updated_at,
                employee=employee_schema,
                children=children
            )
        
        def build_department_tree(dept: Department) -> DepartmentHierarchyNode:
            """Build a department tree node with its children and positions."""
            # Get child departments
            children = [build_department_tree(child) for child in (dept.children or [])]
            
            # Get positions for this department (only root positions)
            dept_positions = positions_by_dept.get(dept.id, [])
            root_positions = [p for p in dept_positions if p.parent_position_id is None]
            position_trees = [build_position_tree(p) for p in root_positions]
            
            return DepartmentHierarchyNode(
                id=dept.id,
                name=dept.name,
                description=dept.description,
                parent_id=dept.parent_id,
                is_active=dept.is_active,
                created_at=dept.created_at,
                updated_at=dept.updated_at,
                children=children,
                positions=position_trees
            )
        
        return [build_department_tree(dept) for dept in departments]

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

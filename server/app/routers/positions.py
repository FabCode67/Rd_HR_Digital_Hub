"""
Position API routes.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import Position
from app.schemas import PositionCreate, PositionUpdate, PositionResponse, PositionTreeNode
from app.services import PositionService, DepartmentService

router = APIRouter(prefix="/positions", tags=["positions"])


@router.post("", response_model=PositionResponse)
def create_position(
    position: PositionCreate,
    db: Session = Depends(get_db)
):
    """Create a new position."""
    # Validate department exists
    dept = DepartmentService.get_by_id(db, position.department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Validate parent position exists if provided
    if position.parent_position_id:
        parent = PositionService.get_by_id(db, position.parent_position_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent position not found")

    return PositionService.create(db, position)


@router.get("/{position_id}", response_model=PositionResponse)
def get_position(
    position_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a position by ID."""
    position = PositionService.get_by_id(db, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    return position


@router.get("", response_model=List[PositionResponse])
def list_positions(
    department_id: UUID = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List positions with optional department filter."""
    return PositionService.get_all(db, department_id=department_id, skip=skip, limit=limit)


@router.get("/tree/hierarchy", response_model=List[PositionTreeNode])
def get_organization_tree(
    department_id: UUID = Query(None),
    db: Session = Depends(get_db)
):
    """Get organization hierarchy tree of positions."""
    if department_id:
        dept = DepartmentService.get_by_id(db, department_id)
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
    
    return PositionService.get_organization_tree(db, department_id=department_id)


@router.put("/{position_id}", response_model=PositionResponse)
def update_position(
    position_id: UUID,
    position: PositionUpdate,
    db: Session = Depends(get_db)
):
    """Update a position."""
    db_pos = PositionService.get_by_id(db, position_id)
    if not db_pos:
        raise HTTPException(status_code=404, detail="Position not found")

    # Validate department if being changed
    if position.department_id and position.department_id != db_pos.department_id:
        dept = DepartmentService.get_by_id(db, position.department_id)
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")

    # Validate parent position if being changed
    if position.parent_position_id and position.parent_position_id != db_pos.parent_position_id:
        parent = PositionService.get_by_id(db, position.parent_position_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent position not found")

    return PositionService.update(db, position_id, position)


@router.delete("/{position_id}")
def delete_position(
    position_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete (soft delete) a position."""
    if not PositionService.delete(db, position_id):
        raise HTTPException(status_code=404, detail="Position not found")
    return {"message": "Position deleted successfully"}


@router.get("/{position_id}/is-vacant")
def check_vacancy(
    position_id: UUID,
    db: Session = Depends(get_db)
):
    """Check if a position is vacant."""
    position = PositionService.get_by_id(db, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    
    is_vacant = PositionService.is_vacant(db, position_id)
    return {"position_id": position_id, "is_vacant": is_vacant}


@router.get("/{position_id}/subordinates", response_model=List[PositionResponse])
def get_subordinates(
    position_id: UUID,
    db: Session = Depends(get_db)
):
    """Get all direct subordinates of a position."""
    position = PositionService.get_by_id(db, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    
    return PositionService.get_subordinates(db, position_id)

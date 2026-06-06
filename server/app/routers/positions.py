"""
Position API routes.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import Position, EmployeePosition
from app.schemas import PositionCreate, PositionUpdate, PositionResponse, PositionTreeNode, DepartmentHierarchyNode
from app.services import PositionService, DepartmentService
from app.routers.auth import require_admin

router = APIRouter(prefix="/positions", tags=["positions"], dependencies=[Depends(require_admin)])


@router.post("", response_model=PositionResponse)
def create_position(position: PositionCreate, db: Session = Depends(get_db)):
    if not DepartmentService.get_by_id(db, position.department_id):
        raise HTTPException(status_code=404, detail="Department not found")
    if position.parent_position_id and not PositionService.get_by_id(db, position.parent_position_id):
        raise HTTPException(status_code=404, detail="Parent position not found")
    return PositionService.create(db, position)


@router.get("/stats")
def get_position_stats(db: Session = Depends(get_db)):
    """Return position stats in one round-trip."""
    from sqlalchemy import func
    total  = db.query(func.count(Position.id)).filter(Position.is_active == True).scalar() or 0
    vacant = db.query(func.count(Position.id)).filter(Position.is_active == True, Position.is_vacant == True).scalar() or 0
    filled = total - vacant
    fill_rate = round((filled / total * 100), 1) if total > 0 else 0
    return {"total": total, "filled": filled, "vacant": vacant, "fill_rate": fill_rate}


@router.get("", response_model=List[PositionResponse])
def list_positions(
    department_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    vacant_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List positions with optional filters."""
    q = db.query(Position).filter(Position.is_active == True)
    if department_id:
        q = q.filter(Position.department_id == department_id)
    if search:
        q = q.filter(Position.title.ilike(f"%{search}%"))
    if vacant_only:
        q = q.filter(Position.is_vacant == True)
    return q.order_by(Position.title).offset(skip).limit(limit).all()


@router.get("/tree/hierarchy", response_model=List[DepartmentHierarchyNode])
def get_organization_tree(
    department_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db)
):
    if department_id and not DepartmentService.get_by_id(db, department_id):
        raise HTTPException(status_code=404, detail="Department not found")
    return PositionService.get_department_hierarchy_tree(db, department_id=department_id)


@router.get("/{position_id}", response_model=PositionResponse)
def get_position(position_id: UUID, db: Session = Depends(get_db)):
    pos = PositionService.get_by_id(db, position_id)
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    return pos


@router.put("/{position_id}", response_model=PositionResponse)
def update_position(position_id: UUID, position: PositionUpdate, db: Session = Depends(get_db)):
    db_pos = PositionService.get_by_id(db, position_id)
    if not db_pos:
        raise HTTPException(status_code=404, detail="Position not found")
    if position.department_id and position.department_id != db_pos.department_id:
        if not DepartmentService.get_by_id(db, position.department_id):
            raise HTTPException(status_code=404, detail="Department not found")
    if position.parent_position_id and position.parent_position_id != db_pos.parent_position_id:
        if not PositionService.get_by_id(db, position.parent_position_id):
            raise HTTPException(status_code=404, detail="Parent position not found")
    return PositionService.update(db, position_id, position)


@router.delete("/{position_id}")
def delete_position(position_id: UUID, db: Session = Depends(get_db)):
    if not PositionService.delete(db, position_id):
        raise HTTPException(status_code=404, detail="Position not found")
    return {"message": "Position deleted successfully"}


@router.get("/{position_id}/is-vacant")
def check_vacancy(position_id: UUID, db: Session = Depends(get_db)):
    pos = PositionService.get_by_id(db, position_id)
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    return {"position_id": position_id, "is_vacant": PositionService.is_vacant(db, position_id)}


@router.get("/{position_id}/subordinates", response_model=List[PositionResponse])
def get_subordinates(position_id: UUID, db: Session = Depends(get_db)):
    if not PositionService.get_by_id(db, position_id):
        raise HTTPException(status_code=404, detail="Position not found")
    return PositionService.get_subordinates(db, position_id)

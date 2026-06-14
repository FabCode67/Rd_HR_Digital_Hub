"""
Org Function API routes — top-level business functions (Business, Support, Security…).
"""
import uuid
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import OrgFunction, Department
from app.schemas.schemas import OrgFunctionCreate, OrgFunctionUpdate, OrgFunctionResponse
from app.routers.auth import require_admin

router = APIRouter(
    prefix="/functions",
    tags=["functions"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=List[OrgFunctionResponse])
def list_functions(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(OrgFunction)
    if search:
        q = q.filter(OrgFunction.name.ilike(f"%{search}%"))
    return q.order_by(OrgFunction.name).all()


@router.get("/with-departments")
def list_functions_with_departments(db: Session = Depends(get_db)):
    """Return every function with its departments nested inside."""
    functions = db.query(OrgFunction).filter(OrgFunction.is_active == True).order_by(OrgFunction.name).all()
    result = []
    for fn in functions:
        depts = db.query(Department).filter(
            Department.function_id == fn.id,
            Department.is_active == True,
        ).order_by(Department.name).all()
        result.append({
            "id":          str(fn.id),
            "name":        fn.name,
            "description": fn.description,
            "color":       fn.color,
            "is_active":   fn.is_active,
            "departments": [
                {
                    "id":          str(d.id),
                    "name":        d.name,
                    "description": d.description,
                    "parent_id":   str(d.parent_id) if d.parent_id else None,
                    "function_id": str(d.function_id) if d.function_id else None,
                    "is_active":   d.is_active,
                }
                for d in depts
            ],
        })
    return result


@router.post("", response_model=OrgFunctionResponse)
def create_function(payload: OrgFunctionCreate, db: Session = Depends(get_db)):
    existing = db.query(OrgFunction).filter(OrgFunction.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="A function with this name already exists")
    fn = OrgFunction(id=uuid.uuid4(), **payload.dict())
    db.add(fn)
    db.commit()
    db.refresh(fn)
    return fn


@router.get("/{function_id}", response_model=OrgFunctionResponse)
def get_function(function_id: UUID, db: Session = Depends(get_db)):
    fn = db.query(OrgFunction).filter(OrgFunction.id == function_id).first()
    if not fn:
        raise HTTPException(status_code=404, detail="Function not found")
    return fn


@router.put("/{function_id}", response_model=OrgFunctionResponse)
def update_function(function_id: UUID, payload: OrgFunctionUpdate, db: Session = Depends(get_db)):
    fn = db.query(OrgFunction).filter(OrgFunction.id == function_id).first()
    if not fn:
        raise HTTPException(status_code=404, detail="Function not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(fn, k, v)
    from datetime import datetime
    fn.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(fn)
    return fn


@router.delete("/{function_id}")
def delete_function(function_id: UUID, db: Session = Depends(get_db)):
    fn = db.query(OrgFunction).filter(OrgFunction.id == function_id).first()
    if not fn:
        raise HTTPException(status_code=404, detail="Function not found")
    # Unlink departments before deleting
    db.query(Department).filter(Department.function_id == function_id).update({"function_id": None})
    db.delete(fn)
    db.commit()
    return {"message": "Function deleted"}

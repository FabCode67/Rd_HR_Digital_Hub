"""
Employee Exit API routes.
Processes an employee's departure: vacates position, sets status INACTIVE,
records reason/type/next-move.
"""
import uuid
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator

from app.core.database import get_db
from app.models.models import (
    EmployeeExit, Employee, EmployeePosition,
    Position, EmployeeStatus, UserRole,
)
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/exits", tags=["exits"])

VALID_REASONS = {"resignation", "termination", "end_of_contract"}
VALID_TYPES   = {"regrettable", "non_regrettable"}

REASON_LABELS = {
    "resignation":      "Resignation",
    "termination":      "Termination",
    "end_of_contract":  "End of Contract",
}
TYPE_LABELS = {
    "regrettable":     "Regrettable",
    "non_regrettable": "Non-Regrettable",
}


# ── Schemas ────────────────────────────────────────────────────────────────────

class ExitCreate(BaseModel):
    exit_date:   datetime
    exit_reason: str   # resignation | termination | end_of_contract
    exit_type:   str   # regrettable | non_regrettable
    next_move:   Optional[str] = None
    comments:    Optional[str] = None

    @validator("exit_reason")
    def reason_valid(cls, v):
        if v not in VALID_REASONS:
            raise ValueError(f"exit_reason must be one of: {', '.join(VALID_REASONS)}")
        return v

    @validator("exit_type")
    def type_valid(cls, v):
        if v not in VALID_TYPES:
            raise ValueError(f"exit_type must be one of: {', '.join(VALID_TYPES)}")
        return v


class ExitUpdate(BaseModel):
    exit_date:   Optional[datetime] = None
    exit_reason: Optional[str] = None
    exit_type:   Optional[str] = None
    next_move:   Optional[str] = None
    comments:    Optional[str] = None


# ── Formatter ──────────────────────────────────────────────────────────────────

def _fmt(e: EmployeeExit) -> dict:
    return {
        "id":             str(e.id),
        "employee_id":    str(e.employee_id),
        "exit_date":      e.exit_date.isoformat() if e.exit_date else None,
        "exit_reason":    e.exit_reason,
        "exit_reason_label": REASON_LABELS.get(e.exit_reason, e.exit_reason),
        "exit_type":      e.exit_type,
        "exit_type_label":   TYPE_LABELS.get(e.exit_type, e.exit_type),
        "position_id":    str(e.position_id) if e.position_id else None,
        "position_title": e.position_title,
        "next_move":      e.next_move,
        "comments":       e.comments,
        "processed_by":   e.processed_by,
        "created_at":     e.created_at.isoformat() if e.created_at else None,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
def list_exits(
    year: Optional[int] = Query(default=None),
    exit_reason: Optional[str] = Query(default=None),
    exit_type:   Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """List all exit records with optional filters."""
    q = db.query(EmployeeExit)
    if year:
        q = q.filter(
            EmployeeExit.exit_date >= datetime(year, 1, 1),
            EmployeeExit.exit_date <  datetime(year + 1, 1, 1),
        )
    if exit_reason:
        q = q.filter(EmployeeExit.exit_reason == exit_reason)
    if exit_type:
        q = q.filter(EmployeeExit.exit_type == exit_type)

    exits = q.order_by(EmployeeExit.exit_date.desc()).all()

    # Enrich with employee name
    result = []
    for ex in exits:
        emp = db.query(Employee).filter(Employee.id == ex.employee_id).first()
        row = _fmt(ex)
        row["employee_name"]  = emp.full_name if emp else "Unknown"
        row["employee_email"] = emp.email     if emp else None
        row["employee_status"]= emp.status    if emp else None
        result.append(row)

    return {
        "total":       len(result),
        "exits":       result,
        "by_reason":   {r: sum(1 for e in result if e["exit_reason"] == r) for r in VALID_REASONS},
        "by_type":     {t: sum(1 for e in result if e["exit_type"]   == t) for t in VALID_TYPES},
    }


@router.get("/employee/{employee_id}")
def get_employee_exit(
    employee_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get exit record for a specific employee."""
    if current_user.role != UserRole.ADMIN and str(current_user.id) != str(employee_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    ex = db.query(EmployeeExit).filter(EmployeeExit.employee_id == employee_id).first()
    if not ex:
        return None   # 200 with null — no exit recorded yet
    return _fmt(ex)


@router.post("/employee/{employee_id}")
def process_exit(
    employee_id: UUID,
    payload: ExitCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """
    Process an employee's exit:
    1. End their current position assignment (mark as not current, vacate position)
    2. Set employee status to INACTIVE
    3. Create exit record
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check not already exited
    existing = db.query(EmployeeExit).filter(EmployeeExit.employee_id == employee_id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Exit already recorded for this employee. Use PUT to update."
        )

    now = datetime.utcnow()
    exit_dt = payload.exit_date.replace(tzinfo=None)

    # ── Find and vacate current position ──────────────────────────────────────
    current_ep = db.query(EmployeePosition).filter(
        EmployeePosition.employee_id == employee_id,
        EmployeePosition.is_current == True,
    ).first()

    position_id    = None
    position_title = None

    if current_ep:
        pos = db.query(Position).filter(Position.id == current_ep.position_id).first()
        position_id    = current_ep.position_id
        position_title = pos.title if pos else None

        # End this assignment
        current_ep.is_current = False
        current_ep.end_date   = exit_dt
        current_ep.updated_at = now

        # Mark position as vacant
        if pos:
            pos.is_vacant  = True
            pos.updated_at = now

    # ── Set employee INACTIVE ─────────────────────────────────────────────────
    emp.status     = EmployeeStatus.INACTIVE
    emp.updated_at = now

    # ── Create exit record ────────────────────────────────────────────────────
    exit_record = EmployeeExit(
        id=uuid.uuid4(),
        employee_id=employee_id,
        exit_date=exit_dt,
        exit_reason=payload.exit_reason,
        exit_type=payload.exit_type,
        position_id=position_id,
        position_title=position_title,
        next_move=payload.next_move,
        comments=payload.comments,
        processed_by=getattr(admin, "full_name", "Admin"),
        created_at=now,
        updated_at=now,
    )
    db.add(exit_record)
    db.commit()
    db.refresh(exit_record)

    return {
        "message":         "Employee exit processed",
        "exit":            _fmt(exit_record),
        "position_vacated": position_title,
        "employee_status":  emp.status,
    }


@router.put("/employee/{employee_id}")
def update_exit(
    employee_id: UUID,
    payload: ExitUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Update an existing exit record (e.g. correct a date or add next_move later)."""
    ex = db.query(EmployeeExit).filter(EmployeeExit.employee_id == employee_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="No exit record found for this employee")

    if payload.exit_date is not None:
        ex.exit_date = payload.exit_date.replace(tzinfo=None)
    if payload.exit_reason is not None:
        if payload.exit_reason not in VALID_REASONS:
            raise HTTPException(status_code=400, detail="Invalid exit_reason")
        ex.exit_reason = payload.exit_reason
    if payload.exit_type is not None:
        if payload.exit_type not in VALID_TYPES:
            raise HTTPException(status_code=400, detail="Invalid exit_type")
        ex.exit_type = payload.exit_type
    if payload.next_move is not None:
        ex.next_move = payload.next_move
    if payload.comments is not None:
        ex.comments = payload.comments

    ex.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ex)
    return _fmt(ex)


@router.delete("/employee/{employee_id}")
def undo_exit(
    employee_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """
    Undo an exit (e.g. data error).
    Restores employee status to ACTIVE.
    Does NOT re-assign the position (admin must do that manually).
    """
    ex = db.query(EmployeeExit).filter(EmployeeExit.employee_id == employee_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="No exit record found")

    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if emp:
        emp.status     = EmployeeStatus.ACTIVE
        emp.updated_at = datetime.utcnow()

    db.delete(ex)
    db.commit()
    return {"message": "Exit undone. Employee status restored to ACTIVE. Please re-assign a position manually."}

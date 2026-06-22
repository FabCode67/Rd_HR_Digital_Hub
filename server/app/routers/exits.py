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
    Position, Department, EmployeeStatus, UserRole,
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

def _fmt(e: EmployeeExit, department_name: str = None) -> dict:
    return {
        "id":               str(e.id),
        "employee_id":      str(e.employee_id),
        "exit_date":        e.exit_date.isoformat() if e.exit_date else None,
        "exit_reason":      e.exit_reason,
        "exit_reason_label": REASON_LABELS.get(e.exit_reason, e.exit_reason),
        "exit_type":        e.exit_type,
        "exit_type_label":  TYPE_LABELS.get(e.exit_type, e.exit_type),
        "position_id":      str(e.position_id) if e.position_id else None,
        "position_title":   e.position_title,
        "department_name":  department_name,
        "next_move":        e.next_move,
        "comments":         e.comments,
        "processed_by":     e.processed_by,
        "created_at":       e.created_at.isoformat() if e.created_at else None,
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

    # Enrich with employee name + department
    result = []
    for ex in exits:
        emp = db.query(Employee).filter(Employee.id == ex.employee_id).first()
        # Resolve department from position snapshot
        dept_name = None
        if ex.position_id:
            pos = db.query(Position).filter(Position.id == ex.position_id).first()
            if pos and pos.department_id:
                dept = db.query(Department).filter(Department.id == pos.department_id).first()
                dept_name = dept.name if dept else None
        row = _fmt(ex, department_name=dept_name)
        row["employee_name"]  = emp.full_name if emp else "Unknown"
        row["employee_email"] = emp.email     if emp else None
        row["employee_status"]= emp.status    if emp else None
        result.append(row)

    # Aggregate by department
    dept_counts: dict = {}
    for e in result:
        d = e.get("department_name") or "Unknown"
        dept_counts[d] = dept_counts.get(d, 0) + 1

    return {
        "total":          len(result),
        "exits":          result,
        "by_reason":      {r: sum(1 for e in result if e["exit_reason"] == r) for r in VALID_REASONS},
        "by_type":        {t: sum(1 for e in result if e["exit_type"]   == t) for t in VALID_TYPES},
        "by_department":  dict(sorted(dept_counts.items(), key=lambda x: x[1], reverse=True)),
    }


@router.get("/turnover")
def get_turnover(
    year: int = Query(default=None),
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """
    Turnover rate analysis:
    - Overall turnover rate = exits / avg headcount * 100
    - Monthly breakdown
    - By department
    - By reason
    - Retention rate = 100 - turnover rate
    """
    y = year or datetime.utcnow().year
    from sqlalchemy import extract

    # All exits in this year
    year_exits = db.query(EmployeeExit).filter(
        EmployeeExit.exit_date >= datetime(y, 1, 1),
        EmployeeExit.exit_date <  datetime(y + 1, 1, 1),
    ).all()

    # Headcount: total employees (active + inactive, ever employed)
    total_employees = db.query(Employee).count()
    active_now      = db.query(Employee).filter(Employee.status == "ACTIVE").count()
    inactive_now    = db.query(Employee).filter(Employee.status == "INACTIVE").count()

    # Average headcount = (start of year + end of year) / 2
    # Approximate: active_now is current; exits this year were subtracted from workforce
    exits_this_year  = len(year_exits)
    start_headcount  = active_now + exits_this_year   # before exits happened
    avg_headcount    = (start_headcount + active_now) / 2 if start_headcount > 0 else 1

    turnover_rate  = round((exits_this_year / avg_headcount) * 100, 1) if avg_headcount > 0 else 0
    retention_rate = round(100 - turnover_rate, 1)
    voluntary_exits = sum(1 for e in year_exits if e.exit_reason == "resignation")
    involuntary_exits = exits_this_year - voluntary_exits
    voluntary_rate = round((voluntary_exits / avg_headcount) * 100, 1) if avg_headcount > 0 else 0

    # Monthly breakdown
    monthly = []
    for m in range(1, 13):
        month_exits = [
            e for e in year_exits
            if e.exit_date.month == m
        ]
        monthly.append({
            "month":       m,
            "month_label": datetime(y, m, 1).strftime("%b"),
            "exits":       len(month_exits),
            "resignations":    sum(1 for e in month_exits if e.exit_reason == "resignation"),
            "terminations":    sum(1 for e in month_exits if e.exit_reason == "termination"),
            "end_of_contract": sum(1 for e in month_exits if e.exit_reason == "end_of_contract"),
            "regrettable":     sum(1 for e in month_exits if e.exit_type == "regrettable"),
        })

    # By department
    dept_exits: dict = {}
    for ex in year_exits:
        dept_name = "Unknown"
        if ex.position_id:
            pos = db.query(Position).filter(Position.id == ex.position_id).first()
            if pos and pos.department_id:
                dept = db.query(Department).filter(Department.id == pos.department_id).first()
                dept_name = dept.name if dept else "Unknown"
        dept_exits[dept_name] = dept_exits.get(dept_name, 0) + 1

    # Dept-level turnover rate (approx: exits / filled positions in dept)
    dept_turnover = []
    for dept_name, n_exits in sorted(dept_exits.items(), key=lambda x: x[1], reverse=True):
        dept_obj = db.query(Department).filter(Department.name == dept_name).first()
        if dept_obj:
            dept_positions = db.query(Position).filter(
                Position.department_id == dept_obj.id
            ).count()
        else:
            dept_positions = 1
        rate = round((n_exits / max(dept_positions, 1)) * 100, 1)
        dept_turnover.append({
            "department": dept_name,
            "exits":      n_exits,
            "positions":  dept_positions,
            "rate":       rate,
        })

    # Year-over-year comparison (prev year)
    prev_exits = db.query(EmployeeExit).filter(
        EmployeeExit.exit_date >= datetime(y - 1, 1, 1),
        EmployeeExit.exit_date <  datetime(y, 1, 1),
    ).count()
    yoy_change = round(((exits_this_year - prev_exits) / max(prev_exits, 1)) * 100, 1)

    return {
        "year":              y,
        "total_employees":   total_employees,
        "active_now":        active_now,
        "inactive_now":      inactive_now,
        "avg_headcount":     round(avg_headcount, 1),
        "exits_this_year":   exits_this_year,
        "voluntary_exits":   voluntary_exits,
        "involuntary_exits": involuntary_exits,
        "turnover_rate":     turnover_rate,
        "retention_rate":    retention_rate,
        "voluntary_rate":    voluntary_rate,
        "prev_year_exits":   prev_exits,
        "yoy_change":        yoy_change,
        "monthly":           monthly,
        "by_department":     dept_turnover,
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

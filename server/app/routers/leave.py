"""
Leave Management API — refined.

Business rules:
  - Annual: Permanent=21d, Temporary=18d, Managing Director=28d, Intern=0d
  - Maternity: 90 days fixed
  - Paternity: 14 days fixed
  - Sick / Compassionate: admin sets total per case
  - Working days = Mon–Fri only (weekends excluded)
  - Leave records always link to an allocation for the year in which leave starts
  - Cancelling a record restores days to its allocation
"""
import uuid
import math
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from pydantic import BaseModel, validator

from app.core.database import get_db
from app.models.models import (
    LeaveAllocation, LeaveRecord, Employee,
    EmployeePosition, Position, Department, UserRole,
)
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/leave", tags=["leave"])

# ── Constants ──────────────────────────────────────────────────────────────────
FIXED_DAYS   = {"maternity": 90, "paternity": 14}
VALID_TYPES  = {"annual", "sick", "maternity", "paternity", "compassionate"}
TYPE_LABELS  = {
    "annual":        "Annual Leave",
    "sick":          "Sick Leave",
    "maternity":     "Maternity Leave",
    "paternity":     "Paternity Leave",
    "compassionate": "Compassionate Leave",
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def _working_days(start: datetime, end: datetime) -> int:
    """Count Mon–Fri working days between start and end (inclusive)."""
    s = start.replace(tzinfo=None, hour=0, minute=0, second=0, microsecond=0)
    e = end.replace(tzinfo=None, hour=0, minute=0, second=0, microsecond=0)
    if e < s:
        return 0
    count = 0
    cur   = s
    while cur <= e:
        if cur.weekday() < 5:
            count += 1
        cur = datetime(cur.year, cur.month, cur.day) + timedelta(days=1)
    return max(count, 1)


def _annual_entitlement(emp: Employee, db: Session) -> int:
    """Annual leave days based on current position level and contract type."""
    ep = (
        db.query(EmployeePosition)
        .join(Position, Position.id == EmployeePosition.position_id)
        .filter(
            EmployeePosition.employee_id == emp.id,
            EmployeePosition.is_current   == True,
        )
        .first()
    )
    if ep:
        lvl = (ep.position.level or "").lower()
        if "intern"           in lvl: return 0
        if "managing director" in lvl: return 28
    return 18 if (emp.employment_type or "permanent").lower() == "temporary" else 21


def _get_dept(emp_id, db: Session) -> Optional[str]:
    """Resolve department name for an employee via their current position."""
    ep = db.query(EmployeePosition).filter(
        EmployeePosition.employee_id == emp_id,
        EmployeePosition.is_current  == True,
    ).first()
    if not ep:
        return None
    pos = db.query(Position).filter(Position.id == ep.position_id).first()
    if not pos:
        return None
    dept = db.query(Department).filter(Department.id == pos.department_id).first()
    return dept.name if dept else None


def _get_or_create_alloc(
    emp: Employee, leave_type: str, year: int,
    db: Session, admin_days: Optional[int] = None,
) -> LeaveAllocation:
    alloc = db.query(LeaveAllocation).filter(
        LeaveAllocation.employee_id == emp.id,
        LeaveAllocation.year        == year,
        LeaveAllocation.leave_type  == leave_type,
    ).first()
    if alloc:
        return alloc

    if leave_type == "annual":
        total = _annual_entitlement(emp, db)
    elif leave_type in FIXED_DAYS:
        total = FIXED_DAYS[leave_type]
    else:
        total = admin_days or 0

    alloc = LeaveAllocation(
        id          = uuid.uuid4(),
        employee_id = emp.id,
        year        = year,
        leave_type  = leave_type,
        total_days  = total,
        used_days   = 0,
        created_at  = datetime.utcnow(),
        updated_at  = datetime.utcnow(),
    )
    db.add(alloc)
    db.flush()
    return alloc


def _fmt_alloc(a: LeaveAllocation) -> dict:
    return {
        "id":         str(a.id),
        "employee_id":str(a.employee_id),
        "year":       a.year,
        "leave_type": a.leave_type,
        "label":      TYPE_LABELS.get(a.leave_type, a.leave_type),
        "total_days": a.total_days,
        "used_days":  a.used_days,
        "remaining":  max(0, a.total_days - a.used_days),
        "pct_used":   round((a.used_days / a.total_days * 100), 1) if a.total_days > 0 else 0,
    }


def _fmt_record(r: LeaveRecord) -> dict:
    return {
        "id":           str(r.id),
        "employee_id":  str(r.employee_id),
        "allocation_id":str(r.allocation_id) if r.allocation_id else None,
        "leave_type":   r.leave_type,
        "label":        TYPE_LABELS.get(r.leave_type, r.leave_type),
        "start_date":   r.start_date.isoformat() if r.start_date else None,
        "end_date":     r.end_date.isoformat()   if r.end_date   else None,
        "days_taken":   r.days_taken,
        "status":       r.status,
        "notes":        r.notes,
        "approved_by":  r.approved_by,
        "created_at":   r.created_at.isoformat() if r.created_at else None,
    }


# ── Schemas ────────────────────────────────────────────────────────────────────

class GrantLeaveRequest(BaseModel):
    leave_type:     str
    start_date:     datetime
    end_date:       datetime
    notes:          Optional[str] = None
    override_total: Optional[int] = None  # sick / compassionate

    @validator("leave_type")
    def lt_valid(cls, v):
        if v.lower() not in VALID_TYPES:
            raise ValueError(f"Invalid leave type. Must be one of: {', '.join(VALID_TYPES)}")
        return v.lower()


class UpdateAllocationRequest(BaseModel):
    total_days: int


# ── Summary endpoint ───────────────────────────────────────────────────────────

@router.get("/summary")
def get_summary(
    year:  int = Query(default=None),
    month: int = Query(default=None),
    db:    Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """
    Summary of all active employees' leave.
    Optional month filter (1–12) narrows approved records to that month.
    """
    y   = year or datetime.utcnow().year
    now = datetime.utcnow()
    employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()

    result       = []
    dept_totals  : dict = {}   # dept_name -> total approved days
    type_totals  = {t: 0 for t in VALID_TYPES}
    on_leave_now = 0
    total_days   = 0

    for emp in employees:
        # All allocations for this year
        allocs = db.query(LeaveAllocation).filter(
            LeaveAllocation.employee_id == emp.id,
            LeaveAllocation.year        == y,
        ).all()

        # Records: always filter to the target year; optionally to month too
        rq = db.query(LeaveRecord).filter(
            LeaveRecord.employee_id == emp.id,
            extract("year", LeaveRecord.start_date) == y,
        )
        if month:
            rq = rq.filter(extract("month", LeaveRecord.start_date) == month)
        records = rq.order_by(LeaveRecord.start_date.desc()).all()

        approved = [r for r in records if r.status == "approved"]
        period_days = sum(r.days_taken for r in approved)
        total_days  += period_days

        # Currently on leave today?
        on_leave = any(
            r.start_date.replace(tzinfo=None) <= now <= r.end_date.replace(tzinfo=None)
            for r in approved
        )
        if on_leave:
            on_leave_now += 1

        # Department
        dept_name = _get_dept(emp.id, db)

        # Accumulate by dept and type
        for r in approved:
            k = dept_name or "Unknown"
            dept_totals[k] = dept_totals.get(k, 0) + r.days_taken
            if r.leave_type in type_totals:
                type_totals[r.leave_type] += r.days_taken

        result.append({
            "employee_id":      str(emp.id),
            "employee_name":    emp.full_name,
            "email":            emp.email,
            "employment_type":  emp.employment_type,
            "department":       dept_name,
            "annual_entitlement": _annual_entitlement(emp, db),
            "allocations":      [_fmt_alloc(a) for a in allocs],
            "records":          [_fmt_record(r) for r in records],
            "period_days_taken":period_days,
            "on_leave_now":     on_leave,
        })

    # Sort by name
    result.sort(key=lambda e: e["employee_name"])

    # Utilisation rate
    total_entitlement = sum(
        e["annual_entitlement"] for e in result if e["annual_entitlement"] > 0
    )
    annual_used = type_totals.get("annual", 0)
    utilisation_rate = (
        round(annual_used / total_entitlement * 100, 1)
        if total_entitlement > 0 else 0
    )

    return {
        "year":              y,
        "month":             month,
        "employees":         result,
        "total_days":        total_days,
        "on_leave_now":      on_leave_now,
        "by_type":           type_totals,
        "by_department":     dict(sorted(dept_totals.items(), key=lambda x: x[1], reverse=True)),
        "utilisation_rate":  utilisation_rate,
        "total_entitlement": total_entitlement,
    }


# ── Employee leave detail ──────────────────────────────────────────────────────

@router.get("/employee/{employee_id}")
def get_employee_leave(
    employee_id: UUID,
    year:  int = Query(default=None),
    month: int = Query(default=None),
    db:    Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Leave allocations and records for one employee."""
    if current_user.role != UserRole.ADMIN and str(current_user.id) != str(employee_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    y   = year or datetime.utcnow().year
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    allocs = db.query(LeaveAllocation).filter(
        LeaveAllocation.employee_id == employee_id,
        LeaveAllocation.year        == y,
    ).all()

    rq = db.query(LeaveRecord).filter(
        LeaveRecord.employee_id == employee_id,
        extract("year", LeaveRecord.start_date) == y,
    )
    if month:
        rq = rq.filter(extract("month", LeaveRecord.start_date) == month)
    records = rq.order_by(LeaveRecord.start_date.desc()).all()

    approved_days = sum(r.days_taken for r in records if r.status == "approved")

    # Build calendar events for approved records
    calendar = []
    for r in records:
        if r.status == "approved" and r.start_date and r.end_date:
            calendar.append({
                "id":        str(r.id),
                "leave_type":r.leave_type,
                "label":     TYPE_LABELS.get(r.leave_type, r.leave_type),
                "start":     r.start_date.date().isoformat(),
                "end":       r.end_date.date().isoformat(),
                "days":      r.days_taken,
                "notes":     r.notes,
            })

    return {
        "employee_id":       str(emp.id),
        "employee_name":     emp.full_name,
        "email":             emp.email,
        "employment_type":   emp.employment_type,
        "department":        _get_dept(employee_id, db),
        "annual_entitlement":_annual_entitlement(emp, db),
        "year":              y,
        "month":             month,
        "period_days_taken": approved_days,
        "allocations":       [_fmt_alloc(a) for a in allocs],
        "records":           [_fmt_record(r) for r in records],
        "calendar":          calendar,
    }


# ── Grant leave ────────────────────────────────────────────────────────────────

@router.post("/employee/{employee_id}/grant")
def grant_leave(
    employee_id: UUID,
    payload:     GrantLeaveRequest,
    db:          Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Admin grants leave. Calculates working days server-side."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    lt   = payload.leave_type
    year = payload.start_date.year

    # Intern check
    if lt == "annual" and _annual_entitlement(emp, db) == 0:
        raise HTTPException(status_code=400, detail="Interns are not entitled to annual leave.")

    # Calculate days
    if lt in FIXED_DAYS:
        days_taken = FIXED_DAYS[lt]
    else:
        days_taken = _working_days(payload.start_date, payload.end_date)

    if days_taken <= 0:
        raise HTTPException(status_code=400, detail="End date must be on or after start date.")

    alloc = _get_or_create_alloc(emp, lt, year, db, admin_days=payload.override_total)

    # Expand sick/compassionate allocation if admin sets a higher override
    if payload.override_total and lt in ("sick", "compassionate"):
        if payload.override_total > alloc.total_days:
            alloc.total_days = payload.override_total

    # Balance check for capped types
    if lt in ("annual", "maternity", "paternity"):
        remaining = alloc.total_days - alloc.used_days
        if days_taken > remaining:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. {remaining} day(s) remaining for {TYPE_LABELS[lt]} (need {days_taken}).",
            )

    record = LeaveRecord(
        id           = uuid.uuid4(),
        employee_id  = employee_id,
        allocation_id= alloc.id,
        leave_type   = lt,
        start_date   = payload.start_date,
        end_date     = payload.end_date,
        days_taken   = days_taken,
        status       = "approved",
        notes        = payload.notes,
        approved_by  = getattr(admin, "full_name", "Admin"),
        created_at   = datetime.utcnow(),
        updated_at   = datetime.utcnow(),
    )
    alloc.used_days  += days_taken
    alloc.updated_at  = datetime.utcnow()

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message":    f"{TYPE_LABELS[lt]} granted — {days_taken} working day(s).",
        "days_taken": days_taken,
        "record":     _fmt_record(record),
        "allocation": _fmt_alloc(alloc),
    }


# ── Cancel leave ───────────────────────────────────────────────────────────────

@router.delete("/record/{record_id}")
def cancel_leave(
    record_id: UUID,
    db:        Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Cancel leave and restore days to the allocation."""
    r = db.query(LeaveRecord).filter(LeaveRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Leave record not found")
    if r.status == "cancelled":
        raise HTTPException(status_code=400, detail="Already cancelled")

    if r.allocation_id:
        alloc = db.query(LeaveAllocation).filter(LeaveAllocation.id == r.allocation_id).first()
        if alloc:
            alloc.used_days  = max(0, alloc.used_days - r.days_taken)
            alloc.updated_at = datetime.utcnow()

    r.status     = "cancelled"
    r.updated_at = datetime.utcnow()
    db.commit()

    return {
        "message":   "Leave cancelled and days restored to balance.",
        "days_restored": r.days_taken,
        "leave_type":    r.leave_type,
    }


# ── Update allocation ──────────────────────────────────────────────────────────

@router.put("/allocation/{allocation_id}")
def update_allocation(
    allocation_id: UUID,
    payload:       UpdateAllocationRequest,
    db:            Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Admin manually adjusts the total days on an existing allocation."""
    alloc = db.query(LeaveAllocation).filter(LeaveAllocation.id == allocation_id).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")

    if payload.total_days < alloc.used_days:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot set total below already-used days ({alloc.used_days})."
        )

    alloc.total_days = payload.total_days
    alloc.updated_at = datetime.utcnow()
    db.commit()
    return _fmt_alloc(alloc)


# ── Initialize allocations ─────────────────────────────────────────────────────

@router.post("/employee/{employee_id}/initialize")
def initialize_annual(
    employee_id: UUID,
    year:        int = Query(default=None),
    db:          Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Pre-create the annual leave allocation for an employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    y     = year or datetime.utcnow().year
    alloc = _get_or_create_alloc(emp, "annual", y, db)
    db.commit()
    return {
        "message":    "Annual leave allocation initialised.",
        "allocation": _fmt_alloc(alloc),
        "entitlement":_annual_entitlement(emp, db),
    }


@router.post("/initialize-all")
def initialize_all(
    year: int = Query(default=None),
    db:   Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Bulk-initialize annual leave allocations for ALL active employees."""
    y         = year or datetime.utcnow().year
    employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()
    created   = 0
    skipped   = 0

    for emp in employees:
        existing = db.query(LeaveAllocation).filter(
            LeaveAllocation.employee_id == emp.id,
            LeaveAllocation.year        == y,
            LeaveAllocation.leave_type  == "annual",
        ).first()
        if existing:
            skipped += 1
            continue
        _get_or_create_alloc(emp, "annual", y, db)
        created += 1

    db.commit()
    return {
        "message": f"Initialized {created} new allocations for {y}. {skipped} already existed.",
        "year":    y,
        "created": created,
        "skipped": skipped,
    }


# ── Calendar endpoint ──────────────────────────────────────────────────────────

@router.get("/calendar")
def get_calendar(
    year:  int          = Query(default=None),
    month: Optional[int]= Query(default=None),
    db:    Session      = Depends(get_db),
    admin=Depends(require_admin),
):
    """All approved leave records as calendar events, optionally filtered by month."""
    y = year or datetime.utcnow().year

    rq = db.query(LeaveRecord).filter(
        LeaveRecord.status == "approved",
        extract("year", LeaveRecord.start_date) == y,
    )
    if month:
        rq = rq.filter(extract("month", LeaveRecord.start_date) == month)
    records = rq.order_by(LeaveRecord.start_date).all()

    events = []
    for r in records:
        emp = db.query(Employee).filter(Employee.id == r.employee_id).first()
        events.append({
            "id":           str(r.id),
            "employee_id":  str(r.employee_id),
            "employee_name":emp.full_name if emp else "Unknown",
            "leave_type":   r.leave_type,
            "label":        TYPE_LABELS.get(r.leave_type, r.leave_type),
            "start":        r.start_date.date().isoformat(),
            "end":          r.end_date.date().isoformat(),
            "days":         r.days_taken,
            "notes":        r.notes,
        })

    return {
        "year":   y,
        "month":  month,
        "events": events,
        "total":  len(events),
    }


# ── Stats endpoint ─────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(
    year: int = Query(default=None),
    db:   Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Quick leave stats for the dashboard KPI strip."""
    y   = year or datetime.utcnow().year
    now = datetime.utcnow()

    total_records = db.query(func.count(LeaveRecord.id)).filter(
        LeaveRecord.status == "approved",
        extract("year", LeaveRecord.start_date) == y,
    ).scalar() or 0

    total_days = db.query(func.sum(LeaveRecord.days_taken)).filter(
        LeaveRecord.status == "approved",
        extract("year", LeaveRecord.start_date) == y,
    ).scalar() or 0

    on_leave = db.query(func.count(LeaveRecord.id)).filter(
        LeaveRecord.status     == "approved",
        LeaveRecord.start_date <= now,
        LeaveRecord.end_date   >= now,
    ).scalar() or 0

    by_type: dict = {}
    rows = db.query(LeaveRecord.leave_type, func.sum(LeaveRecord.days_taken)).filter(
        LeaveRecord.status == "approved",
        extract("year", LeaveRecord.start_date) == y,
    ).group_by(LeaveRecord.leave_type).all()
    for lt, days in rows:
        by_type[lt] = int(days or 0)

    return {
        "year":          y,
        "total_records": total_records,
        "total_days":    int(total_days),
        "on_leave_now":  on_leave,
        "by_type":       by_type,
    }

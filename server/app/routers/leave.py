"""
Leave Management API routes.
Admin manages all leave. Staff can view their own.
"""
import uuid
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import (
    LeaveAllocation, LeaveRecord, Employee,
    EmployeePosition, Position, UserRole,
)
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/leave", tags=["leave"])

# ── Business rules ─────────────────────────────────────────────────────────────
FIXED_DAYS = {"maternity": 90, "paternity": 14}


def _working_days(start: datetime, end: datetime) -> int:
    """Count working days (Mon–Fri) between start and end inclusive."""
    # Strip timezone info to avoid offset-naive vs offset-aware comparison
    s = start.replace(tzinfo=None, hour=0, minute=0, second=0, microsecond=0)
    e = end.replace(tzinfo=None, hour=0, minute=0, second=0, microsecond=0)
    count = 0
    cur = s
    while cur <= e:
        if cur.weekday() < 5:  # 0=Mon … 4=Fri
            count += 1
        cur = datetime(cur.year, cur.month, cur.day) + timedelta(days=1)
    return max(count, 1)


def _annual_entitlement(emp: Employee, db: Session) -> int:
    """Annual leave days based on position level and contract type."""
    cur = (
        db.query(EmployeePosition)
        .join(Position, Position.id == EmployeePosition.position_id)
        .filter(
            EmployeePosition.employee_id == emp.id,
            EmployeePosition.is_current == True,
        )
        .first()
    )
    if cur:
        lvl = (cur.position.level or "").lower()
        if lvl == "intern":
            return 0
        if "managing director" in lvl:
            return 28
    emp_type = (emp.employment_type or "permanent").lower()
    return 18 if emp_type == "temporary" else 21


def _get_or_create_alloc(
    emp: Employee, leave_type: str, year: int,
    db: Session, admin_days: Optional[int] = None,
) -> LeaveAllocation:
    alloc = db.query(LeaveAllocation).filter(
        LeaveAllocation.employee_id == emp.id,
        LeaveAllocation.year == year,
        LeaveAllocation.leave_type == leave_type,
    ).first()
    if alloc:
        return alloc

    if leave_type == "annual":
        total = _annual_entitlement(emp, db)
    elif leave_type in FIXED_DAYS:
        total = FIXED_DAYS[leave_type]
    else:
        total = admin_days or 0   # sick / compassionate: admin defines

    alloc = LeaveAllocation(
        id=uuid.uuid4(),
        employee_id=emp.id,
        year=year,
        leave_type=leave_type,
        total_days=total,
        used_days=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(alloc)
    db.flush()
    return alloc


def _fmt_alloc(a: LeaveAllocation) -> dict:
    return {
        "id":          str(a.id),
        "employee_id": str(a.employee_id),
        "year":        a.year,
        "leave_type":  a.leave_type,
        "total_days":  a.total_days,
        "used_days":   a.used_days,
        "remaining":   max(0, a.total_days - a.used_days),
    }


def _fmt_record(r: LeaveRecord) -> dict:
    return {
        "id":            str(r.id),
        "employee_id":   str(r.employee_id),
        "allocation_id": str(r.allocation_id) if r.allocation_id else None,
        "leave_type":    r.leave_type,
        "start_date":    r.start_date.isoformat() if r.start_date else None,
        "end_date":      r.end_date.isoformat()   if r.end_date   else None,
        "days_taken":    r.days_taken,
        "status":        r.status,
        "notes":         r.notes,
        "approved_by":   r.approved_by,
        "created_at":    r.created_at.isoformat() if r.created_at else None,
    }


# ── Schemas ────────────────────────────────────────────────────────────────────

class GrantLeaveRequest(BaseModel):
    leave_type:     str
    start_date:     datetime
    end_date:       datetime
    days_taken:     int
    notes:          Optional[str] = None
    override_total: Optional[int] = None   # for sick / compassionate


class UpdateAllocationRequest(BaseModel):
    total_days: int


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/summary")
def get_summary(
    year:  int = Query(default=None),
    month: int = Query(default=None),   # 1-12; None = full year
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """All active employees' leave status for a given year (optionally filtered by month)."""
    y = year or datetime.utcnow().year
    employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()
    result = []
    for emp in employees:
        allocs = db.query(LeaveAllocation).filter(
            LeaveAllocation.employee_id == emp.id,
            LeaveAllocation.year == y,
        ).all()

        # Records — filter by month if provided
        rq = db.query(LeaveRecord).filter(
            LeaveRecord.employee_id == emp.id,
        )
        if month:
            from sqlalchemy import extract
            rq = rq.filter(
                extract("year",  LeaveRecord.start_date) == y,
                extract("month", LeaveRecord.start_date) == month,
            )
        records = rq.order_by(LeaveRecord.start_date.desc()).all()

        # Monthly stats
        month_days = sum(r.days_taken for r in records if r.status == "approved")

        result.append({
            "employee_id":        str(emp.id),
            "employee_name":      emp.full_name,
            "email":              emp.email,
            "employment_type":    emp.employment_type,
            "annual_entitlement": _annual_entitlement(emp, db),
            "allocations":        [_fmt_alloc(a) for a in allocs],
            "records":            [_fmt_record(r) for r in records],
            "month_days_taken":   month_days,
        })

    # Aggregate monthly stats across all employees
    total_month_days = sum(e["month_days_taken"] for e in result)
    on_leave_now = sum(
        1 for e in result
        if any(
            r["status"] == "approved" and
            (r["start_date"] or "") <= datetime.utcnow().isoformat() <=
            (r["end_date"]   or "")
            for r in e["records"]
        )
    )

    return {
        "year":              y,
        "month":             month,
        "employees":         result,
        "total_month_days":  total_month_days,
        "on_leave_now":      on_leave_now,
    }


@router.get("/employee/{employee_id}")
def get_employee_leave(
    employee_id: UUID,
    year:  int = Query(default=None),
    month: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Leave allocations + records for one employee (own or admin)."""
    if current_user.role != UserRole.ADMIN and str(current_user.id) != str(employee_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    y   = year or datetime.utcnow().year
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    allocs = db.query(LeaveAllocation).filter(
        LeaveAllocation.employee_id == employee_id,
        LeaveAllocation.year == y,
    ).all()

    rq = db.query(LeaveRecord).filter(LeaveRecord.employee_id == employee_id)
    if month:
        from sqlalchemy import extract
        rq = rq.filter(
            extract("year",  LeaveRecord.start_date) == y,
            extract("month", LeaveRecord.start_date) == month,
        )
    records = rq.order_by(LeaveRecord.start_date.desc()).all()

    return {
        "employee_id":        str(emp.id),
        "employee_name":      emp.full_name,
        "employment_type":    emp.employment_type,
        "annual_entitlement": _annual_entitlement(emp, db),
        "year":               y,
        "month":              month,
        "allocations":        [_fmt_alloc(a) for a in allocs],
        "records":            [_fmt_record(r) for r in records],
    }


@router.post("/employee/{employee_id}/grant")
def grant_leave(
    employee_id: UUID,
    payload: GrantLeaveRequest,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Admin grants leave — creates record and deducts from allocation."""
    VALID = {"annual", "sick", "maternity", "paternity", "compassionate"}
    lt = payload.leave_type.lower()
    if lt not in VALID:
        raise HTTPException(status_code=400, detail=f"Invalid leave type: {lt}")

    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if lt == "annual" and _annual_entitlement(emp, db) == 0:
        raise HTTPException(status_code=400, detail="Interns are not entitled to annual leave.")

    year  = payload.start_date.year

    # Recalculate working days server-side — weekends are never counted
    working = _working_days(payload.start_date, payload.end_date)
    # If client sent a days_taken that differs from server calc, trust server calc
    # (unless it's a fixed-type like maternity/paternity where days_taken is fixed)
    if lt not in ("maternity", "paternity"):
        if payload.days_taken != working:
            payload.days_taken = working

    alloc = _get_or_create_alloc(emp, lt, year, db, admin_days=payload.override_total)

    # Expand allocation on sick/compassionate if admin sets override
    if payload.override_total and lt in ("sick", "compassionate"):
        alloc.total_days = max(alloc.total_days, payload.override_total)

    # Check balance for capped types
    if lt in ("annual", "maternity", "paternity"):
        remaining = alloc.total_days - alloc.used_days
        if payload.days_taken > remaining:
            raise HTTPException(
                status_code=400,
                detail=f"Only {remaining} day(s) remaining for {lt} leave (requested {payload.days_taken}).",
            )

    record = LeaveRecord(
        id=uuid.uuid4(),
        employee_id=employee_id,
        allocation_id=alloc.id,
        leave_type=lt,
        start_date=payload.start_date,
        end_date=payload.end_date,
        days_taken=payload.days_taken,
        status="approved",
        notes=payload.notes,
        approved_by=getattr(admin, "full_name", "Admin"),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    alloc.used_days  += payload.days_taken
    alloc.updated_at  = datetime.utcnow()

    db.add(record)
    db.commit()
    db.refresh(record)
    return {
        "message":    "Leave granted",
        "record":     _fmt_record(record),
        "allocation": _fmt_alloc(alloc),
    }


@router.delete("/record/{record_id}")
def cancel_leave(
    record_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Cancel a leave record and restore days to allocation."""
    r = db.query(LeaveRecord).filter(LeaveRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Record not found")
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
    return {"message": "Leave cancelled and days restored"}


@router.put("/allocation/{allocation_id}")
def update_allocation(
    allocation_id: UUID,
    payload: UpdateAllocationRequest,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Admin adjusts total days on an existing allocation."""
    alloc = db.query(LeaveAllocation).filter(LeaveAllocation.id == allocation_id).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
    alloc.total_days = payload.total_days
    alloc.updated_at = datetime.utcnow()
    db.commit()
    return _fmt_alloc(alloc)


@router.post("/employee/{employee_id}/initialize")
def initialize_annual(
    employee_id: UUID,
    year: int = Query(default=None),
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Pre-create annual leave allocation for an employee for the given year."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    y     = year or datetime.utcnow().year
    alloc = _get_or_create_alloc(emp, "annual", y, db)
    db.commit()
    return {"message": "Initialized", "allocation": _fmt_alloc(alloc)}

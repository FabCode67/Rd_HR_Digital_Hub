"""
Performance Review API routes.
Admin creates/updates reviews. Staff can view their own.
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
    PerformanceReview, PerformanceGoal, Employee, UserRole,
)
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/performance", tags=["performance"])

# ── Rating labels ──────────────────────────────────────────────────────────────
RATING_LABELS = {
    5: "Outstanding",
    4: "Exceeded Expectations",
    3: "Succeeded",
    2: "Meets Some Expectations",
    1: "Unsatisfactory",
}

VALID_CYCLES = {"mid_year", "end_year"}


# ── Schemas ────────────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    weight: int = 20          # percentage weight
    rating: Optional[int] = None
    comments: Optional[str] = None

    @validator("rating")
    def rating_range(cls, v):
        if v is not None and v not in range(1, 6):
            raise ValueError("Rating must be 1–5")
        return v

    @validator("weight")
    def weight_range(cls, v):
        if not (1 <= v <= 100):
            raise ValueError("Weight must be 1–100")
        return v


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    weight: Optional[int] = None
    rating: Optional[int] = None
    comments: Optional[str] = None


class ReviewCreate(BaseModel):
    employee_id: UUID
    year: int
    cycle: str                 # mid_year | end_year
    rating: int                # 1–5 overall
    comments: Optional[str] = None
    goals: List[GoalCreate] = []

    @validator("rating")
    def rating_range(cls, v):
        if v not in range(1, 6):
            raise ValueError("Rating must be 1–5")
        return v

    @validator("cycle")
    def cycle_valid(cls, v):
        if v not in VALID_CYCLES:
            raise ValueError("cycle must be 'mid_year' or 'end_year'")
        return v


class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    comments: Optional[str] = None
    is_draft: Optional[bool] = None


# ── Formatters ─────────────────────────────────────────────────────────────────

def _fmt_goal(g: PerformanceGoal) -> dict:
    return {
        "id":          str(g.id),
        "review_id":   str(g.review_id),
        "title":       g.title,
        "description": g.description,
        "weight":      g.weight,
        "rating":      g.rating,
        "rating_label":RATING_LABELS.get(g.rating, "") if g.rating else None,
        "comments":    g.comments,
        "created_at":  g.created_at.isoformat(),
    }


def _fmt_review(r: PerformanceReview, include_goals: bool = True) -> dict:
    data = {
        "id":           str(r.id),
        "employee_id":  str(r.employee_id),
        "year":         r.year,
        "cycle":        r.cycle,
        "cycle_label":  "Mid-Year" if r.cycle == "mid_year" else "End of Year",
        "rating":       r.rating,
        "rating_label": RATING_LABELS.get(r.rating, ""),
        "comments":     r.comments,
        "reviewed_by":  r.reviewed_by,
        "reviewed_at":  r.reviewed_at.isoformat() if r.reviewed_at else None,
        "is_draft":     r.is_draft,
        "created_at":   r.created_at.isoformat(),
        "updated_at":   r.updated_at.isoformat() if r.updated_at else None,
    }
    if include_goals:
        data["goals"] = [_fmt_goal(g) for g in (r.goals or [])]
    return data


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/summary")
def get_summary(
    year: int = Query(default=None),
    cycle: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """All employees with their review status for a given year/cycle."""
    y = year or datetime.utcnow().year
    employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()

    result = []
    for emp in employees:
        q = db.query(PerformanceReview).filter(
            PerformanceReview.employee_id == emp.id,
            PerformanceReview.year == y,
        )
        if cycle:
            q = q.filter(PerformanceReview.cycle == cycle)
        reviews = q.all()
        result.append({
            "employee_id":   str(emp.id),
            "employee_name": emp.full_name,
            "email":         emp.email,
            "department":    None,
            "reviews":       [_fmt_review(r, include_goals=False) for r in reviews],
            "reviewed":      len(reviews) > 0,
        })

    # Summary stats
    total     = len(result)
    reviewed  = sum(1 for e in result if e["reviewed"])
    avg_rating = None
    all_ratings = [r["rating"] for e in result for r in e["reviews"] if not r["is_draft"]]
    if all_ratings:
        avg_rating = round(sum(all_ratings) / len(all_ratings), 2)

    return {
        "year": y, "cycle": cycle,
        "total_employees": total,
        "reviewed": reviewed,
        "pending": total - reviewed,
        "average_rating": avg_rating,
        "employees": result,
    }


@router.get("/employee/{employee_id}")
def get_employee_reviews(
    employee_id: UUID,
    year: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get all reviews for an employee. Staff can only see their own."""
    if current_user.role != UserRole.ADMIN and str(current_user.id) != str(employee_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    q = db.query(PerformanceReview).filter(PerformanceReview.employee_id == employee_id)
    if year:
        q = q.filter(PerformanceReview.year == year)
    reviews = q.order_by(
        PerformanceReview.year.desc(),
        PerformanceReview.cycle.desc(),
    ).all()

    return {
        "employee_id":   str(emp.id),
        "employee_name": emp.full_name,
        "reviews":       [_fmt_review(r) for r in reviews],
    }


@router.post("")
def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Create a performance review for an employee."""
    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check for existing review for same employee/year/cycle
    existing = db.query(PerformanceReview).filter(
        PerformanceReview.employee_id == payload.employee_id,
        PerformanceReview.year == payload.year,
        PerformanceReview.cycle == payload.cycle,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A {payload.cycle.replace('_',' ')} review for {payload.year} already exists for this employee."
        )

    review = PerformanceReview(
        id=uuid.uuid4(),
        employee_id=payload.employee_id,
        year=payload.year,
        cycle=payload.cycle,
        rating=payload.rating,
        comments=payload.comments,
        reviewed_by=getattr(admin, "full_name", "Admin"),
        reviewed_at=datetime.utcnow(),
        is_draft=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(review)
    db.flush()

    for g in payload.goals:
        db.add(PerformanceGoal(
            id=uuid.uuid4(),
            review_id=review.id,
            title=g.title,
            description=g.description,
            weight=g.weight,
            rating=g.rating,
            comments=g.comments,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        ))

    db.commit()
    db.refresh(review)
    return _fmt_review(review)


@router.put("/{review_id}")
def update_review(
    review_id: UUID,
    payload: ReviewUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Update overall rating / comments / draft status."""
    review = db.query(PerformanceReview).filter(PerformanceReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if payload.rating is not None:
        if payload.rating not in range(1, 6):
            raise HTTPException(status_code=400, detail="Rating must be 1–5")
        review.rating = payload.rating
    if payload.comments is not None:
        review.comments = payload.comments
    if payload.is_draft is not None:
        review.is_draft = payload.is_draft
        if not payload.is_draft:
            review.reviewed_at = datetime.utcnow()
            review.reviewed_by = getattr(admin, "full_name", "Admin")

    review.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(review)
    return _fmt_review(review)


@router.delete("/{review_id}")
def delete_review(
    review_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Delete a draft review."""
    review = db.query(PerformanceReview).filter(PerformanceReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if not review.is_draft:
        raise HTTPException(status_code=400, detail="Cannot delete a finalised review.")
    db.delete(review)
    db.commit()
    return {"message": "Review deleted"}


# ── Goal endpoints ─────────────────────────────────────────────────────────────

@router.post("/{review_id}/goals")
def add_goal(
    review_id: UUID,
    payload: GoalCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    review = db.query(PerformanceReview).filter(PerformanceReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    goal = PerformanceGoal(
        id=uuid.uuid4(), review_id=review_id,
        title=payload.title, description=payload.description,
        weight=payload.weight, rating=payload.rating, comments=payload.comments,
        created_at=datetime.utcnow(), updated_at=datetime.utcnow(),
    )
    db.add(goal)
    review.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(goal)
    return _fmt_goal(goal)


@router.put("/goals/{goal_id}")
def update_goal(
    goal_id: UUID,
    payload: GoalUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    goal = db.query(PerformanceGoal).filter(PerformanceGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    for k, v in payload.dict(exclude_unset=True).items():
        if k == "rating" and v is not None and v not in range(1, 6):
            raise HTTPException(status_code=400, detail="Rating must be 1–5")
        setattr(goal, k, v)
    goal.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(goal)
    return _fmt_goal(goal)


@router.delete("/goals/{goal_id}")
def delete_goal(
    goal_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    goal = db.query(PerformanceGoal).filter(PerformanceGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted"}

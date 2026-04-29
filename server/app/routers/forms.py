"""
Form API routes.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas import (
    FormCreate,
    FormUpdate,
    FormResponse,
    FormDetailResponse,
    FormFieldCreate,
    FormFieldResponse,
    FormResponseCreate,
    FormResponseResponse,
    FormResponseDetailResponse,
)
from app.services import FormService, FormResponseService, EmployeeService

router = APIRouter(prefix="/forms", tags=["forms"])


# ============================================================================
# FORM ENDPOINTS
# ============================================================================

@router.post("", response_model=FormDetailResponse)
def create_form(
    form: FormCreate,
    db: Session = Depends(get_db)
):
    """Create a new form."""
    # Check if form name already exists
    existing = FormService.get_by_name(db, form.name)
    if existing:
        raise HTTPException(status_code=400, detail="Form with this name already exists")

    return FormService.create(db, form)


@router.get("/{form_id}", response_model=FormDetailResponse)
def get_form(
    form_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a form by ID with all its fields."""
    form = FormService.get_by_id(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


@router.get("", response_model=List[FormResponse])
def list_forms(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List all active forms."""
    return FormService.get_all(db, skip=skip, limit=limit)


@router.put("/{form_id}", response_model=FormDetailResponse)
def update_form(
    form_id: UUID,
    form: FormUpdate,
    db: Session = Depends(get_db)
):
    """Update a form."""
    db_form = FormService.get_by_id(db, form_id)
    if not db_form:
        raise HTTPException(status_code=404, detail="Form not found")

    return FormService.update(db, form_id, form)


@router.delete("/{form_id}")
def delete_form(
    form_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete (soft delete) a form."""
    if not FormService.delete(db, form_id):
        raise HTTPException(status_code=404, detail="Form not found")
    return {"message": "Form deleted successfully"}


# ============================================================================
# FORM FIELD ENDPOINTS
# ============================================================================

@router.post("/{form_id}/fields", response_model=FormFieldResponse)
def add_form_field(
    form_id: UUID,
    field: FormFieldCreate,
    db: Session = Depends(get_db)
):
    """Add a field to a form."""
    try:
        return FormService.add_field(db, form_id, field)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/fields/{field_id}")
def remove_form_field(
    field_id: UUID,
    db: Session = Depends(get_db)
):
    """Remove a field from a form."""
    if not FormService.remove_field(db, field_id):
        raise HTTPException(status_code=404, detail="Form field not found")
    return {"message": "Form field deleted successfully"}


# ============================================================================
# FORM RESPONSE (SUBMISSION) ENDPOINTS
# ============================================================================

@router.post("/{form_id}/responses", response_model=FormResponseDetailResponse)
def submit_form(
    form_id: UUID,
    response: FormResponseCreate,
    db: Session = Depends(get_db)
):
    """Submit a form response for an employee."""
    # Validate form exists
    form = FormService.get_by_id(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    # Validate employee exists
    employee = EmployeeService.get_by_id(db, response.employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    return FormResponseService.create_response(
        db,
        form_id,
        response.employee_id,
        response.answers
    )


@router.get("/{form_id}/responses/{response_id}", response_model=FormResponseDetailResponse)
def get_form_response(
    form_id: UUID,
    response_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific form response."""
    form_response = FormResponseService.get_response(db, response_id)
    if not form_response or form_response.form_id != form_id:
        raise HTTPException(status_code=404, detail="Form response not found")
    return form_response


@router.get("/{form_id}/responses", response_model=List[FormResponseResponse])
def get_form_responses(
    form_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all responses for a form."""
    form = FormService.get_by_id(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    return FormResponseService.get_form_responses(db, form_id, skip=skip, limit=limit)


@router.put("/{form_id}/responses/{response_id}/submit", response_model=FormResponseDetailResponse)
def mark_response_submitted(
    form_id: UUID,
    response_id: UUID,
    db: Session = Depends(get_db)
):
    """Mark a form response as submitted/completed."""
    form_response = FormResponseService.get_response(db, response_id)
    if not form_response or form_response.form_id != form_id:
        raise HTTPException(status_code=404, detail="Form response not found")

    result = FormResponseService.submit_response(db, response_id)
    return result


@router.delete("/{form_id}/responses/{response_id}")
def delete_form_response(
    form_id: UUID,
    response_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a form response."""
    form_response = FormResponseService.get_response(db, response_id)
    if not form_response or form_response.form_id != form_id:
        raise HTTPException(status_code=404, detail="Form response not found")

    if not FormResponseService.delete_response(db, response_id):
        raise HTTPException(status_code=500, detail="Failed to delete response")
    return {"message": "Form response deleted successfully"}


# ============================================================================
# EMPLOYEE FORM SUBMISSION ENDPOINTS
# ============================================================================

@router.get("/employee/{employee_id}/responses", response_model=List[FormResponseResponse])
def get_employee_responses(
    employee_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all form responses submitted by an employee."""
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    return FormResponseService.get_employee_responses(db, employee_id, skip=skip, limit=limit)

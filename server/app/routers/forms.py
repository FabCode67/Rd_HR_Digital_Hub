"""
Form API routes.
"""
from typing import List, Optional
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
    FormSubmissionRequest,
    StaffFormStatusResponse,
)
from app.services import FormService, FormResponseService, EmployeeService
from app.routers.auth import require_admin, get_current_user
from app.models import FormResponse as FormResponseModel, UserRole, StaffFormAssignment

router = APIRouter(prefix="/forms", tags=["forms"])


def _get_or_create_employee_form_response(db: Session, form_id: UUID, employee_id: UUID) -> FormResponseModel:
    response = db.query(FormResponseModel).filter(
        FormResponseModel.form_id == form_id,
        FormResponseModel.employee_id == employee_id,
    ).first()
    if response:
        return response

    response = FormResponseModel(form_id=form_id, employee_id=employee_id, is_completed=False)
    db.add(response)
    db.commit()
    db.refresh(response)
    return response


def _validate_required_answers(form, answers):
    answer_map = {answer.field_id: (answer.value or "").strip() for answer in answers}

    for field in form.fields:
        if not field.is_required:
            continue

        value = answer_map.get(field.id, "")
        if field.field_type == "checkbox":
            if value.lower() not in {"true", "1", "yes", "on"}:
                raise HTTPException(status_code=400, detail=f"{field.field_label} must be confirmed")
        elif not value:
            raise HTTPException(status_code=400, detail=f"{field.field_label} is required")


@router.get("/me", response_model=List[StaffFormStatusResponse])
def get_my_required_forms(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get forms assigned to the authenticated employee with completion state."""
    payload = []

    # Fetch all form assignments for this employee
    assignments = db.query(StaffFormAssignment).filter(
        StaffFormAssignment.employee_id == current_user.id
    ).all()

    for assignment in assignments:
        form = assignment.form
        if not form or not form.is_active:
            continue

        response = _get_or_create_employee_form_response(db, form.id, current_user.id)
        payload.append(
            StaffFormStatusResponse(
                form=form,
                response_id=response.id,
                is_completed=response.is_completed,
                submitted_at=response.submitted_at,
            )
        )

    return payload


# ============================================================================
# FORM ENDPOINTS
# ============================================================================

@router.post("", response_model=FormDetailResponse)
def create_form(
    form: FormCreate,
    admin=Depends(require_admin),
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
    current_user=Depends(get_current_user),
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
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all active forms."""
    return FormService.get_all(db, skip=skip, limit=limit)


@router.put("/{form_id}", response_model=FormDetailResponse)
def update_form(
    form_id: UUID,
    form: FormUpdate,
    admin=Depends(require_admin),
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
    admin=Depends(require_admin),
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
    admin=Depends(require_admin),
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
    admin=Depends(require_admin),
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
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a form response for an employee."""
    # Validate form exists
    form = FormService.get_by_id(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    # Validate employee exists
    employee_id = response.employee_id or current_user.id
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if current_user.role != UserRole.ADMIN and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="You can only submit your own forms")

    _validate_required_answers(form, response.answers)

    return FormResponseService.create_response(
        db,
        form_id,
        employee_id,
        response.answers
    )


@router.post("/{form_id}/responses/me", response_model=FormResponseDetailResponse)
def submit_my_form(
    form_id: UUID,
    response: FormSubmissionRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a form response for the authenticated employee."""
    form = FormService.get_by_id(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    form_response = _get_or_create_employee_form_response(db, form_id, current_user.id)

    _validate_required_answers(form, response.answers)

    if response.answers:
        for answer in response.answers:
            FormResponseService.update_answer(db, form_response.id, answer.field_id, answer.value or "")

    result = FormResponseService.submit_response(db, form_response.id)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to submit form")
    return result


@router.get("/{form_id}/responses/{response_id}", response_model=FormResponseDetailResponse)
def get_form_response(
    form_id: UUID,
    response_id: UUID,
    admin=Depends(require_admin),
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
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all responses for a form."""
    form = FormService.get_by_id(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    return FormResponseService.get_form_responses(db, form_id, skip=skip, limit=limit)


@router.get("/{form_id}/responses/employee/{employee_id}", response_model=FormResponseDetailResponse)
def get_employee_form_response(
    form_id: UUID,
    employee_id: UUID,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get a specific employee's response (with answers) for a form."""
    form_response = db.query(FormResponseModel).filter(
        FormResponseModel.form_id == form_id,
        FormResponseModel.employee_id == employee_id,
    ).first()
    if not form_response:
        raise HTTPException(status_code=404, detail="No response found for this employee")
    return form_response


@router.put("/{form_id}/responses/{response_id}/submit", response_model=FormResponseDetailResponse)
def mark_response_submitted(
    form_id: UUID,
    response_id: UUID,
    admin=Depends(require_admin),
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
    admin=Depends(require_admin),
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
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all form responses submitted by an employee."""
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if current_user.role != UserRole.ADMIN and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="You can only view your own form responses")

    return FormResponseService.get_employee_responses(db, employee_id, skip=skip, limit=limit)


# ============================================================================
# FORM ASSIGNMENT ENDPOINTS (ADMIN)
# ============================================================================

@router.post("/{form_id}/assign/{employee_id}")
def assign_form_to_employee(
    form_id: UUID,
    employee_id: UUID,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Assign a form to an employee."""
    # Validate form exists
    form = FormService.get_by_id(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    # Validate employee exists
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check if assignment already exists
    existing = db.query(StaffFormAssignment).filter(
        StaffFormAssignment.form_id == form_id,
        StaffFormAssignment.employee_id == employee_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="This form is already assigned to this employee")

    # Create assignment
    assignment = StaffFormAssignment(
        employee_id=employee_id,
        form_id=form_id
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return {
        "message": f"Form '{form.name}' assigned to employee '{employee.full_name}'",
        "assignment_id": str(assignment.id)
    }


@router.delete("/{form_id}/assign/{employee_id}")
def unassign_form_from_employee(
    form_id: UUID,
    employee_id: UUID,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Unassign a form from an employee."""
    assignment = db.query(StaffFormAssignment).filter(
        StaffFormAssignment.form_id == form_id,
        StaffFormAssignment.employee_id == employee_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Form assignment not found")

    db.delete(assignment)
    db.commit()

    return {"message": "Form assignment removed successfully"}


@router.get("/{form_id}/assigned-staff", response_model=List[dict])
def get_staff_assigned_to_form(
    form_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all staff members assigned to a form."""
    form = FormService.get_by_id(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    assignments = db.query(StaffFormAssignment).filter(
        StaffFormAssignment.form_id == form_id
    ).offset(skip).limit(limit).all()

    result = []
    for assignment in assignments:
        result.append({
            "employee_id": str(assignment.employee_id),
            "employee_name": assignment.employee.full_name,
            "employee_email": assignment.employee.email,
            "assigned_at": assignment.assigned_at.isoformat()
        })

    return result


@router.get("/{employee_id}/assigned-forms", response_model=List[dict])
def get_forms_assigned_to_employee(
    employee_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all forms assigned to an employee."""
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    assignments = db.query(StaffFormAssignment).filter(
        StaffFormAssignment.employee_id == employee_id
    ).offset(skip).limit(limit).all()

    result = []
    for assignment in assignments:
        result.append({
            "form_id": str(assignment.form_id),
            "form_name": assignment.form.name,
            "form_description": assignment.form.description,
            "assigned_at": assignment.assigned_at.isoformat()
        })

    return result



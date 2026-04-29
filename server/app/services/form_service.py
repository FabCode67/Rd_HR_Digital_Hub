"""
Form service layer.
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from datetime import datetime
from app.models import Form, FormField, FormResponse, FormAnswer
from app.schemas import FormCreate, FormUpdate, FormFieldCreate, FormResponseCreate


class FormService:
    """Service for Form operations."""

    @staticmethod
    def create(db: Session, obj_in: FormCreate) -> Form:
        """Create a new form with fields."""
        form = Form(name=obj_in.name, description=obj_in.description, is_active=obj_in.is_active)
        db.add(form)
        db.flush()

        # Add fields if provided
        if obj_in.fields:
            for field in obj_in.fields:
                form_field = FormField(
                    form_id=form.id,
                    field_name=field.field_name,
                    field_label=field.field_label,
                    field_type=field.field_type,
                    is_required=field.is_required,
                    help_text=field.help_text,
                    options=field.options,
                    order=field.order
                )
                db.add(form_field)

        db.commit()
        db.refresh(form)
        return form

    @staticmethod
    def get_by_id(db: Session, form_id: UUID) -> Optional[Form]:
        """Get form by ID."""
        return db.query(Form).filter(Form.id == form_id).first()

    @staticmethod
    def get_by_name(db: Session, name: str) -> Optional[Form]:
        """Get form by name."""
        return db.query(Form).filter(Form.name == name).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 50) -> List[Form]:
        """Get all active forms."""
        return db.query(Form).filter(Form.is_active == True).offset(skip).limit(limit).all()

    @staticmethod
    def update(db: Session, form_id: UUID, obj_in: FormUpdate) -> Optional[Form]:
        """Update a form."""
        db_obj = FormService.get_by_id(db, form_id)
        if db_obj:
            update_data = obj_in.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_obj, field, value)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

    @staticmethod
    def delete(db: Session, form_id: UUID) -> bool:
        """Soft delete a form."""
        db_obj = FormService.get_by_id(db, form_id)
        if db_obj:
            db_obj.is_active = False
            db.add(db_obj)
            db.commit()
            return True
        return False

    @staticmethod
    def add_field(db: Session, form_id: UUID, field_in: FormFieldCreate) -> FormField:
        """Add a field to a form."""
        form = FormService.get_by_id(db, form_id)
        if not form:
            raise ValueError(f"Form {form_id} not found")

        form_field = FormField(
            form_id=form_id,
            field_name=field_in.field_name,
            field_label=field_in.field_label,
            field_type=field_in.field_type,
            is_required=field_in.is_required,
            help_text=field_in.help_text,
            options=field_in.options,
            order=field_in.order
        )
        db.add(form_field)
        db.commit()
        db.refresh(form_field)
        return form_field

    @staticmethod
    def remove_field(db: Session, field_id: UUID) -> bool:
        """Remove a field from a form."""
        field = db.query(FormField).filter(FormField.id == field_id).first()
        if field:
            db.delete(field)
            db.commit()
            return True
        return False


class FormResponseService:
    """Service for Form Response (submission) operations."""

    @staticmethod
    def create_response(
        db: Session,
        form_id: UUID,
        employee_id: UUID,
        answers: Optional[List[FormCreate]] = None
    ) -> FormResponse:
        """Create a form response (submission) for an employee."""
        response = FormResponse(
            form_id=form_id,
            employee_id=employee_id,
            is_completed=False
        )
        db.add(response)
        db.flush()

        # Add answers if provided
        if answers:
            for answer in answers:
                form_answer = FormAnswer(
                    response_id=response.id,
                    field_id=answer.field_id,
                    value=answer.value
                )
                db.add(form_answer)

        db.commit()
        db.refresh(response)
        return response

    @staticmethod
    def get_response(db: Session, response_id: UUID) -> Optional[FormResponse]:
        """Get a form response by ID."""
        return db.query(FormResponse).filter(FormResponse.id == response_id).first()

    @staticmethod
    def get_employee_responses(
        db: Session,
        employee_id: UUID,
        skip: int = 0,
        limit: int = 50
    ) -> List[FormResponse]:
        """Get all form responses for an employee."""
        return db.query(FormResponse).filter(
            FormResponse.employee_id == employee_id
        ).offset(skip).limit(limit).all()

    @staticmethod
    def get_form_responses(
        db: Session,
        form_id: UUID,
        skip: int = 0,
        limit: int = 50
    ) -> List[FormResponse]:
        """Get all responses for a specific form."""
        return db.query(FormResponse).filter(
            FormResponse.form_id == form_id
        ).offset(skip).limit(limit).all()

    @staticmethod
    def submit_response(db: Session, response_id: UUID) -> Optional[FormResponse]:
        """Mark form response as completed."""
        response = FormResponseService.get_response(db, response_id)
        if response:
            response.submitted_at = datetime.utcnow()
            response.is_completed = True
            db.add(response)
            db.commit()
            db.refresh(response)
        return response

    @staticmethod
    def update_answer(
        db: Session,
        response_id: UUID,
        field_id: UUID,
        value: str
    ) -> Optional[FormAnswer]:
        """Update or create an answer to a form field."""
        answer = db.query(FormAnswer).filter(
            FormAnswer.response_id == response_id,
            FormAnswer.field_id == field_id
        ).first()

        if answer:
            answer.value = value
        else:
            answer = FormAnswer(
                response_id=response_id,
                field_id=field_id,
                value=value
            )
            db.add(answer)

        db.commit()
        db.refresh(answer)
        return answer

    @staticmethod
    def get_answers(db: Session, response_id: UUID) -> List[FormAnswer]:
        """Get all answers for a form response."""
        return db.query(FormAnswer).filter(FormAnswer.response_id == response_id).all()

    @staticmethod
    def delete_response(db: Session, response_id: UUID) -> bool:
        """Delete a form response and its answers."""
        response = FormResponseService.get_response(db, response_id)
        if response:
            db.delete(response)
            db.commit()
            return True
        return False

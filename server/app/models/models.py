"""
SQLAlchemy ORM models for HR management system.
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, UUID, DateTime, ForeignKey, Boolean, Integer, Text, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class Department(Base):
    """Department model - represents organizational departments."""
    __tablename__ = "departments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parent = relationship("Department", remote_side=[id], backref="children")
    positions = relationship("Position", back_populates="department", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Department(id={self.id}, name='{self.name}')>"


class Position(Base):
    """Position model - represents roles within departments."""
    __tablename__ = "positions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)
    parent_position_id = Column(UUID(as_uuid=True), ForeignKey("positions.id"), nullable=True)
    level = Column(String(100), nullable=False)  # Head, Manager, Officer, Trainee, Intern
    band = Column(String(50), nullable=True)  # Salary band
    is_active = Column(Boolean, default=True, index=True)
    is_vacant = Column(Boolean, default=True, index=True)  # Optimized for quick vacancy checks
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    department = relationship("Department", back_populates="positions")
    parent_position = relationship("Position", remote_side=[id], backref="child_positions")
    employee_positions = relationship("EmployeePosition", back_populates="position", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Position(id={self.id}, title='{self.title}', level='{self.level}')>"


class EmployeeStatus(str, enum.Enum):
    """Employee status enumeration."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"
    TERMINATED = "TERMINATED"


class Employee(Base):
    """Employee model - represents organization staff."""
    __tablename__ = "employees"
    
    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    national_id = Column(String(50), nullable=True, unique=True)
    status = Column(Enum(EmployeeStatus), default=EmployeeStatus.ACTIVE, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    positions = relationship("EmployeePosition", back_populates="employee", cascade="all, delete-orphan")
    form_responses = relationship("FormResponse", back_populates="employee", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Employee(id={self.id}, name='{self.full_name}', email='{self.email}')>"


class EmployeePosition(Base):
    """EmployeePosition model - tracks employee assignment to positions."""
    __tablename__ = "employee_positions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    position_id = Column(UUID(as_uuid=True), ForeignKey("positions.id"), nullable=False)
    start_date = Column(DateTime, nullable=False, index=True)
    end_date = Column(DateTime, nullable=True)
    is_current = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee", back_populates="positions")
    position = relationship("Position", back_populates="employee_positions")
    
    def __repr__(self):
        return f"<EmployeePosition(employee_id={self.employee_id}, position_id={self.position_id}, is_current={self.is_current})>"


class Form(Base):
    """Form model - represents onboarding and other forms."""
    __tablename__ = "forms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    fields = relationship("FormField", back_populates="form", cascade="all, delete-orphan")
    responses = relationship("FormResponse", back_populates="form", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Form(id={self.id}, name='{self.name}')>"


class FormFieldType(str, enum.Enum):
    """Form field type enumeration."""
    TEXT = "text"
    EMAIL = "email"
    PHONE = "phone"
    NUMBER = "number"
    DATE = "date"
    DATETIME = "datetime"
    SELECT = "select"
    CHECKBOX = "checkbox"
    RADIO = "radio"
    TEXTAREA = "textarea"


class FormField(Base):
    """FormField model - represents individual form fields."""
    __tablename__ = "form_fields"
    
    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    form_id = Column(UUID(as_uuid=True), ForeignKey("forms.id"), nullable=False)
    field_name = Column(String(255), nullable=False)
    field_label = Column(String(255), nullable=False)
    field_type = Column(Enum(FormFieldType), nullable=False)
    is_required = Column(Boolean, default=True)
    help_text = Column(Text, nullable=True)
    options = Column(Text, nullable=True)  # JSON string for select/radio options
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    form = relationship("Form", back_populates="fields")
    answers = relationship("FormAnswer", back_populates="field", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<FormField(id={self.id}, form_id={self.form_id}, field_name='{self.field_name}')>"


class FormResponse(Base):
    """FormResponse model - tracks form submission by employees."""
    __tablename__ = "form_responses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    form_id = Column(UUID(as_uuid=True), ForeignKey("forms.id"), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    form = relationship("Form", back_populates="responses")
    employee = relationship("Employee", back_populates="form_responses")
    answers = relationship("FormAnswer", back_populates="response", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<FormResponse(id={self.id}, form_id={self.form_id}, employee_id={self.employee_id})>"


class FormAnswer(Base):
    """FormAnswer model - stores individual form field answers."""
    __tablename__ = "form_answers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    response_id = Column(UUID(as_uuid=True), ForeignKey("form_responses.id"), nullable=False)
    field_id = Column(UUID(as_uuid=True), ForeignKey("form_fields.id"), nullable=False)
    value = Column(Text, nullable=True)  # Stores any value as text, can be parsed as needed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    response = relationship("FormResponse", back_populates="answers")
    field = relationship("FormField", back_populates="answers")
    
    def __repr__(self):
        return f"<FormAnswer(id={self.id}, response_id={self.response_id}, field_id={self.field_id})>"

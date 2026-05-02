"""
Pydantic schemas for request/response validation.
"""
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, validator
from app.models import EmployeeStatus, FormFieldType


# ============================================================================
# DEPARTMENT SCHEMAS
# ============================================================================

class DepartmentBase(BaseModel):
    """Base schema for Department."""
    name: str
    description: Optional[str] = None
    parent_id: Optional[UUID] = None
    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    """Schema for creating a Department."""
    pass


class DepartmentUpdate(BaseModel):
    """Schema for updating a Department."""
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):
    """Schema for Department response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# POSITION SCHEMAS
# ============================================================================

class PositionBase(BaseModel):
    """Base schema for Position."""
    title: str
    description: Optional[str] = None
    department_id: UUID
    parent_position_id: Optional[UUID] = None
    level: str
    band: Optional[str] = None
    is_active: bool = True


class PositionCreate(PositionBase):
    """Schema for creating a Position."""
    pass


class PositionUpdate(BaseModel):
    """Schema for updating a Position."""
    title: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[UUID] = None
    parent_position_id: Optional[UUID] = None
    level: Optional[str] = None
    band: Optional[str] = None
    is_active: Optional[bool] = None


class PositionResponse(PositionBase):
    """Schema for Position response."""
    id: UUID
    is_vacant: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PositionTreeNode(PositionResponse):
    """Schema for hierarchical Position tree node."""
    children: List['PositionTreeNode'] = []
    employee: Optional['EmployeeSimple'] = None


class DepartmentHierarchyNode(BaseModel):
    """Schema for hierarchical Department tree node with nested positions."""
    id: UUID
    name: str
    description: Optional[str] = None
    parent_id: Optional[UUID] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Hierarchical data
    children: List['DepartmentHierarchyNode'] = []
    positions: List[PositionTreeNode] = []

    class Config:
        from_attributes = True


# ============================================================================
# EMPLOYEE SCHEMAS
# ============================================================================

class EmployeeSimple(BaseModel):
    """Simple Employee schema for nested responses."""
    id: UUID
    full_name: str
    email: str

    class Config:
        from_attributes = True


class EmployeeBase(BaseModel):
    """Base schema for Employee."""
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    national_id: Optional[str] = None
    status: EmployeeStatus = EmployeeStatus.ACTIVE


class EmployeeCreate(EmployeeBase):
    """Schema for creating an Employee."""
    pass


class EmployeeUpdate(BaseModel):
    """Schema for updating an Employee."""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    national_id: Optional[str] = None
    status: Optional[EmployeeStatus] = None


class EmployeeResponse(EmployeeBase):
    """Schema for Employee response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# EMPLOYEE POSITION SCHEMAS
# ============================================================================

class EmployeePositionBase(BaseModel):
    """Base schema for EmployeePosition."""
    employee_id: UUID
    position_id: UUID
    start_date: datetime
    end_date: Optional[datetime] = None


class EmployeePositionCreate(EmployeePositionBase):
    """Schema for creating an EmployeePosition."""
    pass


class EmployeePositionUpdate(BaseModel):
    """Schema for updating an EmployeePosition."""
    end_date: Optional[datetime] = None
    is_current: Optional[bool] = None


class EmployeePositionResponse(EmployeePositionBase):
    """Schema for EmployeePosition response."""
    id: UUID
    is_current: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmployeePositionDetail(EmployeePositionResponse):
    """Detailed Employee Position response with nested data."""
    employee: EmployeeSimple
    position: PositionResponse


# ============================================================================
# FORM SCHEMAS
# ============================================================================

class FormFieldBase(BaseModel):
    """Base schema for FormField."""
    field_name: str
    field_label: str
    field_type: FormFieldType
    is_required: bool = True
    help_text: Optional[str] = None
    options: Optional[str] = None  # JSON string
    order: int = 0


class FormFieldCreate(FormFieldBase):
    """Schema for creating a FormField."""
    pass


class FormFieldResponse(FormFieldBase):
    """Schema for FormField response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FormBase(BaseModel):
    """Base schema for Form."""
    name: str
    description: Optional[str] = None
    is_active: bool = True


class FormCreate(FormBase):
    """Schema for creating a Form."""
    fields: Optional[List[FormFieldCreate]] = []


class FormUpdate(BaseModel):
    """Schema for updating a Form."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class FormResponse(FormBase):
    """Schema for Form response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FormDetailResponse(FormResponse):
    """Detailed Form response with fields."""
    fields: List[FormFieldResponse] = []


# ============================================================================
# FORM SUBMISSION SCHEMAS
# ============================================================================

class FormAnswerBase(BaseModel):
    """Base schema for FormAnswer."""
    field_id: UUID
    value: Optional[str] = None


class FormAnswerCreate(FormAnswerBase):
    """Schema for creating a FormAnswer."""
    pass


class FormAnswerResponse(FormAnswerBase):
    """Schema for FormAnswer response."""
    id: UUID
    response_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FormResponseSubmissionBase(BaseModel):
    """Base schema for FormResponse submission."""
    form_id: UUID
    employee_id: UUID


class FormResponseCreate(FormResponseSubmissionBase):
    """Schema for creating a FormResponse."""
    answers: List[FormAnswerCreate] = []


class FormResponseUpdate(BaseModel):
    """Schema for updating a FormResponse."""
    answers: Optional[List[FormAnswerCreate]] = None
    is_completed: Optional[bool] = None


class FormResponseResponse(FormResponseSubmissionBase):
    """Schema for FormResponse response."""
    id: UUID
    submitted_at: Optional[datetime] = None
    is_completed: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FormResponseDetailResponse(FormResponseResponse):
    """Detailed FormResponse with answers."""
    form: FormDetailResponse
    employee: EmployeeSimple
    answers: List[FormAnswerResponse] = []


# ============================================================================
# PAGINATION SCHEMAS
# ============================================================================

class PaginationParams(BaseModel):
    """Schema for pagination parameters."""
    skip: int = 0
    limit: int = 50

    @validator('limit')
    def validate_limit(cls, v):
        if v > 100:
            return 100
        return v


class PageResponse(BaseModel):
    """Schema for paginated response."""
    total: int
    skip: int
    limit: int
    items: List


# ============================================================================
# ORGANIZATION TREE SCHEMAS
# ============================================================================

class OrganizationTreeNode(BaseModel):
    """Schema for organization tree node."""
    position: PositionResponse
    employee: Optional[EmployeeSimple] = None
    vacant: bool
    children: List['OrganizationTreeNode'] = []


# Update forward references
PositionTreeNode.model_rebuild()
OrganizationTreeNode.model_rebuild()

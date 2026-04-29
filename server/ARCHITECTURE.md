# Rwanda HR Digital Hub - Project Architecture & File Structure

## Executive Summary

This is a production-ready **FastAPI** backend for an HR management system supporting:
- Hierarchical organizational structures
- Department and position management
- Employee assignment and tracking
- Dynamic form systems for onboarding
- Organization tree visualization
- RESTful API with automatic documentation

**Technology Stack**: FastAPI, PostgreSQL, SQLAlchemy, Pydantic, Alembic

---

## Complete Project Structure

```
server/
│
├── 📄 main.py                          # Application entry point
├── 📄 requirements.txt                 # Python dependencies
├── 📄 .env.example                     # Environment template
├── 📄 .gitignore                       # Git ignore rules
├── 📄 alembic.ini                      # Alembic config
├── 📄 Dockerfile                       # Docker container config
├── 📄 docker-compose.yml               # Docker compose for dev
├── 📄 create_first_migration.sh         # Migration helper
├── 📄 README.md                        # Main documentation
├── 📄 SETUP_GUIDE.md                   # Installation guide (THIS FILE)
│
├── 📁 app/                             # Main application package
│   ├── __init__.py
│   ├── main.py                         # FastAPI app factory
│   │
│   ├── 📁 core/                        # Core configuration
│   │   ├── __init__.py
│   │   ├── config.py                   # Settings & environment vars
│   │   └── database.py                 # DB connection, session mgmt
│   │
│   ├── 📁 models/                      # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   └── models.py                   # All database models
│   │
│   ├── 📁 schemas/                     # Pydantic request/response schemas
│   │   ├── __init__.py
│   │   └── schemas.py                  # All validation schemas
│   │
│   ├── 📁 routers/                     # API route handlers
│   │   ├── __init__.py
│   │   ├── departments.py              # Department endpoints
│   │   ├── positions.py                # Position endpoints
│   │   ├── employees.py                # Employee endpoints
│   │   └── forms.py                    # Form endpoints
│   │
│   └── 📁 services/                    # Business logic layer
│       ├── __init__.py
│       ├── department_service.py       # Department operations
│       ├── position_service.py         # Position operations
│       ├── employee_service.py         # Employee operations
│       └── form_service.py             # Form operations
│
├── 📁 alembic/                         # Database migrations
│   ├── __init__.py
│   ├── env.py                          # Migration environment config
│   ├── script.py.mako                  # Migration template
│   │
│   └── 📁 versions/                    # Migration files
│       └── __init__.py
│
└── 📁 scripts/                         # Utility scripts
    ├── __init__.py
    └── seed_db.py                      # Database seeding with sample data
```

---

## Core Components

### 1. Application Factory Pattern (`app/main.py`)

```python
def create_app() -> FastAPI:
    """Creates and configures FastAPI application"""
    # ✓ CORS configuration
    # ✓ Router registration
    # ✓ Database initialization
    # ✓ Event handlers
    # ✓ Health check endpoints
```

**Key Features**:
- Modular application creation
- Automatic database initialization
- CORS configured for frontend
- Built-in health checks

---

### 2. Database Layer

#### Configuration (`app/core/config.py`)
- Environment variable management
- Database connection strings
- CORS settings
- API configuration
- Pydantic BaseSettings for type safety

#### Connection (`app/core/database.py`)
- SQLAlchemy engine setup
- Session management
- Dependency injection for DB sessions
- Database initialization helpers

**Key Classes**:
```python
SessionLocal = sessionmaker(bind=engine)  # Session factory
Base = declarative_base()                 # ORM base class
def get_db(): → Generator[Session]        # Dependency injection
```

---

### 3. Database Models (`app/models/models.py`)

**8 Core Models**:

1. **Department**
   - Hierarchical departments with optional parent
   - Supports sub-departments
   - Active status tracking

2. **Position**
   - Positions within departments
   - Hierarchical reporting lines
   - Level classification (Head, Manager, Officer, etc.)
   - Vacancy tracking
   - Salary band information

3. **Employee**
   - Employee profiles
   - Status tracking (ACTIVE, INACTIVE, etc.)
   - Contact information
   - National ID support

4. **EmployeePosition**
   - Maps employees to positions
   - Tracks employment history
   - Current position tracking
   - Start/end dates

5. **Form**
   - Customizable forms for onboarding
   - Field definitions
   - Active status

6. **FormField**
   - Individual form fields
   - Multiple field types
   - Validation rules
   - Field ordering

7. **FormResponse**
   - Form submissions by employees
   - Completion tracking
   - Submission timestamps

8. **FormAnswer**
   - Individual field answers
   - Links answers to fields and responses

**Key Features**:
- ✓ All IDs are UUIDs
- ✓ Automatic timestamps (created_at, updated_at)
- ✓ Proper foreign key relationships
- ✓ Enums for predefined values
- ✓ Cascading deletes where appropriate
- ✓ Indexed fields for performance

---

### 4. Validation Schemas (`app/schemas/schemas.py`)

**Schema Types**:
- `*Base` - Common fields
- `*Create` - For POST requests
- `*Update` - For PUT requests
- `*Response` - For return values
- `*Detail` - Extended responses with relationships

**Example Structure**:
```python
class DepartmentBase(BaseModel):
    name: str
    parent_id: Optional[UUID]

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str]
    
class DepartmentResponse(DepartmentBase):
    id: UUID
    created_at: datetime
```

**Features**:
- ✓ Email validation
- ✓ UUID handling
- ✓ Datetime serialization
- ✓ from_attributes for ORM conversion
- ✓ Pydantic v2 compatibility

---

### 5. Business Logic Layer (`app/services/`)

**4 Service Classes**:

#### DepartmentService
```
+ create(db, obj_in)
+ get_by_id(db, id)
+ get_by_name(db, name)
+ get_all(db, skip, limit)
+ get_root_departments(db)
+ update(db, id, obj_in)
+ delete(db, id)  # soft delete
+ get_hierarchy(db, id)
```

#### PositionService
```
+ create(db, obj_in)
+ get_by_id(db, id)
+ get_all(db, dept_id, skip, limit)
+ update(db, id, obj_in)
+ delete(db, id)  # soft delete
+ is_vacant(db, position_id)
+ update_vacancy_status(db, position_id)
+ get_current_employee(db, position_id)
+ get_organization_tree(db, dept_id)
+ get_subordinates(db, position_id)
```

#### EmployeeService
```
+ create(db, obj_in)
+ get_by_id(db, id)
+ get_by_email(db, email)
+ get_all(db, skip, limit)
+ get_by_status(db, status, skip, limit)
+ update(db, id, obj_in)
+ delete(db, id)
+ assign_to_position(db, emp_id, pos_id, start_date)
+ unassign_from_position(db, emp_pos_id, end_date)
+ get_current_position(db, emp_id)
+ get_position_history(db, emp_id)
+ get_by_department(db, dept_id, skip, limit)
```

#### FormService & FormResponseService
```
FormService:
+ create(db, obj_in)
+ get_by_id(db, id)
+ get_all(db, skip, limit)
+ update(db, id, obj_in)
+ delete(db, id)
+ add_field(db, form_id, field)
+ remove_field(db, field_id)

FormResponseService:
+ create_response(db, form_id, emp_id, answers)
+ get_response(db, response_id)
+ get_employee_responses(db, emp_id, skip, limit)
+ get_form_responses(db, form_id, skip, limit)
+ submit_response(db, response_id)
+ update_answer(db, response_id, field_id, value)
+ delete_response(db, response_id)
```

**Design Pattern**: Service Layer Pattern
- ✓ Encapsulates business logic
- ✓ Reusable across routers
- ✓ Easy to test
- ✓ Dependency injection friendly

---

### 6. API Routers (`app/routers/`)

**4 Router Modules**:

#### departments.py
```
POST   /departments
GET    /departments/{id}
GET    /departments
GET    /departments/root/list
PUT    /departments/{id}
DELETE /departments/{id}
GET    /departments/{id}/hierarchy
```

#### positions.py
```
POST   /positions
GET    /positions/{id}
GET    /positions
GET    /positions/tree/hierarchy       ← Organization tree
PUT    /positions/{id}
DELETE /positions/{id}
GET    /positions/{id}/is-vacant
GET    /positions/{id}/subordinates
```

#### employees.py
```
POST   /employees
GET    /employees/{id}
GET    /employees
PUT    /employees/{id}
DELETE /employees/{id}
POST   /employees/{id}/assign-position
PUT    /employees/{id}/unassign
GET    /employees/{id}/current-position
GET    /employees/{id}/position-history
GET    /employees/department/{id}
```

#### forms.py
```
# Forms
POST   /forms
GET    /forms/{id}
GET    /forms
PUT    /forms/{id}
DELETE /forms/{id}

# Form Fields
POST   /forms/{id}/fields
DELETE /forms/fields/{id}

# Form Responses
POST   /forms/{id}/responses
GET    /forms/{id}/responses
GET    /forms/{id}/responses/{id}
PUT    /forms/{id}/responses/{id}/submit
DELETE /forms/{id}/responses/{id}

# Employee Responses
GET    /employees/{id}/responses
```

**Features**:
- ✓ Proper HTTP status codes
- ✓ Input validation with Pydantic
- ✓ Error handling with HTTPException
- ✓ Query parameter pagination
- ✓ Relationship validation
- ✓ Transaction management

---

## Data Flow Architecture

```
┌─────────────────┐
│  Frontend (Vue) │
└────────┬────────┘
         │ HTTP/JSON
         ▼
┌─────────────────────────────────────┐
│  FastAPI Router Layer (routers/)    │ ← Route handling
├─────────────────────────────────────┤
│  ▼ Input Validation (Pydantic)      │ ← Schema validation
│  ▼ Error Handling                   │ ← HTTPException
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Service Layer (services/)          │ ← Business logic
├─────────────────────────────────────┤
│  ▼ CRUD Operations                  │
│  ▼ Relationship Management          │
│  ▼ Validation Logic                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  ORM Layer (SQLAlchemy)             │ ← Database abstraction
├─────────────────────────────────────┤
│  ▼ Model Queries                    │
│  ▼ Relationship Loading             │
│  ▼ Transaction Management           │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  PostgreSQL Database                │ ← Data persistence
│  ▼ Tables with relationships        │
│  ▼ Foreign keys & constraints       │
│  ▼ Indexes for performance          │
└─────────────────────────────────────┘
```

---

## Database Schema Relationships

```
┌─────────────────┐
│  Department     │
│  ├─ id (PK)    │
│  ├─ parent_id  │◄──────────┐
│  └─ created_at │           │
└────────┬────────┘           │
         │ (1:M)              │ (Self-ref)
         │                    │
         ▼                    │
    Positions                │
         │                   │
         └───────────────────┘

┌─────────────────────┐
│  Position           │
│  ├─ id (PK)        │
│  ├─ department_id  │──► Department
│  ├─ parent_pos_id  │──┐ (Self-ref)
│  ├─ is_vacant      │  │
│  └─ created_at     │  │
└────────┬────────────┘  │
         │ (1:M)         │
         │               │
         ▼               │
    EmployeePosition     │
         │               │
         ├──► Employee   │
         │               │
         └───────────────┘

┌──────────────┐
│  Employee    │
│  ├─ id (PK) │
│  ├─ email   │
│  ├─ status  │
│  └─ created │
└──────┬───────┘
       │ (1:M)
       ▼
    FormResponse
       │
       ├──► Form
       │
       └──► FormAnswer ──┐
                         ▼
                    FormField
                         │
                         └──► Form
```

---

## Key Design Decisions

### 1. UUID Primary Keys
- **Why**: Distributed systems, privacy, global uniqueness
- **Benefit**: No sequential ID enumeration attacks
- **Trade-off**: Slightly larger indexes

### 2. Service Layer Pattern
- **Why**: Separation of concerns, testability
- **Benefit**: Reusable business logic, dependency injection
- **Trade-off**: Additional abstraction layer

### 3. Soft Deletes
- **Why**: Audit trails, data recovery, referential integrity
- **Benefit**: Historical data preservation
- **Trade-off**: More complex queries (filter `is_active = True`)

### 4. Vacancy as Optimized Flag
- **Why**: Query performance
- **Benefit**: O(1) vacancy check instead of join query
- **Trade-off**: Must update flag on position assignments

### 5. Pydantic Schemas
- **Why**: Request validation, response serialization
- **Benefit**: Type safety, automatic OpenAPI docs
- **Trade-off**: Schema duplication (but clear contracts)

---

## API Response Format

### Success Response (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Engineering",
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

### List Response (200 OK)
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Engineering",
    "created_at": "2024-01-15T10:30:00"
  },
  ...
]
```

### Error Response (400/404/500)
```json
{
  "detail": "Department not found"
}
```

---

## Configuration Management

### Environment Variables (`.env`)
```env
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Application
DEBUG=False
LOG_LEVEL=info

# CORS
CORS_ORIGINS=["http://localhost:3000"]

# API
API_V1_PREFIX=/api/v1
```

### Pydantic Settings (`app/core/config.py`)
- Type-validated environment variables
- Fallback defaults
- IDE autocomplete support

---

## Migration Strategy

### Using Alembic

```bash
# Create migration after model changes
alembic revision --autogenerate -m "Add new field"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1

# View history
alembic history
```

### Migration Files in `alembic/versions/`
- Auto-generated from model changes
- Version controlled (git)
- Reproducible across environments

---

## Development Workflow

### 1. Model Changes
```python
# Modify app/models/models.py
class Position(Base):
    new_field = Column(String)
```

### 2. Create Migration
```bash
alembic revision --autogenerate -m "Add new_field to Position"
```

### 3. Review Generated Migration
```python
# alembic/versions/xxxxx_add_new_field.py
def upgrade():
    op.add_column('positions', sa.Column('new_field', sa.String()))

def downgrade():
    op.drop_column('positions', 'new_field')
```

### 4. Apply Migration
```bash
alembic upgrade head
```

### 5. Update Schemas
```python
# Update app/schemas/schemas.py
class PositionResponse(PositionBase):
    new_field: Optional[str]
```

### 6. Update Services/Routers
```python
# Update app/services/position_service.py if business logic changes
# Update app/routers/positions.py if new endpoints needed
```

---

## Testing Integration Points

**Ready for unit tests**:
```python
def test_create_department():
    db = TestingSessionLocal()
    dept = DepartmentService.create(
        db,
        DepartmentCreate(name="Test Dept")
    )
    assert dept.name == "Test Dept"
```

**Ready for integration tests**:
```python
def test_organization_tree():
    """Test full hierarchy retrieval"""
    tree = PositionService.get_organization_tree(db)
    assert len(tree) > 0
    assert tree[0].children is not None
```

---

## Performance Considerations

### Optimizations Included
- ✓ **Indexing**: All FK and commonly searched fields
- ✓ **Eager Loading**: Relationships loaded when needed
- ✓ **Pagination**: All list endpoints support skip/limit
- ✓ **Vacancy Flag**: O(1) vacancy check
- ✓ **Connection Pooling**: SQLAlchemy manages connections
- ✓ **Query Optimization**: Services use efficient queries

### Query Examples
```python
# Efficient: Gets only active departments
depts = db.query(Department).filter(Department.is_active == True).all()

# Organization tree with relationships
tree = PositionService.get_organization_tree(db)  # Loads children recursively

# Position vacancy: Uses optimized flag
is_vacant = position.is_vacant  # Direct attribute access
```

---

## Deployment Checklist

- [ ] Set `DEBUG = False`
- [ ] Use strong database password
- [ ] Enable HTTPS
- [ ] Set appropriate CORS origins
- [ ] Use environment variables (not hardcoded values)
- [ ] Run migrations against production database
- [ ] Increase pagination limit
- [ ] Add authentication layer
- [ ] Set up logging
- [ ] Configure database backup
- [ ] Load test the API
- [ ] Monitor database performance

---

## Next Development Phases

### Phase 2 (Future Features)
- [ ] Authentication (JWT)
- [ ] Authorization (Role-based access control)
- [ ] Annual leave tracking
- [ ] Exit form management
- [ ] Audit logging

### Phase 3 (Analytics)
- [ ] Dashboard API
- [ ] Report generation
- [ ] Analytics queries
- [ ] Data visualization endpoints

### Phase 4 (Advanced)
- [ ] File uploads
- [ ] Email notifications
- [ ] SMS alerts
- [ ] Document versioning

---

## Support & Documentation

- **README.md** - Complete API documentation
- **SETUP_GUIDE.md** - Installation instructions
- **Auto-generated Docs** - Swagger UI at `/api/docs`
- **Code Comments** - Inline documentation

---

**Architecture Designed For**:
- ✓ Clean code maintenance
- ✓ Easy testing
- ✓ Horizontal scaling
- ✓ Team collaboration
- ✓ Production deployment

**Last Updated**: 2024-04-28

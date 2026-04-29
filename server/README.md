# Rwanda HR Digital Hub - Backend API

A production-ready HR management system backend built with **FastAPI**, **PostgreSQL**, and **SQLAlchemy ORM**.

## Features

### 1. **Organizational Hierarchy**
- Tree-based hierarchical structure with Departments and Positions
- Parent-child relationships for organizational reporting
- Support for multiple organizational levels (Head, Manager, Officer, Trainee, Intern)

### 2. **Department Management**
- Create and manage organizational departments
- Support for sub-departments
- Department hierarchy visualization

### 3. **Position Management**
- Positions within departments with levels and salary bands
- Hierarchical position structure (reporting lines)
- Vacancy tracking (positions without assigned employees)

### 4. **Employee Management**
- Employee profiles with contact information
- Employee status tracking (ACTIVE, INACTIVE, SUSPENDED, TERMINATED)
- Position assignment and history
- Support for multiple positions over time

### 5. **Employee-Position Assignment**
- Assign employees to positions
- Track position history
- Current position tracking
- Automatic vacancy status updates

### 6. **Dynamic Forms System**
- Create customizable onboarding forms
- Multiple field types (text, email, phone, number, date, select, etc.)
- Form submission and response tracking
- Store employee responses

### 7. **Organization Tree API**
- Get hierarchical view of entire organization
- See reporting lines and subordinates
- Identify vacant positions
- See employee assigned to each position

## Technology Stack

- **Framework**: FastAPI 0.104.1
- **ORM**: SQLAlchemy 2.0.23
- **Database**: PostgreSQL
- **Migrations**: Alembic 1.12.1
- **Validation**: Pydantic 2.5.0
- **Server**: Uvicorn

## Project Structure

```
server/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application factory
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # Configuration and settings
│   │   └── database.py        # Database connection and session
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py          # SQLAlchemy ORM models
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── schemas.py         # Pydantic schemas
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── departments.py     # Department endpoints
│   │   ├── positions.py       # Position endpoints
│   │   ├── employees.py       # Employee endpoints
│   │   └── forms.py           # Form endpoints
│   └── services/
│       ├── __init__.py
│       ├── department_service.py
│       ├── position_service.py
│       ├── employee_service.py
│       └── form_service.py
├── alembic/
│   ├── versions/              # Migration files
│   ├── env.py                 # Alembic configuration
│   └── script.py.mako         # Migration template
├── scripts/
│   └── seed_db.py             # Database seeding script
├── .env.example               # Example environment variables
├── alembic.ini                # Alembic configuration
├── requirements.txt           # Python dependencies
├── main.py                    # Entry point
└── README.md
```

## Installation & Setup

### Prerequisites

- Python 3.10+
- PostgreSQL 12+
- pip or conda

### Step 1: Clone Repository

```bash
cd server
```

### Step 2: Create Virtual Environment

```bash
# Using venv
python -m venv venv
source venv/Scripts/activate  # On Windows

# Using conda
conda create -n hr_hub python=3.10
conda activate hr_hub
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Configure Database

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection:

```env
# For Neon DB (PostgreSQL Cloud)
DATABASE_URL="postgresql://neondb_owner:password@host.neon.tech/neondb?sslmode=require"

# For Local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/hr_digital_hub"
```

### Step 5: Initialize Database

The database will be automatically created on first run. To manually initialize:

```bash
python -c "from app.core.database import init_db; init_db()"
```

### Step 6: Seed Sample Data (Optional)

```bash
python scripts/seed_db.py
```

This creates:
- 5 sample departments with hierarchy
- 12 positions with reporting lines
- 12 employees
- 4 onboarding forms with fields

### Step 7: Run Development Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or:

```bash
python main.py
```

Server will start at: `http://localhost:8000`

## API Documentation

### Auto-Generated Docs

Once running, visit:
- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`
- **OpenAPI JSON**: `http://localhost:8000/api/openapi.json`

### Base URL

All endpoints are prefixed with: `/api/v1`

## API Endpoints

### Departments

```http
POST   /api/v1/departments                    # Create
GET    /api/v1/departments/{id}               # Get by ID
GET    /api/v1/departments                    # List all
GET    /api/v1/departments/root/list          # Get root departments
PUT    /api/v1/departments/{id}               # Update
DELETE /api/v1/departments/{id}               # Delete
GET    /api/v1/departments/{id}/hierarchy     # Get tree
```

### Positions

```http
POST   /api/v1/positions                      # Create
GET    /api/v1/positions/{id}                 # Get by ID
GET    /api/v1/positions                      # List all
GET    /api/v1/positions/tree/hierarchy       # Get org tree
PUT    /api/v1/positions/{id}                 # Update
DELETE /api/v1/positions/{id}                 # Delete
GET    /api/v1/positions/{id}/is-vacant       # Check vacancy
GET    /api/v1/positions/{id}/subordinates    # Get subordinates
```

### Employees

```http
POST   /api/v1/employees                      # Create
GET    /api/v1/employees/{id}                 # Get by ID
GET    /api/v1/employees                      # List all
PUT    /api/v1/employees/{id}                 # Update
DELETE /api/v1/employees/{id}                 # Delete
POST   /api/v1/employees/{id}/assign-position # Assign to position
PUT    /api/v1/employees/{id}/unassign        # Unassign from position
GET    /api/v1/employees/{id}/current-position # Get current position
GET    /api/v1/employees/{id}/position-history # Get position history
GET    /api/v1/employees/department/{dept_id} # Get by department
```

### Forms

```http
POST   /api/v1/forms                          # Create form
GET    /api/v1/forms/{id}                     # Get form
GET    /api/v1/forms                          # List all forms
PUT    /api/v1/forms/{id}                     # Update form
DELETE /api/v1/forms/{id}                     # Delete form
POST   /api/v1/forms/{id}/fields              # Add field
DELETE /api/v1/forms/fields/{field_id}        # Remove field
POST   /api/v1/forms/{id}/responses           # Submit response
GET    /api/v1/forms/{id}/responses           # Get form responses
GET    /api/v1/forms/{id}/responses/{resp_id} # Get specific response
PUT    /api/v1/forms/{id}/responses/{resp_id}/submit # Mark as submitted
GET    /api/v1/employees/{id}/responses       # Get employee responses
```

## Example API Calls

### Create Department

```bash
curl -X POST "http://localhost:8000/api/v1/departments" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering",
    "description": "Software development department"
  }'
```

### Get Organization Tree

```bash
curl "http://localhost:8000/api/v1/positions/tree/hierarchy"
```

### Create Employee

```bash
curl -X POST "http://localhost:8000/api/v1/employees" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+250 788 123 456"
  }'
```

### Assign Employee to Position

```bash
curl -X POST "http://localhost:8000/api/v1/employees/{employee_id}/assign-position" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "uuid",
    "position_id": "uuid",
    "start_date": "2024-01-01T00:00:00"
  }'
```

### Submit Form Response

```bash
curl -X POST "http://localhost:8000/api/v1/forms/{form_id}/responses" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "uuid",
    "form_id": "uuid",
    "answers": [
      {
        "field_id": "uuid",
        "value": "Answer text"
      }
    ]
  }'
```

## Database Models

### Department
- `id` (UUID, PK)
- `name` (String, unique)
- `description` (Text)
- `parent_id` (FK, nullable)
- `is_active` (Boolean)
- `created_at`, `updated_at`

### Position
- `id` (UUID, PK)
- `title` (String)
- `department_id` (FK)
- `parent_position_id` (FK, nullable)
- `level` (String: Head, Manager, Officer, Trainee, Intern)
- `band` (String, nullable)
- `is_vacant` (Boolean)
- `is_active` (Boolean)
- `created_at`, `updated_at`

### Employee
- `id` (UUID, PK)
- `full_name` (String)
- `email` (String, unique)
- `phone` (String)
- `date_of_birth` (DateTime)
- `national_id` (String)
- `status` (Enum: ACTIVE, INACTIVE, SUSPENDED, TERMINATED)
- `created_at`, `updated_at`

### EmployeePosition
- `id` (UUID, PK)
- `employee_id` (FK)
- `position_id` (FK)
- `start_date` (DateTime)
- `end_date` (DateTime, nullable)
- `is_current` (Boolean)
- `created_at`, `updated_at`

### Form
- `id` (UUID, PK)
- `name` (String, unique)
- `description` (Text)
- `is_active` (Boolean)
- `created_at`, `updated_at`

### FormField
- `id` (UUID, PK)
- `form_id` (FK)
- `field_name` (String)
- `field_label` (String)
- `field_type` (Enum: text, email, phone, number, date, select, etc.)
- `is_required` (Boolean)
- `help_text` (Text)
- `order` (Integer)
- `created_at`, `updated_at`

### FormResponse
- `id` (UUID, PK)
- `form_id` (FK)
- `employee_id` (FK)
- `submitted_at` (DateTime)
- `is_completed` (Boolean)
- `created_at`, `updated_at`

### FormAnswer
- `id` (UUID, PK)
- `response_id` (FK)
- `field_id` (FK)
- `value` (Text)
- `created_at`, `updated_at`

## Database Migrations

### Create new migration after model changes:

```bash
alembic revision --autogenerate -m "Description of changes"
```

### Apply migrations:

```bash
alembic upgrade head
```

### Rollback migration:

```bash
alembic downgrade -1
```

## Configuration

Configuration is managed through environment variables in `.env`:

```env
# Application
APP_NAME="Rwanda HR Digital Hub"
DEBUG=False

# Database
DATABASE_URL="postgresql://user:pass@host/db"

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000"]

# API
API_V1_PREFIX="/api/v1"
```

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

Error responses include a detail message:

```json
{
  "detail": "Error description"
}
```

## Security Considerations

For production:

1. **Set DEBUG = False** in .env
2. **Use environment variables** for sensitive data
3. **Enable HTTPS** in production
4. **Implement authentication** (JWT tokens) before production
5. **Add rate limiting** to API endpoints
6. **Use strong database passwords**
7. **Implement CORS** properly for frontend domain
8. **Add input validation** (already in place with Pydantic)
9. **Monitor database queries** for performance
10. **Regular backups** of PostgreSQL database

## Performance Optimization

1. **Database Indexing**: All FK and commonly queried fields are indexed
2. **Pagination**: All list endpoints support pagination
3. **Vacancy Caching**: `is_vacant` field is optimized flag, updated on position changes
4. **Query Optimization**: Services layer uses efficient queries
5. **Connection Pooling**: SQLAlchemy manages connection pool

## Testing (Future Development)

Create `tests/` directory with pytest fixtures:

```bash
pytest tests/ -v
```

## Development Roadmap

- [ ] Authentication & Authorization (JWT)
- [ ] Annual Leave Tracking System
- [ ] Exit Form Management
- [ ] Analytics & Visualization Dashboards
- [ ] Email Notifications
- [ ] Audit Logging
- [ ] API Rate Limiting
- [ ] Advanced Search & Filtering
- [ ] Batch Operations
- [ ] File Upload (Documents, Profile Pictures)

## Deployment

### Docker

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Heroku

```bash
heroku create hr-digital-hub
heroku config:set DATABASE_URL="postgresql://..."
git push heroku main
```

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
python -c "from app.core.database import engine; engine.connect()"
```

### Migration Issues

```bash
# Show current revision
alembic current

# View migration history
alembic history --verbose
```

### Port Already in Use

```bash
# Change port
uvicorn main:app --port 8001
```

## Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/name`
4. Submit pull request

## License

Copyright © 2024 Rwanda HR Digital Hub. All rights reserved.

## Support

For issues, questions, or suggestions: support@hr-hub.rw

---

## Quick Start Summary

```bash
# 1. Setup environment
python -m venv venv
source venv/Scripts/activate  # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure database
cp .env.example .env
# Edit .env with your DATABASE_URL

# 4. Seed sample data
python scripts/seed_db.py

# 5. Run server
python main.py

# 6. Access API
# Documentation: http://localhost:8000/api/docs
```

Happy coding! 🚀

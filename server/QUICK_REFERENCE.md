# Rwanda HR Digital Hub - Quick Reference & Common Operations

## 🚀 Quick Start (5 Minutes)

### Setup

```bash
cd server
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your DATABASE_URL
python -c "from app.core.database import init_db; init_db()"
python scripts/seed_db.py
python main.py
```

### Access API

- **Docs**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **Health**: http://localhost:8000/health

---

## 📋 Common API Operations

### 1. Create Department

```bash
curl -X POST "http://localhost:8000/api/v1/departments" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marketing",
    "description": "Marketing and Communications"
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Marketing",
  "description": "Marketing and Communications",
  "parent_id": null,
  "is_active": true,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

### 2. Create Position

```bash
curl -X POST "http://localhost:8000/api/v1/positions" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Marketing Manager",
    "department_id": "550e8400-e29b-41d4-a716-446655440000",
    "level": "Manager",
    "band": "B1",
    "description": "Lead marketing team"
  }'
```

### 3. Create Employee

```bash
curl -X POST "http://localhost:8000/api/v1/employees" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Jane Doe",
    "email": "jane.doe@company.com",
    "phone": "+250 788 123 456",
    "status": "ACTIVE"
  }'
```

### 4. Assign Employee to Position

```bash
curl -X POST "http://localhost:8000/api/v1/employees/{employee_id}/assign-position" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "employee-uuid",
    "position_id": "position-uuid",
    "start_date": "2024-01-15T00:00:00"
  }'
```

### 5. Get Organization Tree

```bash
curl "http://localhost:8000/api/v1/positions/tree/hierarchy"
```

**Response:**
```json
[
  {
    "id": "pos1",
    "title": "HR Director",
    "level": "Head",
    "is_vacant": false,
    "employee": {
      "id": "emp1",
      "full_name": "John Doe",
      "email": "john@company.com"
    },
    "children": [
      {
        "id": "pos2",
        "title": "HR Manager",
        "level": "Manager",
        "is_vacant": true,
        "employee": null,
        "children": []
      }
    ]
  }
]
```

### 6. Create Form

```bash
curl -X POST "http://localhost:8000/api/v1/forms" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Personal Information Form",
    "description": "Collect employee personal details",
    "fields": [
      {
        "field_name": "full_name",
        "field_label": "Full Name",
        "field_type": "text",
        "is_required": true,
        "order": 0
      },
      {
        "field_name": "email",
        "field_label": "Email Address",
        "field_type": "email",
        "is_required": true,
        "order": 1
      },
      {
        "field_name": "date_of_birth",
        "field_label": "Date of Birth",
        "field_type": "date",
        "is_required": true,
        "order": 2
      }
    ]
  }'
```

### 7. Submit Form Response

```bash
curl -X POST "http://localhost:8000/api/v1/forms/{form_id}/responses" \
  -H "Content-Type: application/json" \
  -d '{
    "form_id": "form-uuid",
    "employee_id": "employee-uuid",
    "answers": [
      {
        "field_id": "field1-uuid",
        "value": "Jane Doe"
      },
      {
        "field_id": "field2-uuid",
        "value": "jane@company.com"
      },
      {
        "field_id": "field3-uuid",
        "value": "1990-01-15"
      }
    ]
  }'
```

### 8. Get Employee Position History

```bash
curl "http://localhost:8000/api/v1/employees/{employee_id}/position-history"
```

### 9. Check Position Vacancy

```bash
curl "http://localhost:8000/api/v1/positions/{position_id}/is-vacant"
```

**Response:**
```json
{
  "position_id": "pos-uuid",
  "is_vacant": true
}
```

### 10. Get Employees by Department

```bash
curl "http://localhost:8000/api/v1/employees/department/{department_id}"
```

---

## 🔍 Filter & Pagination Examples

### List with Pagination

```bash
# Skip first 20, get next 10
curl "http://localhost:8000/api/v1/employees?skip=20&limit=10"

# List departments with pagination
curl "http://localhost:8000/api/v1/departments?skip=0&limit=50"
```

### Filter by Status

```bash
# Get active employees
curl "http://localhost:8000/api/v1/employees?status=ACTIVE"

# Get inactive employees
curl "http://localhost:8000/api/v1/employees?status=INACTIVE"
```

### Filter by Department

```bash
# Get positions in specific department
curl "http://localhost:8000/api/v1/positions?department_id={dept_id}"

# Get employees in specific department
curl "http://localhost:8000/api/v1/employees/department/{dept_id}"
```

---

## ✏️ Update Operations

### Update Department

```bash
curl -X PUT "http://localhost:8000/api/v1/departments/{dept_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Department Name",
    "description": "Updated description"
  }'
```

### Update Employee

```bash
curl -X PUT "http://localhost:8000/api/v1/employees/{employee_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "New Name",
    "phone": "+250 788 999 999",
    "status": "INACTIVE"
  }'
```

### Update Position

```bash
curl -X PUT "http://localhost:8000/api/v1/positions/{position_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Manager",
    "level": "Manager"
  }'
```

---

## 🗑️ Delete Operations

### Delete Department (Soft Delete)

```bash
curl -X DELETE "http://localhost:8000/api/v1/departments/{dept_id}"
```

### Delete Employee

```bash
curl -X DELETE "http://localhost:8000/api/v1/employees/{employee_id}"
```

### Unassign Employee from Position

```bash
curl -X PUT "http://localhost:8000/api/v1/employees/{employee_position_id}/unassign" \
  -H "Content-Type: application/json" \
  -d '{
    "end_date": "2024-12-31T00:00:00"
  }'
```

---

## 📊 Data Models Quick Reference

### Status Enum (Employee)
```
ACTIVE
INACTIVE
SUSPENDED
TERMINATED
```

### Position Levels
```
Head
Manager
Senior Manager
Officer
Senior Officer
Graduate Trainee
Intern
```

### Form Field Types
```
text
email
phone
number
date
datetime
select
checkbox
radio
textarea
```

---

## 🔐 Authentication (Future)

Currently not implemented. For future versions:

```bash
# Login endpoint (future)
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@company.com",
    "password": "password"
  }'

# Use returned token in header
curl -X GET "http://localhost:8000/api/v1/employees" \
  -H "Authorization: Bearer {token}"
```

---

## 🧪 Testing with Python

```python
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# Get all departments
response = requests.get(f"{BASE_URL}/departments")
departments = response.json()
print(json.dumps(departments, indent=2))

# Create new department
dept_data = {
    "name": "Sales",
    "description": "Sales Department"
}
response = requests.post(
    f"{BASE_URL}/departments",
    json=dept_data
)
new_dept = response.json()
print(f"Created: {new_dept['id']}")

# Get specific department
dept_id = new_dept['id']
response = requests.get(f"{BASE_URL}/departments/{dept_id}")
print(response.json())
```

---

## 📱 Frontend Integration Example (JavaScript)

```javascript
const API_BASE = 'http://localhost:8000/api/v1';

// Get all departments
async function getDepartments() {
  const response = await fetch(`${API_BASE}/departments`);
  return await response.json();
}

// Create new employee
async function createEmployee(employeeData) {
  const response = await fetch(`${API_BASE}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(employeeData),
  });
  return await response.json();
}

// Get organization tree
async function getOrganizationTree() {
  const response = await fetch(`${API_BASE}/positions/tree/hierarchy`);
  return await response.json();
}

// Assign employee to position
async function assignEmployeeToPosition(employeeId, positionId, startDate) {
  const response = await fetch(
    `${API_BASE}/employees/${employeeId}/assign-position`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employee_id: employeeId,
        position_id: positionId,
        start_date: startDate,
      }),
    }
  );
  return await response.json();
}
```

---

## 🐛 Debugging Tips

### Check Database Connection

```bash
python -c "from app.core.database import engine; print('✓ Connected' if engine.connect() else '✗ Failed')"
```

### View Database

```bash
psql -U postgres -d hr_digital_hub
```

**Useful SQL**:
```sql
-- See all employees
SELECT id, full_name, email, status FROM employees;

-- See all positions with vacancy status
SELECT id, title, department_id, is_vacant FROM positions;

-- See employee assignments
SELECT ep.id, e.full_name, p.title, ep.is_current 
FROM employee_positions ep
JOIN employees e ON ep.employee_id = e.id
JOIN positions p ON ep.position_id = p.id;

-- Exit
\q
```

### Check API Logs

```bash
# Run server with verbose logging
DEBUG=True python main.py
```

---

## 🎯 Validation Rules

### Email Validation
- Must be valid email format
- Must be unique across employees

### UUID Fields
- Must be valid UUID format
- Must reference existing record

### Required Fields (by model)

**Employee**:
- full_name (required)
- email (required, unique)
- status (default: ACTIVE)

**Position**:
- title (required)
- department_id (required)
- level (required)

**Department**:
- name (required, unique)

**Form Response**:
- form_id (required)
- employee_id (required)

---

## 💾 Database Backup & Restore

### Backup

```bash
# PostgreSQL backup
pg_dump -U postgres -d hr_digital_hub > backup.sql

# Compressed backup
pg_dump -U postgres -d hr_digital_hub | gzip > backup.sql.gz
```

### Restore

```bash
# From SQL file
psql -U postgres -d hr_digital_hub < backup.sql

# From compressed file
gunzip < backup.sql.gz | psql -U postgres -d hr_digital_hub
```

---

## 📈 Performance Tips

1. **Use pagination**: Always use `skip` and `limit` for large datasets
2. **Filter when possible**: Reduce data transferred
3. **Batch operations**: Group multiple operations
4. **Check vacancy status**: Use `is_vacant` flag instead of running joins
5. **Index custom queries**: Add indexes for frequently searched fields

---

## 🚨 Error Codes Reference

| Code | Meaning | Solution |
|------|---------|----------|
| 200 | Success | API call worked |
| 201 | Created | Resource created |
| 400 | Bad Request | Check request format/validation |
| 404 | Not Found | Check ID/reference exists |
| 500 | Server Error | Check logs, database connection |

---

## 📚 File Reference

### Core Files
- `app/main.py` - FastAPI application factory
- `app/core/config.py` - Configuration
- `app/core/database.py` - Database setup

### Models
- `app/models/models.py` - All 8 database models

### Schemas
- `app/schemas/schemas.py` - Request/response validation

### Routes
- `app/routers/departments.py` - Department endpoints
- `app/routers/positions.py` - Position endpoints
- `app/routers/employees.py` - Employee endpoints
- `app/routers/forms.py` - Form endpoints

### Services
- `app/services/department_service.py` - Department logic
- `app/services/position_service.py` - Position logic
- `app/services/employee_service.py` - Employee logic
- `app/services/form_service.py` - Form logic

### Scripts
- `scripts/seed_db.py` - Sample data seeding
- `create_first_migration.sh` - Migration helper

### Configuration
- `.env.example` - Environment template
- `requirements.txt` - Dependencies
- `Dockerfile` - Docker image
- `docker-compose.yml` - Docker compose

### Documentation
- `README.md` - Full API documentation
- `SETUP_GUIDE.md` - Installation instructions
- `ARCHITECTURE.md` - System design
- `QUICK_REFERENCE.md` - This file

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Server running on `http://localhost:8000`
- [ ] Swagger UI accessible at `/api/docs`
- [ ] Health check returns status at `/health`
- [ ] Can create a department via API
- [ ] Can create an employee
- [ ] Can get organization tree
- [ ] Sample data loaded from seed script
- [ ] Database connection working

---

## 🆘 Getting Help

1. Check **README.md** for full API documentation
2. Check **SETUP_GUIDE.md** for installation issues
3. Check **ARCHITECTURE.md** for design details
4. Review **Swagger UI** at `/api/docs` for interactive testing
5. Check logs: Run with `DEBUG=True`

---

**Last Updated**: 2024-04-28
**Version**: 1.0.0 (Production Ready)

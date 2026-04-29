"""
Database seed script for development and testing.
Run this after migrations to populate the database with sample data.
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta
from uuid import uuid4

# Add project root to path so `import app` works when running this script
# (scripts/ is under the project root). We insert the project root directory.
project_root = str(Path(__file__).resolve().parent.parent)
sys.path.insert(0, project_root)

from app.core.database import SessionLocal
from app.models import (
    Department,
    Position,
    Employee,
    EmployeePosition,
    Form,
    FormField,
    FormFieldType,
    EmployeeStatus,
)

# -----------------------------
# Position structure (configurable)
# Edit this mapping to add departments, sub-departments and position hierarchies.
# Keys must match department names created in `seed_departments()`.
# Each entry is a list of position dicts. Use the `parent` field to refer to
# another position by its title. To make all department Heads report to the
# top-level Managing Director set their parent to "Managing Director".
# -----------------------------
POSITION_STRUCTURE = {
    # Management (global executive)
    "Management": [
        {"title": "Managing Director", "level": "Head", "band": "A0", "parent": None},
    ],

    # Human Resources
    "Human Resources": [
        {"title": "HR Director", "level": "Head", "band": "A1", "parent": "Managing Director"},
        {"title": "HR Manager", "level": "Manager", "band": "B1", "parent": "HR Director"},
        {"title": "HR Officer", "level": "Officer", "band": "C1", "parent": "HR Manager"},
    ],

    "Recruitment": [
        {"title": "Recruitment Head", "level": "Head", "band": "B2", "parent": "HR Director"},
        {"title": "Recruitment Specialist", "level": "Manager", "band": "C2", "parent": "Recruitment Head"},
    ],

    # Finance
    "Finance": [
        {"title": "Finance Director", "level": "Head", "band": "A1", "parent": "Managing Director"},
        {"title": "Finance Manager", "level": "Manager", "band": "B1", "parent": "Finance Director"},
    ],

    "Payroll": [
        {"title": "Payroll Manager", "level": "Manager", "band": "B3", "parent": "Finance Director"},
    ],

    # IT department and sub-departments
    "Information Technology": [
        {"title": "IT Director", "level": "Head", "band": "A1", "parent": "Managing Director"},
        {"title": "Senior Developer", "level": "Manager", "band": "B2", "parent": "IT Director"},
        {"title": "Junior Developer", "level": "Officer", "band": "C3", "parent": "Senior Developer"},
    ],

    # IT sub-department: IT Application (led by Manager)
    "IT Application": [
        {"title": "IT Application Manager", "level": "Manager", "band": "B2", "parent": "IT Director"},
        {"title": "IT App Assistant Manager", "level": "Assistant Manager", "band": "C2", "parent": "IT Application Manager"},
        {"title": "IT App Officer", "level": "Officer", "band": "C3", "parent": "IT App Assistant Manager"},
        {"title": "IT App Graduate Trainee", "level": "Graduate Trainee", "band": "D1", "parent": "IT App Officer"},
        {"title": "IT App Intern", "level": "Intern", "band": "D2", "parent": "IT App Officer"},
    ],

    # IT sub-department: IT Infrastructure (led by Manager)
    "IT Infrastructure": [
        {"title": "IT Infrastructure Manager", "level": "Manager", "band": "B2", "parent": "IT Director"},
        {"title": "IT Infra Assistant Manager", "level": "Assistant Manager", "band": "C2", "parent": "IT Infrastructure Manager"},
        {"title": "IT Infra Officer", "level": "Officer", "band": "C3", "parent": "IT Infra Assistant Manager"},
    ],
}

# Default levels (user can rearrange these globally if desired)
DEFAULT_POSITION_LEVELS = [
    "Head",
    "Manager",
    "Assistant Manager",
    "Officer",
    "Graduate Trainee",
    "Intern",
]



def seed_departments(db):
    """Create sample departments."""
    print("Seeding departments...")
    
    # Root departments
    hr_dept = Department(
        id=uuid4(),
        name="Human Resources",
        description="Managing workforce and HR operations",
        parent_id=None
    )
    finance_dept = Department(
        id=uuid4(),
        name="Finance",
        description="Financial management and accounting",
        parent_id=None
    )
    it_dept = Department(
        id=uuid4(),
        name="Information Technology",
        description="IT infrastructure and development",
        parent_id=None
    )
    
    # Sub-departments
    recruitment_dept = Department(
        id=uuid4(),
        name="Recruitment",
        description="Hiring and talent acquisition",
        parent_id=hr_dept.id
    )
    payroll_dept = Department(
        id=uuid4(),
        name="Payroll",
        description="Salary and payroll management",
        parent_id=finance_dept.id
    )
    
    # Management root and IT sub-departments
    management_dept = Department(
        id=uuid4(),
        name="Management",
        description="Executive management",
        parent_id=None
    )
    it_app_dept = Department(
        id=uuid4(),
        name="IT Application",
        description="Application development and maintenance",
        parent_id=it_dept.id
    )
    it_infra_dept = Department(
        id=uuid4(),
        name="IT Infrastructure",
        description="Infrastructure and operations",
        parent_id=it_dept.id
    )

    depts = [management_dept, hr_dept, finance_dept, it_dept, recruitment_dept, payroll_dept, it_app_dept, it_infra_dept]
    db.add_all(depts)
    db.commit()
    print(f"Created {len(depts)} departments")
    return {d.name: d.id for d in depts}


def seed_positions(db, dept_ids):
    """Create sample positions."""
    print("Seeding positions...")
    
    # Build positions list from POSITION_STRUCTURE (configurable at top)
    positions_data = []
    for dept_name, pos_list in POSITION_STRUCTURE.items():
        for pos in pos_list:
            pos_entry = dict(pos)
            pos_entry["department"] = dept_name
            positions_data.append(pos_entry)
    
    positions = {}
    parent_mapping = {}
    
    # First pass - create all positions without parents
    for pos_data in positions_data:
        pos = Position(
            id=uuid4(),
            title=pos_data["title"],
            department_id=dept_ids[pos_data["department"]],
            level=pos_data["level"],
            band=pos_data["band"],
            is_active=True,
            is_vacant=True
        )
        positions[pos_data["title"]] = pos
        db.add(pos)
    
    db.commit()
    
    # Second pass - set parent relationships
    for pos_data in positions_data:
        if pos_data["parent"]:
            positions[pos_data["title"]].parent_position_id = positions[pos_data["parent"]].id
    
    db.commit()
    print(f"Created {len(positions)} positions")
    return positions


def seed_employees(db):
    """Create sample employees."""
    print("Seeding employees...")
    
    employees_data = [
        {"name": "Dr. James Banda", "email": "james.banda@hr-hub.rw", "status": EmployeeStatus.ACTIVE},
        {"name": "Sarah Nkomo", "email": "sarah.nkomo@hr-hub.rw", "status": EmployeeStatus.ACTIVE},
        {"name": "Peter Kabanda", "email": "peter.kabanda@hr-hub.rw", "status": EmployeeStatus.ACTIVE},
        {"name": "Grace Mukarutamu", "email": "grace.muk@hr-hub.rw", "status": EmployeeStatus.ACTIVE},
        {"name": "David Nshimiyimana", "email": "david.n@hr-hub.rw", "status": EmployeeStatus.ACTIVE},
        {"name": "Theresa Mukankusi", "email": "theresa.m@hr-hub.rw", "status": EmployeeStatus.ACTIVE},
        {"name": "Robert Kanyanga", "email": "robert.k@hr-hub.rw", "status": EmployeeStatus.ACTIVE},
        {"name": "Marie Dushime", "email": "marie.d@hr-hub.rw", "status": EmployeeStatus.ACTIVE},
        {"name": "Jean Claude Manzi", "email": "jean.m@hr-hub.rw", "status": EmployeeStatus.ACTIVE},
        {"name": "Alice Mukamusoni", "email": "alice.muk@hr-hub.rw", "status": EmployeeStatus.ACTIVE},
        {"name": "Patrick Uwizeye", "email": "patrick.u@hr-hub.rw", "status": EmployeeStatus.ACTIVE},
        {"name": "Beatrice Nsabimana", "email": "beatrice.n@hr-hub.rw", "status": EmployeeStatus.ACTIVE},
    ]
    
    employees = []
    for emp_data in employees_data:
        emp = Employee(
            id=uuid4(),
            full_name=emp_data["name"],
            email=emp_data["email"],
            phone="+250788123456",
            status=emp_data["status"]
        )
        employees.append(emp)
        db.add(emp)
    
    db.commit()
    print(f"Created {len(employees)} employees")
    return employees


def seed_employee_positions(db, employees, positions):
    """Assign employees to positions."""
    print("Seeding employee positions...")
    
    assignments = [
        (0, "HR Director", 0),  # Dr. James Banda as HR Director
        (1, "Recruitment Head", 0),  # Sarah Nkomo as Recruitment Head
        (2, "HR Manager", 0),  # Peter Kabanda as HR Manager
        (3, "HR Officer", 0),  # Grace as HR Officer
        (4, "Finance Director", 0),  # David as Finance Director
        (5, "Finance Manager", 0),  # Theresa as Finance Manager
        (6, "IT Director", 0),  # Robert as IT Director
        (7, "Senior Developer", 0),  # Marie as Senior Developer
        (8, "Payroll Manager", 0),  # Jean Claude as Payroll Manager
        (9, "Junior Developer", 0),  # Alice as Junior Developer
        (10, "Recruitment Specialist", 0),  # Patrick as Recruitment Specialist
        (11, "IT App Graduate Trainee", 0),  # Beatrice as Graduate Trainee (IT Application)
    ]
    
    emp_positions = []
    start_date = datetime.utcnow() - timedelta(days=365)
    
    for emp_idx, pos_title, months_ago in assignments:
        emp_pos = EmployeePosition(
            id=uuid4(),
            employee_id=employees[emp_idx].id,
            position_id=positions[pos_title].id,
            start_date=start_date + timedelta(days=months_ago*30),
            is_current=True
        )
        emp_positions.append(emp_pos)
        db.add(emp_pos)
        
        # Mark position as occupied
        positions[pos_title].is_vacant = False
    
    db.commit()
    print(f"Created {len(emp_positions)} employee position assignments")
    return emp_positions


def seed_forms(db):
    """Create sample onboarding forms."""
    print("Seeding forms...")
    
    forms_data = [
        {
            "name": "Personal Information Form",
            "description": "Collect employee personal details",
            "fields": [
                {"name": "full_name", "label": "Full Name", "type": FormFieldType.TEXT, "required": True},
                {"name": "email", "label": "Email Address", "type": FormFieldType.EMAIL, "required": True},
                {"name": "phone", "label": "Phone Number", "type": FormFieldType.PHONE, "required": True},
                {"name": "date_of_birth", "label": "Date of Birth", "type": FormFieldType.DATE, "required": True},
                {"name": "nationality", "label": "Nationality", "type": FormFieldType.TEXT, "required": True},
                {"name": "address", "label": "Residential Address", "type": FormFieldType.TEXTAREA, "required": True},
            ]
        },
        {
            "name": "Insurance Form",
            "description": "Health and life insurance enrollment",
            "fields": [
                {"name": "insurance_type", "label": "Insurance Type", "type": FormFieldType.SELECT, "required": True},
                {"name": "beneficiary_name", "label": "Beneficiary Name", "type": FormFieldType.TEXT, "required": True},
                {"name": "beneficiary_phone", "label": "Beneficiary Phone", "type": FormFieldType.PHONE, "required": True},
                {"name": "relationship", "label": "Relationship", "type": FormFieldType.TEXT, "required": True},
                {"name": "insurance_amount", "label": "Coverage Amount (RWF)", "type": FormFieldType.NUMBER, "required": True},
            ]
        },
        {
            "name": "Loan Application Form",
            "description": "Employee loan application",
            "fields": [
                {"name": "loan_type", "label": "Loan Type", "type": FormFieldType.SELECT, "required": True},
                {"name": "loan_amount", "label": "Requested Amount (RWF)", "type": FormFieldType.NUMBER, "required": True},
                {"name": "loan_purpose", "label": "Purpose of Loan", "type": FormFieldType.TEXTAREA, "required": True},
                {"name": "repayment_period", "label": "Repayment Period (months)", "type": FormFieldType.NUMBER, "required": True},
                {"name": "guarantor_name", "label": "Guarantor Name", "type": FormFieldType.TEXT, "required": True},
            ]
        },
        {
            "name": "Emergency Contact Form",
            "description": "Emergency contact information",
            "fields": [
                {"name": "emergency_contact_name", "label": "Contact Name", "type": FormFieldType.TEXT, "required": True},
                {"name": "emergency_contact_phone", "label": "Contact Phone", "type": FormFieldType.PHONE, "required": True},
                {"name": "relationship", "label": "Relationship", "type": FormFieldType.TEXT, "required": True},
                {"name": "secondary_contact_name", "label": "Secondary Contact Name", "type": FormFieldType.TEXT, "required": False},
                {"name": "secondary_contact_phone", "label": "Secondary Contact Phone", "type": FormFieldType.PHONE, "required": False},
            ]
        },
    ]
    
    forms = []
    for form_data in forms_data:
        form = Form(
            id=uuid4(),
            name=form_data["name"],
            description=form_data["description"],
            is_active=True
        )
        db.add(form)
        db.flush()
        
        fields = []
        for idx, field_data in enumerate(form_data["fields"]):
            field = FormField(
                id=uuid4(),
                form_id=form.id,
                field_name=field_data["name"],
                field_label=field_data["label"],
                field_type=field_data["type"],
                is_required=field_data["required"],
                order=idx
            )
            fields.append(field)
            db.add(field)
        
        forms.append(form)
    
    db.commit()
    print(f"Created {len(forms)} forms")
    return forms


def main():
    """Run all seed functions."""
    db = SessionLocal()
    try:
        print("\n" + "="*60)
        print("Rwanda HR Digital Hub - Database Seeding")
        print("="*60 + "\n")
        
        dept_ids = seed_departments(db)
        positions = seed_positions(db, dept_ids)
        employees = seed_employees(db)
        seed_employee_positions(db, employees, positions)
        forms = seed_forms(db)
        
        print("\n" + "="*60)
        print("✓ Database seeding completed successfully!")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n✗ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()

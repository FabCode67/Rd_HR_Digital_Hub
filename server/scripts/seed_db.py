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
    UserRole,
    StaffFormAssignment,
)
from app.services.auth_service import get_password_hash

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
    default_password_hash = get_password_hash("NCBAStaff@123")
    for emp_data in employees_data:
        emp = Employee(
            id=uuid4(),
            full_name=emp_data["name"],
            email=emp_data["email"],
            phone="+250788123456",
            status=emp_data["status"],
            hashed_password=default_password_hash,
            role=UserRole.STAFF
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
    """Create sample onboarding forms with rich-text descriptions."""
    print("Seeding forms...")
    
    forms_data = [
        {
            "name": "Background/Reference Checks Consent Form",
            "description": """
<h2>Background/Reference Checks Consent Form</h2>
<p>This form is required for all new employees as part of the hiring process.</p>
<h3>Terms & Conditions</h3>
<p>By signing this form, you authorize NCBA and/or its appointed agents to conduct background and reference checks. 
This may include:</p>
<ul>
<li>Verification of employment history</li>
<li>Educational credentials verification</li>
<li>Criminal background check</li>
<li>Reference checks with previous employers</li>
</ul>
<p>All information collected will be handled in accordance with privacy regulations.</p>
            """,
            "fields": [
                {"name": "full_name", "label": "Full Name", "type": FormFieldType.TEXT, "required": True},
                {"name": "date_of_birth", "label": "Date of Birth", "type": FormFieldType.DATE, "required": True},
                {"name": "national_id", "label": "National ID Number", "type": FormFieldType.TEXT, "required": True},
                {"name": "consent", "label": "I authorize background and reference checks", "type": FormFieldType.CHECKBOX, "required": True},
                {"name": "signature_date", "label": "Signature Date", "type": FormFieldType.DATE, "required": True},
            ],
        },
        {
            "name": "Employee Code of Conduct Pledge",
            "description": """
<h2>Employee Code of Conduct Pledge</h2>
<p>All NCBA employees are required to acknowledge and pledge compliance with the NCBA Code of Conduct and Ethics.</p>
<h3>Code of Conduct Summary</h3>
<ul>
<li>Maintain professional standards at all times</li>
<li>Treat all colleagues with respect and dignity</li>
<li>Follow all company policies and procedures</li>
<li>Report any violations or concerns through appropriate channels</li>
<li>Uphold the values and reputation of NCBA</li>
</ul>
<p>Failure to comply may result in disciplinary action up to and including termination.</p>
            """,
            "fields": [
                {"name": "employee_name", "label": "Employee Name", "type": FormFieldType.TEXT, "required": True},
                {"name": "position", "label": "Position", "type": FormFieldType.TEXT, "required": True},
                {"name": "department", "label": "Department", "type": FormFieldType.TEXT, "required": True},
                {"name": "pledge_acceptance", "label": "I pledge to uphold the NCBA Code of Conduct", "type": FormFieldType.CHECKBOX, "required": True},
                {"name": "acknowledgement_date", "label": "Date of Acknowledgement", "type": FormFieldType.DATE, "required": True},
            ],
        },
        {
            "name": "Information Security Policy Acknowledgement",
            "description": """
<h2>Information Security Policy Acknowledgement</h2>
<p>All NCBA staff must acknowledge receipt and understanding of the Information Security Policy.</p>
<h3>Key Security Responsibilities</h3>
<ul>
<li>Protect confidential and sensitive information</li>
<li>Use secure passwords and keep credentials confidential</li>
<li>Report security incidents immediately</li>
<li>Comply with data protection and privacy regulations</li>
<li>Do not share access credentials or create backdoor access</li>
</ul>
<p>Your role is critical in maintaining the security and integrity of NCBA systems and data.</p>
            """,
            "fields": [
                {"name": "employee_name", "label": "Employee Name", "type": FormFieldType.TEXT, "required": True},
                {"name": "department", "label": "Department", "type": FormFieldType.TEXT, "required": True},
                {"name": "security_acknowledgement", "label": "I acknowledge the Information Security Policy", "type": FormFieldType.CHECKBOX, "required": True},
                {"name": "acknowledgement_date", "label": "Date", "type": FormFieldType.DATE, "required": True},
            ],
        },
        {
            "name": "Employee Onboarding Survey",
            "description": """
<h2>Employee Onboarding Survey</h2>
<p>Please provide feedback on your onboarding experience to help us improve our processes.</p>
            """,
            "fields": [
                {"name": "employee_name", "label": "Your Name", "type": FormFieldType.TEXT, "required": True},
                {"name": "department", "label": "Department", "type": FormFieldType.TEXT, "required": True},
                {"name": "start_date", "label": "Your Start Date", "type": FormFieldType.DATE, "required": True},
                {"name": "onboarding_experience", "label": "How would you rate your onboarding experience?", "type": FormFieldType.SELECT, "required": True, "options": "Excellent,Good,Satisfactory,Needs Improvement"},
                {"name": "clear_expectations", "label": "Were your role expectations clear?", "type": FormFieldType.RADIO, "required": True, "options": "Yes,No,Somewhat"},
                {"name": "comments", "label": "Additional Comments", "type": FormFieldType.TEXTAREA, "required": False},
            ],
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
            # Handle options field
            options_str = None
            if "options" in field_data:
                options_str = field_data["options"]
            
            field = FormField(
                id=uuid4(),
                form_id=form.id,
                field_name=field_data["name"],
                field_label=field_data["label"],
                field_type=field_data["type"],
                is_required=field_data.get("required", True),
                options=options_str,
                order=idx
            )
            fields.append(field)
            db.add(field)
        
        forms.append(form)
    
    db.commit()
    print(f"Created {len(forms)} customizable forms")
    return forms


def seed_admin(db):
    """Create admin user for authentication."""
    print("Seeding admin user...")
    
    # Check if admin already exists
    existing_admin = db.query(Employee).filter(
        Employee.email == "admin@example.com"
    ).first()
    
    if existing_admin:
        print("Admin user already exists (admin@example.com)")
        return existing_admin
    
    admin = Employee(
        id=uuid4(),
        full_name="System Administrator",
        email="admin@example.com",
        phone="+250788000001",
        hashed_password=get_password_hash("AdminPass123!"),
        role=UserRole.ADMIN,
        status=EmployeeStatus.ACTIVE
    )
    db.add(admin)
    db.commit()
    print("Created admin user: admin@example.com / AdminPass123!")
    return admin


def seed_form_assignments(db, employees, forms):
    """Assign required forms to all staff members."""
    print("Seeding form assignments...")
    
    # Define which forms are required for all staff (by form name)
    required_form_names = [
        "BACKGROUND/REFERENCE CHECKS CONSENT FORM",
        "EMPLOYEE CONDUCT PLEDGE",
        "STATEMENT OF INFORMATION PROCESSING RESPONSIBILITIES FOR ALL BANK STAFF",
    ]
    
    # Get form objects
    required_forms = [
        form for form in forms 
        if form.name in required_form_names
    ]
    
    # Assign required forms to all staff members
    assignment_count = 0
    for employee in employees:
        for form in required_forms:
            # Check if assignment already exists
            existing = db.query(StaffFormAssignment).filter(
                StaffFormAssignment.employee_id == employee.id,
                StaffFormAssignment.form_id == form.id
            ).first()
            
            if not existing:
                assignment = StaffFormAssignment(
                    employee_id=employee.id,
                    form_id=form.id
                )
                db.add(assignment)
                assignment_count += 1
    
    db.commit()
    print(f"Created {assignment_count} form assignments")


def main():
    """Run all seed functions."""
    db = SessionLocal()
    try:
        print("\n" + "="*60)
        print("Rwanda HR Digital Hub - Database Seeding")
        print("="*60 + "\n")
        
        seed_admin(db)
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

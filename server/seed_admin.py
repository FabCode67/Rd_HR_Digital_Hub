#!/usr/bin/env python
"""
seed_admin.py — Create the first admin user in the database.

Usage (run from the server/ directory):

  python seed_admin.py
  python seed_admin.py --email admin@ncba.com --password MySecret123 --name "Eric N"
"""

import sys
import argparse
from pathlib import Path

# Make app importable
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.database import SessionLocal
from app.core.config import settings
from app.services.auth_service import get_password_hash
from app.models.models import Employee, UserRole, EmployeeStatus
import uuid
from datetime import datetime


def seed_admin(email: str, password: str, full_name: str) -> None:
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing = db.query(Employee).filter(Employee.email == email).first()
        if existing:
            print(f"[seed] User with email '{email}' already exists.")
            print(f"[seed] Role: {existing.role}  Status: {existing.status}")
            print("[seed] No changes made.")
            return

        # Check if any admin exists at all
        any_admin = db.query(Employee).filter(Employee.role == UserRole.ADMIN).first()
        if any_admin:
            print(f"[seed] An admin already exists: {any_admin.email}")
            print("[seed] Do you want to create another admin? (yes/no): ", end="")
            answer = input().strip().lower()
            if answer not in ("yes", "y"):
                print("[seed] Aborted.")
                return

        hashed = get_password_hash(password)

        admin = Employee(
            id=uuid.uuid4(),
            full_name=full_name,
            email=email,
            hashed_password=hashed,
            role=UserRole.ADMIN,
            status=EmployeeStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print(f"\n{'='*50}")
        print(f"  Admin created successfully!")
        print(f"{'='*50}")
        print(f"  Name    : {admin.full_name}")
        print(f"  Email   : {admin.email}")
        print(f"  Password: {password}")
        print(f"  Role    : {admin.role}")
        print(f"  ID      : {admin.id}")
        print(f"{'='*50}")
        print(f"\n  Login at: http://localhost:3000/login\n")

    except Exception as e:
        db.rollback()
        print(f"[seed] ERROR: {e}")
        sys.exit(1)
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the first admin user")
    parser.add_argument("--email",    default="admin@ncba.rw",  help="Admin email")
    parser.add_argument("--password", default="Admin@1234",      help="Admin password")
    parser.add_argument("--name",     default="NCBA Admin",      help="Admin full name")
    args = parser.parse_args()

    print(f"\n[seed] Creating admin user...")
    print(f"[seed] Email   : {args.email}")
    print(f"[seed] Name    : {args.name}")
    print(f"[seed] Database: {settings.DATABASE_URL[:40]}...\n")

    seed_admin(
        email=args.email,
        password=args.password,
        full_name=args.name,
    )


if __name__ == "__main__":
    main()




 ## /* .\seed.bat --email eric@ncba.rw --password MySecret123 --name "Eric Niyibizi" */
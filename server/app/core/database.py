"""
Database configuration and session management.
"""
from typing import Generator
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from app.core.config import settings
from sqlalchemy.ext.declarative import declarative_base

# Create base class for models
Base = declarative_base()

# Create engine
# Note: psycopg2 does not accept a `server_settings` connect arg; use
# `application_name` or omit unsupported options. Provide `application_name`
# in `connect_args` for PostgreSQL URLs only.
connect_args = {}
if "postgresql" in settings.DATABASE_URL:
    connect_args = {"application_name": "Rwanda HR Digital Hub"}

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    poolclass=NullPool if settings.DEBUG else None,
    connect_args=connect_args,
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db() -> Generator[Session, None, None]:
    """Dependency injection for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database (create all tables)."""
    Base.metadata.create_all(bind=engine)
    _ensure_employee_auth_columns()


def _ensure_employee_auth_columns() -> None:
    """Backfill auth columns for databases created before auth fields existed."""
    inspector = inspect(engine)
    if "employees" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("employees")}

    statements = []
    if "hashed_password" not in columns:
        statements.append(
            text("ALTER TABLE employees ADD COLUMN hashed_password VARCHAR(255)")
        )
    if "role" not in columns:
        statements.append(
            text("ALTER TABLE employees ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'staff'")
        )
    if "status" not in columns:
        statements.append(
            text("ALTER TABLE employees ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'")
        )
    
    # Also ensure existing rows have the correct enum format for existing role column
    # This handles databases that may have been created with lowercase defaults
    if columns and "role" in columns:
        statements.append(
            text("UPDATE employees SET role = 'STAFF' WHERE role = 'staff' OR role IS NULL")
        )
        statements.append(
            text("UPDATE employees SET role = 'ADMIN' WHERE role = 'admin'")
        )

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(statement)


def drop_db():
    """Drop all tables (use with caution)."""
    Base.metadata.drop_all(bind=engine)

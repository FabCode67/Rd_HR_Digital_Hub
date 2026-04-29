"""
Database configuration and session management.
"""
from typing import Generator
from sqlalchemy import create_engine, event
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


def drop_db():
    """Drop all tables (use with caution)."""
    Base.metadata.drop_all(bind=engine)

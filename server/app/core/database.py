"""
Database configuration and session management.
Schema is managed by Alembic migrations — do NOT call create_all() here.
"""
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.declarative import declarative_base
from app.core.config import settings

# ── Shared declarative base (imported by all models and by env.py) ────────────
Base = declarative_base()

# ── Engine ────────────────────────────────────────────────────────────────────
_url = settings.DATABASE_URL
if _url.startswith("postgres://"):
    _url = _url.replace("postgres://", "postgresql://", 1)

_connect_args: dict = {}
if "neon.tech" in _url:
    # Neon requires SSL; psycopg2-binary honours sslmode in the DSN but we
    # also pass it explicitly so it is never stripped by SQLAlchemy.
    _connect_args["sslmode"] = "require"
elif "postgresql" in _url:
    _connect_args["application_name"] = "Rwanda HR Digital Hub"

engine = create_engine(
    _url,
    echo=settings.DEBUG,
    # NullPool: no persistent connections — safe for serverless / Neon
    poolclass=NullPool,
    connect_args=_connect_args,
)

# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations() -> None:
    """Apply pending Alembic migrations at startup using the alembic CLI executable."""
    import sys
    import subprocess
    from pathlib import Path

    server_root = Path(__file__).resolve().parent.parent

    # Find alembic.exe next to the current Python interpreter
    python_dir = Path(sys.executable).parent
    scripts_dir = python_dir / "Scripts"
    alembic_exe = scripts_dir / "alembic.exe"
    if not alembic_exe.exists():
        alembic_exe = scripts_dir / "alembic"  # Unix
    if not alembic_exe.exists():
        print(f"[migrations] alembic executable not found in {scripts_dir} — skipping")
        return

    ini_path = server_root / "alembic.ini"
    if not ini_path.exists():
        print(f"[migrations] alembic.ini not found at {ini_path} — skipping")
        return

    try:
        result = subprocess.run(
            [str(alembic_exe), "upgrade", "head"],
            cwd=str(server_root),
            capture_output=False,
        )
        if result.returncode == 0:
            print("[migrations] Database schema is up-to-date.")
        else:
            print(f"[migrations] Warning: alembic exited with code {result.returncode}")
    except Exception as exc:
        print(f"[migrations] Warning: migration failed — {exc}")


def check_db_connection() -> bool:
    """Quick connectivity check — used in the /health endpoint."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

"""
Alembic env.py — wired to app settings and models.
Supports Neon.tech PostgreSQL (sslmode=require).
"""

# ── PATH FIX (must run before any alembic import) ────────────────────────────
import sys, os, importlib.util
from pathlib import Path as _Path

def _fix_alembic_path():
    """Remove the local alembic/ folder from import resolution."""
    server_dir = str(_Path(__file__).resolve().parent.parent)
    cleaned = [p for p in sys.path if os.path.abspath(p) != os.path.abspath(server_dir)]
    original = sys.path[:]
    sys.path = cleaned
    try:
        spec = importlib.util.find_spec("alembic")
        if spec and spec.origin:
            real_parent = str(_Path(spec.origin).resolve().parent.parent)
            sys.path = original
            if real_parent not in sys.path:
                sys.path.insert(0, real_parent)
            if server_dir not in sys.path:
                sys.path.append(server_dir)
            return
    except Exception:
        pass
    sys.path = original

_fix_alembic_path()
# ─────────────────────────────────────────────────────────────────────────────

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

from app.core.config import settings
from app.core.database import Base

# Import every model so Alembic sees all tables
from app.models.models import (  # noqa: F401
    Department,
    Position,
    Employee,
    EmployeePosition,
    Form,
    FormField,
    FormResponse,
    FormAnswer,
    StaffFormAssignment,
    EducationRecord,
    EmploymentExtension,
)

# ── Alembic config ────────────────────────────────────────────────────────────
config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _get_url() -> str:
    url = settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def _engine_kwargs() -> dict:
    return {
        "poolclass": pool.NullPool,
        "connect_args": {"sslmode": "require"} if "neon.tech" in settings.DATABASE_URL else {},
    }


def run_migrations_offline() -> None:
    context.configure(
        url=_get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    ini_section = config.get_section(config.config_ini_section, {})
    ini_section["sqlalchemy.url"] = _get_url()

    connectable = engine_from_config(
        ini_section,
        prefix="sqlalchemy.",
        **_engine_kwargs(),
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_schemas=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

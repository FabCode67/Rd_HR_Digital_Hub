"""
Main FastAPI application factory.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import run_migrations, check_db_connection
from app.routers import departments, positions, employees, forms
from app.routers import education as education_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="HR Management System API — NCBA Rwanda",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_kwargs: dict = dict(
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )
    if settings.CORS_ALLOW_ORIGIN_REGEX:
        cors_kwargs["allow_origin_regex"] = settings.CORS_ALLOW_ORIGIN_REGEX

    app.add_middleware(CORSMiddleware, **cors_kwargs)

    # ── Routers ───────────────────────────────────────────────────────────────
    prefix = settings.API_V1_PREFIX
    app.include_router(departments.router, prefix=prefix)
    app.include_router(positions.router,   prefix=prefix)
    app.include_router(employees.router,   prefix=prefix)
    app.include_router(forms.router,       prefix=prefix)
    app.include_router(education_router.router, prefix=prefix)

    from app.routers import auth as auth_router
    app.include_router(auth_router.router, prefix=prefix)

    # ── Built-in endpoints ────────────────────────────────────────────────────
    @app.get("/", tags=["meta"])
    def root():
        return {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/api/docs",
        }

    @app.get("/health", tags=["meta"])
    def health():
        db_ok = check_db_connection()
        return {
            "status": "healthy" if db_ok else "degraded",
            "database": "connected" if db_ok else "unreachable",
            "app": settings.APP_NAME,
        }

    # ── Startup ───────────────────────────────────────────────────────────────
    @app.on_event("startup")
    def startup_event():
        print(f"\n{'='*50}")
        print(f"  {settings.APP_NAME}  v{settings.APP_VERSION}")
        print(f"{'='*50}")
        print("[startup] Running Alembic migrations…")
        run_migrations()
        print("[startup] Ready.\n")

    return app


app = create_app()

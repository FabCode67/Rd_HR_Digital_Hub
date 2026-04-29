"""
Main FastAPI application factory.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.routers import departments, positions, employees, forms


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Production-ready HR Management System API",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json"
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )

    # Include routers
    app.include_router(
        departments.router,
        prefix=settings.API_V1_PREFIX
    )
    app.include_router(
        positions.router,
        prefix=settings.API_V1_PREFIX
    )
    app.include_router(
        employees.router,
        prefix=settings.API_V1_PREFIX
    )
    app.include_router(
        forms.router,
        prefix=settings.API_V1_PREFIX
    )

    # Health check endpoint
    @app.get("/")
    def root():
        """Root endpoint - API health check."""
        return {
            "message": f"Welcome to {settings.APP_NAME}",
            "version": settings.APP_VERSION,
            "docs": "/api/docs"
        }

    @app.get("/health")
    def health():
        """Health check endpoint."""
        return {"status": "healthy", "app": settings.APP_NAME}

    # Event handlers
    @app.on_event("startup")
    def startup_event():
        """Initialize database on startup."""
        print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
        try:
            init_db()
            print("Database initialized successfully")
        except Exception as e:
            print(f"Warning: Database initialization failed: {e}")

    return app


# Create application instance
app = create_app()

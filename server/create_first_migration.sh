#!/bin/bash
# Create initial Alembic migration
# Run this after first time setup

echo "Creating initial Alembic migration..."

# Initialize Alembic (if not already done)
if [ ! -f "alembic.ini" ]; then
    echo "Initializing Alembic..."
    alembic init alembic
fi

# Create initial migration
echo "Generating migration..."
alembic revision --autogenerate -m "Initial migration - create all tables"

# Apply migration
echo "Applying migration..."
alembic upgrade head

echo "✓ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Review the generated migration file in alembic/versions/"
echo "2. Run: alembic upgrade head"
echo "3. Run: python scripts/seed_db.py"

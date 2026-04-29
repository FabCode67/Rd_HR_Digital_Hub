# Rwanda HR Digital Hub - Setup Guide

## Complete Installation & Running Instructions

This guide provides step-by-step instructions to get the Rwanda HR Digital Hub backend running locally.

## Prerequisites

- **Windows, macOS, or Linux**
- **Python 3.10 or higher** - [Download](https://www.python.org/downloads/)
- **PostgreSQL 12+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)
- **A PostgreSQL database** (local or Neon.tech cloud)

## Option A: Manual Setup (Local PostgreSQL)

### Step 1: Verify Python Installation

```bash
python --version
# Should output: Python 3.10.x or higher

pip --version
# Should output: pip x.x.x
```

### Step 2: Create PostgreSQL Database

**Using Windows/macOS/Linux Command Line:**

```bash
# Start PostgreSQL service
# Windows: Services → PostgreSQL
# macOS: brew services start postgresql
# Linux: sudo service postgresql start

# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE hr_digital_hub;

# Create user (optional)
CREATE USER hr_admin WITH PASSWORD 'secure_password';
ALTER ROLE hr_admin SET client_encoding TO 'utf8';
ALTER ROLE hr_admin SET default_transaction_isolation TO 'read committed';
ALTER ROLE hr_admin SET default_transaction_deferrable TO on;
ALTER ROLE hr_admin SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE hr_digital_hub TO hr_admin;

# Exit
\q
```

**Or using pgAdmin GUI:**
1. Open pgAdmin
2. Right-click "Databases" → Create → Database
3. Name: `hr_digital_hub`
4. Save

### Step 3: Create Virtual Environment

```bash
# Navigate to project folder
cd server

# Create virtual environment
python -m venv venv

# Activate virtual environment

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

You should see `(venv)` prefix in your terminal.

### Step 4: Install Dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install requirements
pip install -r requirements.txt
```

### Step 5: Configure Environment File

```bash
# Create .env file from template
cp .env.example .env

# Edit .env file - use your text editor
```

**Edit `.env` with your database credentials:**

```env
# Local PostgreSQL
DATABASE_URL="postgresql://hr_admin:secure_password@localhost:5432/hr_digital_hub"

# Or with default postgres user
DATABASE_URL="postgresql://postgres:password@localhost:5432/hr_digital_hub"

# Or for Neon.tech cloud
DATABASE_URL="postgresql://neondb_owner:password@ep-xxxxx.neon.tech/neondb?sslmode=require"

DEBUG=True
```

### Step 6: Initialize Database

```bash
# Create tables (automatic)
python -c "from app.core.database import init_db; init_db()"

# Or seed with sample data
python scripts/seed_db.py
```

### Step 7: Run Development Server

```bash
# Option 1: Direct Python
python main.py

# Option 2: Using uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Option 3: Specify host and port
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### Step 8: Test the API

Open your browser and visit:
- **API Docs**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`
- **Health Check**: `http://localhost:8000/health`

---

## Option B: Docker Setup (Recommended for Development)

### Step 1: Install Docker

- **Windows**: [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **macOS**: [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: [Docker Engine](https://docs.docker.com/engine/install/)

Verify installation:
```bash
docker --version
docker-compose --version
```

### Step 2: Create Docker Compose File

Create `docker-compose.yml` in the server directory:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: hr_hub_postgres
    environment:
      POSTGRES_USER: hr_admin
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: hr_digital_hub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hr_admin -d hr_digital_hub"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: .
    container_name: hr_hub_api
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: "postgresql://hr_admin:secure_password@postgres:5432/hr_digital_hub"
      DEBUG: "True"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - .:/app
    stdin_open: true
    tty: true

volumes:
  postgres_data:
```

### Step 3: Create Dockerfile

Create `Dockerfile` in the server directory:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Step 4: Update `.env` for Docker

```env
DATABASE_URL="postgresql://hr_admin:secure_password@postgres:5432/hr_digital_hub"
DEBUG=True
```

### Step 5: Run with Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Remove volumes (WARNING: deletes database)
docker-compose down -v
```

### Step 6: Access the Application

- **API Docs**: `http://localhost:8000/api/docs`
- **Database**: `localhost:5432` (host: postgres)

---

## Option C: Neon.tech PostgreSQL Cloud

### Step 1: Create Neon Account

1. Visit [neon.tech](https://neon.tech)
2. Sign up for free account
3. Create a new project

### Step 2: Get Connection String

1. In Neon dashboard, copy the connection string
2. Should look like: `postgresql://user:password@ep-xxxxx.neon.tech/database?sslmode=require`

### Step 3: Update `.env`

```env
DATABASE_URL="postgresql://neondb_owner:password@ep-xxxxx.neon.tech/neondb?sslmode=require"
DEBUG=False
```

### Step 4: Install Dependencies & Run

```bash
pip install -r requirements.txt
python scripts/seed_db.py
python main.py
```

---

## Troubleshooting

### PostgreSQL Connection Error

**Error**: `could not connect to database server`

**Solution**:
```bash
# Windows: Check if PostgreSQL service is running
# Services → Look for PostgreSQL

# macOS: Start PostgreSQL
brew services start postgresql

# Linux: Start PostgreSQL
sudo service postgresql start

# Test connection
psql -U postgres -d hr_digital_hub
```

### Port 5432 Already in Use

```bash
# Find process using port 5432
# Windows
netstat -ano | findstr :5432

# macOS/Linux
lsof -i :5432

# Kill process if needed
# Windows: taskkill /PID <PID> /F
# macOS/Linux: kill -9 <PID>
```

### Port 8000 Already in Use

```bash
# Change port in uvicorn command
uvicorn main:app --port 8001

# Or find and kill process using port 8000
```

### ModuleNotFoundError

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Solution**:
```bash
# Ensure virtual environment is activated
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Reinstall requirements
pip install -r requirements.txt
```

### Database Already Exists Error

```bash
# Drop and recreate database
python -c "from app.core.database import drop_db, init_db; drop_db(); init_db()"

# Or with psql
psql -U postgres -d hr_digital_hub -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### API Won't Start

```bash
# Check if all models are imported correctly
python -c "from app.models import *; print('Models imported successfully')"

# Check if database URL is correct
python -c "from app.core.config import settings; print(settings.DATABASE_URL)"
```

---

## The Complete Workflow

### First Time Setup (10 minutes)

```bash
# 1. Navigate to project
cd server

# 2. Create and activate virtual environment
python -m venv venv
source venv/Scripts/activate  # or: venv\Scripts\activate (Windows)

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup .env file
cp .env.example .env
# Edit .env with your database URL

# 5. Initialize database
python -c "from app.core.database import init_db; init_db()"

# 6. Seed sample data (optional)
python scripts/seed_db.py

# 7. Start server
python main.py

# 8. Visit http://localhost:8000/api/docs
```

### Subsequent Runs

```bash
# 1. Activate virtual environment
source venv/Scripts/activate  # (Windows: venv\Scripts\activate)

# 2. Start server
python main.py

# 3. Access at http://localhost:8000/api/docs
```

---

## Development Tips

### Add Python Packages

```bash
# Add to project
pip install package-name

# Update requirements
pip freeze > requirements.txt
```

### Run Database Migrations

```bash
# Create new migration after model changes
alembic revision --autogenerate -m "Added new field"

# Apply migration
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Debug API Calls

```bash
# Using curl
curl -X GET "http://localhost:8000/api/v1/departments" \
  -H "Content-Type: application/json"

# Using Python requests
python
>>> import requests
>>> response = requests.get("http://localhost:8000/api/v1/departments")
>>> print(response.json())
```

### View Database

```bash
# Connect to PostgreSQL
psql -U postgres -d hr_digital_hub

# List tables
\dt

# Describe table
\d departments

# Run query
SELECT * FROM departments;

# Exit
\q
```

---

## Next Steps

1. **Read the full README.md** for API documentation
2. **Try the interactive API docs** at `http://localhost:8000/api/docs`
3. **Test endpoints** with the Swagger UI
4. **Explore sample data** that was seeded
5. **Review the code structure** in `app/` directory

## Support

For issues:
1. Check troubleshooting section above
2. Review error messages carefully
3. Check PostgreSQL is running
4. Verify `.env` file configuration
5. Ensure all dependencies are installed

Happy coding! 🚀

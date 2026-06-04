"# Rd_HR_Digital_Hub" 

# Application Settings
APP_NAME="Rwanda HR Digital Hub"
APP_VERSION="1.0.0"
DEBUG=False

# Database Configuration
# For Neon.tech PostgreSQL (free cloud)
# Copy your connection string from https://console.neon.tech and paste here
DATABASE_URL="postgresql://neondb_owner:npg_DvJ1G2stwxSd@ep-rapid-morning-am8ncr4h-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

# CORS Settings
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000", "http://localhost:8080", "https://rd-hr-digital-hub.vercel.app"]

# API Settings
API_V1_PREFIX="/api/v1"









---

# Frontend Environment Variables
# Copy this file to .env.local and adjust values as needed

# Backend API URL (default: http://localhost:8000)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Node environment (development, production, test)
NODE_ENV=development

# Optional: Analytics tracking ID
# NEXT_PUBLIC_ANALYTICS_ID=

# Optional: Feature flags
# NEXT_PUBLIC_ENABLE_FORMS=false
# NEXT_PUBLIC_ENABLE_LEAVE_TRACKING=false
# NEXT_PUBLIC_ENABLE_EXIT_FORMS=false
# NEXT_PUBLIC_ENABLE_ANALYTICS=false


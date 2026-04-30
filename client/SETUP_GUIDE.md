# Frontend Setup Guide - Rwanda HR Digital Hub

This guide will help you set up and run the frontend application for the Rwanda HR Digital Hub.

## ✅ Prerequisites

Before starting, ensure you have:

- **Node.js** 18.17+ (LTS recommended)
- **npm** 10+ or **yarn** 4+
- **Git** (for version control)
- **Backend API Server** running (see `/server/SETUP_GUIDE.md`)

Check your versions:
```bash
node --version   # Should be v18.17 or higher
npm --version    # Should be 10.0 or higher
```

## 🚀 Installation Steps

### Step 1: Navigate to Client Directory

```bash
cd client
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Install Radix UI Components

The project uses specific Radix UI packages for dialog, collapsible, and scroll-area components:

```bash
npm install @radix-ui/react-dialog @radix-ui/react-collapsible @radix-ui/react-scroll-area
```

### Step 4: Configure Environment Variables

Create a `.env.local` file in the client directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your backend API URL:

```env
# Backend API URL (adjust port if your server runs on a different port)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Node environment
NODE_ENV=development
```

### Step 5: Verify the Backend is Running

Ensure your backend server is running:

```bash
# From the server directory
cd ../server
python -m uvicorn app.main:create_app --reload --port 8000
```

Or if using Docker:
```bash
docker-compose up -d
```

## 🎯 Running the Application

### Development Mode

```bash
npm run dev
```

The application will start on `http://localhost:3000`

**With Turbopack** (faster builds):
- Already enabled by default: `npm run dev` uses `--turbopack`

**Without Turbopack** (if experiencing issues):
```bash
next dev
```

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

The application will be available at `http://localhost:3000`

## 📚 Available Commands

```bash
# Development server with Turbopack (recommended)
npm run dev

# TypeScript type checking
npm run typecheck

# Run ESLint
npm run lint

# Format code with Prettier
npm run format

# Build for production
npm run build

# Start production server
npm start
```

## 🔍 Verifying Your Setup

After starting the dev server, verify everything is working:

### 1. Check if Frontend is Running

Visit `http://localhost:3000` in your browser. You should see the Rwanda HR Digital Hub homepage.

### 2. Check if API Connection Works

- Navigate to `/org` (Organization Structure page)
- If you see the department tree loading, your API connection is working
- If you see an error, check:
  - Backend server is running
  - `NEXT_PUBLIC_API_URL` is correctly set
  - No CORS errors in browser console

### 3. Verify Components Load

- You should see:
  - Purple-bordered department cards
  - Blue-bordered position cards (filled)
  - Red-bordered position cards (vacant)
  - Expand/collapse chevrons
  - Legend at the bottom

## 🐛 Troubleshooting

### Issue: "Cannot find module" errors

**Solution:**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm install @radix-ui/react-dialog @radix-ui/react-collapsible @radix-ui/react-scroll-area
```

### Issue: "API request failed" or CORS errors

**Check:**
1. Backend is running: `http://localhost:8000/api/docs`
2. Backend CORS is configured correctly
3. `NEXT_PUBLIC_API_URL` in `.env.local` is correct

**Temporary fix for development:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Use a different port
npm run dev -- -p 3001
```

### Issue: Styles not loading or looking broken

**Solution:**
```bash
# Rebuild Tailwind CSS
npm install
npm run dev
```

### Issue: TypeScript errors

**Check:**
```bash
# Run type checking
npm run typecheck

# If errors, check tsconfig.json
# Make sure all imports have correct paths
```

## 📦 Project Structure

```
client/
├── app/
│   ├── layout.tsx          # Root layout with theme
│   ├── page.tsx            # Home page
│   ├── globals.css         # Global Tailwind styles
│   └── org/
│       └── page.tsx        # Organization structure page
├── components/
│   ├── org-tree/           # Main feature components
│   ├── ui/                 # Reusable UI components
│   └── theme-provider.tsx  # Theme switching
├── hooks/
│   └── useOrganization.ts  # Custom hooks
├── lib/
│   ├── api.ts              # API client
│   ├── types.ts            # TypeScript types
│   ├── config.ts           # Configuration
│   └── utils.ts            # Utilities
├── .env.example            # Environment template
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── tailwind.config.mjs     # Tailwind config
└── FRONTEND_README.md      # Detailed documentation
```

## 🔐 Security Notes

1. **Never commit `.env.local`** - it contains sensitive configuration
2. **API URLs**: Use environment variables, never hardcode
3. **CORS**: Ensure backend CORS is properly configured for your domain
4. **Authentication**: To be added in future versions

## 📝 Development Tips

### Hot Module Replacement (HMR)

Next.js automatically reloads your browser when you make changes. Just save your file!

### Type Checking While Coding

```bash
# Run type checker in watch mode (requires separate terminal)
npm run typecheck -- --watch
```

### Debugging

1. **Browser DevTools**: F12 or Cmd+Option+I
2. **Network Tab**: Check API calls to backend
3. **Console Tab**: See error messages
4. **React DevTools**: Install React DevTools browser extension

### Code Formatting

Automatically format on save:
```bash
npm run format
```

Or configure your editor:
- **VS Code**: Install Prettier extension, enable "Format on Save"
- **WebStorm**: File → Settings → Languages & Frameworks → JavaScript → Prettier

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect Vercel to your GitHub repo
3. Set `NEXT_PUBLIC_API_URL` in Vercel environment variables
4. Deploy

### Docker

Create a `Dockerfile` in the client directory:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install
RUN npm install @radix-ui/react-dialog @radix-ui/react-collapsible @radix-ui/react-scroll-area

# Build application
COPY . .
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD [\"npm\", \"start\"]
```

Build and run:
```bash
docker build -t hr-digital-hub-frontend .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://api:8000 hr-digital-hub-frontend
```

## 📞 Support & Resources

- **Frontend Documentation**: See `FRONTEND_README.md`
- **Backend Documentation**: See `../server/README.md`
- **API Documentation**: Visit `http://localhost:8000/api/docs` (when backend is running)
- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com/docs

## ✨ Next Steps

After successful setup:

1. Explore the organization structure at `/org`
2. Read `FRONTEND_README.md` for detailed component documentation
3. Check out `lib/api.ts` for API integration examples
4. Review `hooks/useOrganization.ts` for custom hooks
5. Customize styling in `tailwind.config.mjs`

---

**Created**: April 2026  
**Last Updated**: April 2026  
**Status**: Production Ready

# Rwanda HR Digital Hub - Frontend

A modern, production-ready frontend for the Rwanda HR Digital Hub system. Built with Next.js, TypeScript, Tailwind CSS, and React, this system provides a comprehensive organizational hierarchy visualization and management interface.

## 📋 Overview

This frontend provides:

1. **Organizational Hierarchy Tree** - Interactive tree view of departments and positions
2. **Department Management** - View and navigate department structures
3. **Position Management** - Display positions with hierarchy and vacancy tracking
4. **Employee Assignment** - Show assigned employees and vacant positions
5. **Responsive Design** - Mobile-friendly interface with Tailwind CSS
6. **Dark Mode Support** - Theme switching capability

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend server running on `http://localhost:8000`

### Installation

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Update .env.local with your backend URL (optional)
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development

```bash
# Start development server with Turbopack
npm run dev

# Access at http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🏗️ Project Structure

```
client/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout with theme provider
│   ├── page.tsx             # Home page
│   └── org/
│       └── page.tsx         # Organization structure page
├── components/
│   ├── org-tree/            # Organizational tree components
│   │   ├── DepartmentTree.tsx
│   │   ├── DepartmentNode.tsx
│   │   ├── PositionTree.tsx
│   │   ├── PositionNode.tsx
│   │   └── types.ts
│   ├── ui/                  # Reusable UI components
│   │   ├── button.tsx
│   │   ├── drawer.tsx
│   │   ├── collapsible.tsx
│   │   └── scroll-area.tsx
│   └── theme-provider.tsx   # Dark mode provider
├── hooks/
│   └── useOrganization.ts   # Custom React hooks
├── lib/
│   ├── api.ts               # API client
│   ├── types.ts             # TypeScript types
│   ├── config.ts            # Configuration
│   └── utils.ts             # Utility functions
├── public/                  # Static assets
├── components.json          # shadcn config
├── tsconfig.json            # TypeScript config
├── tailwind.config.mjs       # Tailwind config
├── package.json
└── README.md                # This file
```

## 🔌 API Integration

### Base URL Configuration

Set the backend URL in your environment:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Available API Endpoints

#### Departments

- `GET /api/v1/departments` - List all departments
- `GET /api/v1/departments/{id}` - Get department by ID
- `GET /api/v1/departments/root/list` - Get root departments
- `GET /api/v1/departments/{id}/hierarchy` - Get department hierarchy

#### Positions

- `GET /api/v1/positions` - List all positions
- `GET /api/v1/positions/{id}` - Get position by ID
- `GET /api/v1/positions/tree/hierarchy` - Get position tree
- `GET /api/v1/positions/{id}/is-vacant` - Check vacancy status
- `GET /api/v1/positions/{id}/subordinates` - Get subordinate positions

#### Employees

- `GET /api/v1/employees` - List all employees
- `GET /api/v1/employees/{id}` - Get employee by ID

## 📦 Components

### DepartmentTree

Main component for rendering the department hierarchy.

```tsx
import DepartmentTree from "@/components/org-tree/DepartmentTree";

export default function Page() {
  return <DepartmentTree />;
}
```

Props:
- `rootDepartments?: Department[]` - Optional pre-fetched departments

### DepartmentNode

Individual department node component with expand/collapse.

Props:
- `department: Department` - Department data
- `level?: number` - Nesting level for indentation

### PositionNode

Individual position node with employee information.

Props:
- `node: PositionTreeNode` - Position data with hierarchy
- `level?: number` - Nesting level for indentation

Features:
- Blue box for filled positions
- Red box for vacant positions
- Expandable child positions
- Click to view details in drawer

### PositionTree

Container component for multiple positions.

Props:
- `positions: PositionTreeNode[]` - Array of position nodes
- `level?: number` - Base nesting level

## 🎨 Styling & Design

### Color Scheme

- **Filled Positions**: Blue (`border-blue-400`, `bg-blue-50`)
- **Vacant Positions**: Red (`border-red-400`, `bg-red-50`)
- **Departments**: Purple (`border-purple-400`, `bg-purple-50`)

### Responsive Design

- Mobile-first approach using Tailwind CSS
- Responsive grid layouts
- Touch-friendly interactions
- Scrollable tree view on small screens

### Dark Mode

Theme switching is built-in via `ThemeProvider`:

```tsx
import { ThemeProvider } from "@/components/theme-provider";

// Automatically included in root layout
```

## 🪝 Custom Hooks

### useExpandedNodes()

Manage expanded nodes in tree:

```tsx
const { expandedNodes, toggleNode, isExpanded } = useExpandedNodes();
```

### useRootDepartments()

Fetch root departments:

```tsx
const { departments, loading, error } = useRootDepartments();
```

### useOrganizationTree()

Fetch organization tree:

```tsx
const { tree, loading, error } = useOrganizationTree(departmentId);
```

### useDepartmentHierarchy()

Fetch department hierarchy:

```tsx
const { hierarchy, loading, error, refetch } = useDepartmentHierarchy(departmentId);
```

## 🔍 API Client

### departmentAPI

```tsx
import { apiClient } from "@/lib/api";

// Get all departments
const departments = await apiClient.department.getAll();

// Get root departments
const roots = await apiClient.department.getRootDepartments();

// Get department hierarchy
const hierarchy = await apiClient.department.getHierarchy(id);
```

### positionAPI

```tsx
// Get organization tree
const tree = await apiClient.position.getOrganizationTree(departmentId);

// Check vacancy
const isVacant = await apiClient.position.checkVacancy(positionId);

// Get subordinates
const subs = await apiClient.position.getSubordinates(positionId);
```

### employeeAPI

```tsx
// Get all employees
const employees = await apiClient.employee.getAll();

// Get by ID
const employee = await apiClient.employee.getById(id);
```

## 📱 User Interface

### Organization Structure Page

Accessible at `/org` - displays the full organizational hierarchy with:

- Search functionality (future)
- Export to PDF (future)
- Print support (future)
- Filter by department (future)

### Position Details Drawer

Click any position to view:
- Position title and level
- Band/salary grade
- Assigned employee (if filled)
- Vacancy status
- Position description

### Department Details

Click any department to:
- Expand/collapse
- View child departments
- View positions in department
- Navigate hierarchy

## 🧪 Testing

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## 📚 TypeScript Types

All types are defined in `lib/types.ts`:

- `Employee` - Employee data
- `EmployeeSimple` - Employee summary
- `Position` - Position data
- `PositionTreeNode` - Position with hierarchy
- `Department` - Department data
- `DepartmentWithHierarchy` - Department with children
- `UUID` - UUID string type
- `EmployeeStatus` - Employee status enum
- `PositionLevel` - Position level enum

## 🔧 Configuration

### Environment Variables

Create `.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: Node environment
NODE_ENV=development
```

### Feature Flags

Modify `lib/config.ts`:

```tsx
export const FEATURES = {
  ORGANIZATION_STRUCTURE: true,
  FORMS: false,          // Coming soon
  LEAVE_TRACKING: false, // Coming soon
  EXIT_FORMS: false,     // Coming soon
  ANALYTICS: false,      // Coming soon
};
```

## 🚧 Future Features

- [ ] Form management interface
- [ ] Annual leave tracking
- [ ] Exit form management
- [ ] Analytics dashboards
- [ ] Real-time notifications
- [ ] Advanced search and filtering
- [ ] Bulk employee imports
- [ ] PDF exports and printing
- [ ] Organization chart templates

## 📖 Development Guidelines

### Component Structure

```tsx
"use client"; // Mark as client component if needed

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MyComponentProps {
  // Props here
}

export default function MyComponent(props: MyComponentProps) {
  // Implementation
  return (
    <div>Content</div>
  );
}
```

### API Calls

Always use the API client:

```tsx
import { apiClient } from "@/lib/api";

const data = await apiClient.department.getAll();
```

### Styling

Use Tailwind CSS classes:

```tsx
<div className={cn(
  "px-4 py-2 rounded",
  isActive && "bg-blue-500"
)}>
  Content
</div>
```

## 🤝 Contributing

1. Create a feature branch
2. Make changes following the structure above
3. Test thoroughly
4. Create a pull request

## 📄 License

Proprietary software for NCBA Rwanda

## 📞 Support

For backend API documentation, see `/server/README.md`

---

**Last Updated**: April 2026  
**Version**: 1.0.0  
**Status**: Production Ready

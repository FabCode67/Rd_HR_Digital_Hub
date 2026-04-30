# API Integration Guide - Rwanda HR Digital Hub

This guide explains how the frontend integrates with the backend API and provides examples for common operations.

## 🔌 API Configuration

### Base Configuration

The API is configured in `lib/api.ts` with the following structure:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1";
```

Set your backend URL in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📡 API Client Architecture

The API client is organized into three main sections:

### 1. Department API (`apiClient.department`)

Handles department-related operations.

#### Get All Departments

```typescript
import { apiClient } from "@/lib/api";

const departments = await apiClient.department.getAll(skip = 0, limit = 100);
```

Response:
```typescript
[
  {
    id: "uuid",
    name: "Executive Risk Management",
    description: "...",
    parent_id: null,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  // ... more departments
]
```

#### Get Root Departments (No Parent)

```typescript
const rootDepartments = await apiClient.department.getRootDepartments();
```

#### Get Department by ID

```typescript
const department = await apiClient.department.getById(departmentId);
```

#### Get Department Hierarchy

Get a department with all its children and positions:

```typescript
const hierarchy = await apiClient.department.getHierarchy(departmentId);

// Response structure:
{
  id: "uuid",
  name: "Department Name",
  description: "...",
  children: [
    // Child departments
  ],
  positions: [
    // Positions in this department
  ]
}
```

### 2. Position API (`apiClient.position`)

Handles position-related operations.

#### Get All Positions

```typescript
const positions = await apiClient.position.getAll(
  departmentId = undefined,
  skip = 0,
  limit = 100
);
```

#### Get Organization Tree

Get hierarchical position structure:

```typescript
const tree = await apiClient.position.getOrganizationTree(departmentId = undefined);

// Response is PositionTreeNode[] with recursive children
```

#### Get Position by ID

```typescript
const position = await apiClient.position.getById(positionId);
```

#### Get Subordinate Positions

Get all positions that report to a specific position:

```typescript
const subordinates = await apiClient.position.getSubordinates(positionId);
```

#### Check Position Vacancy

```typescript
const isVacant = await apiClient.position.checkVacancy(positionId);
// Returns: boolean
```

### 3. Employee API (`apiClient.employee`)

Handles employee-related operations.

#### Get All Employees

```typescript
const employees = await apiClient.employee.getAll(skip = 0, limit = 100);
```

#### Get Employee by ID

```typescript
const employee = await apiClient.employee.getById(employeeId);
```

#### Get Employees by Status

```typescript
const activeEmployees = await apiClient.employee.getByStatus(
  "ACTIVE",
  skip = 0,
  limit = 100
);
```

Possible status values:
- `ACTIVE` - Currently employed
- `INACTIVE` - Not currently active
- `SUSPENDED` - Temporarily suspended
- `TERMINATED` - Employment ended

## 🎣 Using Custom Hooks

Custom hooks in `hooks/useOrganization.ts` provide React integration with automatic loading states.

### useRootDepartments()

Fetch root departments with loading and error states:

```typescript
import { useRootDepartments } from "@/hooks/useOrganization";

export function MyComponent() {
  const { departments, loading, error } = useRootDepartments();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {departments.map(dept => (
        <li key={dept.id}>{dept.name}</li>
      ))}
    </ul>
  );
}
```

### useOrganizationTree()

Fetch position hierarchy:

```typescript
import { useOrganizationTree } from "@/hooks/useOrganization";

export function OrgChart({ departmentId }: { departmentId: string }) {
  const { tree, loading, error } = useOrganizationTree(departmentId);

  if (loading) return <div>Loading tree...</div>;

  return (
    // Render tree nodes
  );
}
```

### useDepartmentHierarchy()

Fetch specific department hierarchy with refetch capability:

```typescript
import { useDepartmentHierarchy } from "@/hooks/useOrganization";

export function DepartmentDetail({ id }: { id: string }) {
  const { hierarchy, loading, error, refetch } = useDepartmentHierarchy(id);

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {/* Render hierarchy */}
    </div>
  );
}
```

### usePositionVacancy()

Check if a position is vacant:

```typescript
import { usePositionVacancy } from "@/hooks/useOrganization";

export function VacancyBadge({ positionId }: { positionId: string }) {
  const { isVacant, loading } = usePositionVacancy(positionId);

  if (loading) return <span>Checking...</span>;
  return <span>{isVacant ? "VACANT" : "FILLED"}</span>;
}
```

## 🏗️ Complete Example: Organizational Structure Component

```typescript
"use client";

import React from "react";
import { useRootDepartments } from "@/hooks/useOrganization";
import DepartmentTree from "@/components/org-tree/DepartmentTree";

export function OrganizationPage() {
  const { departments, loading, error } = useRootDepartments();

  return (
    <div className="space-y-4">
      <h1>Organization Structure</h1>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {departments && departments.length > 0 && (
        <DepartmentTree rootDepartments={departments} />
      )}
    </div>
  );
}
```

## 📋 Data Models

### Department

```typescript
interface Department {
  id: UUID;
  name: string;
  description?: string;
  parent_id?: UUID;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Position

```typescript
interface Position {
  id: UUID;
  title: string;
  description?: string;
  department_id: UUID;
  parent_position_id?: UUID;
  level: PositionLevel; // "Director" | "Head" | "Manager" | "Officer" | "Trainee" | "Intern"
  band?: string; // e.g., "Band 4"
  is_active: boolean;
  is_vacant: boolean;
  created_at: string;
  updated_at: string;
}
```

### PositionTreeNode (with hierarchy)

```typescript
interface PositionTreeNode extends Position {
  children: PositionTreeNode[];
  employee?: EmployeeSimple;
}
```

### Employee

```typescript
interface Employee {
  id: UUID;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  national_id?: string;
  status: EmployeeStatus; // "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED"
  created_at: string;
  updated_at: string;
}
```

## 🔄 Error Handling

All API calls throw errors that can be caught:

```typescript
try {
  const departments = await apiClient.department.getAll();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("Failed to fetch:", message);
}
```

Common error scenarios:

- **404 Not Found**: Resource doesn't exist
- **400 Bad Request**: Invalid parameters
- **500 Server Error**: Backend issue
- **Network Error**: Backend not reachable

## 🔐 CORS Configuration

Ensure your backend CORS is configured correctly. In `server/app/core/config.py`:

```python
CORS_ORIGINS = ["http://localhost:3000", "http://localhost:3001"]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]
```

## 📊 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/departments` | List all departments |
| GET | `/api/v1/departments/root/list` | Get root departments |
| GET | `/api/v1/departments/{id}` | Get department by ID |
| GET | `/api/v1/departments/{id}/hierarchy` | Get department hierarchy |
| GET | `/api/v1/positions` | List all positions |
| GET | `/api/v1/positions/tree/hierarchy` | Get position tree |
| GET | `/api/v1/positions/{id}` | Get position by ID |
| GET | `/api/v1/positions/{id}/is-vacant` | Check vacancy |
| GET | `/api/v1/positions/{id}/subordinates` | Get subordinates |
| GET | `/api/v1/employees` | List employees |
| GET | `/api/v1/employees/{id}` | Get employee by ID |

## 🔜 Future API Integration

These features are planned but not yet integrated:

- Form submission endpoints
- Leave tracking APIs
- Exit form endpoints
- Analytics APIs
- User authentication

## 🧪 Testing API Calls

Use the interactive API documentation at `http://localhost:8000/api/docs` when your backend is running.

## 🛠️ Extending the API Client

To add new API methods, edit `lib/api.ts`:

```typescript
export const apiClient = {
  // ... existing APIs

  newFeature: {
    async getAll() {
      return fetchAPI<DataType>(`${API_PREFIX}/new-feature`);
    },

    async getById(id: string) {
      return fetchAPI<DataType>(`${API_PREFIX}/new-feature/${id}`);
    },
  },
};
```

---

**Version**: 1.0.0  
**Last Updated**: April 2026  
**Status**: Production Ready

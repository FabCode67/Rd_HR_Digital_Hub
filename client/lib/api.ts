/**
 * API client for HR Digital Hub backend
 * Handles all communication with the server APIs
 */

import {
  Department,
  DepartmentCreateInput,
  DepartmentHierarchyNode,
  DepartmentUpdateInput,
  Employee,
  EmployeeCreateInput,
  EmployeePosition,
  EmployeePositionAssignment,
  EmployeePositionDetail,
  EmployeeUpdateInput,
  Position,
  PositionCreateInput,
  PositionUpdateInput,
  PositionTreeNode,
} from "./types";

// API Configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1";

const ENDPOINTS = {
  // Department endpoints
  DEPARTMENTS: `${API_PREFIX}/departments`,
  ROOT_DEPARTMENTS: `${API_PREFIX}/departments/root/list`,
  DEPARTMENT_HIERARCHY: (id: string) =>
    `${API_PREFIX}/departments/${id}/hierarchy`,

  // Position endpoints
  POSITIONS: `${API_PREFIX}/positions`,
  POSITION_TREE: `${API_PREFIX}/positions/tree/hierarchy`,
  POSITION_SUBORDINATES: (id: string) =>
    `${API_PREFIX}/positions/${id}/subordinates`,
  POSITION_VACANCY: (id: string) =>
    `${API_PREFIX}/positions/${id}/is-vacant`,

  // Employee endpoints
  EMPLOYEES: `${API_PREFIX}/employees`,
  EMPLOYEE_BY_ID: (id: string) => `${API_PREFIX}/employees/${id}`,
};

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const fullUrl = `${API_BASE_URL}${url}`;

  try {
    const response = await fetch(fullUrl, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.detail || `API Error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`API Error [${url}]:`, error);
    throw error;
  }
}

/**
 * Department API Methods
 */
export const departmentAPI = {
  /**
   * Get all departments
   */
  async getAll(skip = 0, limit = 100): Promise<Department[]> {
    return fetchAPI<Department[]>(
      `${ENDPOINTS.DEPARTMENTS}?skip=${skip}&limit=${limit}`
    );
  },

  /**
   * Get root departments only (no parent)
   */
  async getRootDepartments(): Promise<Department[]> {
    return fetchAPI<Department[]>(ENDPOINTS.ROOT_DEPARTMENTS);
  },

  /**
   * Create a department
   */
  async create(payload: DepartmentCreateInput): Promise<Department> {
    return fetchAPI<Department>(ENDPOINTS.DEPARTMENTS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get specific department by ID
   */
  async getById(id: string): Promise<Department> {
    return fetchAPI<Department>(`${ENDPOINTS.DEPARTMENTS}/${id}`);
  },

  /**
   * Update a department
   */
  async update(id: string, payload: DepartmentUpdateInput): Promise<Department> {
    return fetchAPI<Department>(`${ENDPOINTS.DEPARTMENTS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Soft delete a department
   */
  async delete(id: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`${ENDPOINTS.DEPARTMENTS}/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Get department hierarchy (tree structure)
   */
  async getHierarchy(id: string): Promise<any> {
    return fetchAPI<any>(ENDPOINTS.DEPARTMENT_HIERARCHY(id));
  },
};

/**
 * Position API Methods
 */
export const positionAPI = {
  /**
   * Get all positions with optional department filter
   */
  async getAll(
    departmentId?: string,
    skip = 0,
    limit = 100
  ): Promise<Position[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    if (departmentId) {
      params.append("department_id", departmentId);
    }
    return fetchAPI<Position[]>(`${ENDPOINTS.POSITIONS}?${params}`);
  },

  /**
   * Get organization tree hierarchy
   */
  async getOrganizationTree(
    departmentId?: string
  ): Promise<DepartmentHierarchyNode[]> {
    const params = new URLSearchParams();
    if (departmentId) {
      params.append("department_id", departmentId);
    }
    return fetchAPI<DepartmentHierarchyNode[]>(
      `${ENDPOINTS.POSITION_TREE}?${params}`
    );
  },

  /**
   * Get specific position by ID
   */
  async getById(id: string): Promise<Position> {
    return fetchAPI<Position>(`${ENDPOINTS.POSITIONS}/${id}`);
  },

  /**
   * Create a position
   */
  async create(payload: PositionCreateInput): Promise<Position> {
    return fetchAPI<Position>(ENDPOINTS.POSITIONS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update a position
   */
  async update(id: string, payload: PositionUpdateInput): Promise<Position> {
    return fetchAPI<Position>(`${ENDPOINTS.POSITIONS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Soft delete a position
   */
  async delete(id: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`${ENDPOINTS.POSITIONS}/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Get subordinate positions
   */
  async getSubordinates(positionId: string): Promise<Position[]> {
    return fetchAPI<Position[]>(
      ENDPOINTS.POSITION_SUBORDINATES(positionId)
    );
  },

  /**
   * Check if position is vacant
   */
  async checkVacancy(positionId: string): Promise<boolean> {
    const result = await fetchAPI<{ position_id: string; is_vacant: boolean }>(
      ENDPOINTS.POSITION_VACANCY(positionId)
    );
    return result.is_vacant;
  },
};

/**
 * Employee API Methods
 */
export const employeeAPI = {
  /**
   * Get all employees
   */
  async getAll(skip = 0, limit = 100): Promise<Employee[]> {
    return fetchAPI<Employee[]>(
      `${ENDPOINTS.EMPLOYEES}?skip=${skip}&limit=${limit}`
    );
  },

  /**
   * Get specific employee by ID
   */
  async getById(id: string): Promise<Employee> {
    return fetchAPI<Employee>(ENDPOINTS.EMPLOYEE_BY_ID(id));
  },

  /**
   * Create an employee
   */
  async create(payload: EmployeeCreateInput): Promise<Employee> {
    return fetchAPI<Employee>(ENDPOINTS.EMPLOYEES, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update an employee
   */
  async update(id: string, payload: EmployeeUpdateInput): Promise<Employee> {
    return fetchAPI<Employee>(`${ENDPOINTS.EMPLOYEES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete an employee
   */
  async delete(id: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`${ENDPOINTS.EMPLOYEES}/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Get employees by status
   */
  async getByStatus(
    status: string,
    skip = 0,
    limit = 100
  ): Promise<Employee[]> {
    return fetchAPI<Employee[]>(
      `${ENDPOINTS.EMPLOYEES}?status=${status}&skip=${skip}&limit=${limit}`
    );
  },

  /**
   * Assign employee to a position
   */
  async assignPosition(
    employeeId: string,
    payload: EmployeePositionAssignment
  ): Promise<EmployeePosition> {
    return fetchAPI<EmployeePosition>(`${ENDPOINTS.EMPLOYEES}/${employeeId}/assign-position`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Reassign employee to a new position
   */
  async reassignPosition(
    employeeId: string,
    payload: EmployeePositionAssignment
  ): Promise<EmployeePosition> {
    return fetchAPI<EmployeePosition>(
      `${ENDPOINTS.EMPLOYEES}/${employeeId}/reassign-position`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Get current position assignment
   */
  async getCurrentPosition(employeeId: string): Promise<EmployeePositionDetail> {
    return fetchAPI<EmployeePositionDetail>(
      `${ENDPOINTS.EMPLOYEES}/${employeeId}/current-position`
    );
  },

  /**
   * Get position history
   */
  async getPositionHistory(employeeId: string): Promise<EmployeePositionDetail[]> {
    return fetchAPI<EmployeePositionDetail[]>(
      `${ENDPOINTS.EMPLOYEES}/${employeeId}/position-history`
    );
  },

  /**
   * Unassign employee from position
   */
  async unassignPosition(
    employeePositionId: string,
    endDate?: string
  ): Promise<{ message: string }> {
    const params = new URLSearchParams();
    if (endDate) {
      params.append("end_date", endDate);
    }
    return fetchAPI<{ message: string }>(
      `${ENDPOINTS.EMPLOYEES}/${employeePositionId}/unassign?${params}`,
      {
        method: "PUT",
      }
    );
  },
};

/**
 * Combined API client
 */
export const apiClient = {
  department: departmentAPI,
  position: positionAPI,
  employee: employeeAPI,
};

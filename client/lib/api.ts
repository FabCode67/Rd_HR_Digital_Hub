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
  Form,
  FormAnswerInput,
  FormCreate,
  FormUpdate,
  FormFieldCreate,
  FormStatus,
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

  // Auth endpoints
  AUTH_ME: `${API_PREFIX}/auth/me`,

  // Form endpoints
  FORMS: `${API_PREFIX}/forms`,
  MY_FORMS: `${API_PREFIX}/forms/me`,
  FORM_BY_ID: (id: string) => `${API_PREFIX}/forms/${id}`,
  FORM_RESPONSE_ME: (id: string) => `${API_PREFIX}/forms/${id}/responses/me`,
  FORM_ASSIGN: (formId: string, employeeId: string) =>
    `${API_PREFIX}/forms/${formId}/assign/${employeeId}`,
  FORM_UNASSIGN: (formId: string, employeeId: string) =>
    `${API_PREFIX}/forms/${formId}/assign/${employeeId}`,
  FORM_ASSIGNED_STAFF: (formId: string) =>
    `${API_PREFIX}/forms/${formId}/assigned-staff`,
  EMPLOYEE_ASSIGNED_FORMS: (employeeId: string) =>
    `${API_PREFIX}/forms/${employeeId}/assigned-forms`,
  FORM_FIELDS: (formId: string) => `${API_PREFIX}/forms/${formId}/fields`,
  FORM_FIELD_DELETE: (fieldId: string) => `${API_PREFIX}/forms/fields/${fieldId}`,
};

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const fullUrl = `${API_BASE_URL}${url}`;

  // Get token from localStorage for authentication
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json");

  // Add authorization header if token exists
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(fullUrl, {
      headers,
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = error?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : detail
            ? JSON.stringify(detail)
            : `API Error: ${response.status} ${response.statusText}`;
      throw new Error(
        message
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
 * Form API Methods
 */
export const formAPI = {
  async getMyRequiredForms(): Promise<FormStatus[]> {
    return fetchAPI<FormStatus[]>(ENDPOINTS.MY_FORMS);
  },

  async getById(id: string): Promise<Form> {
    return fetchAPI<Form>(ENDPOINTS.FORM_BY_ID(id));
  },

  async submitMyForm(formId: string, answers: FormAnswerInput[]): Promise<any> {
    return fetchAPI<any>(ENDPOINTS.FORM_RESPONSE_ME(formId), {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },

  async getAllForms(): Promise<Form[]> {
    return fetchAPI<Form[]>(ENDPOINTS.FORMS);
  },

  async createForm(form: FormCreate): Promise<Form> {
    return fetchAPI<Form>(ENDPOINTS.FORMS, {
      method: "POST",
      body: JSON.stringify(form),
    });
  },

  async updateForm(formId: string, form: FormUpdate): Promise<Form> {
    return fetchAPI<Form>(ENDPOINTS.FORM_BY_ID(formId), {
      method: "PUT",
      body: JSON.stringify(form),
    });
  },

  async deleteForm(formId: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(ENDPOINTS.FORM_BY_ID(formId), {
      method: "DELETE",
    });
  },

  async addFormField(formId: string, field: FormFieldCreate): Promise<any> {
    return fetchAPI<any>(ENDPOINTS.FORM_FIELDS(formId), {
      method: "POST",
      body: JSON.stringify(field),
    });
  },

  async deleteFormField(fieldId: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(ENDPOINTS.FORM_FIELD_DELETE(fieldId), {
      method: "DELETE",
    });
  },

  async assignFormToEmployee(formId: string, employeeId: string): Promise<any> {
    return fetchAPI<any>(ENDPOINTS.FORM_ASSIGN(formId, employeeId), {
      method: "POST",
    });
  },

  async unassignFormFromEmployee(formId: string, employeeId: string): Promise<any> {
    return fetchAPI<any>(ENDPOINTS.FORM_UNASSIGN(formId, employeeId), {
      method: "DELETE",
    });
  },

  async getStaffAssignedToForm(formId: string): Promise<any[]> {
    return fetchAPI<any[]>(ENDPOINTS.FORM_ASSIGNED_STAFF(formId));
  },

  async getFormResponses(formId: string): Promise<any[]> {
    return fetchAPI<any[]>(`${API_PREFIX}/forms/${formId}/responses`);
  },

  async getFormsAssignedToEmployee(employeeId: string): Promise<any[]> {
    return fetchAPI<any[]>(ENDPOINTS.EMPLOYEE_ASSIGNED_FORMS(employeeId));
  },
};

/**
 * Combined API client
 */
export const apiClient = {
  department: departmentAPI,
  position: positionAPI,
  employee: employeeAPI,
  form: formAPI,
};

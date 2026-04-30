/**
 * TypeScript types for HR Digital Hub organizational structure
 */

export type UUID = string;

export type EmployeeStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "TERMINATED";

export type PositionLevel =
  | "Director"
  | "Head"
  | "Manager"
  | "Senior Manager"
  | "Assistant Manager"
  | "Officer"
  | "Graduate Trainee"
  | "Intern";

/**
 * Employee information for display in organizational structure
 */
export interface Employee {
  id: UUID;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  national_id?: string;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Simple employee representation (used in nested responses)
 */
export interface EmployeeSimple {
  id: UUID;
  full_name: string;
  email: string;
}

/**
 * Position in organizational hierarchy
 */
export interface Position {
  id: UUID;
  title: string;
  description?: string;
  department_id: UUID;
  parent_position_id?: UUID;
  level: PositionLevel;
  band?: string;
  is_active: boolean;
  is_vacant: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Position tree node with hierarchical structure
 */
export interface PositionTreeNode extends Position {
  children: PositionTreeNode[];
  employee?: EmployeeSimple;
}

/**
 * Department in organizational hierarchy
 */
export interface Department {
  id: UUID;
  name: string;
  description?: string;
  parent_id?: UUID;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentCreateInput {
  name: string;
  description?: string;
  parent_id?: UUID | null;
  is_active?: boolean;
}

export interface DepartmentUpdateInput {
  name?: string;
  description?: string;
  parent_id?: UUID | null;
  is_active?: boolean;
}

export interface PositionCreateInput {
  title: string;
  description?: string;
  department_id: UUID;
  parent_position_id?: UUID | null;
  level: PositionLevel;
  band?: string;
  is_active?: boolean;
}

export interface PositionUpdateInput {
  title?: string;
  description?: string;
  department_id?: UUID;
  parent_position_id?: UUID | null;
  level?: PositionLevel;
  band?: string;
  is_active?: boolean;
}

export interface EmployeeCreateInput {
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  national_id?: string;
  status?: EmployeeStatus;
}

export interface EmployeeUpdateInput {
  full_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  national_id?: string;
  status?: EmployeeStatus;
}

export interface EmployeePositionAssignment {
  employee_id: UUID;
  position_id: UUID;
  start_date: string;
}

export interface EmployeePosition {
  id: UUID;
  employee_id: UUID;
  position_id: UUID;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeePositionDetail extends EmployeePosition {
  employee: EmployeeSimple;
  position: Position;
}

/**
 * Department with nested structure
 */
export interface DepartmentWithHierarchy extends Department {
  children?: Department[];
  positions?: PositionTreeNode[];
}

/**
 * Combined organizational structure response
 */
export interface OrganizationNode {
  type: "department" | "position";
  id: UUID;
  name: string;
  title?: string;
  level?: PositionLevel;
  is_vacant?: boolean;
  employee?: EmployeeSimple;
  children?: OrganizationNode[];
  metadata?: {
    department_id?: UUID;
    parent_id?: UUID;
    band?: string;
    description?: string;
  };
}

/**
 * Selected node details for drawer display
 */
export interface SelectedNodeDetails {
  id: UUID;
  type: "department" | "position";
  name?: string;
  title?: string;
  level?: PositionLevel;
  band?: string;
  is_vacant?: boolean;
  is_active?: boolean;
  description?: string;
  employee?: EmployeeSimple;
  department_id?: UUID;
  parent_id?: UUID;
  created_at?: string;
  updated_at?: string;
}

/**
 * Organizational hierarchy fetched data
 */
export interface HierarchyData {
  departments: Department[];
  positions: PositionTreeNode[];
  errors?: string[];
}

import { PositionTreeNode, DepartmentWithHierarchy } from "@/lib/types";

export interface OrgTreeNode {
  id: string;
  type: "department" | "position";
  name?: string;
  title?: string;
  level?: string;
  is_vacant?: boolean;
  employee?: any;
  children?: OrgTreeNode[];
  metadata?: Record<string, any>;
}

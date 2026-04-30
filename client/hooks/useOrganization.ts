/**
 * Custom React hooks for organizational structure management
 */

import { useState, useCallback, useEffect } from "react";
import { Department, PositionTreeNode } from "@/lib/types";
import { apiClient } from "@/lib/api";

/**
 * Hook to manage expanded nodes in the tree
 */
export function useExpandedNodes() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const isExpanded = useCallback((nodeId: string) => expandedNodes.has(nodeId), [expandedNodes]);

  return { expandedNodes, toggleNode, isExpanded };
}

/**
 * Hook to manage selected node details
 */
export function useSelectedNode() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  return { selectedNodeId, selectNode };
}

/**
 * Hook to fetch root departments
 */
export function useRootDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.department.getRootDepartments();
        if (mounted) {
          setDepartments(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load departments");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return { departments, loading, error };
}

/**
 * Hook to fetch organizational tree
 */
export function useOrganizationTree(departmentId?: string) {
  const [tree, setTree] = useState<PositionTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.position.getOrganizationTree(departmentId);
        if (mounted) {
          setTree(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load organization tree");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [departmentId]);

  return { tree, loading, error };
}

/**
 * Hook to fetch department hierarchy
 */
export function useDepartmentHierarchy(departmentId: string) {
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHierarchy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.department.getHierarchy(departmentId);
      setHierarchy(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hierarchy");
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  return { hierarchy, loading, error, refetch: fetchHierarchy };
}

/**
 * Hook to check position vacancy
 */
export function usePositionVacancy(positionId: string) {
  const [isVacant, setIsVacant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function check() {
      setLoading(true);
      setError(null);
      try {
        const vacant = await apiClient.position.checkVacancy(positionId);
        if (mounted) {
          setIsVacant(vacant);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to check vacancy");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    check();

    return () => {
      mounted = false;
    };
  }, [positionId]);

  return { isVacant, loading, error };
}

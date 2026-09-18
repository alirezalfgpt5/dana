// src/hooks/useTree.ts
// هوک مدیریت درختواره‌ها - با کش و به‌روزرسانی خودکار

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/apiClient';

interface TreeNode {
  id: number;
  treeId: number;
  parentId: number | null;
  level: string;
  title: string;
  description: string | null;
  templateIds: string | null;
  levelId: number | null;
  sortOrder: number;
  isGap: number;
  gapStatus: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  children?: TreeNode[];
}

interface KnowledgeTree {
  id: number;
  name: string;
  type: 'required' | 'produced' | 'research';
  description: string | null;
  periodId: number | null;
  baseId: number | null;
  unitId: number | null;
  isActive: number;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface TreeWithNodes extends KnowledgeTree {
  nodes: TreeNode[];
  gaps?: any[];
  research?: any[];
}

export function useTree() {
  const [tree, setTree] = useState<TreeWithNodes | null>(null);
  const [trees, setTrees] = useState<KnowledgeTree[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // دریافت لیست قالب‌ها (برای سیستم مسائل)
  // ============================================

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await apiClient('/api/metadata/templates');
      setTemplates(Array.isArray(data) ? data : []);
      return data;
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      return [];
    }
  }, []);

  // ============================================
  // دریافت لیست درختواره‌ها
  // ============================================

  const fetchTrees = useCallback(async (filters?: {
    type?: string;
    periodId?: number;
    baseId?: number;
    unitId?: number;
    isActive?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.periodId) params.append('periodId', String(filters.periodId));
      if (filters?.baseId) params.append('baseId', String(filters.baseId));
      if (filters?.unitId) params.append('unitId', String(filters.unitId));
      if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));

      const url = `/api/trees${params.toString() ? '?' + params.toString() : ''}`;
      const data = await apiClient(url);
      setTrees(Array.isArray(data) ? data : []);
      return data;
    } catch (err: any) {
      setError(err.message || 'خطا در دریافت درختواره‌ها');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // دریافت یک درختواره با تمام گره‌ها
  // ============================================

  const fetchTree = useCallback(async (treeId: number) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient(`/api/trees/${treeId}`);
      
      // console.log('Raw tree data from server:', data);
      // console.log('tree keys:', Object.keys(data));
      // console.log('tree.baseId:', data.baseId);
      // console.log('tree.periodId:', data.periodId);
      // console.log('tree.unitId:', data.unitId);
      
      // بررسی ساختار داده
      if (data.tree) {
        console.log('Data has tree property:', data.tree);
        setTree(data);
        setNodes(data.nodes || []);
        return data;
      } else if (data.id) {
        // console.log('Data is direct tree object');
        setTree(data);
        setNodes(data.nodes || []);
        return data;
      } else {
        console.error('Unexpected data structure:', data);
        setTree(null);
        setNodes([]);
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'خطا در دریافت درختواره');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // ایجاد درختواره جدید
  // ============================================

  const createTree = useCallback(async (data: {
    name: string;
    type: 'required' | 'produced' | 'research';
    description?: string;
    periodId?: number;
    baseId?: number;
    unitId?: number;
    metadata?: any;
  }) => {
    setLoading(true);

    try {
      const result = await apiClient('/api/trees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      toast.success('درختواره با موفقیت ایجاد شد');
      await fetchTrees();
      return result;
    } catch (err: any) {
      toast.error(err.message || 'خطا در ایجاد درختواره');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTrees]);

  // ============================================
  // ویرایش درختواره
  // ============================================

  const updateTree = useCallback(async (treeId: number, data: {
    name?: string;
    description?: string;
    periodId?: number | null;
    baseId?: number | null;
    unitId?: number | null;
    isActive?: number;
    metadata?: any;
  }) => {
    setLoading(true);

    try {
      const result = await apiClient(`/api/trees/${treeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      toast.success('درختواره با موفقیت ویرایش شد');
      await fetchTree(treeId);
      await fetchTrees();
      return result;
    } catch (err: any) {
      toast.error(err.message || 'خطا در ویرایش درختواره');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTree, fetchTrees]);

  // ============================================
  // حذف درختواره
  // ============================================

  const deleteTree = useCallback(async (treeId: number) => {
    setLoading(true);
    try {
      await apiClient(`/api/trees/${treeId}`, {
        method: 'DELETE',
      });
      toast.success('درختواره با موفقیت حذف شد');
      if (tree?.id === treeId) {
        setTree(null);
        setNodes([]);
      }
      await fetchTrees();
      return true;
    } catch (err: any) {
      if (!err._toastShown) {
        toast.error(err.message || 'خطا در حذف درختواره');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [tree, fetchTrees]);

  // ============================================
  // کپی درختواره
  // ============================================

  const copyTree = useCallback(async (treeId: number, newName?: string, newType?: string) => {
    setLoading(true);

    try {
      const result = await apiClient(`/api/trees/${treeId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName, newType }),
      });

      toast.success('درختواره با موفقیت کپی شد');
      await fetchTrees();
      return result;
    } catch (err: any) {
      toast.error(err.message || 'خطا در کپی درختواره');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTrees]);

  // ============================================
  // مدیریت گره‌ها
  // ============================================

  const addNode = useCallback(async (treeId: number, data: {
    parentId?: number | null;
    level: string;
    title: string;
    description?: string;
    templateIds?: string;
    instanceIds?: string;
    levelId?: number | null;
    metadata?: any;
  }) => {
    setLoading(true);

    try {
      const result = await apiClient(`/api/trees/${treeId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      toast.success('گره با موفقیت افزوده شد');
      await fetchTree(treeId);
      return result;
    } catch (err: any) {
      toast.error(err.message || 'خطا در افزودن گره');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTree]);

  const updateNode = useCallback(async (nodeId: number, data: {
    title?: string;
    description?: string;
    templateIds?: string;
    instanceIds?: string;
    levelId?: number | null;
    sortOrder?: number;
    metadata?: any;
  }) => {
    setLoading(true);

    try {
      const result = await apiClient(`/api/trees/nodes/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      toast.success('گره با موفقیت ویرایش شد');
      if (tree) {
        await fetchTree(tree.id);
      }
      return result;
    } catch (err: any) {
      toast.error(err.message || 'خطا در ویرایش گره');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tree, fetchTree]);

  const deleteNode = useCallback(async (nodeId: number) => {
    console.log('--- ATTEMPTING TO DELETE NODE ---', nodeId);
    setLoading(true);

    try {
      // استفاده از apiClient به جای fetch مستقیم
      const result = await apiClient(`/api/trees/nodes/${nodeId}`, {
        method: 'DELETE',
      });

      console.log('Delete response:', result);
      toast.success('گره با موفقیت حذف شد');
      
      if (tree) {
        await fetchTree(tree.id);
      }
      return true;
    } catch (err: any) {
      console.error('Delete node error:', err);
      // خطا قبلاً در apiClient نمایش داده شده
      return false;
    } finally {
      setLoading(false);
    }
  }, [tree, fetchTree]);

  // ============================================
  // دریافت مسیر یک گره تا ریشه
  // ============================================

  const getNodePath = useCallback(async (nodeId: number) => {
    try {
      const data = await apiClient(`/api/trees/nodes/${nodeId}/path`);
      return data.path || [];
    } catch (err: any) {
      toast.error(err.message || 'خطا در دریافت مسیر گره');
      return [];
    }
  }, []);

  // ============================================
  // ساخت ساختار درختی از گره‌ها
  // ============================================

  const buildTreeStructure = useCallback((nodes: TreeNode[]): TreeNode[] => {
    const nodeMap = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];

    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    nodes.forEach(node => {
      const currentNode = nodeMap.get(node.id);
      if (!currentNode) return;

      if (node.parentId && nodeMap.has(node.parentId)) {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(currentNode);
        }
      } else {
        roots.push(currentNode);
      }
    });

    return roots;
  }, []);

  // ============================================
  // خروجی اکسل درختواره
  // ============================================

  const exportTree = useCallback(async (treeId: number) => {
    try {
      const response = await(window.customFetch || window.fetch)(`/api/outputs/tree/${treeId}/excel`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'خطا در خروجی اکسل');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `درختواره_${treeId}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match) {
          filename = decodeURIComponent(match[1].replace(/['"]/g, ''));
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('فایل اکسل با موفقیت دانلود شد');
    } catch (err: any) {
      toast.error(err.message || 'خطا در دانلود فایل اکسل');
    }
  }, []);

  return {
    tree,
    trees,
    templates,
    nodes,
    loading,
    error,
    fetchTrees,
    fetchTree,
    fetchTemplates,
    createTree,
    updateTree,
    deleteTree,
    copyTree,
    addNode,
    updateNode,
    deleteNode,
    getNodePath,
    buildTreeStructure,
    exportTree,
  };
}

export default useTree;
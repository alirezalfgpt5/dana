// src/hooks/useOutputs.ts
// هوک مدیریت خروجی‌ها

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/apiClient';

interface GraphData {
  tree: {
    id: number;
    name: string;
    type: string;
  };
  nodes: Array<{
    id: number;
    title: string;
    level: string;
    parentId: number | null;
    isGap: boolean;
    gapStatus: string | null;
    hasResearch: boolean;
    templateIds: string[];
    sortOrder: number;
  }>;
  links: Array<{
    source: number;
    target: number;
  }>;
  stats: {
    totalNodes: number;
    leaves: number;
    gaps: number;
    researchItems: number;
    byLevel: Record<string, number>;
  };
}

interface ExportOptions {
  includeTemplates?: boolean;
  includeLevels?: boolean;
  includeMetadata?: boolean;
  periodId?: string;
  fromDate?: string;
  toDate?: string;
}

export function useOutputs() {
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // دریافت داده‌های گراف
  // ============================================

  const getGraphData = useCallback(async (treeId: number) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient(`/api/outputs/tree/${treeId}/graph`);
      setGraphData(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'خطا در دریافت داده‌های گراف');
      toast.error(err.message || 'خطا در دریافت داده‌های گراف');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // خروجی اکسل درختواره
  // ============================================

  const exportTreeExcel = useCallback(async (treeId: number) => {
    setLoading(true);

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
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // خروجی اکسل شکاف‌ها
  // ============================================

  const exportGapsExcel = useCallback(async (treeId: number, options?: ExportOptions) => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (options?.includeTemplates) params.append('includeTemplates', 'true');
      if (options?.includeLevels) params.append('includeLevels', 'true');
      if (options?.includeMetadata) params.append('includeMetadata', 'true');
      if (options?.periodId) params.append('periodId', options.periodId);
      if (options?.fromDate) params.append('fromDate', options.fromDate);
      if (options?.toDate) params.append('toDate', options.toDate);

      const url = `/api/outputs/gaps/${treeId}/excel${params.toString() ? '?' + params.toString() : ''}`;
      const response = await(window.customFetch || window.fetch)(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'خطا در خروجی اکسل');
      }

      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = `شکاف‌ها_${treeId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlBlob);

      toast.success('فایل اکسل با موفقیت دانلود شد');
    } catch (err: any) {
      toast.error(err.message || 'خطا در دانلود فایل اکسل');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // خروجی اکسل پژوهشی
  // ============================================

  const exportResearchExcel = useCallback(async (treeId: number, options?: ExportOptions) => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (options?.includeTemplates) params.append('includeTemplates', 'true');
      if (options?.includeLevels) params.append('includeLevels', 'true');
      if (options?.includeMetadata) params.append('includeMetadata', 'true');
      if (options?.periodId) params.append('periodId', options.periodId);
      if (options?.fromDate) params.append('fromDate', options.fromDate);
      if (options?.toDate) params.append('toDate', options.toDate);

      const url = `/api/outputs/research/${treeId}/excel${params.toString() ? '?' + params.toString() : ''}`;
      const response = await(window.customFetch || window.fetch)(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'خطا در خروجی اکسل');
      }

      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = `پژوهش_${treeId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlBlob);

      toast.success('فایل اکسل با موفقیت دانلود شد');
    } catch (err: any) {
      toast.error(err.message || 'خطا در دانلود فایل اکسل');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // خروجی اکسل مسائل
  // ============================================

  const exportIssuesExcel = useCallback(async (options?: ExportOptions) => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (options?.includeTemplates) params.append('includeTemplates', 'true');
      if (options?.includeLevels) params.append('includeLevels', 'true');
      if (options?.includeMetadata) params.append('includeMetadata', 'true');
      if (options?.periodId) params.append('periodId', options.periodId);
      if (options?.fromDate) params.append('fromDate', options.fromDate);
      if (options?.toDate) params.append('toDate', options.toDate);

      const url = `/api/outputs/issues/excel${params.toString() ? '?' + params.toString() : ''}`;
      const response = await(window.customFetch || window.fetch)(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'خطا در خروجی اکسل');
      }

      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = `مسائل.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlBlob);

      toast.success('فایل اکسل با موفقیت دانلود شد');
    } catch (err: any) {
      toast.error(err.message || 'خطا در دانلود فایل اکسل');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // خروجی گزارش کامل
  // ============================================

  const exportFullReport = useCallback(async (treeId: number, options?: ExportOptions) => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('treeId', String(treeId));
      if (options?.includeTemplates) params.append('includeTemplates', 'true');
      if (options?.includeLevels) params.append('includeLevels', 'true');
      if (options?.includeMetadata) params.append('includeMetadata', 'true');
      if (options?.periodId) params.append('periodId', options.periodId);
      if (options?.fromDate) params.append('fromDate', options.fromDate);
      if (options?.toDate) params.append('toDate', options.toDate);

      const url = `/api/outputs/full-report${params.toString() ? '?' + params.toString() : ''}`;
      const response = await(window.customFetch || window.fetch)(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'خطا در خروجی گزارش کامل');
      }

      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = `گزارش_کامل_${treeId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlBlob);

      toast.success('گزارش کامل با موفقیت دانلود شد');
    } catch (err: any) {
      toast.error(err.message || 'خطا در دانلود گزارش کامل');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // تابع یکپارچه خروجی اکسل
  // ============================================

  const exportExcel = useCallback(async (
    type: 'tree' | 'gaps' | 'research' | 'issues' | 'full-report',
    treeId: number,
    options?: ExportOptions
  ) => {
    switch (type) {
      case 'tree':
        return exportTreeExcel(treeId);
      case 'gaps':
        return exportGapsExcel(treeId, options);
      case 'research':
        return exportResearchExcel(treeId, options);
      case 'issues':
        return exportIssuesExcel(options);
      case 'full-report':
        return exportFullReport(treeId, options);
      default:
        throw new Error('نوع خروجی نامعتبر است');
    }
  }, [exportTreeExcel, exportGapsExcel, exportResearchExcel, exportIssuesExcel, exportFullReport]);

  return {
    loading,
    graphData,
    error,
    getGraphData,
    exportTreeExcel,
    exportGapsExcel,
    exportResearchExcel,
    exportIssuesExcel,
    exportFullReport,
    exportExcel,
  };
}

export default useOutputs;
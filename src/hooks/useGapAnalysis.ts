// src/hooks/useGapAnalysis.ts
// هوک تحلیل شکاف دانشی

import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/apiClient';

interface Gap {
  id: number;
  requiredNodeId: number;
  producedNodeId: number | null;
  status: 'open' | 'filled' | 'partially_filled';
  gapType: string | null;
  priority: string | null;
  matchScore?: number;
  importance?: string;
  timeFrame?: string;
  description: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  requiredNode?: any;
  producedNode?: any;
  hasResearch?: boolean;
  researchItemId?: number | null;
  researchItem?: any;
  issue?: any;
}

export interface GapFilters {
  treeId?: number;
  periodId?: number | string;
  status?: string;
  gapType?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
  advancedFilter?: string;
  baseId?: number | string;
  unitId?: number | string;
  mode?: string;
}

interface GapAnalysisReport {
  requiredTree: string;
  producedTree: string;
  totalLeaves: number;
  filledGaps: number;
  openGaps: number;
  partialGaps: number;
  coveragePercent: number;
  createdAt: string;
  gaps: Gap[];
  // فیلدهای ارتقاء یافته موتور تحلیل نسخه ۲
  weightedCoveragePercent?: number;
  avgMatchScore?: number;
  byLevel?: Record<string, { total: number; filled: number; partial: number; open: number; coveragePercent: number }>;
  byGapType?: Record<string, number>;
  worstNodes?: Array<{ title: string; level: string; status: string; matchScore: number }>;
  methodologyFa?: string[];
  summaryFa?: string;
}

interface PaginatedResponse {
  data: Gap[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useGapAnalysis() {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [selectedGap, setSelectedGap] = useState<Gap | null>(null);
  const [report, setReport] = useState<GapAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  const lastFiltersRef = useRef<GapFilters>({});

  // ============================================
  // دریافت لیست گپ‌ها با فیلتر
  // ============================================

  const fetchGaps = useCallback(async (filters?: GapFilters) => {
    setLoading(true);

    try {
      const hasFilterKeys = filters && Object.keys(filters).some(
        k => k !== 'page' && k !== 'limit'
      );

      const effectiveFilters: GapFilters = hasFilterKeys
        ? (filters || {})
        : { ...lastFiltersRef.current, ...filters };

      lastFiltersRef.current = effectiveFilters;

      const params = new URLSearchParams();
      if (effectiveFilters.treeId) params.append('treeId', String(effectiveFilters.treeId));
      if (effectiveFilters.periodId !== undefined && effectiveFilters.periodId !== 'all') params.append('periodId', String(effectiveFilters.periodId));
      if (effectiveFilters.status) params.append('status', effectiveFilters.status);
      if (effectiveFilters.gapType) params.append('gapType', effectiveFilters.gapType);
      if (effectiveFilters.priority) params.append('priority', effectiveFilters.priority);
      if (effectiveFilters.search) params.append('search', effectiveFilters.search);
      if (effectiveFilters.page) params.append('page', String(effectiveFilters.page));
      if (effectiveFilters.limit) params.append('limit', String(effectiveFilters.limit));
      if (effectiveFilters.advancedFilter) params.append('advancedFilter', effectiveFilters.advancedFilter);
      if (effectiveFilters.baseId) params.append('baseId', String(effectiveFilters.baseId));
      if (effectiveFilters.unitId) params.append('unitId', String(effectiveFilters.unitId));
      if (effectiveFilters.mode) params.append('mode', effectiveFilters.mode);

      const url = `/api/gaps${params.toString() ? '?' + params.toString() : ''}`;
      const response: PaginatedResponse = await apiClient(url);
      
      setGaps(response.data || []);
      setPagination(response.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 });
      return response;
    } catch (err: any) {
      if (!err._toastShown) {
        toast.error(err.message || 'خطا در دریافت لیست گپ‌ها', { id: 'gaps-fetch-error' });
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // دریافت یک گپ با جزئیات کامل
  // ============================================

  const fetchGap = useCallback(async (gapId: number) => {
    setLoading(true);

    try {
      const data = await apiClient(`/api/gaps/${gapId}`);
      setSelectedGap(data);
      return data;
    } catch (err: any) {
      toast.error(err.message || 'خطا در دریافت اطلاعات گپ');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // اجرای تحلیل شکاف
  // ============================================

  const analyzeGaps = useCallback(async (requiredTreeId: number, producedTreeId: number, options?: {
    defaultPriority?: string;
  }) => {
    setLoading(true);

    try {
      const data = await apiClient('/api/gaps/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requiredTreeId,
          producedTreeId,
          options: options || {},
        }),
      });

      setReport(data.report);
      setGaps(data.gaps || []);
      const summary = data.report?.summaryFa || `${data.gaps?.length || 0} گپ شناسایی شد`;
      toast.success(`تحلیل شکاف انجام شد: ${summary.slice(0, 80)}${summary.length > 80 ? '…' : ''}`, { duration: 5000 });
      return data;
    } catch (err: any) {
      toast.error(err.message || 'خطا در اجرای تحلیل شکاف');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // 🟢 بازنگری دستی کاربر روی گپ (گپ نیست / گپ است / اصلاح وضعیت)
  // ============================================

  const reviewGap = useCallback(async (gapId: number, verdict: 'confirmed_gap' | 'not_gap' | 'adjusted', newStatus?: string, note?: string) => {
    setLoading(true);
    try {
      const data = await apiClient(`/api/gaps/${gapId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict, newStatus, note }),
      });
      toast.success(data.message || 'نظر شما ثبت شد');
      await fetchGaps({ ...lastFiltersRef.current, page: pagination.page, limit: pagination.limit });
      return data;
    } catch (err: any) {
      toast.error(err.message || 'خطا در ثبت نظر');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchGaps, pagination]);

  // ============================================
  // پر کردن گپ
  // ============================================

  const fillGap = useCallback(async (gapId: number, producedNodeId: number, statusChoice: 'filled' | 'partially_filled' = 'filled', description?: string) => {
    setLoading(true);

    try {
      const data = await apiClient(`/api/gaps/${gapId}/fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producedNodeId,
          status: statusChoice,
          description: description || '',
        }),
      });

      toast.success(statusChoice === 'partially_filled' ? 'گپ با تطابق جزئی ثبت شد' : 'گپ با موفقیت پر شد');
      await fetchGaps({ ...lastFiltersRef.current, page: pagination.page, limit: pagination.limit });
      return data;
    } catch (err: any) {
      toast.error(err.message || 'خطا در پر کردن گپ');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchGaps, pagination]);

  // ============================================
  // حذف گپ
  // ============================================

  const deleteGap = useCallback(async (gapId: number) => {
    if (!confirm('آیا از حذف این گپ اطمینان دارید؟')) {
      return false;
    }

    setLoading(true);

    try {
      await apiClient(`/api/gaps/${gapId}`, {
        method: 'DELETE',
      });

      toast.success('گپ با موفقیت حذف شد');
      await fetchGaps({ ...lastFiltersRef.current, page: pagination.page, limit: pagination.limit });
      return true;
    } catch (err: any) {
      toast.error(err.message || 'خطا در حذف گپ');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchGaps, pagination]);

  // ============================================
  // دریافت آمار گپ‌ها
  // ============================================

  const getGapStats = useCallback((gapsList: Gap[]) => {
    const total = gapsList.length;
    const open = gapsList.filter(g => g.status === 'open').length;
    const filled = gapsList.filter(g => g.status === 'filled').length;
    const partial = gapsList.filter(g => g.status === 'partially_filled').length;

    const byPriority = gapsList.reduce((acc: any, gap) => {
      const priority = gap.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    const byType = gapsList.reduce((acc: any, gap) => {
      const type = gap.gapType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      open,
      filled,
      partial,
      completionPercent: total > 0 ? Math.round((filled / total) * 100) : 0,
      byPriority,
      byType,
    };
  }, []);

  return {
    gaps,
    selectedGap,
    report,
    loading,
    pagination,
    fetchGaps,
    fetchGap,
    analyzeGaps,
    reviewGap,
    fillGap,
    deleteGap,
    getGapStats,
  };
}

export default useGapAnalysis;
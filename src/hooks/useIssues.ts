// src/hooks/useIssues.ts
// هوک مدیریت نظام مسائل با آمار تجمیعی سرور، کنترل دسترسی و آپلود تفکیکی

import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/apiClient';

export interface Issue {
  id: number;
  researchItemId: number | null;
  domain: string;
  title: string;
  solutionDirection: string | null;
  responsibleUnit: string | null;
  confidentialityLevel: string | null;
  actionPriority: string | null;
  approvalDate: string | null;
  knowledgeType: string | null;
  projectLevel: string | null;
  approvalAuthority: string | null;
  researchProjectType: string | null;
  knowledgeProjectType: string | null;
  events: string | null;
  macroProject: any;
  scientificDiplomacy: string | null;
  collaborators: string | null;
  collaborationNetwork: any;
  referenceDocument: string | null;
  requiredBudget: number;
  approvedBudget: number;
  assignedBudget: number;
  expectedMonths: number;
  completionPercent: number;
  periodId?: number | null;
  actionsTaken: string | null;
  bottlenecks: string | null;
  orders: string | null;
  issueResolutionTeam: any;
  needStatement: any;
  contract: any;
  executiveContract?: any;
  stage20: any;
  stage50: any;
  stage100: any;
  application: any;
  status: 'pending' | 'in_progress' | 'completed' | 'canceled' | 'on_hold';
  category?: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  templates?: any[];
  attachments?: any[];
  attachmentsCount?: number;
  history?: any[];
  researchItem?: any;
  node?: any;
  period?: any;
}

export interface IssueFilters {
  periodId?: number | string;
  domain?: string;
  status?: string;
  priority?: string;
  projectLevel?: string;
  timeFrame?: string;
  knowledgeType?: string;
  category?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  advancedFilter?: string;
  baseId?: number | string;
  unitId?: number | string;
  mode?: string;
  treeId?: number | string;
}

export interface IssueStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  canceled: number;
  onHold: number;
  byPriority: Record<string, number>;
  totalBudget: number;
  totalRequiredBudget: number;
  totalApprovedBudget: number;
  totalAssignedBudget: number;
  avgCompletion: number;
}

interface PaginatedResponse {
  data: Issue[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const defaultStats: IssueStats = {
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  canceled: 0,
  onHold: 0,
  byPriority: {},
  totalBudget: 0,
  totalRequiredBudget: 0,
  totalApprovedBudget: 0,
  totalAssignedBudget: 0,
  avgCompletion: 0,
};

export function useIssues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<IssueStats>(defaultStats);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  const lastFiltersRef = useRef<IssueFilters>({});

  // ============================================
  // دریافت آمار تجمیعی واقعی برای کل نتایج فیلتر جاری (حل اولویت ۱۰)
  // ============================================
  const fetchStats = useCallback(async (filters?: IssueFilters) => {
    try {
      const params = new URLSearchParams();
      const eff = filters || lastFiltersRef.current || {};
      if (eff.periodId !== undefined && eff.periodId !== 'all') params.append('periodId', String(eff.periodId));
      if (eff.treeId) params.append('treeId', String(eff.treeId));
      if (eff.domain) params.append('domain', eff.domain);
      if (eff.status && eff.status !== 'all') params.append('status', eff.status);
      if (eff.priority && eff.priority !== 'all') params.append('priority', eff.priority);
      if (eff.category && eff.category !== 'all') params.append('category', eff.category);
      if (eff.search) params.append('search', eff.search);
      if (eff.fromDate) params.append('fromDate', eff.fromDate);
      if (eff.toDate) params.append('toDate', eff.toDate);
      if (eff.baseId) params.append('baseId', String(eff.baseId));
      if (eff.unitId) params.append('unitId', String(eff.unitId));
      if (eff.mode) params.append('mode', eff.mode);

      const url = `/api/issues/stats${params.toString() ? '?' + params.toString() : ''}`;
      const data: IssueStats = await apiClient(url);
      if (data && typeof data.total === 'number') {
        setStats(data);
      }
      return data;
    } catch (e) {
      console.warn('Could not fetch aggregate issue stats:', e);
      return null;
    }
  }, []);

  // ============================================
  // دریافت لیست مسائل با فیلتر و همگام‌سازی آمار کل
  // ============================================
  const fetchIssues = useCallback(async (filters?: IssueFilters) => {
    setLoading(true);

    try {
      const hasFilterKeys = filters && Object.keys(filters).some(
        k => k !== 'page' && k !== 'limit'
      );

      const effectiveFilters: IssueFilters = hasFilterKeys
        ? (filters || {})
        : { ...lastFiltersRef.current, ...filters };

      lastFiltersRef.current = effectiveFilters;

      const params = new URLSearchParams();
      if (effectiveFilters.periodId !== undefined && effectiveFilters.periodId !== 'all') {
        params.append('periodId', String(effectiveFilters.periodId));
      }
      if (effectiveFilters.domain) params.append('domain', effectiveFilters.domain);
      if (effectiveFilters.status && effectiveFilters.status !== 'all') params.append('status', effectiveFilters.status);
      if (effectiveFilters.priority && effectiveFilters.priority !== 'all') params.append('priority', effectiveFilters.priority);
      if (effectiveFilters.projectLevel && effectiveFilters.projectLevel !== 'all') params.append('projectLevel', effectiveFilters.projectLevel);
      if (effectiveFilters.timeFrame) params.append('timeFrame', effectiveFilters.timeFrame);
      if (effectiveFilters.knowledgeType && effectiveFilters.knowledgeType !== 'all') params.append('knowledgeType', effectiveFilters.knowledgeType);
      if (effectiveFilters.category && effectiveFilters.category !== 'all') params.append('category', effectiveFilters.category);
      if (effectiveFilters.search) params.append('search', effectiveFilters.search);
      if (effectiveFilters.fromDate) params.append('fromDate', effectiveFilters.fromDate);
      if (effectiveFilters.toDate) params.append('toDate', effectiveFilters.toDate);
      if (effectiveFilters.page) params.append('page', String(effectiveFilters.page));
      if (effectiveFilters.limit) params.append('limit', String(effectiveFilters.limit));
      if (effectiveFilters.advancedFilter) params.append('advancedFilter', effectiveFilters.advancedFilter);
      if (effectiveFilters.baseId) params.append('baseId', String(effectiveFilters.baseId));
      if (effectiveFilters.unitId) params.append('unitId', String(effectiveFilters.unitId));
      if (effectiveFilters.mode) params.append('mode', effectiveFilters.mode);
      if (effectiveFilters.treeId) params.append('treeId', String(effectiveFilters.treeId));

      const url = `/api/issues${params.toString() ? '?' + params.toString() : ''}`;
      const [response]: [PaginatedResponse, any] = await Promise.all([
        apiClient(url),
        fetchStats(effectiveFilters),
      ]);

      setIssues(response.data || []);
      setPagination(response.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 });
      return response;
    } catch (err: any) {
      if (!err._toastShown) {
        toast.error(err.message || 'خطا در دریافت لیست مسائل', { id: 'issues-fetch-error' });
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  // ============================================
  // دریافت یک مسئله با تمام جزئیات
  // ============================================
  const fetchIssue = useCallback(async (issueId: number) => {
    setLoading(true);

    try {
      const data = await apiClient(`/api/issues/${issueId}`);
      setSelectedIssue(data);
      return data;
    } catch (err: any) {
      toast.error(err.message || 'خطا در دریافت اطلاعات مسئله');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // ایجاد مسئله جدید
  // ============================================
  const createIssue = useCallback(async (data: Partial<Issue>) => {
    setLoading(true);

    try {
      const result = await apiClient('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      await fetchIssues({ ...lastFiltersRef.current, page: pagination.page, limit: pagination.limit });
      return result;
    } catch (err: any) {
      toast.error(err.message || 'خطا در ایجاد مسئله');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchIssues, pagination]);

  // ============================================
  // ویرایش مسئله
  // ============================================
  const updateIssue = useCallback(async (issueId: number, data: Partial<Issue>) => {
    setLoading(true);

    try {
      const result = await apiClient(`/api/issues/${issueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      await fetchIssues({ ...lastFiltersRef.current, page: pagination.page, limit: pagination.limit });
      if (selectedIssue?.id === issueId) {
        await fetchIssue(issueId);
      }
      return result;
    } catch (err: any) {
      toast.error(err.message || 'خطا در ویرایش مسئله');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchIssues, fetchIssue, selectedIssue, pagination]);

  // ============================================
  // تغییر وضعیت مسئله
  // ============================================
  const changeStatus = useCallback(async (issueId: number, status: string, note?: string) => {
    setLoading(true);

    try {
      const result = await apiClient(`/api/issues/${issueId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });

      await fetchIssues({ ...lastFiltersRef.current, page: pagination.page, limit: pagination.limit });
      if (selectedIssue?.id === issueId) {
        await fetchIssue(issueId);
      }
      return result;
    } catch (err: any) {
      toast.error(err.message || 'خطا در تغییر وضعیت مسئله');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchIssues, fetchIssue, selectedIssue, pagination]);

  // ============================================
  // حذف مسئله با برگرداندن وضعیت مشخص (حل اولویت ۱۴)
  // ============================================
  const deleteIssue = useCallback(async (issueId: number): Promise<boolean> => {
    setLoading(true);

    try {
      await apiClient(`/api/issues/${issueId}`, {
        method: 'DELETE',
      });

      await fetchIssues({ ...lastFiltersRef.current, page: pagination.page, limit: pagination.limit });
      if (selectedIssue?.id === issueId) {
        setSelectedIssue(null);
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'خطا در حذف مسئله');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchIssues, selectedIssue, pagination]);

  // ============================================
  // آپلود فایل پیوست با برچسب فیلد (حل اولویت ۵)
  // ============================================
  const uploadAttachment = useCallback(async (issueId: number, file: File, fieldTag?: string) => {
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (fieldTag) {
        formData.append('field', fieldTag);
      }

      const result = await apiClient(`/api/issues/${issueId}/attachment`, {
        method: 'POST',
        body: formData,
        headers: {},
      });

      if (selectedIssue?.id === issueId) {
        await fetchIssue(issueId);
      }
      return result;
    } catch (err: any) {
      console.error('Attachment upload failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchIssue, selectedIssue]);

  // ============================================
  // حذف فایل پیوست
  // ============================================
  const deleteAttachment = useCallback(async (issueId: number, attachmentId: number) => {
    if (!confirm('آیا از حذف این فایل اطمینان دارید؟')) {
      return false;
    }

    setLoading(true);

    try {
      await apiClient(`/api/issues/${issueId}/attachment/${attachmentId}`, {
        method: 'DELETE',
      });

      toast.success('فایل با موفقیت حذف شد');
      if (selectedIssue?.id === issueId) {
        await fetchIssue(issueId);
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'خطا در حذف فایل');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchIssue, selectedIssue]);

  // ============================================
  // دریافت تاریخچه
  // ============================================
  const getHistory = useCallback(async (issueId: number) => {
    try {
      return await apiClient(`/api/issues/${issueId}/history`);
    } catch (err: any) {
      toast.error(err.message || 'خطا در دریافت تاریخچه');
      return [];
    }
  }, []);

  // محاسبه آمار محلی روی یک لیست (پشتیبان)
  const getIssueStats = useCallback((issuesList: Issue[]) => {
    const total = issuesList.length;
    const pending = issuesList.filter(i => i.status === 'pending').length;
    const inProgress = issuesList.filter(i => i.status === 'in_progress').length;
    const completed = issuesList.filter(i => i.status === 'completed').length;
    const canceled = issuesList.filter(i => i.status === 'canceled').length;
    const onHold = issuesList.filter(i => i.status === 'on_hold').length;

    const byPriority = issuesList.reduce((acc: any, issue) => {
      const priority = issue.actionPriority || 'متوسط';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    const totalRequiredBudget = issuesList.reduce((sum, issue) => sum + (Number(issue.requiredBudget) || 0), 0);
    const totalApprovedBudget = issuesList.reduce((sum, issue) => sum + (Number(issue.approvedBudget) || 0), 0);
    const totalAssignedBudget = issuesList.reduce((sum, issue) => sum + (Number(issue.assignedBudget) || 0), 0);
    const avgCompletion = total > 0 ? Math.round(issuesList.reduce((sum, issue) => sum + (Number(issue.completionPercent) || 0), 0) / total) : 0;

    return {
      total,
      pending,
      inProgress,
      completed,
      canceled,
      onHold,
      byPriority,
      totalBudget: totalRequiredBudget,
      totalRequiredBudget,
      totalApprovedBudget,
      totalAssignedBudget,
      avgCompletion,
    };
  }, []);

  // ============================================
  // انتقال و فریز مسائل بین دوره‌های زمانی (Period Rollover)
  // ============================================
  const carryOverIssues = useCallback(async (sourcePeriodId: number, targetPeriodId: number, mode = 'open_only', issueIds?: number[], responsibleUnit?: string) => {
    setLoading(true);
    try {
      const result: any = await apiClient('/api/issues/carry-over', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePeriodId, targetPeriodId, mode, issueIds, responsibleUnit }),
      });
      toast.success(result.message || 'مسائل با موفقیت به دوره جدید انتقال یافتند');
      await fetchIssues({ page: 1, limit: pagination.limit, periodId: targetPeriodId });
      return result;
    } catch (err: any) {
      toast.error(err.message || 'خطا در انتقال مسائل به دوره جدید');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchIssues, pagination.limit]);

  // ============================================
  // بارگذاری گروهی مسائل از فایل
  // ============================================
  const batchImportIssues = useCallback(async (targetPeriodId: number, issuesList: any[], updateExisting = true, responsibleUnit?: string) => {
    setLoading(true);
    try {
      const result: any = await apiClient('/api/issues/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPeriodId, issuesList, updateExisting, responsibleUnit }),
      });
      toast.success(result.message || 'مسائل با موفقیت بارگذاری شدند');
      await fetchIssues({ page: 1, limit: pagination.limit, periodId: targetPeriodId });
      return result;
    } catch (err: any) {
      toast.error(err.message || 'خطا در بارگذاری مسائل');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchIssues, pagination.limit]);

  return {
    issues,
    selectedIssue,
    loading,
    stats,
    pagination,
    fetchIssues,
    fetchStats,
    fetchIssue,
    createIssue,
    updateIssue,
    changeStatus,
    deleteIssue,
    uploadAttachment,
    deleteAttachment,
    getHistory,
    getIssueStats,
    carryOverIssues,
    batchImportIssues,
  };
}

export default useIssues;

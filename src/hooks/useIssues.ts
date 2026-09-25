// src/hooks/useIssues.ts
// هوک مدیریت نظام مسائل - با فیلترهای پیشرفته

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/apiClient';

interface Issue {
  id: number;
  researchItemId: number;
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
  metadata: any;
  createdAt: string;
  updatedAt: string;
  templates?: any[];
  attachments?: any[];
  history?: any[];
  researchItem?: any;
  node?: any;
}

interface IssueFilters {
  periodId?: number | string;
  domain?: string;
  status?: string;
  priority?: string;
  projectLevel?: string;
  timeFrame?: string;
  knowledgeType?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  advancedFilter?: string;
  baseId?: number | string;
  unitId?: number | string;
  mode?: string;
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

export function useIssues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // ============================================
  // دریافت لیست مسائل با فیلتر
  // ============================================

  const fetchIssues = useCallback(async (filters?: IssueFilters) => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (filters?.periodId !== undefined && filters.periodId !== 'all') {
        params.append('periodId', String(filters.periodId));
      }
      if (filters?.domain) params.append('domain', filters.domain);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.projectLevel) params.append('projectLevel', filters.projectLevel);
      if (filters?.timeFrame) params.append('timeFrame', filters.timeFrame);
      if (filters?.knowledgeType) params.append('knowledgeType', filters.knowledgeType);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.fromDate) params.append('fromDate', filters.fromDate);
      if (filters?.toDate) params.append('toDate', filters.toDate);
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.advancedFilter) params.append('advancedFilter', filters.advancedFilter);
      if (filters?.baseId) params.append('baseId', String(filters.baseId));
      if (filters?.unitId) params.append('unitId', String(filters.unitId));
      if (filters?.mode) params.append('mode', filters.mode);

      const url = `/api/issues${params.toString() ? '?' + params.toString() : ''}`;
      const response: PaginatedResponse = await apiClient(url);
      
      setIssues(response.data || []);
      setPagination(response.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 });
      return response;
    } catch (err: any) {
      toast.error(err.message || 'خطا در دریافت لیست مسائل');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

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

      toast.success('مسئله با موفقیت ایجاد شد');
      await fetchIssues({ page: pagination.page, limit: pagination.limit });
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

      toast.success('مسئله با موفقیت ویرایش شد');
      await fetchIssues({ page: pagination.page, limit: pagination.limit });
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

      toast.success(`وضعیت مسئله با موفقیت به "${status}" تغییر یافت`);
      await fetchIssues({ page: pagination.page, limit: pagination.limit });
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
  // حذف مسئله
  // ============================================

  const deleteIssue = useCallback(async (issueId: number) => {
    setLoading(true);

    try {
      await apiClient(`/api/issues/${issueId}`, {
        method: 'DELETE',
      });

      // toast.success('مسئله با موفقیت حذف شد');
      await fetchIssues({ page: pagination.page, limit: pagination.limit });
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
  // آپلود فایل پیوست
  // ============================================

  const uploadAttachment = useCallback(async (issueId: number, file: File) => {
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await apiClient(`/api/issues/${issueId}/attachment`, {
        method: 'POST',
        body: formData,
        headers: {}, // برای FormData نباید Content-Type تنظیم شود
      });

      toast.success('فایل با موفقیت آپلود شد');
      if (selectedIssue?.id === issueId) {
        await fetchIssue(issueId);
      }
      return result;
    } catch (err: any) {
      toast.error(err.message || 'خطا در آپلود فایل');
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
  // دریافت تاریخچه تغییرات
  // ============================================

  const getHistory = useCallback(async (issueId: number) => {
    try {
      const data = await apiClient(`/api/issues/${issueId}`);
      return data.history || [];
    } catch (err: any) {
      toast.error(err.message || 'خطا در دریافت تاریخچه');
      return [];
    }
  }, []);

  // ============================================
  // دریافت آمار مسائل
  // ============================================

  const getIssueStats = useCallback((issuesList: Issue[]) => {
    const total = issuesList.length;
    const pending = issuesList.filter(i => i.status === 'pending').length;
    const inProgress = issuesList.filter(i => i.status === 'in_progress').length;
    const completed = issuesList.filter(i => i.status === 'completed').length;
    const canceled = issuesList.filter(i => i.status === 'canceled').length;
    const onHold = issuesList.filter(i => i.status === 'on_hold').length;

    const byPriority = issuesList.reduce((acc: any, issue) => {
      const priority = issue.actionPriority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    const totalBudget = issuesList.reduce((sum, issue) => sum + (issue.requiredBudget || 0), 0);
    const avgCompletion = total > 0 ? Math.round(issuesList.reduce((sum, issue) => sum + (issue.completionPercent || 0), 0) / total) : 0;

    return {
      total,
      pending,
      inProgress,
      completed,
      canceled,
      onHold,
      byPriority,
      totalBudget,
      avgCompletion,
    };
  }, []);

  // ============================================
  // انتقال و فریز مسائل بین دوره‌های زمانی (Period Rollover)
  // ============================================

  const carryOverIssues = useCallback(async (sourcePeriodId: number, targetPeriodId: number, mode = 'open_only', issueIds?: number[]) => {
    setLoading(true);
    try {
      const result: any = await apiClient('/api/issues/carry-over', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePeriodId, targetPeriodId, mode, issueIds }),
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
  // بارگذاری گروهی مسائل از فایل/سی‌دی برای دوره مشخص
  // ============================================

  const batchImportIssues = useCallback(async (targetPeriodId: number, issuesList: any[], updateExistingByTitle = true) => {
    setLoading(true);
    try {
      const result: any = await apiClient('/api/issues/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPeriodId, issuesList, updateExistingByTitle }),
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
    pagination,
    fetchIssues,
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
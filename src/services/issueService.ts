// src/services/issueService.ts
// سرویس ارتباط با API نظام مسائل

import api from './api';

export interface IssueQueryParams {
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
}

export const issueService = {
  // دریافت لیست مسائل
  async getIssues(params?: IssueQueryParams) {
    const res = await api.get('/api/issues', { params });
    return res;
  },

  // دریافت یک مسئله
  async getIssueById(id: number) {
    const res = await api.get(`/api/issues/${id}`);
    return res;
  },

  // ایجاد مسئله
  async createIssue(data: any) {
    const res = await api.post('/api/issues', data);
    return res;
  },

  // ویرایش مسئله
  async updateIssue(id: number, data: any) {
    const res = await api.put(`/api/issues/${id}`, data);
    return res;
  },

  // حذف مسئله
  async deleteIssue(id: number) {
    const res = await api.delete(`/api/issues/${id}`);
    return res;
  },

  // تغییر وضعیت مسئله
  async changeStatus(id: number, status: string, note?: string) {
    const res = await api.put(`/api/issues/${id}/status`, { status, note });
    return res;
  },

  // دریافت فایل اکسل فرمت‌بندی شده گزارش مسائل از سرور
  async downloadExcelReport() {
    const response = await api.get('/api/reports/issues/excel', {
      responseType: 'blob',
    });
    return response;
  },
};

export default issueService;

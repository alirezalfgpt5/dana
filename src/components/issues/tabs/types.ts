// src/components/issues/tabs/types.ts
// تعاریف مشترک و کمکی برای تب‌های فرم نظام مسائل

import RawDatePicker from 'react-multi-date-picker';
import rawPersian from 'react-date-object/calendars/persian';
import rawPersianFa from 'react-date-object/locales/persian_fa';
import rawTransition from 'react-element-popper/animations/transition';

// استخراج امن کامپوننت تقویم
export const resolveComponent = (comp: any) => {
  if (!comp) return null;
  if (comp.$$typeof || typeof comp === 'function') return comp;
  if (comp.default?.$$typeof || typeof comp.default === 'function') return comp.default;
  if (comp.default?.default?.$$typeof || typeof comp.default?.default === 'function') return comp.default.default;
  return comp.default || comp;
};

export const DatePicker: any = resolveComponent(RawDatePicker);
export const persian: any = (rawPersian as any)?.default || rawPersian;
export const persian_fa: any = (rawPersianFa as any)?.default || rawPersianFa;
export const transition: any = () => {
  try {
    const fn = (rawTransition as any)?.default || rawTransition;
    if (typeof fn === 'function') return fn();
  } catch {}
  return undefined;
};

// تبدیل امن مقادیر تاریخ به شیء قابل خواندن برای DatePicker
export const safeDateForPicker = (val: any) => {
  if (!val) return null;
  if (typeof val === 'string') {
    if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(val)) {
      return val;
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    return val;
  }
  return val;
};

// قالب‌بندی امن خروجی انتخاب تاریخ به رشته جلالی
export const formatPickerDate = (date: any) => {
  if (!date) return '';
  if (date.format) return date.format('YYYY/MM/DD');
  if (date.toDate) {
    try {
      const d = date.toDate();
      if (!isNaN(d.getTime())) return d.toISOString();
    } catch {}
  }
  return String(date);
};

export interface TeamMember {
  id: number;
  name: string;
  rank: string;
  unit: string;
  phone: string;
}

export interface NeedStatementData {
  user: string;
  problem: string;
  suggestedBudget: number;
  level: string;
  file?: File | null;
  approvalStatus: string;
  approvalDate: string;
  approvedAmount: number;
}

export interface ContractData {
  number: string;
  executor: string;
  collaborators: string[];
  agents: string[];
  date: string;
  duration: number;
  startDate: string;
  amount: number;
  file?: File | null;
}

export interface ExecutiveContractData {
  file?: File | null;
  minutes: string;
}

export interface StageData {
  proposal?: string;
  file?: File | null;
  defenseDate: string;
  minutes: string;
  minutesFile?: File | null;
  recordsFiles?: File[];
  paidAmount: number;
  paymentDate: string;
}

export interface ApplicationData {
  file?: File | null;
  resultReflection: string;
  applicationType: string;
  applicationDate: string;
  minutes: string;
  minutesFile?: File | null;
  recordsFiles?: File[];
  workingGroup: string;
}

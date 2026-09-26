// src/components/issues/tabs/BudgetTab.tsx
// تب بودجه، اعتبارات، زمان‌بندی و درصد پیشرفت

import React from 'react';
import { formatCurrency, parseNumberInput, formatNumber } from '../../../utils/numberFormat';

interface BudgetTabProps {
  formData: any;
  handleChange: (field: string, value: any) => void;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({
  formData,
  handleChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          📄 عنوان دانش و پژوهش مرجع تصویب
        </label>
        <input
          type="text"
          value={formData.referenceDocument || ''}
          onChange={e => handleChange('referenceDocument', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
          placeholder="ارجاع به سند بالادستی..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            💰 اعتبار / بودجه مورد نیاز (ریال)
          </label>
          <div className="relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">ریال</span>
            <input
              type="text"
              inputMode="numeric"
              value={formData.requiredBudget !== undefined && formData.requiredBudget !== null ? formatNumber(formData.requiredBudget) : ''}
              onChange={e => handleChange('requiredBudget', parseNumberInput(e.target.value))}
              className="w-full px-4 pr-12 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
              placeholder="۰"
            />
          </div>
          {Number(formData.requiredBudget) > 0 && (
            <p className="text-xs text-blue-600 mt-1 font-medium">
              {formatCurrency(formData.requiredBudget, true)}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            ✅ اعتبار / بودجه مصوب (ریال)
          </label>
          <div className="relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">ریال</span>
            <input
              type="text"
              inputMode="numeric"
              value={formData.approvedBudget !== undefined && formData.approvedBudget !== null ? formatNumber(formData.approvedBudget) : ''}
              onChange={e => handleChange('approvedBudget', parseNumberInput(e.target.value))}
              className="w-full px-4 pr-12 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
              placeholder="۰"
            />
          </div>
          {Number(formData.approvedBudget) > 0 && (
            <p className="text-xs text-emerald-600 mt-1 font-medium">
              {formatCurrency(formData.approvedBudget, true)}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📤 اعتبار / بودجه واگذار شده (ریال)
          </label>
          <div className="relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">ریال</span>
            <input
              type="text"
              inputMode="numeric"
              value={formData.assignedBudget !== undefined && formData.assignedBudget !== null ? formatNumber(formData.assignedBudget) : ''}
              onChange={e => handleChange('assignedBudget', parseNumberInput(e.target.value))}
              className="w-full px-4 pr-12 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
              placeholder="۰"
            />
          </div>
          {Number(formData.assignedBudget) > 0 && (
            <p className="text-xs text-purple-600 mt-1 font-medium">
              {formatCurrency(formData.assignedBudget, true)}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            ⏱️ زمان به ماه
          </label>
          <input
            type="number"
            value={formData.expectedMonths || 0}
            onChange={e => handleChange('expectedMonths', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
            placeholder="تعداد ماه مورد انتظار..."
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            📊 درصد انجام
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={formData.completionPercent ?? 0}
              onChange={e => handleChange('completionPercent', e.target.value === '' ? 0 : Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
              placeholder="۰"
              min="0"
              max="100"
            />
            <span className="text-sm text-gray-400">%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

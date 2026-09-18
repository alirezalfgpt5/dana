// src/components/ImportPreviewModal.tsx
// مودال پیش‌نمایش واردات داده

import React from 'react';
import { X, Check, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  data: any[];
  columns: { key: string; label: string }[];
  errors?: string[];
  isSaving?: boolean;
  totalCount?: number;
}

export function ImportPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  data,
  columns,
  errors = [],
  isSaving = false,
  totalCount = 0,
}: ImportPreviewModalProps) {
  if (!isOpen) return null;

  const displayData = data.slice(0, 10);
  const hasMore = data.length > 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{title}</h2>
              <p className="text-xs text-slate-500">
                {data.length} رکورد برای واردات • {totalCount || data.length} کل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={18} className="text-red-500" />
                <h3 className="font-bold text-sm">خطاهای یافت شده در فایل:</h3>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm mr-2 max-h-32 overflow-y-auto">
                {errors.map((err, idx) => (
                  <li key={idx} className="text-red-600">{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          <div className="space-y-3">
            <h3 className="font-medium text-slate-700 text-sm flex items-center gap-2">
              <span>پیش‌نمایش داده‌ها</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {data.length} رکورد
              </span>
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium text-center w-12">#</th>
                    {columns.map((col, idx) => (
                      <th key={idx} className="px-4 py-3 font-medium whitespace-nowrap min-w-[100px]">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayData.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <FileSpreadsheet size={32} className="text-slate-300" />
                          <p>هیچ داده معتبری یافت نشد</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayData.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400 text-xs font-medium">
                          {rIdx + 1}
                        </td>
                        {columns.map((col, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-4 py-3 text-slate-700 whitespace-nowrap max-w-[200px] truncate"
                            title={String(row[col.key] || '')}
                          >
                            {row[col.key] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <p className="text-xs text-slate-400 text-center">
                ... و {data.length - 10} رکورد دیگر
              </p>
            )}
          </div>

          {/* Summary */}
          {data.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span>📊 کل رکوردها: <strong>{data.length}</strong></span>
                <span className="w-px h-4 bg-slate-300"></span>
                <span>✅ معتبر: <strong className="text-green-600">{data.length - errors.length}</strong></span>
                {errors.length > 0 && (
                  <>
                    <span className="w-px h-4 bg-slate-300"></span>
                    <span>❌ خطا: <strong className="text-red-600">{errors.length}</strong></span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            انصراف
          </button>
          <button
            onClick={onConfirm}
            disabled={isSaving || data.length === 0 || errors.length > 0}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 shadow-lg shadow-emerald-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                در حال ذخیره...
              </>
            ) : (
              <>
                <Check size={18} />
                تأیید و ذخیره نهایی
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
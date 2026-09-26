// src/components/issues/tabs/NeedTab.tsx
// تب بیانیه نیاز

import React from 'react';
import { Calendar } from 'lucide-react';
import { 
  DatePicker, 
  persian, 
  persian_fa, 
  safeDateForPicker, 
  formatPickerDate,
  NeedStatementData 
} from './types';
import { formatNumber, parseNumberInput } from '../../../utils/numberFormat';

interface NeedTabProps {
  needStatementData: NeedStatementData;
  setNeedStatementData: React.Dispatch<React.SetStateAction<any>>;
  handleFileUpload: (field: string, file: File | null) => void;
}

export const NeedTab: React.FC<NeedTabProps> = ({
  needStatementData,
  setNeedStatementData,
  handleFileUpload,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">👤 کاربر ذینفع</label>
          <input
            type="text"
            value={needStatementData?.user || ''}
            onChange={e => setNeedStatementData({...needStatementData, user: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="نام کاربر ذینفع..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📊 سطح</label>
          <input
            type="text"
            value={needStatementData?.level || ''}
            onChange={e => setNeedStatementData({...needStatementData, level: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="سطح نیاز..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">📝 بیان مسئله</label>
        <textarea
          value={needStatementData?.problem || ''}
          onChange={e => setNeedStatementData({...needStatementData, problem: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm min-h-[60px]"
          placeholder="شرح مسئله..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">💰 اعتبار پیشنهادی (ریال)</label>
          <input
            type="text"
            inputMode="numeric"
            value={needStatementData?.suggestedBudget !== undefined && needStatementData?.suggestedBudget !== null ? formatNumber(needStatementData.suggestedBudget) : ''}
            onChange={e => setNeedStatementData({...needStatementData, suggestedBudget: parseNumberInput(e.target.value)})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="۰"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📎 فایل</label>
          <input
            type="file"
            onChange={e => {
              const file = e.target.files?.[0] || null;
              setNeedStatementData({...needStatementData, file});
              if (file) handleFileUpload('بیانیه نیاز', file);
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📌 وضعیت تصویب</label>
          <select
            value={needStatementData?.approvalStatus || 'pending'}
            onChange={e => setNeedStatementData({...needStatementData, approvalStatus: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
          >
            <option value="pending">⏳ در انتظار</option>
            <option value="approved">✅ تصویب شد</option>
            <option value="rejected">❌ تصویب نشد</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📅 تاریخ تصویب</label>
          <div className="relative">
            <DatePicker
              value={safeDateForPicker(needStatementData?.approvalDate)}
              onChange={(date: any) => setNeedStatementData({...needStatementData, approvalDate: formatPickerDate(date)})}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              inputClass="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm pr-10"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ..."
            />
            <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">💰 مبلغ تصویب (ریال)</label>
          <input
            type="text"
            inputMode="numeric"
            value={needStatementData?.approvedAmount !== undefined && needStatementData?.approvedAmount !== null ? formatNumber(needStatementData.approvedAmount) : ''}
            onChange={e => setNeedStatementData({...needStatementData, approvedAmount: parseNumberInput(e.target.value)})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="۰"
          />
        </div>
      </div>
    </div>
  );
};

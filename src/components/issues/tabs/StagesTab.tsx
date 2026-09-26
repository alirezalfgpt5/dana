// src/components/issues/tabs/StagesTab.tsx
// تب مقاطع و مراحل انجام (۲۰٪، ۵۰٪، ۱۰۰٪)

import React from 'react';
import { Calendar } from 'lucide-react';
import { 
  DatePicker, 
  persian, 
  persian_fa, 
  safeDateForPicker, 
  formatPickerDate,
  StageData 
} from './types';
import { formatNumber, parseNumberInput } from '../../../utils/numberFormat';

interface StagesTabProps {
  stage20Data: StageData;
  setStage20Data: React.Dispatch<React.SetStateAction<any>>;
  stage50Data: StageData;
  setStage50Data: React.Dispatch<React.SetStateAction<any>>;
  stage100Data: StageData;
  setStage100Data: React.Dispatch<React.SetStateAction<any>>;
  handleFileUpload: (field: string, file: File | null) => void;
}

export const StagesTab: React.FC<StagesTabProps> = ({
  stage20Data,
  setStage20Data,
  stage50Data,
  setStage50Data,
  stage100Data,
  setStage100Data,
  handleFileUpload,
}) => {
  return (
    <div className="space-y-6">
      {/* مرحله ۲۰ درصد */}
      <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30">
        <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">📌 مقطع ۲۰%</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📄 پروپوزال</label>
            <input
              type="text"
              value={stage20Data?.proposal || ''}
              onChange={e => setStage20Data({...stage20Data, proposal: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="عنوان پروپوزال..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📎 فایل</label>
            <input
              type="file"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setStage20Data({...stage20Data, file});
                if (file) handleFileUpload('مقطع ۲۰٪', file);
              }}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ دفاع</label>
            <div className="relative">
              <DatePicker
                value={safeDateForPicker(stage20Data?.defenseDate)}
                onChange={(date: any) => setStage20Data({...stage20Data, defenseDate: formatPickerDate(date)})}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm pr-8"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ..."
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📋 صورتجلسه</label>
            <input
              type="text"
              value={stage20Data?.minutes || ''}
              onChange={e => setStage20Data({...stage20Data, minutes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="شماره صورتجلسه..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">💰 اعتبار پرداختی (ریال)</label>
            <input
              type="text"
              inputMode="numeric"
              value={stage20Data?.paidAmount !== undefined && stage20Data?.paidAmount !== null ? formatNumber(stage20Data.paidAmount) : ''}
              onChange={e => setStage20Data({...stage20Data, paidAmount: parseNumberInput(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              placeholder="۰"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ پرداخت</label>
            <div className="relative">
              <DatePicker
                value={safeDateForPicker(stage20Data?.paymentDate)}
                onChange={(date: any) => setStage20Data({...stage20Data, paymentDate: formatPickerDate(date)})}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm pr-8"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ..."
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* مرحله ۵۰ درصد */}
      <div className="border border-yellow-200 rounded-xl p-4 bg-yellow-50/30">
        <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs">📌 مقطع ۵۰%</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📎 فایل</label>
            <input
              type="file"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setStage50Data({...stage50Data, file});
                if (file) handleFileUpload('مقطع ۵۰٪', file);
              }}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ دفاع</label>
            <div className="relative">
              <DatePicker
                value={safeDateForPicker(stage50Data?.defenseDate)}
                onChange={(date: any) => setStage50Data({...stage50Data, defenseDate: formatPickerDate(date)})}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm pr-8"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ..."
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📋 صورتجلسه</label>
            <input
              type="text"
              value={stage50Data?.minutes || ''}
              onChange={e => setStage50Data({...stage50Data, minutes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm"
              placeholder="شماره صورتجلسه..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">💰 اعتبار پرداختی (ریال)</label>
            <input
              type="text"
              inputMode="numeric"
              value={stage50Data?.paidAmount !== undefined && stage50Data?.paidAmount !== null ? formatNumber(stage50Data.paidAmount) : ''}
              onChange={e => setStage50Data({...stage50Data, paidAmount: parseNumberInput(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm"
              placeholder="۰"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ پرداخت</label>
            <div className="relative">
              <DatePicker
                value={safeDateForPicker(stage50Data?.paymentDate)}
                onChange={(date: any) => setStage50Data({...stage50Data, paymentDate: formatPickerDate(date)})}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm pr-8"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ..."
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* مرحله ۱۰۰ درصد */}
      <div className="border border-green-200 rounded-xl p-4 bg-green-50/30">
        <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">📌 مقطع ۱۰۰%</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📎 فایل</label>
            <input
              type="file"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setStage100Data({...stage100Data, file});
                if (file) handleFileUpload('مقطع ۱۰۰٪', file);
              }}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ دفاع</label>
            <div className="relative">
              <DatePicker
                value={safeDateForPicker(stage100Data?.defenseDate)}
                onChange={(date: any) => setStage100Data({...stage100Data, defenseDate: formatPickerDate(date)})}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm pr-8"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ..."
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📋 صورتجلسه</label>
            <input
              type="text"
              value={stage100Data?.minutes || ''}
              onChange={e => setStage100Data({...stage100Data, minutes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm"
              placeholder="شماره صورتجلسه..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">💰 اعتبار پرداختی (ریال)</label>
            <input
              type="text"
              inputMode="numeric"
              value={stage100Data?.paidAmount !== undefined && stage100Data?.paidAmount !== null ? formatNumber(stage100Data.paidAmount) : ''}
              onChange={e => setStage100Data({...stage100Data, paidAmount: parseNumberInput(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm"
              placeholder="۰"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 تاریخ پرداخت</label>
            <div className="relative">
              <DatePicker
                value={safeDateForPicker(stage100Data?.paymentDate)}
                onChange={(date: any) => setStage100Data({...stage100Data, paymentDate: formatPickerDate(date)})}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm pr-8"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ..."
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

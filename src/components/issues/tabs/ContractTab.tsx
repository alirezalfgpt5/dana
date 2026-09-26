// src/components/issues/tabs/ContractTab.tsx
// تب قرارداد

import React from 'react';
import { Calendar } from 'lucide-react';
import { 
  DatePicker, 
  persian, 
  persian_fa, 
  safeDateForPicker, 
  formatPickerDate,
  ContractData 
} from './types';
import { formatNumber, parseNumberInput } from '../../../utils/numberFormat';

interface ContractTabProps {
  contractData: ContractData;
  setContractData: React.Dispatch<React.SetStateAction<any>>;
}

export const ContractTab: React.FC<ContractTabProps> = ({
  contractData,
  setContractData,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">🔢 شماره قرارداد</label>
          <input
            type="text"
            value={contractData?.number || ''}
            onChange={e => setContractData({...contractData, number: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="شماره قرارداد..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">👤 مجری</label>
          <input
            type="text"
            value={contractData?.executor || ''}
            onChange={e => setContractData({...contractData, executor: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="نام مجری..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">🤝 همکاران مجری</label>
        <input
          type="text"
          value={Array.isArray(contractData?.collaborators) ? contractData.collaborators.join(', ') : (contractData?.collaborators || '')}
          onChange={e => setContractData({...contractData, collaborators: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
          placeholder="نام همکاران (با کاما جدا کنید)..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">🧑‍🏫 عوامل (استاد راهنما، ارزیاب، مشاور)</label>
        <input
          type="text"
          value={Array.isArray(contractData?.agents) ? contractData.agents.join(', ') : (contractData?.agents || '')}
          onChange={e => setContractData({...contractData, agents: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
          placeholder="استاد راهنما، ارزیاب، مشاور..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📅 تاریخ قرارداد</label>
          <div className="relative">
            <DatePicker
              value={safeDateForPicker(contractData?.date)}
              onChange={(date: any) => setContractData({...contractData, date: formatPickerDate(date)})}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              inputClass="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm pr-10"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ..."
            />
            <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📅 تاریخ شروع</label>
          <div className="relative">
            <DatePicker
              value={safeDateForPicker(contractData?.startDate)}
              onChange={(date: any) => setContractData({...contractData, startDate: formatPickerDate(date)})}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              inputClass="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm pr-10"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ..."
            />
            <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">⏱️ مدت (ماه)</label>
          <input
            type="number"
            value={contractData?.duration || 0}
            onChange={e => setContractData({...contractData, duration: parseInt(e.target.value) || 0})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="۰"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">💰 مبلغ قرارداد (ریال)</label>
          <input
            type="text"
            inputMode="numeric"
            value={contractData?.amount !== undefined && contractData?.amount !== null ? formatNumber(contractData.amount) : ''}
            onChange={e => setContractData({...contractData, amount: parseNumberInput(e.target.value)})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="۰"
          />
        </div>
      </div>
    </div>
  );
};

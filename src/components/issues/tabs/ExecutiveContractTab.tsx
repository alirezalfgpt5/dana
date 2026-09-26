// src/components/issues/tabs/ExecutiveContractTab.tsx
// تب قرارداد شورای اجرایی

import React from 'react';
import { ExecutiveContractData } from './types';

interface ExecutiveContractTabProps {
  executiveContractData: ExecutiveContractData;
  setExecutiveContractData: React.Dispatch<React.SetStateAction<any>>;
}

export const ExecutiveContractTab: React.FC<ExecutiveContractTabProps> = ({
  executiveContractData,
  setExecutiveContractData,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          متن صورتجلسه
        </label>
        <textarea
          value={executiveContractData?.minutes || ''}
          onChange={e => setExecutiveContractData({...executiveContractData, minutes: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm min-h-[100px]"
          placeholder="شرح صورتجلسه..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          آپلود فایل صورتجلسه
        </label>
        <input
          type="file"
          onChange={e => setExecutiveContractData({...executiveContractData, file: e.target.files?.[0] || null})}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
    </div>
  );
};

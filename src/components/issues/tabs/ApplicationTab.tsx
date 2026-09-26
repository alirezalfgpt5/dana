// src/components/issues/tabs/ApplicationTab.tsx
// تب کاربست و بازتاب نتایج به کاربر

import React from 'react';
import { Calendar } from 'lucide-react';
import { 
  DatePicker, 
  persian, 
  persian_fa, 
  safeDateForPicker, 
  formatPickerDate,
  ApplicationData 
} from './types';

interface ApplicationTabProps {
  applicationData: ApplicationData;
  setApplicationData: React.Dispatch<React.SetStateAction<any>>;
}

export const ApplicationTab: React.FC<ApplicationTabProps> = ({
  applicationData,
  setApplicationData,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">📤 انعکاس نتایج به کاربر</label>
        <textarea
          value={applicationData?.resultReflection || ''}
          onChange={e => setApplicationData({...applicationData, resultReflection: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-gray-50/50 focus:bg-white text-sm min-h-[60px]"
          placeholder="نحوه انعکاس نتایج به کاربر..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📊 نوع کاربست</label>
          <input
            type="text"
            value={applicationData?.applicationType || ''}
            onChange={e => setApplicationData({...applicationData, applicationType: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
            placeholder="نوع کاربست..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📅 تاریخ کاربست</label>
          <div className="relative">
            <DatePicker
              value={safeDateForPicker(applicationData?.applicationDate)}
              onChange={(date: any) => setApplicationData({...applicationData, applicationDate: formatPickerDate(date)})}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              inputClass="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-gray-50/50 focus:bg-white text-sm pr-10"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ..."
            />
            <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">📋 صورتجلسه کاربست</label>
        <input
          type="text"
          value={applicationData?.minutes || ''}
          onChange={e => setApplicationData({...applicationData, minutes: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
          placeholder="شماره صورتجلسه..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">👥 کارگروه کاربست</label>
        <input
          type="text"
          value={applicationData?.workingGroup || ''}
          onChange={e => setApplicationData({...applicationData, workingGroup: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-gray-50/50 focus:bg-white text-sm"
          placeholder="نام کارگروه کاربست..."
        />
      </div>
    </div>
  );
};

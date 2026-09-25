// src/components/ui/PersianDatePicker.tsx
// کامپوننت تقویم و انتخاب‌گر تاریخ شمسی ایمن و سازگار با Vite و ESM

import React from 'react';
import RawDatePicker from 'react-multi-date-picker';
import rawPersian from 'react-date-object/calendars/persian';
import rawPersianFa from 'react-date-object/locales/persian_fa';
import rawTransition from 'react-element-popper/animations/transition';
import { Calendar as CalendarIcon, X } from 'lucide-react';

// استخراج امن کامپوننت و افزونه‌ها از حالت CJS/ESM
const ResolvedDatePicker: any = (RawDatePicker as any)?.default || RawDatePicker;
const persian: any = (rawPersian as any)?.default || rawPersian;
const persian_fa: any = (rawPersianFa as any)?.default || rawPersianFa;
const transition: any = (rawTransition as any)?.default || rawTransition;

export interface PersianDatePickerProps {
  value?: string | Date | null;
  onChange: (isoDateString: string) => void;
  placeholder?: string;
  className?: string;
  inputClass?: string;
  containerClassName?: string;
  disabled?: boolean;
  format?: string;
  iconSize?: number;
  allowClear?: boolean;
}

export const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ...',
  className = '',
  inputClass = '',
  containerClassName = 'w-full',
  disabled = false,
  format = 'YYYY/MM/DD',
  iconSize = 16,
  allowClear = true,
}) => {
  // تبدیل مقدار به تاریخ معتبر
  const parsedValue = React.useMemo(() => {
    if (!value) return null;
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      return d;
    } catch {
      return null;
    }
  }, [value]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const defaultInputClass = `w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-right font-sans text-sm pr-10 ${inputClass}`;

  // اگر کامپوننت تقویم به درستی بارگذاری نشد (حفاظت)، از یک ورودی متنی استفاده کن
  if (!ResolvedDatePicker || typeof ResolvedDatePicker !== 'function' && typeof ResolvedDatePicker !== 'object') {
    return (
      <div className={`relative ${containerClassName} ${className}`}>
        <input
          type="text"
          value={value ? String(value) : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={defaultInputClass}
        />
        <CalendarIcon size={iconSize} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    );
  }

  return (
    <div className={`relative ${containerClassName} ${className}`}>
      <ResolvedDatePicker
        value={parsedValue}
        onChange={(date: any) => {
          if (!date) {
            onChange('');
            return;
          }
          try {
            const jsDate = date?.toDate?.() || (date instanceof Date ? date : new Date(date));
            if (jsDate && !isNaN(jsDate.getTime())) {
              onChange(jsDate.toISOString());
            } else {
              onChange('');
            }
          } catch {
            onChange('');
          }
        }}
        calendar={persian}
        locale={persian_fa}
        animations={typeof transition === 'function' ? [transition()] : []}
        format={format}
        inputClass={defaultInputClass}
        containerClassName="w-full"
        placeholder={placeholder}
        disabled={disabled}
      />
      <CalendarIcon
        size={iconSize}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      {allowClear && value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
          title="پاک کردن تاریخ"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default PersianDatePicker;

// src/components/ui/FormControls.tsx
// کنترل‌های فرم با پشتیبانی از تاریخ شمسی

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import transition from 'react-element-popper/animations/transition';
import { Calendar } from 'lucide-react';

// ============================================
// FormInput
// ============================================

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helpText?: string;
  required?: boolean;
  className?: string;
}

export function FormInput({
  label,
  helpText,
  required,
  className,
  id,
  ...props
}: FormInputProps) {
  const inputId = id || `input-${label.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <div className={twMerge('space-y-1', className)}>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <input
        id={inputId}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white text-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
        {...props}
      />
      {helpText && <p className="text-xs text-gray-400 mt-1">{helpText}</p>}
    </div>
  );
}

// ============================================
// FormSelect
// ============================================

interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  placeholder?: string;
  options: FormSelectOption[];
  allowOther?: boolean;
  helpText?: string;
  required?: boolean;
  className?: string;
}

export function FormSelect({
  label,
  options,
  allowOther = false,
  helpText,
  required,
  className,
  value,
  onChange,
  placeholder,
  ...props
}: FormSelectProps) {
  const inputId = `select-${label.replace(/\s/g, '-').toLowerCase()}`;
  const [isOther, setIsOther] = useState(false);
  const [otherValue, setOtherValue] = useState('');

  const isValueInOptions = options.some((o) => o.value === value);
  const showOtherInput = (allowOther && value && !isValueInOptions) || isOther;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__OTHER__') {
      setIsOther(true);
      setOtherValue('');
      if (onChange) {
        const event = { ...e, target: { ...e.target, value: '' } };
        onChange(event as any);
      }
    } else {
      setIsOther(false);
      if (onChange) onChange(e);
    }
  };

  const handleOtherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtherValue(e.target.value);
    if (onChange) {
      const event = { ...e, target: { ...e.target, value: e.target.value } };
      onChange(event as any);
    }
  };

  return (
    <div className={twMerge('space-y-1', className)}>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>

      {showOtherInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={isOther ? otherValue : value || ''}
            onChange={handleOtherChange}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white text-gray-700"
            placeholder="لطفاً وارد کنید..."
            autoFocus
          />
          <button
            type="button"
            className="px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
            onClick={() => {
              setIsOther(false);
              setOtherValue('');
              if (onChange) {
                const event = { target: { value: '' } } as any;
                onChange(event);
              }
            }}
          >
            بازگشت به لیست
          </button>
        </div>
      ) : (
        <select
          id={inputId}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white text-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
          value={value || ''}
          onChange={handleSelectChange}
          {...props}
        >
          <option value="">{placeholder || 'انتخاب کنید...'}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          {allowOther && <option value="__OTHER__">سایر...</option>}
        </select>
      )}

      {helpText && <p className="text-xs text-gray-400 mt-1">{helpText}</p>}
    </div>
  );
}

// ============================================
// FormDatePicker
// ============================================

interface FormDatePickerProps {
  label: string;
  value?: any;
  onChange?: (date: any) => void;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  className?: string;
}

export function FormDatePicker({
  label,
  value,
  onChange,
  placeholder,
  required,
  helpText,
  className,
}: FormDatePickerProps) {
  const inputId = `date-${label.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <div className={twMerge('space-y-1 flex flex-col', className)}>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <div className="relative">
        <DatePicker
          value={value}
          onChange={onChange}
          calendar={persian}
          locale={persian_fa}
          animations={[transition()]}
          format="YYYY/MM/DD"
          inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-right font-sans bg-white text-gray-700 pr-10"
          containerClassName="w-full"
          placeholder={placeholder || 'انتخاب تاریخ...'}
        />
        <Calendar
          size={18}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>
      {helpText && <p className="text-xs text-gray-400 mt-1">{helpText}</p>}
    </div>
  );
}

// ============================================
// FormTextarea
// ============================================

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helpText?: string;
  required?: boolean;
  rows?: number;
  className?: string;
}

export function FormTextarea({
  label,
  helpText,
  required,
  rows = 4,
  className,
  id,
  ...props
}: FormTextareaProps) {
  const inputId = id || `textarea-${label.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <div className={twMerge('space-y-1', className)}>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white text-gray-700 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
        {...props}
      />
      {helpText && <p className="text-xs text-gray-400 mt-1">{helpText}</p>}
    </div>
  );
}

// ============================================
// FormCheckbox
// ============================================

interface FormCheckboxProps {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  helpText?: string;
  className?: string;
  disabled?: boolean;
}

export function FormCheckbox({
  label,
  checked,
  onChange,
  helpText,
  className,
  disabled,
}: FormCheckboxProps) {
  const inputId = `checkbox-${label.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <div className={twMerge('space-y-1', className)}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          id={inputId}
          type="checkbox"
          checked={checked || false}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </label>
      {helpText && <p className="text-xs text-gray-400 mr-6">{helpText}</p>}
    </div>
  );
}
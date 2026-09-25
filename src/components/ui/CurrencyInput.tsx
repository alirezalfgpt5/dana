// src/components/ui/CurrencyInput.tsx
// کامپوننت ورودی بودجه و اعتبارات با جداکننده هزارگان، نمایش ریال و تبدیل خودکار به حروف

import React, { useState, useEffect } from 'react';
import { formatThousands, parseRialInput, formatRialsWithWords } from '../../utils/currencyUtils';
import { Coins, X } from 'lucide-react';

interface CurrencyInputProps {
  label?: string;
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  showHelperWords?: boolean;
  showQuickButtons?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  onChange,
  placeholder = '۰',
  disabled = false,
  required = false,
  className = '',
  showHelperWords = true,
  showQuickButtons = true,
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');

  useEffect(() => {
    if (value === 0 || !value) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatThousands(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawStr = e.target.value;
    const num = parseRialInput(rawStr);
    onChange(num);
    if (!rawStr) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatThousands(num));
    }
  };

  const handleClear = () => {
    onChange(0);
    setDisplayValue('');
  };

  const handleAddAmount = (addAmount: number) => {
    const current = value || 0;
    const next = current + addAmount;
    onChange(next);
    setDisplayValue(formatThousands(next));
  };

  const wordInfo = formatRialsWithWords(value || 0);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-700">
            {label}
            {required && <span className="text-red-500 mr-1">*</span>}
          </label>
          {value > 0 && (
            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              {wordInfo.words}
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        {/* نشانگر ریال سمت راست */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-gray-400">
          <Coins size={16} className="text-amber-500" />
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">ریال</span>
        </div>

        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={displayValue}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full pl-8 pr-20 py-2.5 bg-gray-50/60 hover:bg-white focus:bg-white text-gray-800 text-left font-mono font-semibold text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all shadow-xs"
        />

        {value > 0 && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors"
            title="پاک کردن مبلغ"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* اطلاعات کمکی زیر فیلد */}
      {showHelperWords && value > 0 && (
        <div className="flex items-center justify-between text-[11px] text-gray-500 px-1 pt-0.5">
          <span>معادل تومانی: <strong className="text-gray-700 font-semibold">{wordInfo.tomansEquivalent}</strong></span>
          <span className="text-gray-400">{wordInfo.words}</span>
        </div>
      )}

      {/* دکمه‌های مقادیر سریع */}
      {showQuickButtons && !disabled && (
        <div className="flex flex-wrap items-center gap-1 pt-1">
          <span className="text-[10px] text-gray-400 ml-1">افزودن سریع:</span>
          <button
            type="button"
            onClick={() => handleAddAmount(100_000_000)}
            className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-gray-600 rounded border border-gray-200 transition-colors"
          >
            +۱۰۰ میلیون ریال
          </button>
          <button
            type="button"
            onClick={() => handleAddAmount(500_000_000)}
            className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-gray-600 rounded border border-gray-200 transition-colors"
          >
            +۵۰۰ میلیون ریال
          </button>
          <button
            type="button"
            onClick={() => handleAddAmount(1_000_000_000)}
            className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-gray-600 rounded border border-gray-200 transition-colors"
          >
            +۱ میلیارد ریال
          </button>
          <button
            type="button"
            onClick={() => handleAddAmount(5_000_000_000)}
            className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-gray-600 rounded border border-gray-200 transition-colors"
          >
            +۵ میلیارد ریال
          </button>
        </div>
      )}
    </div>
  );
};
export default CurrencyInput;

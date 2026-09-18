// src/components/ui/SearchableSelect.tsx
// کامپوننت انتخاب با قابلیت جستجو - برای دراپ‌دان‌های پیشرفته
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Option {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number | null;
  onChange: (val: string | number | null) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  theme?: 'light' | 'dark';
  disabled?: boolean;
  required?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'انتخاب کنید...',
  className = '',
  allowClear = false,
  theme = 'light',
  disabled = false,
  required = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';
  
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // بستن دراپ‌دان هنگام کلیک خارج
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current && 
        !wrapperRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // پاک کردن جستجو هنگام بستن
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    } else {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isOpen]);

  const updateDropdownPosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Default to dropping down, but if not enough space below and more space above, drop up
      const dropUp = spaceBelow < 250 && spaceAbove > spaceBelow;

      setDropdownStyle({
        position: 'fixed',
        top: dropUp ? 'auto' : rect.bottom + 4,
        bottom: dropUp ? window.innerHeight - rect.top + 4 : 'auto',
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  };

  // فوکوس روی input هنگام باز شدن
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      opt.label.toLowerCase().includes(searchLower) ||
      String(opt.value).toLowerCase().includes(searchLower)
    );
  });

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const handleSelect = (option: Option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  const dropdownContent = isOpen && !disabled && (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className={`overflow-hidden shadow-2xl ${
        isDark
          ? 'bg-[#1e1e2f] border border-[#2d2d44] rounded-lg'
          : 'bg-white border border-gray-200 rounded-xl'
      }`}
    >
      {/* جستجو */}
      <div
        className={`p-2 border-b ${
          isDark ? 'border-[#2d2d44] bg-[#2d2d44]/50' : 'border-gray-100 bg-gray-50/50'
        }`}
      >
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-2.5 text-gray-400"
          />
          <input
            ref={inputRef}
            type="text"
            className={`w-full pl-8 pr-3 py-1.5 text-sm rounded outline-none transition-all ${
              isDark
                ? 'bg-[#2d2d44] text-white focus:ring-1 focus:ring-blue-500 placeholder-gray-500 border-none'
                : 'bg-white text-gray-800 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }`}
            placeholder="جستجو..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* لیست گزینه‌ها */}
      <div className="max-h-60 overflow-y-auto p-1">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={opt.value}
                className={`px-3 py-2 my-0.5 text-sm cursor-pointer rounded-lg flex items-center justify-between transition-colors ${
                  isSelected
                    ? isDark
                      ? 'bg-blue-500/20 text-blue-400 font-medium'
                      : 'bg-blue-50 text-blue-700 font-medium'
                    : isDark
                    ? 'text-gray-300 hover:bg-white/5'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleSelect(opt)}
              >
                {opt.label}
                {isSelected && (
                  <Check size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                )}
              </div>
            );
          })
        ) : (
          <div
            className={`px-3 py-6 text-center text-xs ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            موردی یافت نشد
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* نمایش انتخاب‌شده */}
      <div
        className={`flex items-center justify-between w-full px-3 py-2 cursor-pointer transition-colors ${
          disabled ? 'cursor-not-allowed opacity-60' : ''
        } ${
          isDark
            ? 'bg-[#2d2d44] border-transparent text-white hover:border-blue-500 rounded-md text-sm border'
            : 'bg-white border-gray-200 text-gray-800 hover:border-blue-400 rounded-xl px-3 py-2.5 border'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span
          className={`text-sm truncate pr-2 ${
            !selectedOption ? (isDark ? 'text-gray-400' : 'text-gray-400') : ''
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {allowClear && selectedOption && (
            <div
              className={`p-1 rounded-full ${
                isDark
                  ? 'hover:bg-white/10 text-gray-400 hover:text-red-400'
                  : 'hover:bg-gray-100 text-gray-400 hover:text-red-500'
              }`}
              onClick={handleClear}
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>
      
      {/* دراپ‌دان به صورت Portal */}
      {typeof document !== 'undefined' ? createPortal(dropdownContent, document.body) : dropdownContent}
      
      {/* نشانگر اجباری */}
      {required && (
        <span className="absolute top-0 right-0 text-red-500 text-xs">*</span>
      )}
    </div>
  );
}

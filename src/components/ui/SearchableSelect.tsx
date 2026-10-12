// src/components/ui/SearchableSelect.tsx
// کامپوننت انتخاب با قابلیت جستجو - برای دراپ‌دان‌های پیشرفته
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface Option {
  value: string | number;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
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
  dropdownMinWidth?: number;
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
  dropdownMinWidth = 0,
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
  }, [isOpen, dropdownMinWidth]);

  const updateDropdownPosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Default to dropping down, but if not enough space below and more space above, drop up
      const dropUp = spaceBelow < 250 && spaceAbove > spaceBelow;

      const dropdownWidth = Math.min(
        Math.max(rect.width, dropdownMinWidth),
        window.innerWidth - 24,
      );
      setDropdownStyle({
        position: 'fixed',
        top: dropUp ? 'auto' : rect.bottom + 4,
        bottom: dropUp ? window.innerHeight - rect.top + 4 : 'auto',
        left: Math.max(12, Math.min(rect.right - dropdownWidth, window.innerWidth - dropdownWidth - 12)),
        width: dropdownWidth,
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
      (opt.sublabel && opt.sublabel.toLowerCase().includes(searchLower)) ||
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
      className="overflow-hidden rounded-xl border border-[var(--border-main)] bg-[var(--surface-main)] shadow-2xl"
    >
      {/* جستجو */}
      <div
        className="border-b border-[var(--border-main)] bg-[var(--surface-soft)] p-2"
      >
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-2.5 text-gray-400"
          />
          <input
            ref={inputRef}
            type="text"
            className="input-theme w-full rounded px-3 py-1.5 pl-8 text-sm outline-none"
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
                className={`flex cursor-pointer items-start justify-between rounded-lg px-3 py-2 my-0.5 text-sm transition-colors ${
                  isSelected
                      ? 'font-medium'
                      : 'text-main hover:bg-brand-soft'
                  }`}
                  style={isSelected ? {
                    backgroundColor: 'color-mix(in srgb, var(--brand-500) 14%, var(--surface-main))',
                    color: 'var(--brand-text)',
                  } : undefined}
                onClick={() => handleSelect(opt)}
              >
                <div className="flex flex-col text-right min-w-0 pr-1 flex-1">
                  <span className="break-words leading-snug">{opt.label}</span>
                  {opt.sublabel && (
                    <span className={`text-[11px] truncate mt-0.5 font-normal ${
                      isSelected
                        ? 'opacity-80'
                          : 'text-faint'
                    }`}>
                      {opt.sublabel}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check size={14} className="text-brand mr-2 shrink-0" />
                )}
              </div>
            );
          })
        ) : (
          <div
            className="text-faint px-3 py-6 text-center text-xs"
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
        } rounded-xl border border-[var(--border-main)] bg-[var(--surface-main)] px-3 py-2 text-[var(--text-main)] hover:border-[var(--brand-400)]`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex-1 min-w-0 pr-2 text-right">
          {selectedOption ? (
            <div className="flex flex-col truncate">
              <span className="text-strong truncate text-sm font-medium leading-snug">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="text-muted mt-0.5 truncate text-[11px] font-normal">
                  {selectedOption.sublabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-faint truncate text-sm">
              {placeholder}
            </span>
          )}
        </div>
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

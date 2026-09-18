// src/components/dashboard/Widget.tsx
// ویجت قابل شخصی‌سازی برای داشبورد

import React, { useState } from 'react';
import { 
  X, 
  GripVertical, 
  Settings, 
  Maximize2, 
  Minimize2,
  RefreshCw,
  MoreVertical
} from 'lucide-react';

interface WidgetProps {
  id: string;
  title: string;
  widgetType?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onRemove?: (id: string) => void;
  onRefresh?: () => void;
  onResize?: (size: 'small' | 'medium' | 'large') => void;
  defaultSize?: 'small' | 'medium' | 'large';
  className?: string;
  loading?: boolean;
  error?: string | null;
}

export function Widget({
  id,
  title,
  icon,
  children,
  onRemove,
  onRefresh,
  onResize,
  defaultSize = 'medium',
  className = '',
  loading = false,
  error = null,
}: WidgetProps) {
  const [size, setSize] = useState<'small' | 'medium' | 'large'>(defaultSize);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-3',
  };

  const handleResize = (newSize: 'small' | 'medium' | 'large') => {
    setSize(newSize);
    if (onResize) onResize(newSize);
    setShowMenu(false);
  };

  const handleRefresh = () => {
    if (onRefresh) onRefresh();
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden transition-all duration-200 hover:shadow-md ${sizeClasses[size]} ${className}`}
    >
      {/* هدر ویجت */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          {/* دکمه درگ (برای جابجایی) */}
          <div className="cursor-grab text-gray-300 hover:text-gray-500">
            <GripVertical size={16} />
          </div>
          
          {/* آیکون */}
          {icon && (
            <div className="text-gray-400">
              {icon}
            </div>
          )}
          
          {/* عنوان */}
          <span className="text-sm font-medium text-gray-700">{title}</span>
          
          {/* نشانگر بارگذاری */}
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* دکمه بروزرسانی */}
          {onRefresh && (
            <button
              onClick={handleRefresh}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="بروزرسانی"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
          
          {/* دکمه بزرگنمایی */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title={isExpanded ? 'کاهش' : 'بزرگنمایی'}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          
          {/* منوی تنظیمات */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical size={14} />
            </button>
            
            {showMenu && (
              <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[140px]">
                {onResize && (
                  <>
                    <button
                      onClick={() => handleResize('small')}
                      className="w-full text-right px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <span className="w-3 h-3 border border-gray-300 rounded"></span>
                      کوچک
                    </button>
                    <button
                      onClick={() => handleResize('medium')}
                      className="w-full text-right px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <span className="w-5 h-3 border border-gray-300 rounded"></span>
                      متوسط
                    </button>
                    <button
                      onClick={() => handleResize('large')}
                      className="w-full text-right px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <span className="w-8 h-3 border border-gray-300 rounded"></span>
                      بزرگ
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                  </>
                )}
                
                {onRemove && (
                  <button
                    onClick={() => onRemove(id)}
                    className="w-full text-right px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <X size={14} />
                    حذف ویجت
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* محتوای ویجت */}
      <div className={`p-4 ${isExpanded ? 'min-h-[300px]' : ''}`}>
        {error ? (
          <div className="text-center py-8 text-red-500">
            <p className="text-sm">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
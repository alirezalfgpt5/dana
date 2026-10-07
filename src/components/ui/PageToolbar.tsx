// src/components/ui/PageToolbar.tsx
// کامپوننت نوار ابزار هماهنگ بالای صفحات با چیدمان آیکون در بالا و عنوان در زیر

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PageToolbarAction {
  id: string;
  label: string;
  icon: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'purple' | 'ghost' | 'indigo';
  disabled?: boolean;
  badge?: string | number;
  active?: boolean;
  title?: string;
}

export interface PageToolbarProps {
  title?: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  icon?: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  iconColor?: string;
  actions?: PageToolbarAction[];
  extra?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, {
  container: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
}> = {
  primary: {
    container: 'border-blue-200 dark:border-blue-900/40 bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 hover:border-blue-300',
    iconBg: 'bg-blue-600 text-white shadow-sm shadow-blue-500/20',
    iconColor: 'text-white',
    textColor: 'text-blue-900 dark:text-blue-200',
  },
  secondary: {
    container: 'border-gray-200 dark:border-gray-700 bg-white hover:bg-gray-50 dark:bg-[#232338] dark:hover:bg-[#2b2b42] hover:border-gray-300',
    iconBg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
    iconColor: 'text-gray-700 dark:text-gray-300',
    textColor: 'text-gray-700 dark:text-gray-300',
  },
  success: {
    container: 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 hover:border-emerald-300',
    iconBg: 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20',
    iconColor: 'text-white',
    textColor: 'text-emerald-900 dark:text-emerald-200',
  },
  warning: {
    container: 'border-amber-200 dark:border-amber-900/40 bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 hover:border-amber-300',
    iconBg: 'bg-amber-500 text-white shadow-sm shadow-amber-500/20',
    iconColor: 'text-white',
    textColor: 'text-amber-900 dark:text-amber-200',
  },
  danger: {
    container: 'border-red-200 dark:border-red-900/40 bg-red-50/70 hover:bg-red-100/80 dark:bg-red-950/30 dark:hover:bg-red-900/50 hover:border-red-300',
    iconBg: 'bg-red-600 text-white shadow-sm shadow-red-500/20',
    iconColor: 'text-white',
    textColor: 'text-red-900 dark:text-red-200',
  },
  purple: {
    container: 'border-purple-200 dark:border-purple-900/40 bg-purple-50/70 hover:bg-purple-100/80 dark:bg-purple-950/30 dark:hover:bg-purple-900/50 hover:border-purple-300',
    iconBg: 'bg-purple-600 text-white shadow-sm shadow-purple-500/20',
    iconColor: 'text-white',
    textColor: 'text-purple-900 dark:text-purple-200',
  },
  indigo: {
    container: 'border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/50 hover:border-indigo-300',
    iconBg: 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20',
    iconColor: 'text-white',
    textColor: 'text-indigo-900 dark:text-indigo-200',
  },
  ghost: {
    container: 'border-transparent bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
    iconBg: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
    iconColor: 'text-gray-600 dark:text-gray-300',
    textColor: 'text-gray-600 dark:text-gray-400',
  },
};

export function PageToolbar({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'from-blue-600 to-indigo-600',
  actions = [],
  extra,
  className,
}: PageToolbarProps) {
  return (
    <div
      className={twMerge(
        'w-full bg-white dark:bg-[#1e1e2f] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 shadow-sm transition-all duration-200',
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* بخش عنوان و آیکون صفحه */}
        {(title || Icon) && (
          <div className="flex items-center gap-3.5 min-w-0">
            {Icon && (
              <div
                className={clsx(
                  'w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0 bg-gradient-to-br',
                  iconColor
                )}
              >
                <Icon size={24} />
              </div>
            )}
            <div className="min-w-0">
              {typeof title === 'string' ? (
                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                  {title}
                </h1>
              ) : (
                title
              )}
              {subtitle && (
                typeof subtitle === 'string' ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate font-medium">
                    {subtitle}
                  </p>
                ) : (
                  subtitle
                )
              )}
            </div>
          </div>
        )}

        {/* بخش عناصر اضافی (مثل جستجو، فیلتر و...) و دکمه‌های نوار ابزار */}
        <div className="flex flex-wrap items-center gap-2.5 justify-end">
          {extra && <div className="flex items-center gap-2 flex-wrap">{extra}</div>}

          {actions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {actions.map((action) => {
                const ActionIcon = action.icon;
                const variant = action.variant || 'secondary';
                const style = variantStyles[variant] || variantStyles.secondary;

                return (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    title={action.title || action.label}
                    className={twMerge(
                      'relative group flex flex-col items-center justify-center min-w-[70px] sm:min-w-[78px] h-[66px] px-2.5 py-1.5 rounded-xl border text-center transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none select-none',
                      style.container,
                      action.active ? 'ring-2 ring-blue-500 border-blue-400 shadow-sm' : ''
                    )}
                  >
                    {/* Badge */}
                    {action.badge !== undefined && action.badge !== null && (
                      <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-600 text-white border-2 border-white dark:border-gray-900 shadow-sm animate-pulse">
                        {action.badge}
                      </span>
                    )}

                    {/* آیکون در ردیف بالا */}
                    <div
                      className={clsx(
                        'w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 mb-1',
                        style.iconBg
                      )}
                    >
                      <ActionIcon size={16} />
                    </div>

                    {/* عنوان در زیر آیکون */}
                    <span
                      className={clsx(
                        'text-[11px] font-bold tracking-tight leading-tight truncate w-full text-center',
                        style.textColor
                      )}
                    >
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

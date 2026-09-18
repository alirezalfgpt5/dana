// src/components/dashboard/WidgetManager.tsx
// مدیریت ویجت‌های داشبورد

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  X, 
  LayoutGrid, 
  GripVertical,
  Save,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large';
  config?: Record<string, any>;
}

interface WidgetManagerProps {
  widgets: WidgetConfig[];
  availableWidgets: { id: string; title: string; icon?: React.ReactNode; description?: string }[];
  onSave: (widgets: WidgetConfig[]) => void;
  onReset?: () => void;
  children?: React.ReactNode;
}

const WIDGETS_STORAGE_KEY = 'dana_dashboard_widgets';

export function WidgetManager({
  widgets: initialWidgets,
  availableWidgets,
  onSave,
  onReset,
  children,
}: WidgetManagerProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(initialWidgets);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // بارگذاری از localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WIDGETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWidgets(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading widgets from storage:', e);
    }
  }, []);

  // ذخیره در localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(widgets));
    } catch (e) {
      console.error('Error saving widgets to storage:', e);
    }
  }, [widgets]);

  const handleAddWidget = (widgetId: string) => {
    const available = availableWidgets.find(w => w.id === widgetId);
    if (!available) return;

    const existing = widgets.find(w => w.type === widgetId);
    if (existing) {
      toast.error('این ویجت قبلاً اضافه شده است');
      return;
    }

    setWidgets([
      ...widgets,
      {
        id: `widget-${Date.now()}`,
        type: widgetId,
        title: available.title,
        size: 'medium',
        config: {},
      },
    ]);
    toast.success(`ویجت "${available.title}" اضافه شد`);
  };

  const handleRemoveWidget = (id: string) => {
    const widget = widgets.find(w => w.id === id);
    if (widget) {
      setWidgets(widgets.filter(w => w.id !== id));
      toast(`ویجت "${widget.title}" حذف شد`);
    }
  };

  const handleMoveWidget = (fromIndex: number, toIndex: number) => {
    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(fromIndex, 1);
    newWidgets.splice(toIndex, 0, removed);
    setWidgets(newWidgets);
  };

  const handleSave = () => {
    onSave(widgets);
    setIsEditing(false);
    toast.success('چیدمان ویجت‌ها ذخیره شد');
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      setWidgets(initialWidgets);
      localStorage.removeItem(WIDGETS_STORAGE_KEY);
      toast('ویجت‌ها به حالت پیش‌فرض بازگشتند');
    }
    setIsEditing(false);
  };

  // ویجت‌های در دسترس برای افزودن
  const availableToAdd = availableWidgets.filter(
    aw => !widgets.some(w => w.type === aw.id)
  );

  return (
    <div className="space-y-4">
      {/* نوار کنترل */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl shadow-sm border border-gray-200/80 p-3">
        <div className="flex items-center gap-3">
          <LayoutGrid size={18} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">چیدمان داشبورد</span>
          {isEditing && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              حالت ویرایش
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <LayoutGrid size={14} />
              ویرایش چیدمان
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Save size={14} />
                ذخیره
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                بازنشانی
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* افزودن ویجت جدید */}
      {isEditing && availableToAdd.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4">
          <p className="text-xs text-gray-400 mb-3">افزودن ویجت جدید:</p>
          <div className="flex flex-wrap gap-2">
            {availableToAdd.map(widget => (
              <button
                key={widget.id}
                onClick={() => handleAddWidget(widget.id)}
                className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center gap-1.5"
              >
                <Plus size={12} />
                {widget.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* محتوای ویجت‌ها */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {widgets.map((widget, index) => (
          <div
            key={widget.id}
            className={`${widget.size === 'small' ? 'col-span-1' : widget.size === 'medium' ? 'col-span-2' : 'col-span-3'} relative`}
          >
            {isEditing && (
              <div className="absolute -top-2 -left-2 z-10 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-0.5">
                <button
                  onClick={() => {
                    const newSize = widget.size === 'small' ? 'medium' : widget.size === 'medium' ? 'large' : 'small';
                    setWidgets(widgets.map(w => 
                      w.id === widget.id ? { ...w, size: newSize } : w
                    ));
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="تغییر اندازه"
                >
                  <LayoutGrid size={12} />
                </button>
                <button
                  onClick={() => handleRemoveWidget(widget.id)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="حذف ویجت"
                >
                  <X size={12} />
                </button>
                {index > 0 && (
                  <button
                    onClick={() => handleMoveWidget(index, index - 1)}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="انتقال به بالا"
                  >
                    ↑
                  </button>
                )}
                {index < widgets.length - 1 && (
                  <button
                    onClick={() => handleMoveWidget(index, index + 1)}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="انتقال به پایین"
                  >
                    ↓
                  </button>
                )}
              </div>
            )}
            
            {/* رندر ویجت با کامپوننت مناسب */}
            {React.Children.map(children, child => {
              if (React.isValidElement(child) && (child as any).props?.widgetType === widget.type) {
                return React.cloneElement(child as any, {
                  widgetId: widget.id,
                  widgetConfig: widget.config,
                  onRemove: isEditing ? () => handleRemoveWidget(widget.id) : undefined,
                });
              }
              return null;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default WidgetManager;
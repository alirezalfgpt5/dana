// src/components/trees/NodeForm.tsx
// فرم افزودن/ویرایش گره درختواره - نسخه کامل با پشتیبانی از تمام سطوح

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Calendar, Info, HelpCircle } from 'lucide-react';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import transition from 'react-element-popper/animations/transition';
import toast from 'react-hot-toast';
import { SearchableSelect } from '../ui/SearchableSelect';

interface LevelOption {
  value: string;
  label: string;
  description: string;
  parentLevel?: string;
}

interface NodeFormProps {
  node?: any;
  treeId?: number;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
  levels?: LevelOption[];
  templates?: any[];
  knowledgeLevels?: any[];
  parentId?: number | null;
  initialLevel?: string;
  treeType?: string;
}

// سطوح با توضیحات کامل و والد
const DEFAULT_LEVELS: LevelOption[] = [
  { value: 'R', label: 'ریشه (Root)', description: 'کلان‌ترین سطح دانش - پایه و اساس درختواره', parentLevel: undefined },
  { value: 'T', label: 'تنه (Trunk)', description: 'ستون اصلی ارتباط دهنده ریشه تا برگ‌ها', parentLevel: 'R' },
  { value: 'B', label: 'شاخه (Branch)', description: 'حوزه‌های اصلی دانشی (تقسیم‌بندی کلان موضوعی)', parentLevel: 'T' },
  { value: 'SB', label: 'زیرشاخه (Sub-Branch)', description: 'حوزه‌های فرعی دانشی (ریزتر از شاخه)', parentLevel: 'B' },
  { value: 'L', label: 'برگ (Leaf)', description: 'ریزدانش‌ها و مصادیق عینی دانش (نقطه عطف فرایند)', parentLevel: 'SB' },
  { value: 'Q', label: 'کیفیت (Quality)', description: 'سطح کیفیت و اعتبارسنجی دانش (اختیاری)', parentLevel: 'L' },
];

export function NodeForm({
  node,
  treeId,
  onSave,
  onCancel,
  onDelete,
  levels = DEFAULT_LEVELS,
  templates = [],
  knowledgeLevels = [],
  parentId = null,
  initialLevel,
  treeType = 'required',
}: NodeFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    level: 'L',
    description: '',
    templateIds: [] as string[],
    levelId: '',
    parentId: parentId || null,
    metadata: {},
  });

  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const [showLevelHelp, setShowLevelHelp] = useState(false);
  const [availableLevels, setAvailableLevels] = useState<LevelOption[]>([]);

  // تعیین سطوح و سطح اولیه
  useEffect(() => {
    setAvailableLevels(levels && levels.length > 0 ? levels : DEFAULT_LEVELS);

    if (node) {
      setFormData({
        title: node.title || '',
        level: node.level || 'L',
        description: node.description || '',
        templateIds: (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])) || [],
        levelId: node.levelId ? String(node.levelId) : '',
        parentId: node.parentId || null,
        metadata: node.metadata || {},
      });
    } else {
      let resolvedInitialLevel = initialLevel || 'R';
      if (!initialLevel && parentId) {
        resolvedInitialLevel = 'T';
      }
      setFormData(prev => ({ ...prev, level: resolvedInitialLevel, parentId: parentId || null }));
    }
  }, [node, parentId, levels, initialLevel]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateToggle = (templateId: string) => {
    setFormData(prev => {
      const current = prev.templateIds || [];
      const exists = current.includes(templateId);
      return {
        ...prev,
        templateIds: exists ? current.filter(id => id !== templateId) : [...current, templateId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('عنوان گره الزامی است');
      return;
    }

    // اعتبارسنجی سطح
    if (!formData.level) {
      toast.error('سطح گره الزامی است');
      return;
    }

    // برای برگ‌ها، حداقل یک قالب الزامی است (در درختواره مورد نیاز)
    if (treeType === 'required' && (formData.level === 'L' || formData.level === 'Q')) {
      if (formData.templateIds.length === 0) {
        toast('برای برگ‌ها حداقل یک قالب انتخاب کنید', { icon: '⚠️' });
        // اما اجازه ادامه می‌دهیم
      }
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        templateIds: formData.templateIds.join(','),
        levelId: formData.levelId ? parseInt(formData.levelId) : null,
        parentId: formData.parentId,
      };

      await onSave(submitData);
    } catch (error) {
      // خطا قبلاً در هوک مدیریت شده
    } finally {
      setLoading(false);
    }
  };

  // پیدا کردن توضیحات سطح انتخاب‌شده
  const selectedLevelInfo = levels.find(l => l.value === formData.level);

  // گزینه‌های قالب‌ها
  // Separate root templates and concrete templates
  const rootTemplates = templates.filter(t => t.parentId === null);
  const concreteTemplates = templates.filter(t => t.parentId !== null);
  const groupedTemplates = rootTemplates.reduce((acc: any, root) => {
    const children = concreteTemplates.filter(t => t.parentId === root.id);
    acc[root.title] = { root, children };
    return acc;
  }, {});

  const templateOptions = templates.map(t => ({
    value: String(t.id),
    label: `${t.type} - ${t.title}`,
  }));

  // گزینه‌های سطوح دانش
  const levelOptions = knowledgeLevels.map(l => ({
    value: String(l.id),
    label: l.name,
  }));

  // آیا گره برگ است؟
  const isLeaf = formData.level === 'L' || formData.level === 'Q';
  const canHaveChildren = formData.level !== 'Q' && formData.level !== 'L';

  // سطح بعدی برای نمایش راهنما
  const getNextLevelHint = () => {
    if (formData.level === 'Q') return 'سطح کیفیت آخرین سطح است و فرزند ندارد';
    if (formData.level === 'L') return 'برگ آخرین سطح دانش است و فرزند ندارد';
    const nextLevel = levels.find(l => l.parentLevel === formData.level);
    return nextLevel ? `بعد از این، می‌توانید ${nextLevel.label} ایجاد کنید` : 'این سطح فرزند ندارد';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {node ? '✏️' : '➕'}
            </div>
            <div>
              <h3 className="font-bold text-gray-800">
                {node ? 'ویرایش گره' : 'گره جدید'}
              </h3>
              <p className="text-xs text-gray-500">
                {node ? `در حال ویرایش: ${node.title}` : 'افزودن گره به درختواره'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* سطح با توضیحات */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              سطح گره <span className="text-red-500">*</span>
              <button
                type="button"
                onClick={() => setShowLevelHelp(!showLevelHelp)}
                className="mr-2 text-blue-500 hover:text-blue-700"
              >
                <HelpCircle size={16} />
              </button>
            </label>
            
            <select
              value={formData.level}
              onChange={e => handleChange('level', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-sm"
            >
              {(availableLevels.length > 0 ? availableLevels : DEFAULT_LEVELS).map(level => (
                <option key={level.value} value={level.value}>
                  {level.label} - {level.description}
                </option>
              ))}
            </select>

            {showLevelHelp && selectedLevelInfo && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 space-y-2">
                <p className="font-bold">{selectedLevelInfo.label}</p>
                <p>{selectedLevelInfo.description}</p>
                <div className="mt-2 p-2 bg-white/50 rounded-lg">
                  <p className="font-bold text-blue-800">📌 راهنمای سطوح:</p>
                  <p className="mt-1 text-blue-600">
                    R → T → B → SB → L → Q
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    {getNextLevelHint()}
                  </p>
                </div>
                {formData.level === 'R' && (
                  <p className="text-blue-500">➡️ بعد از ریشه، تنه (T) ایجاد کنید</p>
                )}
                {formData.level === 'T' && (
                  <p className="text-blue-500">➡️ بعد از تنه، شاخه (B) ایجاد کنید</p>
                )}
                {formData.level === 'B' && (
                  <p className="text-blue-500">➡️ بعد از شاخه، زیرشاخه (SB) ایجاد کنید</p>
                )}
                {formData.level === 'SB' && (
                  <p className="text-blue-500">➡️ بعد از زیرشاخه، برگ (L) ایجاد کنید</p>
                )}
                {formData.level === 'L' && (
                  <p className="text-blue-500">➡️ برگ نقطه عطف فرایند است. قالب و سطح دانش تعیین کنید</p>
                )}
                {formData.level === 'Q' && (
                  <p className="text-blue-500">⭐ سطح کیفیت برای اعتبارسنجی دانش (اختیاری)</p>
                )}
              </div>
            )}
          </div>

          {/* عنوان */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              عنوان گره <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => handleChange('title', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
              placeholder="عنوان گره را وارد کنید..."
              autoFocus
            />
          </div>

          {/* توضیحات */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              توضیحات
            </label>
            <textarea
              value={formData.description || ''}
              onChange={e => handleChange('description', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm min-h-[60px]"
              placeholder="توضیحات تکمیلی در مورد این گره..."
            />
          </div>

          {/* قالب‌ها (فقط برای برگ‌ها در درختواره مورد نیاز) */}
          {(treeType === 'required' || treeType === 'produced') && isLeaf && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                قالب‌های مرتبط
                <span className="text-xs text-gray-400 mr-1">(حداقل یک قالب)</span>
              </label>
              <div className="space-y-3 p-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto scrollbar-hide bg-gray-50/50">
                {Object.keys(groupedTemplates).length > 0 ? (
                  Object.entries(groupedTemplates).map(([type, group]: [string, any]) => {
                    const rootChecked = formData.templateIds.includes(String(group.root.id)) || false;
                    return (
                    <div key={type} className="space-y-1.5 bg-white p-2.5 rounded-lg border border-gray-200">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rootChecked}
                          onChange={() => handleTemplateToggle(String(group.root.id))}
                          className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs font-bold text-gray-700">{type}</span>
                        <span className="text-[10px] text-gray-400 font-normal mr-auto bg-gray-100 px-1.5 py-0.5 rounded">
                          نوع قالب
                        </span>
                      </label>
                      {group.children.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
                          {group.children.map((template: any) => {
                            const isChecked = formData.templateIds.includes(String(template.id)) || false;
                            return (
                              <label
                                key={template.id}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] cursor-pointer transition-all
                                  ${isChecked
                                     ? 'bg-blue-100 border border-blue-300 text-blue-700'
                                     : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-blue-300'
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTemplateToggle(String(template.id))}
                                  className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span>{template.title}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )})
                ) : (
                  <span className="text-sm text-gray-400">
                    هیچ قالبی تعریف نشده است. ابتدا در بخش تنظیمات قالب ایجاد کنید.
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                قالب‌ها مشخص می‌کنند که این برگ چه نوع دانشی را شامل می‌شود
              </p>
            </div>
          )}

          {/* سطح دانش (فقط برای برگ‌ها) */}
          {isLeaf && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                سطح دانش
                <span className="text-xs text-gray-400 mr-1">(اختیاری)</span>
              </label>
              <SearchableSelect
                options={levelOptions}
                value={formData.levelId}
                onChange={(val) => handleChange('levelId', val || '')}
                placeholder="انتخاب سطح دانش (راهبردی، عملیاتی، اجرایی)..."
              />
              <p className="text-[10px] text-gray-400 mt-1">
                سطح دانش تعیین کننده کلان، میانی یا خرد بودن دانش است
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-gray-200 flex justify-between gap-3">
            <div>
              {node && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  حذف گره
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-all duration-200"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg ${
                  loading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200/50'
                }`}
              >
                <Save size={16} />
                {loading ? 'در حال ذخیره...' : node ? 'ذخیره تغییرات' : 'ایجاد گره'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NodeForm;
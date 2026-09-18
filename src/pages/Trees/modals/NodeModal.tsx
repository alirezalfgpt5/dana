// src/pages/Trees/modals/NodeModal.tsx
// مودال افزودن/ویرایش گره - با پشتیبانی از قالب‌ها و نمونه‌ها

import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Search, AlertCircle, Tag, FileText } from 'lucide-react';
import { LEVELS, LEVEL_ORDER, getLevelConfig } from '../constants/treeLevels';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import toast from 'react-hot-toast';

interface NodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: { 
    title: string; 
    description: string; 
    level: string; 
    parentId: number | null; 
    templateIds: string[];
    instanceIds: string[];
  };
  setFormData: (data: any) => void;
  isEditing: boolean;
  templates: any[];
  instances?: any[];
  nodes?: any[];
  treeId?: number;
  treeType?: string;
  onInstanceCreate?: (data: { templateId: string; title: string; referenceCode: string }) => Promise<void>;
}

const LEVEL_NAMES: Record<string, string> = {
  'R': 'ریشه',
  'T': 'تنه',
  'B': 'شاخه',
  'SB': 'زیرشاخه',
  'L': 'برگ',
  'Q': 'کیفیت',
};

export function NodeModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  formData, 
  setFormData, 
  isEditing, 
  templates,
  instances = [],
  nodes = [],
  treeId,
  treeType = 'required',
  onInstanceCreate,
}: NodeModalProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchParent, setSearchParent] = useState('');
  const [filteredNodes, setFilteredNodes] = useState<any[]>([]);
  const [showInstanceForm, setShowInstanceForm] = useState(false);
  const [newInstance, setNewInstance] = useState({ templateId: '', title: '', referenceCode: '' });
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);

  useEffect(() => {
    if (isOpen && nodes.length > 0) {
      const currentLevel = formData.level;
      const levelOrder = LEVEL_ORDER;
      const currentLevelIndex = levelOrder.indexOf(currentLevel);
      
      let available = nodes.filter(node => {
        const nodeLevelIndex = levelOrder.indexOf(node.level);
        if (isEditing && node.id === formData.parentId) return false;
        return nodeLevelIndex < currentLevelIndex;
      });
      
      if (searchParent.trim()) {
        available = available.filter(node => 
          node.title.toLowerCase().includes(searchParent.toLowerCase())
        );
      }
      
      setFilteredNodes(available);
    } else {
      setFilteredNodes([]);
    }
  }, [isOpen, nodes, formData.level, formData.parentId, isEditing, searchParent]);

  useEffect(() => {
    if (formData.parentId) {
      const parentExists = nodes.some(n => n.id === formData.parentId);
      const parentNode = nodes.find(n => n.id === formData.parentId);
      const parentLevel = parentNode?.level;
      const currentLevelIndex = LEVEL_ORDER.indexOf(formData.level);
      const parentLevelIndex = LEVEL_ORDER.indexOf(parentLevel || '');
      
      if (!parentExists || parentLevelIndex >= currentLevelIndex) {
        setFormData({ ...formData, parentId: null });
      }
    }
  }, [formData.level, nodes]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'عنوان گره الزامی است';
    }
    
    if (!formData.level) {
      newErrors.level = 'سطح گره الزامی است';
    }
    
    if (formData.level !== 'R' && !formData.parentId) {
      newErrors.parentId = 'برای گره‌های غیر از ریشه، والد الزامی است';
    }
    
    if (treeType === 'required' && (formData.level === 'L' || formData.level === 'Q')) {
      if (!formData.templateIds || formData.templateIds.length === 0) {
        newErrors.templates = 'حداقل یک قالب برای برگ انتخاب کنید';
      }
    }
    
    if (treeType === 'produced' && (formData.level === 'L' || formData.level === 'Q')) {
      if (!formData.instanceIds || formData.instanceIds.length === 0) {
        newErrors.instances = 'حداقل یک نمونه قالب برای برگ انتخاب کنید';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit();
    }
  };

  const selectParent = (nodeId: number | null) => {
    setFormData({ ...formData, parentId: nodeId });
    setSearchParent('');
    if (errors.parentId) {
      setErrors({ ...errors, parentId: '' });
    }
  };

  const handleLevelChange = (level: string) => {
    const newParentId = level === 'R' ? null : formData.parentId;
    setFormData({ 
      ...formData, 
      level,
      parentId: newParentId,
      templateIds: (level === 'L' || level === 'Q') ? formData.templateIds : [],
      instanceIds: (level === 'L' || level === 'Q') ? formData.instanceIds : [],
    });
    if (errors.level) {
      setErrors({ ...errors, level: '' });
    }
  };

  const handleTemplateToggle = (templateId: string) => {
    setFormData((prev: any) => {
      const current = prev.templateIds || [];
      const exists = current.includes(templateId);
      return {
        ...prev,
        templateIds: exists ? current.filter((id: string) => id !== templateId) : [...current, templateId],
      };
    });
    if (errors.templates) {
      setErrors({ ...errors, templates: '' });
    }
  };

  const handleInstanceToggle = (instanceId: string) => {
    setFormData((prev: any) => {
      const current = prev.instanceIds || [];
      const exists = current.includes(instanceId);
      return {
        ...prev,
        instanceIds: exists ? current.filter((id: string) => id !== instanceId) : [...current, instanceId],
      };
    });
    if (errors.instances) {
      setErrors({ ...errors, instances: '' });
    }
  };

  const handleCreateInstance = async () => {
    if (!newInstance.templateId || !newInstance.title) {
      toast.error('قالب و عنوان نمونه الزامی است');
      return;
    }

    setIsCreatingInstance(true);
    try {
      if (onInstanceCreate) {
        await onInstanceCreate(newInstance);
        setShowInstanceForm(false);
        setNewInstance({ templateId: '', title: '', referenceCode: '' });
        toast.success('نمونه قالب با موفقیت ایجاد شد');
      }
    } catch (error) {
      toast.error('خطا در ایجاد نمونه قالب');
    } finally {
      setIsCreatingInstance(false);
    }
  };

  const getNodeDisplay = (node: any) => {
    const levelName = LEVEL_NAMES[node.level] || node.level;
    return `${node.title} (${levelName})`;
  };

  const isLeaf = formData.level === 'L' || formData.level === 'Q';
  const isRootLevel = formData.level === 'R';
  const hasAvailableParents = filteredNodes.length > 0;

  // Separate root templates (types of templates) and concrete templates
  const rootTemplates = templates.filter(t => t.parentId === null);
  const concreteTemplates = templates.filter(t => t.parentId !== null);

  const groupedTemplates = rootTemplates.reduce((acc: any, root) => {
    const children = concreteTemplates.filter(t => t.parentId === root.id);
    acc[root.title] = { root, children };
    return acc;
  }, {});
  
  const parentOptions = filteredNodes.map(node => ({
    value: String(node.id),
    label: getNodeDisplay(node)
  }));

  const groupedInstances = instances.reduce((acc: any, i) => {
    const template = templates.find(t => t.id === i.templateId);
    const type = template?.type || 'سایر';
    if (!acc[type]) acc[type] = [];
    acc[type].push(i);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-visible max-h-[95vh] flex flex-col">
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isEditing ? 'bg-amber-100' : 'bg-blue-100'}`}>
              {isEditing ? <Save size={18} className="text-amber-600" /> : <Plus size={18} className="text-blue-600" />}
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{isEditing ? '✏️ ویرایش گره' : 'گره جدید'}</h3>
              <p className="text-xs text-gray-500">
                {isEditing ? 'تغییر اطلاعات گره' : `افزودن ${getLevelConfig(formData.level)?.labelFa || ''}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* عنوان گره */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                عنوان گره <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (errors.title) setErrors({ ...errors, title: '' });
                }}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="عنوان گره را وارد کنید..."
                autoFocus
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.title}
                </p>
              )}
            </div>

            {/* توضیحات */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                توضیحات
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm resize-none h-[42px]"
                placeholder="توضیحات گره را وارد کنید..."
              />
            </div>

            {/* سطح گره */}
            {!isEditing && (
              <div className={isRootLevel ? "md:col-span-2" : ""}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  سطح گره <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {LEVEL_ORDER.map(level => {
                    const config = getLevelConfig(level);
                    const isSelected = formData.level === level;
                    return (
                      <button 
                        key={level} 
                        type="button"
                        onClick={() => handleLevelChange(level)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all duration-200
                          ${isSelected 
                            ? `${config.bgColor} ${config.textColor} ${config.borderColor} shadow-sm scale-105` 
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:scale-105'
                          } cursor-pointer`}
                      >
                        {config.labelFa} ({level})
                      </button>
                    );
                  })}
                </div>
                {errors.level && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.level}
                  </p>
                )}
              </div>
            )}

            {/* والد */}
            {!isRootLevel && (
              <div className={isEditing ? "md:col-span-2" : ""}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  والد <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={parentOptions}
                  value={formData.parentId ? String(formData.parentId) : ''}
                  onChange={(val) => selectParent(val ? parseInt(val as string) : null)}
                  placeholder={hasAvailableParents ? "انتخاب والد..." : "هیچ والد مناسبی یافت نشد"}
                />
                {!hasAvailableParents && nodes.length > 0 && (
                  <p className="text-[10px] text-amber-500 mt-1">
                    فقط گره‌هایی با سطح بالاتر از {LEVEL_NAMES[formData.level]} قابل انتخاب هستند
                  </p>
                )}
                {errors.parentId && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.parentId}
                  </p>
                )}
              </div>
            )}
          </div>

          {treeType === 'required' && isLeaf && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                قالب‌های مرتبط <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 mr-1">(حداقل یک قالب)</span>
              </label>
              
              {Object.keys(groupedTemplates).length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <Tag size={24} className="mx-auto mb-1 text-gray-300" />
                  <p>هیچ قالبی تعریف نشده است</p>
                  <p className="text-xs text-gray-400 mt-1">ابتدا در بخش تنظیمات قالب ایجاد کنید</p>
                </div>
              ) : (
                <div className="space-y-3 p-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto scrollbar-hide bg-gray-50/50">
                  {Object.entries(groupedTemplates).map(([type, group]: [string, any]) => {
                    const rootChecked = formData.templateIds?.includes(String(group.root.id)) || false;
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
                            const isChecked = formData.templateIds?.includes(String(template.id)) || false;
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
                  )})}
                </div>
              )}
              {errors.templates && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.templates}
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                💡 قالب‌ها مشخص می‌کنند که این برگ چه نوع دانشی را شامل می‌شود
              </p>
            </div>
          )}

          {treeType === 'produced' && isLeaf && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  نمونه‌های قالب <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-400 mr-1">(حداقل یک نمونه)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowInstanceForm(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus size={14} />
                  ایجاد نمونه جدید
                </button>
              </div>
              
              {showInstanceForm && (
                <div className="mb-3 p-3 border border-blue-200 rounded-xl bg-blue-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700">ایجاد نمونه جدید</span>
                    <button
                      type="button"
                      onClick={() => setShowInstanceForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-600">قالب</label>
                      <select
                        value={newInstance.templateId}
                        onChange={(e) => setNewInstance({ ...newInstance, templateId: e.target.value })}
                        className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">انتخاب قالب...</option>
                        {templates.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.type} - {t.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-600">عنوان نمونه</label>
                      <input
                        type="text"
                        value={newInstance.title}
                        onChange={(e) => setNewInstance({ ...newInstance, title: e.target.value })}
                        className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        placeholder="عنوان سند..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-600">شماره سند (اختیاری)</label>
                    <input
                      type="text"
                      value={newInstance.referenceCode}
                      onChange={(e) => setNewInstance({ ...newInstance, referenceCode: e.target.value })}
                      className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      placeholder="شماره سند..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateInstance}
                    disabled={isCreatingInstance}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {isCreatingInstance ? 'در حال ایجاد...' : 'ایجاد نمونه'}
                  </button>
                </div>
              )}
              
              {Object.keys(groupedInstances).length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <FileText size={24} className="mx-auto mb-1 text-gray-300" />
                  <p>هیچ نمونه قالبی تعریف نشده است</p>
                  <p className="text-xs text-gray-400 mt-1">با کلیک روی "ایجاد نمونه جدید" شروع کنید</p>
                </div>
              ) : (
                <div className="space-y-2 p-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto scrollbar-hide bg-gray-50/50">
                  {Object.entries(groupedInstances).map(([type, items]: [string, any]) => (
                    <div key={type} className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-400">{type}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((instance: any) => {
                          const isChecked = formData.instanceIds?.includes(String(instance.id)) || false;
                          return (
                            <label
                              key={instance.id}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] cursor-pointer transition-all
                                ${isChecked 
                                  ? 'bg-green-100 border border-green-300 text-green-700' 
                                  : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleInstanceToggle(String(instance.id))}
                                className="w-3 h-3 text-green-600 rounded focus:ring-green-500"
                              />
                              <span>{instance.title}</span>
                              {instance.referenceCode && (
                                <span className="text-[8px] text-gray-400 mr-1">({instance.referenceCode})</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {errors.instances && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.instances}
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                💡 نمونه‌ها اسناد واقعی هستند که این برگ را پوشش می‌دهند
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              disabled={!formData.title?.trim() || (!isRootLevel && !formData.parentId)}
            >
              <Save size={16} />
              {isEditing ? 'ذخیره تغییرات' : 'ایجاد گره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NodeModal;
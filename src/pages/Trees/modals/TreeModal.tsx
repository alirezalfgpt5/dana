// src/pages/Trees/modals/TreeModal.tsx
// مودال ایجاد/ویرایش درختواره - با ساختار صحیح سه سطحی و نام فیلدهای snake_case

import React, { useState, useEffect } from 'react';
import { X, Save, FolderTree, Building2, Users, Layers } from 'lucide-react';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import toast from 'react-hot-toast';

interface TreeModalProps {
  isEditing?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: { 
    name: string; 
    description: string; 
    periodId: string; 
    organizationLevel: string; 
    baseId: string; 
    unitId: string 
  };
  setFormData: (data: any) => void;
  periods: any[];
  bases: any[];
  units: any[];
  orgLevels: any[];
}

export function TreeModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  formData, 
  setFormData, 
  periods, 
  bases, 
  units, 
  orgLevels, 
  isEditing 
}: TreeModalProps) {
  
  // State برای سطوح انتخاب شده
  const [selectedLevel1, setSelectedLevel1] = useState<string>(''); // آجا (از bases)
  const [selectedLevel2, setSelectedLevel2] = useState<string>(''); // نیرو (از bases)
  const [selectedLevel3, setSelectedLevel3] = useState<string>(''); // رده (از units)

  // گزینه‌های هر سطح
  const [level1Options, setLevel1Options] = useState<any[]>([]);
  const [level2Options, setLevel2Options] = useState<any[]>([]);
  const [level3Options, setLevel3Options] = useState<any[]>([]);

  // ============================================
  // سطح اول: آجا (از bases)
  // ============================================
  useEffect(() => {
    try {
      const ajas = bases.filter((b: any) => {
        const levelMatch = b.level === 'آجا';
        const activeMatch = b.is_active === undefined || b.is_active === 1 || b.is_active === true;
        return levelMatch && activeMatch;
      });
      setLevel1Options(ajas.map((b: any) => ({
        value: String(b.id),
        label: b.name,
        level: b.level,
        id: b.id
      })));
    } catch (error) {
      console.error('❌ [TreeModal] Error loading level 1 options:', error);
      toast.error('خطا در بارگذاری یگان اصلی');
    }
  }, [bases]);

  // ============================================
  // سطح دوم: نیرو (از bases با parent_id = selectedLevel1)
  // ============================================
  useEffect(() => {
    try {
      if (selectedLevel1) {
        const baseId = parseInt(selectedLevel1);
        const forces = bases.filter((b: any) => {
          const levelMatch = b.level === 'نیرو';
          const parentMatch = Number(b.parent_id) === baseId;
          const activeMatch = b.is_active === undefined || b.is_active === 1 || b.is_active === true;
          return levelMatch && parentMatch && activeMatch;
        });
        setLevel2Options(forces.map((b: any) => ({
          value: String(b.id),
          label: b.name,
          level: b.level,
          parent_id: b.parent_id,
          id: b.id
        })));
      } else {
        setLevel2Options([]);
      }
    } catch (error) {
      console.error('❌ [TreeModal] Error loading level 2 options:', error);
      toast.error('خطا در بارگذاری یگان جزء');
    }
  }, [selectedLevel1, bases]);

  // ============================================
  // سطح سوم: رده (از units با base_id = selectedLevel2)
  // ============================================
  useEffect(() => {
    try {
      if (selectedLevel2) {
        const baseId = parseInt(selectedLevel2);
        const rades = units.filter((u: any) => {
          const baseMatch = Number(u.base_id) === baseId;
          const activeMatch = u.is_active === undefined || u.is_active === 1 || u.is_active === true;
          return baseMatch && activeMatch;
        });
        setLevel3Options(rades.map((u: any) => ({
          value: String(u.id),
          label: u.name,
          level: 'unit',
          base_id: u.base_id,
          id: u.id
        })));
      } else {
        setLevel3Options([]);
      }
    } catch (error) {
      console.error('❌ [TreeModal] Error loading level 3 options:', error);
      toast.error('خطا در بارگذاری رده');
    }
  }, [selectedLevel2, units]);

  // ============================================
  // همگام‌سازی با formData هنگام ویرایش
  // ============================================
  useEffect(() => {
    try {
      if (!isOpen || bases.length === 0) return;

      // اگر Unit انتخاب شده (اولویت با unitId)
      if (formData.unitId && units.length > 0) {
        const unit = units.find((u: any) => u.id === Number(formData.unitId));
        if (unit) {
          const force = bases.find((b: any) => b.id === Number(unit.base_id));
          if (force) {
            const aja = bases.find((b: any) => b.id === Number(force.parent_id));
            if (aja) {
              setSelectedLevel1(String(aja.id));
              setSelectedLevel2(String(force.id));
              setSelectedLevel3(String(unit.id));
            }
          }
        }
        return;
      }

      // اگر فقط Base انتخاب شده
      if (formData.baseId) {
        const base = bases.find((b: any) => b.id === Number(formData.baseId));
        if (!base) return;

        if (base.level === 'آجا') {
          setSelectedLevel1(String(base.id));
          setSelectedLevel2('');
          setSelectedLevel3('');
        } else if (base.level === 'نیرو') {
          const aja = bases.find((b: any) => b.id === Number(base.parent_id));
          if (aja) {
            setSelectedLevel1(String(aja.id));
            setSelectedLevel2(String(base.id));
            setSelectedLevel3('');
          }
        }
      }
    } catch (error) {
      console.error('❌ [TreeModal] Error syncing form data:', error);
    }
  }, [isOpen, formData.baseId, formData.unitId, bases, units]);

  // ============================================
  // هندلرهای تغییر
  // ============================================
  const handleLevel1Change = (val: string) => {
    setSelectedLevel1(val || '');
    setSelectedLevel2('');
    setSelectedLevel3('');
    setFormData({ 
      ...formData, 
      baseId: val || '', 
      unitId: '' 
    });
  };

  const handleLevel2Change = (val: string) => {
    setSelectedLevel2(val || '');
    setSelectedLevel3('');
    setFormData({ 
      ...formData, 
      baseId: val || '', 
      unitId: '' 
    });
  };

  const handleLevel3Change = (val: string) => {
    setSelectedLevel3(val || '');
    
    // پیدا کردن Unit انتخاب شده برای تنظیم baseId صحیح
    const selectedUnit = units.find((u: any) => String(u.id) === String(val));
    
    setFormData({
      ...formData,
      baseId: selectedUnit ? String(selectedUnit.base_id) : selectedLevel2 || '',
      unitId: val || ''
    });
  };

  // ============================================
  // گزینه‌ها
  // ============================================
  const periodOptions = periods.map((p: any) => ({
    value: String(p.id),
    label: p.name
  }));

  const hasLevel1Options = level1Options.length > 0;
  const hasLevel2Options = level2Options.length > 0;
  const hasLevel3Options = level3Options.length > 0;

  const getSelectedLevel = () => {
    if (selectedLevel3) return 'رده (Unit)';
    if (selectedLevel2) return 'نیرو';
    if (selectedLevel1) return 'آجا';
    return 'هیچ';
  };

  // ============================================
  // هندلر submit با مدیریت خطا
  // ============================================
  const handleSubmit = (e: React.FormEvent) => {
    try {
      if (!formData.periodId) {
        toast.error('لطفاً دوره زمانی را انتخاب کنید');
        return;
      }
      if (!selectedLevel1) {
        toast.error('لطفاً یگان اصلی را انتخاب کنید');
        return;
      }
      onSubmit(e);
    } catch (error) {
      console.error('❌ [TreeModal] Submit error:', error);
      toast.error('خطا در ذخیره درختواره');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-visible max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-2.5 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <FolderTree size={16} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">
                {isEditing ? 'ویرایش درختواره' : 'درختواره جدید'}
              </h3>
              <p className="text-[9px] text-gray-500">
                {isEditing ? 'ویرایش اطلاعات درختواره' : 'ایجاد درختواره دانشی'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-5 flex-1 overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* نام درختواره */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                نام درختواره <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm"
                placeholder="نام درختواره..."
                autoFocus
              />
            </div>

            {/* دوره زمانی */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                دوره زمانی <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={periodOptions}
                value={formData.periodId}
                onChange={(val) => setFormData({ ...formData, periodId: val || '' })}
                placeholder="انتخاب دوره زمانی..."
              />
            </div>
          </div>

          {/* توضیحات */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              توضیحات
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm resize-none h-16"
              placeholder="توضیحات درختواره..."
            />
          </div>

          {/* ============================================ */}
          {/* ساختار سازمانی - سه سطح پلکانی در Grid */}
          {/* ============================================ */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Layers size={18} className="text-blue-500" />
                <span>ساختار سازمانی</span>
              </div>
              <span className="text-xs text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full font-medium">
                {getSelectedLevel()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* ========================================== */}
              {/* سطح اول: آجا (از bases) */}
              {/* ========================================== */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  <Building2 size={14} className={selectedLevel1 ? 'text-blue-600' : 'text-gray-400'} />
                  یگان اصلی (آجا) <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={level1Options}
                  value={selectedLevel1}
                  onChange={(val) => handleLevel1Change(val ? String(val) : '')}
                  placeholder={hasLevel1Options ? "انتخاب یگان اصلی..." : "یافت نشد"}
                />
              </div>

              {/* ========================================== */}
              {/* سطح دوم: نیرو (از bases با parent_id) */}
              {/* ========================================== */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  <Users size={14} className={selectedLevel2 ? 'text-purple-600' : 'text-gray-400'} />
                  یگان جزء (نیرو)
                </label>
                <SearchableSelect
                  options={level2Options}
                  value={selectedLevel2}
                  onChange={(val) => handleLevel2Change(val ? String(val) : '')}
                  placeholder={
                    !selectedLevel1 ? "ابتدا یگان اصلی را انتخاب کنید" :
                    hasLevel2Options ? "انتخاب یگان جزء..." :
                    "یافت نشد"
                  }
                  disabled={!selectedLevel1}
                />
                {selectedLevel1 && !selectedLevel2 && level2Options.length === 0 && (
                  <p className="text-[10px] text-amber-500 mt-1">هیچ یگان جزئی یافت نشد</p>
                )}
              </div>

              {/* ========================================== */}
              {/* سطح سوم: رده (از units با base_id) */}
              {/* ========================================== */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  <Layers size={14} className={selectedLevel3 ? 'text-green-600' : 'text-gray-400'} />
                  رده (Unit)
                </label>
                <SearchableSelect
                  options={level3Options}
                  value={selectedLevel3}
                  onChange={(val) => handleLevel3Change(val ? String(val) : '')}
                  placeholder={
                    !selectedLevel2 ? "ابتدا یگان جزء را انتخاب کنید" :
                    hasLevel3Options ? "انتخاب رده..." :
                    "یافت نشد"
                  }
                  disabled={!selectedLevel2}
                />
                {selectedLevel2 && level3Options.length === 0 && (
                  <p className="text-[10px] text-amber-500 mt-1">هیچ رده‌ای یافت نشد</p>
                )}
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* خلاصه انتخاب */}
          {/* ========================================== */}
          {(selectedLevel1 || selectedLevel2 || selectedLevel3) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex flex-wrap gap-4 items-center">
              <span className="font-bold">📋 خلاصه مسیر:</span>
              <div className="flex items-center gap-2 text-xs">
                {selectedLevel1 && (
                  <span className="bg-white px-2 py-1 rounded border border-blue-100">{level1Options.find((o: any) => o.value === selectedLevel1)?.label || 'نامشخص'}</span>
                )}
                {selectedLevel2 && (
                  <>
                    <span className="text-blue-300">❯</span>
                    <span className="bg-white px-2 py-1 rounded border border-blue-100">{level2Options.find((o: any) => o.value === selectedLevel2)?.label || 'نامشخص'}</span>
                  </>
                )}
                {selectedLevel3 && (
                  <>
                    <span className="text-blue-300">❯</span>
                    <span className="bg-white px-2 py-1 rounded border border-blue-100">{level3Options.find((o: any) => o.value === selectedLevel3)?.label || 'نامشخص'}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* دکمه‌ها */}
          {/* ========================================== */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-all duration-200"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 disabled:opacity-50"
              disabled={!formData.name?.trim() || !formData.periodId || !selectedLevel1}
            >
              <Save size={18} />
              {isEditing ? 'ذخیره تغییرات' : 'ایجاد درختواره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TreeModal;
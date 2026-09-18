// src/pages/OrgStructure.tsx
// مدیریت ساختار سازمانی - نسخه نهایی با نمایش کامل درخت (Bases + Units)

import React, { useState, useEffect, useRef } from "react";
import {
  Network,
  Plus,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronDown,
  Building2,
  Users,
  Shield,
  Search,
  RefreshCw,
  Save,
  X,
  MapPin,
  FolderTree,
  ArrowRight,
  UserCog,
  GitBranch,
  ListTree,
  Folder,
  FolderOpen,
  FileText,
  Check,
  Layers,
} from "lucide-react";
import { useAuthStore, useUIStore } from "../store";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import toast from "react-hot-toast";
import { SearchableSelect } from "../components/ui/SearchableSelect";

interface Base {
  id: number;
  name: string;
  location: string | null;
  level: string | null;
  parentId: number | null;
  description: string | null;
  sortOrder: number;
  isActive: number;
}

interface Unit {
  id: number;
  baseId: number;
  name: string;
  level: string | null;
  parentId: number | null;
  description: string | null;
  sortOrder: number;
  isActive: number;
}

interface OrgLevel {
  id: number;
  name: string;
  description: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: number;
}


export function OrgStructure() {
  const { user } = useAuthStore();
  const { fetchOrgData } = useUIStore();

  const [bases, setBases] = useState<Base[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [orgLevels, setOrgLevels] = useState<OrgLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBaseId, setSelectedBaseId] = useState<number | null>(null);

  const [newBaseName, setNewBaseName] = useState("");
  const [newBaseLocation, setNewBaseLocation] = useState("");
  const [newBaseLevel, setNewBaseLevel] = useState("");
  const [newBaseParentId, setNewBaseParentId] = useState<string>("");
  const [isAddingBase, setIsAddingBase] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingBaseId, setEditingBaseId] = useState<number | null>(null);
  const [editBaseName, setEditBaseName] = useState("");
  const [editBaseLocation, setEditBaseLocation] = useState("");
  const [editBaseLevel, setEditBaseLevel] = useState("");
  const [editBaseParentId, setEditBaseParentId] = useState<string>("");
  const [editBaseIsActive, setEditBaseIsActive] = useState<number>(1);

  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitLevel, setNewUnitLevel] = useState("");
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: (() => void) | null, message: string}>({isOpen: false, action: null, message: ''});
  const [editUnitName, setEditUnitName] = useState("");
  const [editUnitLevel, setEditUnitLevel] = useState("");

  const [expandedBases, setExpandedBases] = useState<number[]>([]);
  const [expandedUnits, setExpandedUnits] = useState<number[]>([]);
  const [parentOptions, setParentOptions] = useState<{ value: string; label: string }[]>([]);

  // ============================================
  // FETCH DATA
  // ============================================

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = `/api/org/bases?all=true&t=${new Date().getTime()}`;

      const [basesRes, unitsRes, levelsRes] = await Promise.all([
       (window.customFetch || window.fetch)(url),
       (window.customFetch || window.fetch)(`/api/org/units?t=${new Date().getTime()}`),
       (window.customFetch || window.fetch)(`/api/metadata/org-levels?t=${new Date().getTime()}`),
      ]);

      const basesData = await basesRes.json();
      const unitsData = await unitsRes.json();
      const levelsData = await levelsRes.json();

      const mappedBases = basesData.map((b: any) => ({
        id: b.id,
        name: b.name,
        location: b.location,
        level: b.level,
        parentId: b.parent_id,
        description: b.description,
        sortOrder: b.sort_order,
        isActive: b.is_active,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      }));

      const mappedUnits = unitsData.map((u: any) => ({
        id: u.id,
        baseId: u.base_id,
        name: u.name,
        level: u.level,
        parentId: u.parent_id,
        description: u.description,
        sortOrder: u.sort_order,
        isActive: u.is_active,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }));

      setBases(mappedBases);
      setUnits(mappedUnits);
      setOrgLevels(Array.isArray(levelsData) ? levelsData : []);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("خطا در دریافت اطلاعات ساختار سازمانی");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "superadmin") {
      fetchData();
    }
  }, []);

  // ============================================
  // PARENT OPTIONS - با استفاده از ID
  // ============================================

  useEffect(() => {
    const options: { value: string; label: string }[] = [];
    
    // Determine the active level we are checking (either new or edit form)
    const activeLevel = newBaseLevel || editBaseLevel;
    
    if (!activeLevel || orgLevels.length === 0) {
      setParentOptions(options);
      return;
    }

    const levelIndex = orgLevels.findIndex(l => l.name === activeLevel);
    
    if (levelIndex === 0) {
      options.push({ value: "", label: "بدون والد (ریشه)" });
      setParentOptions(options);
      return;
    }

    if (levelIndex > 0) {
      const parentLevelName = orgLevels[levelIndex - 1].name;
      const parentLayer = bases.filter((b) => b.level === parentLevelName && b.isActive === 1);
            
      if (parentLayer.length === 0) {
        options.push({ value: "", label: `لطفاً ابتدا لایه قبلی (${parentLevelName}) را ایجاد کنید` });
      } else {
        parentLayer.forEach((b) => {
          const grandParent = bases.find((p) => p.id === b.parentId);
          options.push({
            value: String(b.id),
            label: b.name + (grandParent ? ` (زیرمجموعه ${grandParent.name})` : ""),
          });
        });
      }
      setParentOptions(options);
      return;
    }

    setParentOptions(options);
  }, [newBaseLevel, editBaseLevel, bases, orgLevels]);

  // ============================================
  // عملیات یگان اصلی
  // ============================================

  const handleAddBase = async () => {
    if (!newBaseName.trim()) {
      toast.error("لطفاً نام یگان را وارد کنید.");
      return;
    }
    if (!newBaseLevel) {
      toast.error("لطفاً سطح سازمانی را انتخاب کنید.");
      return;
    }
    if (newBaseLevel !== (orgLevels[0]?.name || "") && !newBaseParentId) {
      toast.error(`لطفاً والد را برای ${getLevelLabel(newBaseLevel)} انتخاب کنید.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: newBaseName.trim(),
        location: newBaseLocation.trim() || null,
        level: newBaseLevel,
        parentId: newBaseParentId ? parseInt(newBaseParentId) : null,
        description: null,
      };

      const res = await(window.customFetch || window.fetch)("/api/org/bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`یگان "${newBaseName}" با موفقیت افزوده شد`);
        setNewBaseName("");
        setNewBaseLocation("");
        setNewBaseLevel("");
        setNewBaseParentId("");
        setIsAddingBase(false);
        await fetchData();
      } else {
        toast.error(data.error || "خطا در افزودن یگان");
      }
    } catch (error) {
      console.error(error);
      toast.error("خطا در اتصال به سرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBase = async (id: number) => {
    const base = bases.find((b) => b.id === id);
    if (!confirm(`آیا از حذف "${base?.name}" اطمینان دارید؟`)) return;

    try {
      const res = await(window.customFetch || window.fetch)(`/api/org/bases/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`یگان "${base?.name}" با موفقیت حذف شد`);
        await fetchData();
        if (selectedBaseId === id) setSelectedBaseId(null);
      } else {
        toast.error(data.error || "خطا در حذف یگان");
      }
    } catch (error) {
      console.error(error);
      toast.error("خطا در اتصال به سرور");
    }
  };

  const startEditBase = (base: Base) => {
    setEditingBaseId(base.id);
    setEditBaseName(base.name || "");
    setEditBaseLocation(base.location || "");
    setEditBaseLevel(base.level || "");
    setEditBaseParentId(base.parentId ? String(base.parentId) : "");
    setEditBaseIsActive(base.isActive ?? 1);
  };

  const cancelEditBase = () => {
    setEditingBaseId(null);
    setEditBaseName("");
    setEditBaseLocation("");
    setEditBaseLevel("");
    setEditBaseParentId("");
    setEditBaseIsActive(1);
  };

  const handleEditBase = async (id: number) => {
    if (!editBaseName.trim()) {
      toast.error("لطفاً نام یگان را وارد کنید.");
      return;
    }

    try {
      const payload = {
        name: editBaseName.trim(),
        location: editBaseLocation.trim() || null,
        level: editBaseLevel || null,
        parentId: editBaseParentId ? parseInt(editBaseParentId) : null,
        isActive: editBaseIsActive,
      };

      const res = await(window.customFetch || window.fetch)(`/api/org/bases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setEditingBaseId(null);
        cancelEditBase();
        await fetchData();
        toast.success("یگان با موفقیت ویرایش شد");
      } else {
        toast.error(data?.error || "خطا در ویرایش یگان");
      }
    } catch (error) {
      console.error(error);
      toast.error("خطا در اتصال به سرور");
    }
  };

  // ============================================
  // یگان جزء
  // ============================================

  const handleAddUnit = async () => {
    if (!newUnitName.trim()) {
      toast.error("لطفاً نام یگان جزء را وارد کنید.");
      return;
    }
    if (!selectedBaseId) {
      toast.error("لطفاً ابتدا یک یگان اصلی انتخاب کنید.");
      return;
    }
    if (!newUnitLevel) {
      toast.error("لطفاً سطح سازمانی را انتخاب کنید.");
      return;
    }

    try {
      const res = await(window.customFetch || window.fetch)("/api/org/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUnitName.trim(),
          baseId: selectedBaseId,
          level: newUnitLevel,
          parentId: null,
          description: null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`یگان جزء "${newUnitName}" با موفقیت افزوده شد`);
        setNewUnitName("");
        setNewUnitLevel("");
        setIsAddingUnit(false);
        await fetchData();
      } else {
        toast.error(data.error || "خطا در افزودن یگان جزء");
      }
    } catch (error) {
      console.error(error);
      toast.error("خطا در اتصال به سرور");
    }
  };

  const handleDeleteUnit = async (id: number) => {
    const unit = units.find((u) => u.id === id);
    if (!confirm(`آیا از حذف یگان جزء "${unit?.name}" اطمینان دارید؟`)) return;

    try {
      const res = await(window.customFetch || window.fetch)(`/api/org/units/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`یگان جزء "${unit?.name}" با موفقیت حذف شد`);
        await fetchData();
      } else {
        toast.error(data.error || "خطا در حذف یگان جزء");
      }
    } catch (error) {
      console.error(error);
      toast.error("خطا در اتصال به سرور");
    }
  };

  const startEditUnit = (unit: Unit) => {
    setEditingUnitId(unit.id);
    setEditUnitName(unit.name || "");
    setEditUnitLevel(unit.level || "");
  };

  const cancelEditUnit = () => {
    setEditingUnitId(null);
    setEditUnitName("");
    setEditUnitLevel("");
  };

  const handleEditUnit = async (id: number) => {
    if (!editUnitName.trim()) {
      toast.error("لطفاً نام یگان جزء را وارد کنید.");
      return;
    }

    try {
      const res = await(window.customFetch || window.fetch)(`/api/org/units/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editUnitName.trim(),
          level: editUnitLevel || null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setEditingUnitId(null);
        cancelEditUnit();
        await fetchData();
        toast.success("یگان جزء با موفقیت ویرایش شد");
      } else {
        toast.error(data?.error || "خطا در ویرایش یگان جزء");
      }
    } catch (error) {
      console.error(error);
      toast.error("خطا در اتصال به سرور");
    }
  };

  // ============================================
  // توابع کمکی
  // ============================================

  const toggleBase = (id: number) => {
    setExpandedBases((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const toggleUnit = (id: number) => {
    setExpandedUnits((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setExpandedBases(bases.map((b) => b.id));
    setExpandedUnits(units.map((u) => u.id));
  };
  const collapseAll = () => {
    setExpandedBases([]);
    setExpandedUnits([]);
  };

  const getLevelLabel = (level?: string | null) => {
    if (!level) return "تعیین نشده";
    const index = orgLevels.findIndex((l) => l.name === level);
    if (index === -1) return level;
    const persianNumbers = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم'];
    return `لایه ${persianNumbers[index] || (index + 1)} (${level})`;
  };

  const getLevelColor = (level?: string | null) => {
    if (!level) return "bg-gray-100 text-gray-600";
    const index = orgLevels.findIndex((l) => l.name === level);
    const colors = [
      'bg-red-100 text-red-700 border-red-200',
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-green-100 text-green-700 border-green-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-amber-100 text-amber-700 border-amber-200',
    ];
    return colors[index % colors.length] || "bg-gray-100 text-gray-600";
  };

  const levelOptions = orgLevels.map((l) => ({
    value: l.name,
    label: l.name,
  }));

  const filteredBases = bases.filter((base) =>
    base?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUnits = units.filter((unit) => {
    if (searchTerm) {
      return unit?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return unit?.baseId === selectedBaseId;
  });

  const rootBases = bases.filter((b) => b.parentId === null);

  // ============================================
  // بررسی دسترسی
  // ============================================

  if (user?.role !== "superadmin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Shield size={48} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-700">عدم دسترسی</h2>
        <p className="text-gray-400 mt-2">فقط مدیر کل به این بخش دسترسی دارد.</p>
      </div>
    );
  }

  // ============================================
  // رندر
  // ============================================

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200/50">
              <Network size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">ساختار سازمانی</h2>
              <p className="text-gray-500 text-sm mt-0.5">
                مدیریت سطوح سازمانی (لایه اول ← لایه دوم ← لایه سوم)
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg"><Building2 size={20} className="text-blue-600" /></div>
          <div><p className="text-xs text-gray-400">یگان‌های اصلی</p><p className="text-2xl font-bold text-gray-800">{bases.length}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-lg"><Users size={20} className="text-purple-600" /></div>
          <div><p className="text-xs text-gray-400">یگان‌های جزء</p><p className="text-2xl font-bold text-purple-600">{units.length}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg"><Layers size={20} className="text-amber-600" /></div>
          <div><p className="text-xs text-gray-400">سطوح سازمانی</p><p className="text-2xl font-bold text-amber-600">{orgLevels.length}</p></div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4">
        <div className="relative">
          <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="جستجو در یگان‌ها..."
            className="w-full pr-10 pl-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50/50 focus:bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RIGHT: یگان‌های اصلی */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
          <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue-600" />
              <h3 className="font-bold text-gray-800">یگان‌های اصلی</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{bases.length}</span>
            </div>
            {!isAddingBase && editingBaseId === null && (
              <button
                onClick={() => { setIsAddingBase(true); setNewBaseLevel(""); setNewBaseParentId(""); }}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} /> افزودن یگان
              </button>
            )}
            {(isAddingBase || editingBaseId !== null) && (
              <button onClick={() => { setIsAddingBase(false); cancelEditBase(); }} className="text-sm text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            )}
          </div>

          <div className="p-4 max-h-[500px] overflow-y-auto space-y-2">
            {/* فرم افزودن */}
            {isAddingBase && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-blue-700"><Plus size={16} /><span className="text-sm font-medium">ثبت یگان جدید</span></div>

                <select
                  value={newBaseLevel}
                  onChange={(e) => { setNewBaseLevel(e.target.value); setNewBaseParentId(""); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">انتخاب سطح...</option>
                  {orgLevels.slice(0, -1).map((l) => (<option key={l.name} value={l.name}>{getLevelLabel(l.name)}</option>))}
                </select>

                {newBaseLevel && newBaseLevel !== (orgLevels[0]?.name || "") && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">والد <span className="text-red-500">*</span></label>
                    <SearchableSelect
                      key={`parent-${newBaseLevel}-${bases.length}`}
                      options={parentOptions}
                      value={newBaseParentId}
                      onChange={(val) => setNewBaseParentId(val ? String(val) : "")}
                      placeholder={`انتخاب ${getLevelLabel(orgLevels[Math.max(0, orgLevels.findIndex(l => l.name === newBaseLevel) - 1)]?.name)}...`}
                    />
                    {parentOptions.length === 1 && parentOptions[0].value === "" && parentOptions[0].label.includes("لطفاً") && (
                      <p className="text-xs text-amber-500 mt-1">⚠️ {parentOptions[0].label}</p>
                    )}
                  </div>
                )}

                <input
                  type="text"
                  placeholder={`نام ${newBaseLevel ? getLevelLabel(newBaseLevel) : "یگان"}...`}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={newBaseName}
                  onChange={(e) => setNewBaseName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="موقعیت (اختیاری)..."
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={newBaseLocation}
                  onChange={(e) => setNewBaseLocation(e.target.value)}
                />

                <div className="flex gap-2">
                  <button onClick={handleAddBase} disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                    {isSubmitting ? <><RefreshCw size={14} className="animate-spin inline" /> در حال ذخیره...</> : <><Save size={14} /> ذخیره</>}
                  </button>
                  <button onClick={() => { setIsAddingBase(false); setNewBaseName(""); setNewBaseLocation(""); setNewBaseLevel(""); setNewBaseParentId(""); }} className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg text-sm transition-colors">انصراف</button>
                </div>
              </div>
            )}

            {/* فرم ویرایش */}
            {editingBaseId !== null && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-yellow-700"><Edit size={16} /><span className="text-sm font-medium">ویرایش یگان</span></div>

                <select value={editBaseLevel || ""} onChange={(e) => setEditBaseLevel(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-white">
                  <option value="">انتخاب سطح...</option>
                  {orgLevels.slice(0, -1).map((l) => <option key={l.name} value={l.name}>{getLevelLabel(l.name)}</option>)}
                </select>

                <SearchableSelect
                  options={parentOptions}
                  value={editBaseParentId || ""}
                  onChange={(val) => setEditBaseParentId(val ? String(val) : "")}
                  placeholder="انتخاب والد..."
                />

                <input type="text" placeholder="نام یگان..." className="w-full px-3 py-2 border border-yellow-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-white" value={editBaseName} onChange={(e) => setEditBaseName(e.target.value)} />
                <input type="text" placeholder="موقعیت (اختیاری)..." className="w-full px-3 py-2 border border-yellow-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-white" value={editBaseLocation} onChange={(e) => setEditBaseLocation(e.target.value)} />

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={editBaseIsActive === 1} onChange={(e) => setEditBaseIsActive(e.target.checked ? 1 : 0)} className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500" /> فعال
                  </label>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleEditBase(editingBaseId)} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"><Check size={14} /> ذخیره تغییرات</button>
                  <button onClick={cancelEditBase} className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg text-sm transition-colors">انصراف</button>
                </div>
              </div>
            )}

            {/* لیست */}
            {loading ? (
              <div className="text-center py-8 text-gray-400"><RefreshCw size={24} className="animate-spin mx-auto mb-2" /><p className="text-sm">در حال بارگذاری...</p></div>
            ) : filteredBases.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><Building2 size={32} className="mx-auto mb-2 text-gray-300" /><p className="text-sm">هیچ یگانی ثبت نشده است</p></div>
            ) : (
              filteredBases.map((base) => {
                const isSelected = selectedBaseId === base.id;
                return (
                  <div key={base.id} onClick={() => setSelectedBaseId(base.id)} className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${isSelected ? "bg-blue-50 border border-blue-200 shadow-sm" : "border border-gray-100 hover:border-blue-200 hover:shadow-sm"}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 rounded-lg ${isSelected ? "bg-blue-100" : "bg-gray-100"}`}><Building2 size={16} className={isSelected ? "text-blue-600" : "text-gray-400"} /></div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? "text-blue-800" : "text-gray-800"}`}>{base.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {base.location && <div className="flex items-center gap-1 text-xs text-gray-400"><MapPin size={12} /><span className="truncate">{base.location}</span></div>}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${getLevelColor(base.level)}`}>{getLevelLabel(base.level)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); startEditBase(base); }} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={15} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteBase(base.id); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* LEFT: یگان‌های جزء */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
          <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-purple-600" />
              <h3 className="font-bold text-gray-800">یگان‌های جزء</h3>
              {selectedBaseId && !searchTerm && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{filteredUnits.length}</span>}
            </div>
            {selectedBaseId && !isAddingUnit && editingUnitId === null && !searchTerm && (
              <button onClick={() => setIsAddingUnit(true)} className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"><Plus size={14} /> افزودن یگان جزء</button>
            )}
            {(isAddingUnit || editingUnitId !== null) && (
              <button onClick={() => { setIsAddingUnit(false); cancelEditUnit(); }} className="text-sm text-gray-500 hover:text-gray-700"><X size={18} /></button>
            )}
          </div>

          <div className="p-4 max-h-[500px] overflow-y-auto">
            {!selectedBaseId && !searchTerm ? (
              <div className="text-center py-12 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><ArrowRight size={24} className="text-gray-300" /></div>
                <p className="text-sm font-medium text-gray-600">یک یگان اصلی را انتخاب کنید</p>
                <p className="text-xs text-gray-400 mt-1">برای مشاهده و مدیریت یگان‌های جزء آن</p>
              </div>
            ) : (
              <>
                {isAddingUnit && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-purple-700"><Plus size={16} /><span className="text-sm font-medium">ثبت یگان جزء جدید</span></div>
                    <div className="text-xs text-gray-500">یگان اصلی: <span className="font-bold text-gray-700">{bases.find((b) => b.id === selectedBaseId)?.name}</span></div>
                    <select value={newUnitLevel} onChange={(e) => setNewUnitLevel(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white">
                      <option value="">انتخاب سطح...</option>
                      {orgLevels.slice(-1).map((l) => <option key={l.name} value={l.name}>{getLevelLabel(l.name)}</option>)}
                    </select>
                    <input type="text" placeholder="نام یگان جزء..." className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={handleAddUnit} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"><Save size={14} /> ذخیره</button>
                      <button onClick={() => { setIsAddingUnit(false); setNewUnitName(""); setNewUnitLevel(""); }} className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg text-sm transition-colors">انصراف</button>
                    </div>
                  </div>
                )}

                {editingUnitId !== null && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-yellow-700"><Edit size={16} /><span className="text-sm font-medium">ویرایش یگان جزء</span></div>
                    <input type="text" placeholder="نام یگان جزء..." className="w-full px-3 py-2 border border-yellow-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-white" value={editUnitName} onChange={(e) => setEditUnitName(e.target.value)} />
                    <select value={editUnitLevel || ""} onChange={(e) => setEditUnitLevel(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-white">
                      <option value="">انتخاب سطح...</option>
                      {orgLevels.slice(-1).map((l) => <option key={l.name} value={l.name}>{getLevelLabel(l.name)}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditUnit(editingUnitId)} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"><Check size={14} /> ذخیره تغییرات</button>
                      <button onClick={cancelEditUnit} className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg text-sm transition-colors">انصراف</button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {loading ? (
                    <div className="text-center py-6 text-gray-400"><RefreshCw size={20} className="animate-spin mx-auto" /></div>
                  ) : filteredUnits.length === 0 ? (
                    <div className="text-center py-8 text-gray-400"><Users size={32} className="mx-auto mb-2 text-gray-300" /><p className="text-sm">هیچ یگان جزء ثبت نشده است</p></div>
                  ) : (
                    filteredUnits.map((unit) => {
                      const isEditing = editingUnitId === unit.id;
                      return (
                        <div key={unit.id} className={`flex items-center justify-between p-3 border rounded-lg transition-colors group ${isEditing ? "border-yellow-300 bg-yellow-50" : "border-gray-100 hover:bg-gray-50"}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                            <span className="text-sm font-medium text-gray-700">{unit.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${getLevelColor(unit.level)}`}>{getLevelLabel(unit.level)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {!isEditing && <button onClick={() => { setEditingUnitId(unit.id); setEditUnitName(unit.name); setEditUnitLevel(unit.level || ""); }} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Edit size={14} /></button>}
                            <button onClick={() => { if (!isEditing) handleDeleteUnit(unit.id); }} className={`p-1.5 rounded-lg transition-colors ${isEditing ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100"}`} disabled={isEditing}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Tree View - با نمایش کامل یگان‌های جزء (Units) */}
      {/* ============================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="p-3 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-2"><FolderTree size={18} className="text-amber-600" /><h3 className="font-bold text-gray-800">نمایش درختی سازمان</h3></div>
          <div className="flex items-center gap-1">
            <button onClick={expandAll} className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"><GitBranch size={13} /> باز کردن همه</button>
            <button onClick={collapseAll} className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"><ListTree size={13} /> بستن همه</button>
          </div>
        </div>

        <div className="p-3 max-h-[500px] overflow-y-auto bg-gray-50/50">
          {loading ? (
            <div className="text-center py-8 text-gray-400"><RefreshCw size={24} className="animate-spin mx-auto mb-2" /><p>در حال بارگذاری...</p></div>
          ) : rootBases.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><FolderTree size={48} className="mx-auto mb-4 text-gray-300" /><p className="text-lg font-medium text-gray-600">هیچ داده‌ای یافت نشد</p><p className="text-sm mt-1">ابتدا یک یگان اصلی ایجاد کنید.</p></div>
          ) : (
            <div className="space-y-0.5">
              {rootBases.map((root) => {
                const isExpanded = expandedBases.includes(root.id);
                const childBases = bases.filter((b) => b.parentId === root.id);
                const childUnits = units.filter((u) => u.baseId === root.id);

                return (
                  <div key={root.id} className="select-none">
                    {/* ریشه (سطح آجا) */}
                    <div className={`flex items-center py-1.5 px-2.5 rounded-lg hover:bg-red-50/50 cursor-pointer transition-colors ${isExpanded ? "text-red-700" : "text-gray-700"}`} onClick={() => toggleBase(root.id)}>
                      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-gray-400">
                        {(childBases.length > 0 || childUnits.length > 0) ? (isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronLeft size={14} className="text-gray-500" />) : <span className="w-3"></span>}
                      </span>
                      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {isExpanded ? <FolderOpen size={18} className="text-red-500" /> : <Folder size={18} className="text-red-400" />}
                      </span>
                      <span className="text-sm font-medium mr-1">{root.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full mr-2 ${getLevelColor(root.level)}`}>{getLevelLabel(root.level)}</span>
                      {(childBases.length > 0 || childUnits.length > 0) && (
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full mr-1">
                          {childBases.length + childUnits.length}
                        </span>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="relative pr-1">
                        <div className="absolute right-[18px] top-0 bottom-0 w-px bg-gray-300/50"></div>
                        
                        {/* نمایش یگان‌های جزء مستقیم زیر ریشه */}
                        {childUnits.map((unit, unitIndex) => {
                          const isLast = unitIndex === childUnits.length - 1 && childBases.length === 0;
                          return (
                            <div key={`unit-${unit.id}`} className="flex items-center py-1.5 px-2.5 rounded-lg hover:bg-purple-50/50 cursor-pointer transition-colors relative group" style={{ paddingRight: "20px" }}>
                              <div className={`absolute right-[18px] top-1/2 w-[14px] h-px bg-gray-300/50 ${isLast ? "h-[1px]" : ""}`}></div>
                              {isLast && <div className="absolute right-[18px] top-0 bottom-1/2 w-px bg-gray-300/50"></div>}
                              <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2">
                                <Users size={16} className="text-purple-400" />
                              </span>
                              <span className="text-sm text-gray-700">{unit.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full mr-2 ${getLevelColor(unit.level)}`}>{getLevelLabel(unit.level)}</span>
                            </div>
                          );
                        })}

                        {/* نمایش یگان‌های فرزند (سطح نیرو) */}
                        {childBases.map((child, childIndex) => {
                          const isLastChild = childIndex === childBases.length - 1;
                          const grandChildren = bases.filter((b) => b.parentId === child.id);
                          const grandUnits = units.filter((u) => u.baseId === child.id);
                          const isChildExpanded = expandedBases.includes(child.id);

                          return (
                            <div key={child.id}>
                              <div className={`flex items-center py-1.5 px-2.5 rounded-lg hover:bg-blue-50/50 cursor-pointer transition-colors relative group ${isChildExpanded ? "text-blue-700" : "text-gray-700"}`} style={{ paddingRight: "20px" }} onClick={() => toggleBase(child.id)}>
                                <div className={`absolute right-[18px] top-1/2 w-[14px] h-px bg-gray-300/50 ${isLastChild ? "h-[1px]" : ""}`}></div>
                                {isLastChild && <div className="absolute right-[18px] top-0 bottom-1/2 w-px bg-gray-300/50"></div>}
                                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2">
                                  {(grandChildren.length > 0 || grandUnits.length > 0) ? (isChildExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronLeft size={14} className="text-gray-500" />) : <span className="w-3"></span>}
                                </span>
                                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                  {isChildExpanded ? <FolderOpen size={18} className="text-blue-500" /> : <Folder size={18} className="text-blue-400" />}
                                </span>
                                <span className="text-sm mr-1">{child.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full mr-2 ${getLevelColor(child.level)}`}>{getLevelLabel(child.level)}</span>
                                {(grandChildren.length > 0 || grandUnits.length > 0) && (
                                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full mr-1">
                                    {grandChildren.length + grandUnits.length}
                                  </span>
                                )}
                              </div>

                              {isChildExpanded && (
                                <div className="relative pr-1">
                                  <div className="absolute right-[36px] top-0 bottom-0 w-px bg-gray-300/50"></div>
                                  
                                  {/* یگان‌های جزء مستقیم زیر این یگان */}
                                  {grandUnits.map((unit, unitIndex) => {
                                    const isLast = unitIndex === grandUnits.length - 1 && grandChildren.length === 0;
                                    return (
                                      <div key={`unit-${unit.id}`} className="flex items-center py-1.5 px-2.5 rounded-lg hover:bg-purple-50/50 cursor-pointer transition-colors relative group" style={{ paddingRight: "38px" }}>
                                        <div className={`absolute right-[36px] top-1/2 w-[14px] h-px bg-gray-300/50 ${isLast ? "h-[1px]" : ""}`}></div>
                                        {isLast && <div className="absolute right-[36px] top-0 bottom-1/2 w-px bg-gray-300/50"></div>}
                                        <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2">
                                          <Users size={16} className="text-purple-400" />
                                        </span>
                                        <span className="text-sm text-gray-700">{unit.name}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full mr-2 ${getLevelColor(unit.level)}`}>{getLevelLabel(unit.level)}</span>
                                      </div>
                                    );
                                  })}

                                  {/* یگان‌های فرزند (سطح رده) */}
                                  {grandChildren.map((grandChild, grandIndex) => {
                                    const isGrandLast = grandIndex === grandChildren.length - 1;
                                    const childUnits = units.filter((u) => u.baseId === grandChild.id);
                                    const isGrandExpanded = expandedBases.includes(grandChild.id);

                                    return (
                                      <div key={grandChild.id}>
                                        <div className={`flex items-center py-1.5 px-2.5 rounded-lg hover:bg-green-50/50 cursor-pointer transition-colors relative group ${isGrandExpanded ? "text-green-700" : "text-gray-700"}`} style={{ paddingRight: "38px" }} onClick={() => toggleBase(grandChild.id)}>
                                          <div className={`absolute right-[36px] top-1/2 w-[14px] h-px bg-gray-300/50 ${isGrandLast ? "h-[1px]" : ""}`}></div>
                                          {isGrandLast && <div className="absolute right-[36px] top-0 bottom-1/2 w-px bg-gray-300/50"></div>}
                                          <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2">
                                            {childUnits.length > 0 ? (isGrandExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronLeft size={14} className="text-gray-500" />) : <span className="w-3"></span>}
                                          </span>
                                          <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                            {isGrandExpanded ? <FolderOpen size={18} className="text-green-500" /> : <Folder size={18} className="text-green-400" />}
                                          </span>
                                          <span className="text-sm mr-1">{grandChild.name}</span>
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full mr-2 ${getLevelColor(grandChild.level)}`}>{getLevelLabel(grandChild.level)}</span>
                                          {childUnits.length > 0 && (
                                            <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full mr-1">{childUnits.length}</span>
                                          )}
                                        </div>

                                        {isGrandExpanded && childUnits.length > 0 && (
                                          <div className="relative pr-1">
                                            <div className="absolute right-[54px] top-0 bottom-0 w-px bg-gray-300/50"></div>
                                            {childUnits.map((unit, unitIndex) => {
                                              const isUnitLast = unitIndex === childUnits.length - 1;
                                              return (
                                                <div key={`unit-${unit.id}`} className="flex items-center py-1.5 px-2.5 rounded-lg hover:bg-purple-50/50 cursor-pointer transition-colors relative group" style={{ paddingRight: "56px" }}>
                                                  <div className={`absolute right-[54px] top-1/2 w-[14px] h-px bg-gray-300/50 ${isUnitLast ? "h-[1px]" : ""}`}></div>
                                                  {isUnitLast && <div className="absolute right-[54px] top-0 bottom-1/2 w-px bg-gray-300/50"></div>}
                                                  <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2">
                                                    <Users size={16} className="text-purple-400" />
                                                  </span>
                                                  <span className="text-sm text-gray-700">{unit.name}</span>
                                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full mr-2 ${getLevelColor(unit.level)}`}>{getLevelLabel(unit.level)}</span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="تایید حذف"
        message={confirmModal.message}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => {
          if (confirmModal.action) {
            confirmModal.action();
          }
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
      />
    </div>
  );
}
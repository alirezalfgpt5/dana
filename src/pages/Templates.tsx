// src/pages/Templates.tsx
// مدیریت قالب‌ها - با تفکیک flat و tree

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Plus, Edit, Trash2, Search, X, FolderTree, Tag, Info, RefreshCw, ChevronDown, ChevronLeft, Folder, FolderOpen } from 'lucide-react';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import api from '../services/api';

interface Template {
  id: number;
  type: string;
  title: string;
  parentId: number | null;
  description: string | null;
  isActive: number;
  sortOrder: number;
  metadata: any;
  children?: Template[];
}

export function TemplatesManagement() {
  const { user } = useAuthStore();
  
  // ============================================
  // دو state جداگانه
  // ============================================
  const [flatTemplates, setFlatTemplates] = useState<Template[]>([]);
  const [treeTemplates, setTreeTemplates] = useState<Template[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteToastIdRef = useRef<string | null>(null);
  
  // State برای باز/بسته شدن
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [expandedRightItems, setExpandedRightItems] = useState<Set<number>>(new Set());
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'type' | 'template'>('type');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    type: '',
    rootTypeId: '',
    title: '',
    parentId: '',
    description: ''
  });
  
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  // ============================================
  // بارگذاری داده
  // ============================================

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/api/templates');
      
      const validData = validateData(Array.isArray(data) ? data : []);
      setFlatTemplates(validData);
      const tree = buildTree(validData);
      setTreeTemplates(tree);
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ۱. اعتبارسنجی داده‌ها
  // ============================================

  const validateData = (data: any[]): any[] => {
    const ids = new Set(data.map(item => item.id));
    
    return data.filter(item => {
      if (item.parentId === null) return true;
      if (ids.has(item.parentId)) return true;
      
      console.warn(`Template ${item.id} has invalid parentId ${item.parentId}, setting to null`);
      item.parentId = null;
      return true;
    });
  };

  // ============================================
  // ۲. ساخت درخت از داده‌های flat
  // ============================================

  const buildTree = (data: any[]): Template[] => {
    const map = new Map<number, Template>();
    const roots: Template[] = [];

    data.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });

    data.forEach(item => {
      const currentNode = map.get(item.id);
      if (!currentNode) return;

      if (item.parentId && item.parentId !== item.id && map.has(item.parentId)) {
        const parent = map.get(item.parentId);
        if (parent && parent.id !== currentNode.id) {
          parent.children!.push(currentNode);
        } else {
          roots.push(currentNode);
        }
      } else if (item.parentId === null || item.parentId === undefined) {
        roots.push(currentNode);
      } else {
        console.warn(`Node ${item.id} has invalid parentId ${item.parentId}, treating as root`);
        roots.push(currentNode);
      }
    });

    roots.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return roots;
  };

  // ============================================
  // ۳. دریافت تمام فرزندان (از flatTemplates)
  // ============================================

  const toggleExpand = (id: number) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleGroup = (id: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleRightItem = (id: number) => {
    setExpandedRightItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // ============================================
  // توابع مدیریت فرم
  // ============================================

  const handleAddType = () => {
    setFormMode('type');
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      type: '',
      rootTypeId: '',
      title: '',
      parentId: '',
      description: ''
    });
    setShowForm(true);
  };

  const handleAddTemplate = (parentId: number | null = null, _type: string = '') => {
    setFormMode('template');
    setIsEditing(false);
    setEditingId(null);
    
    setFormData({
      type: '',
      rootTypeId: parentId !== null ? parentId.toString() : '',
      title: '',
      parentId: parentId !== null ? parentId.toString() : '',
      description: ''
    });
    setShowForm(true);
  };

  const handleEdit = (template: Template) => {
    const isType = template.parentId === null;
    setFormMode(isType ? 'type' : 'template');
    setIsEditing(true);
    setEditingId(template.id);
    
    setFormData({
      type: isType ? template.type : '',
      rootTypeId: isType ? '' : template.parentId?.toString() || '',
      title: template.title || '',
      parentId: isType ? '' : template.parentId?.toString() || '',
      description: template.description || ''
    });
    setShowForm(true);
  };

  // ============================================
  // تابع حذف - اصلاح شده با جلوگیری از دو بار اجرا
  // ============================================

  const handleDelete = (template: Template) => {
    // جلوگیری از کلیک همزمان
    if (isDeleting) {
      console.log('⏳ [DELETE] Already deleting, ignoring...');
      return;
    }

    if (template.children && template.children.length > 0) {
      toast.error(`این قالب دارای ${template.children.length} زیرمجموعه است و قابل حذف نیست`);
      return;
    }
    
    const name = template.parentId === null ? template.type : template.title;
    
    // اگر توست قبلی وجود دارد، آن را dismiss کن
    if (deleteToastIdRef.current) {
      toast.dismiss(deleteToastIdRef.current);
      deleteToastIdRef.current = null;
    }
    
    // نمایش توست تایید
    const toastId = toast((t) => {
      deleteToastIdRef.current = t.id;
      
      return (
        <div className="flex flex-col gap-2" dir="rtl">
          <span>آیا از حذف "{name}" اطمینان دارید؟</span>
          <div className="flex justify-end gap-2 mt-2">
            <button 
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              onClick={async () => {
                // جلوگیری از دو بار کلیک
                if (isDeleting) return;
                
                setIsDeleting(true);
                toast.dismiss(t.id);
                deleteToastIdRef.current = null;
                
                try {
                  await api.delete(`/api/templates/${template.id}`);
                  toast.success('قالب با موفقیت حذف شد');
                  await fetchData();
                } catch (error: any) {
                  console.error('❌ [DELETE] Exception:', error);
                  toast.error(error.message || 'خطا در ارتباط با سرور');
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              حذف
            </button>
            <button 
              className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300 text-gray-800 transition-colors"
              onClick={() => {
                toast.dismiss(t.id);
                deleteToastIdRef.current = null;
              }}
            >
              انصراف
            </button>
          </div>
        </div>
      );
    }, { 
      duration: Infinity,
      id: `delete-${template.id}-${Date.now()}`
    });
    
    deleteToastIdRef.current = toastId;
  };

  const getDescendantIds = useCallback((parentId: number) => {
    let ids: number[] = [];
    const children = flatTemplates.filter(t => t.parentId === parentId);
    children.forEach(c => {
      ids.push(c.id);
      ids = ids.concat(getDescendantIds(c.id));
    });
    return ids;
  }, [flatTemplates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formMode === 'type') {
      if (!formData.type.trim()) {
        toast.error('نوع قالب الزامی است');
        return;
      }
      const existing = flatTemplates.find(t => t.type === formData.type.trim() && t.parentId === null);
      if (existing && (!isEditing || existing.id !== editingId)) {
        toast.error(`نوع قالب "${formData.type}" قبلاً ثبت شده است`);
        return;
      }
    } else {
      if (!formData.rootTypeId || !formData.title.trim()) {
        toast.error('نوع و عنوان قالب الزامی است');
        return;
      }
      
      if (formData.parentId) {
        const parentId = parseInt(formData.parentId);
        const editingNode = isEditing ? flatTemplates.find(t => t.id === editingId) : null;
        
        if (editingNode) {
          const descendants = getDescendantIds(editingNode.id);
          if (descendants.includes(parentId)) {
            toast.error('نمی‌توانید زیرمجموعه را به عنوان والد انتخاب کنید (ایجاد حلقه)');
            return;
          }
          if (parentId === editingNode.id) {
            toast.error('نمی‌توانید خودتان را به عنوان والد انتخاب کنید');
            return;
          }
        }
      }
    }

    try {
      const url = isEditing ? `/api/templates/${editingId}` : '/api/templates';
      
      let payloadType = formData.type.trim();
      let payloadTitle = formData.title.trim();
      let payloadParentId: number | null = null;
      
      if (formMode === 'type') {
        payloadTitle = formData.type.trim();
      } else {
        const rootNode = flatTemplates.find(t => t.id.toString() === formData.rootTypeId);
        payloadType = rootNode ? rootNode.type : '';
        payloadParentId = parseInt(formData.rootTypeId);
      }
      
      const payload = {
        type: payloadType,
        title: payloadTitle,
        parentId: payloadParentId,
        description: formData.description || null
      };
      
      if (isEditing) {
        await api.put(url, payload);
      } else {
        await api.post(url, payload);
      }

      toast.success(isEditing ? 'با موفقیت ویرایش شد' : 'با موفقیت اضافه شد');
      setShowForm(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ارتباط با سرور');
    }
  };

  // ============================================
  // رندر درخت با جلوگیری از Cycle (با treeTemplates)
  // ============================================

  const renderTree = (nodes: Template[], level: number = 0, visited: Set<number> = new Set()) => {
    return (
      <div className="space-y-2">
        {nodes.map(node => {
          if (visited.has(node.id)) {
            return (
              <div key={node.id} className="p-2 text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg">
                ⚠️ خطا: Cycle detected for "{node.title}"
              </div>
            );
          }

          const isType = node.parentId === null;
          const displayName = isType ? node.type : node.title;
          const hasChildren = node.children && node.children.length > 0;
          const nextVisited = new Set(visited);
          nextVisited.add(node.id);
          
          return (
            <div key={node.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div 
                className={`flex items-center justify-between p-3 transition-colors ${
                  level === 0 ? 'bg-gray-50/50' : ''
                }`}
                style={{ paddingRight: `${level * 1.5 + 1}rem` }}
              >
                <div className="flex items-center gap-3">
                  {hasChildren ? (
                    <button
                      onClick={() => toggleExpand(node.id)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-500"
                    >
                      {expandedNodes.has(node.id) ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                    </button>
                  ) : (
                    <div className="w-6" />
                  )}
                  
                  {isType ? (
                    <FolderTree size={18} className="text-blue-500" />
                  ) : (
                    <FileText size={18} className="text-gray-400" />
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isType ? 'text-blue-700' : 'text-gray-800'}`}>
                        {displayName}
                      </span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                        {node.type}
                      </span>
                    </div>
                    {node.description && (
                      <p className="text-xs text-gray-500 mt-1">{node.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isType && (
                    <button
                      onClick={() => handleAddTemplate(node.id, node.type)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg tooltip"
                      title="افزودن قالب به این نوع"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(node)}
                    className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg tooltip"
                    title="ویرایش"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(node)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg tooltip"
                    title="حذف"
                    disabled={isDeleting}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {expandedNodes.has(node.id) && hasChildren && (
                <div className="border-t border-gray-100 p-2 bg-gray-50/30">
                  {renderTree(node.children!, level + 1, nextVisited)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // رندر سمت راست (با treeTemplates)
  // ============================================

  const renderRightSide = () => {
    const types = treeTemplates.filter(t => t.parentId === null);

    if (types.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Tag size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">هیچ نوع قالبی تعریف نشده است</p>
          <button
            onClick={handleAddType}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} className="inline ml-1" />
            افزودن نوع قالب
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {types.map(type => {
          const isExpanded = expandedGroups.has(type.id);
          const children = type.children || [];

          return (
            <div key={type.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              <div
                onClick={() => toggleGroup(type.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white hover:bg-gray-100 transition-colors border-b border-gray-100 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <FolderOpen size={16} className="text-blue-500" />
                  ) : (
                    <Folder size={16} className="text-blue-400" />
                  )}
                  <span className="font-bold text-gray-700">{type.type}</span>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    {children.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddTemplate(type.id, type.type);
                    }}
                    className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title={`افزودن قالب به ${type.type}`}
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(type);
                    }}
                    className="p-1 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                    title="ویرایش"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(type);
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="حذف"
                    disabled={isDeleting}
                  >
                    <Trash2 size={14} />
                  </button>
                  {isExpanded ? (
                    <ChevronDown size={18} className="text-gray-400" />
                  ) : (
                    <ChevronLeft size={18} className="text-gray-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-2 space-y-0.5">
                  {children.length > 0 ? (
                    children.map(child => (
                      <RightTreeNode
                        key={child.id}
                        node={child}
                        expandedItems={expandedRightItems}
                        onToggle={toggleRightItem}
                        onAdd={handleAddTemplate}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        level={0}
                        visited={new Set()}
                      />
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-gray-400">
                      <button
                        onClick={() => handleAddTemplate(type.id, type.type)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        + افزودن قالب جدید به {type.type}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // RightTreeNode با جلوگیری از Cycle
  // ============================================

  const RightTreeNode = ({ 
    node, 
    expandedItems, 
    onToggle, 
    onAdd, 
    onEdit, 
    onDelete,
    level,
    visited = new Set<number>()
  }: { 
    node: Template; 
    expandedItems: Set<number>; 
    onToggle: (id: number) => void; 
    onAdd: (parentId: number | null, type: string) => void; 
    onEdit: (template: Template) => void; 
    onDelete: (template: Template) => void; 
    level: number;
    visited?: Set<number>;
  }) => {
    if (visited.has(node.id)) {
      return (
        <div className="p-2 text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg mr-6">
          ⚠️ Cycle detected for "{node.title}"
        </div>
      );
    }

    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedItems.has(node.id);
    const nextVisited = new Set(visited);
    nextVisited.add(node.id);

    return (
      <div>
        <div 
          className={`flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200 cursor-pointer ${
            level > 0 ? 'mr-6' : ''
          }`}
          style={{ marginRight: `${level * 16}px` }}
          onClick={() => {
            if (hasChildren) {
              onToggle(node.id);
            }
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasChildren ? (
              <span className="p-0.5 text-gray-400 flex-shrink-0">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
              </span>
            ) : (
              <span className="w-4 flex-shrink-0" />
            )}
            
            <FileText size={14} className="text-gray-400 flex-shrink-0" />
            
            <span className="text-sm text-gray-700 truncate">{node.title}</span>
            
            {node.description && (
              <span className="text-[10px] text-gray-400 truncate hidden sm:inline">
                - {node.description}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onEdit(node)}
              className="p-1 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
              title="ویرایش"
            >
              <Edit size={13} />
            </button>
            <button
              onClick={() => onDelete(node)}
              className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="حذف"
              disabled={isDeleting}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="space-y-0.5">
            {node.children!.map(child => (
              <RightTreeNode
                key={child.id}
                node={child}
                expandedItems={expandedItems}
                onToggle={onToggle}
                onAdd={onAdd}
                onEdit={onEdit}
                onDelete={onDelete}
                level={level + 1}
                visited={nextVisited}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // رندر سمت چپ (با treeTemplates)
  // ============================================

  const renderLeftSide = () => {
    if (!searchTerm.trim()) {
      return (
        <div className="text-center py-12 text-gray-400">
          <Search size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm">برای جستجو در درخت کامل، عبارتی وارد کنید</p>
          <p className="text-xs text-gray-400 mt-1">در کادر جستجو عبارت مورد نظر را وارد کنید</p>
        </div>
      );
    }

    const searchLower = searchTerm.toLowerCase();
    
    const filterTree = (nodes: Template[]): Template[] => {
      const result: Template[] = [];
      
      for (const node of nodes) {
        const matches = 
          node.title?.toLowerCase().includes(searchLower) ||
          node.type?.toLowerCase().includes(searchLower);
        
        const filteredChildren = node.children ? filterTree(node.children) : [];
        
        if (matches || filteredChildren.length > 0) {
          result.push({
            ...node,
            children: filteredChildren
          });
        }
      }
      
      return result;
    };

    const filteredTree = filterTree(treeTemplates);

    if (filteredTree.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          <Search size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm">نتیجه‌ای برای "{searchTerm}" یافت نشد</p>
        </div>
      );
    }

    return renderTree(filteredTree);
  };

  // ============================================
  // دریافت والدهای مجاز برای فرم (از flatTemplates)
  // ============================================

  // ============================================
  // بررسی دسترسی
  // ============================================

  if (user?.role !== 'superadmin') {
    return (
      <div className="p-8 text-center text-gray-500">
        شما به این بخش دسترسی ندارید.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-600" />
            مدیریت قالب‌ها
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            تعریف انواع قالب و قالب‌های زیرمجموعه
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="p-2 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
            title="به‌روزرسانی"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => handleAddTemplate()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium"
          >
            <Plus size={20} />
            قالب جدید
          </button>
          <button
            onClick={handleAddType}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
          >
            <Plus size={20} />
            نوع قالب جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* سمت راست - گروه‌بندی */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Tag size={18} className="text-blue-500" />
              انواع قالب‌ها
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {flatTemplates.filter(t => t.parentId === null).length}
              </span>
            </h3>
            
            {loading ? (
              <div className="text-center py-8 text-gray-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                <p className="text-sm">در حال بارگذاری...</p>
              </div>
            ) : (
              renderRightSide()
            )}
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h4 className="font-bold text-blue-800 text-sm flex items-center gap-1.5 mb-2">
              <Info size={16} />
              ساختار قالب‌ها
            </h4>
            <ul className="text-xs text-blue-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">📁</span>
                <span><strong>نوع قالب:</strong> دسته‌بندی اصلی (مثل سیاستی، راهبردی)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">📄</span>
                <span><strong>قالب:</strong> زیرمجموعه نوع قالب (مثل سند چشم‌انداز، بروشور)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">📂</span>
                <span>هر قالب می‌تواند زیرمجموعه‌های بیشتری داشته باشد</span>
              </li>
            </ul>
          </div>
        </div>

        {/* سمت چپ - درخت کامل (فقط جستجو) */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="جستجو در درخت قالب‌ها..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {loading ? '...' : `${flatTemplates.length} قالب`}
              </span>
            </div>
            
            <div className="p-4 bg-gray-50/50 min-h-[400px]">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <RefreshCw className="animate-spin text-gray-400" size={24} />
                </div>
              ) : (
                renderLeftSide()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-800">
                  {isEditing ? 'ویرایش' : formMode === 'type' ? 'نوع قالب جدید' : 'قالب جدید'}
                </h3>
                <p className="text-xs text-gray-500">
                  {formMode === 'type' ? 'ایجاد یک نوع قالب جدید' : 'ایجاد قالب زیرمجموعه'}
                </p>
              </div>
              <button 
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formMode === 'type' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نام نوع قالب <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="مثال: سیاستی، راهبردی، آموزشی"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
                      placeholder="توضیحات اختیاری..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نوع قالب <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.rootTypeId}
                      onChange={e => setFormData({...formData, rootTypeId: e.target.value, parentId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                      disabled={isEditing}
                    >
                      <option value="">انتخاب نوع...</option>
                      {flatTemplates.filter(t => t.parentId === null).map(t => (
                        <option key={t.id} value={t.id}>{t.type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      عنوان قالب <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="مثال: سند چشم‌انداز، بروشور"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
                      placeholder="توضیحات اختیاری..."
                    />
                  </div>
                </>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
                >
                  {isEditing ? 'ذخیره تغییرات' : 'ایجاد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatesManagement;
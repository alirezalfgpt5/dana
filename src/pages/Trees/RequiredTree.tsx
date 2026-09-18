// src/pages/Trees/RequiredTree.tsx
// صفحه مدیریت درختواره دانشی مورد نیاز - 

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTree } from '../../hooks/useTree';
import { useAuthStore, useUIStore } from '../../store';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { 
  Plus, Copy, Download, Trash2, Search, Edit2, X, 
  Eye, EyeOff, GitBranch, HelpCircle, RefreshCw, 
  Maximize2, Minimize2 
} from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import toast from 'react-hot-toast';
import { useSimulatedFullscreen } from '../../hooks/useSimulatedFullscreen';

// کامپوننت‌ها
import { TreeHelp } from './components/TreeHelp';
import { TreeStats } from './components/TreeStats';
import api from '../../services/api';
import { TreeModal } from './modals/TreeModal';
import { NodeModal } from './modals/NodeModal';
import { TemplateModal } from './modals/TemplateModal';
import { useTreeData } from './hooks/useTreeData';
import { LEVELS, LEVEL_ORDER } from './constants/treeLevels';
import { TreeVisualization } from '../../components/trees/TreeVisualization';
import { TreeLevelsHelp } from './components/TreeLevelsHelp';


export function RequiredTree() {
  const navigate = useNavigate();
  const {
    tree,
    trees,
    nodes,
    templates,
    loading,
    fetchTrees,
    fetchTree,
    fetchTemplates,
    createTree,
    updateTree,
    deleteTree,
    copyTree,
    addNode,
    updateNode,
    deleteNode,
    exportTree,
  } = useTree();

  const { periods, bases, units, orgLevels, fetchPeriods, fetchOrgData } = useTreeData();

  // Refs
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // State
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeNode, setActiveNode] = useState<any>(null);
  const [showHelp, setShowHelp] = useState(false);
      
  // Modal states
  const [showTreeModal, setShowTreeModal] = useState(false);
  const { user } = useAuthStore();
  const [isCloning, setIsCloning] = useState(false);

  const handleCloneTree = async () => {
    if (!tree?.id) return;
    try {
      setIsCloning(true);
      const res = await api.post(`/trees/${tree?.id}/clone`);
      toast.success(res.data.message || 'نسخه جدید با موفقیت ایجاد شد');
      fetchTrees();
    } catch (e) {
      toast.error('خطا در ایجاد نسخه');
    } finally {
      setIsCloning(false);
    }
  };

  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [isEditingTree, setIsEditingTree] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: (() => void) | null, title: string, message: string}>({
    isOpen: false, 
    action: null, 
    title: '', 
    message: ''
  });
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);

  // State برای تنظیمات نمایش
  const [viewMode, setViewMode] = useLocalStorage<'rich' | 'simple' | 'vertical'>('req_viewMode', 'rich');
  const [fontSizeScale, setFontSizeScale] = useLocalStorage<number>('req_fontSize', 1);
  const [layoutDirection, setLayoutDirection] = useLocalStorage<'LR' | 'RL' | 'TB' | 'BT'>('req_layoutDirection', 'RL');
  const [showLabels, setShowLabels] = useLocalStorage<boolean>('req_showLabels', true);
  const [levelColors, setLevelColors] = useLocalStorage<Record<string, string>>('req_levelColors', {
    'R': '#3b82f6',
    'T': '#8b5cf6',
    'B': '#10b981',
    'SB': '#f59e0b',
    'L': '#6366f1',
    'Q': '#ec4899'
  });
  const { isFullscreen, toggleFullscreen } = useSimulatedFullscreen();

  // Form data
  const [treeFormData, setTreeFormData] = useState({ 
    name: '', 
    description: '', 
    periodId: '', 
    organizationLevel: '', 
    baseId: '', 
    unitId: '' 
  });
  const [nodeFormData, setNodeFormData] = useState({ 
    title: '', 
    description: '', 
    level: 'R' as string, 
    parentId: null as number | null, 
    templateIds: [] as string[],
    instanceIds: [] as string[]
  });
  const [selectedLeafId, setSelectedLeafId] = useState<number | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      await fetchTrees({ type: 'required' });
      await fetchTemplates();
      await fetchPeriods();
      await fetchOrgData();
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTreeId) {
      fetchTree(selectedTreeId);
    }
  }, [selectedTreeId]);

  // ============================================
  // Tree handlers
  // ============================================

  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treeFormData.name.trim()) {
      toast.error('نام درختواره الزامی است');
      return;
    }
    if (!treeFormData.periodId) {
      toast.error('دوره زمانی الزامی است');
      return;
    }
    if (!treeFormData.baseId) {
      toast.error('یگان اصلی الزامی است');
      return;
    }
    
    try {
      if (isEditingTree && selectedTreeId) {
        await updateTree(selectedTreeId, {
          name: treeFormData.name,
          description: treeFormData.description || undefined,
          periodId: parseInt(treeFormData.periodId),
          baseId: parseInt(treeFormData.baseId),
          unitId: treeFormData.unitId ? parseInt(treeFormData.unitId) : undefined,
        });
        setShowTreeModal(false);
        setIsEditingTree(false);
        setTreeFormData({ name: '', description: '', periodId: '', organizationLevel: '', baseId: '', unitId: '' });
        toast.success('درختواره با موفقیت ویرایش شد');
      } else {
        const newTree = await createTree({
          name: treeFormData.name,
          type: 'required',
          description: treeFormData.description || undefined,
          periodId: parseInt(treeFormData.periodId),
          baseId: parseInt(treeFormData.baseId),
          unitId: treeFormData.unitId ? parseInt(treeFormData.unitId) : undefined,
        });
        setShowTreeModal(false);
        setTreeFormData({ name: '', description: '', periodId: '', organizationLevel: '', baseId: '', unitId: '' });
        if (newTree && newTree.id) {
          setSelectedTreeId(newTree.id);
        }
        toast.success('درختواره با موفقیت ایجاد شد');
      }
    } catch (error: any) {
      toast.error(error.message || 'خطا در ذخیره درختواره');
    }
  };

  const handleEditTreeClick = () => {
    if (!tree) {
      toast.error('درختواره‌ای انتخاب نشده است');
      return;
    }
    
    const treeData = (tree as any).tree || tree;
    
    let base = null;
    let orgLevel = '';
    
    if (treeData.baseId) {
      base = bases.find((b: any) => String(b.id) === String(treeData.baseId));
      if (base) {
        orgLevel = base.level || '';
      }
    }
    
    if (!orgLevel && treeData.unitId) {
      orgLevel = useUIStore.getState().level3Name;
    }
    
    if (!orgLevel && treeData.organizationLevel) {
      orgLevel = treeData.organizationLevel;
    }
    
    setTreeFormData({
      name: treeData.name || '',
      description: treeData.description || '',
      periodId: treeData.periodId ? String(treeData.periodId) : '',
      organizationLevel: orgLevel,
      baseId: treeData.baseId ? String(treeData.baseId) : '',
      unitId: treeData.unitId ? String(treeData.unitId) : ''
    });
    
    setIsEditingTree(true);
    setShowTreeModal(true);
  };

  const handleCopyTree = async () => {
    if (!selectedTreeId) return;
    const newName = prompt('نام درختواره جدید:', `${tree?.name} (کپی)`);
    if (newName) {
      await copyTree(selectedTreeId, newName);
    }
  };

  const handleDeleteTree = () => {
    if (!selectedTreeId) return;
    if (window.confirm('آیا از حذف این درختواره اطمینان دارید؟')) {
      deleteTree(selectedTreeId).then(() => {
        setSelectedTreeId(null);
      });
    }
  };

  const handleExportTree = async () => {
    if (!selectedTreeId) return;
    await exportTree(selectedTreeId);
  };

  // ============================================
  // Node handlers
  // ============================================

  const handleAddNode = (parentId: number | null, level: string) => {
    setNodeFormData({ 
      title: '', 
      description: '', 
      level: level || 'R', 
      parentId: parentId || null, 
      templateIds: [],
      instanceIds: []
    });
    setIsEditingNode(false);
    setEditingNodeId(null);
    setShowNodeModal(true);
  };

  const handleEditNode = (node: any) => {
    setNodeFormData({
      title: node.title || '',
      description: node.description || '',
      level: node.level || 'L',
      parentId: node.parentId || null,
      templateIds: (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])) || [],
      instanceIds: node.instanceIds?.split(',').filter(Boolean) || []
    });
    setIsEditingNode(true);
    setEditingNodeId(node.id);
    setShowNodeModal(true);
  };

  const handleFocusNode = (node: any) => {
    setActiveNode(node);
    toast.success(`فوکوس روی گره "${node.title}"`);
    
    const event = new CustomEvent('focusNode', { 
      detail: { nodeId: node.id } 
    });
    document.dispatchEvent(event);
  };

  const handleAnchorNode = (node: any) => {
    setActiveNode(node);
    toast.success(`لنگر روی شاخه "${node.title}"`);
    
    const event = new CustomEvent('anchorNode', { 
      detail: { nodeId: node.id } 
    });
    document.dispatchEvent(event);
  };

  const handleSelectNode = (node: any) => {
    setActiveNode(node);
  };

  const handleSaveNode = async () => {
    if (!nodeFormData.title.trim()) {
      toast.error('عنوان گره الزامی است');
      return;
    }
    
    try {
      const data = {
        title: nodeFormData.title.trim(),
        description: nodeFormData.description || undefined,
        level: nodeFormData.level,
        parentId: nodeFormData.parentId,
        templateIds: nodeFormData.templateIds.join(','),
        instanceIds: nodeFormData.instanceIds.join(','),
      };
      
      if (isEditingNode && editingNodeId) {
        await updateNode(editingNodeId, data);
        toast.success('گره با موفقیت ویرایش شد');
      } else {
        await addNode(selectedTreeId!, data);
        toast.success('گره با موفقیت افزوده شد');
      }
      
      setShowNodeModal(false);
      if (selectedTreeId) await fetchTree(selectedTreeId);
    } catch (error: any) {
      toast.error(error.message || 'خطا در ذخیره گره');
    }
  };

  const getDescendantIds = useCallback((parentId: number) => {
    let ids: number[] = [];
    const children = nodes.filter(n => n.parentId === parentId);
    children.forEach(c => {
      ids.push(c.id);
      ids = ids.concat(getDescendantIds(c.id));
    });
    return ids;
  }, [nodes]);

  const handleDeleteNode = (nodeId: number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      toast.error('گره یافت نشد');
      return;
    }

    const descendants = getDescendantIds(nodeId);
    
    const confirmMsg = descendants.length > 0
      ? `گره "${node.title}" دارای ${descendants.length} زیرمجموعه است. با حذف این گره، تمام زیرمجموعه‌های آن نیز حذف خواهند شد. آیا اطمینان دارید؟`
      : `آیا از حذف گره "${node.title}" اطمینان دارید؟`;

    setConfirmModal({
      isOpen: true,
      title: 'حذف گره',
      message: confirmMsg,
      action: async () => {
        try {
          const sortedDescendants = descendants.sort((a, b) => b - a);
          for (const id of sortedDescendants) {
            const success = await deleteNode(id);
            if (!success) {
              throw new Error(`حذف گره ${id} با شکست مواجه شد`);
            }
          }
          const success = await deleteNode(nodeId);
          if (success) {
            setActiveNode(null);
            if (selectedTreeId) await fetchTree(selectedTreeId);
            toast.success('گره و زیرمجموعه‌های آن با موفقیت حذف شدند');
          }
        } catch (error: any) {
          toast.error(error.message || 'خطا در حذف گره');
        }
      }
    });
  };

  // ============================================
  // Template handlers
  // ============================================

  const handleOpenTemplateModal = (leafId: number, currentTemplateIds: string[]) => {
    setSelectedLeafId(leafId);
    setSelectedTemplates(currentTemplateIds);
    setShowTemplateModal(true);
  };

  const handleSaveTemplates = async () => {
    if (!selectedLeafId) return;
    try {
      await updateNode(selectedLeafId, { templateIds: selectedTemplates.join(',') });
      toast.success('قالب‌ها با موفقیت به برگ متصل شدند');
      setShowTemplateModal(false);
      setSelectedLeafId(null);
      setSelectedTemplates([]);
      if (selectedTreeId) await fetchTree(selectedTreeId);
    } catch (error: any) {
      toast.error(error.message || 'خطا در اتصال قالب‌ها');
    }
  };

  // ============================================
  // Fullscreen handlers
  // ============================================

  // ============================================
  // Fit to view
  // ============================================
  // Stats
  // ============================================

  const stats = {
    total: nodes.length,
    byLevel: nodes.reduce((acc: Record<string, number>, n) => { 
      acc[n.level] = (acc[n.level] || 0) + 1; 
      return acc; 
    }, {}),
    leaves: nodes.filter(n => n.level === 'L').length,
  };

  const filteredTrees = trees.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // تابع برای افزودن گره ریشه از هدر
  const handleAddRootNode = () => {
    handleAddNode(null, 'R');
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header اصلی صفحه */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200/50">
              <GitBranch size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">🌳 درختواره دانشی مورد نیاز</h1>
              <p className="text-gray-500 text-sm">مرجع تصویب - تعریف سلسله‌مراتب دانش (R → T → B → SB → L)</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => { 
              if (periods.length === 0) {
                toast.error('ابتدا باید حداقل یک دوره زمانی تعریف کنید');
                return;
              }
              if (bases.length === 0) {
                toast.error('ابتدا باید ساختار سازمانی (یگان اصلی) تعریف کنید');
                return;
              }
              setTreeFormData({ name: '', description: '', periodId: '', organizationLevel: '', baseId: '', unitId: '' }); 
              setIsEditingTree(false); 
              setShowTreeModal(true); 
            }} 
            className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-lg shadow-blue-200/50 transition-all hover:scale-105"
            title="درختواره جدید"
          >
            <Plus size={20} />
          </button>
          {selectedTreeId && (
            <>
              <button 
                onClick={handleCopyTree} 
                className="bg-purple-600 hover:bg-purple-700 text-white p-2.5 rounded-xl shadow-lg shadow-purple-200/50 transition-all hover:scale-105"
                title="کپی"
              >
                <Copy size={20} />
              </button>
              <button 
                onClick={handleExportTree} 
                className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-xl shadow-lg shadow-green-200/50 transition-all hover:scale-105"
                title="خروجی اکسل"
              >
                <Download size={20} />
              </button>
              <button 
                onClick={handleEditTreeClick} 
                className="bg-amber-500 hover:bg-amber-600 text-white p-2.5 rounded-xl shadow-lg shadow-amber-200/50 transition-all hover:scale-105"
                title="ویرایش درختواره"
              >
                <Edit2 size={20} />
              </button>
              <button 
                onClick={handleDeleteTree} 
                className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl shadow-lg shadow-red-200/50 transition-all hover:scale-105"
                title="حذف درختواره"
              >
                <Trash2 size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      <TreeLevelsHelp />

      {/* Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">انتخاب درختواره</label>
            <SearchableSelect
              options={filteredTrees.map(t => ({ 
                value: String(t.id), 
                label: `${t.name} (${t.type === 'required' ? 'مورد نیاز' : t.type})` 
              }))}
              value={selectedTreeId ? String(selectedTreeId) : ''}
              onChange={(val) => setSelectedTreeId(val ? parseInt(val as string) : null)}
              placeholder="انتخاب درختواره..." 
            />
          </div>
          <div className="sm:w-48">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">جستجو</label>
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-4 pr-9 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 focus:bg-white text-sm" 
                placeholder="جستجو..." 
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {selectedTreeId && tree && <TreeStats stats={stats} />}

      {/* Tree Display - هدر تکراری حذف شده */}
      
      {selectedTreeId && tree ? (
        <div ref={treeContainerRef} className={`bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden transition-all ${isFullscreen ? 'simulated-fullscreen flex flex-col' : 'h-[calc(100vh-220px)] min-h-[600px] flex flex-col'}`}>
          {/* کامپوننت نمایش درخت - با هدر تلفیقی */}
          <TreeVisualization
            data={{ nodes: nodes, tree }}
            onNodeClick={handleSelectNode}
            onAddNode={handleAddNode}
            onDeleteNode={handleDeleteNode}
            onEditNode={handleEditNode}
            onFocusNode={handleFocusNode}
            onAnchorNode={handleAnchorNode}
            layoutDirection={layoutDirection}
            levelColors={levelColors}
            showLabels={showLabels}
            viewMode={viewMode}
            onSettingsChange={(settings: any) => {
              if (settings.reset) {
                setViewMode('rich');
                setFontSizeScale(1);
                setLayoutDirection('RL');
                setLevelColors({
                  'R': '#3b82f6',
                  'T': '#8b5cf6',
                  'B': '#10b981',
                  'SB': '#f59e0b',
                  'L': '#6366f1',
                  'Q': '#ec4899'
                });
              } else {
                if (settings.viewMode) setViewMode(settings.viewMode);
                if (settings.fontSizeScale) setFontSizeScale(settings.fontSizeScale);
                if (settings.layoutDirection) setLayoutDirection(settings.layoutDirection);
                if (settings.levelColors) setLevelColors(settings.levelColors);
              }
            }}
            fontSizeScale={fontSizeScale}
            isAuthenticated={true}
            containerRef={treeContainerRef}
            // Props برای تلفیق هدر
            treeName={tree.name}
            treeDescription={tree.description || ''}
            nodeCount={nodes.length}
            onAddRootNode={handleAddRootNode}
            onToggleFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
            onToggleHelp={() => setShowHelp(!showHelp)}
            showHelp={showHelp}
          />
          {showHelp && (
            <div className="border-t border-gray-200/80 bg-white">
              <TreeHelp stats={stats} />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="text-gray-300 text-4xl">🌳</div>
          </div>
          <h3 className="text-xl font-bold text-gray-600 mb-2">درختواره‌ای انتخاب نشده است</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            یک درختواره از لیست انتخاب کنید یا با کلیک روی دکمه <span className="font-bold text-blue-600">"درختواره جدید"</span> ایجاد کنید.
          </p>
          <button 
            onClick={() => { 
              if (periods.length === 0) {
                toast.error('ابتدا باید حداقل یک دوره زمانی تعریف کنید');
                return;
              }
              if (bases.length === 0) {
                toast.error('ابتدا باید ساختار سازمانی (یگان اصلی) تعریف کنید');
                return;
              }
              setTreeFormData({ name: '', description: '', periodId: '', organizationLevel: '', baseId: '', unitId: '' }); 
              setIsEditingTree(false); 
              setShowTreeModal(true); 
            }} 
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 mx-auto shadow-lg shadow-blue-200/50"
          >
            <Plus size={18} /> ایجاد درختواره جدید
          </button>
        </div>
      )}

      {/* Modals */}
      <TreeModal 
        isOpen={showTreeModal} 
        onClose={() => { 
          setShowTreeModal(false); 
          setIsEditingTree(false); 
        }} 
        isEditing={isEditingTree} 
        onSubmit={handleCreateTree}
        formData={treeFormData} 
        setFormData={setTreeFormData} 
        periods={periods} 
        bases={bases} 
        units={units} 
        orgLevels={orgLevels} 
      />

      <NodeModal 
        isOpen={showNodeModal} 
        onClose={() => {
          setShowNodeModal(false);
          setIsEditingNode(false);
          setEditingNodeId(null);
        }} 
        onSubmit={handleSaveNode}
        formData={nodeFormData} 
        setFormData={setNodeFormData} 
        isEditing={isEditingNode} 
        templates={templates}
        nodes={nodes}
        treeId={selectedTreeId || undefined}
        treeType="required"
      />

      <TemplateModal 
        isOpen={showTemplateModal} 
        onClose={() => setShowTemplateModal(false)} 
        onSave={handleSaveTemplates}
        selectedTemplates={selectedTemplates} 
        setSelectedTemplates={setSelectedTemplates} 
        templates={templates} 
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({...confirmModal, isOpen: false})} 
        onConfirm={() => confirmModal.action?.()} 
        title={confirmModal.title} 
        message={confirmModal.message} 
      />
    </div>
  );
}

export default RequiredTree;
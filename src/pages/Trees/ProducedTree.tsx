// src/pages/Trees/ProducedTree.tsx
// صفحه مدیریت درختواره دانشی تولید شده - با صفحه ایندکس، حذف نرم، ریکاوری و نوار ابزار استاندارد

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTree } from '../../hooks/useTree';
import { useAuthStore, useUIStore } from '../../store';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { 
  Plus, Copy, Download, Trash2, Edit2, 
  FolderOpen, HelpCircle, ChevronRight, FileText
} from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { useSimulatedFullscreen } from '../../hooks/useSimulatedFullscreen';
import { getTreeOrgText } from '../../utils/orgHelper';

// کامپوننت‌ها
import { TreeStats } from './components/TreeStats';
import api from '../../services/api';
import { TreeModal } from './modals/TreeModal';
import { NodeModal } from './modals/NodeModal';
import { TemplateModal } from './modals/TemplateModal';
import { AssetModal } from './modals/AssetModal';
import { useTreeData } from './hooks/useTreeData';
import { TreeVisualization } from '../../components/trees/TreeVisualization';
import { TreeLevelsHelp } from './components/TreeLevelsHelp';
import { TreeIndexPage } from '../../components/trees/TreeIndexPage';
import { PageToolbar } from '../../components/ui/PageToolbar';

export function ProducedTree() {
  const [searchParams, setSearchParams] = useSearchParams();
  const treeIdParam = searchParams.get('treeId');
  const selectedTreeId = treeIdParam ? parseInt(treeIdParam) : null;

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
    restoreTree,
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
  const [activeNode, setActiveNode] = useState<any>(null);
  const [showHelp, setShowHelp] = useState(false);
      
  // Modal states
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [editingTreeId, setEditingTreeId] = useState<number | null>(null);
  const { user } = useAuthStore();
  const [isCloning, setIsCloning] = useState(false);

  const handleCloneTree = async (treeToClone?: any) => {
    const targetId = treeToClone?.id || selectedTreeId;
    if (!targetId) return;
    try {
      setIsCloning(true);
      const res: any = await api.post(`/api/trees/${targetId}/clone`);
      toast.success(res?.message || res?.data?.message || 'نسخه جدید با موفقیت ایجاد شد');
      await fetchTrees();
    } catch (e) {
      toast.error('خطا در ایجاد نسخه');
    } finally {
      setIsCloning(false);
    }
  };

  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [selectedNodeForAsset, setSelectedNodeForAsset] = useState<any>(null);
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
  const [viewMode, setViewMode] = useLocalStorage<'rich' | 'simple' | 'vertical'>('prod_viewMode', 'rich');
  const [fontSizeScale, setFontSizeScale] = useLocalStorage<number>('prod_fontSize', 1);
  const [layoutDirection, setLayoutDirection] = useLocalStorage<'LR' | 'RL' | 'TB' | 'BT'>('prod_layoutDirection', 'RL');
  const [showLabels, setShowLabels] = useLocalStorage<boolean>('prod_showLabels', true);
  const [levelColors, setLevelColors] = useLocalStorage<Record<string, string>>('prod_levelColors', {
    'R': '#3b82f6',
    'T': '#8b5cf6',
    'B': '#10b981',
    'SB': '#f59e0b',
    'L': '#6366f1',
    'Q': '#ec4899'
  });
  const { isFullscreen } = useSimulatedFullscreen();

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

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchTrees({ type: 'produced' }),
          fetchTemplates(),
          fetchPeriods(),
          fetchOrgData(),
        ]);
      } catch (err) {
        console.error('Error loading produced tree initial data:', err);
      }
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
      const activeEditId = editingTreeId || (isEditingTree && selectedTreeId ? selectedTreeId : null);
      if (isEditingTree && activeEditId) {
        await updateTree(activeEditId, {
          name: treeFormData.name,
          description: treeFormData.description || undefined,
          periodId: parseInt(treeFormData.periodId),
          baseId: parseInt(treeFormData.baseId),
          unitId: treeFormData.unitId ? parseInt(treeFormData.unitId) : undefined,
        });
        setShowTreeModal(false);
        setIsEditingTree(false);
        setEditingTreeId(null);
        setTreeFormData({ name: '', description: '', periodId: '', organizationLevel: '', baseId: '', unitId: '' });
        toast.success('درختواره با موفقیت ویرایش شد');
        await fetchTrees({ type: 'produced' });
      } else {
        const newTree = await createTree({
          name: treeFormData.name,
          type: 'produced',
          description: treeFormData.description || undefined,
          periodId: parseInt(treeFormData.periodId),
          baseId: parseInt(treeFormData.baseId),
          unitId: treeFormData.unitId ? parseInt(treeFormData.unitId) : undefined,
        });
        setShowTreeModal(false);
        setTreeFormData({ name: '', description: '', periodId: '', organizationLevel: '', baseId: '', unitId: '' });
        toast.success('درختواره با موفقیت ایجاد شد');
        await fetchTrees({ type: 'produced' });
        if (newTree && newTree.id) {
          setSearchParams({ treeId: String(newTree.id) });
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'خطا در ذخیره درختواره');
    }
  };

  const handleEditTreeClick = (targetTree?: any) => {
    const currentTarget = targetTree || tree;
    if (!currentTarget) {
      toast.error('درختواره‌ای انتخاب نشده است');
      return;
    }
    
    const treeData = (currentTarget as any).tree || currentTarget;
    
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
    
    setEditingTreeId(treeData.id);
    setIsEditingTree(true);
    setShowTreeModal(true);
  };

  const handleDeleteTree = () => {
    if (!selectedTreeId) return;
    setConfirmModal({
      isOpen: true,
      title: 'انتقال درختواره به سطل بازیافت',
      message: `آیا از انتقال درختواره «${tree?.name}» به سطل بازیافت اطمینان دارید؟`,
      action: async () => {
        const ok = await deleteTree(selectedTreeId, false);
        if (ok) {
          setSearchParams({});
        }
      }
    });
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
  };

  const handleAnchorNode = (node: any) => {
    setActiveNode(node);
    toast.success(`تثبیت گره "${node.title}"`);
  };

  const handleSelectNode = (node: any) => {
    setActiveNode(node);
  };

  const getDescendantIds = useCallback((parentId: number): number[] => {
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
          if (selectedTreeId) {
            await deleteNode(nodeId);
            toast.success('گره با موفقیت حذف شد');
          }
        } catch (error: any) {
          toast.error(error.message || 'خطا در حذف گره');
        }
      }
    });
  };

  const handleSaveNode = async () => {
    if (!selectedTreeId) return;
    if (!nodeFormData.title.trim()) {
      toast.error('عنوان گره الزامی است');
      return;
    }

    try {
      if (isEditingNode && editingNodeId) {
        await updateNode(editingNodeId, {
          title: nodeFormData.title,
          description: nodeFormData.description,
          level: nodeFormData.level,
          templateIds: nodeFormData.templateIds.join(','),
          instanceIds: nodeFormData.instanceIds?.join(',') || '',
        });
        toast.success('گره با موفقیت ویرایش شد');
      } else {
        await addNode(selectedTreeId, {
          title: nodeFormData.title,
          description: nodeFormData.description,
          level: nodeFormData.level,
          parentId: nodeFormData.parentId,
          templateIds: nodeFormData.templateIds.join(','),
          instanceIds: nodeFormData.instanceIds?.join(',') || '',
        });
        toast.success('گره با موفقیت افزوده شد');
      }
      setShowNodeModal(false);
      setIsEditingNode(false);
      setEditingNodeId(null);
      await fetchTree(selectedTreeId);
    } catch (error: any) {
      toast.error(error.message || 'خطا در ذخیره گره');
    }
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

  const handleAddRootNode = () => {
    handleAddNode(null, 'R');
  };

  // Stats
  const stats = {
    total: nodes.length,
    byLevel: nodes.reduce((acc: Record<string, number>, n) => { 
      acc[n.level] = (acc[n.level] || 0) + 1; 
      return acc; 
    }, {}),
    leaves: nodes.filter(n => n.level === 'L').length,
  };

  // =========================================================================
  // گام اول: در صورت عدم انتخاب درختواره، صفحه ایندکس باز می‌شود
  // =========================================================================
  if (!selectedTreeId) {
    return (
      <div className="space-y-6" dir="rtl">
        <TreeIndexPage
          title="📂 درختواره‌های دانشی تولیدشده"
          subtitle="دانش موجود و عملکردی سازمان و یگان‌ها (R → T → B → SB → L)"
          treeType="produced"
          icon={FolderOpen}
          iconGradient="from-emerald-600 to-teal-600"
          trees={trees.filter(t => t.type === 'produced')}
          periods={periods}
          bases={bases}
          loading={loading}
          onRefresh={async () => {
            await fetchTrees({ type: 'produced' });
          }}
          onSelectTree={(id) => setSearchParams({ treeId: String(id) })}
          onAddNewTree={() => {
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
            setEditingTreeId(null);
            setShowTreeModal(true);
          }}
          onEditTree={(t) => handleEditTreeClick(t)}
          onCloneTree={handleCloneTree}
          onSoftDeleteTree={async (id) => {
            return await deleteTree(id, false);
          }}
          onRestoreTree={async (id) => {
            return await restoreTree(id);
          }}
          onPermanentDeleteTree={async (id) => {
            return await deleteTree(id, true);
          }}
          onShowHelp={() => setShowHelp(true)}
        />

        {/* مدال ایجاد / ویرایش درختواره */}
        <TreeModal 
          isOpen={showTreeModal} 
          onClose={() => { 
            setShowTreeModal(false); 
            setIsEditingTree(false);
            setEditingTreeId(null);
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

        {showHelp && <TreeLevelsHelp />}
      </div>
    );
  }

  // =========================================================================
  // گام دوم: صفحه نمایش و مدیریت درختواره (با نوار ابزار جدید در بالا)
  // =========================================================================
  const viewToolbarActions = [
    {
      id: 'back',
      label: 'بازگشت به فهرست',
      icon: ChevronRight,
      variant: 'secondary' as const,
      onClick: () => setSearchParams({}),
      title: 'بازگشت به فهرست درختواره‌ها',
    },
    {
      id: 'add-root',
      label: 'گره ریشه',
      icon: Plus,
      variant: 'primary' as const,
      onClick: handleAddRootNode,
      title: 'افزودن گره ریشه جدید',
    },
    {
      id: 'clone',
      label: 'نسخه جدید',
      icon: Copy,
      variant: 'purple' as const,
      onClick: () => handleCloneTree(),
      disabled: isCloning,
      title: 'ایجاد نسخه/اسنپ‌شات جدید از درختواره',
    },
    {
      id: 'export',
      label: 'خروجی اکسل',
      icon: Download,
      variant: 'success' as const,
      onClick: handleExportTree,
      title: 'دریافت خروجی اکسل از این درختواره',
    },
    {
      id: 'edit',
      label: 'ویرایش مشخصات',
      icon: Edit2,
      variant: 'warning' as const,
      onClick: () => handleEditTreeClick(tree),
      title: 'ویرایش مشخصات درختواره',
    },
    {
      id: 'delete',
      label: 'حذف درختواره',
      icon: Trash2,
      variant: 'danger' as const,
      onClick: handleDeleteTree,
      title: 'انتقال به سطل بازیافت',
    },
    {
      id: 'help',
      label: 'راهنمای سطوح',
      icon: HelpCircle,
      variant: 'ghost' as const,
      onClick: () => setShowHelp(true),
      title: 'راهنمای سطوح و ساختار درختواره',
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* نوار ابزار استاندارد بالای صفحه با آیکون در بالا و عنوان در زیر */}
      <PageToolbar
        title={tree?.name || 'درختواره دانشی تولیدشده'}
        subtitle={tree ? `ساختار سازمانی: ${getTreeOrgText(tree)} • دوره: ${(tree as any).periodName || 'نامشخص'}` : 'در حال بارگذاری...'}
        icon={FolderOpen}
        iconColor="from-emerald-600 to-teal-600"
        actions={viewToolbarActions}
      />

      {/* آمار درختواره */}
      {tree && <TreeStats stats={stats} />}

      {/* بخش نمایش گراف و بوم درختواره — دکمه‌های مربوط به کنترل بوم دقیقاً در جای قبلی خود حفظ شده‌اند */}
      {tree && (
        <div ref={treeContainerRef} className={`bg-white dark:bg-[#1e1e2f] rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-800 overflow-hidden transition-all ${isFullscreen ? 'simulated-fullscreen flex flex-col' : 'h-[calc(100vh-220px)] min-h-[600px] flex flex-col'}`}>
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
                setShowLabels(true);
              } else {
                if (settings.viewMode) setViewMode(settings.viewMode);
                if (settings.layoutDirection) setLayoutDirection(settings.layoutDirection);
                if (settings.levelColors) setLevelColors(settings.levelColors);
                if (settings.showLabels !== undefined) setShowLabels(settings.showLabels);
                if (settings.fontSizeScale) setFontSizeScale(settings.fontSizeScale);
              }
            }}
            fontSizeScale={fontSizeScale}
          />
        </div>
      )}

      {/* مدال‌ها */}
      <TreeModal 
        isOpen={showTreeModal} 
        onClose={() => { 
          setShowTreeModal(false); 
          setIsEditingTree(false);
          setEditingTreeId(null);
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
        treeType="produced"
      />

      <TemplateModal 
        isOpen={showTemplateModal} 
        onClose={() => setShowTemplateModal(false)} 
        onSave={handleSaveTemplates}
        selectedTemplates={selectedTemplates} 
        setSelectedTemplates={setSelectedTemplates} 
        templates={templates} 
      />

      <AssetModal
        isOpen={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        node={selectedNodeForAsset}
        templates={templates}
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({...confirmModal, isOpen: false})} 
        onConfirm={() => confirmModal.action?.()} 
        title={confirmModal.title} 
        message={confirmModal.message} 
      />

      {showHelp && <TreeLevelsHelp />}
    </div>
  );
}

export default ProducedTree;

// src/pages/Trees/components/TreeNodeList.tsx
// نمایش لیستی گره‌ها با قابلیت باز/بسته شدن

import React from 'react';
import { Plus, Save, Edit2, Trash2, Tag, ChevronDown, ChevronLeft } from 'lucide-react';
import { getLevelConfig, getNextLevel, canAddChild } from '../constants/treeLevels';

interface TreeNodeListProps {
  nodes: any[];
  roots: any[];
  activeNode: any;
  expandedNodes: Set<number>;
  onToggleExpand: (nodeId: number) => void;
  onSetActive: (node: any) => void;
  onAddNode: (parentId: number | null, level: string) => void;
  onEditNode: (node: any) => void;
  onDeleteNode: (nodeId: number) => void;
  onOpenTemplateModal: (leafId: number, currentTemplateIds: string[]) => void;
}

function TreeNodeItem({ 
  node, 
  level, 
  nodes, 
  activeNode, 
  expandedNodes, 
  onToggleExpand, 
  onSetActive,
  onAddNode,
  onEditNode,
  onDeleteNode,
  onOpenTemplateModal
}: any) {
  const levelConfig = getLevelConfig(node.level);
  const children = nodes.filter((n: any) => n.parentId === node.id);
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = children.length > 0;
  const isLeaf = node.level === 'L';
  const isActive = activeNode?.id === node.id;
  const templateCount = (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])).length || 0;

  return (
    <div key={node.id} className="relative">
      {level > 0 && <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-200" />}

      <div 
        className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer
          ${isActive ? 'ring-2 ring-blue-400 ring-offset-2 shadow-lg' : ''}
          ${levelConfig.bgColor} ${levelConfig.borderColor} hover:shadow-md hover:scale-[1.01]`}
        style={{ marginRight: level * 32 }}
        onClick={() => onSetActive(node)}
      >
        {level > 0 && <div className="absolute right-0 top-1/2 w-4 h-0.5 bg-gray-200 -translate-x-4" />}

        {/* آیکون با ایموجی */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${isActive ? 'shadow-md' : ''}`} 
             style={{ backgroundColor: levelConfig.color + '20' }}>
          <span>{levelConfig.emoji}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-800">{node.title || 'بدون عنوان'}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${levelConfig.bgColor} ${levelConfig.textColor} border ${levelConfig.borderColor}`}>
              {levelConfig.labelFa}
            </span>
            {node.isGap === 1 && (
              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-300">⚠️ گپ</span>
            )}
            {isLeaf && templateCount > 0 && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-300">
                📋 {templateCount} قالب
              </span>
            )}
          </div>
          {node.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{node.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {hasChildren && (
            <button onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
          {canAddChild(node.level) && (
            <button onClick={(e) => { e.stopPropagation(); onAddNode(node.id, getNextLevel(node.level)!); }}
              className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors">
              <Plus size={16} />
            </button>
          )}
          {isLeaf && (
            <button onClick={(e) => { e.stopPropagation(); onOpenTemplateModal(node.id, (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])) || []); }}
              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
              <Tag size={16} />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEditNode(node); }}
            className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
            <Edit2 size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="relative mt-2">
          {children.map((child: any) => (
            <TreeNodeItem key={child.id}
              node={child} level={level + 1} nodes={nodes}
              activeNode={activeNode} expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand} onSetActive={onSetActive}
              onAddNode={onAddNode} onEditNode={onEditNode}
              onDeleteNode={onDeleteNode} onOpenTemplateModal={onOpenTemplateModal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeNodeList(props: TreeNodeListProps) {
  const { roots } = props;

  if (roots.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="text-gray-300 text-4xl">🌳</div>
        </div>
        <h4 className="text-lg font-bold text-gray-600">هیچ گره‌ای در این درختواره وجود ندارد</h4>
        <p className="text-sm text-gray-400 mt-1">
          با کلیک روی دکمه <span className="font-bold text-blue-600">"ریشه جدید (R)"</span> شروع کنید.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {roots.map((root: any) => (
        <TreeNodeItem key={root.id} {...props} node={root} level={0} />
      ))}
    </div>
  );
}
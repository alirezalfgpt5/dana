import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  ZoomIn, ZoomOut, RotateCcw, Settings, Eye, EyeOff, 
  LayoutGrid, Square, GitBranch as GitBranchIcon, 
  Maximize2, Download, X, Plus, HelpCircle, Minimize2, Activity, Move 
} from 'lucide-react';
import { createPortal, flushSync } from 'react-dom';
import toast from 'react-hot-toast';
import NodeCard from './NodeCard';
import TreeSettingsPanel from './TreeSettingsPanel';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { downloadSvg } from '../../utils/svgExport';

interface NodeOffsets {
  [id: string]: { x: number; y: number; elbow?: number; entryX?: number };
}

interface TreeVisualizationProps {
  data: any;
  onNodeClick: (node: any) => void;
  onAddNode: (parentId: number | null, level: string) => void;
  onDeleteNode: (nodeId: number) => void;
  onEditNode?: (node: any) => void;
  onFocusNode?: (node: any) => void;
  onAnchorNode?: (node: any) => void;
  height?: number;
  layoutDirection?: 'LR' | 'RL' | 'TB' | 'BT';
  levelColors?: Record<string, string>;
  showLabels?: boolean;
  showDescriptions?: boolean;
  onSettingsChange?: (settings: any) => void;
  viewMode?: 'rich' | 'simple' | 'vertical';
  fontSizeScale?: number;
  isAuthenticated?: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  renderLeafActions?: (node: any) => React.ReactNode;
  treeName?: string;
  treeDescription?: string;
  nodeCount?: number;
  onAddRootNode?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onToggleHelp?: () => void;
  showHelp?: boolean;
  showGaps?: boolean;
}

const LEVEL_ORDER = ['R', 'T', 'B', 'SB', 'L', 'Q'];
const LEVEL_LABELS: Record<string, string> = {
  'R': 'ریشه (Root)',
  'T': 'تنه (Trunk)',
  'B': 'شاخه (Branch)',
  'SB': 'زیرشاخه (Sub-Branch)',
  'L': 'برگ (Leaf)',
  'Q': 'کیفیت (Quality)',
};

const DEFAULT_LEVEL_COLORS: Record<string, string> = {
  'R': '#3b82f6',
  'T': '#8b5cf6',
  'B': '#10b981',
  'SB': '#f59e0b',
  'L': '#6366f1',
  'Q': '#ec4899',
};

interface PortalNode {
  id: string;
  nodeData: any;
  depth: number;
  isActive: boolean;
  isSelected: boolean;
  isRoot: boolean;
  isLeaf: boolean;
  container: HTMLDivElement;
}

export function TreeVisualization({
  data,
  onNodeClick,
  onAddNode,
  onDeleteNode,
  onEditNode,
  onFocusNode,
  onAnchorNode,
  height = 500,
  layoutDirection: initialDirection = 'RL',
  levelColors: initialLevelColors = DEFAULT_LEVEL_COLORS,
  showLabels: initialShowLabels = true,
  showDescriptions: initialShowDescriptions = false,
  onSettingsChange,
  viewMode: initialViewMode = 'rich',
  fontSizeScale: initialFontSize = 1,
  isAuthenticated = true,
  containerRef,
  renderLeafActions,
  treeName,
  treeDescription,
  nodeCount,
  onAddRootNode,
  onToggleFullscreen,
  isFullscreen = false,
  onToggleHelp,
  showHelp = false,
  showGaps = false
}: TreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const currentTransformRef = useRef<d3.ZoomTransform | null>(null);
  const [anchorNodeId, setAnchorNodeId] = useState<string | null>(null);
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'RL' | 'TB' | 'BT'>(initialDirection);
  const [viewMode, setViewMode] = useState<'rich' | 'simple' | 'vertical'>(initialViewMode);
  
  // Sync props to local state
  useEffect(() => {
    setLayoutDirection(initialDirection);
  }, [initialDirection]);
  
  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [levelColors, setLevelColors] = useState(initialLevelColors);
  const [showLabels, setShowLabels] = useState(initialShowLabels);
  const [showDescriptions, setShowDescriptions] = useState(initialShowDescriptions);
  const [fontSizeScale, setFontSizeScale] = useState(initialFontSize);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [configNodeId, setConfigNodeId] = useState<string | null>(null);
  const [resetConfirmMode, setResetConfirmMode] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [isCurved, setIsCurved] = useLocalStorage('tree_isCurved', false);
  const [elbowValue, setElbowValue] = useLocalStorage('tree_elbowValue', 0.5);
  const [nodeOpacity, setNodeOpacity] = useLocalStorage('tree_nodeOpacity', 1);
  const [customOffsets, setCustomOffsets] = useState<NodeOffsets>({});
  
  const [portals, setPortals] = useState<PortalNode[]>([]);
  
  const getNextLevel = (currentLevel: string): string => {
    const nextMap: Record<string, string> = {
      'R': 'T',
      'T': 'B',
      'B': 'SB',
      'SB': 'L',
      'L': 'Q',
      'Q': 'Q'
    };
    return nextMap[currentLevel] || 'SB';
  };

  const handleResetLayout = () => {
    if (resetConfirmMode) {
      setCustomOffsets({});
      setConfigNodeId(null);
      setIsCurved(false);
      setElbowValue(0.5);
      setNodeOpacity(1);
      setResetConfirmMode(false);
      if (onSettingsChange) {
        onSettingsChange({ reset: true });
      }
    } else {
      setResetConfirmMode(true);
      setTimeout(() => setResetConfirmMode(false), 3000);
    }
  };

  const fitToView = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current || !gRef.current) return;
    
    const container = containerRef?.current || innerContainerRef.current;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const nodeElements = svgRef.current.querySelectorAll('.node-wrapper');
    if (nodeElements.length === 0) return;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodeElements.forEach((el) => {
      const transform = el.getAttribute('transform');
      if (transform) {
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          const x = parseFloat(match[1]);
          const y = parseFloat(match[2]);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    });
    
    if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) return;
    
    const padding = 100;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;
    
    const width = maxX - minX;
    const heightVal = maxY - minY;
    
    const scaleX = containerWidth / width;
    const scaleY = containerHeight / heightVal;
    const scale = Math.min(scaleX, scaleY, 1);
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const svg = d3.select(svgRef.current);
    const transform = d3.zoomIdentity
      .translate(containerWidth / 2 - centerX * scale, containerHeight / 2 - centerY * scale)
      .scale(scale);
    
    currentTransformRef.current = transform;
    
    svg.transition()
      .duration(500)
      .call(zoomBehaviorRef.current.transform, transform);
  }, [containerRef]);

  const focusOnNode = useCallback((nodeId: string | number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    
    const nodeElement = svgRef.current.querySelector(`.node-wrapper[data-node-id="${nodeId}"]`);
    if (!nodeElement) return;
    
    const transform = nodeElement.getAttribute('transform');
    if (!transform) return;
    
    const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (!match) return;
    
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    
    const container = containerRef?.current || innerContainerRef.current;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const scale = 1.2;
    const svg = d3.select(svgRef.current);
    const transformObj = d3.zoomIdentity
      .translate(containerWidth / 2 - x * scale, containerHeight / 2 - y * scale)
      .scale(scale);
    
    currentTransformRef.current = transformObj;
    
    svg.transition()
      .duration(600)
      .call(zoomBehaviorRef.current.transform, transformObj);
  }, [containerRef]);

  const anchorOnNode = useCallback((nodeId: string | number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    
    if (anchorNodeId === String(nodeId)) {
      setAnchorNodeId(null);
      fitToView();
      return;
    }
    
    setAnchorNodeId(String(nodeId));
    
    const nodeElement = svgRef.current.querySelector(`.node-wrapper[data-node-id="${nodeId}"]`);
    if (!nodeElement) return;
    
    const transform = nodeElement.getAttribute('transform');
    if (!transform) return;
    
    const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (!match) return;
    
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    
    const container = containerRef?.current || innerContainerRef.current;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const scale = 1.5;
    const svg = d3.select(svgRef.current);
    const transformObj = d3.zoomIdentity
      .translate(containerWidth / 2 - x * scale, containerHeight / 2 - y * scale)
      .scale(scale);
    
    currentTransformRef.current = transformObj;
    
    svg.transition()
      .duration(600)
      .call(zoomBehaviorRef.current.transform, transformObj);
  }, [containerRef, fitToView, anchorNodeId]);

  const exportSVG = useCallback(() => {
    if (!svgRef.current) return;
    downloadSvg(svgRef.current, treeName || 'tree');
  }, [treeName]);

  useEffect(() => {
    const handleFitToView = () => {
      fitToView();
    };
    const handleFocusNode = (event: CustomEvent) => {
      if (event.detail?.nodeId) {
        focusOnNode(event.detail.nodeId);
      }
    };
    const handleAnchorNode = (event: CustomEvent) => {
      if (event.detail?.nodeId) {
        anchorOnNode(event.detail.nodeId);
      }
    };
    
    document.addEventListener('fitToView', handleFitToView);
    document.addEventListener('focusNode', handleFocusNode as EventListener);
    document.addEventListener('anchorNode', handleAnchorNode as EventListener);
    
    return () => {
      document.removeEventListener('fitToView', handleFitToView);
      document.removeEventListener('focusNode', handleFocusNode as EventListener);
      document.removeEventListener('anchorNode', handleAnchorNode as EventListener);
    };
  }, [fitToView, focusOnNode, anchorOnNode]);

  useEffect(() => {
    if (!svgRef.current || !data?.nodes) return;

    let cancelled = false;

    setPortals([]);

    const renderTimer = setTimeout(() => {
      if (cancelled) return;

      if (svgRef.current) {
        svgRef.current.innerHTML = '';
      }

    const nodes = data.nodes || [];
    if (nodes.length === 0) {
      const svg = d3.select(svgRef.current);
      svg.append('text')
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('fill', '#94a3b8')
        .style('font-family', 'Vazirmatn')
        .text('هیچ گره‌ای در این درختواره وجود ندارد');
      return;
    }

    const buildTreeData = (flatNodes: any[]) => {
      const nodeMap = new Map();
      flatNodes.forEach((node: any) => {
        nodeMap.set(node.id, { ...node, children: [] });
      });

      const roots: any[] = [];
      flatNodes.forEach((node: any) => {
        const currentNode = nodeMap.get(node.id);
        if (node.parentId === null || node.parentId === undefined) {
          roots.push(currentNode);
        } else {
          const parent = nodeMap.get(node.parentId);
          if (parent) {
            parent.children.push(currentNode);
          } else {
            roots.push(currentNode);
          }
        }
      });

      if (roots.length > 1) {
        return {
          id: 0,
          title: data.tree?.name || 'عنوان درختواره',
          level: 'R',
          isGap: 0,
          templateIds: '',
          children: roots,
          _ancestors: [],
        };
      }
      return roots[0] || null;
    };

    const treeData = buildTreeData(nodes);
    if (!treeData) {
      const svg = d3.select(svgRef.current);
      svg.append('text')
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('fill', '#94a3b8')
        .style('font-family', 'Vazirmatn')
        .text('ساختار درختی معتبری یافت نشد');
      return;
    }

    const addAncestors = (node: any, ancestors: any[] = []) => {
      node._ancestors = ancestors;
      if (node.children) {
        node.children.forEach((child: any) => {
          addAncestors(child, [...ancestors, node]);
        });
      }
    };
    addAncestors(treeData);

    const root = d3.hierarchy(treeData);

    const container = containerRef?.current || innerContainerRef.current;
    const width = container?.clientWidth || 900;
    const treeHeight = Math.max(height, root.height * 90 + 160);
    
    const isVertical = layoutDirection === 'TB' || layoutDirection === 'BT';

    const leavesCount = Math.max(root.leaves().length, 1);
    const depthCount = Math.max(root.height, 1);
    
    let breadthSpacing = 0;
    let depthSpacing = 0;
    
    if (viewMode === 'rich') {
      breadthSpacing = isVertical ? 320 : 260;
      depthSpacing = isVertical ? 300 : 400;
    } else if (viewMode === 'vertical') {
      breadthSpacing = isVertical ? 260 : 120;
      depthSpacing = isVertical ? 180 : 300;
    } else {
      breadthSpacing = isVertical ? 140 : 100;
      depthSpacing = isVertical ? 150 : 220;
    }

    const requiredBreadth = leavesCount * breadthSpacing;
    const requiredDepth = depthCount * depthSpacing;
    const treeWidth = Math.max(isVertical ? width - 120 : treeHeight - 120, requiredBreadth);
    const treeLen = Math.max(isVertical ? treeHeight - 160 : width - 240, requiredDepth);
    
    const treeLayout = d3.tree<any>()
      .size([treeWidth, treeLen])
      .separation((a, b) => a.parent === b.parent ? 1 : 1.2);

    const treeRoot = treeLayout(root);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', treeHeight)
      .style('background', '#fafafa')
      .style('border-radius', '12px')
      .style('cursor', 'grab');

    const g = svg.append('g')
      .attr('transform', `translate(60, 60)`);
    gRef.current = g;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
        currentTransformRef.current = event.transform;
      });

    zoomBehaviorRef.current = zoom;
    (svg as any).call(zoom);

    if (currentTransformRef.current) {
      (svg as any).call(zoom.transform, currentTransformRef.current);
    }

    const getX = (d: any) => {
      if (layoutDirection === 'LR') return d.y;
      if (layoutDirection === 'RL') return -d.y;
      if (layoutDirection === 'TB') return d.x;
      if (layoutDirection === 'BT') return d.x;
      return d.y;
    };
    
    const getY = (d: any) => {
      if (layoutDirection === 'LR') return d.x;
      if (layoutDirection === 'RL') return d.x;
      if (layoutDirection === 'TB') return d.y;
      if (layoutDirection === 'BT') return -d.y;
      return d.x;
    };

    g.selectAll('.link')
      .data(treeRoot.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => {
        const sx = getX(d.source);
        const sy = getY(d.source);
        let tx = getX(d.target);
        const ty = getY(d.target);
        
        if (isCurved) {
          if (isVertical) {
            return `M ${sx},${sy} C ${sx},${(sy + ty) / 2} ${tx},${(sy + ty) / 2} ${tx},${ty}`;
          } else {
            return `M ${sx},${sy} C ${(sx + tx) / 2},${sy} ${(sx + tx) / 2},${ty} ${tx},${ty}`;
          }
        }
        if (isVertical) {
          const midY = sy + (ty - sy) * elbowValue;
          return `M ${sx},${sy} L ${sx},${midY} L ${tx},${midY} L ${tx},${ty}`;
        } else {
          const midX = sx + (tx - sx) * elbowValue;
          return `M ${sx},${sy} L ${midX},${sy} L ${midX},${ty} L ${tx},${ty}`;
        }
      })
      .style('stroke', (d: any) => {
        const child = d.target.data;
        if (anchorNodeId) {
          const isChildOfAnchor = d.source.data.id === Number(anchorNodeId) || d.source.data._ancestors?.some((a: any) => a.id === Number(anchorNodeId));
            
          return isChildOfAnchor ? '#475569' : '#d1d5db';
        }
        const isGap = showGaps ? child.isGap : false;
        return isGap ? '#ef4444' : '#475569';
      })
      .style('stroke-width', (d: any) => {
        if (anchorNodeId) {
          const isChildOfAnchor = d.source.data.id === Number(anchorNodeId) || d.source.data._ancestors?.some((a: any) => a.id === Number(anchorNodeId));
            
          return isChildOfAnchor ? '2.5px' : '1px';
        }
        return '2.5px';
      })
      .style('fill', 'none')
      .style('stroke-dasharray', (d: any) => {
        const child = d.target.data;
        const isGap = showGaps ? child.isGap : false;
        return isGap ? '6,4' : 'none';
      })
      .style('opacity', (d: any) => {
        if (anchorNodeId) {
          const isChildOfAnchor = d.source.data.id === Number(anchorNodeId) || d.source.data._ancestors?.some((a: any) => a.id === Number(anchorNodeId));
            
          return isChildOfAnchor ? 1 : 0.3;
        }
        return 1;
      });

    const newPortals: PortalNode[] = [];

    const nodesGroup = g.selectAll('.node-wrapper')
      .data(treeRoot.descendants())
      .enter()
      .append('g')
      .attr('class', 'node-wrapper')
      .attr('data-node-id', (d: any) => d.data.id)
      .attr('transform', (d: any) => `translate(${getX(d)}, ${getY(d)})`)
      .style('cursor', 'pointer')
      .style('opacity', (d: any) => {
        if (anchorNodeId) {
          const isAnchor = d.data.id === Number(anchorNodeId);
          const isChildOfAnchor = d.data._ancestors?.some((a: any) => a.id === Number(anchorNodeId));
          return (isAnchor || isChildOfAnchor) ? 1 : 0.2;
        }
        return 1;
      });

    nodesGroup.each(function(d: any) {
      if (cancelled) return;

      const nodeData = d.data;
      const depth = d.depth;
      const isActive = selectedNodeId === nodeData.id;
      const isSelected = configNodeId === String(nodeData.id);
      const isRoot = depth === 0;
      const isLeaf = nodeData.level === 'L' || nodeData.level === 'Q';
      
      let cardWidth = 240;
      let cardHeight = 180;
      let offsetX = -120;
      let offsetY = -90;
      
      if (viewMode === 'simple') {
        cardWidth = 140;
        cardHeight = 80;
        offsetX = -70;
        offsetY = -40;
      } else if (viewMode === 'vertical') {
        cardWidth = 40;
        cardHeight = 160;
        offsetX = -20;
        offsetY = -80;
      }
      
      const foreignObject = d3.select(this)
        .append('foreignObject')
        .attr('width', cardWidth)
        .attr('height', cardHeight)
        .attr('x', offsetX)
        .attr('y', offsetY)
        .style('overflow', 'visible')
        .style('pointer-events', 'auto');

      const div = foreignObject.append('xhtml:div')
        .attr('id', `react-node-${nodeData.id}`)
        .style('width', '100%')
        .style('height', '100%')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .node() as HTMLDivElement;

      if (div) {
        newPortals.push({
          id: String(nodeData.id),
          nodeData,
          depth,
          isActive,
          isSelected,
          isRoot,
          isLeaf,
          container: div
        });
      }
    });

    if (!cancelled) {
      setPortals(newPortals);
      setTimeout(() => {
        if (!cancelled && !anchorNodeId) {
          fitToView();
        }
      }, 50);
    }
    }, 10);

    return () => {
      cancelled = true;
      clearTimeout(renderTimer);
      if (svgRef.current) {
        // d3.select(svgRef.current)
        //   .selectAll('*')
        //   .remove();
      }
    };

  }, [
    data?.nodes,
    data?.tree,
    height,
    layoutDirection,
    viewMode,
    fontSizeScale,
    anchorNodeId,
    elbowValue,
    containerRef,
    fitToView,
    isCurved
  ]);

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, 1.25);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, 0.8);
  };

  const handleResetZoom = () => {
    fitToView();
  };

  const nodes = data?.nodes || [];

  return (
    <div className="w-full flex-1 flex flex-col relative min-h-0" ref={innerContainerRef}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm rounded-t-xl shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-gray-800 text-sm">{treeName || data?.tree?.name || 'درختواره'}</h3>
          <span className="text-xs text-gray-400">{treeDescription || data?.tree?.description || ''} • {nodeCount || nodes.length} گره</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {onAddRootNode && (
            <button
              onClick={onAddRootNode}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all hover:scale-105"
              title="گره جدید"
            >
              <Plus size={16} />
            </button>
          )}

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className={`p-2 rounded-lg transition-all hover:scale-105 shadow-sm ${
                isFullscreen 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title={isFullscreen ? 'خروج از حالت تمام صفحه' : 'حالت تمام صفحه'}
            >
              {isFullscreen ? <X size={16} /> : <Maximize2 size={16} />}
            </button>
          )}

          {onToggleHelp && (
            <button
              onClick={onToggleHelp}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-105"
              title="راهنما"
            >
              <HelpCircle size={16} />
            </button>
          )}

          <div className="w-px h-6 bg-gray-200"></div>

          <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-gray-700 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-xs"
              title="بزرگنمایی"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-gray-700 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-xs"
              title="کوچکنمایی"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-gray-700 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-xs"
              title="بازنشانی زوم"
            >
              <RotateCcw size={18} />
            </button>
            <span className="text-xs font-semibold text-gray-600 px-2 min-w-[45px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
            <span className="text-xs text-gray-600 font-medium">جهت:</span>
            <select
              value={layoutDirection}
              onChange={(e) => {
                setLayoutDirection(e.target.value as any);
                onSettingsChange?.({ layoutDirection: e.target.value });
              }}
              className="px-2 py-0.5 border-none rounded-lg text-xs font-medium text-gray-800 bg-white shadow-xs focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="RL">راست به چپ</option>
              <option value="LR">چپ به راست</option>
              <option value="TB">بالا به پایین</option>
              <option value="BT">پایین به بالا</option>
            </select>
          </div>

          <div className="flex bg-gray-100 rounded-xl p-1 border border-gray-200">
            <button
              onClick={() => {
                setViewMode('rich');
                onSettingsChange?.({ viewMode: 'rich' });
              }}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'rich' ? 'bg-white shadow text-amber-600' : 'text-gray-400 hover:text-amber-500'}`}
              title="نمایش کارتی غنی"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => {
                setViewMode('simple');
                onSettingsChange?.({ viewMode: 'simple' });
              }}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'simple' ? 'bg-white shadow text-amber-600' : 'text-gray-400 hover:text-amber-500'}`}
              title="نمایش کارتی ساده"
            >
              <Square size={16} />
            </button>
            <button
              onClick={() => {
                setViewMode('vertical');
                onSettingsChange?.({ viewMode: 'vertical' });
              }}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'vertical' ? 'bg-white shadow text-amber-600' : 'text-gray-400 hover:text-amber-500'}`}
              title="نمایش عمودی"
            >
              <GitBranchIcon size={16} />
            </button>
            <button
              onClick={() => setIsCurved(!isCurved)}
              className={`p-1.5 rounded-lg transition-all ${isCurved ? 'bg-white shadow text-amber-600' : 'text-gray-400 hover:text-amber-500'}`}
              title="خطوط منحنی"
            >
              <Activity size={16} />
            </button>
          </div>

          <button
            onClick={fitToView}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm"
            title="تناسب نمایش در صفحه"
          >
            <Maximize2 size={18} />
          </button>

          <button
            onClick={exportSVG}
            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-sm"
            title="خروجی SVG"
          >
            <Download size={18} />
          </button>

          <button
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            className={`p-2 rounded-xl border transition-all ${showSettingsPanel ? 'bg-amber-50 border-amber-300 text-amber-600' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 border-gray-200'}`}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
      
      <div 
        className="w-full overflow-auto bg-white rounded-b-xl flex-1 relative"
        style={{ minHeight: height }}
      >
        <svg ref={svgRef} className="min-w-full min-h-full block" />
        
        {/* Render React Portals */}
        {portals.map(p => createPortal(
          <NodeCard
            node={p.nodeData}
            depth={p.depth}
            isActive={selectedNodeId === p.nodeData.id}
            isSelected={configNodeId === String(p.nodeData.id)}
            isRoot={p.isRoot}
            showGaps={showGaps}
            onSelect={(n) => {
              setSelectedNodeId(n.id);
              setConfigNodeId(String(n.id));
              onNodeClick(n);
            }}
            onEdit={(n) => onEditNode?.(n)}
            onDelete={(n) => onDeleteNode(n.id)}
            onAddChild={(n) => onAddNode(n.id, getNextLevel(n.level))}
            onFocus={(n) => {
              onFocusNode?.(n);
              focusOnNode(n.id);
            }}
            onAnchor={(n) => {
              onAnchorNode?.(n);
              anchorOnNode(n.id);
            }}
            showActions={true}
            viewMode={viewMode}
            fontSizeScale={fontSizeScale}
            renderLeafActions={renderLeafActions}
            levelColors={levelColors}
            opacity={nodeOpacity}
          />,
          p.container,
          p.id
        ))}
      </div>

      <TreeSettingsPanel
        isOpen={showSettingsPanel}
        onToggle={() => setShowSettingsPanel(!showSettingsPanel)}
        configNodeId={configNodeId}
        configNodeName={configNodeId ? nodes.find((n: any) => String(n.id) === configNodeId)?.title || null : null}
        fontSizeScale={fontSizeScale}
        onFontSizeChange={(scale) => {
          setFontSizeScale(scale);
          onSettingsChange?.({ fontSizeScale: scale });
        }}
        elbowValue={elbowValue}
        onElbowChange={setElbowValue}
        nodeOpacity={nodeOpacity}
        onNodeOpacityChange={setNodeOpacity}
        isDragMode={isDragMode}
        onToggleDrag={setIsDragMode}
        onResetLayout={handleResetLayout}
        resetConfirmMode={resetConfirmMode}
        isAuthenticated={isAuthenticated}
        levelColors={levelColors}
        onLevelColorChange={(colors) => {
          setLevelColors(colors);
          onSettingsChange?.({ levelColors: colors });
        }}
      />
    </div>
  );
}

export default TreeVisualization;
// src/pages/Trees/components/TreeGraphView.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Maximize, Move, Network, Settings, X, Download, Maximize2, Minimize2 } from 'lucide-react';
import { LEVELS, LEVEL_ORDER } from '../constants/treeLevels';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useSimulatedFullscreen } from '../../../hooks/useSimulatedFullscreen';

interface TreeGraphViewProps {
  nodes: any[];
  treeName: string;
  onNodeClick?: (node: any) => void;
  showLabels?: boolean;
}

export function TreeGraphView({ 
  nodes, 
  treeName, 
  onNodeClick,
  showLabels = true
}: TreeGraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useSimulatedFullscreen();

  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const innerGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  // States for layout and colors
  const [layoutDirection, setLayoutDirection] = useLocalStorage<'LR' | 'RL' | 'TB' | 'BT'>('tree_layoutDirection', 'RL');
  const [showSettings, setShowSettings] = useState(false);
  const [levelColors, setLevelColors] = useState<Record<string, string>>({
    'R': '#3b82f6', 'T': '#8b5cf6', 'B': '#10b981', 'SB': '#f59e0b', 'L': '#6366f1'
  });
  const [levelTextColors, setLevelTextColors] = useState<Record<string, string>>({
    'R': '#ffffff', 'T': '#ffffff', 'B': '#ffffff', 'SB': '#ffffff', 'L': '#ffffff'
  });
  const [levelDescColors, setLevelDescColors] = useState<Record<string, string>>({
    'R': '#e2e8f0', 'T': '#e2e8f0', 'B': '#e2e8f0', 'SB': '#e2e8f0', 'L': '#e2e8f0'
  });

  const treeData = React.useMemo(() => {
    if (!nodes || nodes.length === 0) return null;
    const nodeMap = new Map<number, any>();
    const roots: any[] = [];

    nodes.forEach(node => {
      const levelConfig = LEVELS[node.level] || LEVELS['L'];
      nodeMap.set(node.id, {
        id: node.id,
        name: node.title || 'بدون عنوان',
        level: node.level,
        levelLabel: levelConfig.labelFa,
        color: levelColors[node.level] || levelConfig.color,
        textColor: levelTextColors[node.level] || '#ffffff',
        descColor: levelDescColors[node.level] || '#e2e8f0',
        isGap: node.isGap === 1,
        templateCount: (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])).length || 0,
        description: node.description,
        children: [],
        parentId: node.parentId,
        originalData: node,
      });
    });

    nodes.forEach(node => {
      const currentNode = nodeMap.get(node.id);
      if (!currentNode) return;
      if (node.parentId && nodeMap.has(node.parentId)) {
        const parent = nodeMap.get(node.parentId);
        if (parent) parent.children.push(currentNode);
      } else {
        roots.push(currentNode);
      }
    });

    if (roots.length > 1) {
      return { id: 0, name: treeName || 'درختواره', level: 'ROOT', levelLabel: 'ریشه',
        color: '#1e293b', textColor: '#ffffff', descColor: '#e2e8f0', isGap: false, templateCount: 0, description: null, children: roots, parentId: null, originalData: null };
    }
    return roots.length > 0 ? roots[0] : null;
  }, [nodes, treeName, levelColors, levelTextColors, levelDescColors]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !treeData) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.on('.zoom', null);
    
    svg.style('background', '#fafafa')
       .style('border-radius', '12px')
       .style('cursor', 'grab');

    const innerG = svg.append('g');
    innerGRef.current = innerG;

    let zoom = zoomBehavior.current;
    if (!zoom) {
      zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.01, 20]);
      zoomBehavior.current = zoom;
    }
    
    zoom.on('zoom', (event) => { 
        innerG.attr('transform', event.transform); 
        setZoomLevel(event.transform.k); 
    });
      
    svg.call(zoom);

    // Layout
    const isHorizontal = layoutDirection === 'LR' || layoutDirection === 'RL';
    const treeLayout = d3.tree<any>().nodeSize(isHorizontal ? [60, 250] : [200, 80]);
    
    const root = d3.hierarchy(treeData);
    const treeRoot = treeLayout(root);

    // Compute bounds
    let x0 = Infinity, x1 = -x0, y0 = Infinity, y1 = -y0;
    treeRoot.each((d: any) => {
      if (d.x > x1) x1 = d.x;
      if (d.x < x0) x0 = d.x;
      if (d.y > y1) y1 = d.y;
      if (d.y < y0) y0 = d.y;
    });

    // Links
    const linkPath = (layoutDirection === 'TB' || layoutDirection === 'BT') 
      ? d3.linkVertical<any, any>().x((d: any) => d.x).y((d: any) => layoutDirection === 'TB' ? d.y : -d.y)
      : d3.linkHorizontal<any, any>().x((d: any) => layoutDirection === 'RL' ? -d.y : d.y).y((d: any) => d.x);

    innerG.append('g').attr('fill', 'none').attr('stroke', '#94a3b8').attr('stroke-width', 2)
      .selectAll('path').data(treeRoot.links()).join('path')
      .attr('d', (d: any) => linkPath(d))
      .attr('stroke-dasharray', (d: any) => d.target.data.isGap ? '6,4' : 'none')
      .attr('stroke', (d: any) => d.target.data.isGap ? '#ef4444' : '#94a3b8');

    // Nodes
    const nodeGroup = innerG.append('g').selectAll('g').data(treeRoot.descendants()).join('g')
      .attr('transform', (d: any) => {
         let nx = layoutDirection === 'RL' ? -d.y : layoutDirection === 'LR' ? d.y : d.x;
         let ny = layoutDirection === 'TB' || layoutDirection === 'BT' ? (layoutDirection === 'TB' ? d.y : -d.y) : d.x;
         return `translate(${nx}, ${ny})`;
      })
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => { if (onNodeClick && d.data.originalData) onNodeClick(d.data.originalData); });

    const rectWidth = 140, rectHeight = 40;

    nodeGroup.append('rect').attr('width', rectWidth).attr('height', rectHeight)
      .attr('x', -rectWidth / 2).attr('y', -rectHeight / 2).attr('rx', 8)
      .attr('fill', (d: any) => d.data.level === 'ROOT' ? '#1e293b' : d.data.color)
      .attr('stroke', (d: any) => {
        if (!d.data.isGap) return (d.data.level === 'ROOT' ? '#1e293b' : d.data.color);
        if (d.data.gapStatus === 'filled') return '#10b981';
        if (d.data.gapStatus === 'partially_filled') return '#f59e0b';
        return '#ef4444';
      })
      .attr('stroke-width', (d: any) => d.data.isGap ? 2.5 : 1.5)
      .attr('stroke-dasharray', (d: any) => (d.data.isGap && d.data.gapStatus !== 'filled') ? '4,4' : 'none');

    if (showLabels) {
        const textElement = nodeGroup.append('text').attr('dy', '-5').attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', (d: any) => d.data.textColor)
          .style('font-family', 'Vazirmatn, sans-serif')
          .text((d: any) => { const name = d.data.name || 'بدون عنوان'; return name.length > 18 ? name.substring(0, 16) + '...' : name; });
        
        textElement.append('title')
          .text((d: any) => d.data.name);

        nodeGroup.append('text').attr('dy', '12').attr('text-anchor', 'middle')
          .style('font-size', '9px').style('fill', (d: any) => d.data.descColor)
          .style('font-family', 'Vazirmatn, sans-serif')
          .text((d: any) => d.data.levelLabel || '');
    }

    // Gap indicator
    const gapIndicators = nodeGroup.filter((d: any) => d.data.isGap).append('circle')
      .attr('cx', rectWidth / 2 + 6).attr('cy', -rectHeight / 2 + 6).attr('r', 6)
      .attr('fill', (d: any) => {
        if (d.data.gapStatus === 'filled') return '#10b981';
        if (d.data.gapStatus === 'partially_filled') return '#f59e0b';
        return '#ef4444';
      })
      .attr('stroke', 'white').attr('stroke-width', 2);
      
    gapIndicators.append('title')
      .text((d: any) => {
        if (d.data.gapStatus === 'filled') return 'پوشش کامل (پر شده)';
        if (d.data.gapStatus === 'partially_filled') return 'پوشش جزئی (نیمه‌پر)';
        return 'بدون پوشش (گپ باز) - برای تبدیل به پژوهش کلیک کنید';
      });

    // Initial Zoom Fit
    const graphWidth = isHorizontal ? (y1 - y0) + rectWidth * 2 : (x1 - x0) + rectWidth * 2;
    const graphHeight = isHorizontal ? (x1 - x0) + rectHeight * 2 : (y1 - y0) + rectHeight * 2;
    const scale = Math.min(width / graphWidth, height / graphHeight, 1) * 0.9;

    let tx = width / 2;
    let ty = height / 2;

    if (layoutDirection === 'RL') tx = width - rectWidth;
    else if (layoutDirection === 'LR') tx = rectWidth;
    else if (layoutDirection === 'TB') ty = rectHeight;
    else if (layoutDirection === 'BT') ty = height - rectHeight;

    // Only apply initial transform if it hasn't been set yet (or we can just force fit on data change)
    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));

  }, [treeData, layoutDirection, levelColors, levelTextColors, levelDescColors, showLabels, isFullscreen]);

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehavior.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehavior.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, 0.7);
  };

  const handleFitToView = () => {
    if (!svgRef.current || !zoomBehavior.current || !containerRef.current || !innerGRef.current) return;
    const bbox = innerGRef.current.node()?.getBBox();
    if (!bbox) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const scale = Math.min(width / bbox.width, height / bbox.height, 1) * 0.9;
    const tx = width / 2 - (bbox.x + bbox.width / 2) * scale;
    const ty = height / 2 - (bbox.y + bbox.height / 2) * scale;
    d3.select(svgRef.current).transition().duration(500).call(zoomBehavior.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  };

  
  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    
    // Copy the SVG
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    
    // Set appropriate namespaces if missing
    if (!clonedSvg.getAttribute('xmlns')) {
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clonedSvg);
    
    // Add XML declaration
    svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;
    
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${treeName || 'tree-graph'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!treeData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-12 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Network size={40} className="text-gray-300" />
        </div>
        <h4 className="text-lg font-bold text-gray-600">هیچ گره‌ای برای نمایش وجود ندارد</h4>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={`bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden transition-all relative ${isFullscreen ? 'simulated-fullscreen flex flex-col' : 'h-[calc(100vh-220px)] min-h-[600px] flex flex-col w-full'}`}>
      <div className="p-2 border-b bg-gradient-to-r from-gray-50 to-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600">🌳 نمای درختی</span>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={layoutDirection} 
            onChange={e => setLayoutDirection(e.target.value as any)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-blue-500"
          >
            <option value="RL">راست به چپ</option>
            <option value="LR">چپ به راست</option>
            <option value="TB">بالا به پایین</option>
            <option value="BT">پایین به بالا</option>
          </select>

                      <button type="button" onClick={toggleFullscreen} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-lg shadow-sm" title={isFullscreen ? "خروج از تمام‌صفحه" : "تمام‌صفحه"}>
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button type="button" onClick={handleDownloadSVG} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 border border-gray-200 rounded-lg shadow-sm" title="دانلود SVG"><Download size={16} /></button>
          <button type="button" onClick={() => setShowSettings(true)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-lg shadow-sm" title="تنظیمات رنگ گراف"><Settings size={16} /></button>
          
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <button type="button" onClick={handleZoomOut} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="کوچک‌نمایی"><ZoomOut size={16} /></button>
            <span className="text-xs font-mono text-gray-500 min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</span>
            <button type="button" onClick={handleZoomIn} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="بزرگ‌نمایی"><ZoomIn size={16} /></button>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button type="button" onClick={handleFitToView} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="فیت کردن در صفحه"><Maximize size={16} /></button>
          </div>
        </div>
      </div>
      
      <div ref={containerRef} className="w-full relative flex-1 min-h-0">
        <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-gray-200 p-2 rounded-lg text-[10px] text-gray-500 shadow-sm pointer-events-none">
          <div className="flex items-center gap-1 mb-1"><Move size={12} /> درگ (کشیدن) برای حرکت</div>
          <div className="flex items-center gap-1">🔄 اسکرول ماوس برای زوم</div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
             <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
               <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings size={18} className="text-gray-600"/> تنظیمات رنگ‌های گراف</h3>
               <button type="button" onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
             </div>
             <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
                <div className="space-y-4">
                  {LEVEL_ORDER.map(lvl => (
                    <div key={lvl} className="bg-gray-50 border border-gray-100 p-3 rounded-xl space-y-3">
                      <h4 className="text-sm font-bold text-gray-700 border-b pb-2">{LEVELS[lvl].labelFa} ({lvl})</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">پس‌زمینه گره</label>
                          <input type="color" value={levelColors[lvl] || LEVELS[lvl].color} onChange={e => setLevelColors({...levelColors, [lvl]: e.target.value})} className="w-full h-8 rounded cursor-pointer border-0 p-0 shadow-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">متن عنوان</label>
                          <input type="color" value={levelTextColors[lvl] || '#ffffff'} onChange={e => setLevelTextColors({...levelTextColors, [lvl]: e.target.value})} className="w-full h-8 rounded cursor-pointer border-0 p-0 shadow-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">متن توضیحات</label>
                          <input type="color" value={levelDescColors[lvl] || '#e2e8f0'} onChange={e => setLevelDescColors({...levelDescColors, [lvl]: e.target.value})} className="w-full h-8 rounded cursor-pointer border-0 p-0 shadow-sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
             <div className="p-4 bg-gray-50 flex justify-end border-t border-gray-200">
               <button type="button" onClick={() => setShowSettings(false)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">تایید و بستن</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

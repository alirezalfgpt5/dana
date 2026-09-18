// src/utils/graphUtils.ts
// ابزارهای تولید داده‌های گراف برای D3.js

export interface GraphNode {
  id: number;
  title: string;
  level: string;
  parentId: number | null;
  isGap: boolean;
  gapStatus: string | null;
  hasResearch: boolean;
  templateIds: string[];
  sortOrder: number;
  children?: GraphNode[];
}

export interface GraphLink {
  source: number;
  target: number;
}

export interface GraphData {
  tree: {
    id: number;
    name: string;
    type: string;
  };
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    totalNodes: number;
    leaves: number;
    gaps: number;
    researchItems: number;
    byLevel: Record<string, number>;
  };
}

// ============================================
// تبدیل داده‌های درختواره به فرمت D3
// ============================================

export function toD3Format(nodes: any[], tree: any): GraphData {
  // ساخت ساختار درختی
  const nodeMap = new Map<number, GraphNode>();
  const roots: GraphNode[] = [];

  // ایجاد گره‌ها
  nodes.forEach((node) => {
    const graphNode: GraphNode = {
      id: node.id,
      title: node.title,
      level: node.level,
      parentId: node.parentId,
      isGap: node.isGap === 1,
      gapStatus: node.gapStatus,
      hasResearch: false,
      templateIds: (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])) || [],
      sortOrder: node.sortOrder || 0,
      children: [],
    };
    nodeMap.set(node.id, graphNode);
  });

  // ساخت روابط والد-فرزند
  nodes.forEach((node) => {
    const currentNode = nodeMap.get(node.id);
    if (!currentNode) return;

    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(currentNode);
      }
    } else {
      roots.push(currentNode);
    }
  });

  // مرتب‌سازی فرزندان بر اساس sortOrder
  const sortChildren = (node: GraphNode) => {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      node.children.forEach((child) => sortChildren(child));
    }
  };
  roots.forEach((root) => sortChildren(root));

  // ایجاد لینک‌ها
  const links: GraphLink[] = [];
  nodes.forEach((node) => {
    if (node.parentId) {
      links.push({
        source: node.parentId,
        target: node.id,
      });
    }
  });

  // محاسبه آمار
  const leaves = nodes.filter((n) => n.level === 'L').length;
  const gaps = nodes.filter((n) => n.isGap === 1).length;
  const byLevel = nodes.reduce((acc: Record<string, number>, node) => {
    acc[node.level] = (acc[node.level] || 0) + 1;
    return acc;
  }, {});

  return {
    tree: {
      id: tree.id,
      name: tree.name,
      type: tree.type,
    },
    nodes: nodes.map((node) => ({
      id: node.id,
      title: node.title,
      level: node.level,
      parentId: node.parentId,
      isGap: node.isGap === 1,
      gapStatus: node.gapStatus,
      hasResearch: false,
      templateIds: (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])) || [],
      sortOrder: node.sortOrder || 0,
    })),
    links,
    stats: {
      totalNodes: nodes.length,
      leaves,
      gaps,
      researchItems: 0,
      byLevel,
    },
  };
}

// ============================================
// تولید داده‌های گراف برای D3.js با رنگ‌بندی
// ============================================

export function generateD3Data(graphData: GraphData) {
  const { nodes, links, tree, stats } = graphData;

  // رنگ‌های سطوح
  const levelColors: Record<string, string> = {
    R: '#3b82f6', // آبی
    T: '#8b5cf6', // بنفش
    B: '#10b981', // سبز
    SB: '#f59e0b', // زرد
    L: '#6366f1', // نیلی
  };

  // رنگ گپ‌ها
  const gapColor = '#ef4444'; // قرمز

  // آماده‌سازی داده‌ها برای D3
  const d3Nodes = nodes.map((node) => ({
    id: node.id,
    title: node.title,
    level: node.level,
    color: node.isGap ? gapColor : levelColors[node.level] || '#6b7280',
    isGap: node.isGap,
    gapStatus: node.gapStatus,
    radius: node.level === 'L' ? 14 : node.level === 'SB' ? 18 : node.level === 'B' ? 22 : node.level === 'T' ? 26 : 30,
    fontWeight: node.level === 'R' || node.level === 'T' ? 'bold' : 'normal',
    fontSize: node.level === 'L' ? 10 : node.level === 'SB' ? 11 : 12,
  }));

  const d3Links = links.map((link) => ({
    source: link.source,
    target: link.target,
  }));

  return {
    nodes: d3Nodes,
    links: d3Links,
    tree: {
      name: tree.name,
      type: tree.type,
    },
    stats,
    levelColors,
    gapColor,
  };
}

// ============================================
// تولید داده‌های شکاف برای نمایش
// ============================================

export function generateGapData(gaps: any[], nodes: any[]) {
  const gapNodes = gaps
    .filter((gap) => gap.status === 'open')
    .map((gap) => {
      const node = nodes.find((n) => n.id === gap.requiredNodeId);
      return {
        id: gap.id,
        nodeId: gap.requiredNodeId,
        title: node?.title || 'نامشخص',
        level: node?.level || 'L',
        status: gap.status,
        gapType: gap.gapType,
        priority: gap.priority,
        description: gap.description,
      };
    });

  const stats = {
    total: gaps.length,
    open: gaps.filter((g) => g.status === 'open').length,
    filled: gaps.filter((g) => g.status === 'filled').length,
    partial: gaps.filter((g) => g.status === 'partially_filled').length,
    byPriority: gaps.reduce((acc: Record<string, number>, gap) => {
      const priority = gap.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {}),
  };

  return {
    gaps: gapNodes,
    stats,
  };
}

// ============================================
// تولید داده‌های پژوهشی برای نمایش
// ============================================

export function generateResearchData(researchItems: any[], nodes: any[]) {
  const researchNodes = researchItems.map((item) => {
    const node = nodes.find((n) => n.id === item.nodeId);
    return {
      id: item.id,
      nodeId: item.nodeId,
      title: node?.title || 'نامشخص',
      level: node?.level || 'L',
      importance: item.importance,
      priority: item.priority,
      timeFrame: item.timeFrame,
      combatImpact: item.combatImpact,
      costBenefit: item.costBenefit,
      programCoverages: item.programCoverages || [],
    };
  });

  const stats = {
    total: researchItems.length,
    byImportance: researchItems.reduce((acc: Record<string, number>, item) => {
      const importance = item.importance || 'عملیاتی';
      acc[importance] = (acc[importance] || 0) + 1;
      return acc;
    }, {}),
    byPriority: researchItems.reduce((acc: Record<string, number>, item) => {
      const priority = item.priority || 'متوسط';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {}),
    byTimeFrame: researchItems.reduce((acc: Record<string, number>, item) => {
      const timeFrame = item.timeFrame || 'میان‌مدت';
      acc[timeFrame] = (acc[timeFrame] || 0) + 1;
      return acc;
    }, {}),
  };

  return {
    research: researchNodes,
    stats,
  };
}

// ============================================
// تبدیل داده‌های مسائل به فرمت گراف
// ============================================

export function generateIssueData(issues: any[], nodes: any[]) {
  const issueNodes = issues.map((issue) => {
    const node = nodes.find((n) => n.id === issue.nodeId);
    return {
      id: issue.id,
      nodeId: issue.nodeId,
      title: issue.title,
      domain: issue.domain,
      status: issue.status,
      priority: issue.actionPriority,
      completionPercent: issue.completionPercent || 0,
      requiredBudget: issue.requiredBudget || 0,
      nodeTitle: node?.title || 'نامشخص',
    };
  });

  const stats = {
    total: issues.length,
    pending: issues.filter((i) => i.status === 'pending').length,
    inProgress: issues.filter((i) => i.status === 'in_progress').length,
    completed: issues.filter((i) => i.status === 'completed').length,
    canceled: issues.filter((i) => i.status === 'canceled').length,
    onHold: issues.filter((i) => i.status === 'on_hold').length,
    byPriority: issues.reduce((acc: Record<string, number>, issue) => {
      const priority = issue.actionPriority || 'متوسط';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {}),
    totalBudget: issues.reduce((sum, issue) => sum + (issue.requiredBudget || 0), 0),
    avgCompletion: issues.length > 0
      ? Math.round(issues.reduce((sum, issue) => sum + (issue.completionPercent || 0), 0) / issues.length)
      : 0,
  };

  return {
    issues: issueNodes,
    stats,
  };
}

export default {
  toD3Format,
  generateD3Data,
  generateGapData,
  generateResearchData,
  generateIssueData,
};
// src/utils/treeUtils.ts
// ابزارهای کار با درختواره

export interface TreeNode {
  id: number;
  treeId: number;
  parentId: number | null;
  level: string;
  title: string;
  description: string | null;
  templateIds: string | null;
  levelId: number | null;
  sortOrder: number;
  isGap: number;
  gapStatus: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  children?: TreeNode[];
}

export interface TreeStructure {
  id: number;
  name: string;
  type: string;
  description: string | null;
  nodes: TreeNode[];
}

// ============================================
// ساخت ساختار درختی از لیست گره‌ها
// ============================================

export function buildTree(nodes: TreeNode[]): TreeNode[] {
  const nodeMap = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  // ایجاد نقشه
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // ساخت سلسله‌مراتب
  nodes.forEach(node => {
    const currentNode = nodeMap.get(node.id);
    if (!currentNode) return;

    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(currentNode);
      }
    } else {
      roots.push(currentNode);
    }
  });

  return roots;
}

// ============================================
// جستجوی گره در درختواره
// ============================================

export function findNode(nodes: TreeNode[], id: number): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// ============================================
// دریافت مسیر یک گره تا ریشه
// ============================================

export function getPath(nodes: TreeNode[], id: number): TreeNode[] {
  const path: TreeNode[] = [];
  let current = findNode(nodes, id);
  
  while (current) {
    path.unshift(current);
    if (current.parentId) {
      current = findNode(nodes, current.parentId);
    } else {
      break;
    }
  }
  
  return path;
}

// ============================================
// دریافت تمام برگ‌ها (گره‌های سطح L)
// ============================================

export function getLeaves(nodes: TreeNode[]): TreeNode[] {
  const leaves: TreeNode[] = [];
  
  function traverse(node: TreeNode) {
    if (node.level === 'L') {
      leaves.push(node);
    }
    if (node.children) {
      node.children.forEach(child => traverse(child));
    }
  }
  
  const roots = buildTree(nodes);
  roots.forEach(root => traverse(root));
  
  return leaves;
}

// ============================================
// دریافت گره‌های با گپ
// ============================================

export function getGapNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.filter(node => node.isGap === 1);
}

// ============================================
// دریافت گره‌های با سطح مشخص
// ============================================

export function getNodesByLevel(nodes: TreeNode[], level: string): TreeNode[] {
  return nodes.filter(node => node.level === level);
}

// ============================================
// محاسبه عمق درختواره
// ============================================

export function getTreeDepth(nodes: TreeNode[]): number {
  let maxDepth = 0;
  
  function traverse(node: TreeNode, depth: number) {
    if (depth > maxDepth) maxDepth = depth;
    if (node.children) {
      node.children.forEach(child => traverse(child, depth + 1));
    }
  }
  
  const roots = buildTree(nodes);
  roots.forEach(root => traverse(root, 1));
  
  return maxDepth;
}

// ============================================
// محاسبه تعداد گره‌های هر سطح
// ============================================

export function getLevelCounts(nodes: TreeNode[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  nodes.forEach(node => {
    counts[node.level] = (counts[node.level] || 0) + 1;
  });
  
  return counts;
}

// ============================================
// تبدیل گره‌ها به فرمت D3
// ============================================

export function toD3Format(nodes: TreeNode[]): any {
  const roots = buildTree(nodes);
  
  function convertNode(node: TreeNode): any {
    return {
      id: node.id,
      title: node.title,
      level: node.level,
      isGap: node.isGap === 1,
      gapStatus: node.gapStatus,
      templateIds: (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])) || [],
      children: node.children ? node.children.map(child => convertNode(child)) : [],
    };
  }
  
  return roots.length > 0 ? convertNode(roots[0]) : null;
}

// ============================================
// مقایسه دو درختواره (برای تحلیل شکاف)
// ============================================

export function compareTrees(
  requiredNodes: TreeNode[],
  producedNodes: TreeNode[]
): {
  matched: TreeNode[];
  missing: TreeNode[];
  partial: TreeNode[];
} {
  const matched: TreeNode[] = [];
  const missing: TreeNode[] = [];
  const partial: TreeNode[] = [];

  // دریافت برگ‌ها
  const requiredLeaves = getLeaves(requiredNodes);
  const producedLeaves = getLeaves(producedNodes);

  for (const required of requiredLeaves) {
    // جستجوی تطابق دقیق
    const exactMatch = producedLeaves.find(p => p.title === required.title);
    
    if (exactMatch) {
      // بررسی تطابق قالب‌ها
      const reqTemplates = (Array.isArray(required.templateIds) ? required.templateIds : (required.templateIds ? String(required.templateIds).split(',').filter(Boolean) : [])) || [];
      const prodTemplates = (Array.isArray(exactMatch.templateIds) ? exactMatch.templateIds : (exactMatch.templateIds ? String(exactMatch.templateIds).split(',').filter(Boolean) : [])) || [];
      
      if (reqTemplates.every(t => prodTemplates.includes(t))) {
        matched.push(required);
      } else {
        partial.push(required);
      }
    } else {
      // جستجوی تطابق فازی
      const keywords = required.title.split(' ');
      const fuzzyMatch = producedLeaves.find(p => 
        keywords.some(k => p.title.includes(k))
      );
      
      if (fuzzyMatch) {
        partial.push(required);
      } else {
        missing.push(required);
      }
    }
  }

  return { matched, missing, partial };
}

// ============================================
// دریافت آمار درختواره
// ============================================

export function getTreeStats(nodes: TreeNode[]) {
  const total = nodes.length;
  const leaves = getLeaves(nodes).length;
  const gaps = getGapNodes(nodes).length;
  const depth = getTreeDepth(nodes);
  const levelCounts = getLevelCounts(nodes);
  const templates = new Set<string>();
  
  nodes.forEach(node => {
    const ids = (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])) || [];
    ids.forEach(id => templates.add(id));
  });

  return {
    total,
    leaves,
    gaps,
    depth,
    levelCounts,
    templateCount: templates.size,
  };
}

// ============================================
// فیلتر کردن گره‌ها
// ============================================

export function filterNodes(
  nodes: TreeNode[],
  options: {
    search?: string;
    level?: string;
    hasGap?: boolean;
    templateId?: string;
  }
): TreeNode[] {
  let filtered = [...nodes];

  if (options.search) {
    const term = options.search.toLowerCase();
    filtered = filtered.filter(node =>
      node.title.toLowerCase().includes(term) ||
      node.description?.toLowerCase().includes(term)
    );
  }

  if (options.level) {
    filtered = filtered.filter(node => node.level === options.level);
  }

  if (options.hasGap !== undefined) {
    filtered = filtered.filter(node => 
      options.hasGap ? node.isGap === 1 : node.isGap === 0
    );
  }

  if (options.templateId) {
    filtered = filtered.filter(node =>
      node.templateIds?.includes(options.templateId as string)
    );
  }

  return filtered;
}

export default {
  buildTree,
  findNode,
  getPath,
  getLeaves,
  getGapNodes,
  getNodesByLevel,
  getTreeDepth,
  getLevelCounts,
  toD3Format,
  compareTrees,
  getTreeStats,
  filterNodes,
};
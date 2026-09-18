import express from 'express';
import { db, sqlite } from '../../src/db/index.js';
import { issues, treeNodes, gaps, knowledgeTrees, users } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/rbac.js';

export const reportRoutes = express.Router();

reportRoutes.get('/org-stats', requireAuth, async (req: any, res) => {
  try {
    const bases = sqlite.prepare('SELECT id, name FROM bases WHERE is_active = 1').all() as any[];
    const trees = sqlite.prepare('SELECT id, base_id FROM knowledge_trees WHERE is_active = 1 AND base_id IS NOT NULL').all() as any[];
    
    const gapsInfo = sqlite.prepare(`
      SELECT g.id, n.tree_id 
      FROM gaps g 
      JOIN tree_nodes n ON g.required_node_id = n.id
    `).all() as any[];
    
    const issuesInfo = sqlite.prepare(`
      SELECT i.id, COALESCE(n1.tree_id, n2.tree_id, n3.tree_id) as tree_id
      FROM issues i
      LEFT JOIN tree_nodes n1 ON i.domain_node_id = n1.id
      LEFT JOIN research_items r ON i.research_item_id = r.id
      LEFT JOIN tree_nodes n2 ON r.node_id = n2.id
      LEFT JOIN gaps g ON r.gap_id = g.id
      LEFT JOIN tree_nodes n3 ON g.required_node_id = n3.id
    `).all() as any[];
    
    const statsByBase = bases.map(base => {
      const baseTrees = trees.filter(t => t.base_id === base.id).map(t => t.id);
      const baseGapsCount = gapsInfo.filter(g => baseTrees.includes(g.tree_id)).length;
      const baseIssuesCount = issuesInfo.filter(i => baseTrees.includes(i.tree_id)).length;
      
      return {
        baseId: base.id,
        baseName: base.name,
        treesCount: baseTrees.length,
        gapsCount: baseGapsCount,
        issuesCount: baseIssuesCount
      };
    });
    
    res.json(statsByBase);
  } catch (error: any) {
    console.error('Error fetching org stats:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار سازمانی' });
  }
});

reportRoutes.get('/data', requireAuth, async (req, res) => {
  try {
    const issuesData = await db.select({
      id: issues.id,
      title: issues.title,
      status: issues.status,
      actionPriority: issues.actionPriority,
      knowledgeType: issues.knowledgeType,
      createdAt: issues.createdAt,
      domainNodeId: issues.domainNodeId,
    }).from(issues);

    const gapsData = await db.select({
      id: gaps.id,
      status: gaps.status,
      description: gaps.description,
      createdAt: gaps.createdAt,
    }).from(gaps);

    const nodesData = await db.select({
      id: treeNodes.id,
      title: treeNodes.title,
      level: treeNodes.level,
      levelId: treeNodes.levelId,
    }).from(treeNodes);

    res.json({
      issues: issuesData,
      gaps: gapsData,
      nodes: nodesData,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در دریافت اطلاعات گزارش‌ساز' });
  }
});

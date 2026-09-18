import express from 'express';
import { db } from '../../src/db/index.js';
import { treeNodes, issues, gaps, knowledgeTrees, files } from '../../src/db/schema.js';
import { sql, like, or } from 'drizzle-orm';
import { requireAuth } from '../middleware/rbac.js';

export const searchRoutes = express.Router();

searchRoutes.get('/', requireAuth, async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q || q.trim() === '') {
      return res.json({ nodes: [], issues: [], gaps: [], trees: [], files: [] });
    }

    const searchTerm = `%${q}%`;

    const yieldLoop = () => new Promise(resolve => setImmediate(resolve));

    const nodesData = await db.select().from(treeNodes).where(or(
      like(treeNodes.title, searchTerm),
      like(treeNodes.description, searchTerm),
      like(treeNodes.level, searchTerm)
    )).limit(50);
    await yieldLoop();

    const issuesData = await db.select().from(issues).where(or(
      like(issues.title, searchTerm),
      like(issues.solutionDirection, searchTerm),
      like(issues.responsibleUnit, searchTerm)
    )).limit(50);
    await yieldLoop();

    const gapsData = await db.select().from(gaps).where(
      like(gaps.description, searchTerm)
    ).limit(50);
    await yieldLoop();

    const treesData = await db.select().from(knowledgeTrees).where(or(
      like(knowledgeTrees.name, searchTerm),
      like(knowledgeTrees.description, searchTerm)
    )).limit(50);
    await yieldLoop();

    const filesData = await db.select().from(files).where(or(
      like(files.name, searchTerm),
      like(files.path, searchTerm)
    )).limit(50);

    res.json({
      nodes: nodesData,
      issues: issuesData,
      gaps: gapsData,
      trees: treesData,
      files: filesData,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در جستجوی عمیق' });
  }
});

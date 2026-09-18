import { Router } from 'express';
import { 
  projectLevels, approvalAuthorities, knowledgeProjectTypes, 
  scientificDiplomacyLevels, confidentialityLevels, actionPriorities,
  templates, knowledgeLevels, knowledgeTypes, researchProjectTypes, eventTypes, organizationalLevels,
  treeNodeTypes,
  knowledgeDomains,
  researchNetworks,
  systemSettings,
  treeNodes,
  programCoverages
} from '../../src/db/schema.js';
import { db, sqlite } from '../../src/db/index.js';
import { eq, and, like, desc, isNull } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';
import { requireRole } from "../middleware/rbac.js";

export const metadataRoutes = Router();

// ==================== TEMPLATES ====================
metadataRoutes.get('/templates', async (req: any, res: any) => {
  try {
    const { type, isActive, search, parentId } = req.query;
    let query = db.select().from(templates);
    const conditions: any[] = [];
    if (type) conditions.push(eq(templates.type, type as string));
    if (isActive !== undefined) conditions.push(eq(templates.isActive, Number(isActive)));
    if (search) conditions.push(like(templates.title, `%${search}%`));
    if (parentId !== undefined) {
      if (parentId === 'null') {
        conditions.push(isNull(templates.parentId));
      } else {
        conditions.push(eq(templates.parentId, Number(parentId)));
      }
    }
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    const result = await query.orderBy(templates.sortOrder);
    res.json(result);
  } catch (error) { 
    console.error('❌ Error fetching templates:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

metadataRoutes.post('/templates', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
  try {
    const { type, title, parentId, description, metadata } = req.body;
    const now = new Date().toISOString();
    const result = await db.insert(templates).values({
      type, title, parentId: parentId || null, description: description || null, 
      metadata: metadata || null, isActive: 1, sortOrder: 0, 
      createdAt: now, updatedAt: now,
    }).returning();
    res.status(201).json((result as any[])[0] || result);
  } catch (error) { 
    console.error('❌ Error creating template:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

metadataRoutes.put('/templates/:id', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { type, title, parentId, description, isActive, sortOrder, metadata } = req.body;
    const now = new Date().toISOString();
    const result = await db.update(templates)
      .set({ type, title, parentId, description, isActive, sortOrder, metadata, updatedAt: now })
      .where(eq(templates.id, Number(id)))
      .returning();
    res.json(result[0]);
  } catch (error) { 
    console.error('❌ Error updating template:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

metadataRoutes.delete('/templates/:id', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
  try {
    const idNum = Number(req.params.id);
    const allNodes = await db.query.treeNodes.findMany();
    for (const node of allNodes) {
      if (!node.templateIds) continue;
      const ids = String(node.templateIds).split(',').filter(Boolean);
      if (ids.includes(String(idNum))) {
        const newIds = ids.filter(i => i !== String(idNum)).join(',');
        await db.update(treeNodes).set({ templateIds: newIds }).where(eq(treeNodes.id, node.id));
      }
    }
    await db.delete(templates).where(eq(templates.id, idNum));
    res.json({ success: true, message: 'قالب با موفقیت حذف شد' });
  } catch (error) { 
    console.error('❌ Error deleting template:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

// ==================== KNOWLEDGE LEVELS ====================
metadataRoutes.get('/levels', async (req: any, res: any) => {
  try {
    const { isActive, search } = req.query;
    let query = db.select().from(knowledgeLevels);
    const conditions: any[] = [];
    if (isActive !== undefined) conditions.push(eq(knowledgeLevels.isActive, Number(isActive)));
    if (search) conditions.push(like(knowledgeLevels.name, `%${search}%`));
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    const result = await query.orderBy(knowledgeLevels.sortOrder);
    res.json(result);
  } catch (error) { 
    console.error('❌ Error fetching levels:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

metadataRoutes.post('/levels', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
  try {
    const { name, description, parentId, metadata } = req.body;
    const now = new Date().toISOString();
    const result = await db.insert(knowledgeLevels).values({
      name, description: description || null, parentId: parentId || null, 
      metadata: metadata || null, isActive: 1, sortOrder: 0, 
      createdAt: now, updatedAt: now,
    }).returning();
    res.status(201).json((result as any[])[0] || result);
  } catch (error) { 
    console.error('❌ Error creating level:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

metadataRoutes.put('/levels/:id', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, description, parentId, isActive, sortOrder, metadata } = req.body;
    const now = new Date().toISOString();
    const result = await db.update(knowledgeLevels)
      .set({ name, description, parentId, isActive, sortOrder, metadata, updatedAt: now })
      .where(eq(knowledgeLevels.id, Number(id)))
      .returning();
    res.json(result[0]);
  } catch (error) { 
    console.error('❌ Error updating level:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

metadataRoutes.delete('/levels/:id', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
  try {
    await db.delete(knowledgeLevels).where(eq(knowledgeLevels.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (error) { 
    console.error('❌ Error deleting level:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

// ==================== KNOWLEDGE TYPES ====================
metadataRoutes.get('/knowledge-types', async (req: any, res: any) => {
  try {
    const { isActive, search } = req.query;
    let query = db.select().from(knowledgeTypes);
    const conditions: any[] = [];
    if (isActive !== undefined) conditions.push(eq(knowledgeTypes.isActive, Number(isActive)));
    if (search) conditions.push(like(knowledgeTypes.name, `%${search}%`));
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    const result = await query.orderBy(knowledgeTypes.sortOrder);
    res.json(result);
  } catch (error) { 
    console.error('❌ Error fetching knowledge types:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

metadataRoutes.post('/knowledge-types', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
  try {
    const { name, category, description } = req.body;
    const now = new Date().toISOString();
    const result = await db.insert(knowledgeTypes).values({
      name, category: category || null, description: description || null, 
      isActive: 1, sortOrder: 0, createdAt: now, updatedAt: now,
    }).returning();
    res.status(201).json((result as any[])[0] || result);
  } catch (error) { 
    console.error('❌ Error creating knowledge type:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

metadataRoutes.put('/knowledge-types/:id', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
  try {
    const { name, category } = req.body;
    const now = new Date().toISOString();
    const result = await db.update(knowledgeTypes)
      .set({ name, category: category || null, updatedAt: now })
      .where(eq(knowledgeTypes.id, Number(req.params.id)))
      .returning();
    res.json((result as any[])[0] || result);
  } catch (error) { 
    console.error('❌ Error updating knowledge type:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

metadataRoutes.delete('/knowledge-types/:id', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
  try {
    await db.delete(knowledgeTypes).where(eq(knowledgeTypes.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (error) { 
    console.error('❌ Error deleting knowledge type:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

// ==================== ORGANIZATIONAL LEVELS ====================
metadataRoutes.get('/org-levels', async (req: any, res: any) => {
  try {
    const { isActive, search } = req.query;
    let query = db.select().from(organizationalLevels);
    const conditions: any[] = [];
    if (isActive !== undefined) conditions.push(eq(organizationalLevels.isActive, Number(isActive)));
    if (search) conditions.push(like(organizationalLevels.name, `%${search}%`));
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    const result = await query.orderBy(organizationalLevels.sortOrder);
    res.json(result);
  } catch (error) { 
    console.error('❌ Error fetching org levels:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

metadataRoutes.post('/org-levels', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
  try {
    const { name, description, parentId } = req.body;
    const now = new Date().toISOString();
    const result = await db.insert(organizationalLevels).values({
      name, description: description || null, parentId: parentId || null,
      isActive: 1, sortOrder: 0, createdAt: now, updatedAt: now,
    }).returning();
    res.status(201).json((result as any[])[0] || result);
  } catch (error) { 
    console.error('❌ Error creating org level:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

metadataRoutes.put('/org-levels/:id', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
  try {
    const { name, description, parentId } = req.body;
    const now = new Date().toISOString();
    const result = await db.update(organizationalLevels)
      .set({ name, description: description || null, parentId: parentId || null, updatedAt: now })
      .where(eq(organizationalLevels.id, Number(req.params.id)))
      .returning();
    res.json((result as any[])[0] || result);
  } catch (error) { 
    console.error('❌ Error updating org level:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

metadataRoutes.delete('/org-levels/:id', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
  try {
    await db.delete(organizationalLevels).where(eq(organizationalLevels.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (error) { 
    console.error('❌ Error deleting org level:', error);
    res.status(500).json({ error: 'Server error' }); 
  }
});

// ==================== GENERIC ENDPOINTS (با روشی که کار می‌کند) ====================
function createMetadataEndpoints(router: any, path: string, table: any) {
  // GET
  router.get(path, async (req: any, res: any) => {
    try {
      const { isActive, search } = req.query;
      let query = db.select().from(table);
      const conditions: any[] = [];
      if (isActive !== undefined) conditions.push(eq(table.isActive, Number(isActive)));
      if (search) conditions.push(like(table.name, `%${search}%`));
      if (conditions.length > 0) query = query.where(and(...conditions)) as any;
      const result = await query.orderBy(table.sortOrder);
      res.json(result);
    } catch (error) { 
      console.error(`❌ Error fetching ${path}:`, error);
      res.status(500).json({ error: 'Server error' }); 
    }
  });

  // POST
  router.post(path, requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'نام الزامی است' });
      const now = new Date().toISOString();
      const result = await db.insert(table).values({
        name, isActive: 1, sortOrder: 0, createdAt: now, updatedAt: now
      }).returning();
      res.status(201).json((result as any[])[0] || result);
    } catch (error) { 
      console.error(`❌ Error creating ${path}:`, error);
      res.status(500).json({ error: 'Server error' }); 
    }
  });

  // DELETE
  router.delete(path + '/:id', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
    try {
      await db.delete(table).where(eq(table.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (error) { 
      console.error(`❌ Error deleting ${path}:`, error);
      res.status(500).json({ error: 'Server error' }); 
    }
  });
}

// اجرای تابع برای همه مسیرها
createMetadataEndpoints(metadataRoutes, '/project-levels', projectLevels);
createMetadataEndpoints(metadataRoutes, '/approval-authorities', approvalAuthorities);
createMetadataEndpoints(metadataRoutes, '/knowledge-project-types', knowledgeProjectTypes);
createMetadataEndpoints(metadataRoutes, '/scientific-diplomacy-levels', scientificDiplomacyLevels);
createMetadataEndpoints(metadataRoutes, '/confidentiality-levels', confidentialityLevels);
createMetadataEndpoints(metadataRoutes, '/action-priorities', actionPriorities);
createMetadataEndpoints(metadataRoutes, '/research-project-types', researchProjectTypes);
createMetadataEndpoints(metadataRoutes, '/event-types', eventTypes);
createMetadataEndpoints(metadataRoutes, '/tree-node-types', treeNodeTypes);
createMetadataEndpoints(metadataRoutes, '/knowledge-domains', knowledgeDomains);
createMetadataEndpoints(metadataRoutes, '/research-networks', researchNetworks);
createMetadataEndpoints(metadataRoutes, '/program-coverages', programCoverages);

// ==================== SYSTEM SETTINGS ====================
metadataRoutes.get('/system-settings', async (req: any, res: any) => {
  try {
    const settings = await db.select().from(systemSettings);
    const settingsObj: Record<string, string> = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    res.json(settingsObj);
  } catch (error) {
    console.error('❌ Error fetching settings:', error);
    res.status(500).json({ error: 'خطا در دریافت تنظیمات سیستم' });
  }
});

metadataRoutes.post('/system-settings', requireRole(['admin', 'superadmin']), async (req: any, res: any) => {
  try {
    const settingsObj = req.body;
    const now = new Date().toISOString();
    for (const [key, value] of Object.entries(settingsObj)) {
      if (value !== undefined && value !== null) {
        await db.insert(systemSettings)
          .values({ key, value: String(value), updatedAt: now })
          .onConflictDoUpdate({
            target: systemSettings.key,
            set: { value: String(value), updatedAt: now }
          });
      }
    }
    const settings = await db.select().from(systemSettings);
    const updatedSettingsObj: Record<string, string> = {};
    settings.forEach(s => {
      updatedSettingsObj[s.key] = s.value;
    });
    res.json(updatedSettingsObj);
  } catch (error) {
    console.error('❌ Error saving settings:', error);
    res.status(500).json({ error: 'خطا در ذخیره تنظیمات سیستم' });
  }
});

export default metadataRoutes;
import { Router } from 'express';
import { db, sqlite } from '../../src/db/index.js';

export const dynamicFieldsRoutes = Router();

// GET all dynamic fields for an entity type
dynamicFieldsRoutes.get('/:entityType', (req, res) => {
  try {
    const { entityType } = req.params;
    const fields = sqlite.prepare(`
      SELECT * FROM dynamic_fields 
      WHERE entity_type = ? AND is_active = 1
      ORDER BY sort_order ASC
    `).all(entityType);
    
    // Convert snake_case to camelCase and parse options
    const formattedFields = fields.map((f: any) => ({
      id: f.id,
      entityType: f.entity_type,
      name: f.name,
      label: f.label,
      fieldType: f.field_type,
      options: f.options,
      isRequired: f.is_required,
      sortOrder: f.sort_order,
      isActive: f.is_active,
    }));
    
    res.json(formattedFields);
  } catch (error) {
    console.error('Error fetching dynamic fields:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST new dynamic field
dynamicFieldsRoutes.post('/', (req, res) => {
  try {
    const { entityType, name, label, fieldType, options, isRequired, sortOrder } = req.body;
    
    const now = new Date().toISOString();
    const result = sqlite.prepare(`
      INSERT INTO dynamic_fields 
      (entity_type, name, label, field_type, options, is_required, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      entityType, 
      name, 
      label, 
      fieldType, 
      options ? JSON.stringify(options) : null,
      isRequired ? 1 : 0, 
      sortOrder || 0,
      now, 
      now
    );
    
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating dynamic field:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// DELETE dynamic field
dynamicFieldsRoutes.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    sqlite.prepare('DELETE FROM dynamic_fields WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting dynamic field:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

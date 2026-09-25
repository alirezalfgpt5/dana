// src/db/schema.ts
// سیستم مدیریت دانش - نسخه ۳.۱ با پشتیبانی از نمونه‌های قالب
// تاریخ: ۱۴۰۴/۰۵/۰۵

import { sqliteTable, text, integer, real, index, AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================
// ۱. جداول اصلی سیستم
// ============================================

// ۱-۱. کاربران

export const roles = sqliteTable('roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  label: text('label').notNull(),
  permissions: text('permissions').notNull(),
  isSystem: integer('is_system').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('user'),
  organizationLevel: text('organization_level'),
  baseId: integer('base_id').references(() => bases.id, { onDelete: 'set null' }),
  unitId: integer('unit_id').references(() => units.id, { onDelete: 'set null' }),
  phone: text('phone'),
  rank: text('rank'),
  photoUrl: text('photo_url'),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
}, (table) => ({
  orgLevelIdx: index('users_org_level_idx').on(table.organizationLevel),
}));

// ۱-۲. ساختار سازمانی
export const bases = sqliteTable('bases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  location: text('location'),
  level: text('level'),
  parentId: integer('parent_id'),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const units = sqliteTable('units', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  baseId: integer('base_id').references(() => bases.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  level: text('level'),
  parentId: integer('parent_id'),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

// ۱-۳. دوره‌های زمانی
export const periods = sqliteTable('periods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  isActive: integer('is_active').default(0),
  isComplete: integer('is_complete').default(0),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ============================================
// ۲. جداول مدیریت دانش
// ============================================

// ۲-۱. درختواره‌های دانش
export const knowledgeTrees = sqliteTable('knowledge_trees', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  description: text('description'),
  periodId: integer('period_id').references(() => periods.id),
  baseId: integer('base_id').references(() => bases.id, { onDelete: 'set null' }),
  unitId: integer('unit_id').references(() => units.id, { onDelete: 'set null' }),
  metadata: text('metadata', { mode: 'json' }),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  treeTypeIdx: index('knowledge_trees_type_idx').on(table.type),
  treePeriodIdx: index('knowledge_trees_period_idx').on(table.periodId),
}));

// ۲-۲. گره‌های درختواره
export const treeNodes = sqliteTable('tree_nodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  treeId: integer('tree_id').references(() => knowledgeTrees.id, { onDelete: 'cascade' }).notNull(),
  parentId: integer('parent_id').references((): AnySQLiteColumn => treeNodes.id, { onDelete: 'cascade' }),
  level: text('level').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  templateIds: text('template_ids'),
  instanceIds: text('instance_ids'),
  levelId: integer('level_id'),
  sortOrder: integer('sort_order').default(0),
  isGap: integer('is_gap').default(0),
  gapStatus: text('gap_status'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  nodeTreeIdx: index('tree_nodes_tree_idx').on(table.treeId),
  nodeParentIdx: index('tree_nodes_parent_idx').on(table.parentId),
  nodeLevelIdx: index('tree_nodes_level_idx').on(table.level),
}));

// ۲-۳. قالب‌ها (تعاریف)
export const templates = sqliteTable('templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  parentId: integer('parent_id').references((): AnySQLiteColumn => templates.id),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  metadata: text('metadata', { mode: 'json' }),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ۲-۴. نمونه‌های قالب (اسناد واقعی)
export const templateInstances = sqliteTable('template_instances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  templateId: integer('template_id').references(() => templates.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  referenceCode: text('reference_code'),
  description: text('description'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  instanceTemplateIdx: index('template_instances_template_idx').on(table.templateId),
}));

// ۲-۵. سطوح دانش
export const knowledgeLevels = sqliteTable('knowledge_levels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  parentId: integer('parent_id'),
  sortOrder: integer('sort_order').default(0),
  metadata: text('metadata', { mode: 'json' }),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ۲-۶. دارایی‌های دانشی
export const knowledgeAssets = sqliteTable('knowledge_assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nodeId: integer('node_id').references(() => treeNodes.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  templateId: integer('template_id').references(() => templates.id),
  levelId: integer('level_id').references(() => knowledgeLevels.id),
  description: text('description'),
  filePath: text('file_path'),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  status: text('status').default('draft'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  assetNodeIdx: index('knowledge_assets_node_idx').on(table.nodeId),
}));

// ============================================
// ۳. جداول تحلیل و شکاف
// ============================================

// ۳-۱. شکاف‌های دانشی
export const gaps = sqliteTable('gaps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  periodId: integer('period_id').references(() => periods.id),
  requiredNodeId: integer('required_node_id').references(() => treeNodes.id, { onDelete: 'cascade' }).notNull(),
  producedNodeId: integer('produced_node_id').references(() => treeNodes.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('open'),
  gapType: text('gap_type'),
  priority: text('priority'),
  matchScore: real('match_score').default(0),
  description: text('description'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  gapPeriodIdx: index('gaps_period_idx').on(table.periodId),
  gapRequiredIdx: index('gaps_required_idx').on(table.requiredNodeId),
  gapStatusIdx: index('gaps_status_idx').on(table.status),
}));

// ۳-۱-الف. ستون‌های بازنگری دستی کاربر روی گپ
// (review_status: confirmed_gap = گپ تأیید شد | not_gap = گپ نیست | adjusted = اصلاح دستی)

// ۳-۲. آیتم‌های پژوهشی
export const researchItems = sqliteTable('research_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gapId: integer('gap_id').references(() => gaps.id, { onDelete: 'cascade' }).notNull(),
  nodeId: integer('node_id').references(() => treeNodes.id, { onDelete: 'cascade' }).notNull(),
  
  isPartOfSevenYearPlan: integer('is_part_of_seven_year_plan').default(0),
  isPartOfAnnualPlan: integer('is_part_of_annual_plan').default(0),
  isPartOfDirectives: integer('is_part_of_directives').default(0),
  isPartOfWarExperience: integer('is_part_of_war_experience').default(0),
  programCoverages: text('program_coverages', { mode: 'json' }),
  importance: text('importance'),
  combatImpact: integer('combat_impact'),
  costBenefit: integer('cost_benefit'),
  priority: text('priority'),
  timeFrame: text('time_frame'),
  
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  researchGapIdx: index('research_gap_idx').on(table.gapId),
  researchNodeIdx: index('research_node_idx').on(table.nodeId),
}));

// ۳-۳. سوابق اجرای تحلیل شکاف (هر بار کلیک دکمه تحلیل یک رکورد)
export const gapAnalysisRuns = sqliteTable('gap_analysis_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  requiredTreeId: integer('required_tree_id'),
  producedTreeId: integer('produced_tree_id'),
  totalLeaves: integer('total_leaves').default(0),
  filled: integer('filled').default(0),
  partial: integer('partial').default(0),
  openCount: integer('open_count').default(0),
  coveragePercent: real('coverage_percent').default(0),
  carriedReviews: integer('carried_reviews').default(0),
  report: text('report', { mode: 'json' }),
  createdBy: integer('created_by'),
  createdAt: text('created_at').notNull(),
});

// ۳-۴. بازنگری‌های دستی کاربر روی گپ‌ها (سابقه کامل حفظ می‌شود)
export const gapReviews = sqliteTable('gap_reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gapId: integer('gap_id'),
  requiredNodeId: integer('required_node_id'),
  verdict: text('verdict').notNull(), // confirmed_gap | not_gap | adjusted
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),
  note: text('note'),
  reviewedBy: integer('reviewed_by'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  reviewNodeIdx: index('gap_reviews_node_idx').on(table.requiredNodeId),
  reviewGapIdx: index('gap_reviews_gap_idx').on(table.gapId),
}));

// ============================================
// ۴. نظام مسائل
// ============================================

export const issues = sqliteTable('issues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  periodId: integer('period_id').references(() => periods.id),
  researchItemId: integer('research_item_id').references(() => researchItems.id),
  
  domainNodeId: integer('domain_node_id').references(() => treeNodes.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  solutionDirection: text('solution_direction'),
  responsibleUnit: text('responsible_unit'),
  confidentialityLevel: text('confidentiality_level'),
  actionPriority: text('action_priority'),
  approvalDate: text('approval_date'),
  knowledgeType: text('knowledge_type'),
  projectLevel: text('project_level'),
  approvalAuthority: text('approval_authority'),
  
  researchProjectType: text('research_project_type'),
  knowledgeProjectType: text('knowledge_project_type'),
  events: text('events'),
  macroProject: text('macro_project', { mode: 'json' }),
  
  scientificDiplomacy: text('scientific_diplomacy'),
  collaborators: text('collaborators'),
  collaborationNetwork: text('collaboration_network', { mode: 'json' }),
  
  referenceDocument: text('reference_document'),
  requiredBudget: real('required_budget').default(0),
  approvedBudget: real('approved_budget').default(0),
  assignedBudget: real('assigned_budget').default(0),
  expectedMonths: integer('expected_months'),
  completionPercent: integer('completion_percent').default(0),
  
  actionsTaken: text('actions_taken'),
  bottlenecks: text('bottlenecks'),
  orders: text('orders'),
  
  issueResolutionTeam: text('issue_resolution_team', { mode: 'json' }),
  needStatement: text('need_statement', { mode: 'json' }),
  contract: text('contract', { mode: 'json' }),
  executiveContract: text('executive_contract', { mode: 'json' }),
  
  stage20: text('stage_20', { mode: 'json' }),
  stage50: text('stage_50', { mode: 'json' }),
  stage100: text('stage_100', { mode: 'json' }),
  
  application: text('application', { mode: 'json' }),
  
  status: text('status').default('pending'),
  category: text('category'),
  
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  issuePeriodIdx: index('issues_period_idx').on(table.periodId),
  issueResearchIdx: index('issues_research_idx').on(table.researchItemId),
  issueStatusIdx: index('issues_status_idx').on(table.status),
}));

export const issueTemplates = sqliteTable('issue_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  issueId: integer('issue_id').references(() => issues.id, { onDelete: 'cascade' }).notNull(),
  templateId: integer('template_id').references(() => templates.id, { onDelete: 'cascade' }).notNull(),
});

export const issueAttachments = sqliteTable('issue_attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  issueId: integer('issue_id').references(() => issues.id, { onDelete: 'cascade' }).notNull(),
  filePath: text('file_path').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size'),
  fileType: text('file_type'),
  uploadedAt: text('uploaded_at').notNull(),
  uploadedBy: integer('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
});

export const issueHistory = sqliteTable('issue_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  issueId: integer('issue_id').references(() => issues.id, { onDelete: 'cascade' }).notNull(),
  field: text('field').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedBy: integer('changed_by').references(() => users.id, { onDelete: 'set null' }),
  changedAt: text('changed_at').notNull(),
}, (table) => ({
  historyIssueIdx: index('history_issue_idx').on(table.issueId),
}));

// ============================================
// ۵. جداول لاگ و پشتیبان
// ============================================

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  entityName: text('entity_name').notNull(),
  entityId: integer('entity_id').notNull(),
  changes: text('changes').notNull(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  timestamp: text('timestamp').notNull(),
}, (table) => ({
  auditEntityIdx: index('audit_entity_idx').on(table.entityName, table.entityId),
}));

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const files = sqliteTable('files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  path: text('path').notNull(),
  size: integer('size'),
  type: text('type'),
  mimeType: text('mime_type'),
  module: text('module'),
  moduleId: integer('module_id'),
  uploadedBy: integer('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ============================================
// ۶. جداول متادیتا
// ============================================

export const organizationalLevels = sqliteTable('organizational_levels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  parentId: integer('parent_id').references((): AnySQLiteColumn => organizationalLevels.id),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const knowledgeTypes = sqliteTable('knowledge_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category'),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const researchProjectTypes = sqliteTable('research_project_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const eventTypes = sqliteTable('event_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const programCoverages = sqliteTable('program_coverages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ============================================
// ۶-الف. سوابق تلفیق لایه‌ای درختواره‌ها (Merge History)
// ============================================
export const treeMerges = sqliteTable('tree_merges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  treeId: integer('tree_id').references(() => knowledgeTrees.id, { onDelete: 'cascade' }).notNull(),
  sourceLabel: text('source_label'),
  sourceType: text('source_type'), // 'excel' | 'tree'
  sourceTreeId: integer('source_tree_id'),
  added: integer('added').default(0),
  updated: integer('updated').default(0),
  conflicts: integer('conflicts').default(0),
  skipped: integer('skipped').default(0),
  details: text('details', { mode: 'json' }),
  createdBy: integer('created_by'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  mergeTreeIdx: index('tree_merges_tree_idx').on(table.treeId),
}));

// ============================================
// ۷. روابط (Relations)
// ============================================


export const projectLevels = sqliteTable('project_levels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0),
});

export const approvalAuthorities = sqliteTable('approval_authorities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0),
});

export const knowledgeProjectTypes = sqliteTable('knowledge_project_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0),
});

export const scientificDiplomacyLevels = sqliteTable('scientific_diplomacy_levels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0),
});

export const confidentialityLevels = sqliteTable('confidentiality_levels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0),
});

export const actionPriorities = sqliteTable('action_priorities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0),
});

export const treeNodeTypes = sqliteTable('tree_node_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0),
});

export const knowledgeDomains = sqliteTable('knowledge_domains', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0),
});

export const researchNetworks = sqliteTable('research_networks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0),
});

export const knowledgeTreesRelations = relations(knowledgeTrees, ({ one, many }) => ({
  period: one(periods, {
    fields: [knowledgeTrees.periodId],
    references: [periods.id],
  }),
  base: one(bases, {
    fields: [knowledgeTrees.baseId],
    references: [bases.id],
  }),
  unit: one(units, {
    fields: [knowledgeTrees.unitId],
    references: [units.id],
  }),
  nodes: many(treeNodes),
}));

export const treeNodesRelations = relations(treeNodes, ({ one, many }) => ({
  tree: one(knowledgeTrees, {
    fields: [treeNodes.treeId],
    references: [knowledgeTrees.id],
  }),
  parent: one(treeNodes, {
    fields: [treeNodes.parentId],
    references: [treeNodes.id],
  }),
  children: many(treeNodes),
  level: one(knowledgeLevels, {
    fields: [treeNodes.levelId],
    references: [knowledgeLevels.id],
  }),
  assets: many(knowledgeAssets),
  gapsRequired: many(gaps, { relationName: 'required' }),
  gapsProduced: many(gaps, { relationName: 'produced' }),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  parent: one(templates, {
    fields: [templates.parentId],
    references: [templates.id],
  }),
  children: many(templates),
  instances: many(templateInstances),
}));

export const templateInstancesRelations = relations(templateInstances, ({ one }) => ({
  template: one(templates, {
    fields: [templateInstances.templateId],
    references: [templates.id],
  }),
}));

export const gapsRelations = relations(gaps, ({ one }) => ({
  period: one(periods, {
    fields: [gaps.periodId],
    references: [periods.id],
  }),
  requiredNode: one(treeNodes, {
    fields: [gaps.requiredNodeId],
    references: [treeNodes.id],
    relationName: 'required',
  }),
  producedNode: one(treeNodes, {
    fields: [gaps.producedNodeId],
    references: [treeNodes.id],
    relationName: 'produced',
  }),
}));

export const issuesRelations = relations(issues, ({ one, many }) => ({
  period: one(periods, {
    fields: [issues.periodId],
    references: [periods.id],
  }),
  researchItem: one(researchItems, {
    fields: [issues.researchItemId],
    references: [researchItems.id],
  }),
  domainNode: one(treeNodes, {
    fields: [issues.domainNodeId],
    references: [treeNodes.id],
  }),
  templates: many(issueTemplates),
  attachments: many(issueAttachments),
  history: many(issueHistory),
}));
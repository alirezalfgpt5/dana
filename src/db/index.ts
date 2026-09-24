// src/db/index.ts
// اتصال به پایگاه داده و مقداردهی اولیه - نسخه ۳.۱ با پشتیبانی از نمونه‌های قالب

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import path from 'path';
import fs from 'fs';

// ============================================
// ۱. اتصال به پایگاه داده
// ============================================

const dbPath = path.resolve(process.cwd(), 'database.sqlite');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const sqlite = new Database(dbPath);

sqlite.exec('PRAGMA foreign_keys = ON;');
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA busy_timeout = 5000;');

export const db = drizzle(sqlite, { schema });

// ============================================
// ۲. تابع مقداردهی اولیه پایگاه داده
// ============================================

export function initDb() {
  console.log('🚀 Database initialization started...');

  // مهاجرت ستون‌های دوره زمانی قبل از ایجاد ایندکس‌ها بر روی دیتابیس موجود
  try {
    const issuesTable = sqlite.prepare("PRAGMA table_info(issues)").all() as any[];
    if (issuesTable.length > 0 && !issuesTable.some(c => c.name === 'period_id')) {
      sqlite.exec("ALTER TABLE issues ADD COLUMN period_id INTEGER REFERENCES periods(id);");
    }
    const gapsTable = sqlite.prepare("PRAGMA table_info(gaps)").all() as any[];
    if (gapsTable.length > 0 && !gapsTable.some(c => c.name === 'period_id')) {
      sqlite.exec("ALTER TABLE gaps ADD COLUMN period_id INTEGER REFERENCES periods(id);");
    }
  } catch (e) {
    // جداول هنوز ساخته نشده‌اند، در دستور CREATE TABLE ساخته خواهند شد
  }

  // ============================================
  // ۲-۱. ایجاد جداول اصلی
  // ============================================

  sqlite.exec(`
    -- ============================================
    -- ۱. جداول اصلی سیستم
    -- ============================================
    
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      permissions TEXT NOT NULL,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      organization_level TEXT,
      base_id INTEGER REFERENCES bases(id) ON DELETE SET NULL,
      unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
      phone TEXT,
      rank TEXT,
      photo_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS users_org_level_idx ON users(organization_level);
    
    CREATE TABLE IF NOT EXISTS bases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      level TEXT,
      parent_id INTEGER,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );
    
    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_id INTEGER NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      level TEXT,
      parent_id INTEGER,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );
    
    CREATE TABLE IF NOT EXISTS periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      is_complete INTEGER DEFAULT 0,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    -- ============================================
    -- ۲. جداول مدیریت دانش
    -- ============================================
    
    CREATE TABLE IF NOT EXISTS knowledge_trees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      period_id INTEGER REFERENCES periods(id),
      base_id INTEGER REFERENCES bases(id) ON DELETE SET NULL,
      unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
      is_active INTEGER DEFAULT 1,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS knowledge_trees_type_idx ON knowledge_trees(type);
    CREATE INDEX IF NOT EXISTS knowledge_trees_period_idx ON knowledge_trees(period_id);
    
    CREATE TABLE IF NOT EXISTS tree_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tree_id INTEGER NOT NULL REFERENCES knowledge_trees(id) ON DELETE CASCADE,
      parent_id INTEGER REFERENCES tree_nodes(id) ON DELETE CASCADE,
      level TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      template_ids TEXT,
      instance_ids TEXT,
      level_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      is_gap INTEGER DEFAULT 0,
      gap_status TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tree_nodes_tree_idx ON tree_nodes(tree_id);
    CREATE INDEX IF NOT EXISTS tree_nodes_parent_idx ON tree_nodes(parent_id);
    CREATE INDEX IF NOT EXISTS tree_nodes_level_idx ON tree_nodes(level);
    
    -- جدول قالب‌ها (تعاریف)
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      parent_id INTEGER REFERENCES templates(id),
      description TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    -- جدول نمونه‌های قالب (اسناد واقعی)
    CREATE TABLE IF NOT EXISTS template_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      reference_code TEXT,
      description TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS template_instances_template_idx ON template_instances(template_id);
    
    CREATE TABLE IF NOT EXISTS knowledge_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      parent_id INTEGER,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS knowledge_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id INTEGER NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      template_id INTEGER REFERENCES templates(id),
      level_id INTEGER REFERENCES knowledge_levels(id),
      description TEXT,
      file_path TEXT,
      file_type TEXT,
      file_size INTEGER,
      status TEXT DEFAULT 'draft',
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS knowledge_assets_node_idx ON knowledge_assets(node_id);
    
    -- ============================================
    -- ۳. جداول تحلیل و شکاف
    -- ============================================
    
    CREATE TABLE IF NOT EXISTS gaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER REFERENCES periods(id),
      required_node_id INTEGER NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
      produced_node_id INTEGER REFERENCES tree_nodes(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'open',
      gap_type TEXT,
      priority TEXT,
      match_score REAL DEFAULT 0,
      description TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS gaps_period_idx ON gaps(period_id);
    CREATE INDEX IF NOT EXISTS gaps_required_idx ON gaps(required_node_id);
    CREATE INDEX IF NOT EXISTS gaps_status_idx ON gaps(status);
    
    CREATE TABLE IF NOT EXISTS research_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gap_id INTEGER NOT NULL REFERENCES gaps(id) ON DELETE CASCADE,
      node_id INTEGER NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
      is_part_of_seven_year_plan INTEGER DEFAULT 0,
      is_part_of_annual_plan INTEGER DEFAULT 0,
      is_part_of_directives INTEGER DEFAULT 0,
      is_part_of_war_experience INTEGER DEFAULT 0,
      importance TEXT,
      combat_impact INTEGER,
      cost_benefit INTEGER,
      priority TEXT,
      time_frame TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS research_gap_idx ON research_items(gap_id);
    CREATE INDEX IF NOT EXISTS research_node_idx ON research_items(node_id);
    
    -- سوابق اجرای تحلیل شکاف
    CREATE TABLE IF NOT EXISTS gap_analysis_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      required_tree_id INTEGER,
      produced_tree_id INTEGER,
      total_leaves INTEGER DEFAULT 0,
      filled INTEGER DEFAULT 0,
      partial INTEGER DEFAULT 0,
      open_count INTEGER DEFAULT 0,
      coverage_percent REAL DEFAULT 0,
      carried_reviews INTEGER DEFAULT 0,
      report TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL
    );

    -- بازنگری‌های دستی کاربر روی گپ‌ها
    CREATE TABLE IF NOT EXISTS gap_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gap_id INTEGER,
      required_node_id INTEGER,
      verdict TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT,
      note TEXT,
      reviewed_by INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS gap_reviews_node_idx ON gap_reviews(required_node_id);
    CREATE INDEX IF NOT EXISTS gap_reviews_gap_idx ON gap_reviews(gap_id);

    -- سوابق تلفیق لایه‌ای درختواره‌ها
    CREATE TABLE IF NOT EXISTS tree_merges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tree_id INTEGER NOT NULL REFERENCES knowledge_trees(id) ON DELETE CASCADE,
      source_label TEXT,
      source_type TEXT,
      source_tree_id INTEGER,
      added INTEGER DEFAULT 0,
      updated INTEGER DEFAULT 0,
      conflicts INTEGER DEFAULT 0,
      skipped INTEGER DEFAULT 0,
      details TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tree_merges_tree_idx ON tree_merges(tree_id);

    -- ============================================
    -- ۴. نظام مسائل
    -- ============================================
    
    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER REFERENCES periods(id),
      research_item_id INTEGER REFERENCES research_items(id),
      domain_node_id INTEGER REFERENCES tree_nodes(id),
      title TEXT NOT NULL,
      solution_direction TEXT,
      responsible_unit TEXT,
      confidentiality_level TEXT,
      action_priority TEXT,
      approval_date TEXT,
      knowledge_type TEXT,
      project_level TEXT,
      approval_authority TEXT,
      research_project_type TEXT,
      knowledge_project_type TEXT,
      events TEXT,
      macro_project TEXT,
      scientific_diplomacy TEXT,
      collaborators TEXT,
      collaboration_network TEXT,
      reference_document TEXT,
      required_budget REAL DEFAULT 0,
      approved_budget REAL DEFAULT 0,
      assigned_budget REAL DEFAULT 0,
      expected_months INTEGER,
      completion_percent INTEGER DEFAULT 0,
      actions_taken TEXT,
      bottlenecks TEXT,
      orders TEXT,
      issue_resolution_team TEXT,
      need_statement TEXT,
      contract TEXT,
      executive_contract TEXT,
      stage_20 TEXT,
      stage_50 TEXT,
      stage_100 TEXT,
      application TEXT,
      status TEXT DEFAULT 'pending',
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS issues_period_idx ON issues(period_id);
    CREATE INDEX IF NOT EXISTS issues_research_idx ON issues(research_item_id);
    CREATE INDEX IF NOT EXISTS issues_status_idx ON issues(status);

    
    CREATE TABLE IF NOT EXISTS issue_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS issue_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      file_type TEXT,
      uploaded_at TEXT NOT NULL,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );
    
    CREATE TABLE IF NOT EXISTS issue_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      field TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      changed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS history_issue_idx ON issue_history(issue_id);
    
    -- ============================================
    -- ۵. جداول لاگ و پشتیبان
    -- ============================================
    
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      entity_name TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      changes TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_logs(entity_name, entity_id);
    
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      size INTEGER,
      type TEXT,
      mime_type TEXT,
      module TEXT,
      module_id INTEGER,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- ============================================
    -- ۶. جداول متادیتا
    -- ============================================
    
    CREATE TABLE IF NOT EXISTS organizational_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      parent_id INTEGER REFERENCES organizational_levels(id),
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS knowledge_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS program_coverages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS research_project_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    
      CREATE TABLE IF NOT EXISTS project_levels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS approval_authorities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS knowledge_project_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS scientific_diplomacy_levels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS confidentiality_levels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS action_priorities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS tree_node_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS knowledge_domains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS research_networks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      );

    CREATE TABLE IF NOT EXISTS event_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // اعمال تغییرات شمای دیتابیس در صورت نیاز (مانند افزودن ستون جدید)
  try {
    sqlite.exec('ALTER TABLE research_items ADD COLUMN program_coverages TEXT;');
  } catch (e) {}

  try {
    sqlite.exec('ALTER TABLE issues ADD COLUMN executive_contract TEXT;');
  } catch (e) {
    // ستون از قبل وجود دارد
  }

  // ============================================
  // ۲-۲. درج داده‌های اولیه (Seed)
  // ============================================

  console.log('📝 Inserting initial data...');

  const programCoveragesData = [
    { name: 'برنامه پنج ساله', description: 'پوشش برنامه‌های پنج ساله توسعه' },
    { name: 'برنامه سالیانه', description: 'پوشش برنامه‌های سالیانه مصوب' },
    { name: 'ابلاغیات', description: 'پوشش تدابیر ابلاغی' },
    { name: 'تجربیات جنگ', description: 'برگرفته از تجربیات دوران دفاع مقدس' }
  ];

  for (const pc of programCoveragesData) {
    const exists = sqlite.prepare("SELECT id FROM program_coverages WHERE name = ?").get(pc.name);
    if (!exists) {
      sqlite.prepare(`
        INSERT INTO program_coverages (name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(
        pc.name,
        pc.description,
        new Date().toISOString(),
        new Date().toISOString()
      );
    }
  }

  // کاربر ادمین
  const defaultRoles = [
    { name: 'superadmin', label: 'مدیر کل سیستم', permissions: JSON.stringify(['all']) },
    { name: 'admin', label: 'مدیر', permissions: JSON.stringify(['manage_users', 'manage_trees']) },
    { name: 'knowledge_manager', label: 'مدیر دانش', permissions: JSON.stringify(['manage_trees']) },
    { name: 'expert', label: 'کارشناس', permissions: JSON.stringify(['view_trees']) },
    { name: 'user', label: 'کاربر عادی', permissions: JSON.stringify([]) }
  ];

  for (const role of defaultRoles) {
    const roleExists = sqlite.prepare("SELECT id FROM roles WHERE name = ?").get(role.name);
    if (!roleExists) {
      sqlite.prepare(`
        INSERT INTO roles (name, label, permissions, is_system, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)
      `).run(
        role.name,
        role.label,
        role.permissions,
        new Date().toISOString(),
        new Date().toISOString()
      );
    }
  }

    const adminExists = sqlite.prepare(
    "SELECT id FROM users WHERE username = 'admin'"
  ).get();

  if (!adminExists) {
    sqlite.prepare(`
      INSERT INTO users (username, password, full_name, role, organization_level, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'admin',
      '$2b$10$xTmwp6HbtEEU3Yuz7xgA4ujFIpzU4kC/FDGMAA4HFK3hVnbfCfGpu',
      'مدیر کل سیستم',
      'superadmin',
      'آجا',
      new Date().toISOString(),
      new Date().toISOString()
    );
    console.log('✅ Admin user created (username: admin, password: admin123)');
  }

  // ============================================
  // مهاجرت پویا برای چنددوره‌ای شدن (Multi-Period Dynamic Migration)
  // ============================================
  try {
    const issuesCols = (sqlite.prepare("PRAGMA table_info(issues)").all() as any[]).map(c => c.name);
    if (!issuesCols.includes('period_id')) {
      sqlite.exec("ALTER TABLE issues ADD COLUMN period_id INTEGER REFERENCES periods(id);");
      sqlite.exec("CREATE INDEX IF NOT EXISTS issues_period_idx ON issues(period_id);");
      console.log('✅ Added period_id column to issues');
    }
    // انتساب دوره برای مسائلی که period_id ندارند از روی درخت متناظر گره
    sqlite.exec(`
      UPDATE issues 
      SET period_id = (
        SELECT kt.period_id 
        FROM tree_nodes tn 
        JOIN knowledge_trees kt ON tn.tree_id = kt.id 
        WHERE tn.id = issues.domain_node_id
      )
      WHERE period_id IS NULL AND domain_node_id IS NOT NULL;
    `);
    // در صورت نامشخص بودن، انتساب به دوره فعال اول سیستم
    sqlite.exec(`
      UPDATE issues 
      SET period_id = (SELECT id FROM periods WHERE is_active = 1 LIMIT 1)
      WHERE period_id IS NULL;
    `);

    const gapsCols = (sqlite.prepare("PRAGMA table_info(gaps)").all() as any[]).map(c => c.name);
    if (!gapsCols.includes('period_id')) {
      sqlite.exec("ALTER TABLE gaps ADD COLUMN period_id INTEGER REFERENCES periods(id);");
      sqlite.exec("CREATE INDEX IF NOT EXISTS gaps_period_idx ON gaps(period_id);");
      console.log('✅ Added period_id column to gaps');
    }
    sqlite.exec(`
      UPDATE gaps 
      SET period_id = (
        SELECT kt.period_id 
        FROM tree_nodes tn 
        JOIN knowledge_trees kt ON tn.tree_id = kt.id 
        WHERE tn.id = gaps.required_node_id
      )
      WHERE period_id IS NULL AND required_node_id IS NOT NULL;
    `);
    sqlite.exec(`
      UPDATE gaps 
      SET period_id = (SELECT id FROM periods WHERE is_active = 1 LIMIT 1)
      WHERE period_id IS NULL;
    `);
  } catch (e) {
    console.error('Error migrating period_id:', e);
  }
  
  console.log('🎉 Database initialization completed!');
}

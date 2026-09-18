import { sqlite, initDb } from '../../src/db/index.js';

console.log('Seeding Organizational Structure...');
initDb();

sqlite.transaction(() => {
    // Org levels
    const orgLevels = [
        { name: 'آجا', description: 'سطح کلان سازمانی - ستاد کل نیروهای مسلح' },
        { name: 'نیرو', description: 'سطح میانی سازمانی - نیروهای مسلح (نیروی زمینی، هوایی، دریایی)' },
        { name: 'رده', description: 'سطح اجرایی سازمانی - رده‌های دانشی و پژوهشی (مراکز مطالعات، دانشگاه‌ها)' },
    ];
      
    orgLevels.forEach(level => {
        const exists = sqlite.prepare("SELECT id FROM organizational_levels WHERE name = ?").get(level.name);
        if (!exists) {
            sqlite.prepare(`INSERT INTO organizational_levels (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(level.name, level.description, 1, new Date().toISOString(), new Date().toISOString());
        }
    });

    // Bases (Organizations)
    let base = sqlite.prepare("SELECT id FROM bases WHERE name = ? LIMIT 1").get('ستاد کل آجا') as any;
    if (!base) {
      const stmt = sqlite.prepare("INSERT INTO bases (name, level, created_at, updated_at) VALUES (?, ?, ?, ?)");
      const info = stmt.run('ستاد کل آجا', 'base', new Date().toISOString(), new Date().toISOString());
      base = { id: info.lastInsertRowid };
    }
    
    let base2 = sqlite.prepare("SELECT id FROM bases WHERE name = ? LIMIT 1").get('نیروی زمینی') as any;
    if (!base2) {
      const stmt = sqlite.prepare("INSERT INTO bases (name, level, created_at, updated_at) VALUES (?, ?, ?, ?)");
      stmt.run('نیروی زمینی', 'base', new Date().toISOString(), new Date().toISOString());
    }

    // Units
    let unit = sqlite.prepare("SELECT id FROM units WHERE name = ? AND base_id = ? LIMIT 1").get('شورای عالی دانش و پژوهش', base.id) as any;
    if (!unit) {
      const stmt = sqlite.prepare("INSERT INTO units (name, base_id, level, created_at, updated_at) VALUES (?, ?, ?, ?, ?)");
      stmt.run('شورای عالی دانش و پژوهش', base.id, 'unit', new Date().toISOString(), new Date().toISOString());
    }
})();

console.log('✅ Organizational Structure seeded.');

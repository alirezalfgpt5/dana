import { sqlite, initDb } from '../../src/db/index.js';

console.log('Seeding Periods...');
initDb();

sqlite.transaction(() => {
    const periods = [
        { name: 'برنامه هفتم توسعه', start_date: '1403/01/01', end_date: '1407/12/29' },
        { name: 'سال ۱۴۰۳', start_date: '1403/01/01', end_date: '1403/12/29' },
        { name: 'سال ۱۴۰۴', start_date: '1404/01/01', end_date: '1404/12/29' }
    ];

    periods.forEach(p => {
        const exists = sqlite.prepare("SELECT id FROM periods WHERE name = ?").get(p.name);
        if (!exists) {
            sqlite.prepare(`INSERT INTO periods (name, start_date, end_date, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).run(p.name, p.start_date, p.end_date, 1, new Date().toISOString(), new Date().toISOString());
        }
    });
})();

console.log('✅ Periods seeded.');

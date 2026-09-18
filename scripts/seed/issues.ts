import { sqlite, initDb } from '../../src/db/index.js';

console.log("Seeding Issues...");
initDb();

sqlite.transaction(() => {
    // Get required tree nodes that are leafs
    const lNodeReq = sqlite.prepare("SELECT id FROM tree_nodes WHERE title = 'الگوریتم‌های توزیع هوشمند' LIMIT 1").get() as any;
    
    if (lNodeReq) {
        const template = sqlite.prepare("SELECT id FROM templates WHERE title = 'سند راهبردی' LIMIT 1").get() as any;
        
        // Ensure no duplicate issue for this node
        const exists = sqlite.prepare("SELECT id FROM issues WHERE domain_node_id = ?").get(lNodeReq.id);
        if (!exists) {
            sqlite.prepare(`
                INSERT INTO issues (
                    domain_node_id, title, solution_direction, responsible_unit, 
                    confidentiality_level, action_priority, approval_date,
                    required_budget, expected_months, completion_percent,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                lNodeReq.id,
                'طراحی الگوریتم توزیع هوشمند پردازش',
                'استفاده از معماری میکروسرویس و کوبرنتیز',
                'مرکز تحقیقات فاوا',
                'محرمانه',
                'خیلی زیاد',
                '1403/05/10',
                '5000000000',
                6,
                20,
                new Date().toISOString(),
                new Date().toISOString()
            );
        }
    }
})();

console.log('✅ Issues seeded.');

import { sqlite, initDb } from '../../src/db/index.js';

console.log("Seeding Knowledge Trees and Nodes...");
initDb();

sqlite.transaction(() => {
    // 1. Ensure Period exists
    let period = sqlite.prepare("SELECT id FROM periods LIMIT 1").get() as any;
    if (!period) {
        throw new Error('No periods found. Run periods seeder first.');
    }

    // 2. Ensure Base & Unit exists
    let base = sqlite.prepare("SELECT id FROM bases LIMIT 1").get() as any;
    if (!base) {
        throw new Error('No bases found. Run organization seeder first.');
    }

    let unit = sqlite.prepare("SELECT id FROM units WHERE base_id = ? LIMIT 1").get(base.id) as any;
    if (!unit) {
        throw new Error('No units found. Run organization seeder first.');
    }

    // Ensure Template exists
    let template1 = sqlite.prepare("SELECT id FROM templates WHERE title = ? LIMIT 1").get('گزارش پژوهشی') as any;
    let template2 = sqlite.prepare("SELECT id FROM templates WHERE title = ? LIMIT 1").get('سند راهبردی') as any;

    if(!template1 || !template2) {
        throw new Error('Required templates not found. Run base definitions seeder first.');
    }

    // Force delete existing trees named 'هوش مصنوعی'
    const oldTrees = sqlite.prepare("SELECT id FROM knowledge_trees WHERE name LIKE '%هوش مصنوعی%'").all() as any[];
    if (oldTrees.length > 0) {
        const treeIds = oldTrees.map(t => t.id).join(',');
        const oldNodes = sqlite.prepare(`SELECT id FROM tree_nodes WHERE tree_id IN (${treeIds})`).all() as any[];
        if (oldNodes.length > 0) {
            const nodeIds = oldNodes.map(n => n.id).join(',');
            sqlite.prepare(`DELETE FROM issues WHERE domain_node_id IN (${nodeIds})`).run();
            sqlite.prepare(`DELETE FROM gaps WHERE required_node_id IN (${nodeIds}) OR produced_node_id IN (${nodeIds})`).run();
            sqlite.prepare(`DELETE FROM research_items WHERE node_id IN (${nodeIds})`).run();
            sqlite.prepare(`DELETE FROM knowledge_assets WHERE node_id IN (${nodeIds})`).run();
        }
        sqlite.prepare(`DELETE FROM tree_nodes WHERE tree_id IN (${treeIds})`).run();
        sqlite.prepare(`DELETE FROM knowledge_trees WHERE id IN (${treeIds})`).run();
    }


    // Create Required Tree (Mored Niaz)
    const reqTreeStmt = sqlite.prepare("INSERT INTO knowledge_trees (name, type, description, period_id, base_id, unit_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const reqTree = reqTreeStmt.run('درختواره دانشی هوش مصنوعی - مورد نیاز', 'required', 'نیازسنجی دانش‌های مرتبط با هوش مصنوعی در سازمان', period.id, base.id, unit.id, 1, new Date().toISOString(), new Date().toISOString());
    const reqTreeId = reqTree.lastInsertRowid;

    // Create Produced Tree (Tolid Shode)
    const prodTreeStmt = sqlite.prepare("INSERT INTO knowledge_trees (name, type, description, period_id, base_id, unit_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const prodTree = prodTreeStmt.run('درختواره دانشی هوش مصنوعی - تولید شده', 'produced', 'دانش‌های تولید شده و موجود مرتبط با هوش مصنوعی', period.id, base.id, unit.id, 1, new Date().toISOString(), new Date().toISOString());
    const prodTreeId = prodTree.lastInsertRowid;

    const insertNode = (treeId: number | bigint, parentId: number | bigint | null, level: string, title: string, templates: string | null = null, instances: string | null = null) => {
        const stmt = sqlite.prepare("INSERT INTO tree_nodes (tree_id, parent_id, level, title, template_ids, instance_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        const info = stmt.run(treeId, parentId, level, title, templates, instances, new Date().toISOString(), new Date().toISOString());
        return info.lastInsertRowid;
    }

    // Tree Structure: R -> T -> B -> SB -> L -> Q
    // Root
    const rNodeReq = insertNode(reqTreeId, null, 'R', 'هوش مصنوعی در کاربردهای سازمانی');
    const rNodeProd = insertNode(prodTreeId, null, 'R', 'هوش مصنوعی در کاربردهای سازمانی');

    // Trunk
    const tNode1Req = insertNode(reqTreeId, rNodeReq, 'T', 'زیرساخت و پلتفرم');
    const tNode1Prod = insertNode(prodTreeId, rNodeProd, 'T', 'زیرساخت و پلتفرم');

    const tNode2Req = insertNode(reqTreeId, rNodeReq, 'T', 'پردازش داده و هوشمندی');
    const tNode2Prod = insertNode(prodTreeId, rNodeProd, 'T', 'پردازش داده و هوشمندی');

    // Branch
    const bNode1Req = insertNode(reqTreeId, tNode1Req, 'B', 'پلتفرم‌های ابری');
    const bNode1Prod = insertNode(prodTreeId, tNode1Prod, 'B', 'پلتفرم‌های ابری');

    const bNode2Req = insertNode(reqTreeId, tNode2Req, 'B', 'مدل‌های زبانی بزرگ (LLM)');
    const bNode2Prod = insertNode(prodTreeId, tNode2Prod, 'B', 'مدل‌های زبانی بزرگ (LLM)');

    // Sub-Branch
    const sbNode1Req = insertNode(reqTreeId, bNode1Req, 'SB', 'توزیع بار و پردازش موازی');
    // Gap: sbNode1 is missing in Produced Tree! (We will just not insert it)

    const sbNode2Req = insertNode(reqTreeId, bNode2Req, 'SB', 'پردازش زبان طبیعی بومی');
    const sbNode2Prod = insertNode(prodTreeId, bNode2Prod, 'SB', 'پردازش زبان طبیعی بومی');

    // Leaf
    const lNode1Req = insertNode(reqTreeId, sbNode1Req, 'L', 'الگوریتم‌های توزیع هوشمند', template1.id + ',' + template2.id);
    
    const lNode2Req = insertNode(reqTreeId, sbNode2Req, 'L', 'موتور تحلیل متن فارسی', template1.id.toString());
    const lNode2Prod = insertNode(prodTreeId, sbNode2Prod, 'L', 'موتور تحلیل متن فارسی', template1.id.toString(), "1,2"); 

    const lNode3Req = insertNode(reqTreeId, sbNode2Req, 'L', 'سیستم پرسش و پاسخ', template2.id.toString());
    const lNode3Prod = insertNode(prodTreeId, sbNode2Prod, 'L', 'سیستم پرسش و پاسخ', null, null); 

    // Question (Q) - Level
    insertNode(reqTreeId, lNode2Req, 'Q', 'چگونه دقت تحلیل متون تخصصی نظامی را افزایش دهیم؟');
    insertNode(reqTreeId, lNode2Req, 'Q', 'بهترین معماری برای سرعت بخشیدن به ایندکس کردن چیست؟');

})();
console.log("✅ Trees seeded successfully!");

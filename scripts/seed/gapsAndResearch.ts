import { sqlite, initDb } from '../../src/db/index.js';

console.log("Seeding Gaps & Research Items (rich scenario)...");
initDb();

sqlite.transaction(() => {
    // --- گپ ۱: گره‌ای که فقط در درختواره مورد نیاز است (گپ کامل/باز) ---
    const treeReq = sqlite.prepare("SELECT id FROM knowledge_trees WHERE type = 'required' LIMIT 1").get() as any;
    const treeProd = sqlite.prepare("SELECT id FROM knowledge_trees WHERE type = 'produced' LIMIT 1").get() as any;

    const reqOnly = sqlite.prepare(`
        SELECT rn.id AS rid
        FROM tree_nodes rn
        WHERE rn.tree_id = ? AND rn.title = 'توزیع بار و پردازش موازی'
          AND NOT EXISTS (SELECT 1 FROM tree_nodes pn WHERE pn.title = rn.title AND pn.tree_id = ?)
        LIMIT 1
    `).get(treeReq?.id, treeProd?.id) as any;

    if (reqOnly && reqOnly.rid && treeReq && treeProd) {
        const gapExists = sqlite.prepare(`
            SELECT id FROM gaps WHERE required_node_id = ? AND (status IS NULL OR status = 'open')
        `).get(reqOnly.rid) as any;
        if (!gapExists) {
            sqlite.prepare(`
                INSERT INTO gaps (required_node_id, produced_node_id,
                    status, gap_type, priority, description, created_at, updated_at)
                VALUES (?, ?, 'open', 'missing', 'خیلی زیاد', ?, ?, ?)
            `).run(
                reqOnly.rid, null,
                'گره «توزیع بار و پردازش موازی» در درختواره تولیدشده وجود ندارد — گپ کامل دانشی.',
                new Date().toISOString(), new Date().toISOString()
            );
        }
    }

    // --- گپ ۲: گره موجود در هر دو درخت اما بدون قالب (گپ نیمه‌پر) ---
    const prodNoTemplate = sqlite.prepare(`
        SELECT pn.id AS pid, rn.id AS rid
        FROM tree_nodes pn
        JOIN tree_nodes rn ON rn.title = pn.title AND rn.tree_id = ?
        WHERE pn.tree_id = ? AND pn.level = 'L' AND (pn.template_ids IS NULL OR pn.template_ids = '')
        LIMIT 1
    `).get(treeReq?.id, treeProd?.id) as any;

    if (prodNoTemplate && prodNoTemplate.pid && prodNoTemplate.rid) {
        const gapExists = sqlite.prepare(`
            SELECT id FROM gaps WHERE required_node_id = ? AND produced_node_id = ? AND (status IS NULL OR status = 'partial')
        `).get(prodNoTemplate.rid, prodNoTemplate.pid) as any;
        if (!gapExists) {
            sqlite.prepare(`
                INSERT INTO gaps (required_node_id, produced_node_id,
                    status, gap_type, priority, description, created_at, updated_at)
                VALUES (?, ?, 'partial', 'incomplete', 'زیاد', ?, ?, ?)
            `).run(
                prodNoTemplate.rid, prodNoTemplate.pid,
                'گره در درختواره تولیدشده موجود است اما هیچ قالب دانشی به آن تخصیص نیافته — پوشش ناقص.',
                new Date().toISOString(), new Date().toISOString()
            );
        }
    }

    // --- پروژه‌های پژوهشی مرتبط با گره‌های دارای گپ ---
    // ساختار واقعی research_items: id, gap_id, node_id, priority, ... (بدون ستون title/status)
    const researchTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='research_items'").get();
    if (researchTable) {
        const cols = (sqlite.prepare(`PRAGMA table_info(research_items)`).all() as any[]).map(c => c.name);
        const hasNode = cols.includes('node_id');
        const hasPriority = cols.includes('priority');
        const hasMetadata = cols.includes('metadata');

        const seedResearch = (nodeTitle: string, planLabel: string, priority: string) => {
            const node = sqlite.prepare("SELECT id FROM tree_nodes WHERE title = ? LIMIT 1").get(nodeTitle) as any;
            if (!node || !hasNode) return;
            // جلوگیری از تکرار برای همان گره
            const exists = sqlite.prepare("SELECT id FROM research_items WHERE node_id = ?").get(node.id);
            if (exists) return;
            // یافتن گپ مرتبط با گره (gap_id ستونی الزامی است)
            const gap = sqlite.prepare("SELECT id FROM gaps WHERE required_node_id = ? LIMIT 1").get(node.id) as any;
            const gapId = gap?.id;
            if (!gapId) return;
            const metadata = JSON.stringify({
                title: planLabel,
                type: 'مأموریتی مرتبط با توان رزم',
                status: 'in_progress',
                createdAt: new Date().toISOString(),
            });
            if (hasPriority && hasMetadata) {
                sqlite.prepare(`INSERT INTO research_items (gap_id, node_id, priority, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
                    .run(gapId, node.id, priority, metadata, new Date().toISOString(), new Date().toISOString());
            } else {
                sqlite.prepare(`INSERT INTO research_items (gap_id, node_id, created_at, updated_at) VALUES (?, ?, ?, ?)`)
                    .run(gapId, node.id, new Date().toISOString(), new Date().toISOString());
            }
        };

        seedResearch('الگوریتم‌های توزیع هوشمند', 'پژوهش الگوریتم‌های توزیع بار هوشمند در خوشه‌های ناهمگن', 'خیلی زیاد');
        seedResearch('سیستم پرسش و پاسخ', 'ارزیابی سیستم‌های پرسش و پاسخ فارسی و معیارهای سنجش استناددهی', 'زیاد');
        seedResearch('موتور تحلیل متن فارسی', 'واژه‌نامه تخصصی دامنه‌محور برای تحلیل متون سازمانی', 'متوسط');
    }

    void treeReq; void treeProd;
})();
console.log("✅ Gaps & Research seeded.");

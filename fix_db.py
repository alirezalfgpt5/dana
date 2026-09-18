import re

with open("src/db/index.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the JS from the SQL
content = content.replace(
    """CREATE INDEX IF NOT EXISTS issues_status_idx ON issues(status);
    
    // خودترمیمی: اضافه کردن ستون‌های جدید به جداول موجود
    try {
      sqlite.exec('ALTER TABLE issues ADD COLUMN executive_contract TEXT;');
    } catch(e: any) {
      // نادیده گرفتن خطا اگر ستون وجود داشته باشد
    }""",
    "CREATE INDEX IF NOT EXISTS issues_status_idx ON issues(status);"
)

# Insert it in the proper place
content = content.replace(
    "sqlite.exec('ALTER TABLE research_items ADD COLUMN program_coverages TEXT;');",
    "sqlite.exec('ALTER TABLE research_items ADD COLUMN program_coverages TEXT;');\n  } catch (e) {}\n\n  try {\n    sqlite.exec('ALTER TABLE issues ADD COLUMN executive_contract TEXT;');"
)

with open("src/db/index.ts", "w", encoding="utf-8") as f:
    f.write(content)

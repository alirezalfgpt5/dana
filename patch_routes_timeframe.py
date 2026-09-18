import re

with open("server/routes/issueRoutes.ts", "r", encoding="utf-8") as f:
    content = f.read()

cond = """    if (timeFrame) {
      const items = await db.select({ id: researchItems.id }).from(researchItems).where(eq(researchItems.timeFrame, timeFrame as string));
      const rIds = items.map(i => i.id);
      if (rIds.length > 0) {
        conditions.push(inArray(issues.researchItemId, rIds));
      } else {
        conditions.push(eq(issues.researchItemId, -1)); // No match
      }
    }"""

content = content.replace(
    "if (projectLevel) {",
    cond + "\n    if (projectLevel) {"
)

with open("server/routes/issueRoutes.ts", "w", encoding="utf-8") as f:
    f.write(content)

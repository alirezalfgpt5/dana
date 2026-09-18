import re

with open("src/pages/Issues/IssueSystem.tsx", "r", encoding="utf-8") as f:
    content = f.read()

ui = """          <select
            value={timeFrameFilter}
            onChange={e => setTimeFrameFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
          >
            <option value="all">⏳ همه زمان‌بندی‌ها</option>
            <option value="کوتاه‌مدت">کوتاه‌مدت</option>
            <option value="میان‌مدت">میان‌مدت</option>
            <option value="بلندمدت">بلندمدت</option>
          </select>"""

content = content.replace(
    '''<option value="کم">⬇️ کم</option>
          </select>''',
    '''<option value="کم">⬇️ کم</option>
          </select>\n''' + ui
)

content = content.replace(
    "setPriorityFilter('all');",
    "setPriorityFilter('all');\n              setTimeFrameFilter('all');"
)

with open("src/pages/Issues/IssueSystem.tsx", "w", encoding="utf-8") as f:
    f.write(content)

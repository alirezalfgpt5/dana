import re

with open("src/pages/Issues/IssueSystem.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "const [priorityFilter, setPriorityFilter] = useState('all');",
    "const [priorityFilter, setPriorityFilter] = useState('all');\n  const [timeFrameFilter, setTimeFrameFilter] = useState('all');"
)

content = content.replace(
    "fetchIssues({ page: 1, limit: 20, search: q, advancedFilter: advancedFilter ? JSON.stringify(advancedFilter) : undefined });",
    "fetchIssues({ page: 1, limit: 20, search: q, timeFrame: timeFrameFilter !== 'all' ? timeFrameFilter : undefined, advancedFilter: advancedFilter ? JSON.stringify(advancedFilter) : undefined });"
)

content = content.replace(
    "fetchIssues({ page: 1, limit: 20, advancedFilter: advancedFilter ? JSON.stringify(advancedFilter) : undefined });",
    "fetchIssues({ page: 1, limit: 20, timeFrame: timeFrameFilter !== 'all' ? timeFrameFilter : undefined, advancedFilter: advancedFilter ? JSON.stringify(advancedFilter) : undefined });"
)

content = content.replace(
    "fetchIssues({ page: pagination.page, limit: pagination.limit });",
    "fetchIssues({ page: pagination.page, limit: pagination.limit, timeFrame: timeFrameFilter !== 'all' ? timeFrameFilter : undefined });"
)

with open("src/pages/Issues/IssueSystem.tsx", "w", encoding="utf-8") as f:
    f.write(content)

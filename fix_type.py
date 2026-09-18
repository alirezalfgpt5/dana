import re
with open("src/components/issues/IssueFormTabs.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace(
    "uploadPromises.push(onUploadAttachment(savedIssue.id, file));",
    "uploadPromises.push(onUploadAttachment(savedIssue.id, file as File));"
)
with open("src/components/issues/IssueFormTabs.tsx", "w", encoding="utf-8") as f:
    f.write(content)

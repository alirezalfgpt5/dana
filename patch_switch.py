import re

with open("src/components/issues/IssueFormTabs.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "case 'contract': return renderContractTab();",
    "case 'contract': return renderContractTab();\n      case 'executive_contract': return renderExecutiveContractTab();"
)

with open("src/components/issues/IssueFormTabs.tsx", "w", encoding="utf-8") as f:
    f.write(content)

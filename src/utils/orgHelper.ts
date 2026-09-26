// src/utils/orgHelper.ts
// توابع کمکی برای استخراج و فرمت ساختار سازمانی، یگان و مالک در سراسر سامانه دانا

export function getTreeOrgText(tree: any): string {
  if (!tree) return 'ستاد کل آجا';
  if (tree.orgStructure && typeof tree.orgStructure === 'string' && tree.orgStructure.trim()) {
    return tree.orgStructure.trim();
  }
  const parts: string[] = [];
  if (tree.baseName) parts.push(tree.baseName);
  else if (tree.base_name) parts.push(tree.base_name);

  if (tree.unitName) parts.push(tree.unitName);
  else if (tree.unit_name) parts.push(tree.unit_name);

  if (parts.length > 0) {
    return parts.join(' • ');
  }

  if (tree.metadata?.ownerPath) {
    return tree.metadata.ownerPath;
  }

  return 'ستاد کل آجا';
}

export function getGapOrgText(gap: any): string {
  if (!gap) return 'ستاد کل آجا';
  if (gap.orgStructure && typeof gap.orgStructure === 'string' && gap.orgStructure.trim()) {
    return gap.orgStructure.trim();
  }
  if (gap.metadata?.ownerPath && typeof gap.metadata.ownerPath === 'string' && gap.metadata.ownerPath.trim()) {
    return gap.metadata.ownerPath.trim();
  }
  if (gap.requiredOrgStructure && typeof gap.requiredOrgStructure === 'string') {
    return gap.requiredOrgStructure.trim();
  }
  return 'ستاد کل آجا';
}

export function getIssueOrgText(issue: any): string {
  if (!issue) return 'ستاد کل آجا';
  if (issue.orgStructure && typeof issue.orgStructure === 'string' && issue.orgStructure.trim()) {
    return issue.orgStructure.trim();
  }
  if (issue.responsibleUnit && typeof issue.responsibleUnit === 'string' && issue.responsibleUnit.trim()) {
    return issue.responsibleUnit.trim();
  }
  if (issue.domainNode?.treeOrg) {
    return issue.domainNode.treeOrg;
  }
  return 'ستاد کل آجا';
}

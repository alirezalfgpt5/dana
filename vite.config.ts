import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import * as ts from 'typescript/unstable/ast';
import { API, type Snapshot } from 'typescript/unstable/sync';
import {defineConfig, type Plugin} from 'vite';

const UI_TEXT_VIRTUAL_ID = 'virtual:dana-ui-text-catalog';
const RESOLVED_UI_TEXT_VIRTUAL_ID = `\0${UI_TEXT_VIRTUAL_ID}`;
const LOCALIZED_ATTRIBUTES = new Set([
  'alt', 'aria-description', 'aria-label', 'label', 'placeholder', 'title',
]);
const LOCALIZED_OBJECT_KEYS = new Set([
  'buttonText', 'cancelText', 'caption', 'confirmText', 'description',
  'detail', 'emptyMessage', 'errorText', 'helpText', 'label', 'loadingText',
  'placeholder', 'subtitle', 'successText', 'tabLabel', 'title', 'tooltip',
]);
const LOCALIZED_MESSAGE_CALLS = new Set([
  'alert', 'confirm', 'dispatchAuthError', 'dispatchNetworkError', 'setError',
  'setMessage', 'setNotice', 'setSuccess', 'setWarning',
]);
const PERSIAN_OR_ARABIC = /[\u0600-\u06ff]/;

function normalizedJsxText(text: string): string {
  const lines = text.split(/\r\n|\n|\r/);
  let lastNonEmptyLine = lines.length - 1;
  while (lastNonEmptyLine >= 0 && !lines[lastNonEmptyLine].trim()) lastNonEmptyLine--;

  let result = '';
  lines.forEach((rawLine, index) => {
    let line = rawLine.replace(/\t/g, ' ');
    if (index !== 0) line = line.replace(/^[ ]+/, '');
    if (index !== lastNonEmptyLine) line = line.replace(/[ ]+$/, '');
    if (line) result += `${index !== 0 ? ' ' : ''}${line}`;
  });
  return result;
}

function getLocalizedTemplate(node: ts.TemplateExpression): { key: string; values: string[] } {
  let key = node.head.text;
  const values: string[] = [];
  node.templateSpans.forEach((span, index) => {
    key += `{${index}}${span.literal.text}`;
    values.push(span.expression.getText(node.getSourceFile()));
  });
  return { key, values };
}

function isPersianText(value: string): boolean {
  return PERSIAN_OR_ARABIC.test(value);
}

function sourceTextForNode(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return isPersianText(node.text) ? node.text : null;
  }
  if (ts.isTemplateExpression(node)) {
    const { key } = getLocalizedTemplate(node);
    return isPersianText(key) ? key : null;
  }
  return null;
}

function isUiSource(relativePath: string): boolean {
  return relativePath === 'src/App.tsx'
    || relativePath.startsWith('src/pages/')
    || relativePath.startsWith('src/components/')
    || relativePath.startsWith('src/lib/')
    || relativePath.startsWith('src/utils/')
    || relativePath === 'src/main.tsx'
    || relativePath === 'src/store.ts'
    || relativePath.startsWith('src/config/');
}

function collectUiText(sourceFile: ts.SourceFile, relativePath: string, texts: Set<string>): void {
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const text = normalizedJsxText(node.text);
      if (text && isPersianText(text)) texts.add(text);
    }

    if (ts.isJsxAttribute(node) && LOCALIZED_ATTRIBUTES.has(node.name.getText(sourceFile))
      && node.initializer && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
      const text = sourceTextForNode(node.initializer);
      if (text) texts.add(text);
    }

    if (ts.isPropertyAssignment(node)) {
      const key = node.name.getText(sourceFile).replace(/^['"]|['"]$/g, '');
      if (relativePath.startsWith('server/') || relativePath === 'server.ts') {
        if (['error', 'message'].includes(key)) {
          const text = sourceTextForNode(node.initializer);
          if (text) texts.add(text);
        }
      } else if (LOCALIZED_OBJECT_KEYS.has(key)) {
        const text = sourceTextForNode(node.initializer);
        if (text) texts.add(text);
      }
      if (relativePath === 'src/pages/Guide.tsx' && key === 'tasks') {
        const collectTaskText = (child: ts.Node) => {
          const text = sourceTextForNode(child);
          if (text) texts.add(text);
          child.forEachChild(collectTaskText);
        };
        collectTaskText(node.initializer);
      }
      if (relativePath === 'src/components/layout/Breadcrumbs.tsx'
        && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
        const text = sourceTextForNode(node.initializer);
        if (text) texts.add(text);
      }
    }

    if (relativePath === 'src/pages/ProgramMap.tsx'
      && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
      const text = sourceTextForNode(node);
      if (text) texts.add(text);
    }

    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const expression = node.expression;
      const callName = ts.isPropertyAccessExpression(expression) ? expression.name.text : expression.getText(sourceFile);
      const isToastCall = ts.isPropertyAccessExpression(expression)
        && expression.expression.getText(sourceFile) === 'toast'
        && ['error', 'success', 'loading', 'custom'].includes(callName);
      if ((isToastCall || LOCALIZED_MESSAGE_CALLS.has(callName))
        && !ts.isSpreadElement(node.arguments[0])) {
        const text = sourceTextForNode(node.arguments[0]);
        if (text) texts.add(text);
      }
    }

    node.forEachChild(visit);
  };
  visit(sourceFile);
}

function listUiSourceFiles(root: string): string[] {
  const directories = ['src/pages', 'src/components', 'src/config', 'src/lib', 'src/utils', 'server/routes'];
  const files = [
    path.join(root, 'src', 'App.tsx'),
    path.join(root, 'src', 'main.tsx'),
    path.join(root, 'src', 'store.ts'),
    path.join(root, 'server.ts'),
  ];
  const walk = (directory: string) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (/\.(?:ts|tsx)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) files.push(fullPath);
    }
  };
  directories.forEach(directory => walk(path.join(root, directory)));
  return [...new Set(files)];
}

function uiTextCategory(relativePath: string): string {
  if (relativePath.startsWith('src/components/layout/')) return 'منو و چیدمان';
  if (relativePath.includes('/Issues/') || relativePath.includes('/issues/')) return 'نظام مسائل';
  if (relativePath.includes('/Trees/') || relativePath.includes('/trees/')) return 'درختواره‌ها';
  if (relativePath.includes('/Gaps/')) return 'تحلیل شکاف';
  if (relativePath.includes('/Research/')) return 'درختواره پژوهشی';
  if (relativePath.includes('/Outputs/')) return 'خروجی‌ها';
  if (relativePath.startsWith('src/pages/Settings') || relativePath.includes('UiTextSettings')) return 'تنظیمات';
  if (relativePath.startsWith('src/pages/')) return 'صفحه‌های برنامه';
  if (relativePath.startsWith('src/components/')) return 'اجزای مشترک';
  if (relativePath.startsWith('src/config/')) return 'پیکربندی';
  if (relativePath.startsWith('src/lib/') || relativePath.startsWith('src/utils/')) return 'ابزارهای داخلی';
  return 'منطق سرور';
}

function localizedUiTextPlugin(root: string): Plugin {
  const api = new API({ cwd: root });
  let snapshot: Snapshot | null = null;
  const refreshSnapshot = () => {
    snapshot?.dispose();
    snapshot = api.updateSnapshot({ openProjects: [path.join(root, 'tsconfig.json')] });
  };
  const getSourceFile = (filePath: string) => {
    const sourceFile = snapshot?.getDefaultProjectForFile(filePath)?.program.getSourceFile(filePath);
    if (!sourceFile) throw new Error(`Could not parse UI source file: ${filePath}`);
    return sourceFile;
  };

  return {
    name: 'dana-localized-static-ui-text',
    enforce: 'pre',
    buildStart() {
      refreshSnapshot();
    },
    handleHotUpdate({ file }) {
      if (/\.(?:ts|tsx)$/.test(file)) refreshSnapshot();
    },
    closeBundle() {
      snapshot?.dispose();
      snapshot = null;
      api.close();
    },
    resolveId(id) {
      return id === UI_TEXT_VIRTUAL_ID ? RESOLVED_UI_TEXT_VIRTUAL_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_UI_TEXT_VIRTUAL_ID) return null;
      const texts = new Set<string>();
      const categoriesByText = new Map<string, string>();
      for (const file of listUiSourceFiles(root).sort()) {
        const relativePath = path.relative(root, file).replace(/\\/g, '/');
        const sourceFile = getSourceFile(file);
        const fileTexts = new Set<string>();
        collectUiText(sourceFile, relativePath, fileTexts);
        fileTexts.forEach(text => {
          texts.add(text);
          if (!categoriesByText.has(text)) categoriesByText.set(text, uiTextCategory(relativePath));
        });
      }
      const sortedTexts = [...texts].sort((a, b) => a.localeCompare(b, 'fa'));
      return `export const DEFAULT_UI_TEXTS = ${JSON.stringify(sortedTexts)};
export const DEFAULT_UI_TEXT_CATEGORY = ${JSON.stringify(Object.fromEntries(categoriesByText))};`;
    },
    transform(code, id) {
      const filePath = id.split('?')[0];
      const relativePath = path.relative(root, filePath).replace(/\\/g, '/');
      if (!isUiSource(relativePath) || !/\.(?:ts|tsx)$/.test(filePath)) return null;

      const sourceFile = getSourceFile(filePath);
      const replacements: Array<{ start: number; end: number; text: string }> = [];
      const addTextReplacement = (node: ts.Node, value: string) => {
        if (!isPersianText(value)) return;
        const expression = ts.isTemplateExpression(node)
          ? (() => {
            const template = getLocalizedTemplate(node);
            return `translateUiTemplate(${JSON.stringify(template.key)}, [${template.values.join(', ')}])`;
          })()
          : `translateUiText(${JSON.stringify(value)})`;
        const isJsxAttributeValue = ts.isJsxAttribute(node.parent) && node.parent.initializer === node;
        replacements.push({
          start: node.getStart(sourceFile),
          end: node.end,
          text: isJsxAttributeValue ? `{${expression}}` : expression,
        });
      };

      const visit = (node: ts.Node) => {
        if (ts.isJsxText(node)) {
          const text = normalizedJsxText(node.text);
          if (text) replacements.push({
            start: node.getStart(sourceFile),
            end: node.end,
            text: `{translateUiText(${JSON.stringify(text)})}`,
          });
        } else if (ts.isJsxAttribute(node) && LOCALIZED_ATTRIBUTES.has(node.name.getText(sourceFile))
          && node.initializer && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
          addTextReplacement(node.initializer, node.initializer.text);
        } else if (ts.isPropertyAssignment(node)) {
          const key = node.name.getText(sourceFile).replace(/^['"]|['"]$/g, '');
          if (LOCALIZED_OBJECT_KEYS.has(key)) addTextReplacement(node.initializer, sourceTextForNode(node.initializer) || '');
          if (relativePath === 'src/pages/Guide.tsx' && key === 'tasks') {
            const replaceTaskText = (child: ts.Node) => {
              if (ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) {
                addTextReplacement(child, sourceTextForNode(child) || '');
              }
              child.forEachChild(replaceTaskText);
            };
            replaceTaskText(node.initializer);
          }
          if (relativePath === 'src/components/layout/Breadcrumbs.tsx'
            && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
            addTextReplacement(node.initializer, sourceTextForNode(node.initializer) || '');
          }
        } else if (relativePath === 'src/pages/ProgramMap.tsx'
          && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
          addTextReplacement(node, sourceTextForNode(node) || '');
        } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
          const expression = node.expression;
          const callName = ts.isPropertyAccessExpression(expression) ? expression.name.text : expression.getText(sourceFile);
          const isToastCall = ts.isPropertyAccessExpression(expression)
            && expression.expression.getText(sourceFile) === 'toast'
            && ['error', 'success', 'loading', 'custom'].includes(callName);
          if ((isToastCall || LOCALIZED_MESSAGE_CALLS.has(callName))
            && !ts.isSpreadElement(node.arguments[0])) {
            addTextReplacement(node.arguments[0], sourceTextForNode(node.arguments[0]) || '');
          }
        }
        node.forEachChild(visit);
      };
      visit(sourceFile);

      if (replacements.length === 0) return null;
      const uniqueReplacements = replacements
        .sort((a, b) => b.start - a.start || b.end - a.end)
        .filter((replacement, index, all) => index === 0 || replacement.end <= all[index - 1].start);
      let transformed = code;
      for (const replacement of uniqueReplacements) {
        transformed = transformed.slice(0, replacement.start) + replacement.text + transformed.slice(replacement.end);
      }
      const utilityPath = path.posix.relative(path.posix.dirname(relativePath), 'src/utils/uiText');
      const importPath = utilityPath.startsWith('.') ? utilityPath : `./${utilityPath}`;
      const importStatement = /\btranslateUiText\b/.test(code)
        ? ''
        : `import { translateUiText, translateUiTemplate } from "${importPath}";\n`;
      return { code: `${importStatement}${transformed}`, map: null };
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [localizedUiTextPlugin(process.cwd()), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio to prevent WebSocket closed errors
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router-dom') || id.includes('zustand')) {
                return 'vendor-react';
              }
              if (id.includes('exceljs') || id.includes('docx') || id.includes('file-saver') || id.includes('papaparse')) {
                return 'vendor-office';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('date-fns') || id.includes('react-multi-date-picker') || id.includes('react-date-object')) {
                return 'vendor-date';
              }
              if (id.includes('fuse.js') || id.includes('axios') || id.includes('zod') || id.includes('react-hot-toast')) {
                return 'vendor-utils';
              }
              return 'vendor-libs';
            }
          },
        },
      },
    },
  };
});

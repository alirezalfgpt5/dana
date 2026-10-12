import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BookOpen, Code2, Database, FileText, Printer, Search } from 'lucide-react';
import ajaDocumentation from '../../AJA_KNOWLEDGE_GOVERNANCE_SYSTEM.md?raw';
import databaseDocumentation from '../../DATABASE_SCHEMA.md?raw';
import mysqlDocumentation from '../../MYSQL_SUPPORT.md?raw';
import { programMapFileGroups } from '../pages/ProgramMap';

interface DocumentationFile {
  id: string;
  title: string;
  fileName: string;
  content: string;
}

interface DocumentationHeading {
  id: string;
  title: string;
  level: number;
  line: number;
}

interface SearchResult {
  document: DocumentationFile;
  heading: DocumentationHeading;
  excerpt: string;
  searchableText: string;
}

const programMapDocumentation = [
  '# فهرست کامل فایل‌ها و مسئولیت اجزای برنامه',
  'این فهرست از دادهٔ صفحهٔ «نقشهٔ برنامه و راهنمای ارتقاء» تولید می‌شود تا توضیح فایل‌ها در راهنمای مدیران و نقشهٔ برنامه با هم هماهنگ بماند.',
  ...programMapFileGroups.flatMap(group => [
    `## ${group.title}`,
    '| مسیر/فایل | مسئولیت |',
    '| :--- | :--- |',
    ...group.files.map(([file, description]) => `| \`${file}\` | ${description} |`),
  ]),
].join('\n\n');

const documents: DocumentationFile[] = [
  {
    id: 'architecture',
    title: 'معماری و مستندات فنی',
    fileName: 'AJA_KNOWLEDGE_GOVERNANCE_SYSTEM.md',
    content: ajaDocumentation,
  },
  {
    id: 'database',
    title: 'ساختار و فیلدهای پایگاه داده',
    fileName: 'DATABASE_SCHEMA.md',
    content: databaseDocumentation,
  },
  {
    id: 'mysql',
    title: 'وضعیت و راهنمای MySQL',
    fileName: 'MYSQL_SUPPORT.md',
    content: mysqlDocumentation,
  },
  {
    id: 'files',
    title: 'فهرست فایل‌های برنامه',
    fileName: 'src/pages/ProgramMap.tsx',
    content: programMapDocumentation,
  },
];

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('fa')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u0640\u064B-\u065F\u0670\u200C\u200D]/g, '')
    .trim();
}

function headingSlug(title: string): string {
  return title
    .trim()
    .toLocaleLowerCase('fa')
    .replace(/[`*_~[\]()]/g, '')
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function readHeadings(content: string): DocumentationHeading[] {
  const headings: DocumentationHeading[] = [];
  const occurrences = new Map<string, number>();
  let insideCodeFence = false;

  content.split(/\r\n?|\n/).forEach((line, lineIndex) => {
    if (/^\s*```/.test(line)) {
      insideCodeFence = !insideCodeFence;
      return;
    }
    if (insideCodeFence) return;

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) return;

    const title = match[2].replace(/\s+#+\s*$/, '').trim();
    const slug = headingSlug(title) || `section-${lineIndex + 1}`;
    const occurrence = (occurrences.get(slug) || 0) + 1;
    occurrences.set(slug, occurrence);
    headings.push({
      id: occurrence === 1 ? slug : `${slug}-${occurrence}`,
      title,
      level: match[1].length,
      line: lineIndex,
    });
  });

  return headings;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function indexDocument(document: DocumentationFile): SearchResult[] {
  const lines = document.content.split(/\r\n?|\n/);
  const headings = readHeadings(document.content);

  return headings.map((heading, headingIndex) => {
    const nextHeading = headings.slice(headingIndex + 1).find(candidate => candidate.level <= heading.level);
    const sectionEnd = nextHeading?.line ?? lines.length;
    const sectionText = stripMarkdown(lines.slice(heading.line, sectionEnd).join(' '));

    return {
      document,
      heading,
      excerpt: sectionText.slice(0, 200),
      searchableText: sectionText,
    };
  });
}

function renderInlineMarkdown(text: string, anchorPrefix: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenPattern);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return <del key={index}>{part.slice(2, -2)}</del>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} dir="ltr" className="rounded bg-slate-100 px-1 py-0.5 text-[0.9em] text-slate-800">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      if (href.startsWith('#')) {
        return <a key={index} href={`#${anchorPrefix}${href.slice(1)}`} className="text-blue-700 underline decoration-blue-300 underline-offset-2">{label}</a>;
      }
      if (/^https:\/\//i.test(href)) {
        return <a key={index} href={href} target="_blank" rel="noreferrer" className="text-blue-700 underline decoration-blue-300 underline-offset-2">{label}</a>;
      }
      return <span key={index}>{label}</span>;
    }

    return <span key={index}>{part}</span>;
  });
}

function isTableDivider(line: string): boolean {
  const cells = line.trim().replace(/^\||\|$/g, '').split('|');
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell.trim()));
}

function isListLine(line: string): boolean {
  return /^\s*(?:[-*+]|\d+[.)])\s+/.test(line);
}

function isBlockStart(lines: string[], index: number): boolean {
  const line = lines[index];
  return /^(#{1,6})\s+/.test(line)
    || /^\s*```/.test(line)
    || /^\s*>/.test(line)
    || /^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/.test(line)
    || isListLine(line)
    || (line.trim().startsWith('|') && isTableDivider(lines[index + 1] || ''));
}

function renderMarkdown(content: string, anchorPrefix: string): ReactNode[] {
  const lines = content.split(/\r\n?|\n/);
  const blocks: ReactNode[] = [];
  let lineIndex = 0;
  let blockIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    if (!line.trim()) {
      lineIndex += 1;
      continue;
    }

    const codeStart = /^\s*```\s*([\w-]*)/.exec(line);
    if (codeStart) {
      const codeLines: string[] = [];
      lineIndex += 1;
      while (lineIndex < lines.length && !/^\s*```\s*$/.test(lines[lineIndex])) {
        codeLines.push(lines[lineIndex]);
        lineIndex += 1;
      }
      if (lineIndex < lines.length) lineIndex += 1;
      blocks.push(
        <pre key={blockIndex++} dir="ltr" className="my-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-left text-sm leading-6 text-slate-100">
          <code className={codeStart[1] ? `language-${codeStart[1]}` : undefined}>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (headingMatch) {
      const title = headingMatch[2].replace(/\s+#+\s*$/, '').trim();
      const heading = readHeadings(lines.slice(0, lineIndex + 1).join('\n')).at(-1);
      const id = `${anchorPrefix}${heading?.id || headingSlug(title)}`;
      const className = 'scroll-mt-6 font-bold leading-8 text-slate-900';
      const headingContent = renderInlineMarkdown(title, anchorPrefix);
      const headingLevel = headingMatch[1].length;

      if (headingLevel === 1) {
        blocks.push(<h1 key={blockIndex++} id={id} className={`mb-5 mt-2 text-3xl ${className}`}>{headingContent}</h1>);
      } else if (headingLevel === 2) {
        blocks.push(<h2 key={blockIndex++} id={id} className={`mb-3 mt-9 border-b border-slate-200 pb-2 text-2xl ${className}`}>{headingContent}</h2>);
      } else if (headingLevel === 3) {
        blocks.push(<h3 key={blockIndex++} id={id} className={`mb-2 mt-6 text-lg ${className}`}>{headingContent}</h3>);
      } else if (headingLevel === 4) {
        blocks.push(<h4 key={blockIndex++} id={id} className={`mb-2 mt-5 text-base ${className}`}>{headingContent}</h4>);
      } else if (headingLevel === 5) {
        blocks.push(<h5 key={blockIndex++} id={id} className={`mb-2 mt-4 text-sm ${className}`}>{headingContent}</h5>);
      } else {
        blocks.push(<h6 key={blockIndex++} id={id} className={`mb-2 mt-3 text-sm ${className}`}>{headingContent}</h6>);
      }
      lineIndex += 1;
      continue;
    }

    if (/^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push(<hr key={blockIndex++} className="my-6 border-slate-200" />);
      lineIndex += 1;
      continue;
    }

    if (line.trim().startsWith('|') && isTableDivider(lines[lineIndex + 1] || '')) {
      const readCells = (tableLine: string) => tableLine.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
      const headers = readCells(line);
      const rows: string[][] = [];
      lineIndex += 2;
      while (lineIndex < lines.length && lines[lineIndex].trim().startsWith('|')) {
        rows.push(readCells(lines[lineIndex]));
        lineIndex += 1;
      }
      blocks.push(
        <div key={blockIndex++} className="my-5 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full border-collapse text-right text-sm">
            <thead className="bg-slate-100">
              <tr>{headers.map((cell, cellIndex) => <th key={cellIndex} className="border-b border-slate-200 px-3 py-2 font-bold">{renderInlineMarkdown(cell, anchorPrefix)}</th>)}</tr>
            </thead>
            <tbody>{rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-white even:bg-slate-50">
                {headers.map((_, cellIndex) => <td key={cellIndex} className="border-b border-slate-100 px-3 py-2 align-top leading-6">{renderInlineMarkdown(row[cellIndex] || '', anchorPrefix)}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoteLines: string[] = [];
      while (lineIndex < lines.length && /^\s*>/.test(lines[lineIndex])) {
        quoteLines.push(lines[lineIndex].replace(/^\s*>\s?/, '').trim());
        lineIndex += 1;
      }
      blocks.push(<blockquote key={blockIndex++} className="my-4 border-r-4 border-blue-300 bg-blue-50 px-4 py-3 leading-7 text-slate-700">{quoteLines.map((quoteLine, quoteIndex) => <p key={quoteIndex}>{renderInlineMarkdown(quoteLine, anchorPrefix)}</p>)}</blockquote>);
      continue;
    }

    if (isListLine(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (lineIndex < lines.length && isListLine(lines[lineIndex]) && /^\s*\d+[.)]\s+/.test(lines[lineIndex]) === ordered) {
        items.push(lines[lineIndex].replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '').trim());
        lineIndex += 1;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={blockIndex++} className={`my-3 space-y-1.5 pr-6 leading-7 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineMarkdown(item, anchorPrefix)}</li>)}
        </List>,
      );
      continue;
    }

    const paragraphLines = [line.trim()];
    lineIndex += 1;
    while (lineIndex < lines.length && lines[lineIndex].trim() && !isBlockStart(lines, lineIndex)) {
      paragraphLines.push(lines[lineIndex].trim());
      lineIndex += 1;
    }
    blocks.push(<p key={blockIndex++} className="my-3 leading-7 text-slate-700">{renderInlineMarkdown(paragraphLines.join(' '), anchorPrefix)}</p>);
  }

  return blocks;
}

export function TechnicalDocumentation() {
  const [activeDocumentId, setActiveDocumentId] = useState(documents[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [jumpTarget, setJumpTarget] = useState<string | null>(null);
  const activeDocument = documents.find(document => document.id === activeDocumentId) || documents[0];
  const anchorPrefix = `technical-doc-${activeDocument.id}--`;

  const allHeadings = useMemo(
    () => documents.map(document => ({ document, headings: readHeadings(document.content) })),
    [],
  );
  const activeHeadings = allHeadings.find(item => item.document.id === activeDocument.id)?.headings || [];
  const searchIndex = useMemo(() => documents.flatMap(indexDocument), []);
  const searchResults = useMemo<SearchResult[]>(() => {
    const query = normalizeSearchText(searchQuery);
    if (!query) return [];
    const terms = query.split(/\s+/);
    return searchIndex
      .filter(result => {
        const searchableText = normalizeSearchText(`${result.document.title} ${result.document.fileName} ${result.heading.title} ${result.searchableText}`);
        return terms.every(term => searchableText.includes(term));
      })
      .slice(0, 20);
  }, [searchIndex, searchQuery]);

  useEffect(() => {
    if (!jumpTarget) return;
    requestAnimationFrame(() => {
      document.getElementById(jumpTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [activeDocumentId, jumpTarget]);

  const openSearchResult = (result: SearchResult) => {
    const targetId = `technical-doc-${result.document.id}--${result.heading.id}`;
    setActiveDocumentId(result.document.id);
    setJumpTarget(null);
    setSearchQuery('');
    requestAnimationFrame(() => setJumpTarget(targetId));
  };

  const printDocumentation = () => {
    const finishPrint = () => document.body.classList.remove('technical-doc-printing');
    window.addEventListener('afterprint', finishPrint, { once: true });
    document.body.classList.add('technical-doc-printing');
    window.print();
  };

  return (
    <section dir="rtl" className="technical-doc-print-area space-y-5">
      <header className="rounded-2xl bg-gradient-to-l from-slate-900 to-indigo-900 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-1 shrink-0 text-cyan-300" size={28} />
            <div>
              <h2 className="text-2xl font-bold">مستندات فنی سامانه دانا</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-indigo-100">
                معماری و فناوری‌ها، فایل‌های برنامه، امنیت، پایگاه داده و وضعیت مهاجرت؛ مستندات زیر مستقیماً از فایل‌های همین نسخه خوانده می‌شوند.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={printDocumentation}
            className="technical-doc-print-controls inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <Printer size={17} />
            چاپ این سند
          </button>
        </div>
      </header>

      <section className="technical-doc-print-controls relative z-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="technical-document-search" className="mb-2 block text-sm font-bold text-slate-800">
          جستجوی زنده در همهٔ مستندات
        </label>
        <div className="relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="technical-document-search"
            type="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && searchResults[0]) {
                event.preventDefault();
                openSearchResult(searchResults[0]);
              } else if (event.key === 'Escape') {
                setSearchQuery('');
              }
            }}
            placeholder="عنوان، فایل، فناوری، جدول یا نام فیلد را وارد کنید..."
            autoComplete="off"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        {searchQuery.trim() && (
          <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1" aria-live="polite">
            {searchResults.length ? searchResults.map(result => (
              <button
                key={`${result.document.id}-${result.heading.id}`}
                type="button"
                onClick={() => openSearchResult(result)}
                className="block w-full rounded-lg px-3 py-2.5 text-right transition hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none"
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-indigo-800">
                  <span>{result.document.title}</span>
                  <span aria-hidden="true" className="text-slate-400">/</span>
                  <span>{result.heading.title}</span>
                </span>
                <span dir="ltr" className="mt-1 block text-left text-[11px] text-slate-400">{result.document.fileName}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">{result.excerpt}</span>
              </button>
            )) : (
              <p className="px-3 py-4 text-center text-sm text-slate-500">بخشی با همهٔ واژه‌های واردشده پیدا نشد.</p>
            )}
          </div>
        )}
      </section>

      <nav className="technical-doc-print-controls flex flex-wrap gap-2" aria-label="اسناد فنی">
        {documents.map(document => {
          const Icon = document.id === 'files'
            ? Code2
            : document.id === 'database'
              ? Database
              : document.id === 'mysql'
                ? FileText
                : BookOpen;
          return (
            <button
              key={document.id}
              type="button"
              aria-pressed={activeDocument.id === document.id}
              onClick={() => {
                setActiveDocumentId(document.id);
                setJumpTarget(null);
              }}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${activeDocument.id === document.id ? 'border-indigo-700 bg-indigo-700 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'}`}
            >
              <Icon size={17} />
              {document.title}
            </button>
          );
        })}
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
          <div className="mb-5 border-b border-slate-100 pb-4">
            <p dir="ltr" className="break-all text-left text-xs text-slate-400">{activeDocument.fileName}</p>
          </div>
          <div className="technical-doc-content min-w-0 text-sm leading-7">
            {renderMarkdown(activeDocument.content, anchorPrefix)}
          </div>
        </article>

        <aside className="technical-doc-print-controls rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
          <h3 className="mb-3 border-b border-slate-100 pb-3 text-sm font-bold text-slate-800">فهرست همین سند</h3>
          <nav aria-label="فهرست بخش‌های سند" className="max-h-[70vh] space-y-1 overflow-y-auto">
            {activeHeadings.map(heading => (
              <a
                key={heading.id}
                href={`#${anchorPrefix}${heading.id}`}
                className="block rounded-lg py-1.5 text-xs leading-5 text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-800"
                style={{ paddingRight: `${Math.max(0, heading.level - 1) * 0.7}rem` }}
              >
                {heading.title}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </section>
  );
}

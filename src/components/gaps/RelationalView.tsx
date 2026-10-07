import { useMemo } from 'react';
import { AlertCircle, ArrowLeft, Beaker, Clock, Database, GitBranch } from 'lucide-react';

interface RelNode {
  id: number;
  title: string;
  level: string;
  levelLabel: string;
  gapId?: number | null;
  gapStatus?: string;
  gapType?: string | null;
  matchScore?: number | null;
  producedNodeId?: number | null;
  producedTreeName?: string | null;
  gap?: any;
  researchItem?: any;
  researchItems?: any[];
  issue?: any;
  metadata?: any;
  requiredNodeId?: number;
  requiredNodeTitle?: string;
}

interface RelationalViewProps {
  requiredNodes: RelNode[];
  producedNodes: RelNode[];
  researchItems: RelNode[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onNodeClick?: (node: RelNode, type: 'required' | 'produced' | 'research') => void;
}

const levelColors: Record<string, string> = {
  R: 'bg-purple-100 text-purple-700',
  T: 'bg-blue-100 text-blue-700',
  B: 'bg-sky-100 text-sky-700',
  SB: 'bg-cyan-100 text-cyan-700',
  L: 'bg-emerald-100 text-emerald-700',
  Q: 'bg-orange-100 text-orange-700',
};

const statusLabels: Record<string, string> = {
  filled: 'پوشش کامل',
  partially_filled: 'پوشش جزئی',
  open: 'گپ باز',
};

function ConnectionArrow({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col items-center justify-center gap-1 ${connected ? 'text-indigo-500' : 'text-slate-400'}`}>
      <span className="whitespace-nowrap text-center text-[9px] leading-3">{connected ? label : 'بدون پیوند'}</span>
      {connected ? (
        <div className="flex w-full items-center">
          <span className="h-px flex-1 bg-indigo-300" />
          <ArrowLeft size={15} className="-mr-1 shrink-0" />
        </div>
      ) : (
        <span className="w-8 border-t border-dashed border-slate-300" />
      )}
    </div>
  );
}

function EmptyRelation({ children }: { children: string }) {
  return (
    <div className="flex min-h-[70px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] leading-relaxed text-slate-500">
      {children}
    </div>
  );
}

function NodeCard({
  node,
  kind,
  onClick,
}: {
  node: RelNode;
  kind: 'required' | 'produced' | 'research';
  onClick?: () => void;
}) {
  const style = kind === 'required'
    ? 'border-blue-200 bg-blue-50/70'
    : kind === 'produced'
      ? 'border-emerald-200 bg-emerald-50/70'
      : 'border-violet-200 bg-violet-50/70';
  const researchTitle = node.issue?.title
    || node.metadata?.title
    || node.metadata?.name
    || node.title
    || `پژوهش شمارهٔ ${node.id}`;
  const title = kind === 'research' ? researchTitle : node.title;
  const clickable = kind !== 'produced' && !!onClick;

  return (
    <div
      className={`min-w-0 rounded-xl border p-3 ${style} ${clickable ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      } : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className="flex items-start gap-2">
        {kind === 'required' ? (
          <GitBranch size={14} className="mt-0.5 shrink-0 text-blue-600" />
        ) : kind === 'produced' ? (
          <Database size={14} className="mt-0.5 shrink-0 text-emerald-600" />
        ) : (
          <Beaker size={14} className="mt-0.5 shrink-0 text-violet-600" />
        )}
        <div className="min-w-0 flex-1">
          <p className="break-words text-xs font-semibold leading-relaxed text-gray-800">{title}</p>
          <span className="mt-1 block text-[9px] text-slate-400">شناسه: {node.id}</span>
          {kind === 'required' && node.gapStatus && (
            <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${
              node.gapStatus === 'filled'
                ? 'bg-emerald-100 text-emerald-700'
                : node.gapStatus === 'partially_filled'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-rose-100 text-rose-700'
            }`}>
              {statusLabels[node.gapStatus] || node.gapStatus}
            </span>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {kind !== 'research' && (
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${levelColors[node.level] || 'bg-gray-100 text-gray-700'}`}>
                {node.levelLabel || node.level}
              </span>
            )}
            {kind === 'produced' && node.producedTreeName && (
              <span className="text-[9px] text-emerald-700">{node.producedTreeName}</span>
            )}
            {kind === 'required' && node.matchScore != null && node.matchScore > 0 && (
              <span className="text-[9px] text-gray-500">
                امتیاز تحلیل: {Math.round(node.matchScore * 100)}٪
              </span>
            )}
            {kind === 'required' && node.gapType && (
              <span className="text-[9px] text-indigo-700">
                {node.gapType === 'fuzzy' ? 'تطابق فازی'
                  : node.gapType === 'partial' ? 'تطابق قالبی جزئی'
                    : node.gapType === 'manual' ? 'تطابق دستی'
                      : node.gapType === 'complete' ? 'تطابق قالبی'
                        : node.gapType}
              </span>
            )}
            {kind === 'research' && node.issue?.status && (
              <span className="text-[9px] text-violet-700">وضعیت: {node.issue.status}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RelationalView({
  requiredNodes,
  producedNodes,
  researchItems,
  loading = false,
  error,
  emptyMessage = 'برای این درختواره هنوز نتیجهٔ تحلیلی وجود ندارد.',
  onNodeClick,
}: RelationalViewProps) {
  const { rows, unlinkedProduced } = useMemo(() => {
    const producedById = new Map(producedNodes.map(node => [node.id, node]));
    const researchByGapId = new Map<number, RelNode[]>();
    researchItems.forEach(item => {
      if (item.gapId == null) return;
      const list = researchByGapId.get(item.gapId) || [];
      list.push(item);
      researchByGapId.set(item.gapId, list);
    });

    const linkedProducedIds = new Set<number>();
    const relationalRows = requiredNodes.map(required => {
      const produced = required.producedNodeId
        ? producedById.get(required.producedNodeId) || (required.gap?.producedNode
          ? { ...required.gap.producedNode, producedTreeName: required.gap.metadata?.producedTreeName }
          : undefined)
        : undefined;
      if (produced?.id) linkedProducedIds.add(produced.id);
      const research = required.gapId != null ? researchByGapId.get(required.gapId) || [] : [];
      return { required, produced, research };
    });

    return {
      rows: relationalRows,
      unlinkedProduced: producedNodes.filter(node => !linkedProducedIds.has(node.id)),
    };
  }, [requiredNodes, producedNodes, researchItems]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <Database size={16} className="text-violet-600" />
          ارتباط واقعی نیاز، گره تولیدشده و پژوهش
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          فلش‌ها فقط اتصال ثبت‌شده را نشان می‌دهند: تطابق نیاز با گره تولیدشده و پیوند همان گپ به پژوهش.
        </p>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-slate-500">در حال دریافت ارتباط‌های ثبت‌شده...</div>
      ) : error ? (
        <div className="m-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        <>
          <div className="overflow-x-auto p-4">
            <div dir="rtl" className="min-w-[1050px]">
              <div className="mb-2 grid grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)_92px_minmax(0,1fr)] items-center gap-2 px-1">
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-800">
                  نیاز دانشی ({requiredNodes.length})
                </div>
                <div />
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-800">
                  گرهٔ تولیدشده
                </div>
                <div />
                <div className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-center text-xs font-bold text-violet-800">
                  پژوهش‌های مرتبط
                </div>
              </div>

              <div className="space-y-2">
                {rows.map(({ required, produced, research }) => (
                  <div key={required.id} className="grid grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)_92px_minmax(0,1fr)] items-stretch gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-2">
                    <NodeCard
                      node={required}
                      kind="required"
                      onClick={() => onNodeClick?.(required, 'required')}
                    />

                    <ConnectionArrow label="گرهٔ متصل‌شده" connected={!!produced} />

                    {produced ? (
                      <NodeCard node={produced} kind="produced" />
                    ) : (
                      <EmptyRelation>
                        {required.producedNodeId
                          ? 'گرهٔ متصل در درختوارهٔ انتخاب‌شده بارگذاری نشده است'
                          : required.gap
                            ? `بدون اتصال به گرهٔ تولیدشده؛ ${statusLabels[required.gapStatus || 'open'] || 'وضعیت نامشخص'}`
                            : 'برای این نیاز هنوز نتیجهٔ تحلیل ثبت نشده است'}
                      </EmptyRelation>
                    )}

                    <ConnectionArrow label="پیوند گپ به پژوهش" connected={research.length > 0} />

                    {research.length > 0 ? (
                      <div className="space-y-1.5">
                        {research.map(item => (
                          <NodeCard
                            key={item.id}
                            node={item}
                            kind="research"
                            onClick={() => onNodeClick?.(item, 'research')}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyRelation>برای این نیاز پژوهشی ثبت نشده است</EmptyRelation>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {unlinkedProduced.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/70 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700">
                <Clock size={14} className="text-slate-500" />
                گره‌های تولیدشدهٔ بدون اتصال ({unlinkedProduced.length})
              </h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {unlinkedProduced.map(node => (
                  <NodeCard key={node.id} node={node} kind="produced" />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default RelationalView;

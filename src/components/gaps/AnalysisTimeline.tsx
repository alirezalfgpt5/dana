import { useEffect, useRef, useState } from 'react';
import { Check, Circle, X } from 'lucide-react';

export interface AnalysisProgressEvent {
  id: number;
  title: string;
  status: 'active' | 'completed' | 'failed';
}

interface AnalysisTimelineProps {
  events: AnalysisProgressEvent[];
  running: boolean;
}

export function AnalysisTimeline({ events, running }: AnalysisTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef(events);
  const revealedRef = useRef(new Map<number, { title: string; wordsShown: number }>());
  const [renderVersion, setRenderVersion] = useState(0);
  eventsRef.current = events;

  useEffect(() => {
    if (!events.length) return;
    const timer = window.setInterval(() => {
      let allTerminalEventsRevealed = true;
      for (const event of eventsRef.current) {
        const words = event.title.trim().split(/\s+/).filter(Boolean);
        const previous = revealedRef.current.get(event.id);
        let wordsShown = previous?.wordsShown ?? 0;

        if (previous && previous.title !== event.title) {
          const previousWords = previous.title.trim().split(/\s+/).filter(Boolean);
          let commonPrefix = 0;
          while (
            commonPrefix < previousWords.length
            && commonPrefix < words.length
            && previousWords[commonPrefix] === words[commonPrefix]
          ) {
            commonPrefix++;
          }
          wordsShown = Math.min(wordsShown, commonPrefix);
        }

        if (wordsShown < words.length) {
          revealedRef.current.set(event.id, { title: event.title, wordsShown: wordsShown + 1 });
          setRenderVersion(version => version + 1);
          return;
        }

        revealedRef.current.set(event.id, { title: event.title, wordsShown });
        if (event.status === 'active') {
          allTerminalEventsRevealed = false;
          return;
        }
      }
      if (allTerminalEventsRevealed) window.clearInterval(timer);
    }, 95);

    return () => window.clearInterval(timer);
  }, [events.length, running]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
  }, [renderVersion]);

  const visibleEvents = events.map(event => {
    const words = event.title.trim().split(/\s+/).filter(Boolean);
    const revealed = revealedRef.current.get(event.id);
    const wordsShown = revealed?.title === event.title ? revealed.wordsShown : 0;
    return {
      ...event,
      text: words.slice(0, wordsShown).join(' '),
      isTyping: wordsShown < words.length,
      isComplete: event.status === 'completed' && wordsShown === words.length,
    };
  });

  return (
    <div
      ref={scrollRef}
      className="max-h-[320px] space-y-2 overflow-y-auto overscroll-contain rounded-xl border border-slate-100 bg-white/80 p-3"
      aria-live="polite"
      aria-busy={running}
      role="status"
    >
      {visibleEvents.length > 0 ? (
        <ol className="space-y-2">
          {visibleEvents.map(event => (
            <li
              key={event.id}
              className={`flex items-start gap-3 rounded-lg p-2 ${
                event.isComplete
                  ? 'bg-emerald-50/70'
                  : event.status === 'failed'
                    ? 'bg-rose-50/70'
                    : event.status === 'active'
                      ? 'bg-emerald-50/40'
                      : 'bg-slate-50/70'
              }`}
            >
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                event.isComplete
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : event.status === 'failed'
                    ? 'border-rose-500 bg-rose-500 text-white'
                    : event.status === 'active'
                      ? 'border-emerald-500 bg-white'
                        : 'border-emerald-300 bg-white text-emerald-500'
              }`}>
                {event.isComplete
                  ? <Check size={13} strokeWidth={3} />
                  : event.status === 'failed'
                    ? <X size={13} strokeWidth={3} />
                    : event.status === 'active'
                      ? <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                      : <Circle size={7} fill="currentColor" />}
              </span>
              <p className={`text-xs leading-relaxed ${
                event.status === 'failed' ? 'text-rose-800' : 'text-gray-700'
              }`}>
                {event.text}
                {event.isTyping && <span className="mr-0.5 inline-block h-3 w-0.5 animate-pulse bg-emerald-500 align-middle" />}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex items-start gap-3 rounded-lg bg-emerald-50/70 p-2.5">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
          <p className="text-xs leading-relaxed text-gray-700">
            {running ? 'در حال آغاز تحلیل و آماده‌سازی داده‌ها...' : 'رویدادی برای نمایش وجود ندارد.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default AnalysisTimeline;

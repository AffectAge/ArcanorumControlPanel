import { useMemo } from 'react';
import { useEventLog } from '../eventLog';
import type { EventCategory } from '../types';

const CATEGORY_META: Record<
  EventCategory,
  { label: string; color: string }
> = {
  system: { label: 'Система', color: '#94a3b8' },
  colonization: { label: 'Колонизация', color: '#22c55e' },
  politics: { label: 'Политика', color: '#38bdf8' },
  economy: { label: 'Экономика', color: '#f59e0b' },
  military: { label: 'Война', color: '#ef4444' },
  diplomacy: { label: 'Дипломатия', color: '#a855f7' },
};

const CategoryIcon = ({ category }: { category: EventCategory }) => {
  const color = CATEGORY_META[category].color;
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <circle cx="12" cy="12" r="5" fill="currentColor" />
        <path
          d="M12 2v4M12 18v4M2 12h4M18 12h4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
};

export default function EventLogPanel() {
  const { log, setFilters, clearLog, trimOld, collapsed, toggleCollapsed } =
    useEventLog();

  const entries = useMemo(
    () =>
      log.entries.filter((entry) => log.filters[entry.category] !== false),
    [log.entries, log.filters],
  );

  return (
    <div className="fixed bottom-40 right-4 z-40 w-[26rem]">
      <div className="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-white/85 text-sm font-semibold">
            Журнал событий
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={trimOld}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:border-emerald-400/40"
            >
              Скрыть старые
            </button>
            <button
              onClick={clearLog}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:border-emerald-400/40"
            >
              Очистить
            </button>
            <button
              onClick={toggleCollapsed}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:border-emerald-400/40"
            >
              {collapsed ? 'Развернуть' : 'Свернуть'}
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
            <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-white/10">
              {(Object.keys(CATEGORY_META) as EventCategory[]).map((category) => {
                const active = log.filters[category] !== false;
                const meta = CATEGORY_META[category];
                return (
                  <button
                    key={category}
                    onClick={() =>
                      setFilters({
                        ...log.filters,
                        [category]: !active,
                      })
                    }
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${
                      active
                        ? 'border-emerald-400/40 bg-emerald-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-white/60'
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-3 event-log-scroll">
              {entries.length === 0 ? (
                <div className="text-xs text-white/50">Нет событий</div>
              ) : (
                entries.map((entry) => {
                  const meta = CATEGORY_META[entry.category];
                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2"
                    >
                      <CategoryIcon category={entry.category} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-[11px] text-white/50">
                          <span className="text-white/70">
                            Ход {entry.turn}
                          </span>
                          <span className="text-white/40">•</span>
                          <span style={{ color: meta.color }}>{meta.label}</span>
                        </div>
                        {entry.title && (
                          <div className="text-sm text-white/90 font-semibold">
                            {entry.title}
                          </div>
                        )}
                        <div className="text-sm text-white/75">
                          {entry.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

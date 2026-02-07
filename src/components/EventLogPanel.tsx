import { useMemo } from 'react';
import { useEventLog } from '../eventLog';
import type { EventCategory, EventPriority } from '../types';

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
  const icon = (() => {
    switch (category) {
      case 'colonization':
        return (
          <path
            d="M6 18l12-12M8 6h4v4M10 14h4v4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'politics':
        return (
          <path
            d="M6 7h12M6 12h12M6 17h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      case 'economy':
        return (
          <path
            d="M6 16l4-4 3 3 5-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'military':
        return (
          <path
            d="M6 17l6-11 6 11M8 13h8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'diplomacy':
        return (
          <path
            d="M8 12h8M6 8l4 8M18 8l-4 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'system':
      default:
        return (
          <>
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path
              d="M12 2v4M12 18v4M2 12h4M18 12h4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        );
    }
  })();

  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        {icon}
      </svg>
    </span>
  );
};

const Tooltip = ({ label }: { label: string }) => (
  <span className="pointer-events-none absolute -top-9 right-1/2 translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
    {label}
  </span>
);

const PriorityIcon = ({ priority }: { priority: EventPriority }) => {
  const color =
    priority === 'high' ? '#ef4444' : priority === 'medium' ? '#facc15' : '#22c55e';
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10"
      style={{ backgroundColor: `${color}22`, color }}
      title={
        priority === 'high'
          ? 'Высокая важность'
          : priority === 'medium'
            ? 'Средняя важность'
            : 'Низкая важность'
      }
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Z"
          fill="currentColor"
        />
        <path
          d="M6 17h12l-1.6-2.4a6.5 6.5 0 0 1-1.1-3.6V9a5.3 5.3 0 0 0-10.6 0v2a6.5 6.5 0 0 1-1.1 3.6L6 17Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
};

type EventLogPanelProps = {
  activeCountryId?: string;
};

const ActionIcon = ({ name }: { name: 'trim' | 'sort' | 'clear' | 'collapse' | 'expand' }) => {
  switch (name) {
    case 'trim':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            d="M4 4h16M6 8h12M8 12h8M10 16h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'sort':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            d="M7 4v16M7 20l-3-3M7 20l3-3M14 4h6M12 9h8M10 14h10M8 19h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'clear':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            d="M4 7h16M9 7V5h6v2M9 10v7M12 10v7M15 10v7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="6"
            y="7"
            width="12"
            height="13"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      );
    case 'expand':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            d="M7 10l5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'collapse':
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            d="M7 14l5-5 5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};

const ScopeIcon = ({ scope }: { scope: 'all' | 'own' | 'others' }) => {
  switch (scope) {
    case 'own':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <circle cx="12" cy="8" r="3" fill="currentColor" />
          <path
            d="M5 20c1.5-3.5 5-5 7-5s5.5 1.5 7 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'others':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <circle cx="9" cy="8" r="3" fill="currentColor" />
          <circle cx="16" cy="10" r="2.5" fill="currentColor" />
          <path
            d="M3.5 20c1.2-3 4-4.5 5.5-4.5S13.3 17 14.5 20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'all':
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
          <path
            d="M3 12h18M12 3c3.5 3 3.5 15 0 18M12 3c-3.5 3-3.5 15 0 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};

export default function EventLogPanel({ activeCountryId }: EventLogPanelProps) {
  const {
    log,
    setFilters,
    setSortByPriority,
    setCountryScope,
    clearLog,
    trimOld,
    collapsed,
    toggleCollapsed,
  } = useEventLog();

  const priorityOrder: Record<EventPriority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const entries = useMemo(
    () => {
      const filtered = log.entries.filter((entry) => {
        if (entry.category === 'system') return true;
        if (log.filters[entry.category] === false) return false;
        const scope = log.countryScope ?? 'all';
        if (scope === 'all') return true;
        if (!entry.countryId) return false;
        if (scope === 'own') {
          return entry.countryId === activeCountryId;
        }
        return entry.countryId !== activeCountryId;
      });
      if (!log.sortByPriority) return filtered;
      return [...filtered].sort((a, b) => {
        const diff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (diff !== 0) return diff;
        return b.turn - a.turn;
      });
    },
    [log.entries, log.filters, log.sortByPriority, log.countryScope, activeCountryId],
  );

  return (
    <div className="fixed bottom-40 right-4 z-40 w-[26rem]">
      <div className="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-white/85 text-sm font-semibold">
            Журнал событий
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button
                onClick={trimOld}
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:border-emerald-400/40 flex items-center justify-center"
              >
                <ActionIcon name="trim" />
              </button>
              <Tooltip label="Скрыть старые" />
            </div>
            <div className="relative group">
              <button
                onClick={() => setSortByPriority(!log.sortByPriority)}
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:border-emerald-400/40 flex items-center justify-center"
              >
                <ActionIcon name="sort" />
              </button>
              <Tooltip
                label={log.sortByPriority ? 'Сортировать по времени' : 'Сортировать по важности'}
              />
            </div>
            <div className="relative group">
              <button
                onClick={clearLog}
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:border-emerald-400/40 flex items-center justify-center"
              >
                <ActionIcon name="clear" />
              </button>
              <Tooltip label="Очистить" />
            </div>
            <div className="relative group">
              <button
                onClick={toggleCollapsed}
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:border-emerald-400/40 flex items-center justify-center"
              >
                <ActionIcon name={collapsed ? 'expand' : 'collapse'} />
              </button>
              <Tooltip label={collapsed ? 'Развернуть' : 'Свернуть'} />
            </div>
          </div>
        </div>

        {!collapsed && (
          <>
            <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-white/10">
              {(Object.keys(CATEGORY_META) as EventCategory[]).map((category) => {
                const active = log.filters[category] !== false;
                const meta = CATEGORY_META[category];
                return (
                  <div key={category} className="relative group">
                    <button
                      onClick={() =>
                        setFilters({
                          ...log.filters,
                          [category]: !active,
                        })
                      }
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs transition-colors ${
                        active
                          ? 'border-emerald-400/40 bg-emerald-500/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/60'
                      }`}
                    >
                      <CategoryIcon category={category} />
                    </button>
                    <Tooltip label={meta.label} />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
              {([
                { id: 'all', label: 'Все' },
                { id: 'own', label: 'Наши' },
                { id: 'others', label: 'Чужие' },
              ] as const).map((scope) => {
                const active = (log.countryScope ?? 'all') === scope.id;
                return (
                  <div key={scope.id} className="relative group">
                    <button
                      onClick={() => setCountryScope(scope.id)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs transition-colors ${
                        active
                          ? 'border-emerald-400/40 bg-emerald-500/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/60'
                      }`}
                    >
                      <ScopeIcon scope={scope.id} />
                    </button>
                    <Tooltip label={scope.label} />
                  </div>
                );
              })}
            </div>

            <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-3 legend-scroll">
              {entries.length === 0 ? (
                <div className="text-xs text-white/50">Нет событий</div>
              ) : (
                entries.map((entry) => {
                  const meta = CATEGORY_META[entry.category];
                  return (
                    <div
                      key={entry.id}
                      className="relative flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2"
                    >
                      <CategoryIcon category={entry.category} />
                      <div className="absolute right-2 top-2">
                        <PriorityIcon priority={entry.priority} />
                      </div>
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

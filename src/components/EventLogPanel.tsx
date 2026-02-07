import { useMemo } from 'react';
import {
  Sliders,
  MapPinned,
  Landmark,
  TrendingUp,
  Shield,
  Handshake,
  Bell,
  Lock,
  Globe,
  Filter,
  ArrowUpDown,
  Trash2,
  ChevronUp,
  ChevronDown,
  User,
  Users,
} from 'lucide-react';
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
  const Icon = (() => {
    switch (category) {
      case 'colonization':
        return MapPinned;
      case 'politics':
        return Landmark;
      case 'economy':
        return TrendingUp;
      case 'military':
        return Shield;
      case 'diplomacy':
        return Handshake;
      case 'system':
      default:
        return Sliders;
    }
  })();

  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <Icon className="h-4 w-4" aria-hidden />
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
    >
      <Bell className="h-4 w-4" aria-hidden />
    </span>
  );
};

const VisibilityIcon = ({ visibility }: { visibility: 'public' | 'private' }) => {
  const isPrivate = visibility === 'private';
  const color = isPrivate ? '#f97316' : '#38bdf8';
  const Icon = isPrivate ? Lock : Globe;
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
};

type EventLogPanelProps = {
  activeCountryId?: string;
  countries?: { id: string; flagDataUrl?: string; color?: string }[];
};

const ActionIcon = ({ name }: { name: 'trim' | 'sort' | 'clear' | 'collapse' | 'expand' }) => {
  const Icon = (() => {
    switch (name) {
      case 'trim':
        return Filter;
      case 'sort':
        return ArrowUpDown;
      case 'clear':
        return Trash2;
      case 'expand':
        return ChevronDown;
      case 'collapse':
      default:
        return ChevronUp;
    }
  })();
  return <Icon className="h-4 w-4" aria-hidden />;
};

const ScopeIcon = ({ scope }: { scope: 'all' | 'own' | 'others' }) => {
  const Icon = scope === 'own' ? User : scope === 'others' ? Users : Globe;
  return <Icon className="h-4 w-4" aria-hidden />;
};

export default function EventLogPanel({
  activeCountryId,
  countries = [],
}: EventLogPanelProps) {
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
        if (
          entry.visibility === 'private' &&
          (!entry.countryId || entry.countryId !== activeCountryId)
        ) {
          return false;
        }
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
      const ordered = log.sortByPriority
        ? [...filtered].sort((a, b) => {
        const diff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (diff !== 0) return diff;
        return b.turn - a.turn;
      })
        : filtered;

      const grouped: Array<{ entry: (typeof ordered)[number]; count: number }> = [];
      const indexByKey = new Map<string, number>();
      ordered.forEach((entry) => {
        const key = `${entry.turn}|${entry.category}|${entry.priority}|${entry.title ?? ''}|${entry.message}|${entry.countryId ?? ''}`;
        const existingIndex = indexByKey.get(key);
        if (existingIndex !== undefined) {
          grouped[existingIndex].count += 1;
          return;
        }
        indexByKey.set(key, grouped.length);
        grouped.push({ entry, count: 1 });
      });

      return grouped;
    },
    [log.entries, log.filters, log.sortByPriority, log.countryScope, activeCountryId],
  );

  const wrapperClass = collapsed
    ? 'absolute top-24 right-4 z-40 w-[26rem]'
    : 'absolute top-24 right-4 bottom-24 z-40 w-[26rem]';
  const panelClass = collapsed
    ? 'rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl shadow-2xl'
    : 'h-full rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl shadow-2xl flex flex-col';

  return (
    <div className={wrapperClass}>
      <div className={panelClass}>
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
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:border-red-400/60 hover:text-red-300 hover:bg-red-400/10 flex items-center justify-center"
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

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-3 legend-scroll">
              {entries.length === 0 ? (
                <div className="text-xs text-white/50">Нет событий</div>
              ) : (
                entries.map(({ entry, count }) => {
                  const meta = CATEGORY_META[entry.category];
                  return (
                    <div
                      key={entry.id}
                      className="relative flex flex-col gap-2 rounded-xl border bg-white/5 px-3 py-2"
                      style={{ borderColor: `${meta.color}55` }}
                    >
                      <div className="flex items-start gap-3">
                        <CategoryIcon category={entry.category} />
                        <div className="flex-1">
                        <div className="flex items-center gap-2 text-[11px] text-white/50">
                          <span className="text-white/70">
                            Ход {entry.turn}
                          </span>
                          <span className="text-white/40">•</span>
                          <span style={{ color: meta.color }}>{meta.label}</span>
                          {count > 1 && (
                            <>
                              <span className="text-white/40">•</span>
                              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] text-white/80">
                                x{count}
                              </span>
                            </>
                          )}
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
                      <div className="flex items-center justify-end gap-2">
                        {entry.countryId && (
                          <span className="relative group flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5">
                            {countries.find((c) => c.id === entry.countryId)
                              ?.flagDataUrl ? (
                              <img
                                src={
                                  countries.find((c) => c.id === entry.countryId)
                                    ?.flagDataUrl
                                }
                                alt=""
                                className="h-4 w-4 rounded-full object-cover"
                              />
                            ) : (
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    countries.find((c) => c.id === entry.countryId)
                                      ?.color ?? '#94a3b8',
                                }}
                              />
                            )}
                            <Tooltip
                              label={
                                countries.find((c) => c.id === entry.countryId)
                                  ?.name ?? 'Страна'
                              }
                            />
                          </span>
                        )}
                        <div className="relative group">
                          <PriorityIcon priority={entry.priority} />
                          <Tooltip
                            label={
                              entry.priority === 'high'
                                ? 'Высокая важность'
                                : entry.priority === 'medium'
                                  ? 'Средняя важность'
                                  : 'Низкая важность'
                            }
                          />
                        </div>
                        <div className="relative group">
                          <VisibilityIcon visibility={entry.visibility ?? 'public'} />
                          <Tooltip
                            label={
                              (entry.visibility ?? 'public') === 'private'
                                ? 'Только для нашей страны'
                                : 'Публичное сообщение'
                            }
                          />
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

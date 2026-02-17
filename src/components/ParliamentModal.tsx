import { useMemo, useState } from 'react';
import { ChevronDown, Landmark, Users, X } from 'lucide-react';
import Tooltip from './Tooltip';
import type { Country, ParliamentCountryState } from '../types';

type ParliamentModalProps = {
  open: boolean;
  onClose: () => void;
  activeCountryId?: string;
  countries: Country[];
  turn: number;
  recomputeInterval: number;
  parliament?: ParliamentCountryState;
};

const formatCompact = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${Math.round(value)}`;
};

const SeatDonutChart = ({
  entries,
  total,
}: {
  entries: { id: string; label: string; value: number; color: string }[];
  total: number;
}) => {
  const radius = 84;
  const strokeWidth = 28;
  const arcRadius = radius - strokeWidth / 2;
  const width = radius * 2;
  const height = radius + strokeWidth / 2 + 8;
  const centerY = radius;
  const pathLength = Math.PI * arcRadius;
  let offsetAccumulator = 0;
  const arcPath = `M ${strokeWidth / 2} ${centerY} A ${arcRadius} ${arcRadius} 0 0 1 ${
    width - strokeWidth / 2
  } ${centerY}`;
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <Tooltip
        label="Полукруговой график мест"
        description="Показывает долю мест каждой фракции в парламенте на дуге 180 градусов."
      >
        <div className="text-white/90 text-sm font-semibold mb-3">Места по фракциям</div>
      </Tooltip>
      <div className="flex flex-col xl:flex-row items-center gap-4">
        <svg width={width} height={height} className="shrink-0">
          <path
            d={arcPath}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="butt"
          />
          {entries.map((entry) => {
            const slice = total > 0 ? (entry.value / total) * pathLength : 0;
            const element = (
              <path
                key={`parliament-donut:${entry.id}`}
                d={arcPath}
                stroke={entry.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${slice} ${Math.max(0, pathLength - slice)}`}
                strokeDashoffset={-offsetAccumulator}
                strokeLinecap="butt"
                fill="none"
              />
            );
            offsetAccumulator += slice;
            return element;
          })}
        </svg>
        <div className="w-full space-y-2">
          {entries.map((entry) => {
            const share = total > 0 ? (entry.value / total) * 100 : 0;
            return (
              <div
                key={`parliament-donut-legend:${entry.id}`}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div className="inline-flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-white/75 truncate">{entry.label}</span>
                </div>
                <span className="text-white/85 whitespace-nowrap">
                  {entry.value} мест ({share.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function ParliamentModal({
  open,
  onClose,
  activeCountryId,
  countries,
  turn,
  recomputeInterval,
  parliament,
}: ParliamentModalProps) {
  const [tab, setTab] = useState<'main' | 'factions'>('main');
  const [openedExplainById, setOpenedExplainById] = useState<Record<string, boolean>>(
    {},
  );
  const country = useMemo(
    () => countries.find((item) => item.id === activeCountryId),
    [countries, activeCountryId],
  );
  const factions = useMemo(
    () => [...(parliament?.factions ?? [])].sort((a, b) => b.seats - a.seats),
    [parliament],
  );
  const maxSeats = Math.max(1, ...factions.map((item) => item.seats));
  const nextRecomputeTurn =
    parliament?.lastRecomputedTurn != null
      ? parliament.lastRecomputedTurn + recomputeInterval
      : turn;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-[#05070d]">
      <div className="h-full w-full border border-white/10 bg-[#0a111a] flex flex-col overflow-hidden">
        <div className="h-16 shrink-0 px-5 border-b border-white/10 flex items-center justify-between">
          <div className="inline-flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl border border-white/15 bg-black/30 inline-flex items-center justify-center">
              <Landmark className="w-5 h-5 text-emerald-300" />
            </span>
            <div className="min-w-0">
              <div className="text-white text-lg font-semibold truncate">Парламент</div>
              <div className="text-white/60 text-xs truncate">
                {country?.name ?? 'Страна не выбрана'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-white/15 bg-black/30 text-white/70 hover:text-white hover:border-emerald-300/60 hover:bg-emerald-500/15 transition-colors inline-flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex">
          <div className="w-[300px] border-r border-white/10 p-4 space-y-2">
            <button
              onClick={() => setTab('main')}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                tab === 'main'
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:border-emerald-400/30'
              }`}
            >
              Основная информация
            </button>
            <button
              onClick={() => setTab('factions')}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                tab === 'factions'
                  ? 'bg-sky-500/15 border-sky-400/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:border-sky-400/30'
              }`}
            >
              Фракции парламента
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto legend-scroll p-6 space-y-4">
            {tab === 'main' ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <Tooltip
                    label="Всего мест"
                    description="Общее количество мест в парламенте. Распределяется между фракциями по уровню поддержки."
                  >
                    <div className="text-white/65 text-xs mb-1">Всего мест</div>
                  </Tooltip>
                  <div className="text-white text-2xl font-semibold">
                    {parliament?.totalSeats ?? 0}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <Tooltip
                    label="Рабочая сила"
                    description="Число жителей, которые потенциально могут работать по настройке workingShare в POP bucket."
                  >
                    <div className="text-white/65 text-xs mb-1">Рабочая сила</div>
                  </Tooltip>
                  <div className="text-white text-2xl font-semibold">
                    {formatCompact(parliament?.laborSupply ?? 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <Tooltip
                    label="Безработица"
                    description="Текущая безработица по данным занятости населения. Влияет на политический баланс при пересчете."
                  >
                    <div className="text-white/65 text-xs mb-1">Безработные</div>
                  </Tooltip>
                  <div className="text-white text-2xl font-semibold">
                    {formatCompact(parliament?.unemployed ?? 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <Tooltip
                    label="Следующий пересчет"
                    description="Состав фракций пересчитывается периодически, а не каждый ход, чтобы не нагружать производительность."
                  >
                    <div className="text-white/65 text-xs mb-1">Следующий пересчет</div>
                  </Tooltip>
                  <div className="text-white text-2xl font-semibold">
                    Ход {nextRecomputeTurn}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="inline-flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-emerald-300" />
                  <Tooltip
                    label="Распределение фракций"
                    description="Поддержка рассчитывается на основе структуры занятости и безработицы, затем переводится в места."
                  >
                    <div className="text-white/90 text-sm font-semibold">
                      Распределение фракций
                    </div>
                  </Tooltip>
                </div>

                {factions.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-white/65 text-sm">
                    Недостаточно данных по населению для расчета парламента.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <SeatDonutChart
                      total={parliament?.totalSeats ?? 0}
                      entries={factions.map((faction) => ({
                        id: faction.id,
                        label: faction.name,
                        value: faction.seats,
                        color: faction.color,
                      }))}
                    />
                    {factions.map((faction) => (
                      <div
                        key={faction.id}
                        className="rounded-xl border border-white/10 bg-black/20 p-3"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="text-white/90 text-sm font-semibold truncate">
                              {faction.name}
                            </div>
                            <div className="text-white/55 text-[11px] truncate">
                              {faction.notes ?? 'Политический блок'}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-white text-sm font-semibold">
                              {faction.seats} мест
                            </div>
                            <div className="text-white/60 text-[11px]">
                              {(faction.support * 100).toFixed(1)}% поддержки
                            </div>
                          </div>
                        </div>
                        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(2, (faction.seats / maxSeats) * 100)}%`,
                              backgroundColor: faction.color,
                            }}
                          />
                        </div>
                        <div className="text-[11px] text-white/60 mt-1">
                          База поддержки: {formatCompact(faction.voters)} населения
                        </div>
                        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenedExplainById((prev) => ({
                                ...prev,
                                [faction.id]: !prev[faction.id],
                              }))
                            }
                            className="w-full flex items-center justify-between gap-2 text-left transition-colors"
                          >
                            <Tooltip
                              label="Почему столько мест"
                              description="Раскрывает факторы, которые повлияли на итоговую поддержку и число мест."
                            >
                              <span className="text-white/70 text-[12px] uppercase tracking-wide shrink-0">
                                Объяснение
                              </span>
                            </Tooltip>
                            <span className="ml-auto flex items-center justify-end gap-1.5 text-[12px]">
                              <span className="rounded-lg border border-white/15 bg-black/35 px-2 py-0.5 text-white/90 tabular-nums inline-flex items-center gap-1.5">
                                Вес {faction.score != null ? faction.score.toFixed(3) : '0.000'}
                              </span>
                              <ChevronDown
                                className={
                                  openedExplainById[faction.id]
                                    ? 'w-4 h-4 text-white/70 transition-transform duration-300 rotate-180 shrink-0'
                                    : 'w-4 h-4 text-white/70 transition-transform duration-300 shrink-0'
                                }
                              />
                            </span>
                          </button>
                          <div
                            className={`grid transition-all duration-300 ease-out ${
                              openedExplainById[faction.id]
                                ? 'grid-rows-[1fr] opacity-100 mt-2'
                                : 'grid-rows-[0fr] opacity-0 mt-0'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="rounded-lg border border-white/10 bg-black/25 p-2">
                                <div className="text-[12px] text-white/65 mb-1">
                                Технические детали расчета:
                                </div>
                                <div className="space-y-1">
                                  {(faction.explanation ?? []).map((line, index) => (
                                    <div
                                      key={`faction-expl:${faction.id}:${index}`}
                                      className="text-[12px] text-white/80"
                                    >
                                      - {line}
                                    </div>
                                  ))}
                                  {faction.score != null && (
                                    <div className="text-[12px] text-emerald-200/90">
                                      Нормализованная поддержка: {(faction.support * 100).toFixed(2)}%
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

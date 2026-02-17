import { useMemo, useState } from 'react';
import { PieChart, Users, X } from 'lucide-react';
import Tooltip from './Tooltip';
import type {
  Country,
  PopulationByProvinceId,
  PopulationEmploymentSector,
  ProvinceRecord,
  Trait,
} from '../types';

type PopulationModalProps = {
  open: boolean;
  onClose: () => void;
  activeCountryId?: string;
  countries: Country[];
  provinces: ProvinceRecord;
  cultures: Trait[];
  religions: Trait[];
  populationByProvinceId: PopulationByProvinceId;
};

type PopulationTab = 'main' | 'employment';

type ChartEntry = {
  id: string;
  label: string;
  value: number;
  color: string;
};

const sectorLabelById: Record<PopulationEmploymentSector, string> = {
  industry: 'Индустрия',
  agri: 'Аграрный',
  services: 'Услуги',
  state: 'Госсектор',
};

const sectorColorById: Record<PopulationEmploymentSector, string> = {
  industry: '#38bdf8',
  agri: '#22c55e',
  services: '#f59e0b',
  state: '#a78bfa',
};

const formatCompact = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}b`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${Math.round(value)}`;
};

const BigBarChart = ({
  title,
  tooltip,
  entries,
}: {
  title: string;
  tooltip: string;
  entries: ChartEntry[];
}) => {
  const maxValue = Math.max(1, ...entries.map((entry) => entry.value));
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <Tooltip label={title} description={tooltip} side="bottom">
        <div className="text-white/90 text-sm font-semibold mb-3">{title}</div>
      </Tooltip>
      <div className="space-y-2 max-h-[320px] overflow-y-auto legend-scroll pr-1">
        {entries.map((entry) => (
          <div key={`population-chart:${title}:${entry.id}`} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-white/75 truncate">{entry.label}</span>
              <span className="text-white/85">{formatCompact(entry.value)}</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, (entry.value / maxValue) * 100)}%`,
                  backgroundColor: entry.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DonutChart = ({
  title,
  tooltip,
  entries,
}: {
  title: string;
  tooltip: string;
  entries: ChartEntry[];
}) => {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const radius = 64;
  const strokeWidth = 24;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  let offsetAccumulator = 0;
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <Tooltip label={title} description={tooltip} side="bottom">
        <div className="text-white/90 text-sm font-semibold mb-3">{title}</div>
      </Tooltip>
      <div className="flex flex-col items-center gap-3">
        <svg width={radius * 2} height={radius * 2} className="-rotate-90">
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {entries.map((entry) => {
            const slice = total > 0 ? (entry.value / total) * circumference : 0;
            const element = (
              <circle
                key={`donut:${title}:${entry.id}`}
                cx={radius}
                cy={radius}
                r={normalizedRadius}
                stroke={entry.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${slice} ${Math.max(0, circumference - slice)}`}
                strokeDashoffset={-offsetAccumulator}
                strokeLinecap="butt"
                fill="transparent"
              />
            );
            offsetAccumulator += slice;
            return element;
          })}
        </svg>
        <div className="text-white/85 text-lg font-semibold">{formatCompact(total)}</div>
        <div className="w-full space-y-1.5">
          {entries.map((entry) => {
            const share = total > 0 ? (entry.value / total) * 100 : 0;
            return (
              <div
                key={`donut-legend:${title}:${entry.id}`}
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
                  {formatCompact(entry.value)} ({share.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function PopulationModal({
  open,
  onClose,
  activeCountryId,
  countries,
  provinces,
  cultures,
  religions,
  populationByProvinceId,
}: PopulationModalProps) {
  const [tab, setTab] = useState<PopulationTab>('main');
  const countryName =
    countries.find((country) => country.id === activeCountryId)?.name ?? 'Все страны';
  const cultureById = useMemo(
    () => new Map(cultures.map((item) => [item.id, item])),
    [cultures],
  );
  const religionById = useMemo(
    () => new Map(religions.map((item) => [item.id, item])),
    [religions],
  );

  const visibleProvinceIds = useMemo(
    () =>
      Object.values(provinces)
        .filter((province) =>
          activeCountryId
            ? province.ownerCountryId === activeCountryId
            : Boolean(province.ownerCountryId),
        )
        .map((province) => province.id),
    [provinces, activeCountryId],
  );

  const stats = useMemo(() => {
    const cultureTotals = new Map<string, number>();
    const religionTotals = new Map<string, number>();
    const provinceTotals: Array<{ provinceId: string; total: number }> = [];
    const bucketRows: Array<{
      provinceId: string;
      cultureName: string;
      religionName: string;
      maleCount: number;
      femaleCount: number;
      total: number;
    }> = [];
    const provinceEmploymentRows: Array<{
      provinceId: string;
      supply: number;
      employed: number;
      unemployed: number;
      demand: number;
      assigned: number;
      coverage: number;
    }> = [];
    const sectorTotals: Record<PopulationEmploymentSector, number> = {
      industry: 0,
      agri: 0,
      services: 0,
      state: 0,
    };
    let total = 0;
    let male = 0;
    let female = 0;
    let bucketCount = 0;
    let laborSupply = 0;
    let laborEmployed = 0;
    let laborUnemployed = 0;
    let laborDemand = 0;
    let laborAssigned = 0;

    visibleProvinceIds.forEach((provinceId) => {
      const buckets = populationByProvinceId[provinceId] ?? [];
      const built = provinces[provinceId]?.buildingsBuilt ?? [];
      let provinceTotal = 0;
      let provinceSupply = 0;
      let provinceEmployed = 0;
      let provinceUnemployed = 0;
      buckets.forEach((bucket) => {
        const maleCount = Math.max(0, Math.floor(bucket.maleCount || 0));
        const femaleCount = Math.max(0, Math.floor(bucket.femaleCount || 0));
        const bucketTotal = maleCount + femaleCount;
        if (bucketTotal <= 0) return;
        bucketCount += 1;
        total += bucketTotal;
        male += maleCount;
        female += femaleCount;
        provinceTotal += bucketTotal;
        const cultureName = cultureById.get(bucket.cultureId ?? '')?.name ?? 'Без культуры';
        const religionName = religionById.get(bucket.religionId ?? '')?.name ?? 'Без религии';
        cultureTotals.set(cultureName, (cultureTotals.get(cultureName) ?? 0) + bucketTotal);
        religionTotals.set(religionName, (religionTotals.get(religionName) ?? 0) + bucketTotal);
        bucketRows.push({
          provinceId,
          cultureName,
          religionName,
          maleCount,
          femaleCount,
          total: bucketTotal,
        });
        const bucketEmployed = Math.max(0, Math.floor(bucket.employed ?? 0));
        const bucketUnemployed = Math.max(0, Math.floor(bucket.unemployed ?? 0));
        const bucketSupply = bucketEmployed + bucketUnemployed;
        provinceSupply += bucketSupply;
        provinceEmployed += bucketEmployed;
        provinceUnemployed += bucketUnemployed;
        laborSupply += bucketSupply;
        laborEmployed += bucketEmployed;
        laborUnemployed += bucketUnemployed;
        (Object.keys(sectorTotals) as PopulationEmploymentSector[]).forEach((sector) => {
          const sectorAmount = Math.max(
            0,
            Math.floor(bucket.employmentBySector?.[sector] ?? 0),
          );
          sectorTotals[sector] += sectorAmount;
        });
      });
      if (provinceTotal > 0) {
        provinceTotals.push({ provinceId, total: provinceTotal });
      }
      const demand = built.reduce(
        (sum, entry) => sum + Math.max(0, Math.floor(entry.lastLaborDemand ?? 0)),
        0,
      );
      const assigned = built.reduce(
        (sum, entry) => sum + Math.max(0, Math.floor(entry.lastLaborAssigned ?? 0)),
        0,
      );
      laborDemand += demand;
      laborAssigned += assigned;
      if (provinceSupply > 0 || demand > 0) {
        provinceEmploymentRows.push({
          provinceId,
          supply: provinceSupply,
          employed: provinceEmployed,
          unemployed: provinceUnemployed,
          demand,
          assigned,
          coverage: demand > 0 ? Math.min(1, assigned / demand) : 1,
        });
      }
    });

    provinceTotals.sort((a, b) => b.total - a.total);
    provinceEmploymentRows.sort((a, b) => b.supply - a.supply);
    bucketRows.sort((a, b) => b.total - a.total);
    return {
      total,
      male,
      female,
      bucketCount,
      provinceCount: provinceTotals.length,
      topProvinces: provinceTotals.slice(0, 12),
      topCultures: Array.from(cultureTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12),
      topReligions: Array.from(religionTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12),
      bucketRows: bucketRows.slice(0, 150),
      laborSupply,
      laborEmployed,
      laborUnemployed,
      laborDemand,
      laborAssigned,
      unemploymentRate: laborSupply > 0 ? laborUnemployed / laborSupply : 0,
      laborCoverageRate: laborDemand > 0 ? Math.min(1, laborAssigned / laborDemand) : 1,
      sectorTotals,
      provinceEmploymentRows: provinceEmploymentRows.slice(0, 150),
    };
  }, [visibleProvinceIds, populationByProvinceId, provinces, cultureById, religionById]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-sm">
      <div className="w-full h-full border border-white/10 bg-[#0a111a] flex flex-col overflow-hidden">
        <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl border border-white/10 bg-black/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-white text-lg font-semibold">Население</div>
              <div className="text-white/55 text-xs">{countryName}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/70 flex items-center justify-center hover:border-emerald-400/40"
          >
            <X className="w-4 h-4" />
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
              onClick={() => setTab('employment')}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                tab === 'employment'
                  ? 'bg-sky-500/15 border-sky-400/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:border-sky-400/30'
              }`}
            >
              Занятость населения
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto legend-scroll p-6 space-y-4">
            {tab === 'main' ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                    <Tooltip
                      label="Всего населения"
                      description="Сумма всех мужчин и женщин во всех bucket выбранной страны."
                      side="bottom"
                    >
                      <div className="text-emerald-100/80 text-xs">Всего населения</div>
                    </Tooltip>
                    <div className="text-2xl font-semibold text-emerald-200 mt-1">
                      {formatCompact(stats.total)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-3">
                    <Tooltip
                      label="Мужчины"
                      description="Суммарное мужское население во всех bucket."
                      side="bottom"
                    >
                      <div className="text-sky-100/80 text-xs">Мужчины</div>
                    </Tooltip>
                    <div className="text-2xl font-semibold text-sky-200 mt-1">
                      {formatCompact(stats.male)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-pink-400/30 bg-pink-500/10 p-3">
                    <Tooltip
                      label="Женщины"
                      description="Суммарное женское население во всех bucket."
                      side="bottom"
                    >
                      <div className="text-pink-100/80 text-xs">Женщины</div>
                    </Tooltip>
                    <div className="text-2xl font-semibold text-pink-200 mt-1">
                      {formatCompact(stats.female)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                    <Tooltip
                      label="Buckets / провинции"
                      description="Buckets показывают группы по культуре+религии внутри провинций после авто-объединения."
                      side="bottom"
                    >
                      <div className="text-amber-100/80 text-xs">Buckets / провинции</div>
                    </Tooltip>
                    <div className="text-2xl font-semibold text-amber-200 mt-1">
                      {stats.bucketCount} / {stats.provinceCount}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <BigBarChart
                    title="Культуры"
                    tooltip="Распределение населения по культурам (абсолютные значения)."
                    entries={stats.topCultures.map(([name, value]) => ({
                      id: name,
                      label: name,
                      value,
                      color: '#34d399',
                    }))}
                  />
                  <BigBarChart
                    title="Религии"
                    tooltip="Распределение населения по религиям (абсолютные значения)."
                    entries={stats.topReligions.map(([name, value]) => ({
                      id: name,
                      label: name,
                      value,
                      color: '#60a5fa',
                    }))}
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <DonutChart
                    title="Гендер"
                    tooltip="Круговая доля мужского и женского населения."
                    entries={[
                      { id: 'male', label: 'Мужчины', value: stats.male, color: '#38bdf8' },
                      { id: 'female', label: 'Женщины', value: stats.female, color: '#f472b6' },
                    ]}
                  />
                  <DonutChart
                    title="Культуры"
                    tooltip="Доли крупнейших культур (топ-6) в населении."
                    entries={stats.topCultures.slice(0, 6).map(([name, value], index) => ({
                      id: name,
                      label: name,
                      value,
                      color:
                        ['#34d399', '#60a5fa', '#f59e0b', '#f472b6', '#a78bfa', '#f87171'][index] ??
                        '#94a3b8',
                    }))}
                  />
                  <DonutChart
                    title="Религии"
                    tooltip="Доли крупнейших религий (топ-6) в населении."
                    entries={stats.topReligions.slice(0, 6).map(([name, value], index) => ({
                      id: name,
                      label: name,
                      value,
                      color:
                        ['#22d3ee', '#818cf8', '#eab308', '#fb7185', '#4ade80', '#f97316'][index] ??
                        '#94a3b8',
                    }))}
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <BigBarChart
                    title="Топ провинций по населению"
                    tooltip="Провинции с наибольшим количеством жителей."
                    entries={stats.topProvinces.map((entry) => ({
                      id: entry.provinceId,
                      label: entry.provinceId,
                      value: entry.total,
                      color: '#22c55e',
                    }))}
                  />
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4 min-h-[340px]">
                    <Tooltip
                      label="Группы населения"
                      description="Таблица bucket: провинция, культура, религия и распределение по полу."
                      side="bottom"
                    >
                      <div className="text-white/90 text-sm font-semibold mb-3">Группы населения</div>
                    </Tooltip>
                    <div className="overflow-auto max-h-[300px]">
                      <table className="w-full text-xs border-separate border-spacing-y-1">
                        <thead>
                          <tr className="text-white/55">
                            <th className="text-left font-medium py-1 pr-2">Провинция</th>
                            <th className="text-left font-medium py-1 pr-2">Культура</th>
                            <th className="text-left font-medium py-1 pr-2">Религия</th>
                            <th className="text-right font-medium py-1 pr-2">М</th>
                            <th className="text-right font-medium py-1 pr-2">Ж</th>
                            <th className="text-right font-medium py-1">Всего</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.bucketRows.map((row, index) => (
                            <tr
                              key={`population-row:${row.provinceId}:${row.cultureName}:${row.religionName}:${index}`}
                              className="bg-white/[0.03] text-white/80"
                            >
                              <td className="py-1.5 pr-2 rounded-l-md">{row.provinceId}</td>
                              <td className="py-1.5 pr-2">{row.cultureName}</td>
                              <td className="py-1.5 pr-2">{row.religionName}</td>
                              <td className="py-1.5 pr-2 text-right text-sky-200">
                                {formatCompact(row.maleCount)}
                              </td>
                              <td className="py-1.5 pr-2 text-right text-pink-200">
                                {formatCompact(row.femaleCount)}
                              </td>
                              <td className="py-1.5 text-right rounded-r-md text-emerald-200">
                                {formatCompact(row.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                    <Tooltip
                      label="Рабочая сила"
                      description="Сумма рабочей силы всех bucket (workingShare * население)."
                      side="bottom"
                    >
                      <div className="text-emerald-100/80 text-xs">Рабочая сила</div>
                    </Tooltip>
                    <div className="text-2xl font-semibold text-emerald-200 mt-1">
                      {formatCompact(stats.laborSupply)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-3">
                    <Tooltip
                      label="Занято"
                      description="Число занятых работников в bucket."
                      side="bottom"
                    >
                      <div className="text-sky-100/80 text-xs">Занято</div>
                    </Tooltip>
                    <div className="text-2xl font-semibold text-sky-200 mt-1">
                      {formatCompact(stats.laborEmployed)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-pink-400/30 bg-pink-500/10 p-3">
                    <Tooltip
                      label="Безработные"
                      description="Рабочая сила, не распределенная в занятость."
                      side="bottom"
                    >
                      <div className="text-pink-100/80 text-xs">Безработные</div>
                    </Tooltip>
                    <div className="text-2xl font-semibold text-pink-200 mt-1">
                      {formatCompact(stats.laborUnemployed)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                    <Tooltip
                      label="Спрос зданий"
                      description="Сколько работников в сумме потребовали здания (laborDemand)."
                      side="bottom"
                    >
                      <div className="text-amber-100/80 text-xs">Спрос зданий</div>
                    </Tooltip>
                    <div className="text-2xl font-semibold text-amber-200 mt-1">
                      {formatCompact(stats.laborDemand)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-3">
                    <Tooltip
                      label="Покрытие спроса"
                      description="Доля обеспеченных рабочих мест от спроса зданий."
                      side="bottom"
                    >
                      <div className="text-violet-100/80 text-xs">Покрытие спроса</div>
                    </Tooltip>
                    <div className="text-2xl font-semibold text-violet-200 mt-1">
                      {(stats.laborCoverageRate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <BigBarChart
                    title="Провинции по рабочей силе"
                    tooltip="Провинции с наибольшей рабочей силой."
                    entries={stats.provinceEmploymentRows.slice(0, 12).map((row) => ({
                      id: row.provinceId,
                      label: row.provinceId,
                      value: row.supply,
                      color: '#34d399',
                    }))}
                  />
                  <DonutChart
                    title="Занятость по секторам"
                    tooltip="Распределение занятых работников по секторам."
                    entries={(Object.keys(stats.sectorTotals) as PopulationEmploymentSector[])
                      .map((sector) => ({
                        id: sector,
                        label: sectorLabelById[sector],
                        value: Math.max(0, stats.sectorTotals[sector] ?? 0),
                        color: sectorColorById[sector],
                      }))
                      .filter((entry) => entry.value > 0)}
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <DonutChart
                    title="Структура занятости"
                    tooltip="Доли занятых и безработных от всей рабочей силы."
                    entries={[
                      {
                        id: 'employed',
                        label: 'Занятые',
                        value: stats.laborEmployed,
                        color: '#38bdf8',
                      },
                      {
                        id: 'unemployed',
                        label: 'Безработные',
                        value: stats.laborUnemployed,
                        color: '#f472b6',
                      },
                    ]}
                  />
                  <DonutChart
                    title="Спрос vs Покрытие"
                    tooltip="Доли покрытого и непокрытого спроса зданий на рабочую силу."
                    entries={[
                      {
                        id: 'covered',
                        label: 'Покрытый спрос',
                        value: stats.laborAssigned,
                        color: '#34d399',
                      },
                      {
                        id: 'uncovered',
                        label: 'Непокрытый спрос',
                        value: Math.max(0, stats.laborDemand - stats.laborAssigned),
                        color: '#f59e0b',
                      },
                    ]}
                  />
                  <BigBarChart
                    title="Сектора по числу занятых"
                    tooltip="Абсолютные значения занятости в секторах."
                    entries={(Object.keys(stats.sectorTotals) as PopulationEmploymentSector[])
                      .map((sector) => ({
                        id: sector,
                        label: sectorLabelById[sector],
                        value: Math.max(0, stats.sectorTotals[sector] ?? 0),
                        color: sectorColorById[sector],
                      }))
                      .filter((entry) => entry.value > 0)}
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <BigBarChart
                    title="Провинции по покрытию спроса"
                    tooltip="Провинции с лучшим покрытием спроса на рабочую силу."
                    entries={stats.provinceEmploymentRows.slice(0, 12).map((row) => ({
                      id: row.provinceId,
                      label: row.provinceId,
                      value: row.coverage * 100,
                      color: '#a78bfa',
                    }))}
                  />
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <Tooltip
                      label="Занятость по провинциям"
                      description="Рабочая сила, занятые/безработные, спрос и покрытие спроса по каждой провинции."
                      side="bottom"
                    >
                      <div className="text-white/90 text-sm font-semibold mb-3 inline-flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-sky-300" />
                        Занятость по провинциям
                      </div>
                    </Tooltip>
                    <div className="overflow-auto max-h-[460px]">
                      <table className="w-full text-xs border-separate border-spacing-y-1">
                        <thead>
                          <tr className="text-white/55">
                            <th className="text-left font-medium py-1 pr-2">Провинция</th>
                            <th className="text-right font-medium py-1 pr-2">Раб.сила</th>
                            <th className="text-right font-medium py-1 pr-2">Занято</th>
                            <th className="text-right font-medium py-1 pr-2">Безраб.</th>
                            <th className="text-right font-medium py-1 pr-2">Спрос</th>
                            <th className="text-right font-medium py-1">Покрытие</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.provinceEmploymentRows.map((row) => (
                            <tr
                              key={`employment-row:${row.provinceId}`}
                              className="bg-white/[0.03] text-white/80"
                            >
                              <td className="py-1.5 pr-2 rounded-l-md">{row.provinceId}</td>
                              <td className="py-1.5 pr-2 text-right text-cyan-200">
                                {formatCompact(row.supply)}
                              </td>
                              <td className="py-1.5 pr-2 text-right text-emerald-200">
                                {formatCompact(row.employed)}
                              </td>
                              <td className="py-1.5 pr-2 text-right text-rose-200">
                                {formatCompact(row.unemployed)}
                              </td>
                              <td className="py-1.5 pr-2 text-right text-amber-200">
                                {formatCompact(row.demand)}
                              </td>
                              <td className="py-1.5 text-right rounded-r-md text-indigo-200">
                                {(row.coverage * 100).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

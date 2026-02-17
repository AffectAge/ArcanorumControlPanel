import { useMemo, useState } from 'react';
import { Coins, Wallet, X } from 'lucide-react';
import Tooltip from './Tooltip';
import type {
  BuildingDefinition,
  Country,
  GameSettings,
  Industry,
  ProvinceRecord,
} from '../types';

type BudgetModalProps = {
  open: boolean;
  onClose: () => void;
  activeCountryId?: string;
  countries: Country[];
  provinces: ProvinceRecord;
  buildings: BuildingDefinition[];
  industries: Industry[];
  gameSettings: GameSettings;
};

type BudgetTab = 'main' | 'details';
type BudgetChartMetric = 'count' | 'revenue' | 'expense' | 'net';
type SortDirection = 'asc' | 'desc';
type ProvinceSortKey = 'provinceId' | 'count' | 'revenue' | 'expense' | 'net';
type BuildingSortKey = 'name' | 'count' | 'revenue' | 'expense' | 'net';
type IndustrySortKey = 'name' | 'count' | 'revenue' | 'expense' | 'net';
type NetFilter = 'all' | 'profit' | 'loss';
type ChartEntry = { id: string; label: string; value: number; color: string };

const formatCompact = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${Math.round(value)}`;
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
  const radius = 58;
  const strokeWidth = 20;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  let offsetAccumulator = 0;
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3 h-full">
      <Tooltip label={title} description={tooltip} side="bottom">
        <div className="text-white/90 text-xs font-semibold mb-2">{title}</div>
      </Tooltip>
      <div className="flex flex-col items-center gap-2">
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
                key={`budget-donut:${title}:${entry.id}`}
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
        <div className="text-white/80 text-sm font-semibold">{formatCompact(total)}</div>
        <div className="w-full space-y-1">
          {entries.map((entry) => {
            const share = total > 0 ? (entry.value / total) * 100 : 0;
            return (
              <div
                key={`budget-donut-legend:${title}:${entry.id}`}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <div className="inline-flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-white/70 truncate">{entry.label}</span>
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

export default function BudgetModal({
  open,
  onClose,
  activeCountryId,
  countries,
  provinces,
  buildings,
  industries,
  gameSettings,
}: BudgetModalProps) {
  const [tab, setTab] = useState<BudgetTab>('main');
  const [provinceChartMetric, setProvinceChartMetric] = useState<BudgetChartMetric>('net');
  const [buildingChartMetric, setBuildingChartMetric] = useState<BudgetChartMetric>('net');
  const [industryChartMetric, setIndustryChartMetric] = useState<BudgetChartMetric>('net');
  const [provinceNetFilter, setProvinceNetFilter] = useState<NetFilter>('all');
  const [buildingNetFilter, setBuildingNetFilter] = useState<NetFilter>('all');
  const [industryNetFilter, setIndustryNetFilter] = useState<NetFilter>('all');
  const [provinceQuery, setProvinceQuery] = useState('');
  const [buildingQuery, setBuildingQuery] = useState('');
  const [industryQuery, setIndustryQuery] = useState('');
  const [provinceSortKey, setProvinceSortKey] = useState<ProvinceSortKey>('net');
  const [buildingSortKey, setBuildingSortKey] = useState<BuildingSortKey>('net');
  const [industrySortKey, setIndustrySortKey] = useState<IndustrySortKey>('net');
  const [provinceSortDirection, setProvinceSortDirection] = useState<SortDirection>('desc');
  const [buildingSortDirection, setBuildingSortDirection] = useState<SortDirection>('desc');
  const [industrySortDirection, setIndustrySortDirection] = useState<SortDirection>('desc');
  const activeCountry = useMemo(
    () => countries.find((item) => item.id === activeCountryId),
    [countries, activeCountryId],
  );
  const buildingNameById = useMemo(
    () => new Map(buildings.map((item) => [item.id, item.name])),
    [buildings],
  );
  const buildingById = useMemo(
    () => new Map(buildings.map((item) => [item.id, item])),
    [buildings],
  );
  const industryById = useMemo(
    () => new Map(industries.map((item) => [item.id, item])),
    [industries],
  );

  const budget = useMemo(() => {
    const fixedIncome = Math.max(0, gameSettings.ducatsPerTurn ?? 0);
    let salesIncome = 0;
    let purchaseExpense = 0;
    const byProvince = new Map<string, { count: number; revenue: number; expense: number }>();
    const byBuilding = new Map<
      string,
      { name: string; count: number; revenue: number; expense: number }
    >();
    const byIndustry = new Map<
      string,
      { name: string; count: number; revenue: number; expense: number }
    >();

    Object.values(provinces).forEach((province) => {
      (province.buildingsBuilt ?? []).forEach((entry) => {
        if (entry.owner?.type !== 'state') return;
        if (entry.owner.countryId !== activeCountryId) return;
        const revenue = Math.max(0, entry.lastSalesRevenueDucats ?? 0);
        const expense = Math.max(0, entry.lastPurchaseCostDucats ?? 0);
        salesIncome += revenue;
        purchaseExpense += expense;
        const provinceRow = byProvince.get(province.id) ?? { count: 0, revenue: 0, expense: 0 };
        provinceRow.count += 1;
        provinceRow.revenue += revenue;
        provinceRow.expense += expense;
        byProvince.set(province.id, provinceRow);
        const buildingRow = byBuilding.get(entry.buildingId) ?? {
          name: buildingNameById.get(entry.buildingId) ?? entry.buildingId,
          count: 0,
          revenue: 0,
          expense: 0,
        };
        buildingRow.count += 1;
        buildingRow.revenue += revenue;
        buildingRow.expense += expense;
        byBuilding.set(entry.buildingId, buildingRow);

        const buildingDefinition = buildingById.get(entry.buildingId);
        const industryId = buildingDefinition?.industryId ?? '__none__';
        const industryRow = byIndustry.get(industryId) ?? {
          name:
            industryId === '__none__'
              ? 'Без отрасли'
              : industryById.get(industryId)?.name ?? industryId,
          count: 0,
          revenue: 0,
          expense: 0,
        };
        industryRow.count += 1;
        industryRow.revenue += revenue;
        industryRow.expense += expense;
        byIndustry.set(industryId, industryRow);
      });
    });

    return {
      fixedIncome,
      salesIncome,
      purchaseExpense,
      totalIncome: fixedIncome + salesIncome,
      totalExpense: purchaseExpense,
      net: fixedIncome + salesIncome - purchaseExpense,
      byProvince: Array.from(byProvince.entries())
        .map(([provinceId, values]) => ({
          provinceId,
          ...values,
          net: values.revenue - values.expense,
        }))
        .sort((a, b) => b.net - a.net),
      byBuilding: Array.from(byBuilding.entries())
        .map(([buildingId, values]) => ({
          buildingId,
          ...values,
          net: values.revenue - values.expense,
        }))
        .sort((a, b) => b.net - a.net),
      byIndustry: Array.from(byIndustry.entries())
        .map(([industryId, values]) => ({
          industryId,
          ...values,
          net: values.revenue - values.expense,
        }))
        .sort((a, b) => b.net - a.net),
    };
  }, [
    provinces,
    activeCountryId,
    gameSettings.ducatsPerTurn,
    buildingNameById,
    buildingById,
    industryById,
  ]);

  const getChartMetricLabel = (metric: BudgetChartMetric) => {
    if (metric === 'count') return 'Кол-во';
    if (metric === 'revenue') return 'Доход';
    if (metric === 'expense') return 'Расход';
    return 'Сальдо';
  };
  const getChartMetricTooltip = (metric: BudgetChartMetric) => {
    if (metric === 'count') {
      return 'Диаграмма показывает долю по количеству госзданий.';
    }
    if (metric === 'revenue') {
      return 'Диаграмма показывает долю по доходу.';
    }
    if (metric === 'expense') {
      return 'Диаграмма показывает долю по расходу.';
    }
    return 'Диаграмма показывает долю по модулю сальдо (|доход - расход|).';
  };

  const provinceRows = useMemo(() => {
    const text = provinceQuery.trim().toLowerCase();
    return budget.byProvince
      .filter((row) =>
        provinceNetFilter === 'all'
          ? true
          : provinceNetFilter === 'profit'
            ? row.net > 0
            : row.net < 0,
      )
      .filter((row) => (text ? row.provinceId.toLowerCase().includes(text) : true))
      .sort((a, b) => {
        const direction = provinceSortDirection === 'asc' ? 1 : -1;
        if (provinceSortKey === 'provinceId') {
          return a.provinceId.localeCompare(b.provinceId) * direction;
        }
        return (a[provinceSortKey] - b[provinceSortKey]) * direction;
      });
  }, [
    budget.byProvince,
    provinceNetFilter,
    provinceQuery,
    provinceSortDirection,
    provinceSortKey,
  ]);

  const buildingRows = useMemo(() => {
    const text = buildingQuery.trim().toLowerCase();
    return budget.byBuilding
      .filter((row) =>
        buildingNetFilter === 'all'
          ? true
          : buildingNetFilter === 'profit'
            ? row.net > 0
            : row.net < 0,
      )
      .filter((row) => (text ? row.name.toLowerCase().includes(text) : true))
      .sort((a, b) => {
        const direction = buildingSortDirection === 'asc' ? 1 : -1;
        if (buildingSortKey === 'name') {
          return a.name.localeCompare(b.name) * direction;
        }
        return (a[buildingSortKey] - b[buildingSortKey]) * direction;
      });
  }, [
    budget.byBuilding,
    buildingNetFilter,
    buildingQuery,
    buildingSortDirection,
    buildingSortKey,
  ]);

  const industryRows = useMemo(() => {
    const text = industryQuery.trim().toLowerCase();
    return budget.byIndustry
      .filter((row) =>
        industryNetFilter === 'all'
          ? true
          : industryNetFilter === 'profit'
            ? row.net > 0
            : row.net < 0,
      )
      .filter((row) => (text ? row.name.toLowerCase().includes(text) : true))
      .sort((a, b) => {
        const direction = industrySortDirection === 'asc' ? 1 : -1;
        if (industrySortKey === 'name') {
          return a.name.localeCompare(b.name) * direction;
        }
        return (a[industrySortKey] - b[industrySortKey]) * direction;
      });
  }, [
    budget.byIndustry,
    industryNetFilter,
    industryQuery,
    industrySortDirection,
    industrySortKey,
  ]);

  const provinceChartEntries = useMemo(
    () =>
      provinceRows
        .slice(0, 6)
        .map((row, index) => ({
          id: row.provinceId,
          label: row.provinceId,
          value:
            provinceChartMetric === 'count'
              ? row.count
              : provinceChartMetric === 'revenue'
                ? row.revenue
                : provinceChartMetric === 'expense'
                  ? row.expense
                  : Math.abs(row.net),
          color:
            ['#34d399', '#60a5fa', '#f59e0b', '#f472b6', '#a78bfa', '#f87171'][index] ??
            '#94a3b8',
        }))
        .filter((entry) => entry.value > 0),
    [provinceRows, provinceChartMetric],
  );
  const buildingChartEntries = useMemo(
    () =>
      buildingRows
        .slice(0, 6)
        .map((row, index) => ({
          id: row.buildingId,
          label: row.name,
          value:
            buildingChartMetric === 'count'
              ? row.count
              : buildingChartMetric === 'revenue'
                ? row.revenue
                : buildingChartMetric === 'expense'
                  ? row.expense
                  : Math.abs(row.net),
          color:
            ['#22c55e', '#38bdf8', '#f59e0b', '#a78bfa', '#fb7185', '#14b8a6'][index] ??
            '#94a3b8',
        }))
        .filter((entry) => entry.value > 0),
    [buildingRows, buildingChartMetric],
  );
  const industryChartEntries = useMemo(
    () =>
      industryRows
        .slice(0, 6)
        .map((row, index) => ({
          id: row.industryId,
          label: row.name,
          value:
            industryChartMetric === 'count'
              ? row.count
              : industryChartMetric === 'revenue'
                ? row.revenue
                : industryChartMetric === 'expense'
                  ? row.expense
                  : Math.abs(row.net),
          color:
            ['#818cf8', '#34d399', '#f59e0b', '#fb7185', '#22d3ee', '#eab308'][index] ??
            '#94a3b8',
        }))
        .filter((entry) => entry.value > 0),
    [industryRows, industryChartMetric],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-[#05070d]">
      <div className="w-full h-full border border-white/10 bg-[#0a111a] flex flex-col overflow-hidden">
        <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl border border-white/10 bg-black/30 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-white text-lg font-semibold">Бюджет</div>
              <div className="text-white/55 text-xs">
                {activeCountry?.name ?? 'Страна не выбрана'}
              </div>
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
              onClick={() => setTab('details')}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                tab === 'details'
                  ? 'bg-sky-500/15 border-sky-400/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:border-sky-400/30'
              }`}
            >
              Детализация
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto legend-scroll p-6 space-y-4">
            {tab === 'main' ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                  <Tooltip label="Казна" description="Текущий запас дукат государства.">
                    <div className="text-emerald-100/80 text-xs">Казна</div>
                  </Tooltip>
                  <div className="text-2xl font-semibold text-emerald-200 mt-1">
                    {formatCompact(activeCountry?.ducats ?? 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-3">
                  <Tooltip
                    label="Доходы за ход"
                    description="Фиксированный доход + выручка государственных зданий."
                  >
                    <div className="text-sky-100/80 text-xs">Доходы за ход</div>
                  </Tooltip>
                  <div className="text-2xl font-semibold text-sky-200 mt-1">
                    {formatCompact(budget.totalIncome)}
                  </div>
                </div>
                <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3">
                  <Tooltip
                    label="Расходы за ход"
                    description="Закупки ресурсов государственными зданиями."
                  >
                    <div className="text-rose-100/80 text-xs">Расходы за ход</div>
                  </Tooltip>
                  <div className="text-2xl font-semibold text-rose-200 mt-1">
                    {formatCompact(budget.totalExpense)}
                  </div>
                </div>
                <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                  <Tooltip
                    label="Сальдо за ход"
                    description="Доходы минус расходы по дукатам."
                  >
                    <div className="text-amber-100/80 text-xs">Сальдо за ход</div>
                  </Tooltip>
                  <div className="text-2xl font-semibold text-amber-200 mt-1">
                    {formatCompact(budget.net)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4 h-[520px]">
                    {provinceChartEntries.length > 0 ? (
                      <DonutChart
                        title={`Доли провинций: ${getChartMetricLabel(provinceChartMetric)}`}
                        tooltip={getChartMetricTooltip(provinceChartMetric)}
                        entries={provinceChartEntries}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-white/60 text-sm">
                        Нет данных для графика.
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-4 h-[520px]">
                    {buildingChartEntries.length > 0 ? (
                      <DonutChart
                        title={`Доли типов зданий: ${getChartMetricLabel(buildingChartMetric)}`}
                        tooltip={getChartMetricTooltip(buildingChartMetric)}
                        entries={buildingChartEntries}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-white/60 text-sm">
                        Нет данных для графика.
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-4 h-[520px]">
                    {industryChartEntries.length > 0 ? (
                      <DonutChart
                        title={`Доли отраслей: ${getChartMetricLabel(industryChartMetric)}`}
                        tooltip={getChartMetricTooltip(industryChartMetric)}
                        entries={industryChartEntries}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-white/60 text-sm">
                        Нет данных для графика.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 h-[520px] flex flex-col">
                  <div className="inline-flex items-center gap-2 mb-3">
                    <Coins className="w-4 h-4 text-emerald-300" />
                    <Tooltip
                      label="По провинциям"
                      description="Финансовый вклад провинций по государственным зданиям."
                    >
                      <div className="text-white/90 text-sm font-semibold">По провинциям</div>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
                    <input
                      value={provinceQuery}
                      onChange={(event) => setProvinceQuery(event.target.value)}
                      placeholder="Фильтр провинции"
                      className="col-span-2 xl:col-span-1 h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    />
                    <select
                      value={provinceChartMetric}
                      onChange={(event) =>
                        setProvinceChartMetric(event.target.value as BudgetChartMetric)
                      }
                      className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="count" className="bg-[#0b111b] text-white">
                        Кол-во
                      </option>
                      <option value="revenue" className="bg-[#0b111b] text-white">
                        Доход
                      </option>
                      <option value="expense" className="bg-[#0b111b] text-white">
                        Расход
                      </option>
                      <option value="net" className="bg-[#0b111b] text-white">
                        Сальдо
                      </option>
                    </select>
                    <select
                      value={provinceNetFilter}
                      onChange={(event) => setProvinceNetFilter(event.target.value as NetFilter)}
                      className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="all" className="bg-[#0b111b] text-white">
                        Все
                      </option>
                      <option value="profit" className="bg-[#0b111b] text-white">
                        Только прибыль
                      </option>
                      <option value="loss" className="bg-[#0b111b] text-white">
                        Только убыток
                      </option>
                    </select>
                    <select
                      value={provinceSortKey}
                      onChange={(event) => setProvinceSortKey(event.target.value as ProvinceSortKey)}
                      className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="provinceId" className="bg-[#0b111b] text-white">
                        Сорт: Провинция
                      </option>
                      <option value="count" className="bg-[#0b111b] text-white">
                        Сорт: Кол-во
                      </option>
                      <option value="revenue" className="bg-[#0b111b] text-white">
                        Сорт: Доход
                      </option>
                      <option value="expense" className="bg-[#0b111b] text-white">
                        Сорт: Расход
                      </option>
                      <option value="net" className="bg-[#0b111b] text-white">
                        Сорт: Сальдо
                      </option>
                    </select>
                    <select
                      value={provinceSortDirection}
                      onChange={(event) =>
                        setProvinceSortDirection(event.target.value as SortDirection)
                      }
                      className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="desc" className="bg-[#0b111b] text-white">
                        По убыванию
                      </option>
                      <option value="asc" className="bg-[#0b111b] text-white">
                        По возрастанию
                      </option>
                    </select>
                  </div>
                  <div className="overflow-auto flex-1 min-h-0">
                    <table className="w-full text-xs border-separate border-spacing-y-1">
                      <thead>
                        <tr className="text-white/55">
                          <th className="text-left font-medium py-1 pr-2">Провинция</th>
                          <th className="text-right font-medium py-1 pr-2">Кол-во</th>
                          <th className="text-right font-medium py-1 pr-2">Доход</th>
                          <th className="text-right font-medium py-1 pr-2">Расход</th>
                          <th className="text-right font-medium py-1">Сальдо</th>
                        </tr>
                      </thead>
                      <tbody>
                        {provinceRows.map((row) => (
                          <tr
                            key={`budget-province:${row.provinceId}`}
                            className="bg-white/[0.03] rounded"
                          >
                            <td className="py-1 px-2 text-white/80">{row.provinceId}</td>
                            <td className="py-1 px-2 text-right text-white/75">
                              {row.count}
                            </td>
                            <td className="py-1 px-2 text-right text-emerald-200">
                              {formatCompact(row.revenue)}
                            </td>
                            <td className="py-1 px-2 text-right text-rose-200">
                              {formatCompact(row.expense)}
                            </td>
                            <td className="py-1 px-2 text-right text-amber-200">
                              {formatCompact(row.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/30 p-4 h-[520px] flex flex-col">
                  <div className="inline-flex items-center gap-2 mb-3">
                    <Coins className="w-4 h-4 text-sky-300" />
                    <Tooltip
                      label="По типам зданий"
                      description="Финансовый вклад разных типов государственных зданий."
                    >
                      <div className="text-white/90 text-sm font-semibold">По типам зданий</div>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
                    <input
                      value={buildingQuery}
                      onChange={(event) => setBuildingQuery(event.target.value)}
                      placeholder="Фильтр здания"
                      className="col-span-2 xl:col-span-1 h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    />
                    <select
                      value={buildingChartMetric}
                      onChange={(event) =>
                        setBuildingChartMetric(event.target.value as BudgetChartMetric)
                      }
                      className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="count" className="bg-[#0b111b] text-white">
                        Кол-во
                      </option>
                      <option value="revenue" className="bg-[#0b111b] text-white">
                        Доход
                      </option>
                      <option value="expense" className="bg-[#0b111b] text-white">
                        Расход
                      </option>
                      <option value="net" className="bg-[#0b111b] text-white">
                        Сальдо
                      </option>
                    </select>
                    <select
                      value={buildingNetFilter}
                      onChange={(event) => setBuildingNetFilter(event.target.value as NetFilter)}
                      className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="all" className="bg-[#0b111b] text-white">
                        Все
                      </option>
                      <option value="profit" className="bg-[#0b111b] text-white">
                        Только прибыль
                      </option>
                      <option value="loss" className="bg-[#0b111b] text-white">
                        Только убыток
                      </option>
                    </select>
                    <select
                      value={buildingSortKey}
                      onChange={(event) => setBuildingSortKey(event.target.value as BuildingSortKey)}
                      className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="name" className="bg-[#0b111b] text-white">
                        Сорт: Здание
                      </option>
                      <option value="count" className="bg-[#0b111b] text-white">
                        Сорт: Кол-во
                      </option>
                      <option value="revenue" className="bg-[#0b111b] text-white">
                        Сорт: Доход
                      </option>
                      <option value="expense" className="bg-[#0b111b] text-white">
                        Сорт: Расход
                      </option>
                      <option value="net" className="bg-[#0b111b] text-white">
                        Сорт: Сальдо
                      </option>
                    </select>
                    <select
                      value={buildingSortDirection}
                      onChange={(event) =>
                        setBuildingSortDirection(event.target.value as SortDirection)
                      }
                      className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="desc" className="bg-[#0b111b] text-white">
                        По убыванию
                      </option>
                      <option value="asc" className="bg-[#0b111b] text-white">
                        По возрастанию
                      </option>
                    </select>
                  </div>
                  <div className="overflow-auto flex-1 min-h-0">
                    <table className="w-full text-xs border-separate border-spacing-y-1">
                      <thead>
                        <tr className="text-white/55">
                          <th className="text-left font-medium py-1 pr-2">Здание</th>
                          <th className="text-right font-medium py-1 pr-2">Кол-во</th>
                          <th className="text-right font-medium py-1 pr-2">Доход</th>
                          <th className="text-right font-medium py-1 pr-2">Расход</th>
                          <th className="text-right font-medium py-1">Сальдо</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buildingRows.map((row) => (
                          <tr
                            key={`budget-building:${row.buildingId}`}
                            className="bg-white/[0.03] rounded"
                          >
                            <td className="py-1 px-2 text-white/80">{row.name}</td>
                            <td className="py-1 px-2 text-right text-white/75">
                              {row.count}
                            </td>
                            <td className="py-1 px-2 text-right text-emerald-200">
                              {formatCompact(row.revenue)}
                            </td>
                            <td className="py-1 px-2 text-right text-rose-200">
                              {formatCompact(row.expense)}
                            </td>
                            <td className="py-1 px-2 text-right text-amber-200">
                              {formatCompact(row.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/30 p-4 h-[520px] flex flex-col">
                  <div className="inline-flex items-center gap-2 mb-3">
                    <Coins className="w-4 h-4 text-violet-300" />
                    <Tooltip
                      label="По отраслям"
                      description="Финансовый вклад отраслей по государственным зданиям."
                    >
                      <div className="text-white/90 text-sm font-semibold">По отраслям</div>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
                    <input
                      value={industryQuery}
                      onChange={(event) => setIndustryQuery(event.target.value)}
                      placeholder="Фильтр отрасли"
                      className="col-span-2 xl:col-span-1 h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    />
                    <select
                      value={industryChartMetric}
                      onChange={(event) =>
                        setIndustryChartMetric(event.target.value as BudgetChartMetric)
                      }
                      className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="count" className="bg-[#0b111b] text-white">
                        Кол-во
                      </option>
                      <option value="revenue" className="bg-[#0b111b] text-white">
                        Доход
                      </option>
                      <option value="expense" className="bg-[#0b111b] text-white">
                        Расход
                      </option>
                      <option value="net" className="bg-[#0b111b] text-white">
                        Сальдо
                      </option>
                    </select>
                    <select
                      value={industryNetFilter}
                      onChange={(event) => setIndustryNetFilter(event.target.value as NetFilter)}
                      className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="all" className="bg-[#0b111b] text-white">
                        Все
                      </option>
                      <option value="profit" className="bg-[#0b111b] text-white">
                        Только прибыль
                      </option>
                      <option value="loss" className="bg-[#0b111b] text-white">
                        Только убыток
                      </option>
                    </select>
                    <select
                      value={industrySortKey}
                      onChange={(event) => setIndustrySortKey(event.target.value as IndustrySortKey)}
                      className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="name" className="bg-[#0b111b] text-white">
                        Сорт: Отрасль
                      </option>
                      <option value="count" className="bg-[#0b111b] text-white">
                        Сорт: Кол-во
                      </option>
                      <option value="revenue" className="bg-[#0b111b] text-white">
                        Сорт: Доход
                      </option>
                      <option value="expense" className="bg-[#0b111b] text-white">
                        Сорт: Расход
                      </option>
                      <option value="net" className="bg-[#0b111b] text-white">
                        Сорт: Сальдо
                      </option>
                    </select>
                    <select
                      value={industrySortDirection}
                      onChange={(event) =>
                        setIndustrySortDirection(event.target.value as SortDirection)
                      }
                      className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="desc" className="bg-[#0b111b] text-white">
                        По убыванию
                      </option>
                      <option value="asc" className="bg-[#0b111b] text-white">
                        По возрастанию
                      </option>
                    </select>
                  </div>
                  <div className="overflow-auto flex-1 min-h-0">
                    <table className="w-full text-xs border-separate border-spacing-y-1">
                      <thead>
                        <tr className="text-white/55">
                          <th className="text-left font-medium py-1 pr-2">Отрасль</th>
                          <th className="text-right font-medium py-1 pr-2">Кол-во</th>
                          <th className="text-right font-medium py-1 pr-2">Доход</th>
                          <th className="text-right font-medium py-1 pr-2">Расход</th>
                          <th className="text-right font-medium py-1">Сальдо</th>
                        </tr>
                      </thead>
                      <tbody>
                        {industryRows.map((row) => (
                          <tr
                            key={`budget-industry:${row.industryId}`}
                            className="bg-white/[0.03] rounded"
                          >
                            <td className="py-1 px-2 text-white/80">{row.name}</td>
                            <td className="py-1 px-2 text-right text-white/75">
                              {row.count}
                            </td>
                            <td className="py-1 px-2 text-right text-emerald-200">
                              {formatCompact(row.revenue)}
                            </td>
                            <td className="py-1 px-2 text-right text-rose-200">
                              {formatCompact(row.expense)}
                            </td>
                            <td className="py-1 px-2 text-right text-amber-200">
                              {formatCompact(row.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Globe2,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BuildingDefinition,
  Country,
  DiplomacyProposal,
  Market,
  ProvinceRecord,
  Trait,
} from '../types';
import Tooltip from './Tooltip';

type MarketsModalProps = {
  open: boolean;
  countries: Country[];
  markets: Market[];
  provinces: ProvinceRecord;
  resources: Trait[];
  buildings: BuildingDefinition[];
  proposals: DiplomacyProposal[];
  activeCountryId?: string;
  onClose: () => void;
  onCreateMarket: (payload: {
    actorCountryId?: string;
    name: string;
    leaderCountryId: string;
    memberCountryIds: string[];
    color?: string;
    logoDataUrl?: string;
    capitalProvinceId?: string;
    allowInfrastructureAccessWithoutTreaties?: boolean;
  }) => void;
  onUpdateMarket: (
    marketId: string,
    patch: {
      actorCountryId?: string;
      name?: string;
      leaderCountryId?: string;
      memberCountryIds?: string[];
      color?: string;
      logoDataUrl?: string;
      capitalProvinceId?: string;
      allowInfrastructureAccessWithoutTreaties?: boolean;
    },
  ) => void;
  onDeleteMarket: (marketId: string, actorCountryId?: string) => void;
  onLeaveMarket: (countryId?: string, marketId?: string) => void;
  onTradeWithWarehouse: (payload: {
    marketId: string;
    actorCountryId?: string;
    resourceId: string;
    amount: number;
    action: 'buy' | 'sell';
  }) => void;
  onInviteByTreaty: (targetCountryId: string) => void;
};

type MarketsTab = 'market' | 'goods';

const PRICE_TREND_EPSILON = 0.0001;
const GRAPH_WIDTH = 84;
const GRAPH_HEIGHT = 24;

const formatCompactNumber = (value: number, smallDigits = 1) => {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const trim = (input: string) =>
    input.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  if (abs >= 1_000_000_000) return `${sign}${trim((abs / 1_000_000_000).toFixed(2))}b`;
  if (abs >= 1_000_000) return `${sign}${trim((abs / 1_000_000).toFixed(2))}m`;
  if (abs >= 1_000) return `${sign}${trim((abs / 1_000).toFixed(2))}k`;
  if (Number.isInteger(value)) return `${value}`;
  return trim(value.toFixed(smallDigits));
};

const getSparklinePath = (values: number[], width = GRAPH_WIDTH, height = GRAPH_HEIGHT) => {
  if (values.length === 0) return '';
  if (values.length === 1) {
    const y = height / 2;
    return `M 0 ${y} L ${width} ${y}`;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const step = width / Math.max(1, values.length - 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const normalizedY = range <= PRICE_TREND_EPSILON ? 0.5 : (value - min) / range;
      const y = height - normalizedY * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
};

const MiniGraphCard = ({
  title,
  value,
  valueClassName,
  borderClassName,
  bgClassName,
  values,
  stroke,
  ariaLabel,
  tooltip,
}: {
  title: string;
  value: string;
  valueClassName: string;
  borderClassName: string;
  bgClassName: string;
  values: number[];
  stroke: string;
  ariaLabel: string;
  tooltip: string;
}) => (
  <Tooltip label={title} description={tooltip}>
    <div
      className={`relative min-h-[86px] rounded-md border px-2 py-1.5 min-w-[116px] flex flex-col justify-between ${borderClassName} ${bgClassName}`}
    >
      <div className="text-[10px] text-white/80 leading-none mb-1">{title}</div>
      <div className="inline-flex items-center justify-between gap-2 w-full">
        <span className={`text-xs tabular-nums ${valueClassName}`}>{value}</span>
        <svg
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          className="h-6 w-[84px]"
          aria-label={ariaLabel}
        >
          <path
            d={getSparklinePath(values, GRAPH_WIDTH, GRAPH_HEIGHT)}
            fill="none"
            stroke={stroke}
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  </Tooltip>
);

const ShareDonut = ({
  label,
  value,
  pathColor,
  amount,
  amountLabel,
  secondaryAmountLabel,
  secondaryAmount,
  description,
}: {
  label: string;
  value: number;
  pathColor: string;
  amount: number;
  amountLabel: string;
  secondaryAmountLabel: string;
  secondaryAmount: number;
  description: string;
}) => {
  const normalized = Math.max(0, Math.min(100, value));
  const pieBackground = `conic-gradient(${pathColor} 0% ${normalized}%, rgba(255,255,255,0.08) ${normalized}% 100%)`;
  return (
    <Tooltip
      label={label}
      description={`${description} ${amountLabel}: ${formatCompactNumber(amount, 0)} | ${secondaryAmountLabel}: ${formatCompactNumber(secondaryAmount, 0)} (${normalized.toFixed(1)}%)`}
    >
      <div className="group relative inline-flex flex-col items-center gap-1 min-w-[116px] rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
        <div className="relative h-8 w-[84px] transition-transform duration-150 group-hover:scale-105">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-[30px] w-[30px]">
              <div
                className="absolute inset-0 rounded-full border border-white/20 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]"
                style={{ background: pieBackground }}
              />
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_48%)]" />
              <div className="absolute inset-[5px] rounded-full border border-white/15 bg-[#09101a]/95" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[8px] font-medium text-white/90 tabular-nums">
                  {normalized.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
        <span className="text-[10px] text-white/60 leading-none">{label}</span>
        <span className="text-[10px] text-white/85 tabular-nums leading-none">
          {amountLabel}: {formatCompactNumber(amount, 0)}
        </span>
        <span className="text-[9px] text-white/50 tabular-nums leading-none">
          {secondaryAmountLabel}: {formatCompactNumber(secondaryAmount, 0)}
        </span>
      </div>
    </Tooltip>
  );
};

export default function MarketsModal({
  open,
  countries,
  markets,
  provinces,
  resources,
  buildings,
  proposals,
  activeCountryId,
  onClose,
  onCreateMarket,
  onUpdateMarket,
  onDeleteMarket,
  onLeaveMarket,
  onTradeWithWarehouse: _onTradeWithWarehouse,
  onInviteByTreaty,
}: MarketsModalProps) {
  const [tab, setTab] = useState<MarketsTab>('market');
  const [newMarketName, setNewMarketName] = useState('');
  const [marketNameDraft, setMarketNameDraft] = useState('');
  const [capitalProvinceIdDraft, setCapitalProvinceIdDraft] = useState('');
  const [marketColorDraft, setMarketColorDraft] = useState('#22c55e');
  const [marketLogoDraft, setMarketLogoDraft] = useState<string | undefined>(undefined);
  const [allowInfrastructureAccessWithoutTreatiesDraft, setAllowInfrastructureAccessWithoutTreatiesDraft] =
    useState(false);

  const activeCountry = countries.find((country) => country.id === activeCountryId);
  const memberMarket = activeCountryId
    ? markets.find((market) => market.memberCountryIds.includes(activeCountryId))
    : undefined;
  const ownMarket =
    memberMarket?.leaderCountryId === activeCountryId ? memberMarket : undefined;
  const canEditOwnMarket = Boolean(
    ownMarket && activeCountryId && ownMarket.creatorCountryId === activeCountryId,
  );

  const ownCountryProvinceIds = useMemo(() => {
    if (!activeCountryId) return [] as string[];
    return Object.values(provinces)
      .filter((province) => province.ownerCountryId === activeCountryId)
      .map((province) => province.id)
      .sort((a, b) => a.localeCompare(b));
  }, [provinces, activeCountryId]);

  useEffect(() => {
    if (!open) return;
    setTab('market');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (ownMarket) {
      setMarketNameDraft(ownMarket.name);
      setCapitalProvinceIdDraft(ownMarket.capitalProvinceId ?? '');
      setMarketColorDraft(ownMarket.color ?? '#22c55e');
      setMarketLogoDraft(ownMarket.logoDataUrl);
      setAllowInfrastructureAccessWithoutTreatiesDraft(
        Boolean(ownMarket.allowInfrastructureAccessWithoutTreaties),
      );
      return;
    }
    if (!newMarketName && activeCountry) {
      setNewMarketName(`Рынок ${activeCountry.name}`);
    }
    setCapitalProvinceIdDraft((prev) => prev || ownCountryProvinceIds[0] || '');
    setMarketColorDraft((prev) => prev || activeCountry?.color || '#22c55e');
    setAllowInfrastructureAccessWithoutTreatiesDraft(false);
  }, [open, ownMarket, activeCountry, newMarketName, ownCountryProvinceIds]);

  const assignedMarketByCountry = useMemo(() => {
    const map = new Map<string, string>();
    markets.forEach((market) => {
      market.memberCountryIds.forEach((countryId) => {
        map.set(countryId, market.id);
      });
    });
    return map;
  }, [markets]);

  const pendingInviteCountryIds = useMemo(() => {
    if (!activeCountryId) return new Set<string>();
    const result = new Set<string>();
    proposals.forEach((proposal) => {
      const agreement = proposal.agreement;
      const category = agreement.agreementCategory ?? 'construction';
      if (category !== 'market_invite' && category !== 'market') return;
      if (proposal.fromCountryId !== activeCountryId) return;
      if (agreement.marketLeaderCountryId !== activeCountryId) return;
      result.add(proposal.toCountryId);
    });
    return result;
  }, [proposals, activeCountryId]);

  const inviteCandidates = useMemo(() => {
    if (!activeCountryId || !ownMarket) return [];
    const ownMembers = new Set(ownMarket.memberCountryIds);
    return countries.filter((country) => {
      if (country.id === activeCountryId) return false;
      if (ownMembers.has(country.id)) return false;
      const assignedMarketId = assignedMarketByCountry.get(country.id);
      return !assignedMarketId;
    });
  }, [countries, activeCountryId, ownMarket, assignedMarketByCountry]);

  const canCreateMarket = Boolean(
    activeCountryId &&
      !memberMarket &&
      ownCountryProvinceIds.length > 0 &&
      capitalProvinceIdDraft &&
      capitalProvinceIdDraft.length > 0,
  );

  const handleLogoUpload = (file: File | undefined) => {
    if (!file) {
      setMarketLogoDraft(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setMarketLogoDraft(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  const goodsStats = useMemo(() => {
    const memberSet = new Set(memberMarket?.memberCountryIds ?? []);
    const worldDeposits = new Map<string, number>();
    const worldMarketVolume = new Map<string, number>();
    const marketBuildingVolume = new Map<string, number>();
    const depositSupply = new Map<string, number>();
    const marketDemand = new Map<string, number>();
    const marketProductionMax = new Map<string, number>();
    const marketProductionFact = new Map<string, number>();
    const supplierCountries = new Map<string, Set<string>>();
    const warehouse = memberMarket?.warehouseByResourceId ?? {};
    const definitionById = new Map(buildings.map((building) => [building.id, building]));

    Object.values(provinces).forEach((province) => {
      const owner = province.ownerCountryId;
      Object.entries(province.resourceAmounts ?? {}).forEach(([resourceId, amount]) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        worldDeposits.set(resourceId, (worldDeposits.get(resourceId) ?? 0) + amount);
        if (!memberMarket || !owner || !memberSet.has(owner)) return;
        depositSupply.set(resourceId, (depositSupply.get(resourceId) ?? 0) + amount);
        const suppliers = supplierCountries.get(resourceId) ?? new Set<string>();
        suppliers.add(owner);
        supplierCountries.set(resourceId, suppliers);
      });
      if (!memberMarket || !owner || !memberSet.has(owner)) return;
      (province.buildingsBuilt ?? []).forEach((entry) => {
        Object.entries(entry.warehouseByResourceId ?? {}).forEach(([resourceId, amount]) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          marketBuildingVolume.set(
            resourceId,
            (marketBuildingVolume.get(resourceId) ?? 0) + amount,
          );
        });
        const inactiveByProductivity =
          Number.isFinite(entry.lastProductivity) &&
          Number(entry.lastProductivity) <= 0;
        if (inactiveByProductivity) {
          return;
        }
        const definition = definitionById.get(entry.buildingId);
        Object.entries(definition?.consumptionByResourceId ?? {}).forEach(
          ([resourceId, amount]) => {
            if (!Number.isFinite(amount) || amount <= 0) return;
            marketDemand.set(resourceId, (marketDemand.get(resourceId) ?? 0) + amount);
          },
        );
        Object.entries(definition?.extractionByResourceId ?? {}).forEach(
          ([resourceId, amount]) => {
            if (!Number.isFinite(amount) || amount <= 0) return;
            marketProductionMax.set(
              resourceId,
              (marketProductionMax.get(resourceId) ?? 0) + amount,
            );
          },
        );
        Object.entries(definition?.productionByResourceId ?? {}).forEach(
          ([resourceId, amount]) => {
            if (!Number.isFinite(amount) || amount <= 0) return;
            marketProductionMax.set(
              resourceId,
              (marketProductionMax.get(resourceId) ?? 0) + amount,
            );
          },
        );
        Object.entries(entry.lastExtractedByResourceId ?? {}).forEach(([resourceId, amount]) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          marketProductionFact.set(
            resourceId,
            (marketProductionFact.get(resourceId) ?? 0) + amount,
          );
        });
        Object.entries(entry.lastProducedByResourceId ?? {}).forEach(([resourceId, amount]) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          marketProductionFact.set(
            resourceId,
            (marketProductionFact.get(resourceId) ?? 0) + amount,
          );
        });
      });
    });

    Object.values(provinces).forEach((province) => {
      (province.buildingsBuilt ?? []).forEach((entry) => {
        Object.entries(entry.warehouseByResourceId ?? {}).forEach(([resourceId, amount]) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          worldMarketVolume.set(
            resourceId,
            (worldMarketVolume.get(resourceId) ?? 0) + amount,
          );
        });
      });
    });

    const rows = resources.map((resource, index) => {
      const deposits = depositSupply.get(resource.id) ?? 0;
      const worldDepositsAmount = worldDeposits.get(resource.id) ?? 0;
      const worldMarketAmount = worldMarketVolume.get(resource.id) ?? 0;
      const demand = marketDemand.get(resource.id) ?? 0;
      const supplyMax = marketProductionMax.get(resource.id) ?? 0;
      const supplyFact = marketProductionFact.get(resource.id) ?? 0;
      const totalMarketStock = Math.max(0, marketBuildingVolume.get(resource.id) ?? 0);
      const marketOffer = supplyFact + totalMarketStock;
      const marketPrice = Math.max(
        0.01,
        Number(
          memberMarket?.priceByResourceId?.[resource.id] ??
            resource.basePrice ??
            1,
        ) || 1,
      );
      const historyRaw = (memberMarket?.priceHistoryByResourceId?.[resource.id] ?? []).filter(
        (item) => Number.isFinite(item) && Number(item) > 0,
      ) as number[];
      const marketPriceHistory =
        historyRaw.length > 0
          ? [...historyRaw.slice(-10)]
          : [marketPrice];
      if (
        marketPriceHistory.length === 0 ||
        Math.abs(marketPriceHistory[marketPriceHistory.length - 1] - marketPrice) >
          PRICE_TREND_EPSILON
      ) {
        marketPriceHistory.push(marketPrice);
      }
      const normalizedPriceHistory = marketPriceHistory.slice(-10);
      const demandHistoryRaw = (
        memberMarket?.demandHistoryByResourceId?.[resource.id] ?? []
      ).filter((item) => Number.isFinite(item) && Number(item) >= 0) as number[];
      const marketDemandHistory =
        demandHistoryRaw.length > 0 ? [...demandHistoryRaw.slice(-10)] : [demand];
      if (
        marketDemandHistory.length === 0 ||
        Math.abs(marketDemandHistory[marketDemandHistory.length - 1] - demand) >
          PRICE_TREND_EPSILON
      ) {
        marketDemandHistory.push(demand);
      }
      const normalizedDemandHistory = marketDemandHistory.slice(-10);
      const offerHistoryRaw = (
        memberMarket?.offerHistoryByResourceId?.[resource.id] ?? []
      ).filter((item) => Number.isFinite(item) && Number(item) >= 0) as number[];
      const marketOfferHistory =
        offerHistoryRaw.length > 0 ? [...offerHistoryRaw.slice(-10)] : [marketOffer];
      if (
        marketOfferHistory.length === 0 ||
        Math.abs(marketOfferHistory[marketOfferHistory.length - 1] - marketOffer) >
          PRICE_TREND_EPSILON
      ) {
        marketOfferHistory.push(marketOffer);
      }
      const normalizedOfferHistory = marketOfferHistory.slice(-10);
      const productionFactHistoryRaw = (
        memberMarket?.productionFactHistoryByResourceId?.[resource.id] ?? []
      ).filter((item) => Number.isFinite(item) && Number(item) >= 0) as number[];
      const marketProductionFactHistory =
        productionFactHistoryRaw.length > 0
          ? [...productionFactHistoryRaw.slice(-10)]
          : [supplyFact];
      if (
        marketProductionFactHistory.length === 0 ||
        Math.abs(marketProductionFactHistory[marketProductionFactHistory.length - 1] - supplyFact) >
          PRICE_TREND_EPSILON
      ) {
        marketProductionFactHistory.push(supplyFact);
      }
      const normalizedProductionFactHistory = marketProductionFactHistory.slice(-10);
      const productionMaxHistoryRaw = (
        memberMarket?.productionMaxHistoryByResourceId?.[resource.id] ?? []
      ).filter((item) => Number.isFinite(item) && Number(item) >= 0) as number[];
      const marketProductionMaxHistory =
        productionMaxHistoryRaw.length > 0 ? [...productionMaxHistoryRaw.slice(-10)] : [supplyMax];
      if (
        marketProductionMaxHistory.length === 0 ||
        Math.abs(marketProductionMaxHistory[marketProductionMaxHistory.length - 1] - supplyMax) >
          PRICE_TREND_EPSILON
      ) {
        marketProductionMaxHistory.push(supplyMax);
      }
      const normalizedProductionMaxHistory = marketProductionMaxHistory.slice(-10);
      const previousPrice =
        normalizedPriceHistory.length > 1
          ? normalizedPriceHistory[normalizedPriceHistory.length - 2]
          : normalizedPriceHistory[normalizedPriceHistory.length - 1];
      const delta = marketPrice - previousPrice;
      const priceTrend =
        delta > PRICE_TREND_EPSILON
          ? 'up'
          : delta < -PRICE_TREND_EPSILON
            ? 'down'
            : 'flat';
      const marketShare = worldMarketAmount > 0 ? (totalMarketStock / worldMarketAmount) * 100 : 0;
      const depositShare =
        worldDepositsAmount > 0 ? (deposits / worldDepositsAmount) * 100 : 0;
      return {
        index: index + 1,
        resourceId: resource.id,
        resourceName: resource.name,
        resourceColor: resource.color,
        resourceIconDataUrl: resource.iconDataUrl,
        marketPrice,
        marketPriceHistory: normalizedPriceHistory,
        priceTrend,
        marketValue: totalMarketStock * marketPrice,
        depositValue: deposits * marketPrice,
        marketDemand: demand,
        marketProductionFact: supplyFact,
        marketProductionMax: supplyMax,
        marketProductionFactHistory: normalizedProductionFactHistory,
        marketProductionMaxHistory: normalizedProductionMaxHistory,
        marketOffer,
        marketDemandHistory: normalizedDemandHistory,
        marketOfferHistory: normalizedOfferHistory,
        marketSupply: totalMarketStock,
        depositSupply: deposits,
        worldMarketSupply: worldMarketAmount,
        worldDeposits: worldDepositsAmount,
        depositShare,
        marketShare,
      };
    });

    const maxWorldDeposits = Math.max(1, ...rows.map((row) => row.worldDeposits));
    const maxWorldMarketSupply = Math.max(1, ...rows.map((row) => row.worldMarketSupply));
    const normalizedRows = rows.map((row) => ({
      ...row,
      worldDepositsRelative: (row.worldDeposits / maxWorldDeposits) * 100,
      worldMarketSupplyRelative: (row.worldMarketSupply / maxWorldMarketSupply) * 100,
    }));

    const warehouseTotal = Object.values(warehouse).reduce(
      (acc, value) => acc + (Number.isFinite(value) ? Math.max(0, value) : 0),
      0,
    );

    return { rows: normalizedRows, warehouseTotal };
  }, [memberMarket, provinces, resources, buildings]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-4 rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-white/10 bg-black/40 flex items-center justify-center">
              <Globe2 className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <div className="text-white text-lg font-semibold">Рынки</div>
              <div className="text-white/60 text-sm">
                Управление только своим рынком
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
          <div className="w-[360px] border-r border-white/10 p-4 space-y-2">
            <button
              onClick={() => setTab('market')}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                tab === 'market'
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:border-emerald-400/30'
              }`}
            >
              Мой рынок
            </button>
            <button
              onClick={() => setTab('goods')}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                tab === 'goods'
                  ? 'bg-sky-500/15 border-sky-400/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:border-sky-400/30'
              }`}
            >
              Товары и торговля
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto legend-scroll p-6">
            {tab === 'market' ? (
              <div className="max-w-4xl space-y-4">
                {!activeCountryId ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/60 text-sm">
                    Выберите активную страну.
                  </div>
                ) : !memberMarket ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <div className="text-white/85 text-sm font-semibold">Создание рынка</div>
                    <label className="flex flex-col gap-1 text-white/70 text-sm">
                      Название
                      <input
                        type="text"
                        value={newMarketName}
                        onChange={(event) => setNewMarketName(event.target.value)}
                        className="h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-emerald-400/60"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-white/70 text-sm">
                      Столица рынка
                      <select
                        value={capitalProvinceIdDraft}
                        onChange={(event) => setCapitalProvinceIdDraft(event.target.value)}
                        className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60"
                      >
                        <option value="" className="bg-[#0b111b] text-white">
                          Выберите провинцию
                        </option>
                        {ownCountryProvinceIds.map((provinceId) => (
                          <option
                            key={`market-capital-new:${provinceId}`}
                            value={provinceId}
                            className="bg-[#0b111b] text-white"
                          >
                            {provinceId}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-white/70 text-sm">
                      Цвет рынка
                      <input
                        type="color"
                        value={marketColorDraft}
                        onChange={(event) => setMarketColorDraft(event.target.value)}
                        className="h-9 rounded-lg bg-black/40 border border-white/10 p-1"
                      />
                    </label>
                    <div className="flex flex-col gap-1 text-white/70 text-sm">
                      <span>Логотип рынка</span>
                      <div className="rounded-lg border border-white/10 bg-black/30 p-2 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center">
                          {marketLogoDraft ? (
                            <img src={marketLogoDraft} alt="Логотип рынка" className="w-full h-full object-cover" />
                          ) : (
                            <Globe2 className="w-5 h-5 text-white/40" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="h-8 px-3 rounded-lg border border-white/15 bg-black/40 text-white/80 text-xs inline-flex items-center cursor-pointer hover:border-emerald-400/40 hover:text-emerald-200 transition-colors">
                            {marketLogoDraft ? 'Заменить' : 'Выбрать'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                              className="hidden"
                            />
                          </label>
                          {marketLogoDraft && (
                            <button
                              type="button"
                              onClick={() => setMarketLogoDraft(undefined)}
                              className="h-8 px-3 rounded-lg border border-rose-400/35 bg-rose-500/10 text-rose-200 text-xs inline-flex items-center hover:bg-rose-500/20 transition-colors"
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-white/45">
                        PNG/JPG/WebP. Лучше использовать квадратное изображение.
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-white/75 text-sm">
                      <input
                        type="checkbox"
                        checked={allowInfrastructureAccessWithoutTreatiesDraft}
                        onChange={(event) =>
                          setAllowInfrastructureAccessWithoutTreatiesDraft(
                            event.target.checked,
                          )
                        }
                        className="h-4 w-4 rounded border-white/20 bg-black/40 accent-emerald-500"
                      />
                      Общая инфраструктура рынка без договоров
                    </label>
                    <div className="text-[11px] text-white/50 leading-relaxed">
                      Если включено, маршруты всех стран-участников рынка считаются общей
                      инфраструктурой для доступа к столице рынка по категориям. Сами маршруты
                      остаются независимыми и не объединяются в один маршрут.
                    </div>
                    {ownCountryProvinceIds.length === 0 && (
                      <div className="text-rose-200/90 text-xs">
                        У страны нет провинций для столицы рынка.
                      </div>
                    )}
                    <button
                      onClick={() =>
                        onCreateMarket({
                          actorCountryId: activeCountryId,
                          name: newMarketName.trim() || `Рынок ${activeCountry?.name ?? ''}`,
                          leaderCountryId: activeCountryId,
                          memberCountryIds: [activeCountryId],
                          color: marketColorDraft,
                          logoDataUrl: marketLogoDraft,
                          capitalProvinceId: capitalProvinceIdDraft || undefined,
                          allowInfrastructureAccessWithoutTreaties:
                            allowInfrastructureAccessWithoutTreatiesDraft,
                        })
                      }
                      disabled={!canCreateMarket}
                      className={`h-9 px-3 rounded-lg border text-sm inline-flex items-center gap-2 ${
                        canCreateMarket
                          ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                          : 'border-white/10 bg-black/30 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Создать рынок
                    </button>
                  </div>
                ) : !ownMarket ? (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 space-y-3">
                    <div className="text-white/85 text-sm font-semibold">Участие в рынке</div>
                    <div className="text-white/70 text-sm">
                      Страна состоит в рынке: <span className="text-amber-200">{memberMarket.name}</span>
                    </div>
                    <div className="text-white/65 text-xs">
                      Общая инфраструктура без договоров:{' '}
                      <span
                        className={
                          memberMarket.allowInfrastructureAccessWithoutTreaties
                            ? 'text-emerald-200'
                            : 'text-white/75'
                        }
                      >
                        {memberMarket.allowInfrastructureAccessWithoutTreaties
                          ? 'включена'
                          : 'выключена'}
                      </span>
                    </div>
                    <div className="text-white/55 text-xs">
                      Пока страна состоит в рынке, создать свой рынок нельзя.
                    </div>
                    <button
                      onClick={() => onLeaveMarket(activeCountryId, memberMarket.id)}
                      className="h-9 px-3 rounded-lg border border-rose-400/35 bg-rose-500/10 text-rose-200 text-sm inline-flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Выйти из рынка
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                      <div className="text-white/85 text-sm font-semibold">Параметры рынка</div>
                      {!canEditOwnMarket && (
                        <div className="text-amber-200/90 text-xs">
                          Параметры может менять только создатель рынка.
                        </div>
                      )}
                      <label className="flex flex-col gap-1 text-white/70 text-sm">
                        Название
                        <input
                          type="text"
                          value={marketNameDraft}
                          onChange={(event) => setMarketNameDraft(event.target.value)}
                          disabled={!canEditOwnMarket}
                          className="h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-emerald-400/60 disabled:opacity-60"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-white/70 text-sm">
                        Столица рынка
                        <select
                          value={capitalProvinceIdDraft}
                          onChange={(event) => setCapitalProvinceIdDraft(event.target.value)}
                          disabled={!canEditOwnMarket}
                          className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60 disabled:opacity-60"
                        >
                          <option value="" className="bg-[#0b111b] text-white">
                            Выберите провинцию
                          </option>
                          {ownCountryProvinceIds.map((provinceId) => (
                            <option
                              key={`market-capital-edit:${provinceId}`}
                              value={provinceId}
                              className="bg-[#0b111b] text-white"
                            >
                              {provinceId}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-white/70 text-sm">
                        Цвет рынка
                        <input
                          type="color"
                          value={marketColorDraft}
                          onChange={(event) => setMarketColorDraft(event.target.value)}
                          disabled={!canEditOwnMarket}
                          className="h-9 rounded-lg bg-black/40 border border-white/10 p-1 disabled:opacity-60"
                        />
                      </label>
                      <div className="flex flex-col gap-1 text-white/70 text-sm">
                        <span>Логотип рынка</span>
                        <div className="rounded-lg border border-white/10 bg-black/30 p-2 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center">
                            {marketLogoDraft ? (
                              <img src={marketLogoDraft} alt="Логотип рынка" className="w-full h-full object-cover" />
                            ) : (
                              <Globe2 className="w-5 h-5 text-white/40" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <label
                              className={`h-8 px-3 rounded-lg border text-xs inline-flex items-center transition-colors ${
                                canEditOwnMarket
                                  ? 'border-white/15 bg-black/40 text-white/80 cursor-pointer hover:border-emerald-400/40 hover:text-emerald-200'
                                  : 'border-white/10 bg-black/20 text-white/40 cursor-not-allowed'
                              }`}
                            >
                              {marketLogoDraft ? 'Заменить' : 'Выбрать'}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={!canEditOwnMarket}
                                onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                                className="hidden"
                              />
                            </label>
                            {marketLogoDraft && (
                              <button
                                type="button"
                                onClick={() => setMarketLogoDraft(undefined)}
                                disabled={!canEditOwnMarket}
                                className={`h-8 px-3 rounded-lg border text-xs inline-flex items-center transition-colors ${
                                  canEditOwnMarket
                                    ? 'border-rose-400/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                                    : 'border-white/10 bg-black/20 text-white/40 cursor-not-allowed'
                                }`}
                              >
                                Удалить
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-white/45">
                          PNG/JPG/WebP. Лучше использовать квадратное изображение.
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-white/75 text-sm">
                        <input
                          type="checkbox"
                          checked={allowInfrastructureAccessWithoutTreatiesDraft}
                          onChange={(event) =>
                            setAllowInfrastructureAccessWithoutTreatiesDraft(
                              event.target.checked,
                            )
                          }
                          disabled={!canEditOwnMarket}
                          className="h-4 w-4 rounded border-white/20 bg-black/40 accent-emerald-500 disabled:opacity-50"
                        />
                        Общая инфраструктура рынка без договоров
                      </label>
                      <div className="text-[11px] text-white/50 leading-relaxed">
                        Если включено, маршруты всех стран-участников рынка считаются общей
                        инфраструктурой для доступа к столице рынка по категориям. Сами маршруты
                        остаются независимыми и не объединяются в один маршрут.
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            onUpdateMarket(ownMarket.id, {
                              actorCountryId: activeCountryId,
                              name: marketNameDraft.trim() || ownMarket.name,
                              color: marketColorDraft,
                              logoDataUrl: marketLogoDraft,
                              capitalProvinceId: capitalProvinceIdDraft || undefined,
                              allowInfrastructureAccessWithoutTreaties:
                                allowInfrastructureAccessWithoutTreatiesDraft,
                            })
                          }
                          disabled={!canEditOwnMarket || !capitalProvinceIdDraft}
                          className={`h-9 px-3 rounded-lg border text-sm inline-flex items-center gap-2 ${
                            canEditOwnMarket && Boolean(capitalProvinceIdDraft)
                              ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                              : 'border-white/10 bg-black/30 text-white/40 cursor-not-allowed'
                          }`}
                        >
                          <Save className="w-4 h-4" />
                          Сохранить
                        </button>
                        <button
                          onClick={() => onDeleteMarket(ownMarket.id, activeCountryId)}
                          disabled={!canEditOwnMarket}
                          className={`h-9 px-3 rounded-lg border text-sm inline-flex items-center gap-2 ${
                            canEditOwnMarket
                              ? 'border-red-400/35 bg-red-500/10 text-red-200'
                              : 'border-white/10 bg-black/30 text-white/40 cursor-not-allowed'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                          Удалить рынок
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-white/85 text-sm font-semibold mb-2">Участники рынка</div>
                      <div className="mb-2 text-[11px] text-white/60">
                        Общая инфраструктура без договоров:{' '}
                        <span
                          className={
                            ownMarket.allowInfrastructureAccessWithoutTreaties
                              ? 'text-emerald-200'
                              : 'text-white/75'
                          }
                        >
                          {ownMarket.allowInfrastructureAccessWithoutTreaties
                            ? 'включена'
                            : 'выключена'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {ownMarket.memberCountryIds.map((memberId) => {
                          const country = countries.find((item) => item.id === memberId);
                          const canRemove = memberId !== ownMarket.leaderCountryId;
                          return (
                            <div
                              key={`member:${memberId}`}
                              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 flex items-center justify-between gap-3"
                            >
                              <div className="inline-flex items-center gap-2 text-white/75 text-sm">
                                {country?.flagDataUrl ? (
                                  <img
                                    src={country.flagDataUrl}
                                    alt={`${country.name} flag`}
                                    className="w-5 h-3.5 rounded-sm border border-white/20 object-cover"
                                  />
                                ) : null}
                                {country?.name ?? memberId}
                              </div>
                              {canRemove ? (
                                <button
                                  onClick={() =>
                                    onUpdateMarket(ownMarket.id, {
                                      actorCountryId: activeCountryId,
                                      memberCountryIds: ownMarket.memberCountryIds.filter(
                                        (id) => id !== memberId,
                                      ),
                                    })
                                  }
                                  disabled={!canEditOwnMarket}
                                  className="h-7 px-2 rounded-md border border-red-400/30 bg-red-500/10 text-red-200 text-xs disabled:opacity-50"
                                >
                                  Убрать
                                </button>
                              ) : (
                                <span className="text-[11px] text-emerald-200/80">Центр рынка</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-white/85 text-sm font-semibold mb-2">
                        Приглашение стран договором
                      </div>
                      <div className="text-white/55 text-xs mb-3">
                        Новые страны добавляются только через дипломатическое предложение.
                      </div>
                      <div className="space-y-2">
                        {inviteCandidates.length > 0 ? (
                          inviteCandidates.map((country) => {
                            const pending = pendingInviteCountryIds.has(country.id);
                            return (
                              <div
                                key={`invite:${country.id}`}
                                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 flex items-center justify-between gap-3"
                              >
                                <div className="inline-flex items-center gap-2 text-white/75 text-sm">
                                  {country.flagDataUrl ? (
                                    <img
                                      src={country.flagDataUrl}
                                      alt={`${country.name} flag`}
                                      className="w-5 h-3.5 rounded-sm border border-white/20 object-cover"
                                    />
                                  ) : null}
                                  {country.name}
                                </div>
                                <button
                                  onClick={() => onInviteByTreaty(country.id)}
                                  disabled={pending || !canEditOwnMarket}
                                  className={`h-7 px-2 rounded-md border text-xs inline-flex items-center gap-1 ${
                                    pending || !canEditOwnMarket
                                      ? 'border-white/10 bg-black/30 text-white/35 cursor-not-allowed'
                                      : 'border-sky-400/35 bg-sky-500/15 text-sky-200'
                                  }`}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  {pending ? 'Уже отправлено' : 'Пригласить'}
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-white/50 text-sm">Нет доступных стран для приглашения.</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full space-y-4">
                {!memberMarket ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/60 text-sm">
                    Страна не состоит в рынке.
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <Tooltip
                        label="Биржа товаров"
                        description="Карточки ресурсов с ключевыми метриками рынка."
                        side="bottom"
                      >
                        <div className="text-white/85 text-sm font-semibold mb-2 inline-flex items-center gap-2">
                          <span>Биржа товаров</span>
                        </div>
                      </Tooltip>
                      <div className="space-y-2">
                        {goodsStats.rows.map((row) => (
                          <div
                            key={`exchange:${row.resourceId}`}
                            className="w-full rounded-xl border border-white/10 bg-black/30 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="inline-flex items-center gap-2 text-white/90">
                                {row.resourceIconDataUrl ? (
                                  <img
                                    src={row.resourceIconDataUrl}
                                    alt={row.resourceName}
                                    className="w-4 h-4 rounded-sm border border-white/15 object-cover"
                                  />
                                ) : (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: row.resourceColor }}
                                  />
                                )}
                                <span className="text-sm">{row.resourceName}</span>
                              </div>
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <MiniGraphCard
                                  title="Цена за ед."
                                  value={formatCompactNumber(row.marketPrice, 1)}
                                  valueClassName="text-yellow-200"
                                  borderClassName="border-yellow-400/35"
                                  bgClassName="bg-yellow-500/10"
                                  values={row.marketPriceHistory}
                                  stroke={
                                    row.priceTrend === 'up'
                                      ? '#34d399'
                                      : row.priceTrend === 'down'
                                        ? '#fb7185'
                                        : '#fde047'
                                  }
                                  ariaLabel="График цены за единицу за 10 ходов"
                                  tooltip="Цена одной единицы ресурса в вашем рынке за последние 10 ходов."
                                />
                                <MiniGraphCard
                                  title="Цена рынка"
                                  value={formatCompactNumber(row.marketValue, 1)}
                                  valueClassName="text-amber-200"
                                  borderClassName="border-amber-400/35"
                                  bgClassName="bg-amber-500/10"
                                  values={row.marketPriceHistory.map((price) => row.marketSupply * price)}
                                  stroke="#f59e0b"
                                  ariaLabel="График цены рынка за 10 ходов"
                                  tooltip="Оценка запасов ресурса в вашем рынке: объем в хранилищах × цена за единицу."
                                />
                                <MiniGraphCard
                                  title="Стоимость мест."
                                  value={formatCompactNumber(row.depositValue, 1)}
                                  valueClassName="text-fuchsia-200"
                                  borderClassName="border-fuchsia-400/35"
                                  bgClassName="bg-fuchsia-500/10"
                                  values={row.marketPriceHistory.map((price) => row.depositSupply * price)}
                                  stroke="#e879f9"
                                  ariaLabel="График стоимости месторождений за 10 ходов"
                                  tooltip="Оценка ваших месторождений по текущей цене ресурса за последние 10 ходов."
                                />
                                <MiniGraphCard
                                  title="Спрос"
                                  value={formatCompactNumber(row.marketDemand, 0)}
                                  valueClassName="text-rose-200"
                                  borderClassName="border-rose-400/35"
                                  bgClassName="bg-rose-500/10"
                                  values={row.marketDemandHistory}
                                  stroke="#fb7185"
                                  ariaLabel="График спроса за 10 ходов"
                                  tooltip="Сколько ресурса в сумме потребляют здания рынка за ход."
                                />
                                <MiniGraphCard
                                  title="Предложение"
                                  value={formatCompactNumber(row.marketOffer, 0)}
                                  valueClassName="text-teal-200"
                                  borderClassName="border-teal-400/35"
                                  bgClassName="bg-teal-500/10"
                                  values={row.marketOfferHistory}
                                  stroke="#2dd4bf"
                                  ariaLabel="График предложения за 10 ходов"
                                  tooltip="Доступный объем ресурса: фактическое производство + складские запасы."
                                />
                                <MiniGraphCard
                                  title="Произв. факт"
                                  value={formatCompactNumber(row.marketProductionFact, 0)}
                                  valueClassName="text-emerald-200"
                                  borderClassName="border-emerald-400/35"
                                  bgClassName="bg-emerald-500/10"
                                  values={row.marketProductionFactHistory}
                                  stroke="#34d399"
                                  ariaLabel="График фактического производства за 10 ходов"
                                  tooltip="Реально произведенный объем ресурса (добыча + производство) за ход."
                                />
                                <MiniGraphCard
                                  title="Произв. макс"
                                  value={formatCompactNumber(row.marketProductionMax, 0)}
                                  valueClassName="text-cyan-200"
                                  borderClassName="border-cyan-400/35"
                                  bgClassName="bg-cyan-500/10"
                                  values={row.marketProductionMaxHistory}
                                  stroke="#22d3ee"
                                  ariaLabel="График максимального производства за 10 ходов"
                                  tooltip="Теоретический максимум производства при 100% эффективности зданий."
                                />
                                <ShareDonut
                                  label="Доля месторождений"
                                  value={row.depositShare}
                                  pathColor="rgba(232, 121, 249, 0.95)"
                                  amount={row.depositSupply}
                                  amountLabel="Ваши"
                                  secondaryAmountLabel="В мире"
                                  secondaryAmount={row.worldDeposits}
                                  description="Доля ваших месторождений этого ресурса от мировых запасов."
                                />
                                <ShareDonut
                                  label="Доля объема рынка"
                                  value={row.marketShare}
                                  pathColor="rgba(125, 211, 252, 0.95)"
                                  amount={row.marketSupply}
                                  amountLabel="Ваш"
                                  secondaryAmountLabel="В мире"
                                  secondaryAmount={row.worldMarketSupply}
                                  description="Доля запасов вашего рынка от суммарного мирового объема на складах."
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Globe2,
  Minus,
  Package,
  Plus,
  Save,
  Send,
  ShoppingCart,
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

type ExchangeHeaderProps = {
  label: string;
  help: string;
  align?: 'left' | 'right' | 'center';
};

function ExchangeHeader({ label, help, align = 'right' }: ExchangeHeaderProps) {
  const alignClass =
    align === 'left'
      ? 'text-left'
      : align === 'center'
        ? 'text-center'
        : 'text-right';
  const contentAlignClass =
    align === 'left'
      ? 'justify-start'
      : align === 'center'
        ? 'justify-center'
        : 'justify-end';
  return (
    <th className={`px-3 py-2 font-medium ${alignClass}`}>
      <div className={`group relative inline-flex items-center gap-1.5 ${contentAlignClass}`}>
        <span>{label}</span>
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-white/5 text-[10px] text-white/60">
          ?
        </span>
        <span className="pointer-events-none absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100 z-20">
          {help}
        </span>
      </div>
    </th>
  );
}

const PRICE_TREND_EPSILON = 0.0001;

const getSparklinePath = (values: number[], width = 84, height = 22) => {
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
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
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
  onTradeWithWarehouse,
  onInviteByTreaty,
}: MarketsModalProps) {
  const [tab, setTab] = useState<MarketsTab>('market');
  const [newMarketName, setNewMarketName] = useState('');
  const [marketNameDraft, setMarketNameDraft] = useState('');
  const [capitalProvinceIdDraft, setCapitalProvinceIdDraft] = useState('');
  const [marketColorDraft, setMarketColorDraft] = useState('#22c55e');
  const [marketLogoDraft, setMarketLogoDraft] = useState<string | undefined>(
    undefined,
  );
  const [warehouseTradeAmount, setWarehouseTradeAmount] = useState(10);

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
      return;
    }
    if (!newMarketName && activeCountry) {
      setNewMarketName(`Рынок ${activeCountry.name}`);
    }
    setCapitalProvinceIdDraft((prev) => prev || ownCountryProvinceIds[0] || '');
    setMarketColorDraft((prev) => prev || activeCountry?.color || '#22c55e');
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
    const totalsByCountry = new Map<string, number>();
    const warehouse = memberMarket?.warehouseByResourceId ?? {};
    const definitionById = new Map(buildings.map((building) => [building.id, building]));

    Object.values(provinces).forEach((province) => {
      const owner = province.ownerCountryId;
      Object.entries(province.resourceAmounts ?? {}).forEach(([resourceId, amount]) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        worldDeposits.set(resourceId, (worldDeposits.get(resourceId) ?? 0) + amount);
        if (!memberMarket || !owner || !memberSet.has(owner)) return;
        depositSupply.set(resourceId, (depositSupply.get(resourceId) ?? 0) + amount);
        totalsByCountry.set(owner, (totalsByCountry.get(owner) ?? 0) + amount);
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
      const warehouseStock = Math.max(0, warehouse[resource.id] ?? 0);
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
      const suppliers = supplierCountries.get(resource.id)?.size ?? 0;
      const marketShare = worldMarketAmount > 0 ? (totalMarketStock / worldMarketAmount) * 100 : 0;
      const depositShare =
        worldDepositsAmount > 0 ? (deposits / worldDepositsAmount) * 100 : 0;
      const avgPerSupplier = suppliers > 0 ? deposits / suppliers : 0;
      const liquidity =
        totalMarketStock >= 1000
          ? 'Высокая'
          : totalMarketStock >= 300
            ? 'Средняя'
            : totalMarketStock > 0
              ? 'Низкая'
              : 'Нет';
      const priceIndex = Math.max(
        35,
        Math.min(
          260,
          100 +
            (worldMarketAmount - totalMarketStock) /
              Math.max(20, worldMarketAmount * 0.1),
        ),
      );
      return {
        index: index + 1,
        resourceId: resource.id,
        resourceName: resource.name,
        resourceColor: resource.color,
        marketPrice,
        marketPriceHistory: normalizedPriceHistory,
        priceTrend,
        marketValue: totalMarketStock * marketPrice,
        depositValue: deposits * marketPrice,
        marketDemand: demand,
        marketProductionFact: supplyFact,
        marketProductionMax: supplyMax,
        marketOffer,
        marketSupply: totalMarketStock,
        depositSupply: deposits,
        worldMarketSupply: worldMarketAmount,
        worldDeposits: worldDepositsAmount,
        depositShare,
        warehouseStock,
        suppliers,
        marketShare,
        avgPerSupplier,
        liquidity,
        priceIndex,
      };
    });

    const byCountry = Array.from(totalsByCountry.entries())
      .map(([countryId, total]) => ({
        countryId,
        total,
        countryName: countries.find((country) => country.id === countryId)?.name ?? countryId,
      }))
      .sort((a, b) => b.total - a.total);

    const warehouseTotal = Object.values(warehouse).reduce(
      (acc, value) => acc + (Number.isFinite(value) ? Math.max(0, value) : 0),
      0,
    );

    return { rows, byCountry, warehouseTotal };
  }, [memberMarket, provinces, resources, countries, buildings]);
  const canTradeWarehouse = Boolean(
    activeCountryId &&
      memberMarket &&
      memberMarket.memberCountryIds.includes(activeCountryId),
  );

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
                    <label className="flex flex-col gap-1 text-white/70 text-sm">
                      Логотип рынка
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                        className="text-xs text-white/70 file:mr-3 file:h-8 file:px-3 file:rounded-md file:border file:border-white/10 file:bg-black/30 file:text-white/80"
                      />
                    </label>
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
                      <label className="flex flex-col gap-1 text-white/70 text-sm">
                        Логотип рынка
                        <input
                          type="file"
                          accept="image/*"
                          disabled={!canEditOwnMarket}
                          onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                          className="text-xs text-white/70 file:mr-3 file:h-8 file:px-3 file:rounded-md file:border file:border-white/10 file:bg-black/30 file:text-white/80 disabled:opacity-60"
                        />
                      </label>
                      {marketLogoDraft && (
                        <div className="w-16 h-16 rounded-lg border border-white/10 bg-black/30 overflow-hidden">
                          <img src={marketLogoDraft} alt="Market logo" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            onUpdateMarket(ownMarket.id, {
                              actorCountryId: activeCountryId,
                              name: marketNameDraft.trim() || ownMarket.name,
                              color: marketColorDraft,
                              logoDataUrl: marketLogoDraft,
                              capitalProvinceId: capitalProvinceIdDraft || undefined,
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
              <div className="max-w-6xl space-y-4">
                {!memberMarket ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/60 text-sm">
                    Страна не состоит в рынке.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-black/30 p-4">
                        <div className="text-white/60 text-[11px] uppercase tracking-wide">Позиции биржи</div>
                        <div className="text-white text-2xl font-semibold mt-1">{goodsStats.rows.length}</div>
                      </div>
                      <div className="rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-black/30 p-4">
                        <div className="text-white/60 text-[11px] uppercase tracking-wide">Склад рынка</div>
                        <div className="text-emerald-100 text-2xl font-semibold mt-1">
                          {goodsStats.warehouseTotal.toFixed(0)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-amber-400/25 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-black/30 p-4">
                        <div className="text-white/60 text-[11px] uppercase tracking-wide">Участники</div>
                        <div className="text-amber-100 text-2xl font-semibold mt-1">
                          {memberMarket.memberCountryIds.length}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/35 p-4 space-y-2">
                        <div className="text-white/60 text-[11px] uppercase tracking-wide">Объем сделки</div>
                        <input
                          type="number"
                          min={1}
                          max={1000000}
                          value={warehouseTradeAmount}
                          onChange={(event) =>
                            setWarehouseTradeAmount(
                              Math.max(1, Math.floor(Number(event.target.value) || 1)),
                            )
                          }
                          className="h-9 w-full rounded-lg border border-white/15 bg-black/40 px-3 text-white text-sm focus:outline-none focus:border-cyan-400/55"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-white/85 text-sm font-semibold mb-2 inline-flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Биржа товаров
                      </div>
                      <div className="text-white/55 text-xs mb-3">
                        Ресурсы автоматически появляются на бирже. Склад - общий буфер рынка для покупок и продаж.
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-white/10">
                        <table className="min-w-[2060px] w-full text-xs">
                          <thead className="bg-black/45 text-white/70">
                            <tr>
                              <ExchangeHeader
                                align="left"
                                label="#"
                                help="Порядковый номер строки ресурса в таблице биржи."
                              />
                              <ExchangeHeader
                                align="left"
                                label="Товар"
                                help="Название ресурса в текущей строке биржи."
                              />
                              <ExchangeHeader
                                label="Цена за единицу"
                                help="Текущая рыночная цена 1 единицы ресурса в вашем рынке и динамика за 10 последних ходов."
                              />
                              <ExchangeHeader
                                label="Цена рынка"
                                help="Оценка стоимости всего объема ресурса в рынке: цена за единицу x объем рынка."
                              />
                              <ExchangeHeader
                                label="Спрос"
                                help="Сумма максимального потребления этого ресурса зданиями рынка за ход."
                              />
                              <ExchangeHeader
                                label="Предложение"
                                help="Сумма Производства (факт) и Объема рынка. Это общее предложение, которое используется в расчете цены."
                              />
                              <ExchangeHeader
                                label="Производство (факт)"
                                help="Фактическая добыча и производство ресурса зданиями рынка за последний ход. Участвует в расчете цены как часть предложения."
                              />
                              <ExchangeHeader
                                label="Производство (макс)"
                                help="Максимально возможная добыча и производство по настройкам зданий рынка. В расчете цены не участвует."
                              />
                              <ExchangeHeader
                                label="Объем рынка"
                                help="Сумма ресурса на складах зданий, расположенных в провинциях стран вашего рынка. Участвует в расчете цены как часть предложения."
                              />
                              <ExchangeHeader
                                label="Объем месторождений"
                                help="Запасы ресурса в провинциях стран вашего рынка."
                              />
                              <ExchangeHeader
                                label="Стоимость месторождений"
                                help="Оценка запасов месторождений: объем месторождений x цена за единицу."
                              />
                              <ExchangeHeader
                                label="Мировой объем"
                                help="Сумма ресурса на складах всех зданий мира."
                              />
                              <ExchangeHeader
                                label="Доля рынка"
                                help="Доля вашего рынка в мировом объеме ресурса."
                              />
                              <ExchangeHeader
                                label="Мировые запасы"
                                help="Суммарные запасы ресурса в месторождениях всех провинций мира."
                              />
                              <ExchangeHeader
                                label="Доля месторождений"
                                help="Доля месторождений вашего рынка в мировых запасах ресурса."
                              />
                              <ExchangeHeader
                                label="Поставщики"
                                help="Количество стран вашего рынка, у которых есть месторождения этого ресурса."
                              />
                              <ExchangeHeader
                                label="Индекс цены"
                                help="Условный индекс дефицита/избытка: выше 100 при дефиците, ниже 100 при избытке."
                              />
                              <ExchangeHeader
                                label="Склад"
                                help="Текущий остаток ресурса на складе вашего рынка."
                              />
                              <ExchangeHeader
                                align="center"
                                label="Ликвидность"
                                help="Качественная оценка доступности ресурса по объему на складе рынка."
                              />
                              <ExchangeHeader
                                label="Операции"
                                help="Ручная покупка и продажа ресурса через склад рынка."
                              />
                            </tr>
                          </thead>
                          <tbody>
                            {goodsStats.rows.map((row) => (
                              <tr
                                key={`exchange:${row.resourceId}`}
                                className="border-t border-white/10 bg-black/20"
                              >
                                <td className="px-3 py-2 text-white/55">{row.index}</td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center gap-2 text-white/80">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full"
                                      style={{ backgroundColor: row.resourceColor }}
                                    />
                                    {row.resourceName}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="inline-flex flex-col items-end gap-1">
                                    <span
                                      className={`inline-flex items-center gap-1 tabular-nums ${
                                        row.priceTrend === 'up'
                                          ? 'text-emerald-200'
                                          : row.priceTrend === 'down'
                                            ? 'text-rose-200'
                                            : 'text-white/90'
                                      }`}
                                    >
                                      {row.priceTrend === 'up' ? (
                                        <ArrowUp className="w-3 h-3" />
                                      ) : row.priceTrend === 'down' ? (
                                        <ArrowDown className="w-3 h-3" />
                                      ) : (
                                        <Minus className="w-3 h-3" />
                                      )}
                                      {row.marketPrice.toFixed(2)}
                                    </span>
                                    <svg
                                      viewBox="0 0 84 22"
                                      className="h-5 w-[84px]"
                                      aria-label="График цены за 10 ходов"
                                    >
                                      <path
                                        d={getSparklinePath(row.marketPriceHistory)}
                                        fill="none"
                                        stroke={
                                          row.priceTrend === 'up'
                                            ? '#34d399'
                                            : row.priceTrend === 'down'
                                              ? '#fb7185'
                                              : '#f8fafc'
                                        }
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right text-amber-200">
                                  {row.marketValue.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-right text-rose-200">
                                  {row.marketDemand.toFixed(0)}
                                </td>
                                <td className="px-3 py-2 text-right text-teal-200">
                                  {row.marketOffer.toFixed(0)}
                                </td>
                                <td className="px-3 py-2 text-right text-teal-200">
                                  {row.marketProductionFact.toFixed(0)}
                                </td>
                                <td className="px-3 py-2 text-right text-cyan-200">
                                  {row.marketProductionMax.toFixed(0)}
                                </td>
                                <td className="px-3 py-2 text-right text-emerald-200">
                                  {row.marketSupply.toFixed(0)}
                                </td>
                                <td className="px-3 py-2 text-right text-violet-200">
                                  {row.depositSupply.toFixed(0)}
                                </td>
                                <td className="px-3 py-2 text-right text-fuchsia-200">
                                  {row.depositValue.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-right text-white/70">
                                  {row.worldMarketSupply.toFixed(0)}
                                </td>
                                <td className="px-3 py-2 text-right text-sky-200">
                                  {row.marketShare.toFixed(1)}%
                                </td>
                                <td className="px-3 py-2 text-right text-violet-200">
                                  {row.worldDeposits.toFixed(0)}
                                </td>
                                <td className="px-3 py-2 text-right text-fuchsia-200">
                                  {row.depositShare.toFixed(1)}%
                                </td>
                                <td className="px-3 py-2 text-right text-white/70">{row.suppliers}</td>
                                <td className="px-3 py-2 text-right text-amber-200">
                                  {row.priceIndex.toFixed(0)}
                                </td>
                                <td className="px-3 py-2 text-right text-cyan-200">
                                  {row.warehouseStock.toFixed(0)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span
                                    className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md border ${
                                      row.liquidity === 'Высокая'
                                        ? 'text-emerald-200 border-emerald-400/40 bg-emerald-500/15'
                                        : row.liquidity === 'Средняя'
                                          ? 'text-amber-200 border-amber-400/40 bg-amber-500/15'
                                          : row.liquidity === 'Низкая'
                                            ? 'text-orange-200 border-orange-400/40 bg-orange-500/15'
                                            : 'text-rose-200 border-rose-400/40 bg-rose-500/15'
                                    }`}
                                  >
                                    {row.liquidity}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() =>
                                        onTradeWithWarehouse({
                                          marketId: memberMarket.id,
                                          actorCountryId: activeCountryId,
                                          resourceId: row.resourceId,
                                          amount: warehouseTradeAmount,
                                          action: 'sell',
                                        })
                                      }
                                      disabled={!canTradeWarehouse}
                                      className={`h-7 px-2 rounded-md border text-[11px] inline-flex items-center gap-1 ${
                                        canTradeWarehouse
                                          ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100'
                                          : 'border-white/10 bg-black/30 text-white/35 cursor-not-allowed'
                                      }`}
                                    >
                                      <Package className="w-3.5 h-3.5" />
                                      Продать
                                    </button>
                                    <button
                                      onClick={() =>
                                        onTradeWithWarehouse({
                                          marketId: memberMarket.id,
                                          actorCountryId: activeCountryId,
                                          resourceId: row.resourceId,
                                          amount: warehouseTradeAmount,
                                          action: 'buy',
                                        })
                                      }
                                      disabled={!canTradeWarehouse || row.warehouseStock < warehouseTradeAmount}
                                      className={`h-7 px-2 rounded-md border text-[11px] inline-flex items-center gap-1 ${
                                        canTradeWarehouse && row.warehouseStock >= warehouseTradeAmount
                                          ? 'border-sky-400/35 bg-sky-500/15 text-sky-100'
                                          : 'border-white/10 bg-black/30 text-white/35 cursor-not-allowed'
                                      }`}
                                    >
                                      <ShoppingCart className="w-3.5 h-3.5" />
                                      Купить
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-white/85 text-sm font-semibold mb-2">
                        Вклад стран в рынок
                      </div>
                      <div className="space-y-2">
                        {goodsStats.byCountry.length > 0 ? (
                          goodsStats.byCountry.map((entry) => (
                            <div
                              key={`country-trade:${entry.countryId}`}
                              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 flex items-center justify-between"
                            >
                              <span className="text-white/75 text-sm">{entry.countryName}</span>
                              <span className="text-cyan-200 text-xs">{entry.total.toFixed(0)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-white/50 text-sm">Нет данных по участникам рынка.</div>
                        )}
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

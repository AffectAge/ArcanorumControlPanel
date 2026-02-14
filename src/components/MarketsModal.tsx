import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Globe2,
  Package,
  Plus,
  Save,
  Send,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import type {
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

export default function MarketsModal({
  open,
  countries,
  markets,
  provinces,
  resources,
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
      setNewMarketName(`Р С‹РЅРѕРє ${activeCountry.name}`);
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
    const worldSupply = new Map<string, number>();
    const marketSupply = new Map<string, number>();
    const supplierCountries = new Map<string, Set<string>>();
    const totalsByCountry = new Map<string, number>();
    const warehouse = memberMarket?.warehouseByResourceId ?? {};

    Object.values(provinces).forEach((province) => {
      const owner = province.ownerCountryId;
      Object.entries(province.resourceAmounts ?? {}).forEach(([resourceId, amount]) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        worldSupply.set(resourceId, (worldSupply.get(resourceId) ?? 0) + amount);
        if (!memberMarket || !owner || !memberSet.has(owner)) return;
        marketSupply.set(resourceId, (marketSupply.get(resourceId) ?? 0) + amount);
        totalsByCountry.set(owner, (totalsByCountry.get(owner) ?? 0) + amount);
        const suppliers = supplierCountries.get(resourceId) ?? new Set<string>();
        suppliers.add(owner);
        supplierCountries.set(resourceId, suppliers);
      });
    });

    const rows = resources.map((resource, index) => {
      const market = marketSupply.get(resource.id) ?? 0;
      const world = worldSupply.get(resource.id) ?? 0;
      const warehouseStock = Math.max(0, warehouse[resource.id] ?? 0);
      const suppliers = supplierCountries.get(resource.id)?.size ?? 0;
      const marketShare = world > 0 ? (market / world) * 100 : 0;
      const avgPerSupplier = suppliers > 0 ? market / suppliers : 0;
      const liquidity =
        market >= 1000 ? 'Высокая' : market >= 300 ? 'Средняя' : market > 0 ? 'Низкая' : 'Нет';
      const priceIndex = Math.max(
        35,
        Math.min(260, 100 + (world - market) / Math.max(20, world * 0.1)),
      );
      return {
        index: index + 1,
        resourceId: resource.id,
        resourceName: resource.name,
        resourceColor: resource.color,
        marketSupply: market,
        worldSupply: world,
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
  }, [memberMarket, provinces, resources, countries]);
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
              <div className="text-white text-lg font-semibold">Р С‹РЅРєРё</div>
              <div className="text-white/60 text-sm">
                РЈРїСЂР°РІР»РµРЅРёРµ С‚РѕР»СЊРєРѕ СЃРІРѕРёРј СЂС‹РЅРєРѕРј
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
              РњРѕР№ СЂС‹РЅРѕРє
            </button>
            <button
              onClick={() => setTab('goods')}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                tab === 'goods'
                  ? 'bg-sky-500/15 border-sky-400/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:border-sky-400/30'
              }`}
            >
              РўРѕРІР°СЂС‹ Рё С‚РѕСЂРіРѕРІР»СЏ
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto legend-scroll p-6">
            {tab === 'market' ? (
              <div className="max-w-4xl space-y-4">
                {!activeCountryId ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/60 text-sm">
                    Р’С‹Р±РµСЂРёС‚Рµ Р°РєС‚РёРІРЅСѓСЋ СЃС‚СЂР°РЅСѓ.
                  </div>
                ) : !memberMarket ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <div className="text-white/85 text-sm font-semibold">РЎРѕР·РґР°РЅРёРµ СЂС‹РЅРєР°</div>
                    <label className="flex flex-col gap-1 text-white/70 text-sm">
                      РќР°Р·РІР°РЅРёРµ
                      <input
                        type="text"
                        value={newMarketName}
                        onChange={(event) => setNewMarketName(event.target.value)}
                        className="h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-emerald-400/60"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-white/70 text-sm">
                      РЎС‚РѕР»РёС†Р° СЂС‹РЅРєР°
                      <select
                        value={capitalProvinceIdDraft}
                        onChange={(event) => setCapitalProvinceIdDraft(event.target.value)}
                        className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60"
                      >
                        <option value="" className="bg-[#0b111b] text-white">
                          Р’С‹Р±РµСЂРёС‚Рµ РїСЂРѕРІРёРЅС†РёСЋ
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
                      Р¦РІРµС‚ СЂС‹РЅРєР°
                      <input
                        type="color"
                        value={marketColorDraft}
                        onChange={(event) => setMarketColorDraft(event.target.value)}
                        className="h-9 rounded-lg bg-black/40 border border-white/10 p-1"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-white/70 text-sm">
                      Р›РѕРіРѕС‚РёРї СЂС‹РЅРєР°
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                        className="text-xs text-white/70 file:mr-3 file:h-8 file:px-3 file:rounded-md file:border file:border-white/10 file:bg-black/30 file:text-white/80"
                      />
                    </label>
                    {ownCountryProvinceIds.length === 0 && (
                      <div className="text-rose-200/90 text-xs">
                        РЈ СЃС‚СЂР°РЅС‹ РЅРµС‚ РїСЂРѕРІРёРЅС†РёР№ РґР»СЏ СЃС‚РѕР»РёС†С‹ СЂС‹РЅРєР°.
                      </div>
                    )}
                    <button
                      onClick={() =>
                        onCreateMarket({
                          actorCountryId: activeCountryId,
                          name: newMarketName.trim() || `Р С‹РЅРѕРє ${activeCountry?.name ?? ''}`,
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
                      РЎРѕР·РґР°С‚СЊ СЂС‹РЅРѕРє
                    </button>
                  </div>
                ) : !ownMarket ? (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 space-y-3">
                    <div className="text-white/85 text-sm font-semibold">РЈС‡Р°СЃС‚РёРµ РІ СЂС‹РЅРєРµ</div>
                    <div className="text-white/70 text-sm">
                      РЎС‚СЂР°РЅР° СЃРѕСЃС‚РѕРёС‚ РІ СЂС‹РЅРєРµ: <span className="text-amber-200">{memberMarket.name}</span>
                    </div>
                    <div className="text-white/55 text-xs">
                      РџРѕРєР° СЃС‚СЂР°РЅР° СЃРѕСЃС‚РѕРёС‚ РІ СЂС‹РЅРєРµ, СЃРѕР·РґР°С‚СЊ СЃРІРѕР№ СЂС‹РЅРѕРє РЅРµР»СЊР·СЏ.
                    </div>
                    <button
                      onClick={() => onLeaveMarket(activeCountryId, memberMarket.id)}
                      className="h-9 px-3 rounded-lg border border-rose-400/35 bg-rose-500/10 text-rose-200 text-sm inline-flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Р’С‹Р№С‚Рё РёР· СЂС‹РЅРєР°
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                      <div className="text-white/85 text-sm font-semibold">РџР°СЂР°РјРµС‚СЂС‹ СЂС‹РЅРєР°</div>
                      {!canEditOwnMarket && (
                        <div className="text-amber-200/90 text-xs">
                          РџР°СЂР°РјРµС‚СЂС‹ РјРѕР¶РµС‚ РјРµРЅСЏС‚СЊ С‚РѕР»СЊРєРѕ СЃРѕР·РґР°С‚РµР»СЊ СЂС‹РЅРєР°.
                        </div>
                      )}
                      <label className="flex flex-col gap-1 text-white/70 text-sm">
                        РќР°Р·РІР°РЅРёРµ
                        <input
                          type="text"
                          value={marketNameDraft}
                          onChange={(event) => setMarketNameDraft(event.target.value)}
                          disabled={!canEditOwnMarket}
                          className="h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-emerald-400/60 disabled:opacity-60"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-white/70 text-sm">
                        РЎС‚РѕР»РёС†Р° СЂС‹РЅРєР°
                        <select
                          value={capitalProvinceIdDraft}
                          onChange={(event) => setCapitalProvinceIdDraft(event.target.value)}
                          disabled={!canEditOwnMarket}
                          className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60 disabled:opacity-60"
                        >
                          <option value="" className="bg-[#0b111b] text-white">
                            Р’С‹Р±РµСЂРёС‚Рµ РїСЂРѕРІРёРЅС†РёСЋ
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
                        Р¦РІРµС‚ СЂС‹РЅРєР°
                        <input
                          type="color"
                          value={marketColorDraft}
                          onChange={(event) => setMarketColorDraft(event.target.value)}
                          disabled={!canEditOwnMarket}
                          className="h-9 rounded-lg bg-black/40 border border-white/10 p-1 disabled:opacity-60"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-white/70 text-sm">
                        Р›РѕРіРѕС‚РёРї СЂС‹РЅРєР°
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
                          РЎРѕС…СЂР°РЅРёС‚СЊ
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
                          РЈРґР°Р»РёС‚СЊ СЂС‹РЅРѕРє
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-white/85 text-sm font-semibold mb-2">РЈС‡Р°СЃС‚РЅРёРєРё СЂС‹РЅРєР°</div>
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
                                  РЈР±СЂР°С‚СЊ
                                </button>
                              ) : (
                                <span className="text-[11px] text-emerald-200/80">Р¦РµРЅС‚СЂ СЂС‹РЅРєР°</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-white/85 text-sm font-semibold mb-2">
                        РџСЂРёРіР»Р°С€РµРЅРёРµ СЃС‚СЂР°РЅ РґРѕРіРѕРІРѕСЂРѕРј
                      </div>
                      <div className="text-white/55 text-xs mb-3">
                        РќРѕРІС‹Рµ СЃС‚СЂР°РЅС‹ РґРѕР±Р°РІР»СЏСЋС‚СЃСЏ С‚РѕР»СЊРєРѕ С‡РµСЂРµР· РґРёРїР»РѕРјР°С‚РёС‡РµСЃРєРѕРµ РїСЂРµРґР»РѕР¶РµРЅРёРµ.
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
                                  {pending ? 'РЈР¶Рµ РѕС‚РїСЂР°РІР»РµРЅРѕ' : 'РџСЂРёРіР»Р°СЃРёС‚СЊ'}
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-white/50 text-sm">РќРµС‚ РґРѕСЃС‚СѓРїРЅС‹С… СЃС‚СЂР°РЅ РґР»СЏ РїСЂРёРіР»Р°С€РµРЅРёСЏ.</div>
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
                        <table className="min-w-[1140px] w-full text-xs">
                          <thead className="bg-black/45 text-white/70">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium">#</th>
                              <th className="text-left px-3 py-2 font-medium">Товар</th>
                              <th className="text-right px-3 py-2 font-medium">Объем рынка</th>
                              <th className="text-right px-3 py-2 font-medium">Мировой объем</th>
                              <th className="text-right px-3 py-2 font-medium">Доля рынка</th>
                              <th className="text-right px-3 py-2 font-medium">Поставщики</th>
                              <th className="text-right px-3 py-2 font-medium">Индекс цены</th>
                              <th className="text-right px-3 py-2 font-medium">Склад</th>
                              <th className="text-center px-3 py-2 font-medium">Ликвидность</th>
                              <th className="text-right px-3 py-2 font-medium">Операции</th>
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
                                <td className="px-3 py-2 text-right text-emerald-200">
                                  {row.marketSupply.toFixed(0)}
                                </td>
                                <td className="px-3 py-2 text-right text-white/70">
                                  {row.worldSupply.toFixed(0)}
                                </td>
                                <td className="px-3 py-2 text-right text-sky-200">
                                  {row.marketShare.toFixed(1)}%
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


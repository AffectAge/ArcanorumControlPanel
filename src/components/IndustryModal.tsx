import { X, Hammer, Factory, MapPin, Building, Trash2, Hammer as HammerIcon, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  BuildingDefinition,
  Country,
  ProvinceRecord,
  Company,
  Industry,
} from '../types';

type IndustryModalProps = {
  open: boolean;
  provinces: ProvinceRecord;
  buildings: BuildingDefinition[];
  industries: Industry[];
  countries: Country[];
  companies: Company[];
  activeCountryId?: string;
  activeCountryPoints: number;
  demolitionCostPercent: number;
  onOpenConstruction: (provinceId: string) => void;
  onChangeOwner: (
    provinceId: string,
    kind: 'built' | 'construction',
    buildingId: string,
    index: number,
    owner:
      | { type: 'state'; countryId: string }
      | { type: 'company'; companyId: string },
  ) => void;
  onCancelConstruction: (provinceId: string, buildingId: string, index: number) => void;
  onDemolish: (provinceId: string, buildingId: string) => void;
  onClose: () => void;
};

const getBuildingName = (
  buildings: BuildingDefinition[],
  id: string,
): string => buildings.find((item) => item.id === id)?.name ?? id;

export default function IndustryModal({
  open,
  provinces,
  buildings,
  industries,
  countries,
  companies,
  activeCountryId,
  activeCountryPoints,
  demolitionCostPercent,
  onOpenConstruction,
  onChangeOwner,
  onCancelConstruction,
  onDemolish,
  onClose,
}: IndustryModalProps) {
  if (!open) return null;

  const rows = Object.values(provinces).filter(
    (province) => province.ownerCountryId === activeCountryId,
  );
  const [filterBuildingId, setFilterBuildingId] = useState('');
  const [filterProvinceId, setFilterProvinceId] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterCompanyCountryId, setFilterCompanyCountryId] = useState('');
  const [filterIndustryId, setFilterIndustryId] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'construction' | 'built'>('all');
  const [sortBy, setSortBy] = useState<'building' | 'province' | 'company' | 'industry'>(
    'building',
  );
  const [confirmTarget, setConfirmTarget] = useState<{
    provinceId: string;
    buildingId: string;
    buildingName: string;
    cost: number;
  } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    provinceId: string;
    buildingId: string;
    buildingName: string;
    index: number;
  } | null>(null);

  const [ownerEditor, setOwnerEditor] = useState<{
    key: string;
    provinceId: string;
    kind: 'built' | 'construction';
    buildingId: string;
    index: number;
    type: 'state' | 'company';
    countryId: string;
    companyId: string;
  } | null>(null);

  const cards = useMemo(() => {
    const builtCards = rows.flatMap((province) =>
      (province.buildingsBuilt ?? []).map((entry, index) => ({
        key: `${province.id}-${entry.buildingId}-built-${index}`,
        kind: 'built' as const,
        index,
        provinceId: province.id,
        buildingId: entry.buildingId,
        owner: entry.owner,
        countryId: province.ownerCountryId,
        progress: undefined as number | undefined,
      })),
    );

    const constructionCards = rows.flatMap((province) =>
      Object.entries(province.constructionProgress ?? {}).flatMap(
        ([buildingId, entries]) =>
          entries.map((entry, index) => ({
            key: `${province.id}-${buildingId}-progress-${index}`,
            kind: 'construction' as const,
            index,
            provinceId: province.id,
            buildingId,
            owner: entry.owner,
            countryId: province.ownerCountryId,
            progress: entry.progress,
          })),
      ),
    );

    const emptyCards = rows
      .filter((province) => {
        if (!filterProvinceId) return false;
        if (province.id !== filterProvinceId) return false;
        const builtCount = province.buildingsBuilt?.length ?? 0;
        const progressCount = Object.values(
          province.constructionProgress ?? {},
        ).reduce((sum, entries) => sum + entries.length, 0);
        return builtCount === 0 && progressCount === 0;
      })
      .map((province) => ({
        key: `${province.id}-empty`,
        kind: 'empty' as const,
        index: -1,
        provinceId: province.id,
        buildingId: '',
        owner: undefined,
        countryId: province.ownerCountryId,
        progress: undefined as number | undefined,
      }));

    return [...builtCards, ...constructionCards, ...emptyCards];
  }, [rows, filterProvinceId]);

  const filteredCards = useMemo(() => {
    const filtered = cards.filter((card) => {
      if (filterBuildingId && card.buildingId !== filterBuildingId) return false;
      if (filterProvinceId && card.provinceId !== filterProvinceId) return false;
      if (card.kind === 'empty') {
        if (!filterProvinceId || card.provinceId !== filterProvinceId) return false;
        if (filterBuildingId || filterCompanyId || filterCompanyCountryId || filterIndustryId) {
          return false;
        }
        if (filterStatus !== 'all') return false;
        return true;
      }
      if (filterCompanyId) {
        if (card.owner.type !== 'company') return false;
        if (card.owner.companyId !== filterCompanyId) return false;
      }
      if (filterCompanyCountryId) {
        if (card.owner.type !== 'company') return false;
        const company = companies.find((c) => c.id === card.owner.companyId);
        if (!company || company.countryId !== filterCompanyCountryId) return false;
      }
      if (filterIndustryId) {
        const building = buildings.find((b) => b.id === card.buildingId);
        if (!building || building.industryId !== filterIndustryId) return false;
      }
      if (filterStatus !== 'all' && card.kind !== filterStatus) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'province') {
        return a.provinceId.localeCompare(b.provinceId);
      }
      if (sortBy === 'company') {
        const aOwnerName =
          a.owner.type === 'company'
            ? companies.find((c) => c.id === a.owner.companyId)?.name ?? ''
            : countries.find((c) => c.id === a.owner.countryId)?.name ?? '';
        const bOwnerName =
          b.owner.type === 'company'
            ? companies.find((c) => c.id === b.owner.companyId)?.name ?? ''
            : countries.find((c) => c.id === b.owner.countryId)?.name ?? '';
        return (
          aOwnerName.localeCompare(bOwnerName) ||
          a.buildingId.localeCompare(b.buildingId) ||
          a.provinceId.localeCompare(b.provinceId)
        );
      }
      if (sortBy === 'industry') {
        const aIndustryName =
          industries.find(
            (i) => i.id === buildings.find((b) => b.id === a.buildingId)?.industryId,
          )?.name ?? '';
        const bIndustryName =
          industries.find(
            (i) => i.id === buildings.find((b) => b.id === b.buildingId)?.industryId,
          )?.name ?? '';
        return (
          aIndustryName.localeCompare(bIndustryName) ||
          a.buildingId.localeCompare(b.buildingId) ||
          a.provinceId.localeCompare(b.provinceId)
        );
      }
      return (
        a.buildingId.localeCompare(b.buildingId) ||
        a.provinceId.localeCompare(b.provinceId)
      );
    });
  }, [
    cards,
    filterBuildingId,
    filterProvinceId,
    filterCompanyId,
    filterCompanyCountryId,
    filterIndustryId,
    filterStatus,
    sortBy,
    companies,
    buildings,
  ]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-4 rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0e1523]">
          <div>
            <h2 className="text-white text-lg font-semibold">Индустрия</h2>
            <p className="text-white/60 text-xs mt-1">
              Все построенные здания по провинциям
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button
                onClick={() => {
                  if (filterProvinceId) onOpenConstruction(filterProvinceId);
                }}
                disabled={!filterProvinceId}
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                  filterProvinceId
                    ? 'bg-black/40 border-white/10 text-white/60 hover:border-emerald-400/50 hover:text-emerald-300'
                    : 'bg-black/30 border-white/5 text-white/30 cursor-not-allowed'
                }`}
              >
                <HammerIcon className="w-4 h-4" />
              </button>
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 backdrop-blur-xl rounded-lg border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Строительство
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-emerald-400/50 hover:bg-emerald-400/10 transition-all"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3 flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <label className="flex flex-col gap-2 text-white/70 text-xs">
              Фильтр по зданию
              <select
                value={filterBuildingId}
                onChange={(event) => setFilterBuildingId(event.target.value)}
                className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
              >
                <option value="" className="bg-[#0b111b] text-white">
                  Все здания
                </option>
                {buildings.map((building) => (
                  <option
                    key={building.id}
                    value={building.id}
                    className="bg-[#0b111b] text-white"
                  >
                    {building.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-white/70 text-xs">
              Фильтр по провинции
              <select
                value={filterProvinceId}
                onChange={(event) => setFilterProvinceId(event.target.value)}
                className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
              >
                <option value="" className="bg-[#0b111b] text-white">
                  Все провинции
                </option>
                {rows.map((province) => (
                  <option
                    key={province.id}
                    value={province.id}
                    className="bg-[#0b111b] text-white"
                  >
                    {province.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-white/70 text-xs">
              Фильтр по компании
              <select
                value={filterCompanyId}
                onChange={(event) => setFilterCompanyId(event.target.value)}
                className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
              >
                <option value="" className="bg-[#0b111b] text-white">
                  Все владельцы
                </option>
                <option value="state" className="bg-[#0b111b] text-white" disabled>
                  Государство
                </option>
                {companies.map((company) => (
                  <option
                    key={company.id}
                    value={company.id}
                    className="bg-[#0b111b] text-white"
                  >
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-white/70 text-xs">
              Фильтр по стране компании
              <select
                value={filterCompanyCountryId}
                onChange={(event) => setFilterCompanyCountryId(event.target.value)}
                className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
              >
                <option value="" className="bg-[#0b111b] text-white">
                  Все страны
                </option>
                {countries.map((country) => (
                  <option
                    key={country.id}
                    value={country.id}
                    className="bg-[#0b111b] text-white"
                  >
                    {country.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-white/70 text-xs">
              Фильтр по отрасли
              <select
                value={filterIndustryId}
                onChange={(event) => setFilterIndustryId(event.target.value)}
                className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
              >
                <option value="" className="bg-[#0b111b] text-white">
                  Все отрасли
                </option>
                {industries.map((industry) => (
                  <option
                    key={industry.id}
                    value={industry.id}
                    className="bg-[#0b111b] text-white"
                  >
                    {industry.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-white/70 text-xs">
              Статус
              <select
                value={filterStatus}
                onChange={(event) =>
                  setFilterStatus(
                    event.target.value as 'all' | 'construction' | 'built',
                  )
                }
                className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
              >
                <option value="all" className="bg-[#0b111b] text-white">
                  Все
                </option>
                <option value="construction" className="bg-[#0b111b] text-white">
                  Только строящиеся
                </option>
                <option value="built" className="bg-[#0b111b] text-white">
                  Только построенные
                </option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 text-white/60 text-xs">
            <div>
              Всего
              {filterProvinceId ? ` (${filterProvinceId})` : ''}: {filteredCards.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFilterBuildingId('');
                  setFilterProvinceId('');
                  setFilterCompanyId('');
                  setFilterCompanyCountryId('');
                  setFilterIndustryId('');
                  setFilterStatus('all');
                }}
                className="h-8 px-3 rounded-lg border border-white/10 bg-black/40 text-white/60 text-xs hover:border-emerald-400/40 hover:text-emerald-300"
              >
                Сбросить фильтры
              </button>
              <label className="flex items-center gap-2">
                Сортировка
                <select
                  value={sortBy}
                  onChange={(event) =>
                  setSortBy(
                    event.target.value as 'building' | 'province' | 'company' | 'industry',
                  )
                }
                className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
              >
                <option value="building" className="bg-[#0b111b] text-white">
                  По зданию
                </option>
                <option value="province" className="bg-[#0b111b] text-white">
                  По провинции
                </option>
                <option value="company" className="bg-[#0b111b] text-white">
                  По владельцу
                </option>
                <option value="industry" className="bg-[#0b111b] text-white">
                  По отрасли
                </option>
              </select>
            </label>
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto pr-1 legend-scroll flex-1 min-h-0">
            {rows.length === 0 && (
              <div className="text-white/50 text-sm border border-dashed border-white/10 rounded-xl p-4">
                Нет провинций.
              </div>
            )}
            {rows.length > 0 && cards.length === 0 && (
              <div className="text-white/50 text-sm border border-dashed border-white/10 rounded-xl p-4">
                Нет построенных зданий.
              </div>
            )}

            {filteredCards.length === 0 && cards.length > 0 && (
              <div className="text-white/50 text-sm border border-dashed border-white/10 rounded-xl p-4">
                По выбранным фильтрам ничего не найдено.
              </div>
            )}

            {filteredCards.length > 0 && !filterProvinceId && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 legend-scroll">
                {Array.from(
                  filteredCards.reduce((map, card) => {
                    if (card.kind === 'empty') return map;
                    const list = map.get(card.provinceId) ?? [];
                    list.push(card);
                    map.set(card.provinceId, list);
                    return map;
                  }, new Map<string, typeof filteredCards>()),
                ).map(([provinceId, provinceCards]) => (
                  <div key={provinceId} className="space-y-3">
                    <div className="px-3 py-2 rounded-lg border border-white/10 bg-black/40 text-white/70 text-xs">
                      {provinceId}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {provinceCards.map((card) => {
                        if (card.kind === 'empty') return null;
                        const isEditing = ownerEditor?.key === card.key;
                        const building = buildings.find((b) => b.id === card.buildingId);
                        const country = countries.find((c) => c.id === card.countryId);
                        const baseCost = Math.max(1, building?.cost ?? 1);
                        const demolishCost = Math.ceil(
                          (baseCost * (demolitionCostPercent ?? 0)) / 100,
                        );
                        const progressPercent =
                          card.kind === 'construction'
                            ? Math.min(
                                100,
                                Math.round(((card.progress ?? 0) / baseCost) * 100),
                              )
                            : 100;
                        const ownerCountry =
                          card.owner.type === 'state'
                            ? countries.find((c) => c.id === card.owner.countryId)
                            : undefined;
                        const ownerLabel =
                          card.owner.type === 'state'
                            ? ownerCountry?.name ?? 'Государство'
                            : companies.find((c) => c.id === card.owner.companyId)
                                ?.name ?? 'Компания';
                        const ownerLogo =
                          card.owner.type === 'state'
                            ? ownerCountry?.flagDataUrl
                            : companies.find((c) => c.id === card.owner.companyId)
                                ?.iconDataUrl;
                        const industry = industries.find(
                          (item) => item.id === building?.industryId,
                        );

                        return (
                          <div
                            key={card.key}
                            className={`rounded-2xl border bg-gradient-to-br from-white/5 to-transparent p-4 flex flex-col gap-4 shadow-lg shadow-black/30 ${
                              card.kind === 'construction'
                                ? 'border-amber-400/50'
                                : 'border-white/10'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {building?.iconDataUrl ? (
                                  <img
                                    src={building.iconDataUrl}
                                    alt=""
                                    className="w-12 h-12 rounded-lg object-cover border border-white/10"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center">
                                    <Factory className="w-5 h-5 text-white/60" />
                                  </div>
                                )}
                                <div>
                                  <div className="text-white/80 text-sm font-semibold">
                                    {building?.name ?? card.buildingId}
                                  </div>
                                  <div className="text-white/40 text-xs">
                                    Стоимость: {Math.max(1, building?.cost ?? 1)}
                                  </div>
                                  {card.kind === 'construction' && (
                                    <div className="mt-2">
                                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                          className="h-full bg-emerald-400/70"
                                          style={{ width: `${progressPercent}%` }}
                                        />
                                      </div>
                                      <div className="text-white/50 text-[11px] mt-1">
                                        Прогресс: {progressPercent}%
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {card.kind === 'construction' && (
                                  <button
                                    onClick={() =>
                                      setCancelTarget({
                                        provinceId: card.provinceId,
                                        buildingId: card.buildingId,
                                        buildingName:
                                          building?.name ?? card.buildingId,
                                        index: card.index,
                                      })
                                    }
                                    className="w-9 h-9 rounded-lg border border-white/10 bg-black/40 text-white/60 hover:border-red-400/40 hover:text-red-300 flex items-center justify-center"
                                    title="Отменить строительство"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                                {card.kind === 'built' && (
                                  <button
                                    onClick={() => {
                                      setConfirmTarget({
                                        provinceId: card.provinceId,
                                        buildingId: card.buildingId,
                                        buildingName:
                                          building?.name ?? card.buildingId,
                                        cost: demolishCost,
                                      });
                                    }}
                                    className="w-9 h-9 rounded-lg border border-white/10 bg-black/40 text-white/60 hover:border-red-400/40 hover:text-red-300 flex items-center justify-center"
                                    title="Снести"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 text-white/60 text-xs">
                              {industry && (
                                <div className="flex items-center gap-2">
                                  <Factory className="w-3.5 h-3.5" />
                                  <span className="text-white/40">Отрасль:</span>
                                  <span className="flex items-center gap-2">
                                    {industry.iconDataUrl ? (
                                      <img
                                        src={industry.iconDataUrl}
                                        alt=""
                                        className="w-4 h-4 object-contain"
                                      />
                                    ) : (
                                      <Factory className="w-3.5 h-3.5 text-white/50" />
                                    )}
                                    {industry.name}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="text-white/40">Провинция:</span>
                                <span>{card.provinceId}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Building className="w-3.5 h-3.5" />
                                <span className="text-white/40">Страна:</span>
                                <span>{country?.name ?? '—'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Factory className="w-3.5 h-3.5" />
                                <span className="text-white/40">Владелец:</span>
                                <button
                                  onClick={() =>
                                    setOwnerEditor({
                                      key: card.key,
                                      provinceId: card.provinceId,
                                      kind: card.kind,
                                      buildingId: card.buildingId,
                                      index: card.index,
                                      type: card.owner.type,
                                      countryId:
                                        card.owner.type === 'state'
                                          ? card.owner.countryId
                                          : countries[0]?.id ?? '',
                                      companyId:
                                        card.owner.type === 'company'
                                          ? card.owner.companyId
                                          : companies[0]?.id ?? '',
                                    })
                                  }
                                  className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-white/70 hover:border-emerald-400/40"
                                  title="Изменить владельца"
                                >
                                  {ownerLogo && (
                                    <img
                                      src={ownerLogo}
                                      alt=""
                                      className="w-4 h-4 rounded object-cover border border-white/10"
                                    />
                                  )}
                                  {ownerLabel}
                                </button>
                              </div>
                            </div>
                            {isEditing && ownerEditor && (
                              <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-3 text-xs text-white/70">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setOwnerEditor({ ...ownerEditor, type: 'state' })
                                    }
                                    className={`px-2 h-7 rounded-lg border ${
                                      ownerEditor.type === 'state'
                                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                                        : 'bg-black/30 border-white/10 text-white/60 hover:border-emerald-400/40'
                                    }`}
                                  >
                                    Государство
                                  </button>
                                  <button
                                    onClick={() =>
                                      setOwnerEditor({ ...ownerEditor, type: 'company' })
                                    }
                                    className={`px-2 h-7 rounded-lg border ${
                                      ownerEditor.type === 'company'
                                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                                        : 'bg-black/30 border-white/10 text-white/60 hover:border-emerald-400/40'
                                    }`}
                                  >
                                    Компания
                                  </button>
                                </div>
                                {ownerEditor.type === 'state' && (
                                  <select
                                    value={ownerEditor.countryId}
                                    onChange={(event) =>
                                      setOwnerEditor({
                                        ...ownerEditor,
                                        countryId: event.target.value,
                                      })
                                    }
                                    className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                                  >
                                    {countries.map((country) => (
                                      <option
                                        key={country.id}
                                        value={country.id}
                                        className="bg-[#0b111b] text-white"
                                      >
                                        {country.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {ownerEditor.type === 'company' && (
                                  <select
                                    value={ownerEditor.companyId}
                                    onChange={(event) =>
                                      setOwnerEditor({
                                        ...ownerEditor,
                                        companyId: event.target.value,
                                      })
                                    }
                                    className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                                  >
                                    {companies.map((company) => (
                                      <option
                                        key={company.id}
                                        value={company.id}
                                        className="bg-[#0b111b] text-white"
                                      >
                                        {company.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setOwnerEditor(null)}
                                    className="h-8 px-3 rounded-lg border border-white/10 bg-black/30 text-white/60 hover:border-emerald-400/40"
                                  >
                                    Отмена
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (
                                        ownerEditor.type === 'state' &&
                                        ownerEditor.countryId
                                      ) {
                                        onChangeOwner(
                                          ownerEditor.provinceId,
                                          ownerEditor.kind,
                                          ownerEditor.buildingId,
                                          ownerEditor.index,
                                          {
                                            type: 'state',
                                            countryId: ownerEditor.countryId,
                                          },
                                        );
                                      } else if (
                                        ownerEditor.type === 'company' &&
                                        ownerEditor.companyId
                                      ) {
                                        onChangeOwner(
                                          ownerEditor.provinceId,
                                          ownerEditor.kind,
                                          ownerEditor.buildingId,
                                          ownerEditor.index,
                                          {
                                            type: 'company',
                                            companyId: ownerEditor.companyId,
                                          },
                                        );
                                      }
                                      setOwnerEditor(null);
                                    }}
                                    className="h-8 px-3 rounded-lg border border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                                  >
                                    Сохранить
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredCards.length > 0 && filterProvinceId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto pr-1 legend-scroll">
                {filteredCards.map((card) => {
                  if (card.kind === 'empty') {
                    return (
                      <button
                        key={card.key}
                        onClick={() => onOpenConstruction(card.provinceId)}
                        className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 flex flex-col items-center justify-center gap-3 shadow-lg shadow-black/30 hover:border-emerald-400/40"
                        title="Открыть строительство"
                      >
                        <div className="w-12 h-12 rounded-xl border border-white/10 bg-black/30 flex items-center justify-center">
                          <Plus className="w-6 h-6 text-emerald-300" />
                        </div>
                        <div className="text-white/70 text-sm text-center">
                          {card.provinceId}
                        </div>
                        <div className="text-white/40 text-xs">
                          Нет построек
                        </div>
                      </button>
                    );
                  }

                  const building = buildings.find((b) => b.id === card.buildingId);
                  const industry = industries.find(
                    (item) => item.id === building?.industryId,
                  );
                  const country = countries.find((c) => c.id === card.countryId);
                  const ownerCountry =
                    card.owner.type === 'state'
                      ? countries.find((c) => c.id === card.owner.countryId)
                      : undefined;
                  const baseCost = Math.max(1, building?.cost ?? 1);
                  const demolishCost = Math.ceil(
                    (baseCost * (demolitionCostPercent ?? 0)) / 100,
                  );
                  const progressPercent =
                    card.kind === 'construction'
                      ? Math.min(100, Math.round(((card.progress ?? 0) / baseCost) * 100))
                      : 100;
                  const ownerLabel =
                    card.owner.type === 'state'
                      ? ownerCountry?.name ?? 'Государство'
                      : companies.find((c) => c.id === card.owner.companyId)?.name ??
                        'Компания';
                  const ownerLogo =
                    card.owner.type === 'state'
                      ? ownerCountry?.flagDataUrl
                      : companies.find((c) => c.id === card.owner.companyId)
                          ?.iconDataUrl;
                  const ownerColor =
                    card.owner.type === 'company'
                      ? companies.find((c) => c.id === card.owner.companyId)?.color
                      : undefined;
                  const isEditing = ownerEditor?.key === card.key;
                  return (
                    <div
                      key={card.key}
                      className={`rounded-2xl border bg-gradient-to-br from-white/5 to-transparent p-4 flex flex-col gap-4 shadow-lg shadow-black/30 ${
                        card.kind === 'construction'
                          ? 'border-amber-400/50'
                          : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                        {building?.iconDataUrl ? (
                          <img
                            src={building.iconDataUrl}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover border border-white/10"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center">
                            <Factory className="w-5 h-5 text-white/60" />
                          </div>
                        )}
                        <div>
                          <div className="text-white/80 text-sm font-semibold">
                            {building?.name ?? card.buildingId}
                          </div>
                          <div className="text-white/40 text-xs">
                            Стоимость: {Math.max(1, building?.cost ?? 1)}
                          </div>
                          {card.kind === 'construction' && (
                            <div className="mt-2">
                              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-400/70"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <div className="text-white/50 text-[11px] mt-1">
                                Прогресс: {progressPercent}%
                              </div>
                            </div>
                          )}
                        </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div />
                          {card.kind === 'construction' && (
                            <button
                              onClick={() =>
                                setCancelTarget({
                                  provinceId: card.provinceId,
                                  buildingId: card.buildingId,
                                  buildingName: building?.name ?? card.buildingId,
                                  index: card.index,
                                })
                              }
                              className="w-9 h-9 rounded-lg border border-white/10 bg-black/40 text-white/60 hover:border-red-400/40 hover:text-red-300 flex items-center justify-center"
                              title="Отменить строительство"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          {card.kind === 'built' && (
                            <button
                              onClick={() => {
                                setConfirmTarget({
                                  provinceId: card.provinceId,
                                  buildingId: card.buildingId,
                                  buildingName: building?.name ?? card.buildingId,
                                  cost: demolishCost,
                                });
                              }}
                              className="w-9 h-9 rounded-lg border border-white/10 bg-black/40 text-white/60 hover:border-red-400/40 hover:text-red-300 flex items-center justify-center"
                              title="Снести"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 text-white/60 text-xs">
                        {industry && (
                          <div className="flex items-center gap-2">
                            <Factory className="w-3.5 h-3.5" />
                            <span className="text-white/40">Отрасль:</span>
                            <span className="flex items-center gap-2">
                              {industry.iconDataUrl ? (
                                <img
                                  src={industry.iconDataUrl}
                                  alt=""
                                  className="w-4 h-4 object-contain"
                                />
                              ) : (
                                <Factory className="w-3.5 h-3.5 text-white/50" />
                              )}
                              {industry.name}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-white/40">Провинция:</span>
                          <span>{card.provinceId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5" />
                          <span className="text-white/40">Страна:</span>
                          <span>{country?.name ?? '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Factory className="w-3.5 h-3.5" />
                          <span className="text-white/40">Владелец:</span>
                            <button
                              onClick={() =>
                                setOwnerEditor({
                                  key: card.key,
                                  provinceId: card.provinceId,
                                  kind: card.kind,
                                  buildingId: card.buildingId,
                                  index: card.index,
                                  type: card.owner.type,
                                  countryId:
                                    card.owner.type === 'state'
                                      ? card.owner.countryId
                                    : countries[0]?.id ?? '',
                                companyId:
                                  card.owner.type === 'company'
                                    ? card.owner.companyId
                                    : companies[0]?.id ?? '',
                              })
                            }
                            className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-white/70 hover:border-emerald-400/40"
                            title="Изменить владельца"
                          >
                                  {ownerLogo ? (
                                    <img
                                      src={ownerLogo}
                                      alt=""
                                      className="w-4 h-4 rounded object-cover border border-white/10"
                                    />
                                  ) : ownerColor ? (
                                    <span
                                      className="w-4 h-4 rounded-full border border-white/10"
                                      style={{ backgroundColor: ownerColor }}
                                    />
                                  ) : null}
                            {ownerLabel}
                          </button>
                        </div>
                      </div>
                      {isEditing && ownerEditor && (
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-3 text-xs text-white/70">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setOwnerEditor({ ...ownerEditor, type: 'state' })
                              }
                              className={`px-2 h-7 rounded-lg border ${
                                ownerEditor.type === 'state'
                                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                                  : 'bg-black/30 border-white/10 text-white/60 hover:border-emerald-400/40'
                              }`}
                            >
                              Государство
                            </button>
                            <button
                              onClick={() =>
                                setOwnerEditor({ ...ownerEditor, type: 'company' })
                              }
                              className={`px-2 h-7 rounded-lg border ${
                                ownerEditor.type === 'company'
                                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                                  : 'bg-black/30 border-white/10 text-white/60 hover:border-emerald-400/40'
                              }`}
                            >
                              Компания
                            </button>
                          </div>

                          {ownerEditor.type === 'state' && (
                            <select
                              value={ownerEditor.countryId}
                              onChange={(event) =>
                                setOwnerEditor({
                                  ...ownerEditor,
                                  countryId: event.target.value,
                                })
                              }
                              className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                            >
                              {countries.map((country) => (
                                <option
                                  key={country.id}
                                  value={country.id}
                                  className="bg-[#0b111b] text-white"
                                >
                                  {country.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {ownerEditor.type === 'company' && (
                            <select
                              value={ownerEditor.companyId}
                              onChange={(event) =>
                                setOwnerEditor({
                                  ...ownerEditor,
                                  companyId: event.target.value,
                                })
                              }
                              className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                            >
                              {companies.map((company) => (
                                <option
                                  key={company.id}
                                  value={company.id}
                                  className="bg-[#0b111b] text-white"
                                >
                                  {company.name}
                                </option>
                              ))}
                            </select>
                          )}

                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setOwnerEditor(null)}
                              className="h-8 px-3 rounded-lg border border-white/10 bg-black/30 text-white/60 hover:border-emerald-400/40"
                            >
                              Отмена
                            </button>
                            <button
                              onClick={() => {
                                if (ownerEditor.type === 'state' && ownerEditor.countryId) {
                                  onChangeOwner(
                                    ownerEditor.provinceId,
                                    ownerEditor.kind,
                                    ownerEditor.buildingId,
                                    ownerEditor.index,
                                    {
                                      type: 'state',
                                      countryId: ownerEditor.countryId,
                                    },
                                  );
                                } else if (
                                  ownerEditor.type === 'company' &&
                                  ownerEditor.companyId
                                ) {
                                  onChangeOwner(
                                    ownerEditor.provinceId,
                                    ownerEditor.kind,
                                    ownerEditor.buildingId,
                                    ownerEditor.index,
                                    {
                                      type: 'company',
                                      companyId: ownerEditor.companyId,
                                    },
                                  );
                                }
                                setOwnerEditor(null);
                              }}
                              className="h-8 px-3 rounded-lg border border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                            >
                              Сохранить
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[420px] max-w-[92vw] rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="text-white/90 text-base font-semibold">
                Подтвердить снос
              </div>
              <button
                onClick={() => setConfirmTarget(null)}
                className="w-8 h-8 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center hover:border-red-400/50 hover:bg-red-400/10 transition-all"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm text-white/70">
              <div>
                Снести <span className="text-white">{confirmTarget.buildingName}</span>{' '}
                в провинции <span className="text-white">{confirmTarget.provinceId}</span>?
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1 text-xs">
                <div>Стоимость сноса: {confirmTarget.cost}</div>
                <div>Доступно очков строительства: {activeCountryPoints}</div>
              </div>
              {activeCountryPoints < confirmTarget.cost && (
                <div className="text-red-300 text-xs">
                  Недостаточно очков строительства для сноса.
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmTarget(null)}
                  className="h-9 px-4 rounded-lg border border-white/10 bg-black/30 text-white/60 hover:border-emerald-400/40"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    if (activeCountryPoints < confirmTarget.cost) return;
                    onDemolish(confirmTarget.provinceId, confirmTarget.buildingId);
                    setConfirmTarget(null);
                  }}
                  className="h-9 px-4 rounded-lg border border-red-400/40 bg-red-500/20 text-red-200 hover:bg-red-500/30 disabled:opacity-50"
                  disabled={activeCountryPoints < confirmTarget.cost}
                >
                  Снести
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[420px] max-w-[92vw] rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="text-white/90 text-base font-semibold">
                Отменить строительство
              </div>
              <button
                onClick={() => setCancelTarget(null)}
                className="w-8 h-8 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center hover:border-red-400/50 hover:bg-red-400/10 transition-all"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm text-white/70">
              <div>
                Отменить строительство{' '}
                <span className="text-white">{cancelTarget.buildingName}</span>{' '}
                в провинции{' '}
                <span className="text-white">{cancelTarget.provinceId}</span>?
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setCancelTarget(null)}
                  className="h-9 px-4 rounded-lg border border-white/10 bg-black/30 text-white/60 hover:border-emerald-400/40"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    onCancelConstruction(
                      cancelTarget.provinceId,
                      cancelTarget.buildingId,
                      cancelTarget.index,
                    );
                    setCancelTarget(null);
                  }}
                  className="h-9 px-4 rounded-lg border border-red-400/40 bg-red-500/20 text-red-200 hover:bg-red-500/30"
                >
                  Отменить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

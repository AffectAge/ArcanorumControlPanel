import { X, Hammer, Factory, MapPin, Building, Trash2, Hammer as HammerIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BuildingDefinition, Country, ProvinceRecord, Company } from '../types';

type IndustryModalProps = {
  open: boolean;
  provinces: ProvinceRecord;
  buildings: BuildingDefinition[];
  countries: Country[];
  companies: Company[];
  activeCountryId?: string;
  activeCountryPoints: number;
  demolitionCostPercent: number;
  onOpenConstruction: (provinceId: string) => void;
  onChangeOwner: (
    provinceId: string,
    builtIndex: number,
    owner:
      | { type: 'state'; countryId: string }
      | { type: 'company'; companyId: string },
  ) => void;
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
  countries,
  companies,
  activeCountryId,
  activeCountryPoints,
  demolitionCostPercent,
  onOpenConstruction,
  onChangeOwner,
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
  const [sortBy, setSortBy] = useState<'building' | 'province' | 'company'>(
    'building',
  );
  const [confirmTarget, setConfirmTarget] = useState<{
    provinceId: string;
    buildingId: string;
    buildingName: string;
    cost: number;
  } | null>(null);

  const [ownerEditor, setOwnerEditor] = useState<{
    key: string;
    provinceId: string;
    builtIndex: number;
    type: 'state' | 'company';
    countryId: string;
    companyId: string;
  } | null>(null);

  const cards = useMemo(
    () =>
      rows.flatMap((province) =>
        (province.buildingsBuilt ?? []).map((entry, index) => ({
          key: `${province.id}-${entry.buildingId}-${index}`,
          builtIndex: index,
          provinceId: province.id,
          buildingId: entry.buildingId,
          owner: entry.owner,
          countryId: province.ownerCountryId,
        })),
      ),
    [rows],
  );

  const filteredCards = useMemo(() => {
    const filtered = cards.filter((card) => {
      if (filterBuildingId && card.buildingId !== filterBuildingId) return false;
      if (filterProvinceId && card.provinceId !== filterProvinceId) return false;
      if (filterCompanyId) {
        if (card.owner.type !== 'company') return false;
        if (card.owner.companyId !== filterCompanyId) return false;
      }
      if (filterCompanyCountryId) {
        if (card.owner.type !== 'company') return false;
        const company = companies.find((c) => c.id === card.owner.companyId);
        if (!company || company.countryId !== filterCompanyCountryId) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'province') {
        return a.provinceId.localeCompare(b.provinceId);
      }
      if (sortBy === 'company') {
        const aOwner =
          a.owner.type === 'company'
            ? a.owner.companyId
            : 'state';
        const bOwner =
          b.owner.type === 'company'
            ? b.owner.companyId
            : 'state';
        return aOwner.localeCompare(bOwner);
      }
      return a.buildingId.localeCompare(b.buildingId);
    });
  }, [cards, filterBuildingId, filterProvinceId, filterCompanyId, sortBy]);

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
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-emerald-400/50 hover:bg-emerald-400/10 transition-all"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="p-4 space-y-3 flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          </div>

          <div className="flex items-center justify-between gap-3 text-white/60 text-xs">
            <div>Всего: {filteredCards.length}</div>
            <label className="flex items-center gap-2">
              Сортировка
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as 'building' | 'province' | 'company')
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
              </select>
            </label>
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

            {filteredCards.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCards.map((card) => {
                  const building = buildings.find((b) => b.id === card.buildingId);
                  const country = countries.find((c) => c.id === card.countryId);
                  const ownerCountry =
                    card.owner.type === 'state'
                      ? countries.find((c) => c.id === card.owner.countryId)
                      : undefined;
                  const baseCost = Math.max(1, building?.cost ?? 1);
                  const demolishCost = Math.ceil(
                    (baseCost * (demolitionCostPercent ?? 0)) / 100,
                  );
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
                  const isEditing = ownerEditor?.key === card.key;
                  return (
                    <div
                      key={card.key}
                      className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 flex flex-col gap-4 shadow-lg shadow-black/30"
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
                        </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative group">
                            <button
                              onClick={() => onOpenConstruction(card.provinceId)}
                              className="w-9 h-9 rounded-lg border border-white/10 bg-black/40 text-white/60 hover:border-emerald-400/40 hover:text-emerald-300 flex items-center justify-center"
                            >
                              <HammerIcon className="w-4 h-4" />
                            </button>
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 backdrop-blur-xl rounded-lg border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              Строительство
                            </div>
                          </div>
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
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 text-white/60 text-xs">
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
                                builtIndex: card.builtIndex,
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
                                if (ownerEditor.type === 'state' && ownerEditor.countryId) {
                                  onChangeOwner(
                                    ownerEditor.provinceId,
                                    ownerEditor.builtIndex,
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
                                    ownerEditor.builtIndex,
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
    </div>
  );
}

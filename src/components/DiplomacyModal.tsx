import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, Handshake } from 'lucide-react';
import type {
  Country,
  Industry,
  DiplomacyAgreement,
  ProvinceRecord,
  BuildingDefinition,
  Company,
  DiplomacyProposal,
} from '../types';

type DiplomacyModalProps = {
  open: boolean;
  countries: Country[];
  industries: Industry[];
  provinces: ProvinceRecord;
  buildings: BuildingDefinition[];
  companies: Company[];
  agreements: DiplomacyAgreement[];
  turn: number;
  activeCountryId?: string;
  onClose: () => void;
  onCreateProposal: (
    proposal: Omit<DiplomacyProposal, 'id' | 'createdTurn'>,
  ) => void;
  onDeleteAgreement: (id: string) => void;
};

export default function DiplomacyModal({
  open,
  countries,
  industries,
  provinces,
  buildings,
  companies,
  agreements,
  turn,
  activeCountryId,
  onClose,
  onCreateProposal,
  onDeleteAgreement,
}: DiplomacyModalProps) {
  const treatyTypes = [
    {
      id: 'build-rights',
      name: 'Право строительства',
      description: 'Компании и государства',
    },
  ];
  const [activeTreatyType, setActiveTreatyType] = useState(treatyTypes[0].id);
  const [allowState, setAllowState] = useState(true);
  const [allowCompanies, setAllowCompanies] = useState(true);
  const [allCompanies, setAllCompanies] = useState(true);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [hostId, setHostId] = useState('');
  const guestId = activeCountryId ?? '';
  const [reciprocal, setReciprocal] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(
    () => new Set(),
  );
  const [limitProvince, setLimitProvince] = useState<number | ''>(0);
  const [limitCountry, setLimitCountry] = useState<number | ''>(0);
  const [limitGlobal, setLimitGlobal] = useState<number | ''>(0);
  const [durationTurns, setDurationTurns] = useState<number | ''>(0);
  const [allBuildings, setAllBuildings] = useState(true);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [allProvinces, setAllProvinces] = useState(true);
  const [selectedProvinceIds, setSelectedProvinceIds] = useState<Set<string>>(
    () => new Set(),
  );
  const buildingIndustryMap = useMemo(() => {
    const map = new Map<string, string | undefined>();
    buildings.forEach((building) => map.set(building.id, building.industryId));
    return map;
  }, [buildings]);

  const companyCountryMap = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach((company) => map.set(company.id, company.countryId));
    return map;
  }, [companies]);
  const guestCompanies = useMemo(
    () => companies.filter((company) => company.countryId === guestId),
    [companies, guestId],
  );
  const hostProvinces = useMemo(
    () =>
      Object.values(provinces).filter(
        (province) => province.ownerCountryId === hostId,
      ),
    [provinces, hostId],
  );
  const hostProvinceIds = useMemo(
    () => hostProvinces.map((province) => province.id),
    [hostProvinces],
  );

  useEffect(() => {
    if (!open) return;
    if (countries.length === 0) return;
    if (!hostId) setHostId(countries[0].id);
  }, [open, countries, hostId]);

  useEffect(() => {
    if (!open) return;
    if (allCompanies) {
      setSelectedCompanyIds(new Set());
      return;
    }
    setSelectedCompanyIds((prev) => {
      if (!guestId) return prev;
      const allowed = new Set(
        companies.filter((c) => c.countryId === guestId).map((c) => c.id),
      );
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [open, allCompanies, guestId, companies]);
  useEffect(() => {
    if (!open) return;
    if (allBuildings) {
      setSelectedBuildingIds(new Set());
      return;
    }
    setSelectedBuildingIds((prev) => {
      const allowed = new Set(buildings.map((b) => b.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [open, allBuildings, buildings]);
  useEffect(() => {
    if (!open) return;
    if (allProvinces) {
      setSelectedProvinceIds(new Set());
      return;
    }
    setSelectedProvinceIds((prev) => {
      const allowed = new Set(hostProvinceIds);
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [open, allProvinces, hostProvinceIds]);

  if (!open) return null;

  const getAgreementUsage = (agreement: DiplomacyAgreement) => {
    let globalCount = 0;
    let hostCount = 0;
    const perProvince: Record<string, number> = {};

    const matchesAgreement = (
      owner: { type: 'state'; countryId: string } | { type: 'company'; companyId: string },
      buildingId: string,
      provinceOwnerId?: string,
      provinceId?: string,
    ) => {
      if (!provinceOwnerId || provinceOwnerId !== agreement.hostCountryId) return false;
      if (agreement.provinceIds && agreement.provinceIds.length > 0) {
        if (!provinceId || !agreement.provinceIds.includes(provinceId)) return false;
      }
      const allowsState = agreement.allowState ?? agreement.kind === 'state';
      const allowsCompanies =
        agreement.allowCompanies ?? agreement.kind === 'company';
      if (owner.type === 'state' && !allowsState) return false;
      if (owner.type === 'company' && !allowsCompanies) return false;
      const guestId =
        owner.type === 'state'
          ? owner.countryId
          : companyCountryMap.get(owner.companyId);
      if (!guestId || guestId !== agreement.guestCountryId) return false;
      if (
        owner.type === 'company' &&
        agreement.companyIds &&
        agreement.companyIds.length > 0 &&
        !agreement.companyIds.includes(owner.companyId)
      ) {
        return false;
      }
      if (agreement.buildingIds && agreement.buildingIds.length > 0) {
        if (!agreement.buildingIds.includes(buildingId)) return false;
      }
      if (agreement.industries && agreement.industries.length > 0) {
        const industryId = buildingIndustryMap.get(buildingId);
        if (!industryId || !agreement.industries.includes(industryId)) {
          return false;
        }
      }
      return true;
    };

    Object.values(provinces).forEach((province) => {
      const provinceOwnerId = province.ownerCountryId;
      if (!provinceOwnerId || provinceOwnerId !== agreement.hostCountryId) return;

      const built = province.buildingsBuilt ?? [];
      built.forEach((entry) => {
        if (
          matchesAgreement(
            entry.owner,
            entry.buildingId,
            provinceOwnerId,
            province.id,
          )
        ) {
          globalCount += 1;
          hostCount += 1;
          perProvince[province.id] = (perProvince[province.id] ?? 0) + 1;
        }
      });

      const construction = province.constructionProgress ?? {};
      Object.entries(construction).forEach(([buildingId, entries]) => {
        entries.forEach((entry) => {
          if (
            matchesAgreement(entry.owner, buildingId, provinceOwnerId, province.id)
          ) {
            globalCount += 1;
            hostCount += 1;
            perProvince[province.id] = (perProvince[province.id] ?? 0) + 1;
          }
        });
      });
    });

    const maxPerProvince = Object.values(perProvince).reduce(
      (acc, value) => Math.max(acc, value),
      0,
    );

    return {
      perProvince: maxPerProvince,
      perCountry: hostCount,
      global: globalCount,
    };
  };

  const handleAdd = () => {
    if (!hostId || !guestId) return;
    if (hostId === guestId) return;
    if (!allowState && !allowCompanies) return;
    if (allowCompanies && !allCompanies && selectedCompanyIds.size === 0) return;
    onCreateProposal({
      fromCountryId: guestId,
      toCountryId: hostId,
      agreement: {
        hostCountryId: hostId,
        guestCountryId: guestId,
        allowState,
        allowCompanies,
        companyIds:
          allowCompanies && !allCompanies
            ? Array.from(selectedCompanyIds)
            : undefined,
        buildingIds:
          !allBuildings && selectedBuildingIds.size > 0
            ? Array.from(selectedBuildingIds)
            : undefined,
        provinceIds:
          !allProvinces && selectedProvinceIds.size > 0
            ? Array.from(selectedProvinceIds)
            : undefined,
        industries:
          selectedIndustries.size > 0 ? Array.from(selectedIndustries) : undefined,
        limits: {
          perProvince:
            limitProvince === '' || Number(limitProvince) <= 0
              ? undefined
              : Math.max(0, Number(limitProvince)),
          perCountry:
            limitCountry === '' || Number(limitCountry) <= 0
              ? undefined
              : Math.max(0, Number(limitCountry)),
          global:
            limitGlobal === '' || Number(limitGlobal) <= 0
              ? undefined
              : Math.max(0, Number(limitGlobal)),
        },
        durationTurns:
          durationTurns === '' || Number(durationTurns) <= 0
            ? undefined
            : Math.max(1, Number(durationTurns)),
      },
      reciprocal,
    });
    setSelectedIndustries(new Set());
    setLimitProvince(0);
    setLimitCountry(0);
    setLimitGlobal(0);
    setReciprocal(false);
    setAllCompanies(true);
    setSelectedCompanyIds(new Set());
    setAllBuildings(true);
    setSelectedBuildingIds(new Set());
    setAllProvinces(true);
    setSelectedProvinceIds(new Set());
    setDurationTurns(0);
  };

  const canAddAgreement =
    Boolean(hostId && guestId && hostId !== guestId) &&
    (allowState || allowCompanies) &&
    (!allowCompanies || allCompanies || selectedCompanyIds.size > 0) &&
    (allBuildings || selectedBuildingIds.size > 0) &&
    (allProvinces || selectedProvinceIds.size > 0);

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-4 rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-white/10 bg-black/40 flex items-center justify-center">
              <Handshake className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <div className="text-white text-lg font-semibold">Дипломатия</div>
              <div className="text-white/60 text-sm">
                Соглашения о праве строительства
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

        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 border-r border-white/10 p-4 space-y-3">
            <div className="text-white/70 text-xs uppercase tracking-wide">
              Типы договоров
            </div>
            <div className="space-y-2">
              {treatyTypes.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTreatyType(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    activeTreatyType === item.id
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
                  }`}
                >
                  <div className="text-white/80">{item.name}</div>
                  <div className="text-white/40 text-[11px]">{item.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto legend-scroll">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6">
              <div className="text-white/80 text-sm font-semibold mb-2">
                Как работают договоры
              </div>
              <div className="text-white/60 text-xs leading-relaxed">
                Договор даёт право строить в провинциях страны-хозяина. Тип
                определяет, кто строит: компании или государство. Ограничения
                считают построенные здания и активные стройки.
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="text-white/80 text-sm font-semibold">Новое соглашение</div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="text-white/70 text-sm">Разрешить строить</div>
                  <label className="flex items-center gap-2 text-white/70 text-sm">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-emerald-500"
                      checked={allowState}
                      onChange={(event) => setAllowState(event.target.checked)}
                    />
                    Государству
                  </label>
                  <label className="flex items-center gap-2 text-white/70 text-sm">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-emerald-500"
                      checked={allowCompanies}
                      onChange={(event) => setAllowCompanies(event.target.checked)}
                    />
                    Компаниям
                  </label>
                  {allowCompanies && (
                    <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
                      <label className="flex items-center gap-2 text-white/70 text-xs">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-emerald-500"
                          checked={allCompanies}
                          onChange={(event) => setAllCompanies(event.target.checked)}
                        />
                        Все компании страны-гостя
                      </label>
                      {!allCompanies && (
                        <div className="max-h-32 overflow-y-auto legend-scroll space-y-2 pr-1">
                          {guestCompanies.length > 0 ? (
                            guestCompanies.map((company) => (
                              <label
                                key={company.id}
                                className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-white/70 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-emerald-500"
                                  checked={selectedCompanyIds.has(company.id)}
                                  onChange={(event) =>
                                    setSelectedCompanyIds((prev) => {
                                      const next = new Set(prev);
                                      if (event.target.checked) {
                                        next.add(company.id);
                                      } else {
                                        next.delete(company.id);
                                      }
                                      return next;
                                    })
                                  }
                                />
                                {company.iconDataUrl ? (
                                  <img
                                    src={company.iconDataUrl}
                                    alt=""
                                    className="w-4 h-4 rounded object-cover border border-white/10"
                                  />
                                ) : (
                                  <span className="w-3 h-3 rounded-full border border-white/10 bg-white/20" />
                                )}
                                <span>{company.name}</span>
                              </label>
                            ))
                          ) : (
                            <div className="text-white/40 text-xs">
                              Нет компаний этой страны
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-white/70 text-sm">
                    Страна-хозяин
                    <select
                      value={hostId}
                      onChange={(event) => setHostId(event.target.value)}
                      className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
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
                  </label>
                  <div className="flex flex-col gap-1 text-white/70 text-sm">
                    Страна-гость
                    <div className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs flex items-center">
                      {countries.find((country) => country.id === guestId)?.name ??
                        'Страна не выбрана'}
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-white/70 text-sm">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-emerald-500"
                    checked={reciprocal}
                    onChange={(event) => setReciprocal(event.target.checked)}
                  />
                  Взаимное соглашение
                </label>
              </div>

              <div className="space-y-2">
                <div className="text-white/60 text-xs">Отрасли (пусто = все)</div>
                <div className="max-h-40 overflow-y-auto legend-scroll space-y-2 pr-1">
                  {industries.length > 0 ? (
                    industries.map((industry) => (
                      <label
                        key={industry.id}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white/70 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIndustries.has(industry.id)}
                          onChange={(event) =>
                            setSelectedIndustries((prev) => {
                              const next = new Set(prev);
                              if (event.target.checked) {
                                next.add(industry.id);
                              } else {
                                next.delete(industry.id);
                              }
                              return next;
                            })
                          }
                          className="w-4 h-4 accent-emerald-500"
                        />
                        <span>{industry.name}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-white/40 text-xs">Нет отраслей</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-white/60 text-xs">Лимиты (0 = без лимита)</div>
                <div className="grid grid-cols-1 gap-2">
                  <label className="flex flex-col gap-1 text-[11px] text-white/50">
                    Провинция
                    <input
                      type="number"
                      min={0}
                      value={limitProvince}
                      onChange={(event) =>
                        setLimitProvince(
                          event.target.value === ''
                            ? ''
                            : Math.max(0, Number(event.target.value) || 0),
                        )
                      }
                      className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-white/50">
                    Государство
                    <input
                      type="number"
                      min={0}
                      value={limitCountry}
                      onChange={(event) =>
                        setLimitCountry(
                          event.target.value === ''
                            ? ''
                            : Math.max(0, Number(event.target.value) || 0),
                        )
                      }
                      className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-white/50">
                    Мир
                    <input
                      type="number"
                      min={0}
                      value={limitGlobal}
                      onChange={(event) =>
                        setLimitGlobal(
                          event.target.value === ''
                            ? ''
                            : Math.max(0, Number(event.target.value) || 0),
                        )
                      }
                      className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-white/60 text-xs">Здания</div>
                <label className="flex items-center gap-2 text-white/70 text-xs">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-emerald-500"
                    checked={allBuildings}
                    onChange={(event) => setAllBuildings(event.target.checked)}
                  />
                  Все здания
                </label>
                {!allBuildings && (
                  <div className="max-h-40 overflow-y-auto legend-scroll space-y-2 pr-1">
                    {buildings.length > 0 ? (
                      buildings.map((building) => (
                        <label
                          key={building.id}
                          className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white/70 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBuildingIds.has(building.id)}
                            onChange={(event) =>
                              setSelectedBuildingIds((prev) => {
                                const next = new Set(prev);
                                if (event.target.checked) {
                                  next.add(building.id);
                                } else {
                                  next.delete(building.id);
                                }
                                return next;
                              })
                            }
                            className="w-4 h-4 accent-emerald-500"
                          />
                          <span>{building.name}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-white/40 text-xs">Нет зданий</div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-white/60 text-xs">Провинции</div>
                <label className="flex items-center gap-2 text-white/70 text-xs">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-emerald-500"
                    checked={allProvinces}
                    onChange={(event) => setAllProvinces(event.target.checked)}
                  />
                  Все провинции страны-хозяина
                </label>
                {!allProvinces && (
                  <div className="max-h-40 overflow-y-auto legend-scroll space-y-2 pr-1">
                    {hostProvinces.length > 0 ? (
                      hostProvinces.map((province) => (
                        <label
                          key={province.id}
                          className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white/70 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProvinceIds.has(province.id)}
                            onChange={(event) =>
                              setSelectedProvinceIds((prev) => {
                                const next = new Set(prev);
                                if (event.target.checked) {
                                  next.add(province.id);
                                } else {
                                  next.delete(province.id);
                                }
                                return next;
                              })
                            }
                            className="w-4 h-4 accent-emerald-500"
                          />
                          <span>{province.id}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-white/40 text-xs">
                        Нет провинций у страны-хозяина
                      </div>
                    )}
                  </div>
                )}
              </div>
              <label className="flex flex-col gap-2 text-white/70 text-sm">
                Срок действия (ходов, 0 = бессрочно)
                <input
                  type="number"
                  min={0}
                  value={durationTurns}
                  onChange={(event) =>
                    setDurationTurns(
                      event.target.value === ''
                        ? ''
                        : Math.max(0, Number(event.target.value) || 0),
                    )
                  }
                  className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
                />
              </label>

              <button
                onClick={handleAdd}
                disabled={!canAddAgreement}
                className={`h-9 px-3 rounded-lg border text-sm flex items-center gap-2 ${
                  canAddAgreement
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                    : 'bg-black/30 border-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
                Отправить
              </button>
            </div>

              <div className="space-y-3">
                {agreements.length > 0 ? (
                  agreements.map((agreement) => {
                    const host = countries.find((c) => c.id === agreement.hostCountryId);
                    const guest = countries.find((c) => c.id === agreement.guestCountryId);
                    const industryNames = agreement.industries?.length
                      ? agreement.industries
                          .map(
                            (id) => industries.find((item) => item.id === id)?.name ?? id,
                          )
                          .join(', ')
                      : 'Все отрасли';
                    const perProvince = agreement.limits?.perProvince ?? 0;
                    const perCountry = agreement.limits?.perCountry ?? 0;
                    const global = agreement.limits?.global ?? 0;
                    const limitLabel = (value: number) =>
                      value && value > 0 ? value : '∞';
                    const usage = getAgreementUsage(agreement);
                    const durationLabel =
                      agreement.durationTurns && agreement.durationTurns > 0
                        ? `${agreement.durationTurns} ход.`
                        : 'Бессрочно';
                    const remainingTurns =
                      agreement.durationTurns &&
                      agreement.durationTurns > 0 &&
                      agreement.startTurn
                        ? Math.max(
                            0,
                            agreement.durationTurns - (turn - agreement.startTurn),
                          )
                        : null;
                    const resolvedAllowState =
                      agreement.allowState ?? agreement.kind === 'state';
                    const resolvedAllowCompanies =
                      agreement.allowCompanies ?? agreement.kind === 'company';
                    const allowedCompaniesLabel =
                      agreement.companyIds && agreement.companyIds.length > 0
                        ? agreement.companyIds
                            .map(
                              (id) =>
                                companies.find((item) => item.id === id)?.name ?? id,
                            )
                            .join(', ')
                        : 'Все компании';
                    const allowedBuildingsLabel =
                      agreement.buildingIds && agreement.buildingIds.length > 0
                        ? agreement.buildingIds
                            .map(
                              (id) => buildings.find((b) => b.id === id)?.name ?? id,
                            )
                            .join(', ')
                        : 'Все здания';
                    const allowedProvincesLabel =
                      agreement.provinceIds && agreement.provinceIds.length > 0
                        ? agreement.provinceIds.join(', ')
                        : 'Все провинции';
                    return (
                      <div
                        key={agreement.id}
                        className="rounded-xl border border-white/10 bg-black/30 p-4 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-2">
                          <div className="text-white/80 text-sm font-semibold">
                            {host?.name ?? agreement.hostCountryId} →{' '}
                            {guest?.name ?? agreement.guestCountryId}
                          </div>
                          <div className="text-white/50 text-xs">
                            Разрешено:{' '}
                            {resolvedAllowState ? 'Государство' : ''}
                            {resolvedAllowState && resolvedAllowCompanies ? ' + ' : ''}
                            {resolvedAllowCompanies ? 'Компании' : ''}
                          </div>
                          {resolvedAllowCompanies && (
                            <div className="text-white/50 text-xs">
                              Компании: {allowedCompaniesLabel}
                            </div>
                          )}
                          <div className="text-white/50 text-xs">
                            Здания: {allowedBuildingsLabel}
                          </div>
                          <div className="text-white/50 text-xs">
                            Провинции: {allowedProvincesLabel}
                          </div>
                          <div className="text-white/50 text-xs">
                            Отрасли: {industryNames}
                          </div>
                          <div className="text-white/50 text-xs">
                            Лимиты: Пров. {limitLabel(perProvince)} / Гос.{' '}
                            {limitLabel(perCountry)} / Мир {limitLabel(global)}
                          </div>
                          <div className="text-white/50 text-xs">
                            Срок: {durationLabel}
                          </div>
                          {remainingTurns != null && (
                            <div className="text-white/50 text-xs">
                              Осталось: {remainingTurns} ход.
                            </div>
                          )}
                          <div className="text-white/60 text-xs">
                            Использовано: Пров. {usage.perProvince} / Гос.{' '}
                            {usage.perCountry} / Мир {usage.global}
                          </div>
                        </div>
                        <button
                          onClick={() => onDeleteAgreement(agreement.id)}
                          className="w-9 h-9 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                        >
                          <Trash2 className="w-4 h-4 text-white/60" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-white/50 text-sm">Соглашений нет</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

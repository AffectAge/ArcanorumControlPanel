import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Handshake,
  Landmark,
  Briefcase,
  Clock,
  Hourglass,
} from 'lucide-react';
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
  proposals: DiplomacyProposal[];
  turn: number;
  activeCountryId?: string;
  onClose: () => void;
  onCreateProposal: (
    proposal: Omit<DiplomacyProposal, 'id' | 'createdTurn'>,
  ) => void;
  onDeleteAgreement: (id: string) => void;
  onWithdrawProposal: (id: string) => void;
};

export default function DiplomacyModal({
  open,
  countries,
  industries,
  provinces,
  buildings,
  companies,
  agreements,
  proposals,
  turn,
  activeCountryId,
  onClose,
  onCreateProposal,
  onDeleteAgreement,
  onWithdrawProposal,
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
  const [otherAllowState, setOtherAllowState] = useState(true);
  const [otherAllowCompanies, setOtherAllowCompanies] = useState(true);
  const [otherAllCompanies, setOtherAllCompanies] = useState(true);
  const [otherSelectedCompanyIds, setOtherSelectedCompanyIds] = useState<
    Set<string>
  >(() => new Set());
  const [otherSelectedIndustries, setOtherSelectedIndustries] = useState<
    Set<string>
  >(() => new Set());
  const [otherLimitProvince, setOtherLimitProvince] = useState<number | ''>(0);
  const [otherLimitCountry, setOtherLimitCountry] = useState<number | ''>(0);
  const [otherLimitGlobal, setOtherLimitGlobal] = useState<number | ''>(0);
  const [otherAllBuildings, setOtherAllBuildings] = useState(true);
  const [otherSelectedBuildingIds, setOtherSelectedBuildingIds] = useState<
    Set<string>
  >(() => new Set());
  const [otherAllProvinces, setOtherAllProvinces] = useState(true);
  const [otherSelectedProvinceIds, setOtherSelectedProvinceIds] = useState<
    Set<string>
  >(() => new Set());
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
  const hostCompanies = useMemo(
    () => companies.filter((company) => company.countryId === hostId),
    [companies, hostId],
  );
  const hostProvinces = useMemo(
    () =>
      Object.values(provinces).filter(
        (province) => province.ownerCountryId === hostId,
      ),
    [provinces, hostId],
  );
  const guestProvinces = useMemo(
    () =>
      Object.values(provinces).filter(
        (province) => province.ownerCountryId === guestId,
      ),
    [provinces, guestId],
  );
  const hostProvinceIds = useMemo(
    () => hostProvinces.map((province) => province.id),
    [hostProvinces],
  );
  const guestProvinceIds = useMemo(
    () => guestProvinces.map((province) => province.id),
    [guestProvinces],
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
    if (otherAllCompanies) {
      setOtherSelectedCompanyIds(new Set());
      return;
    }
    setOtherSelectedCompanyIds((prev) => {
      if (!hostId) return prev;
      const allowed = new Set(
        companies.filter((c) => c.countryId === hostId).map((c) => c.id),
      );
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [open, otherAllCompanies, hostId, companies]);
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
    if (otherAllBuildings) {
      setOtherSelectedBuildingIds(new Set());
      return;
    }
    setOtherSelectedBuildingIds((prev) => {
      const allowed = new Set(buildings.map((b) => b.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [open, otherAllBuildings, buildings]);
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
  useEffect(() => {
    if (!open) return;
    if (otherAllProvinces) {
      setOtherSelectedProvinceIds(new Set());
      return;
    }
    setOtherSelectedProvinceIds((prev) => {
      const allowed = new Set(guestProvinceIds);
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [open, otherAllProvinces, guestProvinceIds]);

  if (!open) return null;

  const getTermsUsage = (
    hostCountryId: string,
    guestCountryId: string,
    terms?: {
      kind?: 'company' | 'state';
      allowState?: boolean;
      allowCompanies?: boolean;
      companyIds?: string[];
      buildingIds?: string[];
      provinceIds?: string[];
      industries?: string[];
    },
  ) => {
    let globalCount = 0;
    let hostCount = 0;
    const perProvince: Record<string, number> = {};

    const matchesAgreement = (
      owner: { type: 'state'; countryId: string } | { type: 'company'; companyId: string },
      buildingId: string,
      provinceOwnerId?: string,
      provinceId?: string,
    ) => {
      if (!provinceOwnerId || provinceOwnerId !== hostCountryId) return false;
      if (terms?.provinceIds && terms.provinceIds.length > 0) {
        if (!provinceId || !terms.provinceIds.includes(provinceId)) return false;
      }
      const allowsState = terms?.allowState ?? terms?.kind === 'state';
      const allowsCompanies =
        terms?.allowCompanies ?? terms?.kind === 'company';
      if (owner.type === 'state' && !allowsState) return false;
      if (owner.type === 'company' && !allowsCompanies) return false;
      const guestId =
        owner.type === 'state'
          ? owner.countryId
          : companyCountryMap.get(owner.companyId);
      if (!guestId || guestId !== guestCountryId) return false;
      if (
        owner.type === 'company' &&
        terms?.companyIds &&
        terms.companyIds.length > 0 &&
        !terms.companyIds.includes(owner.companyId)
      ) {
        return false;
      }
      if (terms?.buildingIds && terms.buildingIds.length > 0) {
        if (!terms.buildingIds.includes(buildingId)) return false;
      }
      if (terms?.industries && terms.industries.length > 0) {
        const industryId = buildingIndustryMap.get(buildingId);
        if (!industryId || !terms.industries.includes(industryId)) {
          return false;
        }
      }
      return true;
    };

    Object.values(provinces).forEach((province) => {
      const provinceOwnerId = province.ownerCountryId;
      if (!provinceOwnerId || provinceOwnerId !== hostCountryId) return;

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
    if (!otherAllowState && !otherAllowCompanies) return;
    if (
      otherAllowCompanies &&
      !otherAllCompanies &&
      otherSelectedCompanyIds.size === 0
    ) {
      return;
    }
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
      counterAgreement: {
        hostCountryId: guestId,
        guestCountryId: hostId,
        allowState: otherAllowState,
        allowCompanies: otherAllowCompanies,
        companyIds:
          otherAllowCompanies && !otherAllCompanies
            ? Array.from(otherSelectedCompanyIds)
            : undefined,
        buildingIds:
          !otherAllBuildings && otherSelectedBuildingIds.size > 0
            ? Array.from(otherSelectedBuildingIds)
            : undefined,
        provinceIds:
          !otherAllProvinces && otherSelectedProvinceIds.size > 0
            ? Array.from(otherSelectedProvinceIds)
            : undefined,
        industries:
          otherSelectedIndustries.size > 0
            ? Array.from(otherSelectedIndustries)
            : undefined,
        limits: {
          perProvince:
            otherLimitProvince === '' || Number(otherLimitProvince) <= 0
              ? undefined
              : Math.max(0, Number(otherLimitProvince)),
          perCountry:
            otherLimitCountry === '' || Number(otherLimitCountry) <= 0
              ? undefined
              : Math.max(0, Number(otherLimitCountry)),
          global:
            otherLimitGlobal === '' || Number(otherLimitGlobal) <= 0
              ? undefined
              : Math.max(0, Number(otherLimitGlobal)),
        },
      },
    });
    setSelectedIndustries(new Set());
    setLimitProvince(0);
    setLimitCountry(0);
    setLimitGlobal(0);
    setAllCompanies(true);
    setSelectedCompanyIds(new Set());
    setAllBuildings(true);
    setSelectedBuildingIds(new Set());
    setAllProvinces(true);
    setSelectedProvinceIds(new Set());
    setDurationTurns(0);
    setOtherAllowState(true);
    setOtherAllowCompanies(true);
    setOtherAllCompanies(true);
    setOtherSelectedCompanyIds(new Set());
    setOtherSelectedIndustries(new Set());
    setOtherLimitProvince(0);
    setOtherLimitCountry(0);
    setOtherLimitGlobal(0);
    setOtherAllBuildings(true);
    setOtherSelectedBuildingIds(new Set());
    setOtherAllProvinces(true);
    setOtherSelectedProvinceIds(new Set());
  };

  const canAddAgreement =
    Boolean(hostId && guestId && hostId !== guestId) &&
    (allowState || allowCompanies) &&
    (!allowCompanies || allCompanies || selectedCompanyIds.size > 0) &&
    (allBuildings || selectedBuildingIds.size > 0) &&
    (allProvinces || selectedProvinceIds.size > 0) &&
    (otherAllowState || otherAllowCompanies) &&
    (!otherAllowCompanies ||
      otherAllCompanies ||
      otherSelectedCompanyIds.size > 0) &&
    (otherAllBuildings || otherSelectedBuildingIds.size > 0) &&
    (otherAllProvinces || otherSelectedProvinceIds.size > 0);

  const visibleAgreements = agreements.filter(
    (agreement) =>
      !activeCountryId ||
      agreement.hostCountryId === activeCountryId ||
      agreement.guestCountryId === activeCountryId,
  );
  const visibleProposals = proposals.filter(
    (proposal) => activeCountryId && proposal.fromCountryId === activeCountryId,
  );

  const items = [
    ...visibleProposals.map((proposal) => ({
      type: 'proposal' as const,
      id: proposal.id,
      agreement: proposal.agreement,
      counterAgreement: proposal.counterAgreement,
      createdTurn: proposal.createdTurn,
    })),
    ...visibleAgreements.map((agreement) => ({
      type: 'agreement' as const,
      id: agreement.id,
      agreement,
    })),
  ];

  const formatListSummary = (names: string[], allLabel: string) => {
    if (!names.length) return allLabel;
    const preview = names.slice(0, 3).join(', ');
    const suffix = names.length > 3 ? ` +${names.length - 3}` : '';
    return `${names.length}: ${preview}${suffix}`;
  };

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-white/70 text-sm">
                    Вторая сторона
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
                    Мы
                    <div className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs flex items-center">
                      {countries.find((country) => country.id === guestId)?.name ??
                        'Страна не выбрана'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3 space-y-3">
                <div className="text-emerald-200 text-xs font-semibold uppercase tracking-wide">
                  Что получим мы
                </div>
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
                        Все компании нашей стороны
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
                                <span>{company.name}</span>
                              </label>
                            ))
                          ) : (
                            <div className="text-white/40 text-xs">
                              Нет компаний нашей стороны
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
                  Все провинции стороны-хозяина
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
                        Нет провинций стороны-хозяина
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
              </div>

              <div className="rounded-lg border border-sky-400/30 bg-sky-500/5 p-3 space-y-3">
                <div className="text-sky-200 text-xs font-semibold uppercase tracking-wide">
                  Что получит вторая сторона
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="text-white/70 text-sm">Разрешить строить</div>
                  <label className="flex items-center gap-2 text-white/70 text-sm">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-emerald-500"
                      checked={otherAllowState}
                      onChange={(event) => setOtherAllowState(event.target.checked)}
                    />
                    Государству
                  </label>
                  <label className="flex items-center gap-2 text-white/70 text-sm">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-emerald-500"
                      checked={otherAllowCompanies}
                      onChange={(event) =>
                        setOtherAllowCompanies(event.target.checked)
                      }
                    />
                    Компаниям
                  </label>
                  {otherAllowCompanies && (
                    <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
                      <label className="flex items-center gap-2 text-white/70 text-xs">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-emerald-500"
                          checked={otherAllCompanies}
                          onChange={(event) =>
                            setOtherAllCompanies(event.target.checked)
                          }
                        />
                        Все компании стороны-получателя
                      </label>
                      {!otherAllCompanies && (
                        <div className="max-h-32 overflow-y-auto legend-scroll space-y-2 pr-1">
                          {hostCompanies.length > 0 ? (
                            hostCompanies.map((company) => (
                              <label
                                key={company.id}
                                className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-white/70 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-emerald-500"
                                  checked={otherSelectedCompanyIds.has(company.id)}
                                  onChange={(event) =>
                                    setOtherSelectedCompanyIds((prev) => {
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
                                <span>{company.name}</span>
                              </label>
                            ))
                          ) : (
                            <div className="text-white/40 text-xs">
                              Нет компаний стороны-получателя
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
                            checked={otherSelectedIndustries.has(industry.id)}
                            onChange={(event) =>
                              setOtherSelectedIndustries((prev) => {
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
                        value={otherLimitProvince}
                        onChange={(event) =>
                          setOtherLimitProvince(
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
                        value={otherLimitCountry}
                        onChange={(event) =>
                          setOtherLimitCountry(
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
                        value={otherLimitGlobal}
                        onChange={(event) =>
                          setOtherLimitGlobal(
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
                      checked={otherAllBuildings}
                      onChange={(event) => setOtherAllBuildings(event.target.checked)}
                    />
                    Все здания
                  </label>
                  {!otherAllBuildings && (
                    <div className="max-h-40 overflow-y-auto legend-scroll space-y-2 pr-1">
                      {buildings.length > 0 ? (
                        buildings.map((building) => (
                          <label
                            key={building.id}
                            className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white/70 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={otherSelectedBuildingIds.has(building.id)}
                              onChange={(event) =>
                                setOtherSelectedBuildingIds((prev) => {
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
                      checked={otherAllProvinces}
                      onChange={(event) => setOtherAllProvinces(event.target.checked)}
                    />
                      Все провинции стороны-хозяина
                  </label>
                  {!otherAllProvinces && (
                    <div className="max-h-40 overflow-y-auto legend-scroll space-y-2 pr-1">
                      {guestProvinces.length > 0 ? (
                        guestProvinces.map((province) => (
                          <label
                            key={province.id}
                            className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white/70 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={otherSelectedProvinceIds.has(province.id)}
                              onChange={(event) =>
                                setOtherSelectedProvinceIds((prev) => {
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
                        <div className="text-white/40 text-xs">Нет провинций стороны-хозяина</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

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
                {items.length > 0 ? (
                  items.map((item) => {
                    const agreement = item.agreement;
                    const host = countries.find((c) => c.id === agreement.hostCountryId);
                    const guest = countries.find((c) => c.id === agreement.guestCountryId);
                    const industryNames = agreement.industries?.length
                      ? agreement.industries
                          .map(
                            (id) => industries.find((entry) => entry.id === id)?.name ?? id,
                          )
                      : [];
                    const limitLabel = (value: number) =>
                      value && value > 0 ? value : '∞';
                    const durationLabel =
                      agreement.durationTurns && agreement.durationTurns > 0
                        ? `${agreement.durationTurns} ход.`
                        : 'Бессрочно';
                    const remainingTurns =
                      item.type === 'agreement' &&
                      agreement.durationTurns &&
                      agreement.durationTurns > 0 &&
                      agreement.startTurn
                        ? Math.max(
                            0,
                            agreement.durationTurns - (turn - agreement.startTurn),
                          )
                        : null;
                    const resolveTerms = (
                      terms: {
                        kind?: 'company' | 'state';
                        allowState?: boolean;
                        allowCompanies?: boolean;
                        companyIds?: string[];
                        buildingIds?: string[];
                        provinceIds?: string[];
                        industries?: string[];
                        limits?: {
                          perProvince?: number;
                          perCountry?: number;
                          global?: number;
                        };
                      } | undefined,
                    ) => {
                      const allowsState = terms?.allowState ?? terms?.kind === 'state';
                      const allowsCompanies =
                        terms?.allowCompanies ?? terms?.kind === 'company';
                      const termCompanies = terms?.companyIds?.length
                        ? terms.companyIds.map(
                            (id) =>
                              companies.find((entry) => entry.id === id)?.name ?? id,
                          )
                        : [];
                      const termBuildings = terms?.buildingIds?.length
                        ? terms.buildingIds.map(
                            (id) => buildings.find((entry) => entry.id === id)?.name ?? id,
                          )
                        : [];
                      const termProvinces = terms?.provinceIds?.length
                        ? terms.provinceIds
                        : [];
                      const termIndustries = terms?.industries?.length
                        ? terms.industries.map(
                            (id) =>
                              industries.find((entry) => entry.id === id)?.name ?? id,
                          )
                        : [];
                      return {
                        allowsState,
                        allowsCompanies,
                        companiesLabel: allowsCompanies
                          ? formatListSummary(termCompanies, 'Все компании')
                          : 'Не разрешено',
                        buildingsLabel: formatListSummary(termBuildings, 'Все здания'),
                        provincesLabel: formatListSummary(termProvinces, 'Все провинции'),
                        industriesLabel: formatListSummary(termIndustries, 'Все отрасли'),
                        limitsLabel: `Пров. ${limitLabel(terms?.limits?.perProvince ?? 0)} / Гос. ${limitLabel(terms?.limits?.perCountry ?? 0)} / Мир ${limitLabel(terms?.limits?.global ?? 0)}`,
                      };
                    };
                    const hostGetsTerms =
                      item.type === 'proposal'
                        ? item.counterAgreement
                        : agreement.counterTerms;
                    const guestGetsTerms = agreement;
                    const hostUsage =
                      item.type === 'agreement'
                        ? getTermsUsage(
                            agreement.guestCountryId,
                            agreement.hostCountryId,
                            hostGetsTerms,
                          )
                        : { perProvince: 0, perCountry: 0, global: 0 };
                    const guestUsage =
                      item.type === 'agreement'
                        ? getTermsUsage(
                            agreement.hostCountryId,
                            agreement.guestCountryId,
                            guestGetsTerms,
                          )
                        : { perProvince: 0, perCountry: 0, global: 0 };
                    const hostTermsLabel = resolveTerms(hostGetsTerms);
                    const guestTermsLabel = resolveTerms(guestGetsTerms);
                    const statusLabel =
                      item.type === 'proposal' ? 'Ожидаем ответа' : 'Действует';
                    const statusStyle =
                      item.type === 'proposal'
                        ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                        : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200';
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-white/10 bg-black/30 p-4 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-2">
                              <div className="rounded-lg border border-sky-400/40 bg-sky-500/15 p-2">
                                <div className="flex flex-col items-center gap-1 text-center">
                                  <div className="w-10 h-7 rounded-md border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center">
                                    {host?.flagDataUrl ? (
                                      <img
                                        src={host.flagDataUrl}
                                        alt={`${host?.name ?? 'Host'} flag`}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-[10px] text-white/40">Flag</span>
                                    )}
                                  </div>
                                  <div className="text-sky-200 font-semibold">
                                    {host?.name ?? agreement.hostCountryId}
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-lg border border-sky-400/30 bg-sky-500/5 p-3 space-y-2">
                                <div className="text-sky-200/90 font-semibold text-center">
                                  Получает по договору
                                </div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                {hostTermsLabel.allowsState && (
                                  <span className="px-2 py-0.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 inline-flex items-center gap-1">
                                    <Landmark className="w-3.5 h-3.5" />
                                    Государство
                                  </span>
                                )}
                                {hostTermsLabel.allowsCompanies && (
                                  <span className="px-2 py-0.5 rounded-full border border-sky-400/40 bg-sky-500/10 text-sky-200 inline-flex items-center gap-1">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    Компании
                                  </span>
                                )}
                              </div>
                              <div className="text-white/55">Компании: {hostTermsLabel.companiesLabel}</div>
                              <div className="text-white/55">Здания: {hostTermsLabel.buildingsLabel}</div>
                              <div className="text-white/55">Провинции: {hostTermsLabel.provincesLabel}</div>
                              <div className="text-white/55">Отрасли: {hostTermsLabel.industriesLabel}</div>
                              <div className="text-white/55">Лимиты: {hostTermsLabel.limitsLabel}</div>
                              <div className="text-white/55">
                                Использовано: Пров. {hostUsage.perProvince} / Гос.{' '}
                                {hostUsage.perCountry} / Мир {hostUsage.global}
                              </div>
                            </div>
                            </div>
                            <div className="space-y-2">
                              <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 p-2">
                                <div className="flex flex-col items-center gap-1 text-center">
                                  <div className="w-10 h-7 rounded-md border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center">
                                    {guest?.flagDataUrl ? (
                                      <img
                                        src={guest.flagDataUrl}
                                        alt={`${guest?.name ?? 'Guest'} flag`}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-[10px] text-white/40">Flag</span>
                                    )}
                                  </div>
                                  <div className="text-emerald-200 font-semibold">
                                    {guest?.name ?? agreement.guestCountryId}
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3 space-y-2">
                                <div className="text-emerald-200/90 font-semibold text-center">
                                  Получает по договору
                                </div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                {guestTermsLabel.allowsState && (
                                  <span className="px-2 py-0.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 inline-flex items-center gap-1">
                                    <Landmark className="w-3.5 h-3.5" />
                                    Государство
                                  </span>
                                )}
                                {guestTermsLabel.allowsCompanies && (
                                  <span className="px-2 py-0.5 rounded-full border border-sky-400/40 bg-sky-500/10 text-sky-200 inline-flex items-center gap-1">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    Компании
                                  </span>
                                )}
                              </div>
                              <div className="text-white/55">Компании: {guestTermsLabel.companiesLabel}</div>
                              <div className="text-white/55">Здания: {guestTermsLabel.buildingsLabel}</div>
                              <div className="text-white/55">Провинции: {guestTermsLabel.provincesLabel}</div>
                              <div className="text-white/55">Отрасли: {guestTermsLabel.industriesLabel}</div>
                              <div className="text-white/55">Лимиты: {guestTermsLabel.limitsLabel}</div>
                              <div className="text-white/55">
                                Использовано: Пров. {guestUsage.perProvince} / Гос.{' '}
                                {guestUsage.perCountry} / Мир {guestUsage.global}
                              </div>
                            </div>
                            </div>
                          </div>

                          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-white/50 text-xs space-y-2">
                            <div className="flex items-center gap-3">
                              <div>
                              <span className="relative group text-white/60 inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-white/60" />
                                Срок:
                                <span className="pointer-events-none absolute -top-8 left-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                  Длительность действия договора
                                </span>
                              </span>{' '}
                              {durationLabel}
                              </div>
                              {remainingTurns != null && (
                                <div>
                                  <span className="relative group text-white/60 inline-flex items-center gap-1">
                                    <Hourglass className="w-3.5 h-3.5 text-white/60" />
                                    Осталось:
                                    <span className="pointer-events-none absolute -top-8 left-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                      Сколько ходов до окончания договора
                                    </span>
                                  </span>{' '}
                                  {remainingTurns} ход.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[11px] ${statusStyle}`}
                          >
                            {statusLabel}
                          </span>
                          {item.type === 'agreement' && (
                            <button
                              onClick={() => onDeleteAgreement(item.id)}
                              className="w-9 h-9 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                            >
                              <Trash2 className="w-4 h-4 text-white/60" />
                            </button>
                          )}
                          {item.type === 'proposal' && (
                            <button
                              onClick={() => onWithdrawProposal(item.id)}
                              className="w-9 h-9 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40 relative group"
                            >
                              <Trash2 className="w-4 h-4 text-white/60" />
                              <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                Отозвать предложение
                              </span>
                            </button>
                          )}
                        </div>
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

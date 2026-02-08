import { X, Hammer, Ban } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  BuildingDefinition,
  Company,
  ProvinceData,
  BuildingOwner,
  Country,
  TraitCriteria,
  RequirementNode,
  Trait,
  DiplomacyAgreement,
} from '../types';

type ConstructionModalProps = {
  open: boolean;
  provinceId?: string;
  province?: ProvinceData;
  provinces?: Record<string, ProvinceData>;
  buildings: BuildingDefinition[];
  resources: Trait[];
  companies: Company[];
  countries: Country[];
  diplomacyAgreements: DiplomacyAgreement[];
  activeCountryId?: string;
  activeCountryPoints: number;
  onClose: () => void;
  onStart: (buildingId: string, owner: BuildingOwner) => void;
  onCancel: (buildingId: string) => void;
};

export default function ConstructionModal({
  open,
  provinceId,
  province,
  provinces,
  buildings,
  resources,
  companies,
  countries,
  diplomacyAgreements,
  activeCountryId,
  activeCountryPoints,
  onClose,
  onStart,
  onCancel,
}: ConstructionModalProps) {
  const [ownerType, setOwnerType] = useState<'state' | 'company'>('state');
  const [companyId, setCompanyId] = useState('');
  const [stateCountryId, setStateCountryId] = useState('');
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);
  const availableCompanies = useMemo(
    () => companies.filter((company) => company.countryId === activeCountryId),
    [companies, activeCountryId],
  );
  const normalizeTraitCriteria = (
    criteria: TraitCriteria | undefined,
    legacyId?: string,
  ) => ({
    anyOf: criteria?.anyOf ?? (legacyId ? [legacyId] : []),
    noneOf: criteria?.noneOf ?? [],
  });

  const evaluateRequirementNode = (
    node: RequirementNode,
    province: ProvinceData,
  ): boolean => {
    if (node.type === 'trait') {
      const key =
        node.category === 'climate'
          ? province.climateId
          : node.category === 'landscape'
            ? province.landscapeId
            : node.category === 'culture'
              ? province.cultureId
              : province.religionId;
      return Boolean(key && key === node.id);
    }
    if (node.op === 'and') {
      return node.children.every((child) =>
        evaluateRequirementNode(child, province),
      );
    }
    if (node.op === 'or') {
      return node.children.some((child) =>
        evaluateRequirementNode(child, province),
      );
    }
    if (node.op === 'not') {
      if (node.children.length === 0) return true;
      return !node.children.some((child) =>
        evaluateRequirementNode(child, province),
      );
    }
    if (node.op === 'xor') {
      const matches = node.children.filter((child) =>
        evaluateRequirementNode(child, province),
      ).length;
      return matches === 1;
    }
    if (node.op === 'nand') {
      return !node.children.every((child) =>
        evaluateRequirementNode(child, province),
      );
    }
    if (node.op === 'nor') {
      return !node.children.some((child) =>
        evaluateRequirementNode(child, province),
      );
    }
    if (node.op === 'implies') {
      if (node.children.length < 2) return true;
      const [a, b] = node.children;
      return !evaluateRequirementNode(a, province) ||
        evaluateRequirementNode(b, province);
    }
    if (node.op === 'eq') {
      if (node.children.length < 2) return true;
      const results = node.children.map((child) =>
        evaluateRequirementNode(child, province),
      );
      return results.every((value) => value === results[0]);
    }
    return true;
  };

  if (!open || !provinceId || !province) return null;

  const getOwnerCountryId = (target: BuildingOwner) =>
    target.type === 'state'
      ? target.countryId
      : companies.find((c) => c.id === target.companyId)?.countryId;

  const resolvedStateCountryId =
    stateCountryId || activeCountryId || countries[0]?.id || 'state';
  const owner: BuildingOwner =
    ownerType === 'company' && companyId
      ? { type: 'company', companyId }
      : { type: 'state', countryId: resolvedStateCountryId };
  const ownerCountryId = getOwnerCountryId(owner);
  const isController = Boolean(activeCountryId && ownerCountryId === activeCountryId);
  const hasAnyDiplomaticAccess =
    Boolean(
      activeCountryId &&
        province.ownerCountryId &&
        (province.ownerCountryId === activeCountryId ||
          diplomacyAgreements.some(
            (agreement) =>
              agreement.hostCountryId === province.ownerCountryId &&
              agreement.guestCountryId === activeCountryId,
          )),
    );
  const progressMap = province.constructionProgress ?? {};
  const builtList = province.buildingsBuilt ?? [];
  const provincesList = provinces ? Object.values(provinces) : [province];
  const hasDiplomaticAccess = (
    building: BuildingDefinition,
    target: BuildingOwner,
  ) => {
    const hostId = province.ownerCountryId;
    const ownerCountryId = getOwnerCountryId(target);
    if (!hostId || !ownerCountryId) return false;
    if (hostId === ownerCountryId) return true;
    const kind = target.type === 'state' ? 'state' : 'company';
    const agreements = diplomacyAgreements.filter(
      (agreement) =>
        agreement.kind === kind &&
        agreement.hostCountryId === hostId &&
        agreement.guestCountryId === ownerCountryId,
    );
    if (agreements.length === 0) return false;
    const industryAllowed = (agreement: DiplomacyAgreement, id: string) => {
      if (!agreement.industries || agreement.industries.length === 0) return true;
      const industryId =
        buildings.find((item) => item.id === id)?.industryId ?? undefined;
      return Boolean(industryId && agreement.industries.includes(industryId));
    };
    const countAgreementEntries = (
      agreementsToUse: DiplomacyAgreement[],
      provinceList: ProvinceData[],
    ) =>
      provinceList.reduce((sum, prov) => {
        const built = (prov.buildingsBuilt ?? []).filter((entry) => {
          if (entry.owner.type !== kind) return false;
          const entryCountryId = getOwnerCountryId(entry.owner);
          if (entryCountryId !== ownerCountryId) return false;
          return agreementsToUse.some((agreement) =>
            industryAllowed(agreement, entry.buildingId),
          );
        }).length;
        const inProgress = Object.entries(prov.constructionProgress ?? {}).reduce(
          (sumProgress, [entryBuildingId, entries]) => {
            const filtered = entries.filter((entry) => {
              if (entry.owner.type !== kind) return false;
              const entryCountryId = getOwnerCountryId(entry.owner);
              if (entryCountryId !== ownerCountryId) return false;
              return agreementsToUse.some((agreement) =>
                industryAllowed(agreement, entryBuildingId),
              );
            });
            return sumProgress + filtered.length;
          },
          0,
        );
        return sum + built + inProgress;
      }, 0);

    return agreements.some((agreement) => {
      if (!industryAllowed(agreement, building.id)) return false;
      const limits = agreement.limits ?? {};
      const perProvince = limits.perProvince ?? 0;
      const perCountry = limits.perCountry ?? 0;
      const global = limits.global ?? 0;
      if (perProvince > 0) {
        const count = countAgreementEntries([agreement], [province]);
        if (count >= perProvince) return false;
      }
      if (perCountry > 0) {
        const hostProvinces = provincesList.filter(
          (prov) => prov.ownerCountryId === hostId,
        );
        const count = countAgreementEntries([agreement], hostProvinces);
        if (count >= perCountry) return false;
      }
      if (global > 0) {
        const count = countAgreementEntries([agreement], provincesList);
        if (count >= global) return false;
      }
      return true;
    });
  };
  const getDiplomacyIssue = (
    building: BuildingDefinition,
    target: BuildingOwner,
  ): string | null => {
    const hostId = province.ownerCountryId;
    const ownerCountry = getOwnerCountryId(target);
    if (!hostId || !ownerCountry) return 'Нет владельца провинции';
    if (hostId === ownerCountry) return null;
    const kind = target.type === 'state' ? 'state' : 'company';
    const agreements = diplomacyAgreements.filter(
      (agreement) =>
        agreement.kind === kind &&
        agreement.hostCountryId === hostId &&
        agreement.guestCountryId === ownerCountry,
    );
    if (agreements.length === 0) return 'Нет дипломатического разрешения';
    if (hasDiplomaticAccess(building, target)) return null;
    return 'Превышен лимит дипломатического соглашения';
  };
  const isOwnerAllowed = (building: BuildingDefinition, target: BuildingOwner) => {
    const rules = building.requirements;
    if (!rules?.allowedCountries && !rules?.allowedCompanies) return true;
    if (target.type === 'state') {
      const mode = rules.allowedCountriesMode ?? 'allow';
      const list = rules.allowedCountries ?? [];
      if (list.length === 0) return mode !== 'allow';
      const included = list.includes(target.countryId);
      return mode === 'allow' ? included : !included;
    }
    const mode = rules.allowedCompaniesMode ?? 'allow';
    const list = rules.allowedCompanies ?? [];
    if (list.length === 0) return mode !== 'allow';
    const included = list.includes(target.companyId);
    return mode === 'allow' ? included : !included;
  };
  const activeTasks = Object.values(progressMap).reduce(
    (sum, entries) => sum + entries.length,
    0,
  );
  const perTask =
    activeTasks > 0 ? Math.max(0, activeCountryPoints) / activeTasks : 0;
  const hoveredBuilding = hoveredBuildingId
    ? buildings.find((b) => b.id === hoveredBuildingId)
    : undefined;

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-4 rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0e1523]">
          <div>
            <h2 className="text-white text-lg font-semibold">
              Строительство — {provinceId}
            </h2>
            <p className="text-white/60 text-xs mt-1">
              Очки строительства: {activeCountryPoints}{' '}
              {activeTasks > 0
                ? `(распределяется по ${activeTasks} объектам, по ${perTask.toFixed(
                    1,
                  )})`
                : '(нет активных строек)'}
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
          {!hasAnyDiplomaticAccess && (
            <div className="text-white/60 text-sm border border-white/10 bg-white/5 rounded-xl p-3">
              Строительство доступно только владельцу провинции.
            </div>
          )}

          <div className="flex items-center gap-3 px-2 py-2 rounded-xl border border-white/10 bg-white/5">
            <div className="text-white/60 text-xs">Владелец строительства:</div>
            <button
              onClick={() => setOwnerType('state')}
              className={`px-3 h-8 rounded-lg border text-xs ${
                ownerType === 'state'
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                  : 'bg-black/30 border-white/10 text-white/60 hover:border-emerald-400/40'
              }`}
            >
              Государство
            </button>
            <button
              onClick={() => setOwnerType('company')}
              className={`px-3 h-8 rounded-lg border text-xs ${
                ownerType === 'company'
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                  : 'bg-black/30 border-white/10 text-white/60 hover:border-emerald-400/40'
              }`}
                          >
              Компания
            </button>
            {ownerType === 'company' && (
              <select
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
                className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
              >
                <option value="" className="bg-[#0b111b] text-white">
                  Выберите компанию
                </option>
                {availableCompanies.map((company) => (
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
            {ownerType === 'state' && (
              <div className="flex items-center gap-2">
                <select
                  value={resolvedStateCountryId}
                  onChange={(event) => setStateCountryId(event.target.value)}
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
                <div className="flex items-center gap-2 max-w-full flex-wrap">
                  {countries.map((country) => {
                    const available =
                      hoveredBuilding &&
                      isOwnerAllowed(hoveredBuilding, {
                        type: 'state',
                        countryId: country.id,
                      });
                    return (
                      <button
                        key={country.id}
                        onClick={() => setStateCountryId(country.id)}
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                          resolvedStateCountryId === country.id
                            ? 'border-emerald-400/60 bg-emerald-500/20'
                            : 'border-white/10 bg-black/30 hover:border-emerald-400/40'
                        } ${
                          hoveredBuildingId
                            ? available
                              ? 'ring-1 ring-emerald-400/60'
                              : 'opacity-40 ring-1 ring-red-400/40'
                            : ''
                        }`}
                        title={country.name}
                      >
                        {country.flagDataUrl ? (
                          <img
                            src={country.flagDataUrl}
                            alt=""
                            className="w-6 h-6 rounded object-contain"
                          />
                        ) : (
                          <span className="text-white/50 text-[10px]">Flag</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {ownerType === 'company' && (
              <div className="flex items-center gap-2 max-w-full flex-wrap">
                {availableCompanies.map((company) => {
                  const available =
                    hoveredBuilding &&
                    isOwnerAllowed(hoveredBuilding, {
                      type: 'company',
                      companyId: company.id,
                    });
                  return (
                    <button
                      key={company.id}
                      onClick={() => setCompanyId(company.id)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                        companyId === company.id
                          ? 'border-emerald-400/60 bg-emerald-500/20'
                          : 'border-white/10 bg-black/30 hover:border-emerald-400/40'
                      } ${
                        hoveredBuildingId
                          ? available
                            ? 'ring-1 ring-emerald-400/60'
                            : 'opacity-40 ring-1 ring-red-400/40'
                          : ''
                      }`}
                      title={company.name}
                    >
                      {company.iconDataUrl ? (
                        <img
                          src={company.iconDataUrl}
                          alt=""
                          className="w-6 h-6 rounded object-cover"
                        />
                      ) : (
                        <span className="text-white/50 text-[10px]">Logo</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-12 gap-2 px-2 py-2 text-white/50 text-[11px] uppercase tracking-wide">
            <div className="col-span-5">Здание</div>
            <div className="col-span-2">Стоимость</div>
            <div className="col-span-3">Прогресс</div>
            <div className="col-span-2 text-right">Действия</div>
          </div>

          <div className="space-y-2 overflow-y-auto pr-1 legend-scroll flex-1 min-h-0">
            {buildings.length === 0 && (
              <div className="text-white/50 text-sm border border-dashed border-white/10 rounded-xl p-4">
                Нет доступных зданий.
              </div>
            )}
            {buildings.map((building) => {
              const cost = Math.max(1, building.cost ?? 1);
              const builtCount = builtList.filter(
                (entry) => entry.buildingId === building.id,
              ).length;
              const entries = progressMap[building.id] ?? [];
              const hasProgress = entries.length > 0;
              const progressSum = entries.reduce(
                (sum, entry) => sum + entry.progress,
                0,
              );
              const average = entries.length
                ? Math.min(100, Math.round((progressSum / entries.length / cost) * 100))
                : 0;
              const requirements = building.requirements;
              const issues = {
                logic: [] as string[],
                resources: [] as string[],
                buildings: [] as string[],
                other: [] as string[],
              };
              if (requirements?.maxPerProvince != null) {
                const limit = requirements.maxPerProvince;
                if (limit > 0 && builtCount + entries.length >= limit) {
                  issues.other.push(`Лимит на провинцию: ${limit}`);
                }
              }
              if (requirements?.maxPerCountry != null) {
                const limit = requirements.maxPerCountry;
                if (limit > 0) {
                  const ownerCountryId =
                    owner.type === 'state'
                      ? owner.countryId
                      : companies.find((c) => c.id === owner.companyId)
                          ?.countryId;
                  if (ownerCountryId) {
                    const countryBuilt = provincesList.reduce((sum, prov) => {
                      const list = prov.buildingsBuilt ?? [];
                      return (
                        sum +
                        list.filter((entry) => {
                          if (entry.buildingId !== building.id) return false;
                          if (entry.owner.type === 'state') {
                            return entry.owner.countryId === ownerCountryId;
                          }
                          const companyCountry = companies.find(
                            (c) => c.id === entry.owner.companyId,
                          )?.countryId;
                          return companyCountry === ownerCountryId;
                        }).length
                      );
                    }, 0);
                    const countryInProgress = provincesList.reduce((sum, prov) => {
                      const prog = prov.constructionProgress?.[building.id] ?? [];
                      return (
                        sum +
                        prog.filter((entry) => {
                          if (entry.owner.type === 'state') {
                            return entry.owner.countryId === ownerCountryId;
                          }
                          const companyCountry = companies.find(
                            (c) => c.id === entry.owner.companyId,
                          )?.countryId;
                          return companyCountry === ownerCountryId;
                        }).length
                      );
                    }, 0);
                    if (countryBuilt + countryInProgress >= limit) {
                      issues.other.push(`Лимит на государство: ${limit}`);
                    }
                  }
                }
              }
              if (requirements?.maxGlobal != null) {
                const limit = requirements.maxGlobal;
                if (limit > 0) {
                  const globalBuilt = provincesList.reduce((sum, prov) => {
                    const list = prov.buildingsBuilt ?? [];
                    return (
                      sum +
                      list.filter((entry) => entry.buildingId === building.id)
                        .length
                    );
                  }, 0);
                  const globalInProgress = provincesList.reduce((sum, prov) => {
                    const prog = prov.constructionProgress?.[building.id] ?? [];
                    return sum + prog.length;
                  }, 0);
                  if (globalBuilt + globalInProgress >= limit) {
                    issues.other.push(`Лимит на мир: ${limit}`);
                  }
                }
              }
              const logicOk = requirements?.logic
                ? evaluateRequirementNode(requirements.logic, province)
                : true;
              if (!logicOk) {
                issues.logic.push('Не выполнены логические критерии');
              }

              if (!requirements?.logic) {
                const climateReq = normalizeTraitCriteria(
                  requirements?.climate,
                  requirements?.climateId,
                );
                if (
                  climateReq.anyOf.length > 0 &&
                  (!province.climateId ||
                    !climateReq.anyOf.includes(province.climateId))
                ) {
                  issues.logic.push('Нужен другой климат');
                }
                if (
                  climateReq.noneOf.length > 0 &&
                  province.climateId &&
                  climateReq.noneOf.includes(province.climateId)
                ) {
                  issues.logic.push('Запрещенный климат');
                }

                const landscapeReq = normalizeTraitCriteria(
                  requirements?.landscape,
                  requirements?.landscapeId,
                );
                if (
                  landscapeReq.anyOf.length > 0 &&
                  (!province.landscapeId ||
                    !landscapeReq.anyOf.includes(province.landscapeId))
                ) {
                  issues.logic.push('Нужен другой ландшафт');
                }
                if (
                  landscapeReq.noneOf.length > 0 &&
                  province.landscapeId &&
                  landscapeReq.noneOf.includes(province.landscapeId)
                ) {
                  issues.logic.push('Запрещенный ландшафт');
                }

                const cultureReq = normalizeTraitCriteria(
                  requirements?.culture,
                  requirements?.cultureId,
                );
                if (
                  cultureReq.anyOf.length > 0 &&
                  (!province.cultureId ||
                    !cultureReq.anyOf.includes(province.cultureId))
                ) {
                  issues.logic.push('Нужна другая культура');
                }
                if (
                  cultureReq.noneOf.length > 0 &&
                  province.cultureId &&
                  cultureReq.noneOf.includes(province.cultureId)
                ) {
                  issues.logic.push('Запрещенная культура');
                }

                const religionReq = normalizeTraitCriteria(
                  requirements?.religion,
                  requirements?.religionId,
                );
                if (
                  religionReq.anyOf.length > 0 &&
                  (!province.religionId ||
                    !religionReq.anyOf.includes(province.religionId))
                ) {
                  issues.logic.push('Нужна другая религия');
                }
                if (
                  religionReq.noneOf.length > 0 &&
                  province.religionId &&
                  religionReq.noneOf.includes(province.religionId)
                ) {
                  issues.logic.push('Запрещенная религия');
                }
              }
              if (requirements?.resources) {
                const amounts = province.resourceAmounts ?? {};
                const legacyRequired = Object.entries(requirements.resources)
                  .filter(([, value]) => typeof value === 'number' && value > 0)
                  .map(([id]) => id);
                const required =
                  requirements.resources.anyOf ?? legacyRequired;
                const forbidden = requirements.resources.noneOf ?? [];
                if (required.length > 0) {
                  const missing = required.filter(
                    (id) => (amounts[id] ?? 0) <= 0,
                  );
                  if (missing.length > 0) {
                    const names = missing
                      .map((id) => resources.find((r) => r.id === id)?.name ?? id)
                      .join(', ');
                    issues.resources.push(`Нет ресурсов: ${names}`);
                  }
                }
                if (forbidden.length > 0) {
                  const present = forbidden.filter(
                    (id) => (amounts[id] ?? 0) > 0,
                  );
                  if (present.length > 0) {
                    const names = present
                      .map((id) => resources.find((r) => r.id === id)?.name ?? id)
                      .join(', ');
                    issues.resources.push(`Запрещены ресурсы: ${names}`);
                  }
                }
              }
              if (requirements?.radiation) {
                const value = province.radiation ?? 0;
                if (
                  requirements.radiation.min != null &&
                  value < requirements.radiation.min
                ) {
                  issues.other.push(
                    `Радиация ниже ${requirements.radiation.min} (есть ${value})`,
                  );
                }
                if (
                  requirements.radiation.max != null &&
                  value > requirements.radiation.max
                ) {
                  issues.other.push(
                    `Радиация выше ${requirements.radiation.max} (есть ${value})`,
                  );
                }
              }
              if (requirements?.pollution) {
                const value = province.pollution ?? 0;
                if (
                  requirements.pollution.min != null &&
                  value < requirements.pollution.min
                ) {
                  issues.other.push(
                    `Загрязнение ниже ${requirements.pollution.min} (есть ${value})`,
                  );
                }
                if (
                  requirements.pollution.max != null &&
                  value > requirements.pollution.max
                ) {
                  issues.other.push(
                    `Загрязнение выше ${requirements.pollution.max} (есть ${value})`,
                  );
                }
              }
              const ownerAllowed = isOwnerAllowed(building, owner);
              if (!ownerAllowed) {
                issues.other.push('Владелец не может строить это здание');
              }
              const diplomacyIssue = getDiplomacyIssue(building, owner);
              if (diplomacyIssue) {
                issues.other.push(diplomacyIssue);
              }
              if (requirements?.buildings) {
                Object.entries(requirements.buildings).forEach(
                  ([depId, constraint]) => {
                    const name =
                      buildings.find((b) => b.id === depId)?.name ?? depId;
                    const provinceCount = builtList.filter(
                      (entry) => entry.buildingId === depId,
                    ).length;
                    const ownerCountryId =
                      owner.type === 'state'
                        ? owner.countryId
                        : companies.find((c) => c.id === owner.companyId)
                            ?.countryId;
                    const countryCount = ownerCountryId
                      ? provincesList.reduce((sum, prov) => {
                          const list = prov.buildingsBuilt ?? [];
                          return (
                            sum +
                            list.filter((entry) => {
                              if (entry.buildingId !== depId) return false;
                              if (entry.owner.type === 'state') {
                                return entry.owner.countryId === ownerCountryId;
                              }
                              const companyCountry = companies.find(
                                (c) => c.id === entry.owner.companyId,
                              )?.countryId;
                              return companyCountry === ownerCountryId;
                            }).length
                          );
                        }, 0)
                      : 0;
                    const globalCount = provincesList.reduce((sum, prov) => {
                      const list = prov.buildingsBuilt ?? [];
                      return (
                        sum +
                        list.filter((entry) => entry.buildingId === depId).length
                      );
                    }, 0);

                    const province = (constraint as any).province ?? constraint;
                    const country = (constraint as any).country;
                    const global = (constraint as any).global;

                    if (province?.min != null && provinceCount < province.min) {
                      issues.buildings.push(
                        `Провинция: нужно ${province.min} "${name}" (есть ${provinceCount})`,
                      );
                    }
                    if (province?.max != null && provinceCount > province.max) {
                      issues.buildings.push(
                        `Провинция: не больше ${province.max} "${name}" (есть ${provinceCount})`,
                      );
                    }
                    if (country?.min != null && countryCount < country.min) {
                      issues.buildings.push(
                        `Государство: нужно ${country.min} "${name}" (есть ${countryCount})`,
                      );
                    }
                    if (country?.max != null && countryCount > country.max) {
                      issues.buildings.push(
                        `Государство: не больше ${country.max} "${name}" (есть ${countryCount})`,
                      );
                    }
                    if (global?.min != null && globalCount < global.min) {
                      issues.buildings.push(
                        `Мир: нужно ${global.min} "${name}" (есть ${globalCount})`,
                      );
                    }
                    if (global?.max != null && globalCount > global.max) {
                      issues.buildings.push(
                        `Мир: не больше ${global.max} "${name}" (есть ${globalCount})`,
                      );
                    }
                  },
                );
              } else if (requirements?.dependencies) {
                const ok = requirements.dependencies.every(
                  (depId) =>
                    builtList.filter((entry) => entry.buildingId === depId).length > 0,
                );
                if (!ok) issues.buildings.push('Нет требуемых зданий');
              }
              const hasIssues =
                issues.logic.length > 0 ||
                issues.resources.length > 0 ||
                issues.buildings.length > 0 ||
                issues.other.length > 0;
              const isInactive = hasIssues || !ownerAllowed;
              const canStart =
                isController && hasDiplomaticAccess(building, owner);
              const canCancel = isController && hasProgress;

              return (
                <div
                  key={building.id}
                  onMouseEnter={() => setHoveredBuildingId(building.id)}
                  onMouseLeave={() => setHoveredBuildingId(null)}
                  className={`grid grid-cols-12 items-center gap-2 px-3 py-3 rounded-xl bg-white/5 border ${
                    isInactive ? 'border-red-400/60' : 'border-white/10'
                  }`}
                >
                  <div className="col-span-5 flex items-center gap-3">
                    {building.iconDataUrl ? (
                      <img
                        src={building.iconDataUrl}
                        alt=""
                        className="w-8 h-8 rounded-md object-cover border border-white/10"
                      />
                    ) : (
                      <Hammer className="w-5 h-5 text-white/60" />
                    )}
                    <div>
                      <div className="text-white/80 text-sm flex items-center gap-2">
                        <span>{building.name}</span>
                        {isInactive && (
                          <span className="px-2 py-0.5 rounded-full border border-red-400/40 bg-red-500/10 text-[10px] text-red-200">
                            Неактивное
                          </span>
                        )}
                      </div>
                      <div className="text-white/40 text-xs">
                        {builtCount > 0 || hasProgress
                          ? `Построено: ${builtCount}${
                              hasProgress ? `, в стройке: ${entries.length}` : ''
                            }`
                          : 'Не построено'}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 text-white/70 text-sm">{cost}</div>

                  <div className="col-span-3">
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400/70"
                        style={{ width: `${average}%` }}
                      />
                    </div>
                    <div className="text-white/50 text-[11px] mt-1">
                      {builtCount > 0 && !hasProgress ? '100%' : `${average}%`}
                      {hasProgress && ` (ср.)`}
                    </div>
                    {hasIssues && (
                      <div className="text-red-300 text-[11px] mt-2 space-y-1">
                        {issues.logic.length > 0 && (
                          <div>
                            <div className="text-red-200/90 font-semibold">
                              Логика
                            </div>
                            <div>
                              {Array.from(new Set(issues.logic)).join(', ')}
                            </div>
                          </div>
                        )}
                        {issues.resources.length > 0 && (
                          <div>
                            <div className="text-red-200/90 font-semibold">
                              Ресурсы
                            </div>
                            <div>
                              {Array.from(new Set(issues.resources)).join(', ')}
                            </div>
                          </div>
                        )}
                        {issues.buildings.length > 0 && (
                          <div>
                            <div className="text-red-200/90 font-semibold">
                              Здания
                            </div>
                            <div>
                              {Array.from(new Set(issues.buildings)).join(', ')}
                            </div>
                          </div>
                        )}
                        {issues.other.length > 0 && (
                          <div>
                            <div className="text-red-200/90 font-semibold">
                              Прочее
                            </div>
                            <div>
                              {Array.from(new Set(issues.other)).join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => onStart(building.id, owner)}
                      disabled={
                        !canStart ||
                        hasIssues ||
                        (ownerType === 'company' && !companyId)
                      }
                      className={`h-8 px-2 rounded-lg border text-[11px] flex items-center gap-1 ${
                        canStart
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30'
                          : 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      <Hammer className="w-3.5 h-3.5" />
                      Строить
                    </button>
                    <button
                      onClick={() => onCancel(building.id)}
                      disabled={!canCancel}
                      className={`h-8 px-2 rounded-lg border text-[11px] flex items-center gap-1 ${
                        canCancel
                          ? 'bg-white/5 border-white/10 text-white/70 hover:border-emerald-400/40'
                          : 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Отменить
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

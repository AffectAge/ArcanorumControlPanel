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
} from '../types';

type ConstructionModalProps = {
  open: boolean;
  provinceId?: string;
  province?: ProvinceData;
  provinces?: Record<string, ProvinceData>;
  buildings: BuildingDefinition[];
  companies: Company[];
  countries: Country[];
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
  companies,
  countries,
  activeCountryId,
  activeCountryPoints,
  onClose,
  onStart,
  onCancel,
}: ConstructionModalProps) {
  if (!open || !provinceId || !province) return null;

  const isOwner = Boolean(
    activeCountryId && province.ownerCountryId === activeCountryId,
  );
  const [ownerType, setOwnerType] = useState<'state' | 'company'>('state');
  const [companyId, setCompanyId] = useState('');
  const [stateCountryId, setStateCountryId] = useState('');
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
  const resolvedStateCountryId =
    stateCountryId || activeCountryId || countries[0]?.id || 'state';
  const owner: BuildingOwner =
    ownerType === 'company' && companyId
      ? { type: 'company', companyId }
      : { type: 'state', countryId: resolvedStateCountryId };
  const progressMap = province.constructionProgress ?? {};
  const builtList = province.buildingsBuilt ?? [];
  const provincesList = provinces ? Object.values(provinces) : [province];
  const activeTasks = Object.values(progressMap).reduce(
    (sum, entries) => sum + entries.length,
    0,
  );
  const perTask =
    activeTasks > 0 ? Math.max(0, activeCountryPoints) / activeTasks : 0;

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
          {!isOwner && (
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
              disabled={!isOwner}
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
                  {countries.map((country) => (
                    <button
                      key={country.id}
                      onClick={() => setStateCountryId(country.id)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                        resolvedStateCountryId === country.id
                          ? 'border-emerald-400/60 bg-emerald-500/20'
                          : 'border-white/10 bg-black/30 hover:border-emerald-400/40'
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
                  ))}
                </div>
              </div>
            )}
            {ownerType === 'company' && (
              <div className="flex items-center gap-2 max-w-full flex-wrap">
                {availableCompanies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => setCompanyId(company.id)}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                      companyId === company.id
                        ? 'border-emerald-400/60 bg-emerald-500/20'
                        : 'border-white/10 bg-black/30 hover:border-emerald-400/40'
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
                ))}
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
              const issues: string[] = [];
              if (requirements?.maxPerProvince != null) {
                const limit = requirements.maxPerProvince;
                if (limit > 0 && builtCount + entries.length >= limit) {
                  issues.push(`Лимит на провинцию: ${limit}`);
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
                      issues.push(`Лимит на государство: ${limit}`);
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
                    issues.push(`Лимит на мир: ${limit}`);
                  }
                }
              }
              const logicOk = requirements?.logic
                ? evaluateRequirementNode(requirements.logic, province)
                : true;
              if (!logicOk) {
                issues.push('Не выполнены логические критерии');
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
                  issues.push('Нужен другой климат');
                }
                if (
                  climateReq.noneOf.length > 0 &&
                  province.climateId &&
                  climateReq.noneOf.includes(province.climateId)
                ) {
                  issues.push('Запрещенный климат');
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
                  issues.push('Нужен другой ландшафт');
                }
                if (
                  landscapeReq.noneOf.length > 0 &&
                  province.landscapeId &&
                  landscapeReq.noneOf.includes(province.landscapeId)
                ) {
                  issues.push('Запрещенный ландшафт');
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
                  issues.push('Нужна другая культура');
                }
                if (
                  cultureReq.noneOf.length > 0 &&
                  province.cultureId &&
                  cultureReq.noneOf.includes(province.cultureId)
                ) {
                  issues.push('Запрещенная культура');
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
                  issues.push('Нужна другая религия');
                }
                if (
                  religionReq.noneOf.length > 0 &&
                  province.religionId &&
                  religionReq.noneOf.includes(province.religionId)
                ) {
                  issues.push('Запрещенная религия');
                }
              }
              if (requirements?.resources) {
                const amounts = province.resourceAmounts ?? {};
                Object.entries(requirements.resources).forEach(([id, amount]) => {
                  if ((amounts[id] ?? 0) < Math.max(0, amount)) {
                    issues.push('Недостаточно ресурсов');
                  }
                });
              }
              if (requirements?.dependencies) {
                const ok = requirements.dependencies.every(
                  (depId) =>
                    builtList.filter((entry) => entry.buildingId === depId).length > 0,
                );
                if (!ok) issues.push('Нет требуемых зданий');
              }
              const canStart = isOwner;
              const canCancel = isOwner && hasProgress;

              return (
                <div
                  key={building.id}
                  className="grid grid-cols-12 items-center gap-2 px-3 py-3 rounded-xl bg-white/5 border border-white/10"
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
                      <div className="text-white/80 text-sm">{building.name}</div>
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
                    {issues.length > 0 && (
                      <div className="text-red-300 text-[11px] mt-1">
                        {Array.from(new Set(issues)).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => onStart(building.id, owner)}
                      disabled={
                        !canStart ||
                        issues.length > 0 ||
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

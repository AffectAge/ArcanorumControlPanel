import { X, Hammer, Factory, MapPin, Building, Trash2, Hammer as HammerIcon, Plus, Coins } from 'lucide-react';
import { useMemo, useState } from 'react';
import { expandDiplomacyAgreements } from '../diplomacyUtils';
import type {
  BuildingDefinition,
  Country,
  ProvinceRecord,
  Company,
  Industry,
  ProvinceData,
  TraitCriteria,
  RequirementNode,
  Trait,
  DiplomacyAgreement,
} from '../types';

type IndustryModalProps = {
  open: boolean;
  provinces: ProvinceRecord;
  buildings: BuildingDefinition[];
  industries: Industry[];
  countries: Country[];
  companies: Company[];
  resources: Trait[];
  diplomacyAgreements: DiplomacyAgreement[];
  turn: number;
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
            : node.category === 'religion'
              ? province.religionId
              : node.category === 'continent'
                ? province.continentId
                : province.regionId;
    return Boolean(key && key === node.id);
  }
  if (node.op === 'and') {
    return node.children.every((child) => evaluateRequirementNode(child, province));
  }
  if (node.op === 'or') {
    return node.children.some((child) => evaluateRequirementNode(child, province));
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

const getOwnerCountryId = (
  owner: { type: 'state'; countryId: string } | { type: 'company'; companyId: string },
  companies: Company[],
) =>
  owner.type === 'state'
    ? owner.countryId
    : companies.find((c) => c.id === owner.companyId)?.countryId;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const getProductivityBarColor = (percent: number) => {
  const safe = clamp01(percent / 100);
  const hue = Math.round(120 * safe);
  return `hsl(${hue} 85% 45%)`;
};

const isBuildingActiveForProvince = (
  building: BuildingDefinition | undefined,
  province: ProvinceData | undefined,
  provinces: ProvinceRecord,
  owner: { type: 'state'; countryId: string } | { type: 'company'; companyId: string },
  companies: Company[],
  diplomacyAgreements: DiplomacyAgreement[],
  allBuildings: BuildingDefinition[],
): boolean => {
  if (!building || !province) return true;
  const requirements = building.requirements;
  if (!requirements) return true;
  if (requirements.logic) {
    if (!evaluateRequirementNode(requirements.logic, province)) return false;
  } else {
    const climateReq = normalizeTraitCriteria(
      requirements.climate,
      requirements.climateId,
    );
    if (
      climateReq.anyOf.length > 0 &&
      (!province.climateId || !climateReq.anyOf.includes(province.climateId))
    ) {
      return false;
    }
    if (
      climateReq.noneOf.length > 0 &&
      province.climateId &&
      climateReq.noneOf.includes(province.climateId)
    ) {
      return false;
    }
    const landscapeReq = normalizeTraitCriteria(
      requirements.landscape,
      requirements.landscapeId,
    );
    if (
      landscapeReq.anyOf.length > 0 &&
      (!province.landscapeId ||
        !landscapeReq.anyOf.includes(province.landscapeId))
    ) {
      return false;
    }
    if (
      landscapeReq.noneOf.length > 0 &&
      province.landscapeId &&
      landscapeReq.noneOf.includes(province.landscapeId)
    ) {
      return false;
    }
    const cultureReq = normalizeTraitCriteria(
      requirements.culture,
      requirements.cultureId,
    );
    if (
      cultureReq.anyOf.length > 0 &&
      (!province.cultureId || !cultureReq.anyOf.includes(province.cultureId))
    ) {
      return false;
    }
    if (
      cultureReq.noneOf.length > 0 &&
      province.cultureId &&
      cultureReq.noneOf.includes(province.cultureId)
    ) {
      return false;
    }
    const religionReq = normalizeTraitCriteria(
      requirements.religion,
      requirements.religionId,
    );
    if (
      religionReq.anyOf.length > 0 &&
      (!province.religionId || !religionReq.anyOf.includes(province.religionId))
    ) {
      return false;
    }
    if (
      religionReq.noneOf.length > 0 &&
      province.religionId &&
      religionReq.noneOf.includes(province.religionId)
    ) {
      return false;
    }
    const continentReq = normalizeTraitCriteria(
      requirements.continent,
      requirements.continentId,
    );
    if (
      continentReq.anyOf.length > 0 &&
      (!province.continentId ||
        !continentReq.anyOf.includes(province.continentId))
    ) {
      return false;
    }
    if (
      continentReq.noneOf.length > 0 &&
      province.continentId &&
      continentReq.noneOf.includes(province.continentId)
    ) {
      return false;
    }
    const regionReq = normalizeTraitCriteria(
      requirements.region,
      requirements.regionId,
    );
    if (
      regionReq.anyOf.length > 0 &&
      (!province.regionId || !regionReq.anyOf.includes(province.regionId))
    ) {
      return false;
    }
    if (
      regionReq.noneOf.length > 0 &&
      province.regionId &&
      regionReq.noneOf.includes(province.regionId)
    ) {
      return false;
    }
  }

  if (requirements.resources) {
    const amounts = province.resourceAmounts ?? {};
    const legacyRequired = Object.entries(requirements.resources)
      .filter(([, value]) => typeof value === 'number' && value > 0)
      .map(([id]) => id);
    const required = requirements.resources.anyOf ?? legacyRequired;
    const forbidden = requirements.resources.noneOf ?? [];
    if (
      required.length > 0 &&
      !required.every((id) => (amounts[id] ?? 0) > 0)
    ) {
      return false;
    }
    if (forbidden.length > 0 && forbidden.some((id) => (amounts[id] ?? 0) > 0)) {
      return false;
    }
  }

  if (requirements.radiation) {
    const value = province.radiation ?? 0;
    if (requirements.radiation.min != null && value < requirements.radiation.min) {
      return false;
    }
    if (requirements.radiation.max != null && value > requirements.radiation.max) {
      return false;
    }
  }

  if (requirements.pollution) {
    const value = province.pollution ?? 0;
    if (requirements.pollution.min != null && value < requirements.pollution.min) {
      return false;
    }
    if (requirements.pollution.max != null && value > requirements.pollution.max) {
      return false;
    }
  }

  if (requirements.buildings) {
    const provinceCount = (depId: string) =>
      province.buildingsBuilt?.filter((entry) => entry.buildingId === depId)
        .length ?? 0;
    const ownerCountryId = getOwnerCountryId(owner, companies);
    const countryCount = (depId: string) =>
      ownerCountryId
        ? Object.values(provinces).reduce((sum, prov) => {
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
    const globalCount = (depId: string) =>
      Object.values(provinces).reduce(
        (sum, prov) =>
          sum +
          (prov.buildingsBuilt ?? []).filter(
            (entry) => entry.buildingId === depId,
          ).length,
        0,
      );

    const ok = Object.entries(requirements.buildings).every(
      ([depId, constraint]) => {
        const province = (constraint as any).province ?? constraint;
        const country = (constraint as any).country;
        const global = (constraint as any).global;
        const pCount = provinceCount(depId);
        const cCount = countryCount(depId);
        const gCount = globalCount(depId);
        if (province?.min != null && pCount < province.min) return false;
        if (province?.max != null && pCount > province.max) return false;
        if (country?.min != null && cCount < country.min) return false;
        if (country?.max != null && cCount > country.max) return false;
        if (global?.min != null && gCount < global.min) return false;
        if (global?.max != null && gCount > global.max) return false;
        return true;
      },
    );
    if (!ok) return false;
  } else if (requirements.dependencies) {
    const ok = requirements.dependencies.every(
      (depId) =>
        province.buildingsBuilt?.filter((entry) => entry.buildingId === depId)
          .length ?? 0 > 0,
    );
    if (!ok) return false;
  }

  if (requirements.allowedCountries || requirements.allowedCompanies) {
    if (owner.type === 'state') {
      const mode = requirements.allowedCountriesMode ?? 'allow';
      const list = requirements.allowedCountries ?? [];
      if (list.length === 0) {
        if (mode === 'allow') return false;
      } else {
        const included = list.includes(owner.countryId);
        if ((mode === 'allow' && !included) || (mode === 'deny' && included)) {
          return false;
        }
      }
    } else {
      const mode = requirements.allowedCompaniesMode ?? 'allow';
      const list = requirements.allowedCompanies ?? [];
      if (list.length === 0) {
        if (mode === 'allow') return false;
      } else {
        const included = list.includes(owner.companyId);
        if ((mode === 'allow' && !included) || (mode === 'deny' && included)) {
          return false;
        }
      }
    }
  }

  const hostId = province.ownerCountryId;
  const ownerCountryId = getOwnerCountryId(owner, companies);
  if (hostId && ownerCountryId && hostId !== ownerCountryId) {
    const directionalAgreements = expandDiplomacyAgreements(diplomacyAgreements);
    const agreements = directionalAgreements.filter(
      (agreement) =>
        agreement.hostCountryId === hostId &&
        agreement.guestCountryId === ownerCountryId,
    );
    if (agreements.length === 0) return false;
    const hasOwnerAccess = agreements.some((agreement) => ownerAllowed(agreement, owner));
    if (!hasOwnerAccess) return false;

    const industryAllowed = (agreement: DiplomacyAgreement, id: string) => {
      if (!agreement.industries || agreement.industries.length === 0) return true;
      const industryId =
        allBuildings.find((item) => item.id === id)?.industryId ?? undefined;
      return Boolean(industryId && agreement.industries.includes(industryId));
    };
    const buildingAllowed = (agreement: DiplomacyAgreement, id: string) => {
      if (!agreement.buildingIds || agreement.buildingIds.length === 0) return true;
      return agreement.buildingIds.includes(id);
    };
    const provinceAllowed = (agreement: DiplomacyAgreement, provinceId: string) => {
      if (!agreement.provinceIds || agreement.provinceIds.length === 0) return true;
      return agreement.provinceIds.includes(provinceId);
    };
    const ownerAllowed = (agreement: DiplomacyAgreement, target: BuildingOwner) => {
      const allowsState = agreement.allowState ?? agreement.kind === 'state';
      const allowsCompanies =
        agreement.allowCompanies ?? agreement.kind === 'company';
      if (target.type === 'state') return allowsState;
      if (!allowsCompanies) return false;
      if (agreement.companyIds && agreement.companyIds.length > 0) {
        return agreement.companyIds.includes(target.companyId);
      }
      return true;
    };
    const agreementMatch = (
      target: BuildingOwner,
      agreementsToUse: DiplomacyAgreement[],
    ) =>
      agreementsToUse.find(
        (agreement) => ownerAllowed(agreement, target),
      );

    const countAgreementEntries = (
      agreementsToUse: DiplomacyAgreement[],
      provinceList: ProvinceData[],
    ) =>
      provinceList.reduce((sum, prov) => {
        const built = (prov.buildingsBuilt ?? []).filter((entry) => {
          const match = agreementMatch(entry.owner, agreementsToUse);
          if (!match) return false;
          const entryCountryId = getOwnerCountryId(entry.owner, companies);
          if (entryCountryId !== ownerCountryId) return false;
          if (!provinceAllowed(match, prov.id)) return false;
          if (!buildingAllowed(match, entry.buildingId)) return false;
          return industryAllowed(match, entry.buildingId);
        }).length;
        const inProgress = Object.entries(prov.constructionProgress ?? {}).reduce(
          (sumProgress, [entryBuildingId, entries]) => {
            const filtered = entries.filter((entry) => {
              const match = agreementMatch(entry.owner, agreementsToUse);
              if (!match) return false;
              const entryCountryId = getOwnerCountryId(entry.owner, companies);
              if (entryCountryId !== ownerCountryId) return false;
              if (!provinceAllowed(match, prov.id)) return false;
              if (!buildingAllowed(match, entryBuildingId)) return false;
              return industryAllowed(match, entryBuildingId);
            });
            return sumProgress + filtered.length;
          },
          0,
        );
        return sum + built + inProgress;
      }, 0);

    const allowed = agreements.some((agreement) => {
      if (!ownerAllowed(agreement, owner)) return false;
      if (!provinceAllowed(agreement, province.id)) return false;
      if (!buildingAllowed(agreement, building.id)) return false;
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
        const hostProvinces = Object.values(provinces).filter(
          (prov) => prov.ownerCountryId === hostId,
        );
        const count = countAgreementEntries([agreement], hostProvinces);
        if (count >= perCountry) return false;
      }
      if (global > 0) {
        const count = countAgreementEntries(
          [agreement],
          Object.values(provinces),
        );
        if (count >= global) return false;
      }
      return true;
    });

    if (!allowed) return false;
  }

  return true;
};

const getInactiveReasons = (
  building: BuildingDefinition | undefined,
  province: ProvinceData | undefined,
  provinces: ProvinceRecord,
  owner: { type: 'state'; countryId: string } | { type: 'company'; companyId: string },
  companies: Company[],
  resources: Trait[],
  diplomacyAgreements: DiplomacyAgreement[],
  allBuildings: BuildingDefinition[],
): string[] => {
  if (!building || !province) return [];
  const reasons: string[] = [];
  const requirements = building.requirements;
  if (!requirements) return reasons;

  if (requirements.logic) {
    if (!evaluateRequirementNode(requirements.logic, province)) {
      reasons.push('Логические критерии не выполнены');
    }
  } else {
    const climateReq = normalizeTraitCriteria(
      requirements.climate,
      requirements.climateId,
    );
    if (
      climateReq.anyOf.length > 0 &&
      (!province.climateId || !climateReq.anyOf.includes(province.climateId))
    ) {
      reasons.push('Нужен другой климат');
    }
    if (
      climateReq.noneOf.length > 0 &&
      province.climateId &&
      climateReq.noneOf.includes(province.climateId)
    ) {
      reasons.push('Запрещенный климат');
    }

    const landscapeReq = normalizeTraitCriteria(
      requirements.landscape,
      requirements.landscapeId,
    );
    if (
      landscapeReq.anyOf.length > 0 &&
      (!province.landscapeId ||
        !landscapeReq.anyOf.includes(province.landscapeId))
    ) {
      reasons.push('Нужен другой ландшафт');
    }
    if (
      landscapeReq.noneOf.length > 0 &&
      province.landscapeId &&
      landscapeReq.noneOf.includes(province.landscapeId)
    ) {
      reasons.push('Запрещенный ландшафт');
    }

    const cultureReq = normalizeTraitCriteria(
      requirements.culture,
      requirements.cultureId,
    );
    if (
      cultureReq.anyOf.length > 0 &&
      (!province.cultureId || !cultureReq.anyOf.includes(province.cultureId))
    ) {
      reasons.push('Нужна другая культура');
    }
    if (
      cultureReq.noneOf.length > 0 &&
      province.cultureId &&
      cultureReq.noneOf.includes(province.cultureId)
    ) {
      reasons.push('Запрещенная культура');
    }

    const religionReq = normalizeTraitCriteria(
      requirements.religion,
      requirements.religionId,
    );
    if (
      religionReq.anyOf.length > 0 &&
      (!province.religionId || !religionReq.anyOf.includes(province.religionId))
    ) {
      reasons.push('Нужна другая религия');
    }
    if (
      religionReq.noneOf.length > 0 &&
      province.religionId &&
      religionReq.noneOf.includes(province.religionId)
    ) {
      reasons.push('Запрещенная религия');
    }

    const continentReq = normalizeTraitCriteria(
      requirements.continent,
      requirements.continentId,
    );
    if (
      continentReq.anyOf.length > 0 &&
      (!province.continentId ||
        !continentReq.anyOf.includes(province.continentId))
    ) {
      reasons.push('Нужен другой континент');
    }
    if (
      continentReq.noneOf.length > 0 &&
      province.continentId &&
      continentReq.noneOf.includes(province.continentId)
    ) {
      reasons.push('Запрещенный континент');
    }

    const regionReq = normalizeTraitCriteria(
      requirements.region,
      requirements.regionId,
    );
    if (
      regionReq.anyOf.length > 0 &&
      (!province.regionId || !regionReq.anyOf.includes(province.regionId))
    ) {
      reasons.push('Нужен другой регион');
    }
    if (
      regionReq.noneOf.length > 0 &&
      province.regionId &&
      regionReq.noneOf.includes(province.regionId)
    ) {
      reasons.push('Запрещенный регион');
    }
  }

  if (requirements.resources) {
    const amounts = province.resourceAmounts ?? {};
    const legacyRequired = Object.entries(requirements.resources)
      .filter(([, value]) => typeof value === 'number' && value > 0)
      .map(([id]) => id);
    const required = requirements.resources.anyOf ?? legacyRequired;
    const forbidden = requirements.resources.noneOf ?? [];
    if (required.length > 0) {
      const missing = required.filter((id) => (amounts[id] ?? 0) <= 0);
      if (missing.length > 0) {
        const names = missing
          .map((id) => resources.find((r) => r.id === id)?.name ?? id)
          .join(', ');
        reasons.push(`Нет ресурсов: ${names}`);
      }
    }
    if (forbidden.length > 0) {
      const present = forbidden.filter((id) => (amounts[id] ?? 0) > 0);
      if (present.length > 0) {
        const names = present
          .map((id) => resources.find((r) => r.id === id)?.name ?? id)
          .join(', ');
        reasons.push(`Запрещены ресурсы: ${names}`);
      }
    }
  }

  if (requirements.radiation) {
    const value = province.radiation ?? 0;
    if (requirements.radiation.min != null && value < requirements.radiation.min) {
      reasons.push(`Радиация ниже ${requirements.radiation.min}`);
    }
    if (requirements.radiation.max != null && value > requirements.radiation.max) {
      reasons.push(`Радиация выше ${requirements.radiation.max}`);
    }
  }

  if (requirements.pollution) {
    const value = province.pollution ?? 0;
    if (requirements.pollution.min != null && value < requirements.pollution.min) {
      reasons.push(`Загрязнение ниже ${requirements.pollution.min}`);
    }
    if (requirements.pollution.max != null && value > requirements.pollution.max) {
      reasons.push(`Загрязнение выше ${requirements.pollution.max}`);
    }
  }

  if (requirements.buildings) {
    const provinceCount = (depId: string) =>
      province.buildingsBuilt?.filter((entry) => entry.buildingId === depId)
        .length ?? 0;
    const ownerCountryId = getOwnerCountryId(owner, companies);
    const countryCount = (depId: string) =>
      ownerCountryId
        ? Object.values(provinces).reduce((sum, prov) => {
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
    const globalCount = (depId: string) =>
      Object.values(provinces).reduce(
        (sum, prov) =>
          sum +
          (prov.buildingsBuilt ?? []).filter(
            (entry) => entry.buildingId === depId,
          ).length,
        0,
      );

    Object.entries(requirements.buildings).forEach(([depId, constraint]) => {
      const name = building?.name ?? depId;
      const provinceRule = (constraint as any).province ?? constraint;
      const countryRule = (constraint as any).country;
      const globalRule = (constraint as any).global;
      const pCount = provinceCount(depId);
      const cCount = countryCount(depId);
      const gCount = globalCount(depId);
      if (provinceRule?.min != null && pCount < provinceRule.min) {
        reasons.push(`Провинция: нужно ${provinceRule.min} "${name}"`);
      }
      if (provinceRule?.max != null && pCount > provinceRule.max) {
        reasons.push(`Провинция: не больше ${provinceRule.max} "${name}"`);
      }
      if (countryRule?.min != null && cCount < countryRule.min) {
        reasons.push(`Государство: нужно ${countryRule.min} "${name}"`);
      }
      if (countryRule?.max != null && cCount > countryRule.max) {
        reasons.push(`Государство: не больше ${countryRule.max} "${name}"`);
      }
      if (globalRule?.min != null && gCount < globalRule.min) {
        reasons.push(`Мир: нужно ${globalRule.min} "${name}"`);
      }
      if (globalRule?.max != null && gCount > globalRule.max) {
        reasons.push(`Мир: не больше ${globalRule.max} "${name}"`);
      }
    });
  } else if (requirements.dependencies) {
    const ok = requirements.dependencies.every(
      (depId) =>
        province.buildingsBuilt?.filter((entry) => entry.buildingId === depId)
          .length ?? 0 > 0,
    );
    if (!ok) reasons.push('Нет требуемых зданий');
  }

  if (requirements.allowedCountries || requirements.allowedCompanies) {
    if (owner.type === 'state') {
      const mode = requirements.allowedCountriesMode ?? 'allow';
      const list = requirements.allowedCountries ?? [];
      if (list.length === 0) {
        if (mode === 'allow') reasons.push('Страна не разрешена');
      } else {
        const included = list.includes(owner.countryId);
        if ((mode === 'allow' && !included) || (mode === 'deny' && included)) {
          reasons.push('Страна не разрешена');
        }
      }
    } else {
      const mode = requirements.allowedCompaniesMode ?? 'allow';
      const list = requirements.allowedCompanies ?? [];
      if (list.length === 0) {
        if (mode === 'allow') reasons.push('Компания не разрешена');
      } else {
        const included = list.includes(owner.companyId);
        if ((mode === 'allow' && !included) || (mode === 'deny' && included)) {
          reasons.push('Компания не разрешена');
        }
      }
    }
  }

  const hostId = province.ownerCountryId;
  const ownerCountryId = getOwnerCountryId(owner, companies);
  if (hostId && ownerCountryId && hostId !== ownerCountryId) {
    const directionalAgreements = expandDiplomacyAgreements(diplomacyAgreements);
    const agreements = directionalAgreements.filter(
      (agreement) =>
        agreement.hostCountryId === hostId &&
        agreement.guestCountryId === ownerCountryId,
    );
    if (agreements.length === 0) {
      reasons.push('Нет дипломатического разрешения');
    } else {

      const hasOwnerAccess = agreements.some((agreement) => ownerAllowed(agreement, owner));
      if (!hasOwnerAccess) {
        reasons.push('??? ???????????????? ??????????');
      }
      const industryAllowed = (agreement: DiplomacyAgreement, id: string) => {
        if (!agreement.industries || agreement.industries.length === 0) return true;
        const industryId =
          allBuildings.find((item) => item.id === id)?.industryId ?? undefined;
        return Boolean(industryId && agreement.industries.includes(industryId));
      };
      const buildingAllowed = (agreement: DiplomacyAgreement, id: string) => {
        if (!agreement.buildingIds || agreement.buildingIds.length === 0) return true;
        return agreement.buildingIds.includes(id);
      };
      const provinceAllowed = (agreement: DiplomacyAgreement, provinceId: string) => {
        if (!agreement.provinceIds || agreement.provinceIds.length === 0) return true;
        return agreement.provinceIds.includes(provinceId);
      };
      const ownerAllowed = (agreement: DiplomacyAgreement, target: BuildingOwner) => {
        const allowsState = agreement.allowState ?? agreement.kind === 'state';
        const allowsCompanies =
          agreement.allowCompanies ?? agreement.kind === 'company';
        if (target.type === 'state') return allowsState;
        if (!allowsCompanies) return false;
        if (agreement.companyIds && agreement.companyIds.length > 0) {
          return agreement.companyIds.includes(target.companyId);
        }
        return true;
      };
      const agreementMatch = (
        target: BuildingOwner,
        agreementsToUse: DiplomacyAgreement[],
      ) => agreementsToUse.find((agreement) => ownerAllowed(agreement, target));
      const countAgreementEntries = (
        agreementsToUse: DiplomacyAgreement[],
        provinceList: ProvinceData[],
      ) =>
        provinceList.reduce((sum, prov) => {
          const built = (prov.buildingsBuilt ?? []).filter((entry) => {
            const match = agreementMatch(entry.owner, agreementsToUse);
            if (!match) return false;
            const entryCountryId = getOwnerCountryId(entry.owner, companies);
            if (entryCountryId !== ownerCountryId) return false;
            if (!provinceAllowed(match, prov.id)) return false;
            if (!buildingAllowed(match, entry.buildingId)) return false;
            return industryAllowed(match, entry.buildingId);
          }).length;
          const inProgress = Object.entries(prov.constructionProgress ?? {}).reduce(
            (sumProgress, [entryBuildingId, entries]) => {
              const filtered = entries.filter((entry) => {
                const match = agreementMatch(entry.owner, agreementsToUse);
                if (!match) return false;
                const entryCountryId = getOwnerCountryId(entry.owner, companies);
                if (entryCountryId !== ownerCountryId) return false;
                if (!provinceAllowed(match, prov.id)) return false;
                if (!buildingAllowed(match, entryBuildingId)) return false;
                return industryAllowed(match, entryBuildingId);
              });
              return sumProgress + filtered.length;
            },
            0,
          );
          return sum + built + inProgress;
        }, 0);

      const allowed = agreements.some((agreement) => {
        if (!ownerAllowed(agreement, owner)) return false;
        if (!provinceAllowed(agreement, province.id)) return false;
        if (!buildingAllowed(agreement, building?.id ?? '')) return false;
        if (!industryAllowed(agreement, building?.id ?? '')) return false;
        const limits = agreement.limits ?? {};
        const perProvince = limits.perProvince ?? 0;
        const perCountry = limits.perCountry ?? 0;
        const global = limits.global ?? 0;
        if (perProvince > 0) {
          const count = countAgreementEntries([agreement], [province]);
          if (count >= perProvince) return false;
        }
        if (perCountry > 0) {
          const hostProvinces = Object.values(provinces).filter(
            (prov) => prov.ownerCountryId === hostId,
          );
          const count = countAgreementEntries([agreement], hostProvinces);
          if (count >= perCountry) return false;
        }
        if (global > 0) {
          const count = countAgreementEntries(
            [agreement],
            Object.values(provinces),
          );
          if (count >= global) return false;
        }
        return true;
      });

      if (!allowed) {
        reasons.push('Превышен лимит дипломатического соглашения');
      }
    }
  }

  return reasons;
};

export default function IndustryModal({
  open,
  provinces,
  buildings,
  industries,
  resources,
  countries,
  companies,
  diplomacyAgreements,
  turn,
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
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
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
  const activeDiplomacyAgreements = useMemo(
    () =>
      expandDiplomacyAgreements(diplomacyAgreements).filter((agreement) => {
        if (!agreement.durationTurns || agreement.durationTurns <= 0) return true;
        if (!agreement.startTurn) return true;
        return turn - agreement.startTurn < agreement.durationTurns;
      }),
    [diplomacyAgreements, turn],
  );

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
  const resourceNameById = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource.name])),
    [resources],
  );
  const resourceIconById = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource.iconDataUrl])),
    [resources],
  );

  const getEconomyRows = (
    planned?: Record<string, number>,
    actual?: Record<string, number>,
  ) => {
    const ids = Array.from(
      new Set([...Object.keys(planned ?? {}), ...Object.keys(actual ?? {})]),
    ).sort((a, b) =>
      (resourceNameById.get(a) ?? a).localeCompare(resourceNameById.get(b) ?? b),
    );
    return ids.map((id) => ({
      id,
      name: resourceNameById.get(id) ?? id,
      iconDataUrl: resourceIconById.get(id),
      planned: Math.max(0, planned?.[id] ?? 0),
      actual: Math.max(0, actual?.[id] ?? 0),
    }));
  };

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
        isActive: isBuildingActiveForProvince(
          buildings.find((b) => b.id === entry.buildingId),
          province,
          provinces,
          entry.owner,
          companies,
          activeDiplomacyAgreements,
          buildings,
        ),
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
            isActive: isBuildingActiveForProvince(
              buildings.find((b) => b.id === buildingId),
              province,
              provinces,
              entry.owner,
              companies,
              activeDiplomacyAgreements,
              buildings,
            ),
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
        isActive: true,
      }));

    return [...builtCards, ...constructionCards, ...emptyCards];
  }, [rows, filterProvinceId, buildings, provinces, companies, activeDiplomacyAgreements]);

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
        if (filterActive !== 'all') return false;
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
      if (filterActive === 'active' && !card.isActive) return false;
      if (filterActive === 'inactive' && card.isActive) return false;
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
    filterActive,
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
            <label className="flex flex-col gap-2 text-white/70 text-xs">
              Активность
              <select
                value={filterActive}
                onChange={(event) =>
                  setFilterActive(event.target.value as 'all' | 'active' | 'inactive')
                }
                className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
              >
                <option value="all" className="bg-[#0b111b] text-white">
                  Все
                </option>
                <option value="active" className="bg-[#0b111b] text-white">
                  Только активные
                </option>
                <option value="inactive" className="bg-[#0b111b] text-white">
                  Только неактивные
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
                  setFilterActive('all');
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
                        const activeProvince = provinces[card.provinceId];
                  const inactiveReasons = getInactiveReasons(
                    building,
                    activeProvince,
                    provinces,
                    card.owner,
                    companies,
                    resources,
                    activeDiplomacyAgreements,
                    buildings,
                  );
                  const isActive = inactiveReasons.length === 0;
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
                        const builtEntry =
                          card.kind === 'built'
                            ? provinces[card.provinceId]?.buildingsBuilt?.[card.index]
                            : undefined;
                        const productivityPercent = Math.round(
                          Math.max(0, Math.min(1, builtEntry?.lastProductivity ?? 0)) * 100,
                        );
                        const warehouseRows = getEconomyRows(
                          builtEntry?.warehouseByResourceId,
                          builtEntry?.warehouseByResourceId,
                        );
                        const consumptionRows = getEconomyRows(
                          building?.consumptionByResourceId,
                          builtEntry?.lastConsumedByResourceId,
                        );
                        const purchaseRows = getEconomyRows(
                          builtEntry?.lastPurchaseNeedByResourceId,
                          builtEntry?.lastPurchasedByResourceId,
                        );
                        const extractionRows = getEconomyRows(
                          building?.extractionByResourceId,
                          builtEntry?.lastExtractedByResourceId,
                        );
                        const productionRows = getEconomyRows(
                          building?.productionByResourceId,
                          builtEntry?.lastProducedByResourceId,
                        );

                        return (
                          <div
                            key={card.key}
                            className={`rounded-2xl border bg-gradient-to-br from-white/5 to-transparent p-4 flex flex-col gap-4 shadow-lg shadow-black/30 ${
                              !isActive
                                ? 'border-red-400/60'
                                : card.kind === 'construction'
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
                                  <div className="text-white/80 text-sm font-semibold flex items-center gap-2">
                                    <span>{building?.name ?? card.buildingId}</span>
                                    {!isActive && (
                                      <span className="relative group px-2 py-0.5 rounded-full border border-red-400/40 bg-red-500/10 text-[10px] text-red-200">
                                        Неактивное
                                        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                          {inactiveReasons.join(', ')}
                                        </span>
                                      </span>
                                    )}
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
                              {card.kind === 'built' && (
                                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-white/60 text-[11px] uppercase tracking-wide">
                                      Экономика
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                      <div className="relative group flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/35 px-2 py-1">
                                        <span className="text-white/75 tabular-nums">
                                          Продуктивность: {productivityPercent}%
                                        </span>
                                        <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                          <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                              width: `${productivityPercent}%`,
                                              backgroundColor: getProductivityBarColor(
                                                productivityPercent,
                                              ),
                                            }}
                                          />
                                        </div>
                                        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                          Эффективность здания за ход.
                                        </span>
                                      </div>
                                      <span className="relative group rounded-full border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-amber-200 tabular-nums inline-flex items-center gap-1.5">
                                        <Coins className="w-3.5 h-3.5" />
                                        {(builtEntry?.ducats ?? 0).toFixed(2)}
                                        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                          Текущий запас дукатов здания.
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="rounded-lg border border-white/10 bg-black/25 p-2.5 space-y-1">
                                      <div className="relative group w-fit text-white/50 text-[10px] uppercase tracking-wide">
                                        Склад
                                        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100 normal-case tracking-normal">
                                          Ресурсы, доступные на складе здания.
                                        </span>
                                      </div>
                                      {warehouseRows.length > 0 ? (
                                        warehouseRows.map((row) => (
                                          <div
                                            key={`warehouse-${card.key}-${row.id}`}
                                            className="w-full rounded border border-white/20 bg-white/5 px-2 py-1"
                                          >
                                            <div className="flex items-center justify-between text-[11px] text-white/70 tabular-nums">
                                              <span className="flex items-center gap-1.5">
                                                {row.iconDataUrl ? (
                                                  <img
                                                    src={row.iconDataUrl}
                                                    alt=""
                                                    className="w-3.5 h-3.5 rounded object-cover border border-white/10"
                                                  />
                                                ) : (
                                                  <span className="w-3.5 h-3.5 rounded-full border border-white/15 bg-white/10" />
                                                )}
                                                <span>{row.name}</span>
                                              </span>
                                              <span className="text-cyan-200">{row.actual.toFixed(2)}</span>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-white/45 text-[11px]">пусто</div>
                                      )}
                                    </div>
                                    <div className="rounded-lg border border-white/10 bg-black/25 p-2.5 space-y-1">
                                      <div className="relative group w-fit text-white/50 text-[10px] uppercase tracking-wide">
                                        Потребление (факт / макс)
                                        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100 normal-case tracking-normal">
                                          План и факт потребления ресурсов за ход.
                                        </span>
                                      </div>
                                      {consumptionRows.length > 0 ? (
                                        consumptionRows.map((row) => (
                                          <div
                                            key={`consume-${card.key}-${row.id}`}
                                            className="w-full rounded border border-white/20 bg-white/5 px-2 py-1"
                                          >
                                            <div className="flex items-center justify-between text-[11px] text-white/70 tabular-nums">
                                              <span className="flex items-center gap-1.5">
                                                {row.iconDataUrl ? (
                                                  <img
                                                    src={row.iconDataUrl}
                                                    alt=""
                                                    className="w-3.5 h-3.5 rounded object-cover border border-white/10"
                                                  />
                                                ) : (
                                                  <span className="w-3.5 h-3.5 rounded-full border border-white/15 bg-white/10" />
                                                )}
                                                <span>{row.name}</span>
                                              </span>
                                              <span className="inline-flex items-center gap-1">
                                                <span className="rounded border border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">
                                                  факт {row.actual.toFixed(2)}
                                                </span>
                                                <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white/70">
                                                  макс {row.planned.toFixed(2)}
                                                </span>
                                              </span>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-white/45 text-[11px]">не настроено</div>
                                      )}
                                    </div>
                                    <div className="rounded-lg border border-white/10 bg-black/25 p-2.5 space-y-1">
                                      <div className="relative group w-fit text-white/50 text-[10px] uppercase tracking-wide">
                                        Добыча (факт / макс)
                                        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100 normal-case tracking-normal">
                                          План и факт добычи ресурсов за ход.
                                        </span>
                                      </div>
                                      {extractionRows.length > 0 ? (
                                        extractionRows.map((row) => (
                                          <div
                                            key={`extract-${card.key}-${row.id}`}
                                            className="w-full rounded border border-white/20 bg-white/5 px-2 py-1"
                                          >
                                            <div className="flex items-center justify-between text-[11px] text-white/70 tabular-nums">
                                              <span className="flex items-center gap-1.5">
                                                {row.iconDataUrl ? (
                                                  <img
                                                    src={row.iconDataUrl}
                                                    alt=""
                                                    className="w-3.5 h-3.5 rounded object-cover border border-white/10"
                                                  />
                                                ) : (
                                                  <span className="w-3.5 h-3.5 rounded-full border border-white/15 bg-white/10" />
                                                )}
                                                <span>{row.name}</span>
                                              </span>
                                              <span className="inline-flex items-center gap-1">
                                                <span className="rounded border border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">
                                                  факт {row.actual.toFixed(2)}
                                                </span>
                                                <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white/70">
                                                  макс {row.planned.toFixed(2)}
                                                </span>
                                              </span>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-white/45 text-[11px]">не настроено</div>
                                      )}
                                    </div>
                                    <div className="rounded-lg border border-white/10 bg-black/25 p-2.5 space-y-1">
                                      <div className="relative group w-fit text-white/50 text-[10px] uppercase tracking-wide">
                                        Производство (факт / макс)
                                        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100 normal-case tracking-normal">
                                          План и факт производства ресурсов за ход.
                                        </span>
                                      </div>
                                      {productionRows.length > 0 ? (
                                        productionRows.map((row) => (
                                          <div
                                            key={`produce-${card.key}-${row.id}`}
                                            className="w-full rounded border border-white/20 bg-white/5 px-2 py-1"
                                          >
                                            <div className="flex items-center justify-between text-[11px] text-white/70 tabular-nums">
                                              <span className="flex items-center gap-1.5">
                                                {row.iconDataUrl ? (
                                                  <img
                                                    src={row.iconDataUrl}
                                                    alt=""
                                                    className="w-3.5 h-3.5 rounded object-cover border border-white/10"
                                                  />
                                                ) : (
                                                  <span className="w-3.5 h-3.5 rounded-full border border-white/15 bg-white/10" />
                                                )}
                                                <span>{row.name}</span>
                                              </span>
                                              <span className="inline-flex items-center gap-1">
                                                <span className="rounded border border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">
                                                  факт {row.actual.toFixed(2)}
                                                </span>
                                                <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white/70">
                                                  макс {row.planned.toFixed(2)}
                                                </span>
                                              </span>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-white/45 text-[11px]">не настроено</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
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
                  const builtEntry =
                    card.kind === 'built'
                      ? provinces[card.provinceId]?.buildingsBuilt?.[card.index]
                      : undefined;
                  const productivityPercent = Math.round(
                    Math.max(0, Math.min(1, builtEntry?.lastProductivity ?? 0)) * 100,
                  );
                  const warehouseRows = getEconomyRows(
                    builtEntry?.warehouseByResourceId,
                    builtEntry?.warehouseByResourceId,
                  );
                  const consumptionRows = getEconomyRows(
                    building?.consumptionByResourceId,
                    builtEntry?.lastConsumedByResourceId,
                  );
                  const purchaseRows = getEconomyRows(
                    builtEntry?.lastPurchaseNeedByResourceId,
                    builtEntry?.lastPurchasedByResourceId,
                  );
                  const extractionRows = getEconomyRows(
                    building?.extractionByResourceId,
                    builtEntry?.lastExtractedByResourceId,
                  );
                  const productionRows = getEconomyRows(
                    building?.productionByResourceId,
                    builtEntry?.lastProducedByResourceId,
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
                  const activeProvince = provinces[card.provinceId];
                  const inactiveReasons = getInactiveReasons(
                    building,
                    activeProvince,
                    provinces,
                    card.owner,
                    companies,
                    resources,
                    activeDiplomacyAgreements,
                    buildings,
                  );
                  const isActive = inactiveReasons.length === 0;
                  return (
                    <div
                      key={card.key}
                      className={`rounded-2xl border bg-gradient-to-br from-white/5 to-transparent p-4 flex flex-col gap-4 shadow-lg shadow-black/30 ${
                        !isActive
                          ? 'border-red-400/60'
                          : card.kind === 'construction'
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
                                  <div className="text-white/80 text-sm font-semibold flex items-center gap-2">
                                    <span>{building?.name ?? card.buildingId}</span>
                                    {!isActive && (
                                      <span className="relative group px-2 py-0.5 rounded-full border border-red-400/40 bg-red-500/10 text-[10px] text-red-200">
                                        Неактивное
                                        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                          {inactiveReasons.join(', ')}
                                        </span>
                                      </span>
                                    )}
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
                        {card.kind === 'built' && (
                          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-white/60 text-[11px] uppercase tracking-wide">
                                Экономика
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <div className="relative group flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/35 px-2 py-1">
                                  <span className="text-white/75 tabular-nums">
                                    Продуктивность: {productivityPercent}%
                                  </span>
                                  <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${productivityPercent}%`,
                                        backgroundColor: getProductivityBarColor(
                                          productivityPercent,
                                        ),
                                      }}
                                    />
                                  </div>
                                  <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                    Эффективность здания за ход.
                                  </span>
                                </div>
                                <span className="relative group rounded-full border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-amber-200 tabular-nums inline-flex items-center gap-1.5">
                                  <Coins className="w-3.5 h-3.5" />
                                  {(builtEntry?.ducats ?? 0).toFixed(2)}
                                  <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                    Текущий запас дукатов здания.
                                  </span>
                                </span>
                                <span className="relative group rounded-full border border-cyan-400/35 bg-cyan-500/15 px-2 py-0.5 text-cyan-200 tabular-nums">
                                  -{(builtEntry?.lastPurchaseCostDucats ?? 0).toFixed(2)} закуп
                                  <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                    Потрачено на закупки в этом ходу.
                                  </span>
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="rounded-lg border border-white/10 bg-black/25 p-2.5 space-y-1">
                                <div className="relative group w-fit text-white/50 text-[10px] uppercase tracking-wide">
                                  Склад
                                  <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100 normal-case tracking-normal">
                                    Ресурсы, доступные на складе здания.
                                  </span>
                                </div>
                                {warehouseRows.length > 0 ? (
                                  warehouseRows.map((row) => (
                                    <div
                                      key={`warehouse-mobile-${card.key}-${row.id}`}
                                      className="w-full rounded border border-white/20 bg-white/5 px-2 py-1"
                                    >
                                      <div className="flex items-center justify-between text-[11px] text-white/70 tabular-nums">
                                        <span className="flex items-center gap-1.5">
                                          {row.iconDataUrl ? (
                                            <img
                                              src={row.iconDataUrl}
                                              alt=""
                                              className="w-3.5 h-3.5 rounded object-cover border border-white/10"
                                            />
                                          ) : (
                                            <span className="w-3.5 h-3.5 rounded-full border border-white/15 bg-white/10" />
                                          )}
                                          <span>{row.name}</span>
                                        </span>
                                        <span className="text-cyan-200">{row.actual.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-white/45 text-[11px]">пусто</div>
                                )}
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/25 p-2.5 space-y-1">
                                <div className="relative group w-fit text-white/50 text-[10px] uppercase tracking-wide">
                                  Потребление (факт / макс)
                                  <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100 normal-case tracking-normal">
                                    План и факт потребления ресурсов за ход.
                                  </span>
                                </div>
                                {consumptionRows.length > 0 ? (
                                  consumptionRows.map((row) => (
                                    <div
                                      key={`consume-mobile-${card.key}-${row.id}`}
                                      className="w-full rounded border border-white/20 bg-white/5 px-2 py-1"
                                    >
                                      <div className="flex items-center justify-between text-[11px] text-white/70 tabular-nums">
                                        <span className="flex items-center gap-1.5">
                                          {row.iconDataUrl ? (
                                            <img
                                              src={row.iconDataUrl}
                                              alt=""
                                              className="w-3.5 h-3.5 rounded object-cover border border-white/10"
                                            />
                                          ) : (
                                            <span className="w-3.5 h-3.5 rounded-full border border-white/15 bg-white/10" />
                                          )}
                                          <span>{row.name}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                          <span className="rounded border border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">
                                            факт {row.actual.toFixed(2)}
                                          </span>
                                          <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white/70">
                                            макс {row.planned.toFixed(2)}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-white/45 text-[11px]">не настроено</div>
                                )}
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/25 p-2.5 space-y-1">
                                <div className="relative group w-fit text-white/50 text-[10px] uppercase tracking-wide">
                                  Закуплено за ход (факт / макс)
                                  <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100 normal-case tracking-normal">
                                    План и факт закупки ресурсов за ход.
                                  </span>
                                </div>
                                {purchaseRows.length > 0 ? (
                                  purchaseRows.map((row) => (
                                    <div
                                      key={`purchase-${card.key}-${row.id}`}
                                      className="flex items-center justify-between text-[11px] text-white/70 tabular-nums"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        {row.iconDataUrl ? (
                                          <img
                                            src={row.iconDataUrl}
                                            alt=""
                                            className="w-3.5 h-3.5 rounded object-cover border border-white/10"
                                          />
                                        ) : (
                                          <span className="w-3.5 h-3.5 rounded-full border border-white/15 bg-white/10" />
                                        )}
                                        <span>{row.name}</span>
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <span className="rounded border border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">
                                          факт {row.actual.toFixed(2)}
                                        </span>
                                        <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white/70">
                                          макс {row.planned.toFixed(2)}
                                        </span>
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-white/45 text-[11px]">не требуется</div>
                                )}
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/25 p-2.5 space-y-1">
                                <div className="relative group w-fit text-white/50 text-[10px] uppercase tracking-wide">
                                  Добыча (факт / макс)
                                  <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100 normal-case tracking-normal">
                                    План и факт добычи ресурсов за ход.
                                  </span>
                                </div>
                                {extractionRows.length > 0 ? (
                                  extractionRows.map((row) => (
                                    <div
                                      key={`extract-mobile-${card.key}-${row.id}`}
                                      className="w-full rounded border border-white/20 bg-white/5 px-2 py-1"
                                    >
                                      <div className="flex items-center justify-between text-[11px] text-white/70 tabular-nums">
                                        <span className="flex items-center gap-1.5">
                                          {row.iconDataUrl ? (
                                            <img
                                              src={row.iconDataUrl}
                                              alt=""
                                              className="w-3.5 h-3.5 rounded object-cover border border-white/10"
                                            />
                                          ) : (
                                            <span className="w-3.5 h-3.5 rounded-full border border-white/15 bg-white/10" />
                                          )}
                                          <span>{row.name}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                          <span className="rounded border border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">
                                            факт {row.actual.toFixed(2)}
                                          </span>
                                          <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white/70">
                                            макс {row.planned.toFixed(2)}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-white/45 text-[11px]">не настроено</div>
                                )}
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/25 p-2.5 space-y-1">
                                <div className="relative group w-fit text-white/50 text-[10px] uppercase tracking-wide">
                                  Производство (факт / макс)
                                  <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100 normal-case tracking-normal">
                                    План и факт производства ресурсов за ход.
                                  </span>
                                </div>
                                {productionRows.length > 0 ? (
                                  productionRows.map((row) => (
                                    <div
                                      key={`produce-mobile-${card.key}-${row.id}`}
                                      className="w-full rounded border border-white/20 bg-white/5 px-2 py-1"
                                    >
                                      <div className="flex items-center justify-between text-[11px] text-white/70 tabular-nums">
                                        <span className="flex items-center gap-1.5">
                                          {row.iconDataUrl ? (
                                            <img
                                              src={row.iconDataUrl}
                                              alt=""
                                              className="w-3.5 h-3.5 rounded object-cover border border-white/10"
                                            />
                                          ) : (
                                            <span className="w-3.5 h-3.5 rounded-full border border-white/15 bg-white/10" />
                                          )}
                                          <span>{row.name}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                          <span className="rounded border border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">
                                            факт {row.actual.toFixed(2)}
                                          </span>
                                          <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white/70">
                                            макс {row.planned.toFixed(2)}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-white/45 text-[11px]">не настроено</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
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

import type { DiplomacyAgreement } from './types';

export type DiplomacyAgreementTerms = {
  agreementCategory?: 'construction' | 'logistics';
  kind?: 'company' | 'state';
  allowState?: boolean;
  allowCompanies?: boolean;
  companyIds?: string[]; 
  buildingIds?: string[];
  routeTypeIds?: string[];
  logisticsRouteLimits?: Record<
    string,
    {
      maxRoutes?: number;
      maxSegments?: number;
    }
  >;
  provinceIds?: string[];
  industries?: string[];
  limits?: {
    perProvince?: number;
    perCountry?: number;
    global?: number;
  };
};

export const resolveAgreementTerms = (
  agreement: DiplomacyAgreement,
  hostCountryId: string,
  guestCountryId: string,
): DiplomacyAgreementTerms | null => {
  if (
    agreement.hostCountryId === hostCountryId &&
    agreement.guestCountryId === guestCountryId
  ) {
    return {
      agreementCategory: agreement.agreementCategory,
      kind: agreement.kind,
      allowState: agreement.allowState,
      allowCompanies: agreement.allowCompanies,
      companyIds: agreement.companyIds,
      buildingIds: agreement.buildingIds,
      routeTypeIds: agreement.routeTypeIds,
      logisticsRouteLimits: agreement.logisticsRouteLimits,
      provinceIds: agreement.provinceIds,
      industries: agreement.industries,
      limits: agreement.limits,
    };
  }

  if (
    agreement.hostCountryId === guestCountryId &&
    agreement.guestCountryId === hostCountryId &&
    agreement.counterTerms
  ) {
    return agreement.counterTerms;
  }

  return null;
};

export const expandDiplomacyAgreements = (
  agreements: DiplomacyAgreement[],
): DiplomacyAgreement[] => {
  const result: DiplomacyAgreement[] = [];
  agreements.forEach((agreement) => {
    result.push(agreement);
    if (!agreement.counterTerms) return;
    result.push({
      ...agreement,
      hostCountryId: agreement.guestCountryId,
      guestCountryId: agreement.hostCountryId,
      kind: agreement.counterTerms.kind,
      agreementCategory: agreement.counterTerms.agreementCategory,
      allowState: agreement.counterTerms.allowState,
      allowCompanies: agreement.counterTerms.allowCompanies,
      companyIds: agreement.counterTerms.companyIds,
      buildingIds: agreement.counterTerms.buildingIds,
      routeTypeIds: agreement.counterTerms.routeTypeIds,
      logisticsRouteLimits: agreement.counterTerms.logisticsRouteLimits,
      provinceIds: agreement.counterTerms.provinceIds,
      industries: agreement.counterTerms.industries,
      limits: agreement.counterTerms.limits,
      counterTerms: undefined,
    });
  });
  return result;
};

import type { DiplomacyAgreement } from './types';

export type DiplomacyAgreementTerms = {
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
      kind: agreement.kind,
      allowState: agreement.allowState,
      allowCompanies: agreement.allowCompanies,
      companyIds: agreement.companyIds,
      buildingIds: agreement.buildingIds,
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
      allowState: agreement.counterTerms.allowState,
      allowCompanies: agreement.counterTerms.allowCompanies,
      companyIds: agreement.counterTerms.companyIds,
      buildingIds: agreement.counterTerms.buildingIds,
      provinceIds: agreement.counterTerms.provinceIds,
      industries: agreement.counterTerms.industries,
      limits: agreement.counterTerms.limits,
      counterTerms: undefined,
    });
  });
  return result;
};

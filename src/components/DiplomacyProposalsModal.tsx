import { Handshake, X, Check, XCircle } from 'lucide-react';
import type { Country, DiplomacyProposal, Industry, Company, BuildingDefinition } from '../types';

type DiplomacyProposalsModalProps = {
  open: boolean;
  proposals: DiplomacyProposal[];
  countries: Country[];
  industries: Industry[];
  buildings: BuildingDefinition[];
  companies: Company[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onClose: () => void;
};

const findCountryName = (countries: Country[], id: string) =>
  countries.find((country) => country.id === id)?.name ?? id;

export default function DiplomacyProposalsModal({
  open,
  proposals,
  countries,
  industries,
  buildings,
  companies,
  onAccept,
  onDecline,
  onClose,
}: DiplomacyProposalsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-6 rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-white/10 bg-black/40 flex items-center justify-center">
              <Handshake className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <div className="text-white text-lg font-semibold">Предложения договоров</div>
              <div className="text-white/60 text-sm">Ожидают решения</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/70 flex items-center justify-center hover:border-emerald-400/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto legend-scroll p-6">
          {proposals.length === 0 ? (
            <div className="text-white/60 text-sm">Нет активных предложений.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {proposals.map((proposal) => {
                const limitLabel = (value: number) => (value && value > 0 ? value : '∞');
                const renderAgreementDetails = (
                  agreement: DiplomacyProposal['agreement'],
                ) => {
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
                  const allowedBuildingsLabel =
                    agreement.buildingIds && agreement.buildingIds.length > 0
                      ? agreement.buildingIds
                          .map((id) => buildings.find((b) => b.id === id)?.name ?? id)
                          .join(', ')
                      : 'Все здания';
                  const allowedProvincesLabel =
                    agreement.provinceIds && agreement.provinceIds.length > 0
                      ? agreement.provinceIds.join(', ')
                      : 'Все провинции';
                  const allowState = agreement.allowState ?? agreement.kind === 'state';
                  const allowCompanies =
                    agreement.allowCompanies ?? agreement.kind === 'company';
                  const companyLabel =
                    agreement.companyIds && agreement.companyIds.length > 0
                      ? agreement.companyIds
                          .map(
                            (id) => companies.find((item) => item.id === id)?.name ?? id,
                          )
                          .join(', ')
                      : 'Все компании';
                  return (
                    <>
                      <div className="text-white/50 text-xs">
                        Разрешено:{' '}
                        {allowState ? 'Государство' : ''}
                        {allowState && allowCompanies ? ' + ' : ''}
                        {allowCompanies ? 'Компании' : ''}
                      </div>
                      {allowCompanies && (
                        <div className="text-white/50 text-xs">Компании: {companyLabel}</div>
                      )}
                      <div className="text-white/50 text-xs">Здания: {allowedBuildingsLabel}</div>
                      <div className="text-white/50 text-xs">Провинции: {allowedProvincesLabel}</div>
                      <div className="text-white/50 text-xs">Отрасли: {industryNames}</div>
                      <div className="text-white/50 text-xs">
                        Лимиты: Пров. {limitLabel(perProvince)} / Гос. {limitLabel(perCountry)} /
                        Мир {limitLabel(global)}
                      </div>
                    </>
                  );
                };
                const durationLabel =
                  proposal.agreement.durationTurns &&
                  proposal.agreement.durationTurns > 0
                    ? `${proposal.agreement.durationTurns} ход.`
                    : 'Бессрочно';
                return (
                  <div
                    key={proposal.id}
                    className="rounded-xl border border-white/10 bg-black/30 p-4 flex flex-col gap-3"
                  >
                    <div className="text-white/80 text-sm font-semibold">
                      {findCountryName(countries, proposal.fromCountryId)} →{' '}
                      {findCountryName(countries, proposal.toCountryId)}
                    </div>
                    <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-2.5 space-y-1">
                      <div className="text-amber-200/90 text-xs font-semibold">
                        Они получат
                      </div>
                      {renderAgreementDetails(proposal.agreement)}
                    </div>
                    <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-2.5 space-y-1">
                      <div className="text-emerald-200/90 text-xs font-semibold">
                        Вы получите
                      </div>
                      {proposal.counterAgreement
                        ? renderAgreementDetails(proposal.counterAgreement)
                        : proposal.reciprocal
                          ? (
                            <div className="text-white/50 text-xs">
                              Зеркально к их условиям (старый формат взаимного
                              соглашения).
                            </div>
                            )
                          : (
                            <div className="text-white/50 text-xs">
                              Отдельные условия для вашей стороны не заданы.
                            </div>
                            )}
                    </div>
                    <div className="text-white/50 text-xs">Срок договора: {durationLabel}</div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => onAccept(proposal.id)}
                        className="flex-1 h-9 rounded-lg border border-emerald-400/40 bg-emerald-500/20 text-emerald-200 text-sm flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Принять
                      </button>
                      <button
                        onClick={() => onDecline(proposal.id)}
                        className="flex-1 h-9 rounded-lg border border-red-400/40 bg-red-500/10 text-red-200 text-sm flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Отклонить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

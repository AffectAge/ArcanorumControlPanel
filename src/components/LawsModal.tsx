import { useEffect, useMemo, useState } from 'react';
import { BookText, Scale, X } from 'lucide-react';
import Tooltip from './Tooltip';
import type {
  Country,
  IdeologyDefinition,
  LawCategory,
  LawItem,
  LawStateByCountryId,
  ParliamentCountryState,
  PoliticalFactionDefinition,
} from '../types';
const LAW_VOTE_NOISE_RANGE = 0.08;
const LAW_VOTE_VOLATILITY = 0.5;

type LawsModalProps = {
  open: boolean;
  onClose: () => void;
  activeCountryId?: string;
  countries: Country[];
  lawCategories: LawCategory[];
  laws: LawItem[];
  ideologies: IdeologyDefinition[];
  politicalFactions: PoliticalFactionDefinition[];
  lawStateByCountryId: LawStateByCountryId;
  lawPolicyParamsByCountryId: Record<string, Record<string, Record<string, number>>>;
  parliament?: ParliamentCountryState;
  onProposeLawForVote: (
    countryId: string,
    lawId: string,
    proposedParamsById?: Record<string, number>,
  ) => void;
};

export default function LawsModal({
  open,
  onClose,
  activeCountryId,
  countries,
  lawCategories,
  laws,
  ideologies,
  politicalFactions,
  lawStateByCountryId,
  lawPolicyParamsByCountryId,
  parliament,
  onProposeLawForVote,
}: LawsModalProps) {
  const [categoryId, setCategoryId] = useState<string>(lawCategories[0]?.id ?? '');
  const [selectedLawId, setSelectedLawId] = useState<string>('');

  const category = useMemo(() => {
    if (lawCategories.length === 0) {
      return {
        id: '',
        name: 'Без категории',
        description: 'Категории законов не настроены.',
      } as LawCategory;
    }
    return lawCategories.find((item) => item.id === categoryId) ?? lawCategories[0];
  }, [categoryId, lawCategories]);

  const visibleLaws = useMemo(
    () => laws.filter((item) => item.categoryId === categoryId),
    [laws, categoryId],
  );

  const selectedLaw = useMemo(
    () => visibleLaws.find((item) => item.id === selectedLawId) ?? visibleLaws[0],
    [visibleLaws, selectedLawId],
  );
  const activeCountryName =
    countries.find((item) => item.id === activeCountryId)?.name ?? 'Страна не выбрана';
  const selectedLawVoteState = activeCountryId
    ? lawStateByCountryId[activeCountryId]?.[selectedLaw?.id ?? '']
    : undefined;
  const selectedLawCurrentParams = activeCountryId
    ? lawPolicyParamsByCountryId[activeCountryId]?.[selectedLaw?.id ?? '']
    : undefined;
  const [draftParamsByLawId, setDraftParamsByLawId] = useState<
    Record<string, Record<string, number>>
  >({});

  useEffect(() => {
    if (!selectedLaw) return;
    setDraftParamsByLawId((prev) => {
      if (prev[selectedLaw.id]) return prev;
      const nextByParamId: Record<string, number> = {};
      (selectedLaw.params ?? []).forEach((param) => {
        const currentRaw = selectedLawCurrentParams?.[param.id];
        nextByParamId[param.id] =
          currentRaw == null || !Number.isFinite(currentRaw)
            ? param.defaultValue
            : Number(currentRaw);
      });
      return { ...prev, [selectedLaw.id]: nextByParamId };
    });
  }, [selectedLaw, selectedLawCurrentParams]);

  const selectedLawDraftParams = selectedLaw ? draftParamsByLawId[selectedLaw.id] : undefined;

  const normalizedLawIdeology = useMemo(() => {
    const base: Record<string, number> = { ...(selectedLaw?.ideologyWeightsById ?? {}) };
    (selectedLaw?.params ?? []).forEach((param) => {
      const raw = selectedLawDraftParams?.[param.id];
      const safe =
        raw == null || !Number.isFinite(raw) ? param.defaultValue : Number(raw);
      const clamped = Math.max(param.min, Math.min(param.max, safe));
      const span = Math.max(1, param.max - param.min);
      const centered = (clamped - param.defaultValue) / span;
      Object.entries(param.ideologyImpactById ?? {}).forEach(([ideologyId, impact]) => {
        base[ideologyId] = Math.max(0, (base[ideologyId] ?? 0) + centered * Number(impact));
      });
    });
    const entries = Object.entries(base).filter(
      ([, value]) => Number.isFinite(value) && Number(value) > 0,
    );
    const sum = entries.reduce((acc, [, value]) => acc + Number(value), 0);
    if (sum <= 0) return {} as Record<string, number>;
    return Object.fromEntries(
      entries.map(([id, value]) => [id, Number(value) / sum]),
    ) as Record<string, number>;
  }, [selectedLaw, selectedLawDraftParams]);

  const votePreview = useMemo(() => {
    if (!selectedLaw || !parliament) {
      return { yes: 0, no: 0, abstain: 0, uncertainty: 0 };
    }
    let yes = 0;
    let no = 0;
    let abstain = 0;
    let uncertainty = 0;
    parliament.factions.forEach((factionState) => {
      const factionDef = politicalFactions.find((item) => item.id === factionState.id);
      const weights = factionDef?.ideologyWeightsById ?? {};
      const weightEntries = Object.entries(weights).filter(
        ([, value]) => Number.isFinite(value) && Number(value) > 0,
      );
      const sum = weightEntries.reduce((acc, [, value]) => acc + Number(value), 0);
      const normalizedFaction = sum
        ? Object.fromEntries(weightEntries.map(([id, value]) => [id, Number(value) / sum]))
        : {};
      let alignment = 0;
      const allIds = new Set([
        ...Object.keys(normalizedFaction),
        ...Object.keys(normalizedLawIdeology),
      ]);
      allIds.forEach((id) => {
        alignment += (normalizedFaction[id] ?? 0) * (normalizedLawIdeology[id] ?? 0);
      });
      const normalizedAlignment = Math.max(0, Math.min(1, alignment * 2.5));
      const supportShare = Math.max(0, Math.min(1, (normalizedAlignment - 0.35) / 0.65));
      const opposeShare = Math.max(0, Math.min(1, (0.65 - normalizedAlignment) / 0.65));
      const abstainShare = Math.max(0, 1 - supportShare - opposeShare);
      const seats = Math.max(0, factionState.seats ?? 0);
      yes += Math.floor(seats * supportShare);
      no += Math.floor(seats * opposeShare);
      abstain += Math.max(0, seats - Math.floor(seats * supportShare) - Math.floor(seats * opposeShare));
      uncertainty += Math.round(seats * LAW_VOTE_NOISE_RANGE * LAW_VOTE_VOLATILITY);
    });
    return { yes, no, abstain, uncertainty };
  }, [selectedLaw, parliament, politicalFactions, normalizedLawIdeology]);

  useEffect(() => {
    if (lawCategories.length === 0) {
      setCategoryId('');
      return;
    }
    if (!categoryId || !lawCategories.some((item) => item.id === categoryId)) {
      setCategoryId(lawCategories[0].id);
    }
  }, [lawCategories, categoryId]);

  useEffect(() => {
    if (visibleLaws.length === 0) {
      setSelectedLawId('');
      return;
    }
    if (!selectedLawId || !visibleLaws.some((item) => item.id === selectedLawId)) {
      setSelectedLawId(visibleLaws[0].id);
    }
  }, [visibleLaws, selectedLawId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-[#05070d]">
      <div className="w-full h-full border border-white/10 bg-[#0a111a] flex flex-col overflow-hidden">
        <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl border border-white/10 bg-black/30 flex items-center justify-center">
              <Scale className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-white text-lg font-semibold">Законы</div>
              <div className="text-white/55 text-xs">Законодательство: {activeCountryName}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/70 flex items-center justify-center hover:border-emerald-400/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-16 shrink-0 border-b border-white/10 px-4 flex items-center gap-3">
          <Tooltip
            label="Категория законов"
            description="Выберите направление, чтобы увидеть список доступных законов."
          >
            <div className="text-white/80 text-sm font-medium">Категория</div>
          </Tooltip>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="h-10 min-w-[260px] rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-emerald-400/60"
          >
            {lawCategories.map((item) => (
              <option key={item.id} value={item.id} className="bg-[#0b111b] text-white">
                {item.name}
              </option>
            ))}
          </select>
          <div className="text-white/55 text-xs">{category.description}</div>
        </div>

        <div className="flex-1 min-h-0 flex">
          <div className="w-[360px] border-r border-white/10 p-4 space-y-2 overflow-y-auto legend-scroll">
            {visibleLaws.map((law) => (
              <button
                key={law.id}
                onClick={() => setSelectedLawId(law.id)}
                className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                  selectedLaw?.id === law.id
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                    : 'bg-white/5 border-white/10 text-white/75 hover:border-emerald-400/30'
                }`}
              >
                <div className="text-sm font-semibold">{law.name}</div>
                <div className="text-xs text-white/55 mt-0.5">{law.short}</div>
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto legend-scroll p-6">
            {selectedLaw ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-5 space-y-4">
                <div className="inline-flex items-center gap-2">
                  <BookText className="w-4 h-4 text-emerald-300" />
                  <div className="text-white text-xl font-semibold">{selectedLaw.name}</div>
                </div>
                <div className="text-white/70 text-sm">{selectedLaw.short}</div>

                <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="text-white/85 text-sm font-semibold mb-2">Эффекты</div>
                  <div className="space-y-1">
                    {selectedLaw.effects.map((effect, index) => (
                      <div
                        key={`law-effect:${selectedLaw.id}:${index}`}
                        className="text-white/80 text-sm"
                      >
                        {effect}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="text-white/85 text-sm font-semibold mb-2">Требования</div>
                  {(selectedLaw.requirements ?? ['Требования будут добавлены в следующих этапах.']).map(
                    (rule, index) => (
                      <div
                        key={`law-req:${selectedLaw.id}:${index}`}
                        className="text-white/75 text-sm"
                      >
                        {rule}
                      </div>
                    ),
                  )}
                </div>
                <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="text-white/85 text-sm font-semibold mb-2">Идеологический профиль</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(Object.entries(selectedLaw.ideologyWeightsById ?? {}) as [string, number][])
                      .filter(([, value]) => Number.isFinite(value) && value > 0)
                      .map(([ideologyId, value]) => (
                      <div
                        key={`law-ideology:${selectedLaw.id}:${ideologyId}`}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm flex items-center justify-between gap-2"
                      >
                        <span className="text-white/75">
                          {ideologies.find((item) => item.id === ideologyId)?.name ?? ideologyId}
                        </span>
                        <span className="text-white/90">{value}%</span>
                      </div>
                    ))}
                    {Object.keys(selectedLaw.ideologyWeightsById ?? {}).length === 0 && (
                      <div className="text-white/60 text-sm">
                        Идеологический профиль для закона не настроен.
                      </div>
                    )}
                  </div>
                </div>
                {(selectedLaw.params?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                    <div className="text-white/85 text-sm font-semibold mb-2">
                      Параметры закона
                    </div>
                    <div className="space-y-2">
                      {(selectedLaw.params ?? []).map((param) => {
                        const draftRaw = selectedLawDraftParams?.[param.id];
                        const draftValue =
                          draftRaw == null || !Number.isFinite(draftRaw)
                            ? param.defaultValue
                            : Number(draftRaw);
                        const installedRaw = selectedLawCurrentParams?.[param.id];
                        const installedValue =
                          installedRaw == null || !Number.isFinite(installedRaw)
                            ? param.defaultValue
                            : Number(installedRaw);
                        return (
                          <label
                            key={`law-param:${selectedLaw.id}:${param.id}`}
                            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-white/75 text-sm">{param.name}</div>
                              <div className="text-white/55 text-xs mt-0.5">
                                Текущее установленное: {installedValue}
                                {param.unit ? ` ${param.unit}` : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={param.min}
                                max={param.max}
                                step={param.step ?? 1}
                                value={draftValue}
                                disabled={!activeCountryId || selectedLawVoteState?.status === 'proposed'}
                                onChange={(event) => {
                                  const nextValue = Number(event.target.value) || 0;
                                  setDraftParamsByLawId((prev) => ({
                                    ...prev,
                                    [selectedLaw.id]: {
                                      ...(prev[selectedLaw.id] ?? {}),
                                      [param.id]: nextValue,
                                    },
                                  }));
                                }}
                                className="w-32 h-8 rounded-md bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60 disabled:opacity-60"
                              />
                              <span className="text-white/55 text-xs whitespace-nowrap">
                                {param.min}-{param.max}
                                {param.unit ? ` ${param.unit}` : ''}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="text-white/85 text-sm font-semibold mb-2">Голосование</div>
                  <div className="text-white/70 text-sm mb-2">
                    Прогноз: за {votePreview.yes} | против {votePreview.no} | воздерж.{' '}
                    {votePreview.abstain}
                  </div>
                  <div className="text-white/55 text-xs mb-2">
                    Погрешность прогноза: ±{votePreview.uncertainty} мест (случайный фактор).
                  </div>
                  <div className="text-white/60 text-xs mb-3">
                    Статус: {selectedLawVoteState?.status ?? 'draft'}
                  </div>
                  <button
                    disabled={!activeCountryId || selectedLawVoteState?.status === 'proposed'}
                    onClick={() => {
                      if (!activeCountryId || !selectedLaw) return;
                      onProposeLawForVote(
                        activeCountryId,
                        selectedLaw.id,
                        draftParamsByLawId[selectedLaw.id],
                      );
                    }}
                    className={`h-9 px-3 rounded-lg border text-sm transition-colors ${
                      !activeCountryId || selectedLawVoteState?.status === 'proposed'
                        ? 'border-white/10 bg-white/5 text-white/35 cursor-not-allowed'
                        : 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:border-emerald-300/60'
                    }`}
                  >
                    Вынести на голосование
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-white/65 text-sm">
                В выбранной категории пока нет законов.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

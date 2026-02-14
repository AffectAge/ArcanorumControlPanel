import { X, Flag, TrendingUp, Ban } from 'lucide-react';
import type { Country, ProvinceData } from '../types';

type ColonizationModalProps = {
  open: boolean;
  provinceId?: string;
  province?: ProvinceData;
  countries: Country[];
  activeCountryId?: string;
  onClose: () => void;
  onStart: () => void;
  onCancel: () => void;
};

export default function ColonizationModal({
  open,
  provinceId,
  province,
  countries,
  activeCountryId,
  onClose,
  onStart,
  onCancel,
}: ColonizationModalProps) {
  if (!open || !provinceId || !province) return null;

  const progress = province.colonizationProgress ?? {};
  const progressEntries = Object.entries(progress).map(([countryId, points]) => {
    const country = countries.find((c) => c.id === countryId);
    return {
      id: countryId,
      name: country?.name ?? 'Unknown',
      color: country?.color ?? '#666',
      points,
    };
  });

  progressEntries.sort((a, b) => b.points - a.points);

  const cost = province.colonizationCost ?? 100;
  const leader = progressEntries[0];
  const activeProgress = activeCountryId ? progress[activeCountryId] : undefined;
  const hasActive = activeCountryId ? activeCountryId in progress : false;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-[720px] max-w-[96vw] rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-white text-xl font-semibold">
              Колонизация провинции {provinceId}
            </h2>
            <p className="text-white/60 text-sm">
              Стоимость колонизации: {cost} очков
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-emerald-400/50 hover:bg-emerald-400/10 transition-all"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-black/30 border border-white/10 p-3">
            <TrendingUp className="w-5 h-5 text-emerald-300" />
            <div className="text-white/80 text-sm">
              Лидер: {leader ? leader.name : 'Пока нет'}{' '}
              {leader ? `(${Math.round((leader.points / cost) * 100)}%)` : ''}
            </div>
          </div>

          <div className="space-y-2">
            {progressEntries.length === 0 && (
              <div className="text-white/50 text-sm border border-dashed border-white/10 rounded-xl p-4">
                Никто не начал колонизацию.
              </div>
            )}
            {progressEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full border border-white/10"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-white/80 text-sm">{entry.name}</span>
                </div>
                <div className="text-white/70 text-sm">
                  {entry.points.toFixed(1)} / {cost}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onStart}
              disabled={!activeCountryId || hasActive}
              className="h-11 px-4 rounded-lg flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Flag className="w-4 h-4" />
              Начать колонизацию
            </button>
            <button
              onClick={onCancel}
              disabled={!activeCountryId || !hasActive}
              className="h-11 px-4 rounded-lg flex items-center gap-2 bg-white/5 border border-white/10 text-white/70 hover:border-emerald-400/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Ban className="w-4 h-4" />
              Отменить колонизацию
            </button>
            {activeCountryId && (
              <div className="text-white/50 text-xs">
                Ваш прогресс: {activeProgress ? activeProgress.toFixed(1) : 0}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

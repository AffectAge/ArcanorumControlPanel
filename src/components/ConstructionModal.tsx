import { X, Hammer, Ban } from 'lucide-react';
import type { BuildingDefinition, ProvinceData } from '../types';

type ConstructionModalProps = {
  open: boolean;
  provinceId?: string;
  province?: ProvinceData;
  buildings: BuildingDefinition[];
  activeCountryId?: string;
  activeCountryPoints: number;
  onClose: () => void;
  onStart: (buildingId: string) => void;
  onCancel: (buildingId: string) => void;
};

export default function ConstructionModal({
  open,
  provinceId,
  province,
  buildings,
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
  const progressMap = province.constructionProgress ?? {};
  const builtSet = new Set(province.buildingsBuilt ?? []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-[760px] max-w-[96vw] rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-white text-xl font-semibold">
              Строительство в провинции {provinceId}
            </h2>
            <p className="text-white/60 text-sm">
              Доступно очков строительства: {activeCountryPoints}
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
          {!isOwner && (
            <div className="text-white/60 text-sm border border-white/10 bg-white/5 rounded-xl p-3">
              Строительство доступно только владельцу провинции.
            </div>
          )}

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 legend-scroll">
            {buildings.length === 0 && (
              <div className="text-white/50 text-sm border border-dashed border-white/10 rounded-xl p-4">
                Нет доступных зданий.
              </div>
            )}
            {buildings.map((building) => {
              const cost = Math.max(1, building.cost ?? 1);
              const built = builtSet.has(building.id);
              const hasProgress = building.id in progressMap;
              const progress = hasProgress ? progressMap[building.id] ?? 0 : 0;
              const percent = Math.min(100, Math.round((progress / cost) * 100));
              const canStart = isOwner && !built && !hasProgress;
              const canCancel = isOwner && hasProgress && !built;

              return (
                <div
                  key={building.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-3">
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
                      <div className="text-white/50 text-xs">Стоимость: {cost}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-white/60 text-xs">
                      {built
                        ? 'Построено'
                        : hasProgress
                          ? `Прогресс: ${percent}%`
                          : 'Не построено'}
                    </div>
                    <button
                      onClick={() => onStart(building.id)}
                      disabled={!canStart}
                      className={`h-9 px-3 rounded-lg border text-xs flex items-center gap-2 ${
                        canStart
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30'
                          : 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      <Hammer className="w-4 h-4" />
                      Строить
                    </button>
                    <button
                      onClick={() => onCancel(building.id)}
                      disabled={!canCancel}
                      className={`h-9 px-3 rounded-lg border text-xs flex items-center gap-2 ${
                        canCancel
                          ? 'bg-white/5 border-white/10 text-white/70 hover:border-emerald-400/40'
                          : 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      <Ban className="w-4 h-4" />
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

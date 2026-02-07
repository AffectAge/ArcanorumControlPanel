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
  const builtMap = province.buildingsBuilt ?? {};
  const activeTasks = Object.values(progressMap).reduce(
    (sum, entries) => sum + entries.length,
    0,
  );
  const perTask =
    activeTasks > 0 ? Math.max(0, activeCountryPoints) / activeTasks : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-[860px] max-w-[96vw] rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl">
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

        <div className="p-4 space-y-3">
          {!isOwner && (
            <div className="text-white/60 text-sm border border-white/10 bg-white/5 rounded-xl p-3">
              Строительство доступно только владельцу провинции.
            </div>
          )}

          <div className="grid grid-cols-12 gap-2 px-2 py-2 text-white/50 text-[11px] uppercase tracking-wide">
            <div className="col-span-5">Здание</div>
            <div className="col-span-2">Стоимость</div>
            <div className="col-span-3">Прогресс</div>
            <div className="col-span-2 text-right">Действия</div>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 legend-scroll">
            {buildings.length === 0 && (
              <div className="text-white/50 text-sm border border-dashed border-white/10 rounded-xl p-4">
                Нет доступных зданий.
              </div>
            )}
            {buildings.map((building) => {
              const cost = Math.max(1, building.cost ?? 1);
              const builtCount = builtMap[building.id] ?? 0;
              const entries = progressMap[building.id] ?? [];
              const hasProgress = entries.length > 0;
              const progressSum = entries.reduce((sum, value) => sum + value, 0);
              const average = entries.length
                ? Math.min(100, Math.round((progressSum / entries.length / cost) * 100))
                : 0;
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
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => onStart(building.id)}
                      disabled={!canStart}
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

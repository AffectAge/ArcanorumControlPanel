import { X, Hammer } from 'lucide-react';
import type { BuildingDefinition, Country, ProvinceRecord } from '../types';

type IndustryModalProps = {
  open: boolean;
  provinces: ProvinceRecord;
  buildings: BuildingDefinition[];
  countries: Country[];
  activeCountryId?: string;
  onClose: () => void;
};

const getBuildingName = (
  buildings: BuildingDefinition[],
  id: string,
): string => buildings.find((item) => item.id === id)?.name ?? id;

export default function IndustryModal({
  open,
  provinces,
  buildings,
  countries,
  activeCountryId,
  onClose,
}: IndustryModalProps) {
  if (!open) return null;

  const rows = Object.values(provinces).filter(
    (province) => province.ownerCountryId === activeCountryId,
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-[980px] max-w-[96vw] rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0e1523]">
          <div>
            <h2 className="text-white text-lg font-semibold">Индустрия</h2>
            <p className="text-white/60 text-xs mt-1">
              Все построенные здания по провинциям
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
          <div className="grid grid-cols-12 gap-2 px-2 py-2 text-white/50 text-[11px] uppercase tracking-wide">
            <div className="col-span-3">Провинция</div>
            <div className="col-span-3">Владелец</div>
            <div className="col-span-4">Построено</div>
            <div className="col-span-2">В стройке</div>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 legend-scroll">
            {rows.length === 0 && (
              <div className="text-white/50 text-sm border border-dashed border-white/10 rounded-xl p-4">
                Нет провинций.
              </div>
            )}
            {rows.map((province) => {
              const owner = countries.find((c) => c.id === province.ownerCountryId);
              const builtMap = province.buildingsBuilt ?? {};
              const progressMap = province.constructionProgress ?? {};
              const builtEntries = Object.entries(builtMap).filter(
                ([, count]) => count > 0,
              );
              const progressEntries = Object.entries(progressMap).filter(
                ([, entries]) => entries.length > 0,
              );

              return (
                <div
                  key={province.id}
                  className="grid grid-cols-12 gap-2 px-3 py-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="col-span-3 text-white/80 text-sm">
                    {province.id}
                  </div>
                  <div className="col-span-3 text-white/60 text-sm">
                    {owner?.name ?? '—'}
                  </div>
                  <div className="col-span-4 text-white/70 text-sm">
                    {builtEntries.length === 0 && '—'}
                    {builtEntries.map(([buildingId, count]) => (
                      <div key={buildingId} className="flex items-center gap-2">
                        <Hammer className="w-3.5 h-3.5 text-white/50" />
                        <span>{getBuildingName(buildings, buildingId)}</span>
                        <span className="text-white/40">x{count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="col-span-2 text-white/60 text-sm">
                    {progressEntries.length === 0 && '—'}
                    {progressEntries.map(([buildingId, entries]) => (
                      <div key={buildingId} className="flex items-center gap-2">
                        <span>{getBuildingName(buildings, buildingId)}</span>
                        <span className="text-white/40">x{entries.length}</span>
                      </div>
                    ))}
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

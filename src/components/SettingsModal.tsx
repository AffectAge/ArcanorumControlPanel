import { X, Sliders } from 'lucide-react';
import type { GameSettings } from '../types';

type SettingsModalProps = {
  open: boolean;
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
};

export default function SettingsModal({
  open,
  settings,
  onChange,
  onClose,
}: SettingsModalProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-[520px] max-w-[92vw] rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-white/90">
            <Sliders className="w-5 h-5" />
            <span className="text-base font-semibold">Настройки игры</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center hover:border-red-400/50 hover:bg-red-400/10 transition-all"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex flex-col gap-2 text-white/70 text-sm">
            Базовый прирост очков колонизации за ход
            <input
              type="number"
              min={0}
              value={settings.colonizationPointsPerTurn}
              onChange={(event) =>
                onChange({
                  ...settings,
                  colonizationPointsPerTurn: Math.max(
                    0,
                    Number(event.target.value) || 0,
                  ),
                })
              }
              className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
            />
          </label>

          <div className="text-white/40 text-xs">
            Подсказка: значение начисляется активной стране в начале ее хода.
          </div>
        </div>
      </div>
    </div>
  );
}

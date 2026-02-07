import { Menu, RotateCcw, SkipForward, Globe2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Country } from '../types';

type TopBarProps = {
  turn: number;
  countries: Country[];
  activeCountryId?: string;
  colonizationGainPerTurn: number;
  onSelectCountry: (id: string) => void;
  onEndTurn: () => void;
  onOpenHotseat: () => void;
  onNewGame: () => void;
  onOpenSave: () => void;
  onOpenLoad: () => void;
  onOpenAdmin: () => void;
};

export default function TopBar({
  turn,
  countries,
  activeCountryId,
  colonizationGainPerTurn,
  onSelectCountry,
  onEndTurn,
  onOpenHotseat,
  onNewGame,
  onOpenSave,
  onOpenLoad,
  onOpenAdmin,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activeCountry = useMemo(
    () => countries.find((country) => country.id === activeCountryId),
    [countries, activeCountryId],
  );

  return (
    <div className="absolute left-4 right-4 top-3 h-14 flex items-center justify-between px-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl z-50 animate-slideDown">
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center hover:border-emerald-400/50 hover:bg-emerald-400/10 transition-all duration-200 group"
          >
            <Menu className="w-5 h-5 text-white/80 group-hover:text-emerald-400 transition-colors" />
          </button>

          {menuOpen && (
            <div className="absolute top-12 left-0 w-56 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-fadeIn">
              <button
                onClick={() => {
                  onNewGame();
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-white/80 hover:bg-emerald-400/10 hover:text-emerald-400 transition-colors"
              >
                Новая игра
              </button>
              <button
                onClick={() => {
                  onOpenSave();
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-white/80 hover:bg-emerald-400/10 hover:text-emerald-400 transition-colors"
              >
                Сохранить игру
              </button>
              <button
                onClick={() => {
                  onOpenLoad();
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-white/80 hover:bg-emerald-400/10 hover:text-emerald-400 transition-colors"
              >
                Загрузить игру
              </button>
              <button
                onClick={() => {
                  onOpenAdmin();
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-white/80 hover:bg-emerald-400/10 hover:text-emerald-400 transition-colors"
              >
                Панель администратора
              </button>
              <button
                onClick={() => {
                  onOpenHotseat();
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-white/80 hover:bg-emerald-400/10 hover:text-emerald-400 transition-colors"
              >
                Редактор стран
              </button>
              <div className="h-px bg-white/10 my-1" />
              <button className="w-full px-4 py-3 text-left text-white/80 hover:bg-emerald-400/10 hover:text-emerald-400 transition-colors">
                Настройки
              </button>
              <button className="w-full px-4 py-3 text-left text-white/80 hover:bg-red-400/10 hover:text-red-400 transition-colors">
                Выход
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/30 border border-white/10">
          <div className="w-5 h-5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <RotateCcw className="w-3 h-3 text-white/80" />
          </div>
          <span className="text-white font-bold text-sm">Ход {turn}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/30 border border-white/10">
          <div
            className="w-6 h-6 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: activeCountry?.color ?? '#1a1f2b' }}
          >
            {activeCountry?.flagDataUrl && (
              <img
                src={activeCountry.flagDataUrl}
                alt={activeCountry.name}
                className="w-5 h-5 object-contain"
              />
            )}
          </div>
          {activeCountry?.coatDataUrl && (
            <div className="w-6 h-6 rounded-lg border border-white/10 overflow-hidden bg-black/30">
              <img
                src={activeCountry.coatDataUrl}
                alt={`${activeCountry.name} coat`}
                className="w-5 h-5 object-contain"
              />
            </div>
          )}
          <span className="text-white font-semibold text-sm">
            {activeCountry ? activeCountry.name : 'Страна не выбрана'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/30 border border-white/10">
          <div className="relative group">
            <div className="w-5 h-5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <Globe2 className="w-3 h-3 text-white/80" />
            </div>
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 backdrop-blur-xl rounded-lg border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Очки колонизации
            </div>
          </div>
          <span className="text-white font-bold text-sm">
            {activeCountry?.colonizationPoints ?? 0}
          </span>
          {colonizationGainPerTurn > 0 && (
            <span className="text-emerald-400 text-xs font-semibold">
              +{colonizationGainPerTurn}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/30 border border-white/10">
          <span className="text-white/60 text-sm">Ходит:</span>
          <select
            value={activeCountryId ?? ''}
            onChange={(event) => onSelectCountry(event.target.value)}
            className="h-8 rounded-lg bg-[#0b111b]/80 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60"
          >
            {!activeCountryId && countries.length > 0 && (
              <option value="" disabled className="bg-[#0b111b] text-white">
                Выберите страну
              </option>
            )}
            {countries.length === 0 && (
              <option value="" disabled className="bg-[#0b111b] text-white">
                Нет стран
              </option>
            )}
            {countries.map((country) => (
              <option key={country.id} value={country.id} className="bg-[#0b111b] text-white">
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onEndTurn}
          disabled={countries.length === 0}
          className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center hover:bg-emerald-400/30 hover:border-emerald-400/50 transition-all duration-200 group shadow-lg shadow-emerald-500/20"
        >
          <SkipForward className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
        </button>
      </div>
    </div>
  );
}

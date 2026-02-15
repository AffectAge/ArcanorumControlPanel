import {
  Menu,
  RotateCcw,
  SkipForward,
  Globe2,
  Hammer,
  Atom,
  Feather,
  Cross,
  Coins,
  Gem,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Country } from '../types';

type TopBarProps = {
  turn: number;
  countries: Country[];
  activeCountryId?: string;
  colonizationGainPerTurn: number;
  constructionGainPerTurn: number;
  scienceGainPerTurn: number;
  cultureGainPerTurn: number;
  religionGainPerTurn: number;
  goldGainPerTurn: number;
  ducatsGainPerTurn: number;
  colonizationActiveCount: number;
  colonizationActiveLimit: number;
  onSelectCountry: (id: string) => void;
  onEndTurn: () => void;
  onOpenHotseat: () => void;
  onNewGame: () => void;
  onOpenSave: () => void;
  onOpenLoad: () => void;
  onOpenAdmin: () => void;
  onOpenSettings: () => void;
};

export default function TopBar({
  turn,
  countries,
  activeCountryId,
  colonizationGainPerTurn,
  constructionGainPerTurn,
  scienceGainPerTurn,
  cultureGainPerTurn,
  religionGainPerTurn,
  goldGainPerTurn,
  ducatsGainPerTurn,
  colonizationActiveCount,
  colonizationActiveLimit,
  onSelectCountry,
  onEndTurn,
  onOpenHotseat,
  onNewGame,
  onOpenSave,
  onOpenLoad,
  onOpenAdmin,
  onOpenSettings,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoverTip, setHoverTip] = useState<{
    text: string;
    x: number;
    y: number;
    visible: boolean;
  }>({ text: '', x: 0, y: 0, visible: false });
  const activeCountry = useMemo(
    () => countries.find((country) => country.id === activeCountryId),
    [countries, activeCountryId],
  );

  const showTooltip = (text: string, event: React.MouseEvent) => {
    setHoverTip({ text, x: event.clientX, y: event.clientY, visible: true });
  };

  const moveTooltip = (event: React.MouseEvent) => {
    setHoverTip((prev) =>
      prev.visible ? { ...prev, x: event.clientX, y: event.clientY } : prev,
    );
  };

  const hideTooltip = () => {
    setHoverTip((prev) => ({ ...prev, visible: false }));
  };

  const formatPoints = (value: number) => {
    const abs = Math.abs(value);
    if (abs < 1000) return `${value}`;
    if (abs >= 1_000_000) {
      const m = value / 1_000_000;
      if (Math.abs(m) >= 100) return `${Math.round(m)}M`;
      const formatted = m.toFixed(1);
      return `${formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted}M`;
    }
    const k = value / 1000;
    if (Math.abs(k) >= 100) return `${Math.round(k)}k`;
    const formatted = k.toFixed(1);
    return `${formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted}k`;
  };

  return (
    <div className="absolute left-4 right-4 top-3 h-14 flex items-center justify-between px-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl z-50 animate-slideDown">
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-11 h-11 rounded-xl border transition-all duration-200 flex items-center justify-center group relative bg-black/30 border-white/10 hover:border-emerald-400/50 hover:bg-emerald-400/10 hover:scale-110"
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
              <button
                onClick={() => {
                  onOpenSettings();
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-white/80 hover:bg-emerald-400/10 hover:text-emerald-400 transition-colors"
              >
                Настройки
              </button>
              <button className="w-full px-4 py-3 text-left text-white/80 hover:bg-red-400/10 hover:text-red-400 transition-colors">
                Выход
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 ">
          <div className="w-9 h-9 rounded-xl border transition-all duration-200 flex items-center justify-center group relative bg-black/30 border-white/10">
            <RotateCcw className="w-4 h-4 text-white/80" />
          </div>
          <span className="text-white font-bold text-sm">Ход {turn}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 ">
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
        <div className="flex items-center gap-2 px-3 py-2 ">
          <div
            className="relative group"
            onMouseEnter={(event) => showTooltip('Очки колонизации', event)}
            onMouseMove={moveTooltip}
            onMouseLeave={hideTooltip}
          >
            <div className="w-9 h-9 rounded-xl border transition-all duration-200 flex items-center justify-center group relative bg-black/30 border-white/10">
              <Globe2 className="w-4 h-4 text-emerald-300" />
            </div>
          </div>
          <span className="text-emerald-100 font-bold text-sm">
            {formatPoints(activeCountry?.colonizationPoints ?? 0)}
          </span>
          {colonizationGainPerTurn > 0 && (
            <span className="text-emerald-400 text-xs font-semibold">
              +{formatPoints(colonizationGainPerTurn)}
            </span>
          )}
          <div
            className="text-white/50 text-xs"
            onMouseEnter={(event) =>
              showTooltip('Активные колонизации / лимит', event)
            }
            onMouseMove={moveTooltip}
            onMouseLeave={hideTooltip}
            style={
              colonizationActiveLimit > 0 &&
              colonizationActiveCount >= colonizationActiveLimit
                ? { color: '#f87171' }
                : undefined
            }
          >
            {colonizationActiveCount}/
            {colonizationActiveLimit > 0 ? colonizationActiveLimit : '∞'}
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 ">
          <div
            className="relative group"
            onMouseEnter={(event) => showTooltip('Очки строительства', event)}
            onMouseMove={moveTooltip}
            onMouseLeave={hideTooltip}
          >
            <div className="w-9 h-9 rounded-xl border transition-all duration-200 flex items-center justify-center group relative bg-black/30 border-white/10">
              <Hammer className="w-4 h-4 text-amber-300" />
            </div>
          </div>
          <span className="text-amber-100 font-bold text-sm">
            {formatPoints(activeCountry?.constructionPoints ?? 0)}
          </span>
          {constructionGainPerTurn > 0 && (
            <span className="text-emerald-400 text-xs font-semibold">
              +{formatPoints(constructionGainPerTurn)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 ">
          <div
            className="relative group"
            onMouseEnter={(event) => showTooltip('Очки науки', event)}
            onMouseMove={moveTooltip}
            onMouseLeave={hideTooltip}
          >
            <div className="w-9 h-9 rounded-xl border transition-all duration-200 flex items-center justify-center group relative bg-black/30 border-white/10">
              <Atom className="w-4 h-4 text-sky-300" />
            </div>
          </div>
          <span className="text-sky-100 font-bold text-sm">
            {formatPoints(activeCountry?.sciencePoints ?? 0)}
          </span>
          {scienceGainPerTurn > 0 && (
            <span className="text-emerald-400 text-xs font-semibold">
              +{formatPoints(scienceGainPerTurn)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 ">
          <div
            className="relative group"
            onMouseEnter={(event) => showTooltip('Очки культуры', event)}
            onMouseMove={moveTooltip}
            onMouseLeave={hideTooltip}
          >
            <div className="w-9 h-9 rounded-xl border transition-all duration-200 flex items-center justify-center group relative bg-black/30 border-white/10">
              <Feather className="w-4 h-4 text-rose-300" />
            </div>
          </div>
          <span className="text-rose-100 font-bold text-sm">
            {formatPoints(activeCountry?.culturePoints ?? 0)}
          </span>
          {cultureGainPerTurn > 0 && (
            <span className="text-emerald-400 text-xs font-semibold">
              +{formatPoints(cultureGainPerTurn)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 ">
          <div
            className="relative group"
            onMouseEnter={(event) => showTooltip('Очки религии', event)}
            onMouseMove={moveTooltip}
            onMouseLeave={hideTooltip}
          >
            <div className="w-9 h-9 rounded-xl border transition-all duration-200 flex items-center justify-center group relative bg-black/30 border-white/10">
              <Cross className="w-4 h-4 text-violet-300" />
            </div>
          </div>
          <span className="text-violet-100 font-bold text-sm">
            {formatPoints(activeCountry?.religionPoints ?? 0)}
          </span>
          {religionGainPerTurn > 0 && (
            <span className="text-emerald-400 text-xs font-semibold">
              +{formatPoints(religionGainPerTurn)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 ">
          <div
            className="relative group"
            onMouseEnter={(event) => showTooltip('Золото', event)}
            onMouseMove={moveTooltip}
            onMouseLeave={hideTooltip}
          >
            <div className="w-9 h-9 rounded-xl border transition-all duration-200 flex items-center justify-center group relative bg-black/30 border-white/10">
              <Coins className="w-4 h-4 text-yellow-300" />
            </div>
          </div>
          <span className="text-yellow-100 font-bold text-sm">
            {formatPoints(activeCountry?.gold ?? 0)}
          </span>
          {goldGainPerTurn > 0 && (
            <span className="text-emerald-400 text-xs font-semibold">
              +{formatPoints(goldGainPerTurn)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 ">
          <div
            className="relative group"
            onMouseEnter={(event) => showTooltip('Дукаты', event)}
            onMouseMove={moveTooltip}
            onMouseLeave={hideTooltip}
          >
            <div className="w-9 h-9 rounded-xl border transition-all duration-200 flex items-center justify-center group relative bg-black/30 border-white/10">
              <Gem className="w-4 h-4 text-cyan-300" />
            </div>
          </div>
          <span className="text-cyan-100 font-bold text-sm">
            {formatPoints(activeCountry?.ducats ?? 0)}
          </span>
          {ducatsGainPerTurn > 0 && (
            <span className="text-emerald-400 text-xs font-semibold">
              +{formatPoints(ducatsGainPerTurn)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 ">
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
          className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center hover:bg-emerald-400/30 hover:border-emerald-400/50 transition-all duration-200 group shadow-lg shadow-emerald-500/20 hover:scale-110"
        >
          <SkipForward className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
        </button>
      </div>

      {hoverTip.visible && (
        <div
          className="fixed z-[60] pointer-events-none px-2 py-1 bg-black/90 backdrop-blur-xl rounded-lg border border-white/10 text-white text-xs font-medium whitespace-nowrap -translate-y-1/2"
          style={{ left: hoverTip.x + 12, top: hoverTip.y }}
        >
          {hoverTip.text}
        </div>
      )}
    </div>
  );
}

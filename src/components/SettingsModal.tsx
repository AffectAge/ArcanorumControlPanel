import { useState } from 'react';
import {
  X,
  Sliders,
  Coins,
  Hammer,
  ScrollText,
  Handshake,
  Globe2,
  Atom,
  Feather,
  Cross,
} from 'lucide-react';
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
  const [tab, setTab] = useState<
    | 'colonization'
    | 'construction'
    | 'science'
    | 'culture'
    | 'religion'
    | 'economy'
    | 'log'
    | 'diplomacy'
  >('colonization');
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-6 rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl overflow-hidden flex">
        <div className="w-56 border-r border-white/10 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white/90 text-lg font-semibold mb-2">
            <Sliders className="w-5 h-5" />
            Настройки
          </div>
          <button
            onClick={() => setTab('colonization')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'colonization'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Globe2 className="w-4 h-4" />
            Колонизация
          </button>
          <button
            onClick={() => setTab('construction')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'construction'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Hammer className="w-4 h-4" />
            Строительство
          </button>
          <button
            onClick={() => setTab('science')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'science'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Atom className="w-4 h-4" />
            Наука
          </button>
          <button
            onClick={() => setTab('culture')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'culture'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Feather className="w-4 h-4" />
            Культура
          </button>
          <button
            onClick={() => setTab('religion')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'religion'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Cross className="w-4 h-4" />
            Религия
          </button>
          <button
            onClick={() => setTab('economy')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'economy'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Coins className="w-4 h-4" />
            Экономика
          </button>
          <button
            onClick={() => setTab('log')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'log'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <ScrollText className="w-4 h-4" />
            Журнал
          </button>
          <button
            onClick={() => setTab('diplomacy')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'diplomacy'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Handshake className="w-4 h-4" />
            Дипломатия
          </button>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="text-white/90 text-base font-semibold">
              Настройки игры
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center hover:border-red-400/50 hover:bg-red-400/10 transition-all"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {tab === 'colonization' && (
              <>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Базовый прирост очков колонизации за ход
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько очков колонизации получает страна в конце глобального хода.
                      </span>
                    </span>
                  </span>
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
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Лимит активных колонизаций
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Максимум провинций, которые можно колонизировать одновременно (0 = без лимита).
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.colonizationMaxActive ?? 0}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        colonizationMaxActive: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Стартовые очки колонизации
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько очков колонизации получает новая страна при создании.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.startingColonizationPoints ?? 100}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        startingColonizationPoints: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <div className="text-white/40 text-xs">
                  Очки начисляются в конце глобального хода.
                </div>
              </>
            )}

            {tab === 'construction' && (
              <>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Базовый прирост очков строительства за ход
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько очков строительства начисляется стране в конце глобального хода.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.constructionPointsPerTurn ?? 10}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        constructionPointsPerTurn: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Стартовые очки строительства
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько очков строительства получает новая страна при создании.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.startingConstructionPoints ?? 100}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        startingConstructionPoints: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Стоимость сноса (% от цены здания)
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Доля стоимости здания, которую нужно заплатить очками строительства при сносе.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.demolitionCostPercent ?? 20}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        demolitionCostPercent: Math.min(
                          100,
                          Math.max(0, Number(event.target.value) || 0),
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
              </>
            )}

            {tab === 'science' && (
              <>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Прирост очков науки за ход
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько очков науки начисляется в конце глобального хода.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.sciencePointsPerTurn ?? 0}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        sciencePointsPerTurn: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Стартовые очки науки
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько очков науки получает новая страна при создании.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.startingSciencePoints ?? 0}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        startingSciencePoints: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <div className="text-white/40 text-xs">
                  Очки начисляются в конце глобального хода.
                </div>
              </>
            )}

            {tab === 'culture' && (
              <>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Прирост очков культуры за ход
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько очков культуры начисляется в конце глобального хода.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.culturePointsPerTurn ?? 0}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        culturePointsPerTurn: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Стартовые очки культуры
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько очков культуры получает новая страна при создании.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.startingCulturePoints ?? 0}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        startingCulturePoints: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <div className="text-white/40 text-xs">
                  Очки начисляются в конце глобального хода.
                </div>
              </>
            )}

            {tab === 'religion' && (
              <>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Прирост очков религии за ход
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько очков религии начисляется в конце глобального хода.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.religionPointsPerTurn ?? 0}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        religionPointsPerTurn: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Стартовые очки религии
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько очков религии получает новая страна при создании.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.startingReligionPoints ?? 0}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        startingReligionPoints: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <div className="text-white/40 text-xs">
                  Очки начисляются в конце глобального хода.
                </div>
              </>
            )}

            {tab === 'economy' && (
              <>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Прирост золота за ход
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько золота начисляется в конце глобального хода.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.goldPerTurn ?? 0}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        goldPerTurn: Math.max(0, Number(event.target.value) || 0),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Прирост дукатов за ход
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько дукатов начисляется в конце глобального хода.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.ducatsPerTurn ?? 0}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        ducatsPerTurn: Math.max(0, Number(event.target.value) || 0),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Стартовое золото
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько золота получает новая страна при создании.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.startingGold ?? 0}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        startingGold: Math.max(0, Number(event.target.value) || 0),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Стартовые дукаты
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько дукатов получает новая страна при создании.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.startingDucats ?? 100000}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        startingDucats: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
              </>
            )}

            {tab === 'log' && (
              <>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Хранить события за последние (ходов)
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Сколько ходов хранится в журнале событий до авто‑очистки.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={settings.eventLogRetainTurns ?? 3}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        eventLogRetainTurns: Math.max(
                          1,
                          Number(event.target.value) || 1,
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
              </>
            )}

            {tab === 'diplomacy' && (
              <>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  <span className="flex items-center gap-2">
                    Авто-отклонение дипломатических предложений (ходов)
                    <span className="relative group text-white/50 text-xs cursor-default">
                      ⓘ
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        Через сколько ходов неотвеченные предложения будут автоматически отклонены.
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={settings.diplomacyProposalExpireTurns ?? 3}
                    onChange={(event) =>
                      onChange({
                        ...settings,
                        diplomacyProposalExpireTurns: Math.max(
                          1,
                          Number(event.target.value) || 1,
                        ),
                      })
                    }
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

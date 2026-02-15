import {
  FileText,
  Factory,
  Shield,
  Atom,
  Globe,
  Microscope,
  Palette,
  Landmark,
  ShoppingCart,
  Handshake,
} from 'lucide-react';
import { useState } from 'react';
import Tooltip from './Tooltip';

const dockItems = [
  { id: 'docs', icon: FileText, label: 'Documents' },
  { id: 'industry', icon: Factory, label: 'Industry' },
  { id: 'defense', icon: Shield, label: 'Defense' },
  { id: 'science', icon: Atom, label: 'Science' },
  { id: 'markets', icon: Globe, label: 'Рынки' },
  { id: 'research', icon: Microscope, label: 'Research', active: true },
  { id: 'culture', icon: Palette, label: 'Culture' },
  { id: 'government', icon: Landmark, label: 'Government' },
  { id: 'trade', icon: ShoppingCart, label: 'Trade' },
  { id: 'diplomacy', icon: Handshake, label: 'Diplomacy' },
] as const;

type DockItemId = (typeof dockItems)[number]['id'];

type BottomDockProps = {
  onOpenIndustry: () => void;
  onOpenDiplomacy: () => void;
  onOpenMarkets: () => void;
};

export default function BottomDock({
  onOpenIndustry,
  onOpenDiplomacy,
  onOpenMarkets,
}: BottomDockProps) {
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);

  const submenuById: Record<
    DockItemId,
    { label: string; icon: (typeof dockItems)[number]['icon']; onClick?: () => void }[]
  > = {
    docs: [{ label: 'Скоро', icon: FileText }],
    industry: [{ label: 'Производство', icon: Factory, onClick: onOpenIndustry }],
    defense: [{ label: 'Скоро', icon: Shield }],
    science: [{ label: 'Скоро', icon: Atom }],
    markets: [{ label: 'Рынки', icon: Globe, onClick: onOpenMarkets }],
    research: [{ label: 'Скоро', icon: Microscope }],
    culture: [{ label: 'Скоро', icon: Palette }],
    government: [{ label: 'Скоро', icon: Landmark }],
    trade: [{ label: 'Скоро', icon: ShoppingCart }],
    diplomacy: [{ label: 'Договоры', icon: Handshake, onClick: onOpenDiplomacy }],
  };

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 bottom-4 h-16 px-3 py-2.5 flex items-center gap-2.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl z-50 animate-slideUp"
      onMouseLeave={() => setOpenSubmenuId(null)}
    >
      {dockItems.map((item, index) => {
        const submenuItems = submenuById[item.id];
        const submenuOpen = openSubmenuId === item.id;
        const itemHovered = openSubmenuId === item.id;

        return (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => setOpenSubmenuId(item.id)}
          >
            <Tooltip label={item.label}>
              <button
                onClick={() => {}}
                className={`
                  w-11 h-11 rounded-xl border transition-all duration-200 flex items-center justify-center group relative
                  ${
                    itemHovered
                      ? 'bg-emerald-500/20 border-emerald-400/50 shadow-lg shadow-emerald-500/20'
                      : 'bg-black/30 border-white/10 hover:border-emerald-400/50 hover:bg-emerald-400/10 hover:scale-110'
                  }
                `}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <item.icon
                  className={`
                    w-5 h-5 transition-colors
                    ${
                      itemHovered
                        ? 'text-emerald-400'
                        : 'text-white/70 group-hover:text-emerald-400'
                    }
                  `}
                />
              </button>
            </Tooltip>

            <div
              className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-40 rounded-xl border border-white/10 bg-[#0b111b]/95 backdrop-blur-xl shadow-2xl p-1.5 origin-bottom transition-all duration-200 ${
                submenuOpen
                  ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                  : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
              }`}
            >
              {submenuItems.map((entry) => {
                const EntryIcon = entry.icon;
                const disabled = !entry.onClick;
                return (
                  <button
                    key={entry.label}
                    onClick={() => {
                      if (!entry.onClick) return;
                      setOpenSubmenuId(null);
                      entry.onClick();
                    }}
                    disabled={disabled}
                    className={`w-full h-9 px-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                      disabled
                        ? 'text-white/35 cursor-not-allowed'
                        : 'text-white/85 hover:text-emerald-300 hover:bg-emerald-500/10'
                    }`}
                  >
                    <EntryIcon className="w-4 h-4" />
                    {entry.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

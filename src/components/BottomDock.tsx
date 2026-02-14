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
];

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
  const [activeItem, setActiveItem] = useState('research');

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-4 h-16 px-3 py-2.5 flex items-center gap-2.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl z-50 animate-slideUp">
      {dockItems.map((item, index) => (
        <Tooltip key={item.id} label={item.label}>
          <button
            onClick={() => {
              setActiveItem(item.id);
              if (item.id === 'industry') onOpenIndustry();
              if (item.id === 'diplomacy') onOpenDiplomacy();
              if (item.id === 'markets') onOpenMarkets();
            }}
            className={`
              w-11 h-11 rounded-xl border transition-all duration-200 flex items-center justify-center group relative
              ${
                activeItem === item.id
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
                  activeItem === item.id
                    ? 'text-emerald-400'
                    : 'text-white/70 group-hover:text-emerald-400'
                }
              `}
            />
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

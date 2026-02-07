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
  Wrench,
} from 'lucide-react';
import { useState } from 'react';

const dockItems = [
  { id: 'docs', icon: FileText, label: 'Documents' },
  { id: 'industry', icon: Factory, label: 'Industry' },
  { id: 'defense', icon: Shield, label: 'Defense' },
  { id: 'science', icon: Atom, label: 'Science' },
  { id: 'world', icon: Globe, label: 'World' },
  { id: 'research', icon: Microscope, label: 'Research', active: true },
  { id: 'culture', icon: Palette, label: 'Culture' },
  { id: 'government', icon: Landmark, label: 'Government' },
  { id: 'trade', icon: ShoppingCart, label: 'Trade' },
  { id: 'settings', icon: Wrench, label: 'Settings' },
];

type BottomDockProps = {
  onOpenSettings: () => void;
};

export default function BottomDock({ onOpenSettings }: BottomDockProps) {
  const [activeItem, setActiveItem] = useState('research');

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-4 h-16 px-3 py-2.5 flex items-center gap-2.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl z-50 animate-slideUp">
      {dockItems.map((item, index) => (
        <button
          key={item.id}
          onClick={() => {
          setActiveItem(item.id);
          if (item.id === 'settings') onOpenSettings();
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
          title={item.label}
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

          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 backdrop-blur-xl rounded-lg border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {item.label}
          </div>
        </button>
      ))}
    </div>
  );
}

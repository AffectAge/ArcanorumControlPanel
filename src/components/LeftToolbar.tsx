import { Swords, Bird, TrendingUp, Lightbulb } from 'lucide-react';
import { useState } from 'react';

const tools = [
  { id: 'select', icon: Swords, label: 'Select' },
  { id: 'diplomacy', icon: Bird, label: 'Diplomacy' },
  { id: 'economy', icon: TrendingUp, label: 'Economy' },
  { id: 'tech', icon: Lightbulb, label: 'Tech' },
];

export default function LeftToolbar() {
  const [activeTool, setActiveTool] = useState('select');

  return (
    <div className="absolute left-4 top-20 flex flex-col gap-3 z-40 animate-slideRight">
      {tools.map((tool, index) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={`
            w-11 h-11 rounded-xl backdrop-blur-xl border transition-all duration-200 flex items-center justify-center group
            ${
              activeTool === tool.id
                ? 'bg-emerald-500/20 border-emerald-400/50 shadow-lg shadow-emerald-500/20'
                : 'bg-black/40 border-white/10 hover:border-emerald-400/50 hover:bg-emerald-400/10'
            }
          `}
          style={{ animationDelay: `${index * 50}ms` }}
          title={tool.label}
        >
          <tool.icon
            className={`
              w-5 h-5 transition-colors
              ${
                activeTool === tool.id
                  ? 'text-emerald-400'
                  : 'text-white/70 group-hover:text-emerald-400'
              }
            `}
          />
        </button>
      ))}
    </div>
  );
}

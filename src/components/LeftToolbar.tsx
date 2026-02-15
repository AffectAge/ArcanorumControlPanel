import { Factory, ShoppingCart, TrendingUp, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import Tooltip from './Tooltip';

const tools = [
  { id: 'industry', icon: Factory, label: 'Индустрия' },
  { id: 'markets', icon: ShoppingCart, label: 'Товары и торговля' },
  { id: 'economy', icon: TrendingUp, label: 'Economy' },
  { id: 'tech', icon: Lightbulb, label: 'Tech' },
];

type LeftToolbarProps = {
  onOpenIndustry: () => void;
  onOpenMarkets: () => void;
};

export default function LeftToolbar({
  onOpenIndustry,
  onOpenMarkets,
}: LeftToolbarProps) {
  const [activeTool, setActiveTool] = useState('industry');

  return (
    <div className="absolute left-4 top-20 flex flex-col gap-3 z-40 animate-slideRight">
      {tools.map((tool, index) => (
        <Tooltip key={tool.id} label={tool.label}>
          <button
            onClick={() => {
              setActiveTool(tool.id);
              if (tool.id === 'industry') {
                onOpenIndustry();
              }
              if (tool.id === 'markets') {
                onOpenMarkets();
              }
            }}
            className={`
              w-11 h-11 rounded-xl backdrop-blur-xl border transition-all duration-200 flex items-center justify-center group
              ${
                activeTool === tool.id
                  ? 'bg-emerald-500/20 border-emerald-400/50 shadow-lg shadow-emerald-500/20'
                  : 'bg-black/40 border-white/10 hover:border-emerald-400/50 hover:bg-emerald-400/10'
              }
            `}
            style={{ animationDelay: `${index * 50}ms` }}
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
        </Tooltip>
      ))}
    </div>
  );
}

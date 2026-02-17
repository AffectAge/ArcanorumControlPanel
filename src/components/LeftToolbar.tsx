import { Factory, ShoppingCart, Users, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import Tooltip from './Tooltip';

const tools = [
  { id: 'industry', icon: Factory, label: 'Индустрия' },
  { id: 'markets', icon: ShoppingCart, label: 'Товары и торговля' },
  { id: 'population', icon: Users, label: 'Население' },
  { id: 'tech', icon: Lightbulb, label: 'Tech' },
];

type LeftToolbarProps = {
  onOpenIndustry: () => void;
  onOpenMarkets: () => void;
  onOpenPopulation: () => void;
};

export default function LeftToolbar({
  onOpenIndustry,
  onOpenMarkets,
  onOpenPopulation,
}: LeftToolbarProps) {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  return (
    <div className="absolute left-4 top-24 flex flex-col gap-3 z-40 animate-slideRight">
      {tools.map((tool, index) => (
        <Tooltip key={tool.id} label={tool.label}>
          <button
            onClick={() => {
              if (tool.id === 'industry') {
                onOpenIndustry();
              }
              if (tool.id === 'markets') {
                onOpenMarkets();
              }
              if (tool.id === 'population') {
                onOpenPopulation();
              }
            }}
            onMouseEnter={() => setHoveredTool(tool.id)}
            onMouseLeave={() => setHoveredTool(null)}
            className={`
              w-11 h-11 rounded-xl backdrop-blur-xl border transition-all duration-200 flex items-center justify-center group relative
              ${
                hoveredTool === tool.id
                  ? 'bg-emerald-700 border-emerald-400/70 shadow-lg shadow-emerald-500/20'
                  : 'bg-[#0b111b] border-white/15 hover:border-emerald-400/50 hover:bg-[#0f1726] hover:scale-110'
              }
            `}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <tool.icon
              className={`
                w-5 h-5 transition-colors
                ${
                  hoveredTool === tool.id
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

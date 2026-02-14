import { Map, MessageSquare, User, CheckSquare } from 'lucide-react';
import { useState } from 'react';
import Tooltip from './Tooltip';

const buttons = [
  { id: 'map', icon: Map, label: 'Map layers' },
  { id: 'chat', icon: MessageSquare, label: 'Chat/Log', active: true },
  { id: 'players', icon: User, label: 'Players' },
  { id: 'tasks', icon: CheckSquare, label: 'Tasks', active: true },
];

export default function RightQuickButtons() {
  const [activeButtons, setActiveButtons] = useState(
    new Set(buttons.filter((b) => b.active).map((b) => b.id))
  );

  const toggleButton = (id: string) => {
    const newActive = new Set(activeButtons);
    if (newActive.has(id)) {
      newActive.delete(id);
    } else {
      newActive.add(id);
    }
    setActiveButtons(newActive);
  };

  return (
    <div className="absolute right-4 bottom-28 flex flex-col gap-3 z-40 animate-slideLeft">
      {buttons.map((button, index) => (
        <Tooltip key={button.id} label={button.label}>
          <button
            onClick={() => toggleButton(button.id)}
            className={`
              w-11 h-11 rounded-xl backdrop-blur-xl border transition-all duration-200 flex items-center justify-center group
              ${
                activeButtons.has(button.id)
                  ? 'bg-emerald-500/20 border-emerald-400/50 shadow-lg shadow-emerald-500/20'
                  : 'bg-black/40 border-white/10 hover:border-emerald-400/50 hover:bg-emerald-400/10'
              }
            `}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <button.icon
              className={`
                w-5 h-5 transition-colors
                ${
                  activeButtons.has(button.id)
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

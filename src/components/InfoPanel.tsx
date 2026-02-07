import { X, Flag, ShieldCheck, ShieldX } from 'lucide-react';

interface InfoPanelProps {
  province: string;
  owner?: string;
  climate?: string;
  culture?: string;
  landscape?: string;
  religion?: string;
  resources?: { name: string; amount: number }[];
  onClose: () => void;
  colonizationCost?: number;
  colonizationAllowed?: boolean;
}

export default function InfoPanel({
  province,
  owner,
  climate,
  culture,
  landscape,
  religion,
  resources = [],
  onClose,
  colonizationCost,
  colonizationAllowed,
}: InfoPanelProps) {
  return (
    <div className="fixed left-4 bottom-4 z-40 w-72 rounded-xl bg-black/45 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden animate-fadeIn">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <h3 className="text-white font-semibold text-sm">Провинция {province}</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md bg-black/30 border border-white/10 flex items-center justify-center hover:border-red-400/50 hover:bg-red-400/10 transition-all duration-200 group"
        >
          <X className="w-3.5 h-3.5 text-white/70 group-hover:text-red-400 transition-colors" />
        </button>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10">
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Flag className="w-4 h-4 text-white/80" />
          </div>
          <div className="flex-1">
            <div className="text-white/80 text-sm font-medium">
              {owner ? `Владелец: ${owner}` : 'Свободная провинция'}
            </div>
          </div>
          <div className="text-white/40 text-xs">-</div>
        </div>

        <div className="space-y-1 text-white/60 text-xs">
          <div className="mt-2">
            <div className="text-white/70 text-xs font-semibold">Ресурсы</div>
            {resources.length > 0 ? (
              <div className="mt-1 space-y-1">
                {resources.map((resource) => (
                  <div
                    key={resource.name}
                    className="flex items-center justify-between text-white/60 text-xs"
                  >
                    <span>{resource.name}</span>
                    <span className="text-white/80">{resource.amount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white/40 text-xs">Нет ресурсов</div>
            )}
          </div>

          <div>Климат: {climate ?? '—'}</div>
          <div>Культура: {culture ?? '—'}</div>
          <div>Ландшафт: {landscape ?? '—'}</div>
          <div>Религия: {religion ?? '—'}</div>
          <div>Стоимость колонизации: {colonizationCost ?? 100}</div>
          <div className="flex items-center gap-2">
            {colonizationAllowed ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <ShieldX className="w-3.5 h-3.5 text-red-300" />
            )}
            <span>
              {colonizationAllowed
                ? 'Колонизация доступна'
                : 'Колонизация запрещена'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

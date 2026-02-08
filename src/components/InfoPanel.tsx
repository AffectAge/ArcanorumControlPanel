import {
  X,
  Flag,
  ShieldCheck,
  ShieldX,
  Globe2,
  Feather,
  MapPin,
  Cross,
  TrendingUp,
  XCircle,
  Coins,
  Factory,
} from 'lucide-react';

interface InfoPanelProps {
  province: string;
  owner?: string;
  ownerFlagDataUrl?: string;
  climate?: string;
  culture?: string;
  cultureIconDataUrl?: string;
  landscape?: string;
  religion?: string;
  religionIconDataUrl?: string;
  radiation?: number;
  pollution?: number;
  resources?: { name: string; amount: number; iconDataUrl?: string }[];
  onClose: () => void;
  colonizationCost?: number;
  colonizationAllowed?: boolean;
}

export default function InfoPanel({
  province,
  owner,
  ownerFlagDataUrl,
  climate,
  culture,
  cultureIconDataUrl,
  landscape,
  religion,
  religionIconDataUrl,
  radiation,
  pollution,
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
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            {ownerFlagDataUrl ? (
              <img
                src={ownerFlagDataUrl}
                alt={owner ? `${owner} flag` : 'Flag'}
                className="w-full h-full object-cover"
              />
            ) : (
              <Flag className="w-4 h-4 text-white/80" />
            )}
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
            <div className="text-white/70 text-xs font-semibold flex items-center gap-2">
              <Factory className="w-3.5 h-3.5 text-white/60" />
              Ресурсы
            </div>
            {resources.length > 0 ? (
              <div className="mt-1 space-y-1">
                {resources.map((resource) => (
                  <div
                    key={resource.name}
                    className="flex items-center justify-between text-white/60 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md border border-white/10 bg-black/30 overflow-hidden flex items-center justify-center">
                        {resource.iconDataUrl ? (
                          <img
                            src={resource.iconDataUrl}
                            alt={resource.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] text-white/40">?</span>
                        )}
                      </div>
                      <span>{resource.name}</span>
                    </div>
                    <span className="text-white/80">{resource.amount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white/40 text-xs">Нет ресурсов</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Globe2 className="w-3.5 h-3.5 text-white/60" />
            <span>Климат: {climate ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Feather className="w-3.5 h-3.5 text-white/60" />
            <span className="flex items-center gap-2">
              Культура:
              {cultureIconDataUrl && (
                <img
                  src={cultureIconDataUrl}
                  alt={culture ?? 'Культура'}
                  className="w-4 h-4 rounded-sm border border-white/10 object-cover"
                />
              )}
              <span>{culture ?? '—'}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-white/60" />
            <span>Ландшафт: {landscape ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Cross className="w-3.5 h-3.5 text-white/60" />
            <span className="flex items-center gap-2">
              Религия:
              {religionIconDataUrl && (
                <img
                  src={religionIconDataUrl}
                  alt={religion ?? 'Религия'}
                  className="w-4 h-4 rounded-sm border border-white/10 object-cover"
                />
              )}
              <span>{religion ?? '—'}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-white/60" />
            <span>Радиация: {radiation ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-3.5 h-3.5 text-white/60" />
            <span>Загрязнение: {pollution ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-white/60" />
            <span>Стоимость колонизации: {colonizationCost ?? 100}</span>
          </div>
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

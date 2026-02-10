import { useEffect, useState } from 'react';
import { X, Network, Plus } from 'lucide-react';
import type {
  Country,
  LogisticsRoute,
  LogisticsRouteType,
  ProvinceRecord,
} from '../types';

type LogisticsModalProps = {
  open: boolean;
  provinces: ProvinceRecord;
  countries: Country[];
  routeTypes: LogisticsRouteType[];
  routes: LogisticsRoute[];
  activeCountryId?: string;
  onClose: () => void;
  onSetRouteStatus: (
    routeId: string,
    countryId: string,
    status: 'open' | 'closed',
  ) => void;
  onStartRouteBuild: (payload: {
    name: string;
    routeTypeId: string;
  }) => void;
};

export default function LogisticsModal({
  open,
  provinces,
  countries,
  routeTypes,
  routes,
  activeCountryId,
  onClose,
  onSetRouteStatus,
  onStartRouteBuild,
}: LogisticsModalProps) {
  const [routeName, setRouteName] = useState('');
  const [routeTypeId, setRouteTypeId] = useState('');

  useEffect(() => {
    if (!open) return;
    setRouteName((prev) => prev || 'Новый маршрут');
    setRouteTypeId((prev) => prev || routeTypes[0]?.id || '');
  }, [open, routeTypes]);

  if (!open) return null;

  const canStartRouteBuild = Boolean(routeTypeId && routeName.trim());
  const activeCountryName =
    countries.find((country) => country.id === activeCountryId)?.name ??
    'Не выбрана';

  const visibleRoutes = routes.filter((route) => {
    if (!activeCountryId) return true;
    return route.provinceIds.some(
      (provinceId) => provinces[provinceId]?.ownerCountryId === activeCountryId,
    );
  });

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-6 rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-white/10 bg-black/40 flex items-center justify-center">
              <Network className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <div className="text-white text-lg font-semibold">Логистика</div>
              <div className="text-white/60 text-sm">Прокладка физических маршрутов</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/70 flex items-center justify-center hover:border-sky-400/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 h-full">
            <div className="space-y-6 overflow-y-auto legend-scroll pr-1">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-white/80 text-sm">
                  Активная страна: <span className="text-white font-semibold">{activeCountryName}</span>
                </div>
              </div>

              <div className="rounded-xl border border-sky-400/30 bg-sky-500/5 p-4 space-y-3">
                <div className="text-sky-200 text-sm font-semibold">Прокладка маршрута по карте</div>

                <label className="flex flex-col gap-1 text-white/70 text-sm max-w-sm">
                  Название маршрута
                  <input
                    value={routeName}
                    onChange={(event) => setRouteName(event.target.value)}
                    className="h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-sky-400/60"
                  />
                </label>

                <label className="flex flex-col gap-1 text-white/70 text-sm max-w-sm">
                  Тип маршрута
                  <select
                    value={routeTypeId}
                    onChange={(event) => setRouteTypeId(event.target.value)}
                    className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-sky-400/60"
                  >
                    {routeTypes.map((item) => (
                      <option key={item.id} value={item.id} className="bg-[#0b111b] text-white">
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-3 space-y-2">
                  <div className="text-xs text-cyan-100/80">
                    Нажмите кнопку ниже: окно закроется, затем кликайте провинции на карте.
                    Первая выбранная провинция станет начальной автоматически.
                  </div>
                  <button
                    onClick={() =>
                      onStartRouteBuild({
                        name: routeName.trim(),
                        routeTypeId,
                      })
                    }
                    disabled={!canStartRouteBuild}
                    className={`h-8 px-3 rounded-lg border text-xs inline-flex items-center gap-2 ${
                      canStartRouteBuild
                        ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-100'
                        : 'bg-black/30 border-white/10 text-white/40 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Начать прокладку маршрута
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 overflow-hidden flex flex-col">
              <div className="text-white text-sm font-semibold mb-2">Маршруты</div>
              <div className="flex-1 overflow-y-auto legend-scroll pr-1 space-y-2">
                {visibleRoutes.length > 0 ? (
                  visibleRoutes.map((route) => {
                    const type = routeTypes.find((item) => item.id === route.routeTypeId);
                    const owner = countries.find((item) => item.id === route.ownerCountryId);
                    const statusForActive =
                      activeCountryId && route.countryStatuses?.[activeCountryId]
                        ? route.countryStatuses[activeCountryId]
                        : 'open';

                    return (
                      <div
                        key={route.id}
                        className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-3 shadow-lg shadow-black/20"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-white text-sm font-semibold leading-tight break-words">
                            {route.name}
                          </div>
                          <span
                            className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium border"
                            style={{
                              color: type?.color ?? '#94a3b8',
                              borderColor: `${type?.color ?? '#334155'}66`,
                              backgroundColor: `${type?.color ?? '#334155'}22`,
                            }}
                          >
                            {type?.name ?? 'Тип'}
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-white/65">
                          <div className="rounded-md border border-white/10 bg-black/25 px-2 py-1">
                            Страна: <span className="text-white/85">{owner?.name ?? '—'}</span>
                          </div>
                          <div className="rounded-md border border-white/10 bg-black/25 px-2 py-1 text-right">
                            Узлов: <span className="text-white/85">{route.provinceIds.length}</span>
                          </div>
                        </div>

                        <div className="mt-2">
                          <label className="text-[11px] text-white/60">
                            Статус для {activeCountryName}
                          </label>
                          <select
                            disabled={!activeCountryId}
                            value={statusForActive}
                            onChange={(event) =>
                              activeCountryId &&
                              onSetRouteStatus(
                                route.id,
                                activeCountryId,
                                event.target.value as 'open' | 'closed',
                              )
                            }
                            className="mt-1 h-8 w-full rounded-md bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/50 disabled:opacity-50"
                          >
                            <option value="open" className="bg-[#0b111b] text-white">
                              Открыт
                            </option>
                            <option value="closed" className="bg-[#0b111b] text-white">
                              Закрыт
                            </option>
                          </select>
                        </div>

                        <div className="mt-2 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-white/55 leading-relaxed break-all">
                          {route.provinceIds.join(' → ')}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-white/50 text-sm">Для этой страны маршрутов пока нет</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

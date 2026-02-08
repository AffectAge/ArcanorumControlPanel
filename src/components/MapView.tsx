import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Flag,
  Palette,
  Mountain,
  CloudSun,
  Landmark,
  Gem,
  MapPinned,
  Leaf,
  Globe2,
  Map,
} from 'lucide-react';
import svgPanZoom from 'svg-pan-zoom';
import mapUrl from '../assets/world-states-provinces.svg';
import type { MapLayer, MapLayerPaint, Trait } from '../types';

type LegendItem = { label: string; color: string };

type MapViewProps = {
  layers: MapLayer[];
  layerPaint: MapLayerPaint;
  politicalStripes: Record<string, string>;
  colonizationTint: Record<string, string>;
  layerLegends: Record<string, LegendItem[]>;
  resources: Trait[];
  selectedResourceId?: string;
  onSelectResource: (id?: string) => void;
  selectedId?: string;
  onToggleLayer: (id: string) => void;
  onSelectProvince: (id: string) => void;
  onProvincesDetected: (ids: string[]) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
};

const layerTone: Record<string, string> = {
  political: 'from-emerald-400/30 via-emerald-500/10 to-transparent',
  cultural: 'from-amber-300/30 via-rose-400/10 to-transparent',
  landscape: 'from-sky-300/25 via-lime-400/10 to-transparent',
  continent: 'from-emerald-300/25 via-teal-400/10 to-transparent',
  region: 'from-indigo-300/25 via-sky-400/10 to-transparent',
  climate: 'from-blue-400/30 via-orange-300/10 to-transparent',
  religion: 'from-yellow-300/30 via-purple-400/10 to-transparent',
  resources: 'from-emerald-300/25 via-lime-400/10 to-transparent',
  fertility: 'from-lime-300/25 via-emerald-400/10 to-transparent',
  radiation: 'from-lime-300/25 via-red-400/10 to-transparent',
  pollution: 'from-slate-300/25 via-amber-400/10 to-transparent',
  colonization: 'from-emerald-400/20 via-emerald-500/10 to-transparent',
};

const layerIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  political: Flag,
  cultural: Palette,
  landscape: Mountain,
  continent: Globe2,
  region: Map,
  climate: CloudSun,
  religion: Landmark,
  resources: Gem,
  fertility: Leaf,
  radiation: CloudSun,
  pollution: Mountain,
  colonization: MapPinned,
};

const stripeIdFromColor = (color: string) =>
  `stripe-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

const ensureStripePattern = (svg: SVGSVGElement, color: string) => {
  const id = stripeIdFromColor(color);
  if (svg.querySelector(`#${id}`)) {
    return `url(#${id})`;
  }

  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  pattern.setAttribute('id', id);
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  pattern.setAttribute('width', '12');
  pattern.setAttribute('height', '12');

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '12');
  rect.setAttribute('height', '12');
  rect.setAttribute('fill', color);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M-2 12 L12 -2');
  path.setAttribute('stroke', 'rgba(0,0,0,0.45)');
  path.setAttribute('stroke-width', '3');

  pattern.appendChild(rect);
  pattern.appendChild(path);
  defs.appendChild(pattern);

  return `url(#${id})`;
};

const resolveFill = (svg: SVGSVGElement, value: string) => {
  if (value.startsWith('stripe:')) {
    const color = value.slice('stripe:'.length).trim();
    return ensureStripePattern(svg, color);
  }
  return value;
};

const MapSvg = memo(({ markup }: { markup: string }) => (
  <div className="map-svg" dangerouslySetInnerHTML={{ __html: markup }} />
));

export default function MapView({
  layers,
  layerPaint,
  politicalStripes,
  colonizationTint,
  layerLegends,
  resources,
  selectedResourceId,
  onSelectResource,
  selectedId,
  onToggleLayer,
  onSelectProvince,
  onProvincesDetected,
  onContextMenu,
}: MapViewProps) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panZoomRef = useRef<ReturnType<typeof svgPanZoom> | null>(null);

  const activeLayerIds = useMemo(
    () => layers.filter((layer) => layer.visible).map((layer) => layer.id),
    [layers],
  );

  useEffect(() => {
    let cancelled = false;
    fetch(mapUrl)
      .then((response) => response.text())
      .then((text) => {
        if (!cancelled) setSvgMarkup(text);
      })
      .catch(() => {
        if (!cancelled) setSvgMarkup('');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!svgMarkup || !containerRef.current) return;

    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    if (panZoomRef.current) {
      panZoomRef.current.destroy();
      panZoomRef.current = null;
    }

    panZoomRef.current = svgPanZoom(svg, {
      zoomEnabled: true,
      controlIconsEnabled: false,
      fit: true,
      center: true,
      minZoom: 0.7,
      maxZoom: 20,
      dblClickZoomEnabled: false,
      zoomScaleSensitivity: 0.2,
    });

    const paths = Array.from(svg.querySelectorAll('path'));
    const provinceIds: string[] = [];
    let autoIndex = 0;

    paths.forEach((path) => {
      const rawId = path.getAttribute('id') || '';
      const provinceId = rawId || `p-${autoIndex++}`;
      if (!provinceId) return;
      path.setAttribute('data-province', provinceId);
      provinceIds.push(provinceId);
      if (!path.getAttribute('data-original-fill')) {
        path.setAttribute('data-original-fill', path.getAttribute('fill') || '');
      }
      path.style.cursor = 'pointer';
    });

    if (provinceIds.length > 0) onProvincesDetected(provinceIds);

    return () => {
      if (panZoomRef.current) {
        panZoomRef.current.destroy();
        panZoomRef.current = null;
      }
    };
  }, [svgMarkup, onProvincesDetected]);

  useEffect(() => {
    const handleResize = () => {
      if (!panZoomRef.current) return;
      panZoomRef.current.resize();
      panZoomRef.current.fit();
      panZoomRef.current.center();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll('path'));

    paths.forEach((path) => {
      const provinceId = path.getAttribute('data-province');
      if (!provinceId) return;

      let fill = '';
      if (activeLayerIds.includes('colonization') && colonizationTint[provinceId]) {
        fill = resolveFill(svg, colonizationTint[provinceId]);
      } else {
        for (const layerId of activeLayerIds) {
          if (layerId === 'political' && politicalStripes[provinceId]) {
            const color = politicalStripes[provinceId];
            fill = ensureStripePattern(svg, color);
            break;
          }
          const paint = layerPaint[layerId];
          if (paint && paint[provinceId]) {
            fill = paint[provinceId];
            break;
          }
        }
      }

      const originalFill = path.getAttribute('data-original-fill') || '';
      path.setAttribute('fill', fill || originalFill || '#b9b9b9');
      path.classList.toggle('map-path-selected', provinceId === selectedId);
    });
  }, [activeLayerIds, layerPaint, politicalStripes, colonizationTint, selectedId]);

  useEffect(() => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    const handleClick = (event: Event) => {
      const target = event.target as Element | null;
      if (!target) return;
      const path = target.closest('path');
      if (!path) return;
      const provinceId = path.getAttribute('data-province');
      if (provinceId) onSelectProvince(provinceId);
    };

    const handleContextMenu = (event: Event) => {
      event.preventDefault();
      const target = event.target as Element | null;
      if (!target) return;
      const path = target.closest('path');
      if (!path) return;
      const provinceId = path.getAttribute('data-province');
      if (!provinceId) return;
      const mouseEvent = event as MouseEvent;
      onContextMenu(provinceId, mouseEvent.clientX, mouseEvent.clientY);
    };

    svg.addEventListener('click', handleClick);
    svg.addEventListener('contextmenu', handleContextMenu);
    return () => {
      svg.removeEventListener('click', handleClick);
      svg.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [onSelectProvince, onContextMenu, svgMarkup]);

  const resourcesLayerVisible = layers.some(
    (layer) => layer.id === 'resources' && layer.visible,
  );

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="map-stage" ref={containerRef}>
          {svgMarkup ? (
            <MapSvg markup={svgMarkup} />
          ) : (
            <div className="map-loading">Загрузка карты...</div>
          )}
          {layers
            .filter((layer) => layer.visible && layer.id !== 'colonization')
            .map((layer) => (
              <div
                key={layer.id}
                className={`map-layer ${layer.id} bg-gradient-to-br ${
                  layerTone[layer.id] ?? 'from-white/10 via-white/5 to-transparent'
                }`}
              />
            ))}
        </div>
      </div>

      

      <div className="absolute left-1/2 -translate-x-1/2 bottom-2 -translate-y-[0.1rem] z-30">
        {resourcesLayerVisible && (
          <div className="absolute right-full mr-4 bottom-0 w-56 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-3 shadow-xl">
            <div className="text-white/80 text-sm font-semibold mb-2">Ресурсы</div>
            {resources.length > 0 ? (
              <label className="flex flex-col gap-1 text-xs text-white/70">
                Ресурс
                <select
                  value={selectedResourceId ?? ''}
                  onChange={(event) => onSelectResource(event.target.value || undefined)}
                  className="h-8 rounded-lg bg-[#0b111b] border border-white/10 px-2 text-white focus:outline-none focus:border-emerald-400/60 shadow-inner"
                >
                  <option value="" className="bg-[#0b111b] text-white">
                    Выберите ресурс
                  </option>
                  {resources.map((resource) => (
                    <option
                      key={resource.id}
                      value={resource.id}
                      className="bg-[#0b111b] text-white"
                    >
                      {resource.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="text-white/50 text-xs">Нет ресурсов</div>
            )}
          </div>
        )}

        <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl px-3 py-2 shadow-2xl">
          <div className="text-white/80 text-xs font-semibold mb-2 text-center">Слои</div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {layers.map((layer) => {
              const Icon = layerIconMap[layer.id] ?? Flag;
              return (
                <button
                  key={layer.id}
                  onClick={() => onToggleLayer(layer.id)}
                  className={`w-11 h-11 rounded-xl border transition-all duration-200 flex items-center justify-center group relative ${
                    layer.visible
                      ? 'bg-emerald-500/20 border-emerald-400/50 shadow-lg shadow-emerald-500/20'
                      : 'bg-black/30 border-white/10 hover:border-emerald-400/50 hover:bg-emerald-400/10 hover:scale-110'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      layer.visible
                        ? 'text-emerald-400'
                        : 'text-white/70 group-hover:text-emerald-400'
                    }`}
                  />
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 backdrop-blur-xl rounded-lg border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {layer.name}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="absolute left-full ml-4 bottom-0 w-64 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-3 shadow-xl">
            <div className="text-white/80 text-xs font-semibold mb-2">Легенда</div>
            <div className="mt-3 space-y-3 max-h-48 overflow-y-auto pr-1 legend-scroll">
              {layers
                .filter((layer) => layer.visible)
                .map((layer) => {
                  const legendItems = layerLegends[layer.id] ?? [];
                  if (legendItems.length === 0) return null;
                  return (
                    <div key={`legend-${layer.id}`} className="space-y-1">
                      <div className="text-white/70 text-xs font-semibold">
                        {layer.name}
                      </div>
                      <div className="space-y-1">
                        {legendItems.map((item) => (
                          <div
                            key={`${layer.id}-${item.label}`}
                            className="flex items-center gap-2 text-[11px] text-white/70"
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-white/10"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

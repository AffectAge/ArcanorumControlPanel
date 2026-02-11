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
  Map as MapIcon,
} from 'lucide-react';
import svgPanZoom from 'svg-pan-zoom';
import mapUrl from '../assets/world-states-provinces.svg';
import type {
  LogisticsEdge,
  LogisticsNode,
  LogisticsRouteType,
  MapLayer,
  MapLayerPaint,
  Trait,
} from '../types';

type LegendItem = { label: string; color: string };

type MapViewProps = {
  layers: MapLayer[];
  layerPaint: MapLayerPaint;
  politicalStripes: Record<string, string>;
  colonizationTint: Record<string, string>;
  layerLegends: Record<string, LegendItem[]>;
  resources: Trait[];
  logisticsNodes: LogisticsNode[];
  logisticsEdges: LogisticsEdge[];
  logisticsRouteTypes: LogisticsRouteType[];
  logisticsRouteProvinceIds?: string[];
  marketCapitals?: {
    provinceId: string;
    marketId: string;
    marketName: string;
    color: string;
  }[];
  selectedResourceId?: string;
  onSelectResource: (id?: string) => void;
  selectedId?: string;
  onToggleLayer: (id: string) => void;
  onSelectProvince: (id: string) => void;
  onProvincesDetected: (ids: string[]) => void;
  onProvinceAdjacencyDetected?: (adjacency: Record<string, string[]>) => void;
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
  markets: 'from-sky-300/25 via-cyan-400/10 to-transparent',
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
  region: MapIcon,
  climate: CloudSun,
  religion: Landmark,
  resources: Gem,
  markets: Globe2,
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
  logisticsNodes,
  logisticsEdges,
  logisticsRouteTypes,
  logisticsRouteProvinceIds = [],
  marketCapitals = [],
  selectedResourceId,
  onSelectResource,
  selectedId,
  onToggleLayer,
  onSelectProvince,
  onProvincesDetected,
  onProvinceAdjacencyDetected,
  onContextMenu,
}: MapViewProps) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panZoomRef = useRef<ReturnType<typeof svgPanZoom> | null>(null);
  const onProvincesDetectedRef = useRef(onProvincesDetected);

  useEffect(() => {
    onProvincesDetectedRef.current = onProvincesDetected;
  }, [onProvincesDetected]);

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

    if (!panZoomRef.current) {
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
    }

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

    if (provinceIds.length > 0) {
      onProvincesDetectedRef.current(provinceIds);
    }

    return () => {
      if (panZoomRef.current) {
        panZoomRef.current.destroy();
        panZoomRef.current = null;
      }
    };
  }, [svgMarkup]);

  useEffect(() => {
    if (!svgMarkup || !containerRef.current || !onProvinceAdjacencyDetected) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll('path'));
    if (paths.length <= 1) return;

    const eps = 0.35;
    const entries = paths
      .map((path) => {
        const id = path.getAttribute('data-province');
        if (!id) return null;
        const box = path.getBBox();
        return {
          id,
          minX: box.x,
          maxX: box.x + box.width,
          minY: box.y,
          maxY: box.y + box.height,
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          id: string;
          minX: number;
          maxX: number;
          minY: number;
          maxY: number;
        } => Boolean(entry),
      )
      .sort((a, b) => a.minX - b.minX);

    const adjacencySets = new Map<string, Set<string>>();
    entries.forEach((entry) => adjacencySets.set(entry.id, new Set<string>()));

    for (let i = 0; i < entries.length; i += 1) {
      const a = entries[i];
      for (let j = i + 1; j < entries.length; j += 1) {
        const b = entries[j];
        if (b.minX > a.maxX + eps) break;
        const xOverlap = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
        const yOverlap = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
        if (xOverlap >= -eps && yOverlap >= -eps) {
          adjacencySets.get(a.id)?.add(b.id);
          adjacencySets.get(b.id)?.add(a.id);
        }
      }
    }

    const adjacency: Record<string, string[]> = {};
    adjacencySets.forEach((set, id) => {
      adjacency[id] = Array.from(set);
    });
    onProvinceAdjacencyDetected(adjacency);
  }, [svgMarkup, onProvinceAdjacencyDetected]);

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
      path.classList.toggle(
        'map-path-route',
        logisticsRouteProvinceIds.includes(provinceId),
      );
    });
  }, [
    activeLayerIds,
    layerPaint,
    politicalStripes,
    colonizationTint,
    selectedId,
    logisticsRouteProvinceIds,
  ]);

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

  useEffect(() => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    const overlayId = 'logistics-overlay';
    const viewport =
      (svg.querySelector('.svg-pan-zoom_viewport') as SVGElement | null) ?? svg;

    // Cleanup stale overlay if it exists outside the active viewport host.
    const staleOverlay = svg.querySelector(`#${overlayId}`) as SVGGElement | null;
    if (staleOverlay && staleOverlay.parentElement !== viewport) {
      staleOverlay.remove();
    }

    let overlay = viewport.querySelector(`#${overlayId}`) as SVGGElement | null;
    if (!overlay) {
      overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      overlay.setAttribute('id', overlayId);
      overlay.setAttribute('pointer-events', 'none');
      viewport.appendChild(overlay);
    }
    while (overlay.firstChild) {
      overlay.removeChild(overlay.firstChild);
    }

    const provinceCenters = new Map<string, { x: number; y: number }>();
    Array.from(svg.querySelectorAll('path')).forEach((path) => {
      const provinceId = path.getAttribute('data-province');
      if (!provinceId) return;
      const box = path.getBBox();
      provinceCenters.set(provinceId, {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
      });
    });

    const viewBox = svg.viewBox.baseVal;
    const worldPoint = {
      x:
        viewBox && viewBox.width
          ? viewBox.x + viewBox.width * 0.5
          : Number(svg.getAttribute('width') ?? 1000) * 0.5,
      y:
        viewBox && viewBox.height
          ? viewBox.y + viewBox.height * 0.06
          : Number(svg.getAttribute('height') ?? 600) * 0.06,
    };

    const nodePoint = (node: LogisticsNode) => {
      if (node.type === 'province' && node.provinceId) {
        return provinceCenters.get(node.provinceId);
      }
      if (node.type === 'world_market') {
        return worldPoint;
      }
      if (node.type === 'country_market' && node.countryId) {
        const points = logisticsNodes
          .filter((entry) => entry.type === 'province')
          .map((entry) => {
            const provincePoint = entry.provinceId
              ? provinceCenters.get(entry.provinceId)
              : null;
            return provincePoint && entry.countryId === node.countryId
              ? provincePoint
              : null;
          })
          .filter((entry): entry is { x: number; y: number } => Boolean(entry));
        if (points.length === 0) return undefined;
        const sum = points.reduce(
          (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
          { x: 0, y: 0 },
        );
        return { x: sum.x / points.length, y: sum.y / points.length };
      }
      return undefined;
    };

    const byNodeId = new Map(logisticsNodes.map((node) => [node.id, node]));
    const routeTypeById = new Map(logisticsRouteTypes.map((item) => [item.id, item]));

    logisticsEdges.forEach((edge) => {
      const fromNode = byNodeId.get(edge.fromNodeId);
      const toNode = byNodeId.get(edge.toNodeId);
      if (!fromNode || !toNode) return;
      const from = nodePoint(fromNode);
      const to = nodePoint(toNode);
      if (!from || !to) return;
      const isOpen = edge.active !== false;

      const routeType = edge.routeTypeId
        ? routeTypeById.get(edge.routeTypeId)
        : logisticsRouteTypes[0];
      const color = routeType?.color ?? '#f59e0b';
      const dash = routeType?.dashPattern;
      const width = Math.max(0.8, routeType?.lineWidth ?? 1.2);

      const casing = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      casing.setAttribute('x1', `${from.x}`);
      casing.setAttribute('y1', `${from.y}`);
      casing.setAttribute('x2', `${to.x}`);
      casing.setAttribute('y2', `${to.y}`);
      casing.setAttribute('stroke', 'rgba(8, 15, 30, 0.96)');
      casing.setAttribute('stroke-width', `${width + 1.1}`);
      casing.setAttribute('stroke-linecap', 'round');
      casing.setAttribute('opacity', isOpen ? '0.95' : '0.78');
      overlay?.appendChild(casing);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', `${from.x}`);
      line.setAttribute('y1', `${from.y}`);
      line.setAttribute('x2', `${to.x}`);
      line.setAttribute('y2', `${to.y}`);
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', `${width}`);
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('opacity', isOpen ? '0.9' : '0.45');
      if (dash) {
        line.setAttribute('stroke-dasharray', dash);
      }
      overlay?.appendChild(line);

      const centerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      centerLine.setAttribute('x1', `${from.x}`);
      centerLine.setAttribute('y1', `${from.y}`);
      centerLine.setAttribute('x2', `${to.x}`);
      centerLine.setAttribute('y2', `${to.y}`);
      centerLine.setAttribute('stroke', 'rgba(255,255,255,0.78)');
      centerLine.setAttribute('stroke-width', `${Math.max(0.45, width * 0.34)}`);
      centerLine.setAttribute('stroke-linecap', 'round');
      centerLine.setAttribute('opacity', isOpen ? '0.75' : '0.35');
      if (dash) {
        centerLine.setAttribute('stroke-dasharray', dash);
      }
      overlay?.appendChild(centerLine);

      const drawNode = (x: number, y: number) => {
        const nodeOuter = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'circle',
        );
        nodeOuter.setAttribute('cx', `${x}`);
        nodeOuter.setAttribute('cy', `${y}`);
        nodeOuter.setAttribute('r', `${Math.max(1.4, width * 0.45)}`);
        nodeOuter.setAttribute('fill', 'rgba(8, 15, 30, 0.96)');
        overlay?.appendChild(nodeOuter);

        const nodeInner = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'circle',
        );
        nodeInner.setAttribute('cx', `${x}`);
        nodeInner.setAttribute('cy', `${y}`);
        nodeInner.setAttribute('r', `${Math.max(0.8, width * 0.22)}`);
        nodeInner.setAttribute('fill', isOpen ? '#22c55e' : '#ef4444');
        overlay?.appendChild(nodeInner);
      };
      drawNode(from.x, from.y);
      drawNode(to.x, to.y);
    });

    if (logisticsRouteProvinceIds.length > 1) {
      for (let i = 0; i < logisticsRouteProvinceIds.length - 1; i += 1) {
        const from = provinceCenters.get(logisticsRouteProvinceIds[i]);
        const to = provinceCenters.get(logisticsRouteProvinceIds[i + 1]);
        if (!from || !to) continue;

        const previewCasing = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'line',
        );
        previewCasing.setAttribute('x1', `${from.x}`);
        previewCasing.setAttribute('y1', `${from.y}`);
        previewCasing.setAttribute('x2', `${to.x}`);
        previewCasing.setAttribute('y2', `${to.y}`);
        previewCasing.setAttribute('stroke', 'rgba(8, 15, 30, 0.95)');
        previewCasing.setAttribute('stroke-width', '2');
        previewCasing.setAttribute('stroke-linecap', 'round');
        previewCasing.setAttribute('opacity', '0.95');
        overlay?.appendChild(previewCasing);

        const previewLine = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'line',
        );
        previewLine.setAttribute('x1', `${from.x}`);
        previewLine.setAttribute('y1', `${from.y}`);
        previewLine.setAttribute('x2', `${to.x}`);
        previewLine.setAttribute('y2', `${to.y}`);
        previewLine.setAttribute('stroke', '#22d3ee');
        previewLine.setAttribute('stroke-width', '1.05');
        previewLine.setAttribute('stroke-linecap', 'round');
        previewLine.setAttribute('stroke-dasharray', '5 3');
        previewLine.setAttribute('opacity', '0.95');
        overlay?.appendChild(previewLine);
      }
    }

    const marketsLayerVisible = activeLayerIds.includes('markets');
    if (marketsLayerVisible) {
      marketCapitals.forEach((capital) => {
        const center = provinceCenters.get(capital.provinceId);
        if (!center) return;

        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', `${center.x}`);
        ring.setAttribute('cy', `${center.y}`);
        ring.setAttribute('r', '5.8');
        ring.setAttribute('fill', 'rgba(8, 15, 30, 0.88)');
        ring.setAttribute('stroke', capital.color);
        ring.setAttribute('stroke-width', '1.4');
        overlay?.appendChild(ring);

        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', `${center.x}`);
        dot.setAttribute('cy', `${center.y}`);
        dot.setAttribute('r', '2.2');
        dot.setAttribute('fill', capital.color);
        overlay?.appendChild(dot);

        const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        labelBg.setAttribute('x', `${center.x + 7}`);
        labelBg.setAttribute('y', `${center.y - 12}`);
        labelBg.setAttribute('rx', '2');
        labelBg.setAttribute('ry', '2');
        labelBg.setAttribute('width', `${Math.max(20, capital.marketName.length * 5.4)}`);
        labelBg.setAttribute('height', '10');
        labelBg.setAttribute('fill', 'rgba(8, 15, 30, 0.82)');
        labelBg.setAttribute('stroke', 'rgba(255,255,255,0.12)');
        labelBg.setAttribute('stroke-width', '0.4');
        overlay?.appendChild(labelBg);

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', `${center.x + 10}`);
        label.setAttribute('y', `${center.y - 5}`);
        label.setAttribute('fill', '#dbeafe');
        label.setAttribute('font-size', '4');
        label.setAttribute('font-family', 'Segoe UI, Arial, sans-serif');
        label.textContent = capital.marketName;
        overlay?.appendChild(label);
      });
    }
  }, [
    svgMarkup,
    logisticsNodes,
    logisticsEdges,
    logisticsRouteProvinceIds,
    logisticsRouteTypes,
    activeLayerIds,
    marketCapitals,
  ]);

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

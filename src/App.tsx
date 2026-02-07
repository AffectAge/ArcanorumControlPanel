import { useEffect, useMemo, useState } from 'react';
import TopBar from './components/TopBar';
import LeftToolbar from './components/LeftToolbar';
import InfoPanel from './components/InfoPanel';
import RightQuickButtons from './components/RightQuickButtons';
import BottomDock from './components/BottomDock';
import HotseatPanel from './components/HotseatPanel';
import SaveLoadPanel from './components/SaveLoadPanel';
import MapView from './components/MapView';
import AdminPanel from './components/AdminPanel';
import ColonizationModal from './components/ColonizationModal';
import SettingsModal from './components/SettingsModal';
import ProvinceContextMenu from './components/ProvinceContextMenu';
import EventLogPanel from './components/EventLogPanel';
import {
  EventLogContext,
  createDefaultLog,
  createDefaultFilters,
} from './eventLog';
import type {
  Country,
  GameState,
  SaveGame,
  MapLayer,
  MapLayerPaint,
  ProvinceRecord,
  ProvinceData,
  Trait,
  GameSettings,
  EventLogEntry,
  EventCategory,
  EventLogState,
} from './types';

const STORAGE_KEY = 'civ.saves.v1';
const COLONIZATION_OWN_COLOR = '#a855f7';
const COLONIZATION_OTHER_COLOR = '#38bdf8';

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const normalizeEventLog = (log?: EventLogState): EventLogState => {
  const base = createDefaultFilters();
  const filters =
    log && log.filters ? { ...base, ...log.filters } : createDefaultFilters();
  const entries = Array.isArray(log?.entries) ? log?.entries : [];
  return { entries, filters };
};

const COST_STEP = 100;
const COST_LEVELS = 10;
const MAX_LOG_ENTRIES = 200;
const TRIM_LOG_TO = 50;

const colonizationCostColor = (cost: number) => {
  if (!Number.isFinite(cost)) return 'hsl(145 60% 65%)';
  const level = Math.min(
    COST_LEVELS - 1,
    Math.max(0, Math.floor(cost / COST_STEP)),
  );
  const lightness = 72 - level * 4.5;
  return `hsl(145 60% ${lightness}%)`;
};

const readSaves = (): SaveGame[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SaveGame[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeSaves = (saves: SaveGame[]) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
};

const defaultCultureColors = ['#f97316', '#fb7185', '#a855f7', '#facc15'];
const defaultLandscapeColors = ['#22c55e', '#10b981', '#84cc16', '#14b8a6'];
const defaultClimateColors = ['#38bdf8', '#60a5fa', '#fbbf24', '#f97316'];
const defaultReligionColors = ['#facc15', '#fb7185', '#a855f7', '#60a5fa'];

const initialMapLayers: MapLayer[] = [
  { id: 'political', name: 'Политическая', visible: true },
  { id: 'cultural', name: 'Культурная', visible: false },
  { id: 'landscape', name: 'Ландшафт', visible: false },
  { id: 'climate', name: 'Климат', visible: false },
  { id: 'religion', name: 'Религии', visible: false },
  { id: 'resources', name: 'Ресурсы', visible: false },
  { id: 'colonization', name: 'Колонизация', visible: false },
];

function App() {
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    colonizationPointsPerTurn: 10,
    eventLogRetainTurns: 3,
  });
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | undefined>(
    undefined,
  );
  const [countries, setCountries] = useState<Country[]>([]);
  const [activeCountryId, setActiveCountryId] = useState<string | undefined>(
    undefined,
  );
  const [turn, setTurn] = useState(1);
  const [hotseatOpen, setHotseatOpen] = useState(false);
  const [savePanelOpen, setSavePanelOpen] = useState(false);
  const [savePanelMode, setSavePanelMode] = useState<'save' | 'load'>('save');
  const [saves, setSaves] = useState<SaveGame[]>(() => readSaves());
  const [mapLayers, setMapLayers] = useState<MapLayer[]>(initialMapLayers);
  const [showProvinceStroke, setShowProvinceStroke] = useState(true);
  const [provinces, setProvinces] = useState<ProvinceRecord>({});
  const [eventLog, setEventLog] = useState<EventLogState>(() => createDefaultLog());
  const [eventLogCollapsed, setEventLogCollapsed] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [climates, setClimates] = useState<Trait[]>([
    { id: createId(), name: 'Умеренный', color: '#38bdf8' },
    { id: createId(), name: 'Засушливый', color: '#f59e0b' },
  ]);
  const [religions, setReligions] = useState<Trait[]>([
    { id: createId(), name: 'Солнечный культ', color: '#facc15' },
    { id: createId(), name: 'Лунный культ', color: '#a855f7' },
  ]);
  const [landscapes, setLandscapes] = useState<Trait[]>([
    { id: createId(), name: 'Равнина', color: '#22c55e' },
    { id: createId(), name: 'Горы', color: '#10b981' },
  ]);
  const [cultures, setCultures] = useState<Trait[]>([
    { id: createId(), name: 'Северяне', color: '#fb7185' },
    { id: createId(), name: 'Южане', color: '#f97316' },
  ]);
  const [resources, setResources] = useState<Trait[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    provinceId: string;
  } | null>(null);
  const [colonizationModalOpen, setColonizationModalOpen] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | undefined>(
    undefined,
  );

  const createCountry = (country: Omit<Country, 'id' | 'colonizationPoints'>) => {
    const id = createId();
    const newCountry: Country = { id, colonizationPoints: 100, ...country };
    setCountries((prev) => [...prev, newCountry]);
    if (!activeCountryId) {
      setActiveCountryId(id);
    }
  };

  const updateCountry = (
    id: string,
    update: { name: string; color: string; flagDataUrl?: string; coatDataUrl?: string },
  ) => {
    setCountries((prev) =>
      prev.map((country) =>
        country.id === id
          ? {
              ...country,
              name: update.name,
              color: update.color,
              flagDataUrl: update.flagDataUrl,
              coatDataUrl: update.coatDataUrl,
            }
          : country,
      ),
    );
  };

  const deleteCountry = (id: string) => {
    setCountries((prev) => {
      const next = prev.filter((country) => country.id !== id);
      setActiveCountryId((current) =>
        current === id ? next[0]?.id : current,
      );
      return next;
    });

    setProvinces((prev) => {
      const next: ProvinceRecord = { ...prev };
      Object.values(next).forEach((province) => {
        if (province.ownerCountryId === id) {
          province.ownerCountryId = undefined;
        }
        if (province.colonizationProgress && id in province.colonizationProgress) {
          const progress = { ...province.colonizationProgress };
          delete progress[id];
          province.colonizationProgress = progress;
        }
      });
      return next;
    });
  };

  const selectCountry = (id: string) => {
    setActiveCountryId(id);
  };

  const pruneLogEntries = (
    entries: EventLogEntry[],
    currentTurn: number,
    retainTurns: number,
  ) => {
    const limit = Math.max(1, Math.floor(retainTurns));
    const cutoff = currentTurn - (limit - 1);
    return entries.filter((entry) => entry.turn >= cutoff);
  };

  const addEvent = (payload: {
    category: EventCategory;
    message: string;
    title?: string;
    countryId?: string;
  }) => {
    const entry: EventLogEntry = {
      id: createId(),
      turn,
      timestamp: new Date().toISOString(),
      category: payload.category,
      title: payload.title,
      message: payload.message,
      countryId: payload.countryId,
    };
    setEventLog((prev) => {
      const retainTurns = gameSettings.eventLogRetainTurns ?? 3;
      const pruned = pruneLogEntries(prev.entries, turn, retainTurns);
      return {
        ...prev,
        entries: [entry, ...pruned].slice(0, MAX_LOG_ENTRIES),
      };
    });
  };

  const setEventFilters = (filters: EventLogState['filters']) => {
    setEventLog((prev) => ({ ...prev, filters }));
  };

  const clearEventLog = () => {
    setEventLog((prev) => ({ ...prev, entries: [] }));
  };

  const trimEventLog = () => {
    setEventLog((prev) => ({
      ...prev,
      entries: prev.entries.slice(0, TRIM_LOG_TO),
    }));
  };

  const applyColonizationTurn = (countryId: string) => {
    const country = countries.find((c) => c.id === countryId);
    if (!country || country.colonizationPoints <= 0) return;

    const activeProvinceIds = Object.values(provinces)
      .filter(
        (province) =>
          !province.ownerCountryId &&
          !province.colonizationDisabled &&
          province.colonizationProgress &&
          countryId in province.colonizationProgress,
      )
      .map((province) => province.id);

    if (activeProvinceIds.length === 0) return;

    const share = country.colonizationPoints / activeProvinceIds.length;

    setProvinces((prev) => {
      const next: ProvinceRecord = { ...prev };
      activeProvinceIds.forEach((provinceId) => {
        const province = next[provinceId];
        if (!province || province.ownerCountryId) return;
        const progress = { ...(province.colonizationProgress ?? {}) };
        const current = progress[countryId] ?? 0;
        const updated = current + share;
        const cost = province.colonizationCost ?? 100;
        progress[countryId] = updated;

        if (updated >= cost) {
          province.ownerCountryId = countryId;
          province.colonizationProgress = {};
          addEvent({
            category: 'colonization',
            message: `${country.name} завершила колонизацию провинции ${provinceId}.`,
            countryId,
          });
        } else {
          province.colonizationProgress = progress;
        }
      });
      return next;
    });

    setCountries((prev) =>
      prev.map((c) =>
        c.id === countryId ? { ...c, colonizationPoints: 0 } : c,
      ),
    );
  };

  const endTurn = () => {
    if (countries.length === 0) return;
    const currentIndex = countries.findIndex(
      (country) => country.id === activeCountryId,
    );
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = safeIndex + 1;
    const wraps = nextIndex >= countries.length;
    const nextId = wraps ? countries[0]?.id : countries[nextIndex].id;
    if (wraps) {
      setTurn((prev) => prev + 1);
      addEvent({
        category: 'system',
        message: `Начался глобальный ход ${turn + 1}`,
      });
      countries.forEach((country) => {
        applyColonizationTurn(country.id);
      });
    }
    setActiveCountryId(nextId);
    if (wraps) {
      const gain = Math.max(0, gameSettings.colonizationPointsPerTurn ?? 0);
      if (gain > 0) {
        setCountries((prev) =>
          prev.map((country) =>
            ({
              ...country,
              colonizationPoints: (country.colonizationPoints ?? 0) + gain,
            }),
          ),
        );
      }
    }
  };

  const gameState: GameState = useMemo(
    () => ({
      turn,
      activeCountryId,
      countries,
      mapLayers,
      selectedProvinceId,
      provinces,
      climates,
      religions,
      landscapes,
      cultures,
      resources,
      settings: gameSettings,
      eventLog,
    }),
    [
      turn,
      activeCountryId,
      countries,
      mapLayers,
      selectedProvinceId,
      provinces,
      climates,
      religions,
      landscapes,
      cultures,
      resources,
      gameSettings,
      eventLog,
    ],
  );

  const persistSaves = (next: SaveGame[]) => {
    setSaves(next);
    writeSaves(next);
  };

  const createSave = (name: string, overwriteId?: string) => {
    const now = new Date().toISOString();
    if (overwriteId) {
      const next = saves.map((save) =>
        save.id === overwriteId
          ? {
              ...save,
              name: name || save.name,
              updatedAt: now,
              data: gameState,
            }
          : save,
      );
      persistSaves(next);
      return;
    }
    const newSave: SaveGame = {
      id: createId(),
      name,
      createdAt: now,
      updatedAt: now,
      data: gameState,
      version: 1,
    };
    persistSaves([newSave, ...saves]);
  };

  const loadSave = (id: string) => {
    const save = saves.find((entry) => entry.id === id);
    if (!save) return;
    setTurn(save.data.turn);
    setCountries(
      save.data.countries.map((country) => ({
        ...country,
        colonizationPoints: country.colonizationPoints ?? 100,
      })),
    );
    setActiveCountryId(
      save.data.activeCountryId ?? save.data.countries[0]?.id ?? undefined,
    );
    setMapLayers(save.data.mapLayers ?? initialMapLayers);
    setSelectedProvinceId(save.data.selectedProvinceId);
    setProvinces(save.data.provinces ?? {});
    setClimates(save.data.climates ?? climates);
    setReligions(save.data.religions ?? religions);
    setLandscapes(save.data.landscapes ?? landscapes);
    setCultures(save.data.cultures ?? cultures);
    setResources(save.data.resources ?? resources);
    setGameSettings(
      save.data.settings ?? {
        colonizationPointsPerTurn: 10,
        eventLogRetainTurns: 3,
      },
    );
    setEventLog(normalizeEventLog(save.data.eventLog));
    setSavePanelOpen(false);
  };

  const deleteSave = (id: string) => {
    persistSaves(saves.filter((entry) => entry.id !== id));
  };

  const exportSave = (id?: string) => {
    const payload = id ? saves.find((entry) => entry.id === id) : saves;
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const fileName = id ? `save-${id}.json` : 'civ-saves.json';
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const importSave = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;

    const normalizeSave = (entry: any): SaveGame | null => {
      if (!entry || typeof entry !== 'object') return null;
      if (!entry.data || typeof entry.data !== 'object') return null;
      if (!Array.isArray(entry.data.countries)) return null;
      if (typeof entry.data.turn !== 'number') return null;
      const now = new Date().toISOString();
      return {
        id: typeof entry.id === 'string' ? entry.id : createId(),
        name: typeof entry.name === 'string' ? entry.name : 'Импорт',
        createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : now,
        updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : now,
        data: entry.data,
        version: 1,
      };
    };

    let incoming: SaveGame[] = [];

    if (Array.isArray(parsed)) {
      incoming = parsed.map(normalizeSave).filter(Boolean) as SaveGame[];
    } else if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      const normalized = normalizeSave(parsed);
      if (normalized) incoming = [normalized];
    } else if (parsed && typeof parsed === 'object' && 'saves' in parsed) {
      const saveList = (parsed as { saves?: unknown }).saves;
      if (Array.isArray(saveList)) {
        incoming = saveList.map(normalizeSave).filter(Boolean) as SaveGame[];
      }
    }

    if (incoming.length === 0) {
      throw new Error('Файл не содержит корректных сохранений.');
    }

    const existingIds = new Set(saves.map((save) => save.id));
    const merged = [
      ...incoming.map((entry) =>
        existingIds.has(entry.id) ? { ...entry, id: createId() } : entry,
      ),
      ...saves,
    ];
    persistSaves(merged);
  };

  const newGame = () => {
    setTurn(1);
    setCountries([]);
    setActiveCountryId(undefined);
    setMapLayers(initialMapLayers);
    setSelectedProvinceId(undefined);
    setProvinces({});
    setClimates([
      { id: createId(), name: 'Умеренный', color: '#38bdf8' },
      { id: createId(), name: 'Засушливый', color: '#f59e0b' },
    ]);
    setReligions([
      { id: createId(), name: 'Солнечный культ', color: '#facc15' },
      { id: createId(), name: 'Лунный культ', color: '#a855f7' },
    ]);
    setLandscapes([
      { id: createId(), name: 'Равнина', color: '#22c55e' },
      { id: createId(), name: 'Горы', color: '#10b981' },
    ]);
    setCultures([
      { id: createId(), name: 'Северяне', color: '#fb7185' },
      { id: createId(), name: 'Южане', color: '#f97316' },
    ]);
    setResources([]);
    setGameSettings({ colonizationPointsPerTurn: 10, eventLogRetainTurns: 3 });
    setEventLog(createDefaultLog());
    setHotseatOpen(false);
  };

  const ensureProvinces = (ids: string[]) => {
    setProvinces((prev) => {
      let changed = false;
      const next: ProvinceRecord = { ...prev };
      ids.forEach((id, index) => {
        if (!next[id]) {
          const cultureColor =
            defaultCultureColors[index % defaultCultureColors.length];
          const landscapeColor =
            defaultLandscapeColors[index % defaultLandscapeColors.length];
          const climateColor =
            defaultClimateColors[index % defaultClimateColors.length];
          const religionColor =
            defaultReligionColors[index % defaultReligionColors.length];
          next[id] = {
            id,
            cultureId: cultures.find((c) => c.color === cultureColor)?.id,
            landscapeId: landscapes.find((l) => l.color === landscapeColor)?.id,
            climateId: climates.find((c) => c.color === climateColor)?.id,
            religionId: religions.find((r) => r.color === religionColor)?.id,
            resourceAmounts: {},
            colonizationCost: 100,
            colonizationProgress: {},
            colonizationDisabled: false,
          };
          changed = true;
          return;
        }

        const existing = next[id];
        if (!existing) return;
        let updated = false;
        if (existing.colonizationCost == null) {
          existing.colonizationCost = 100;
          updated = true;
        }
        if (!existing.colonizationProgress) {
          existing.colonizationProgress = {};
          updated = true;
        }
        if (existing.colonizationDisabled == null) {
          existing.colonizationDisabled = false;
          updated = true;
        }
        if (!existing.resourceAmounts) {
          if ((existing as any).resourceIds) {
            const ids = (existing as any).resourceIds as string[];
            existing.resourceAmounts = Object.fromEntries(ids.map((id) => [id, 1]));
          } else {
            existing.resourceAmounts = {};
          }
          updated = true;
        }
        if (updated) changed = true;
      });
      return changed ? next : prev;
    });
  };

  const layerPaint: MapLayerPaint = useMemo(() => {
    const paint: MapLayerPaint = {};
    mapLayers.forEach((layer) => {
      paint[layer.id] = {};
    });

    Object.values(provinces).forEach((province) => {
      if (province.ownerCountryId) {
        const owner = countries.find((c) => c.id === province.ownerCountryId);
        if (owner) {
          paint.political ??= {};
          paint.political[province.id] = owner.color;
        }
      }
      if (province.cultureId) {
        const culture = cultures.find((c) => c.id === province.cultureId);
        if (culture) {
          paint.cultural ??= {};
          paint.cultural[province.id] = culture.color;
        }
      }
      if (province.landscapeId) {
        const landscape = landscapes.find((l) => l.id === province.landscapeId);
        if (landscape) {
          paint.landscape ??= {};
          paint.landscape[province.id] = landscape.color;
        }
      }
      if (province.climateId) {
        const climate = climates.find((c) => c.id === province.climateId);
        if (climate) {
          paint.climate ??= {};
          paint.climate[province.id] = climate.color;
        }
      }
      if (province.religionId) {
        const religion = religions.find((r) => r.id === province.religionId);
        if (religion) {
          paint.religion ??= {};
          paint.religion[province.id] = religion.color;
        }
      }
      if (selectedResourceId) {
        const amount = province.resourceAmounts?.[selectedResourceId] ?? 0;
        if (amount > 0) {
          const resource = resources.find((r) => r.id === selectedResourceId);
          if (resource) {
            paint.resources ??= {};
            paint.resources[province.id] = resource.color;
          }
        }
      }
    });

    return paint;
  }, [
    countries,
    mapLayers,
    provinces,
    climates,
    religions,
    landscapes,
    cultures,
    resources,
    selectedResourceId,
  ]);

  const politicalStripes = useMemo(() => {
    const stripes: Record<string, string> = {};
    Object.values(provinces).forEach((province) => {
      if (province.ownerCountryId) return;
      const progress = province.colonizationProgress;
      if (!progress || Object.keys(progress).length === 0) return;
      let leaderId: string | null = null;
      let best = -Infinity;
      Object.entries(progress).forEach(([countryId, points]) => {
        if (points > best) {
          best = points;
          leaderId = countryId;
        }
      });
      if (!leaderId) return;
      const leader = countries.find((c) => c.id === leaderId);
      if (leader) {
        stripes[province.id] = leader.color;
      }
    });
    return stripes;
  }, [provinces, countries]);

  const colonizationTint = useMemo(() => {
    const tint: Record<string, string> = {};
    Object.values(provinces).forEach((province) => {
      const id = province.id;
      const ownerId = province.ownerCountryId;
      const progress = province.colonizationProgress ?? {};
      const hasOurProgress = activeCountryId
        ? activeCountryId in progress
        : false;
      const hasOtherProgress = Object.keys(progress).some(
        (countryId) => countryId !== activeCountryId,
      );

      if (ownerId) {
        tint[id] =
          ownerId === activeCountryId
            ? COLONIZATION_OWN_COLOR
            : COLONIZATION_OTHER_COLOR;
        return;
      }

      if (province.colonizationDisabled) {
        tint[id] = '#f87171';
        return;
      }

      if (hasOurProgress) {
        tint[id] = `stripe:${COLONIZATION_OWN_COLOR}`;
        return;
      }

      if (hasOtherProgress) {
        tint[id] = `stripe:${COLONIZATION_OTHER_COLOR}`;
        return;
      }

      tint[id] = colonizationCostColor(province.colonizationCost ?? 100);
    });

    return tint;
  }, [provinces, activeCountryId]);

  const layerLegends = useMemo(() => {
    const legends: Record<string, { label: string; color: string }[]> = {};
    const colonizationLegend = Array.from({ length: COST_LEVELS }, (_, index) => {
      const from = index * COST_STEP;
      const to = from + COST_STEP - 1;
      return {
        label: `${from}-${to}`,
        color: colonizationCostColor(from),
      };
    });
    legends.colonization = [
      ...colonizationLegend,
      { label: 'Запрещено к колонизации', color: '#f87171' },
      { label: 'Наши провинции', color: COLONIZATION_OWN_COLOR },
      { label: 'Наши колонии', color: COLONIZATION_OWN_COLOR },
      { label: 'Чужие провинции', color: COLONIZATION_OTHER_COLOR },
      { label: 'Чужие колонии', color: COLONIZATION_OTHER_COLOR },
    ];
    legends.climate = climates.map((item) => ({
      label: item.name,
      color: item.color,
    }));
    legends.religion = religions.map((item) => ({
      label: item.name,
      color: item.color,
    }));
    legends.landscape = landscapes.map((item) => ({
      label: item.name,
      color: item.color,
    }));
    legends.cultural = cultures.map((item) => ({
      label: item.name,
      color: item.color,
    }));
    const selectedResource = resources.find((r) => r.id === selectedResourceId);
    legends.resources = selectedResource
      ? [{ label: selectedResource.name, color: selectedResource.color }]
      : [];
    legends.political = countries.slice(0, 5).map((item) => ({
      label: item.name,
      color: item.color,
    }));
    if (countries.length > 5) {
      legends.political.push({ label: 'Другие страны', color: '#94a3b8' });
    }
    return legends;
  }, [climates, religions, landscapes, cultures, resources, selectedResourceId, countries]);

  const selectedProvince = selectedProvinceId
    ? provinces[selectedProvinceId]
    : undefined;

  const toggleLayer = (id: string) => {
    setMapLayers((prev) => {
      const next = prev.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer,
      );
      if (id === 'resources') {
        const resourcesLayer = next.find((layer) => layer.id === id);
        if (resourcesLayer?.visible && !selectedResourceId && resources.length > 0) {
          setSelectedResourceId(resources[0]?.id);
        }
      }
      return next;
    });
  };

  const assignOwner = (provinceId: string, ownerId?: string) => {
    setProvinces((prev) => ({
      ...prev,
      [provinceId]: {
        ...(prev[provinceId] as ProvinceData),
        id: provinceId,
        ownerCountryId: ownerId,
        colonizationProgress: ownerId ? {} : prev[provinceId]?.colonizationProgress,
      },
    }));
  };

  const assignClimate = (provinceId: string, climateId?: string) => {
    setProvinces((prev) => ({
      ...prev,
      [provinceId]: {
        ...(prev[provinceId] as ProvinceData),
        id: provinceId,
        climateId,
      },
    }));
  };

  const assignReligion = (provinceId: string, religionId?: string) => {
    setProvinces((prev) => ({
      ...prev,
      [provinceId]: {
        ...(prev[provinceId] as ProvinceData),
        id: provinceId,
        religionId,
      },
    }));
  };

  const assignLandscape = (provinceId: string, landscapeId?: string) => {
    setProvinces((prev) => ({
      ...prev,
      [provinceId]: {
        ...(prev[provinceId] as ProvinceData),
        id: provinceId,
        landscapeId,
      },
    }));
  };

  const assignCulture = (provinceId: string, cultureId?: string) => {
    setProvinces((prev) => ({
      ...prev,
      [provinceId]: {
        ...(prev[provinceId] as ProvinceData),
        id: provinceId,
        cultureId,
      },
    }));
  };

  const setColonizationCost = (provinceId: string, cost: number) => {
    setProvinces((prev) => ({
      ...prev,
      [provinceId]: {
        ...(prev[provinceId] as ProvinceData),
        id: provinceId,
        colonizationCost: cost,
      },
    }));
  };

  const setColonizationDisabled = (provinceId: string, disabled: boolean) => {
    setProvinces((prev) => ({
      ...prev,
      [provinceId]: {
        ...(prev[provinceId] as ProvinceData),
        id: provinceId,
        colonizationDisabled: disabled,
        colonizationProgress: disabled
          ? {}
          : prev[provinceId]?.colonizationProgress,
      },
    }));
  };

  const startColonization = (provinceId: string, countryId: string) => {
    const country = countries.find((c) => c.id === countryId);
    setProvinces((prev) => {
      const province = prev[provinceId];
      if (!province || province.ownerCountryId || province.colonizationDisabled) {
        return prev;
      }
      const progress = { ...(province.colonizationProgress ?? {}) };
      if (!(countryId in progress)) {
        progress[countryId] = 0;
        addEvent({
          category: 'colonization',
          message: `${country?.name ?? 'Страна'} начала колонизацию провинции ${provinceId}.`,
          countryId,
        });
      }
      return {
        ...prev,
        [provinceId]: {
          ...province,
          colonizationProgress: progress,
        },
      };
    });
  };

  const cancelColonization = (provinceId: string, countryId: string) => {
    const country = countries.find((c) => c.id === countryId);
    setProvinces((prev) => {
      const province = prev[provinceId];
      if (!province || !province.colonizationProgress) return prev;
      const progress = { ...province.colonizationProgress };
      if (!(countryId in progress)) return prev;
      delete progress[countryId];
      addEvent({
        category: 'colonization',
        message: `${country?.name ?? 'Страна'} отменила колонизацию провинции ${provinceId}.`,
        countryId,
      });
      return {
        ...prev,
        [provinceId]: {
          ...province,
          colonizationProgress: progress,
        },
      };
    });
  };

  const addClimate = (name: string, color: string) => {
    setClimates((prev) => [...prev, { id: createId(), name, color }]);
  };

  const addReligion = (name: string, color: string, iconDataUrl?: string) => {
    setReligions((prev) => [...prev, { id: createId(), name, color, iconDataUrl }]);
  };

  const addLandscape = (name: string, color: string) => {
    setLandscapes((prev) => [...prev, { id: createId(), name, color }]);
  };

  const addCulture = (name: string, color: string, iconDataUrl?: string) => {
    setCultures((prev) => [...prev, { id: createId(), name, color, iconDataUrl }]);
  };

  const addResource = (name: string, color: string, iconDataUrl?: string) => {
    setResources((prev) => [...prev, { id: createId(), name, color, iconDataUrl }]);
  };

  const updateReligionIcon = (id: string, iconDataUrl?: string) => {
    setReligions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, iconDataUrl } : item)),
    );
  };

  const updateCultureIcon = (id: string, iconDataUrl?: string) => {
    setCultures((prev) =>
      prev.map((item) => (item.id === id ? { ...item, iconDataUrl } : item)),
    );
  };

  const updateResourceIcon = (id: string, iconDataUrl?: string) => {
    setResources((prev) =>
      prev.map((item) => (item.id === id ? { ...item, iconDataUrl } : item)),
    );
  };

  const deleteClimate = (id: string) => {
    setClimates((prev) => prev.filter((c) => c.id !== id));
    setProvinces((prev) => {
      const next: ProvinceRecord = { ...prev };
      Object.values(next).forEach((province) => {
        if (province.climateId === id) {
          province.climateId = undefined;
        }
      });
      return next;
    });
  };

  const deleteReligion = (id: string) => {
    setReligions((prev) => prev.filter((r) => r.id !== id));
    setProvinces((prev) => {
      const next: ProvinceRecord = { ...prev };
      Object.values(next).forEach((province) => {
        if (province.religionId === id) {
          province.religionId = undefined;
        }
      });
      return next;
    });
  };

  const deleteLandscape = (id: string) => {
    setLandscapes((prev) => prev.filter((l) => l.id !== id));
    setProvinces((prev) => {
      const next: ProvinceRecord = { ...prev };
      Object.values(next).forEach((province) => {
        if (province.landscapeId === id) {
          province.landscapeId = undefined;
        }
      });
      return next;
    });
  };

  const deleteCulture = (id: string) => {
    setCultures((prev) => prev.filter((c) => c.id !== id));
    setProvinces((prev) => {
      const next: ProvinceRecord = { ...prev };
      Object.values(next).forEach((province) => {
        if (province.cultureId === id) {
          province.cultureId = undefined;
        }
      });
      return next;
    });
  };

  const deleteResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    setProvinces((prev) => {
      const next: ProvinceRecord = { ...prev };
      Object.values(next).forEach((province) => {
        if (province.resourceAmounts && id in province.resourceAmounts) {
          const nextAmounts = { ...province.resourceAmounts };
          delete nextAmounts[id];
          province.resourceAmounts = nextAmounts;
        }
      });
      return next;
    });
  };

  const setProvinceResourceAmount = (
    provinceId: string,
    resourceId: string,
    amount: number,
  ) => {
    setProvinces((prev) => {
      const province = prev[provinceId];
      if (!province) return prev;
      const resourceAmounts = { ...(province.resourceAmounts ?? {}) };
      if (amount > 0) {
        resourceAmounts[resourceId] = amount;
      } else {
        if (resourceId in resourceAmounts) delete resourceAmounts[resourceId];
      }
      return {
        ...prev,
        [provinceId]: {
          ...province,
          resourceAmounts,
        },
      };
    });
  };

  useEffect(() => {
    if (resources.length === 0) {
      setSelectedResourceId(undefined);
      return;
    }
    if (selectedResourceId && resources.some((r) => r.id === selectedResourceId)) {
      return;
    }
    setSelectedResourceId(resources[0]?.id);
  }, [resources, selectedResourceId]);

  useEffect(() => {
    const retainTurns = gameSettings.eventLogRetainTurns ?? 3;
    setEventLog((prev) => ({
      ...prev,
      entries: pruneLogEntries(prev.entries, turn, retainTurns),
    }));
  }, [turn, gameSettings.eventLogRetainTurns]);

  const eventLogValue = useMemo(
    () => ({
      log: eventLog,
      addEvent,
      setFilters: setEventFilters,
      clearLog: clearEventLog,
      trimOld: trimEventLog,
      toggleCollapsed: () => setEventLogCollapsed((prev) => !prev),
      collapsed: eventLogCollapsed,
    }),
    [
      eventLog,
      addEvent,
      setEventFilters,
      clearEventLog,
      trimEventLog,
      eventLogCollapsed,
    ],
  );

  return (
    <EventLogContext.Provider value={eventLogValue}>
      <div className="relative w-full h-screen bg-gradient-to-br from-[#0a0f18] via-[#0d1420] to-[#0a0f18] overflow-hidden">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-emerald-900/5 via-transparent to-transparent"
      />

      <div
        id="mapHost"
        className="absolute left-0 right-0 top-20 bottom-24 bg-[#0a0f18]"
      >
        <MapView
          layers={mapLayers}
          layerPaint={layerPaint}
          politicalStripes={politicalStripes}
          colonizationTint={colonizationTint}
          layerLegends={layerLegends}
          resources={resources}
          selectedResourceId={selectedResourceId}
          onSelectResource={setSelectedResourceId}
          selectedId={selectedProvinceId}
          onToggleLayer={toggleLayer}
          onProvincesDetected={ensureProvinces}
          onSelectProvince={(id) => {
            setSelectedProvinceId(id);
            setInfoPanelOpen(true);
          }}
          onContextMenu={(id, x, y) => {
            setSelectedProvinceId(id);
            setContextMenu({ x, y, provinceId: id });
          }}
        />
      </div>

      <TopBar
        turn={turn}
        countries={countries}
        activeCountryId={activeCountryId}
        colonizationGainPerTurn={gameSettings.colonizationPointsPerTurn}
        onSelectCountry={selectCountry}
        onEndTurn={endTurn}
        onOpenHotseat={() => setHotseatOpen(true)}
        onNewGame={newGame}
        onOpenSave={() => {
          setSavePanelMode('save');
          setSavePanelOpen(true);
        }}
        onOpenLoad={() => {
          setSavePanelMode('load');
          setSavePanelOpen(true);
        }}
        onOpenAdmin={() => setAdminOpen(true)}
      />
      <LeftToolbar />

      {infoPanelOpen && (
        <InfoPanel
          province={selectedProvinceId ?? '-'}
          owner={
            selectedProvinceId
              ? countries.find(
                  (country) =>
                    country.id === provinces[selectedProvinceId]?.ownerCountryId,
                )?.name
              : undefined
          }
          climate={
            selectedProvinceId
              ? climates.find((c) => c.id === provinces[selectedProvinceId]?.climateId)
                  ?.name
              : undefined
          }
          culture={
            selectedProvinceId
              ? cultures.find((c) => c.id === provinces[selectedProvinceId]?.cultureId)
                  ?.name
              : undefined
          }
          landscape={
            selectedProvinceId
              ? landscapes.find((l) => l.id === provinces[selectedProvinceId]?.landscapeId)
                  ?.name
              : undefined
          }
          religion={
            selectedProvinceId
              ? religions.find((r) => r.id === provinces[selectedProvinceId]?.religionId)
                  ?.name
              : undefined
          }
          resources={
            selectedProvinceId
              ? Object.entries(provinces[selectedProvinceId]?.resourceAmounts ?? {})
                  .filter(([, amount]) => amount > 0)
                  .map(([resourceId, amount]) => {
                    const resource = resources.find((item) => item.id === resourceId);
                    return resource ? { name: resource.name, amount } : null;
                  })
                  .filter(Boolean)
              : []
          }
          colonizationAllowed={
            selectedProvinceId
              ? !provinces[selectedProvinceId]?.ownerCountryId &&
                !provinces[selectedProvinceId]?.colonizationDisabled
              : false
          }
          onClose={() => setInfoPanelOpen(false)}
          colonizationCost={
            selectedProvinceId
              ? provinces[selectedProvinceId]?.colonizationCost
              : undefined
          }
        />
      )}

      <RightQuickButtons />
      <BottomDock onOpenSettings={() => setSettingsOpen(true)} />
      <EventLogPanel />

      <ProvinceContextMenu
        open={Boolean(contextMenu)}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        onClose={() => setContextMenu(null)}
        onColonize={() => {
          if (contextMenu?.provinceId) {
            setSelectedProvinceId(contextMenu.provinceId);
            setColonizationModalOpen(true);
          }
        }}
        onEditProvince={() => {
          if (contextMenu?.provinceId) {
            setSelectedProvinceId(contextMenu.provinceId);
            setAdminOpen(true);
          }
        }}
      />

      <HotseatPanel
        open={hotseatOpen}
        countries={countries}
        activeCountryId={activeCountryId}
        onClose={() => setHotseatOpen(false)}
        onSelectCountry={(id) => {
          selectCountry(id);
        }}
        onCreateCountry={(country) => {
          createCountry(country);
          setHotseatOpen(false);
        }}
        onUpdateCountry={updateCountry}
        onDeleteCountry={deleteCountry}
      />

      <SaveLoadPanel
        open={savePanelOpen}
        mode={savePanelMode}
        saves={saves}
        onClose={() => setSavePanelOpen(false)}
        onCreateSave={createSave}
        onLoadSave={loadSave}
        onDeleteSave={deleteSave}
        onExportSave={exportSave}
        onImportSave={importSave}
      />

      <ColonizationModal
        open={colonizationModalOpen}
        provinceId={selectedProvinceId}
        province={selectedProvince}
        countries={countries}
        activeCountryId={activeCountryId}
        onClose={() => setColonizationModalOpen(false)}
        onStart={() => {
          if (selectedProvinceId && activeCountryId) {
            startColonization(selectedProvinceId, activeCountryId);
          }
        }}
        onCancel={() => {
          if (selectedProvinceId && activeCountryId) {
            cancelColonization(selectedProvinceId, activeCountryId);
          }
        }}
      />

      <SettingsModal
        open={settingsOpen}
        settings={gameSettings}
        onChange={setGameSettings}
        onClose={() => setSettingsOpen(false)}
      />

      <AdminPanel
        open={adminOpen}
        selectedProvinceId={selectedProvinceId}
        provinces={provinces}
        countries={countries}
        climates={climates}
        religions={religions}
        landscapes={landscapes}
        cultures={cultures}
        resources={resources}
        onClose={() => setAdminOpen(false)}
        onAssignOwner={assignOwner}
        onAssignClimate={assignClimate}
        onAssignReligion={assignReligion}
        onAssignLandscape={assignLandscape}
        onAssignCulture={assignCulture}
        onSetProvinceResourceAmount={setProvinceResourceAmount}
        onSetColonizationCost={setColonizationCost}
        onSetColonizationDisabled={setColonizationDisabled}
        onAddClimate={addClimate}
        onAddReligion={addReligion}
        onAddLandscape={addLandscape}
        onAddCulture={addCulture}
        onAddResource={addResource}
        onUpdateReligionIcon={updateReligionIcon}
        onUpdateCultureIcon={updateCultureIcon}
        onUpdateResourceIcon={updateResourceIcon}
        onDeleteClimate={deleteClimate}
        onDeleteReligion={deleteReligion}
        onDeleteLandscape={deleteLandscape}
        onDeleteCulture={deleteCulture}
        onDeleteResource={deleteResource}
      />
    </div>
    </EventLogContext.Provider>
  );
}

export default App;

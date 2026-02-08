import { useEffect, useMemo, useState } from 'react';
import { Handshake } from 'lucide-react';
import TopBar from './components/TopBar';
import LeftToolbar from './components/LeftToolbar';
import InfoPanel from './components/InfoPanel';
import BottomDock from './components/BottomDock';
import HotseatPanel from './components/HotseatPanel';
import SaveLoadPanel from './components/SaveLoadPanel';
import MapView from './components/MapView';
import AdminPanel from './components/AdminPanel';
import ColonizationModal from './components/ColonizationModal';
import ConstructionModal from './components/ConstructionModal';
import SettingsModal from './components/SettingsModal';
import ProvinceContextMenu from './components/ProvinceContextMenu';
import EventLogPanel from './components/EventLogPanel';
import IndustryModal from './components/IndustryModal';
import DiplomacyModal from './components/DiplomacyModal';
import DiplomacyProposalsModal from './components/DiplomacyProposalsModal';
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
  BuildingDefinition,
  Industry,
  Company,
  BuildingOwner,
  TraitCriteria,
  RequirementNode,
  DiplomacyAgreement,
  DiplomacyProposal,
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

const radiationColor = (value: number) => {
  const t = clamp01(value / 100);
  const hue = 120 - 120 * t;
  return `hsl(${hue} 70% 55%)`;
};

const pollutionColor = (value: number) => {
  const t = clamp01(value / 100);
  const hue = 190 - 140 * t;
  return `hsl(${hue} 60% ${65 - t * 25}%)`;
};

const normalizeProvinceRecord = (record: ProvinceRecord): ProvinceRecord => {
  const next: ProvinceRecord = { ...record };
  Object.values(next).forEach((province) => {
    if (!province) return;
    if (!province.buildingsBuilt) {
      province.buildingsBuilt = [];
    } else if (Array.isArray(province.buildingsBuilt)) {
      const first = province.buildingsBuilt[0] as any;
      if (first && typeof first === 'object' && 'buildingId' in first) {
        // already in new format
      } else {
        const converted: { buildingId: string; owner: BuildingOwner }[] = [];
        (province.buildingsBuilt as unknown as string[]).forEach((id) => {
          converted.push({
            buildingId: id,
            owner: {
              type: 'state',
              countryId: province.ownerCountryId ?? 'state',
            },
          });
        });
        province.buildingsBuilt = converted;
      }
    } else {
      const converted: { buildingId: string; owner: BuildingOwner }[] = [];
      Object.entries(province.buildingsBuilt as unknown as Record<string, number>)
        .forEach(([id, count]) => {
          const safe = Math.max(0, Math.floor(count ?? 0));
          for (let i = 0; i < safe; i += 1) {
            converted.push({
              buildingId: id,
              owner: {
                type: 'state',
                countryId: province.ownerCountryId ?? 'state',
              },
            });
          }
        });
      province.buildingsBuilt = converted;
    }
    if (province.radiation == null) {
      province.radiation = 0;
    }
    if (province.pollution == null) {
      province.pollution = 0;
    }

    if (!province.constructionProgress) {
      province.constructionProgress = {};
    } else {
      const converted: Record<string, { progress: number; owner: BuildingOwner }[]> = {};
      Object.entries(province.constructionProgress).forEach(
        ([buildingId, value]) => {
          if (Array.isArray(value)) {
            const first = value[0] as any;
            if (first && typeof first === 'object' && 'progress' in first) {
              converted[buildingId] = value as any;
            } else {
              converted[buildingId] = (value as number[]).map((progress) => ({
                progress,
                owner: {
                  type: 'state',
                  countryId: province.ownerCountryId ?? 'state',
                },
              }));
            }
          } else if (typeof value === 'number') {
            converted[buildingId] = [
              {
                progress: value,
                owner: {
                  type: 'state',
                  countryId: province.ownerCountryId ?? 'state',
                },
              },
            ];
          }
        },
      );
      province.constructionProgress = converted;
    }
  });
  return next;
};

  const normalizeEventLog = (log?: EventLogState): EventLogState => {
    const base = createDefaultFilters();
    const filters =
      log && log.filters ? { ...base, ...log.filters } : createDefaultFilters();
    const rawEntries = Array.isArray(log?.entries) ? log?.entries : [];
    const entries = rawEntries.map((entry) => ({
      ...entry,
      priority: entry.priority ?? 'medium',
      visibility: entry.visibility ?? 'public',
    }));
    return {
      entries,
      filters,
      sortByPriority: log?.sortByPriority ?? false,
      countryScope: log?.countryScope ?? 'all',
    };
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
  { id: 'radiation', name: 'Радиация', visible: false },
  { id: 'pollution', name: 'Загрязнения', visible: false },
  { id: 'colonization', name: 'Колонизация', visible: false },
];

function App() {
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    colonizationPointsPerTurn: 10,
    constructionPointsPerTurn: 10,
    demolitionCostPercent: 20,
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
  const [industryOpen, setIndustryOpen] = useState(false);
  const [diplomacyOpen, setDiplomacyOpen] = useState(false);
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
  const [buildings, setBuildings] = useState<BuildingDefinition[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [diplomacyAgreements, setDiplomacyAgreements] = useState<
    DiplomacyAgreement[]
  >([]);
  const [diplomacyProposals, setDiplomacyProposals] = useState<
    DiplomacyProposal[]
  >([]);
  const [diplomacyInboxOpen, setDiplomacyInboxOpen] = useState(false);
  const [diplomacySentNotice, setDiplomacySentNotice] = useState<{
    open: boolean;
    toCountryName: string;
  }>({ open: false, toCountryName: '' });
  const pendingDiplomacyProposals = useMemo(
    () =>
      diplomacyProposals.filter(
        (proposal) => proposal.toCountryId === activeCountryId,
      ),
    [diplomacyProposals, activeCountryId],
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    provinceId: string;
  } | null>(null);
  const [colonizationModalOpen, setColonizationModalOpen] = useState(false);
  const [constructionModalOpen, setConstructionModalOpen] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | undefined>(
    undefined,
  );

  const createCountry = (country: Omit<Country, 'id' | 'colonizationPoints'>) => {
    const id = createId();
    const newCountry: Country = { id, colonizationPoints: 100, constructionPoints: 0, ...country };
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
    setCompanies((prev) => prev.filter((company) => company.countryId !== id));

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
    priority?: 'low' | 'medium' | 'high';
    visibility?: 'public' | 'private';
  }) => {
    const entry: EventLogEntry = {
      id: createId(),
      turn,
      timestamp: new Date().toISOString(),
      category: payload.category,
      priority: payload.priority ?? 'medium',
      visibility: payload.visibility ?? 'public',
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

  const setEventSortByPriority = (enabled: boolean) => {
    setEventLog((prev) => ({ ...prev, sortByPriority: enabled }));
  };

  const setEventCountryScope = (scope: 'all' | 'own' | 'others') => {
    setEventLog((prev) => ({ ...prev, countryScope: scope }));
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
            priority: 'high',
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


  const applyConstructionTurn = (countryId: string) => {
    const country = countries.find((c) => c.id === countryId);
    const available = country?.constructionPoints ?? 0;
    if (!country || available <= 0) return;

    let tasksCount = 0;
    Object.values(provinces).forEach((province) => {
      if (province.ownerCountryId !== countryId) return;
      const progress = province.constructionProgress ?? {};
      Object.values(progress).forEach((entries) => {
        tasksCount += entries.length;
      });
    });

    if (tasksCount === 0) return;

    const share = available / tasksCount;

    setProvinces((prev) => {
      const next: ProvinceRecord = { ...prev };
      Object.values(next).forEach((province) => {
        if (province.ownerCountryId !== countryId) return;
        const progress = { ...(province.constructionProgress ?? {}) };
        const builtList = [...(province.buildingsBuilt ?? [])];
        let progressChanged = false;
        let builtChanged = false;

        Object.entries(progress).forEach(([buildingId, entries]) => {
          const cost = buildings.find((b) => b.id === buildingId)?.cost ?? 100;
          const buildingName =
            buildings.find((b) => b.id === buildingId)?.name ?? buildingId;
          const remaining: { progress: number; owner: BuildingOwner }[] = [];
          let completed = 0;

          entries.forEach((entry) => {
            const updated = entry.progress + share;
            if (updated >= cost) {
              completed += 1;
              builtList.push({ buildingId, owner: entry.owner });
            } else {
              remaining.push({ ...entry, progress: updated });
            }
          });

          if (completed > 0) {
            builtChanged = true;
            addEvent({
              category: 'economy',
              message: `Строительство завершено: ${buildingName} x${completed} в провинции ${province.id}.`,
              countryId,
              priority: 'medium',
            });
          }

          if (remaining.length > 0) {
            progress[buildingId] = remaining;
          } else {
            delete progress[buildingId];
          }
          progressChanged = true;
        });

        if (progressChanged) {
          province.constructionProgress = progress;
        }
        if (builtChanged) {
          province.buildingsBuilt = builtList;
        }
      });
      return next;
    });

    setCountries((prev) =>
      prev.map((c) =>
        c.id === countryId ? { ...c, constructionPoints: 0 } : c,
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
        priority: 'low',
      });
      countries.forEach((country) => {
        applyColonizationTurn(country.id);
        applyConstructionTurn(country.id);
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
      const buildGain = Math.max(0, gameSettings.constructionPointsPerTurn ?? 0);
      if (buildGain > 0) {
        setCountries((prev) =>
          prev.map((country) =>
            ({
              ...country,
              constructionPoints: (country.constructionPoints ?? 0) + buildGain,
            }),
          ),
        );
      }
      const expiry = Math.max(
        1,
        gameSettings.diplomacyProposalExpireTurns ?? 3,
      );
      const nextTurn = turn + 1;
      setDiplomacyProposals((prev) => {
        if (prev.length === 0) return prev;
        const expired = prev.filter(
          (proposal) => nextTurn - proposal.createdTurn >= expiry,
        );
        if (expired.length > 0) {
          expired.forEach((proposal) => {
            const fromName =
              countries.find((country) => country.id === proposal.fromCountryId)
                ?.name ?? proposal.fromCountryId;
            const toName =
              countries.find((country) => country.id === proposal.toCountryId)
                ?.name ?? proposal.toCountryId;
            addEvent({
              category: 'diplomacy',
              message: `${toName} отклонила предложение договора от ${fromName} (истек срок).`,
              countryId: proposal.toCountryId,
              priority: 'low',
            });
          });
        }
        return prev.filter(
          (proposal) => nextTurn - proposal.createdTurn < expiry,
        );
      });
      setDiplomacyAgreements((prev) => {
        const [active, expired] = prev.reduce<
          [DiplomacyAgreement[], DiplomacyAgreement[]]
        >(
          (acc, agreement) => {
            if (!agreement.durationTurns || agreement.durationTurns <= 0) {
              acc[0].push(agreement);
              return acc;
            }
            if (!agreement.startTurn) {
              acc[0].push(agreement);
              return acc;
            }
            if (nextTurn - agreement.startTurn < agreement.durationTurns) {
              acc[0].push(agreement);
            } else {
              acc[1].push(agreement);
            }
            return acc;
          },
          [[], []],
        );
        if (expired.length > 0) {
          expired.forEach((agreement) => {
            const hostName =
              countries.find((c) => c.id === agreement.hostCountryId)?.name ??
              agreement.hostCountryId;
            const guestName =
              countries.find((c) => c.id === agreement.guestCountryId)?.name ??
              agreement.guestCountryId;
            addEvent({
              category: 'diplomacy',
              message: `Договор ${hostName} → ${guestName} истёк.`,
              countryId: agreement.hostCountryId,
              priority: 'low',
            });
          });
        }
        return active;
      });
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
      buildings,
      industries,
      companies,
      diplomacy: diplomacyAgreements,
      diplomacyProposals,
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
      buildings,
      industries,
      companies,
      diplomacyAgreements,
      diplomacyProposals,
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
    setProvinces(normalizeProvinceRecord(save.data.provinces ?? {}));
    setClimates(save.data.climates ?? climates);
    setReligions(save.data.religions ?? religions);
    setLandscapes(save.data.landscapes ?? landscapes);
    setCultures(save.data.cultures ?? cultures);
    setResources(save.data.resources ?? resources);
    setBuildings(save.data.buildings ?? buildings);
    setIndustries(save.data.industries ?? industries);
    setCompanies(save.data.companies ?? companies);
    setDiplomacyAgreements(save.data.diplomacy ?? []);
    setDiplomacyProposals(save.data.diplomacyProposals ?? []);
    setGameSettings(
      save.data.settings ?? {
        colonizationPointsPerTurn: 10,
        constructionPointsPerTurn: 10,
        demolitionCostPercent: 20,
        eventLogRetainTurns: 3,
        diplomacyProposalExpireTurns: 3,
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
    setBuildings([]);
    setIndustries([]);
    setCompanies([]);
    setDiplomacyAgreements([]);
    setDiplomacyProposals([]);
    setGameSettings({
      colonizationPointsPerTurn: 10,
      constructionPointsPerTurn: 10,
      demolitionCostPercent: 20,
      eventLogRetainTurns: 3,
      diplomacyProposalExpireTurns: 3,
    });
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
            radiation: 0,
            pollution: 0,
            resourceAmounts: {},
            colonizationCost: 100,
            colonizationProgress: {},
            colonizationDisabled: false,
            buildingsBuilt: [],
            constructionProgress: {},
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
        if (!existing.buildingsBuilt) {
          existing.buildingsBuilt = [];
          updated = true;
        }
        if (!existing.constructionProgress) {
          existing.constructionProgress = {};
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
        if (existing.radiation == null) {
          existing.radiation = 0;
          updated = true;
        }
        if (existing.pollution == null) {
          existing.pollution = 0;
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
      if (province.radiation != null) {
        paint.radiation ??= {};
        paint.radiation[province.id] = radiationColor(province.radiation);
      }
      if (province.pollution != null) {
        paint.pollution ??= {};
        paint.pollution[province.id] = pollutionColor(province.pollution);
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
    const envSteps = [0, 20, 40, 60, 80, 100];
    legends.radiation = envSteps.slice(0, -1).map((from, index) => {
      const to = envSteps[index + 1];
      return {
        label: `${from}-${to}`,
        color: radiationColor(from),
      };
    });
    legends.pollution = envSteps.slice(0, -1).map((from, index) => {
      const to = envSteps[index + 1];
      return {
        label: `${from}-${to}`,
        color: pollutionColor(from),
      };
    });
    return legends;
  }, [climates, religions, landscapes, cultures, resources, selectedResourceId, countries]);

  const selectedProvince = selectedProvinceId
    ? provinces[selectedProvinceId]
    : undefined;

  const toggleLayer = (id: string) => {
    setMapLayers((prev) => {
      const next = prev.map((layer) => ({
        ...layer,
        visible: layer.id === id,
      }));
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

  const setRadiation = (provinceId: string, value: number) => {
    setProvinces((prev) => ({
      ...prev,
      [provinceId]: {
        ...(prev[provinceId] as ProvinceData),
        id: provinceId,
        radiation: value,
      },
    }));
  };

  const setPollution = (provinceId: string, value: number) => {
    setProvinces((prev) => ({
      ...prev,
      [provinceId]: {
        ...(prev[provinceId] as ProvinceData),
        id: provinceId,
        pollution: value,
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
          priority: 'medium',
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
        priority: 'low',
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


  const addBuilding = (
    name: string,
    cost: number,
    iconDataUrl?: string,
    industryId?: string,
    requirements?: BuildingDefinition['requirements'],
  ) => {
    setBuildings((prev) => [
      ...prev,
      { id: createId(), name, cost, iconDataUrl, industryId, requirements },
    ]);
  };

  const addIndustry = (name: string, iconDataUrl?: string, color?: string) => {
    setIndustries((prev) => [
      ...prev,
      { id: createId(), name, iconDataUrl, color },
    ]);
  };

  const updateIndustryIcon = (id: string, iconDataUrl?: string) => {
    setIndustries((prev) =>
      prev.map((industry) =>
        industry.id === id ? { ...industry, iconDataUrl } : industry,
      ),
    );
  };

  const updateIndustryColor = (id: string, color?: string) => {
    setIndustries((prev) =>
      prev.map((industry) => (industry.id === id ? { ...industry, color } : industry)),
    );
  };

  const deleteIndustry = (id: string) => {
    setIndustries((prev) => prev.filter((industry) => industry.id !== id));
    setBuildings((prev) =>
      prev.map((building) =>
        building.industryId === id ? { ...building, industryId: undefined } : building,
      ),
    );
  };

  const addCompany = (
    name: string,
    countryId: string,
    iconDataUrl?: string,
    color?: string,
  ) => {
    setCompanies((prev) => [
      ...prev,
      { id: createId(), name, countryId, iconDataUrl, color },
    ]);
  };

  const updateCompanyIcon = (id: string, iconDataUrl?: string) => {
    setCompanies((prev) =>
      prev.map((company) =>
        company.id === id ? { ...company, iconDataUrl } : company,
      ),
    );
  };

  const updateCompanyColor = (id: string, color?: string) => {
    setCompanies((prev) =>
      prev.map((company) => (company.id === id ? { ...company, color } : company)),
    );
  };

  const updateTraitColor = (
    listSetter: React.Dispatch<React.SetStateAction<Trait[]>>,
    id: string,
    color: string,
  ) => {
    listSetter((prev) =>
      prev.map((item) => (item.id === id ? { ...item, color } : item)),
    );
  };
  const deleteCompany = (id: string) => {
    setCompanies((prev) => prev.filter((company) => company.id !== id));
    setProvinces((prev) => {
      const next: ProvinceRecord = { ...prev };
      Object.values(next).forEach((province) => {
        if (province.buildingsBuilt) {
          province.buildingsBuilt = province.buildingsBuilt.map((entry) => {
            if (entry.owner.type === 'company' && entry.owner.companyId === id) {
              return { ...entry, owner: { type: 'state' } };
            }
            return entry;
          });
        }
        if (province.constructionProgress) {
          const updated: Record<string, { progress: number; owner: BuildingOwner }[]> =
            {};
          Object.entries(province.constructionProgress).forEach(
            ([buildingId, entries]) => {
              updated[buildingId] = entries.map((entry) => {
                if (
                  entry.owner.type === 'company' &&
                  entry.owner.companyId === id
                ) {
                  return { ...entry, owner: { type: 'state' } };
                }
                return entry;
              });
            },
          );
          province.constructionProgress = updated;
        }
      });
      return next;
    });
  };

  const applyDiplomacyAgreement = (
    payload: Omit<DiplomacyAgreement, 'id'>,
    reciprocal: boolean,
  ) => {
    setDiplomacyAgreements((prev) => {
      const next = [
        ...prev,
        { ...payload, id: createId(), startTurn: turn },
      ];
      if (reciprocal && payload.hostCountryId !== payload.guestCountryId) {
        next.push({
          ...payload,
          id: createId(),
          hostCountryId: payload.guestCountryId,
          guestCountryId: payload.hostCountryId,
          startTurn: turn,
        });
      }
      return next;
    });
  };

  const addDiplomacyProposal = (
    payload: Omit<DiplomacyProposal, 'id' | 'createdTurn'>,
  ) => {
    setDiplomacyProposals((prev) => [
      ...prev,
      {
        ...payload,
        id: createId(),
        createdTurn: turn,
      },
    ]);
    const fromName =
      countries.find((country) => country.id === payload.fromCountryId)?.name ??
      payload.fromCountryId;
    const toName =
      countries.find((country) => country.id === payload.toCountryId)?.name ??
      payload.toCountryId;
    addEvent({
      category: 'diplomacy',
      message: `${fromName} отправила предложение договора стране ${toName}.`,
      countryId: payload.fromCountryId,
      priority: 'low',
    });
    setDiplomacySentNotice({ open: true, toCountryName: toName });
  };

  const acceptDiplomacyProposal = (proposalId: string) => {
    const proposal = diplomacyProposals.find((entry) => entry.id === proposalId);
    if (!proposal) return;
    applyDiplomacyAgreement(proposal.agreement, proposal.reciprocal);
    setDiplomacyProposals((prev) =>
      prev.filter((entry) => entry.id !== proposalId),
    );
    const fromName =
      countries.find((country) => country.id === proposal.fromCountryId)?.name ??
      proposal.fromCountryId;
    const toName =
      countries.find((country) => country.id === proposal.toCountryId)?.name ??
      proposal.toCountryId;
    addEvent({
      category: 'diplomacy',
      message: `${toName} приняла предложение договора от ${fromName}.`,
      countryId: proposal.toCountryId,
      priority: 'low',
    });
  };

  const declineDiplomacyProposal = (proposalId: string) => {
    setDiplomacyProposals((prev) =>
      prev.filter((entry) => entry.id !== proposalId),
    );
    const proposal = diplomacyProposals.find((entry) => entry.id === proposalId);
    if (!proposal) return;
    const fromName =
      countries.find((country) => country.id === proposal.fromCountryId)?.name ??
      proposal.fromCountryId;
    const toName =
      countries.find((country) => country.id === proposal.toCountryId)?.name ??
      proposal.toCountryId;
    addEvent({
      category: 'diplomacy',
      message: `${toName} отклонила предложение договора от ${fromName}.`,
      countryId: proposal.toCountryId,
      priority: 'low',
    });
  };

  const withdrawDiplomacyProposal = (proposalId: string) => {
    setDiplomacyProposals((prev) =>
      prev.filter((entry) => entry.id !== proposalId),
    );
    const proposal = diplomacyProposals.find((entry) => entry.id === proposalId);
    if (!proposal) return;
    const fromName =
      countries.find((country) => country.id === proposal.fromCountryId)?.name ??
      proposal.fromCountryId;
    const toName =
      countries.find((country) => country.id === proposal.toCountryId)?.name ??
      proposal.toCountryId;
    addEvent({
      category: 'diplomacy',
      message: `${fromName} отозвала предложение договора для ${toName}.`,
      countryId: proposal.fromCountryId,
      priority: 'low',
    });
  };

  const deleteDiplomacyAgreement = (id: string) => {
    const agreement = diplomacyAgreements.find((entry) => entry.id === id);
    setDiplomacyAgreements((prev) => prev.filter((entry) => entry.id !== id));
    if (agreement) {
      const hostName =
        countries.find((c) => c.id === agreement.hostCountryId)?.name ??
        agreement.hostCountryId;
      const guestName =
        countries.find((c) => c.id === agreement.guestCountryId)?.name ??
        agreement.guestCountryId;
      addEvent({
        category: 'diplomacy',
        message: `Договор ${hostName} → ${guestName} отменён.`,
        countryId: agreement.hostCountryId,
        priority: 'low',
      });
    }
  };

  const updateBuildingIcon = (id: string, iconDataUrl?: string) => {
    setBuildings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, iconDataUrl } : item)),
    );
  };

  const updateBuildingIndustry = (id: string, industryId?: string) => {
    setBuildings((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, industryId } : item,
      ),
    );
  };

  const updateBuildingRequirements = (
    id: string,
    requirements?: BuildingDefinition['requirements'],
  ) => {
    setBuildings((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, requirements } : item,
      ),
    );
  };

  const deleteBuilding = (id: string) => {
    setBuildings((prev) => prev.filter((b) => b.id !== id));
    setProvinces((prev) => {
      const next: ProvinceRecord = { ...prev };
      Object.values(next).forEach((province) => {
        if (province.buildingsBuilt) {
          province.buildingsBuilt = province.buildingsBuilt.filter(
            (entry) => entry.buildingId !== id,
          );
        }
        if (province.constructionProgress && id in province.constructionProgress) {
          const progress = { ...province.constructionProgress };
          delete progress[id];
          province.constructionProgress = progress;
        }
      });
      return next;
    });
  };

  const startConstruction = (
    provinceId: string,
    buildingId: string,
    owner: BuildingOwner,
  ) => {
    const buildingName =
      buildings.find((b) => b.id === buildingId)?.name ?? buildingId;
    const country = countries.find((c) => c.id === activeCountryId);
    const ownerLabel =
      owner.type === 'state'
        ? countries.find((item) => item.id === owner.countryId)?.name ??
          'государство'
        : companies.find((item) => item.id === owner.companyId)?.name ??
          'компания';
    setProvinces((prev) => {
      const province = prev[provinceId];
      if (!province || province.ownerCountryId == null) return prev;
      const building = buildings.find((b) => b.id === buildingId);
      if (!building) return prev;
      const getOwnerCountryId = (target: BuildingOwner) =>
        target.type === 'state'
          ? target.countryId
          : companies.find((c) => c.id === target.companyId)?.countryId;
      const isAgreementActive = (agreement: DiplomacyAgreement) => {
        if (!agreement.durationTurns || agreement.durationTurns <= 0) return true;
        if (!agreement.startTurn) return true;
        return turn - agreement.startTurn < agreement.durationTurns;
      };
      const hasDiplomacyAccess = () => {
        const hostId = province.ownerCountryId;
        const ownerCountryId = getOwnerCountryId(owner);
        if (!hostId || !ownerCountryId) return false;
        if (hostId === ownerCountryId) return true;
        const matches = diplomacyAgreements.filter(
          (agreement) =>
            agreement.hostCountryId === hostId &&
            agreement.guestCountryId === ownerCountryId &&
            isAgreementActive(agreement),
        );
        if (matches.length === 0) return false;

        const industryAllowed = (agreement: DiplomacyAgreement, id: string) => {
          if (!agreement.industries || agreement.industries.length === 0) {
            return true;
          }
          const industryId =
            buildings.find((item) => item.id === id)?.industryId ?? undefined;
          return Boolean(industryId && agreement.industries.includes(industryId));
        };
        const buildingAllowed = (agreement: DiplomacyAgreement, id: string) => {
          if (!agreement.buildingIds || agreement.buildingIds.length === 0) {
            return true;
          }
          return agreement.buildingIds.includes(id);
        };
        const provinceAllowed = (agreement: DiplomacyAgreement, provId: string) => {
          if (!agreement.provinceIds || agreement.provinceIds.length === 0) {
            return true;
          }
          return agreement.provinceIds.includes(provId);
        };
        const ownerAllowed = (agreement: DiplomacyAgreement) => {
          const allowsState = agreement.allowState ?? agreement.kind === 'state';
          const allowsCompanies =
            agreement.allowCompanies ?? agreement.kind === 'company';
          if (owner.type === 'state') return allowsState;
          if (!allowsCompanies) return false;
          if (agreement.companyIds && agreement.companyIds.length > 0) {
            return agreement.companyIds.includes(owner.companyId);
          }
          return true;
        };
        const agreementMatch = (
          target: BuildingOwner,
          agreementsToUse: DiplomacyAgreement[],
          buildingId: string,
          provinceId: string,
        ) =>
          agreementsToUse.find((agreement) => {
            const allowsState = agreement.allowState ?? agreement.kind === 'state';
            const allowsCompanies =
              agreement.allowCompanies ?? agreement.kind === 'company';
            if (target.type === 'state') {
              if (!allowsState) return false;
            } else {
              if (!allowsCompanies) return false;
              if (agreement.companyIds && agreement.companyIds.length > 0) {
                if (!agreement.companyIds.includes(target.companyId)) return false;
              }
            }
            if (!provinceAllowed(agreement, provinceId)) return false;
            if (!buildingAllowed(agreement, buildingId)) return false;
            return true;
          });

        const countAgreementEntries = (
          agreements: DiplomacyAgreement[],
          provinceList: ProvinceData[],
        ) =>
          provinceList.reduce((sum, prov) => {
            const built = (prov.buildingsBuilt ?? []).filter((entry) => {
              const match = agreementMatch(
                entry.owner,
                agreements,
                entry.buildingId,
                prov.id,
              );
              if (!match) return false;
              const entryCountryId = getOwnerCountryId(entry.owner);
              if (entryCountryId !== ownerCountryId) return false;
              if (!provinceAllowed(match, prov.id)) return false;
              return industryAllowed(match, entry.buildingId);
            }).length;
            const inProgress = Object.entries(prov.constructionProgress ?? {}).reduce(
              (sumProgress, [entryBuildingId, entries]) => {
                const filtered = entries.filter((entry) => {
                  const match = agreementMatch(
                    entry.owner,
                    agreements,
                    entryBuildingId,
                    prov.id,
                  );
                  if (!match) return false;
                  const entryCountryId = getOwnerCountryId(entry.owner);
                  if (entryCountryId !== ownerCountryId) return false;
                  if (!provinceAllowed(match, prov.id)) return false;
                  return industryAllowed(match, entryBuildingId);
                });
                return sumProgress + filtered.length;
              },
              0,
            );
            return sum + built + inProgress;
          }, 0);

        return matches.some((agreement) => {
          if (!ownerAllowed(agreement)) return false;
          if (!provinceAllowed(agreement, provinceId)) return false;
          if (!buildingAllowed(agreement, buildingId)) return false;
          if (!industryAllowed(agreement, buildingId)) return false;
          const limits = agreement.limits ?? {};
          const perProvince = limits.perProvince ?? 0;
          const perCountry = limits.perCountry ?? 0;
          const global = limits.global ?? 0;
          if (perProvince > 0) {
            const count = countAgreementEntries([agreement], [province]);
            if (count >= perProvince) return false;
          }
          if (perCountry > 0) {
            const hostProvinces = Object.values(prev).filter(
              (prov) => prov.ownerCountryId === hostId,
            );
            const count = countAgreementEntries([agreement], hostProvinces);
            if (count >= perCountry) return false;
          }
          if (global > 0) {
            const count = countAgreementEntries([agreement], Object.values(prev));
            if (count >= global) return false;
          }
          return true;
        });
      };

      if (!hasDiplomacyAccess()) {
        return prev;
      }
      const requirements = building.requirements;
      const normalizeTraitCriteria = (
        criteria: TraitCriteria | undefined,
        legacyId?: string,
      ) => ({
        anyOf: criteria?.anyOf ?? (legacyId ? [legacyId] : []),
        noneOf: criteria?.noneOf ?? [],
      });
      const evaluateRequirementNode = (
        node: RequirementNode,
        provinceData: ProvinceData,
      ): boolean => {
        if (node.type === 'trait') {
          const key =
            node.category === 'climate'
              ? provinceData.climateId
              : node.category === 'landscape'
                ? provinceData.landscapeId
                : node.category === 'culture'
                  ? provinceData.cultureId
                  : provinceData.religionId;
          return Boolean(key && key === node.id);
        }
        if (node.op === 'and') {
          return node.children.every((child) =>
            evaluateRequirementNode(child, provinceData),
          );
        }
        if (node.op === 'or') {
          return node.children.some((child) =>
            evaluateRequirementNode(child, provinceData),
          );
        }
        if (node.op === 'not') {
          if (node.children.length === 0) return true;
          return !node.children.some((child) =>
            evaluateRequirementNode(child, provinceData),
          );
        }
        if (node.op === 'xor') {
          const matches = node.children.filter((child) =>
            evaluateRequirementNode(child, provinceData),
          ).length;
          return matches === 1;
        }
        if (node.op === 'nand') {
          return !node.children.every((child) =>
            evaluateRequirementNode(child, provinceData),
          );
        }
        if (node.op === 'nor') {
          return !node.children.some((child) =>
            evaluateRequirementNode(child, provinceData),
          );
        }
        if (node.op === 'implies') {
          if (node.children.length < 2) return true;
          const [a, b] = node.children;
          return !evaluateRequirementNode(a, provinceData) ||
            evaluateRequirementNode(b, provinceData);
        }
        if (node.op === 'eq') {
          if (node.children.length < 2) return true;
          const results = node.children.map((child) =>
            evaluateRequirementNode(child, provinceData),
          );
          return results.every((value) => value === results[0]);
        }
        return true;
      };
      const builtCount = (id: string) =>
        province.buildingsBuilt?.filter((entry) => entry.buildingId === id)
          .length ?? 0;
      const inProgressCount = (id: string) =>
        province.constructionProgress?.[id]?.length ?? 0;
      if (requirements?.maxPerProvince != null) {
        const limit = requirements.maxPerProvince;
        if (limit > 0 && builtCount(buildingId) + inProgressCount(buildingId) >= limit) {
          return prev;
        }
      }
      if (requirements?.maxPerCountry != null) {
        const limit = requirements.maxPerCountry;
        if (limit > 0) {
          const ownerCountryId =
            owner.type === 'state'
              ? owner.countryId
              : companies.find((c) => c.id === owner.companyId)?.countryId;
          if (ownerCountryId) {
            const builtForCountry = Object.values(prev).reduce(
              (sum, prov) => {
                const list = prov.buildingsBuilt ?? [];
                return (
                  sum +
                  list.filter((entry) => {
                    if (entry.buildingId !== buildingId) return false;
                    if (entry.owner.type === 'state') {
                      return entry.owner.countryId === ownerCountryId;
                    }
                    const companyCountry = companies.find(
                      (c) => c.id === entry.owner.companyId,
                    )?.countryId;
                    return companyCountry === ownerCountryId;
                  }).length
                );
              },
              0,
            );
            const inProgressForCountry = Object.values(prev).reduce(
              (sum, prov) => {
                const list = prov.constructionProgress?.[buildingId] ?? [];
                return (
                  sum +
                  list.filter((entry) => {
                    if (entry.owner.type === 'state') {
                      return entry.owner.countryId === ownerCountryId;
                    }
                    const companyCountry = companies.find(
                      (c) => c.id === entry.owner.companyId,
                    )?.countryId;
                    return companyCountry === ownerCountryId;
                  }).length
                );
              },
              0,
            );
            if (builtForCountry + inProgressForCountry >= limit) {
              return prev;
            }
          }
        }
      }
      if (requirements?.maxGlobal != null) {
        const limit = requirements.maxGlobal;
        if (limit > 0) {
          const builtGlobal = Object.values(prev).reduce(
            (sum, prov) =>
              sum +
              (prov.buildingsBuilt ?? []).filter(
                (entry) => entry.buildingId === buildingId,
              ).length,
            0,
          );
          const inProgressGlobal = Object.values(prev).reduce(
            (sum, prov) =>
              sum + (prov.constructionProgress?.[buildingId]?.length ?? 0),
            0,
          );
          if (builtGlobal + inProgressGlobal >= limit) {
            return prev;
          }
        }
      }
      if (requirements?.logic) {
        if (!evaluateRequirementNode(requirements.logic, province)) {
          return prev;
        }
      } else {
        const climateReq = normalizeTraitCriteria(
          requirements?.climate,
          requirements?.climateId,
        );
        if (
          climateReq.anyOf.length > 0 &&
          (!province.climateId ||
            !climateReq.anyOf.includes(province.climateId))
        ) {
          return prev;
        }
        if (
          climateReq.noneOf.length > 0 &&
          province.climateId &&
          climateReq.noneOf.includes(province.climateId)
        ) {
          return prev;
        }

        const landscapeReq = normalizeTraitCriteria(
          requirements?.landscape,
          requirements?.landscapeId,
        );
        if (
          landscapeReq.anyOf.length > 0 &&
          (!province.landscapeId ||
            !landscapeReq.anyOf.includes(province.landscapeId))
        ) {
          return prev;
        }
        if (
          landscapeReq.noneOf.length > 0 &&
          province.landscapeId &&
          landscapeReq.noneOf.includes(province.landscapeId)
        ) {
          return prev;
        }

        const cultureReq = normalizeTraitCriteria(
          requirements?.culture,
          requirements?.cultureId,
        );
        if (
          cultureReq.anyOf.length > 0 &&
          (!province.cultureId ||
            !cultureReq.anyOf.includes(province.cultureId))
        ) {
          return prev;
        }
        if (
          cultureReq.noneOf.length > 0 &&
          province.cultureId &&
          cultureReq.noneOf.includes(province.cultureId)
        ) {
          return prev;
        }

        const religionReq = normalizeTraitCriteria(
          requirements?.religion,
          requirements?.religionId,
        );
        if (
          religionReq.anyOf.length > 0 &&
          (!province.religionId ||
            !religionReq.anyOf.includes(province.religionId))
        ) {
          return prev;
        }
        if (
          religionReq.noneOf.length > 0 &&
          province.religionId &&
          religionReq.noneOf.includes(province.religionId)
        ) {
          return prev;
        }
      }
      if (requirements?.resources) {
        const amounts = province.resourceAmounts ?? {};
        const legacyRequired = Object.entries(requirements.resources)
          .filter(([, value]) => typeof value === 'number' && value > 0)
          .map(([id]) => id);
        const required = requirements.resources.anyOf ?? legacyRequired;
        const forbidden = requirements.resources.noneOf ?? [];
        if (
          required.length > 0 &&
          !required.every((id) => (amounts[id] ?? 0) > 0)
        ) {
          return prev;
        }
        if (
          forbidden.length > 0 &&
          forbidden.some((id) => (amounts[id] ?? 0) > 0)
        ) {
          return prev;
        }
      }
      if (requirements?.radiation) {
        const value = province.radiation ?? 0;
        if (requirements.radiation.min != null && value < requirements.radiation.min) {
          return prev;
        }
        if (requirements.radiation.max != null && value > requirements.radiation.max) {
          return prev;
        }
      }
      if (requirements?.pollution) {
        const value = province.pollution ?? 0;
        if (requirements.pollution.min != null && value < requirements.pollution.min) {
          return prev;
        }
        if (requirements.pollution.max != null && value > requirements.pollution.max) {
          return prev;
        }
      }
      if (requirements?.allowedCountries || requirements?.allowedCompanies) {
        if (owner.type === 'state') {
          const mode = requirements.allowedCountriesMode ?? 'allow';
          const list = requirements.allowedCountries ?? [];
          if (list.length === 0) {
            if (mode === 'allow') return prev;
          } else {
            const included = list.includes(owner.countryId);
            if ((mode === 'allow' && !included) || (mode === 'deny' && included)) {
              return prev;
            }
          }
        } else if (owner.type === 'company') {
          const mode = requirements.allowedCompaniesMode ?? 'allow';
          const list = requirements.allowedCompanies ?? [];
          if (list.length === 0) {
            if (mode === 'allow') return prev;
          } else {
            const included = list.includes(owner.companyId);
            if ((mode === 'allow' && !included) || (mode === 'deny' && included)) {
              return prev;
            }
          }
        }
      }
      if (requirements?.buildings) {
        const ownerCountryId =
          owner.type === 'state'
            ? owner.countryId
            : companies.find((c) => c.id === owner.companyId)?.countryId;
        const ok = Object.entries(requirements.buildings).every(
          ([depId, constraint]) => {
            const provinceCount = builtCount(depId);
            const countryCount = ownerCountryId
              ? Object.values(prev).reduce((sum, prov) => {
                  const list = prov.buildingsBuilt ?? [];
                  return (
                    sum +
                    list.filter((entry) => {
                      if (entry.buildingId !== depId) return false;
                      if (entry.owner.type === 'state') {
                        return entry.owner.countryId === ownerCountryId;
                      }
                      const companyCountry = companies.find(
                        (c) => c.id === entry.owner.companyId,
                      )?.countryId;
                      return companyCountry === ownerCountryId;
                    }).length
                  );
                }, 0)
              : 0;
            const globalCount = Object.values(prev).reduce(
              (sum, prov) =>
                sum +
                (prov.buildingsBuilt ?? []).filter(
                  (entry) => entry.buildingId === depId,
                ).length,
              0,
            );
            const province = (constraint as any).province ?? constraint;
            const country = (constraint as any).country;
            const global = (constraint as any).global;
            if (province?.min != null && provinceCount < province.min) return false;
            if (province?.max != null && provinceCount > province.max) return false;
            if (country?.min != null && countryCount < country.min) return false;
            if (country?.max != null && countryCount > country.max) return false;
            if (global?.min != null && globalCount < global.min) return false;
            if (global?.max != null && globalCount > global.max) return false;
            return true;
          },
        );
        if (!ok) return prev;
      } else if (requirements?.dependencies) {
        const ok = requirements.dependencies.every((depId) => builtCount(depId) > 0);
        if (!ok) return prev;
      }
      const progress = { ...(province.constructionProgress ?? {}) };
      const entries = Array.isArray(progress[buildingId])
        ? [...progress[buildingId]]
        : [];
      entries.push({ progress: 0, owner });
      progress[buildingId] = entries;
      addEvent({
        category: 'economy',
        message: `${country?.name ?? 'Страна'} начала строительство ${buildingName} в провинции ${provinceId} (${ownerLabel}).`,
        countryId: province.ownerCountryId,
        priority: 'low',
      });
      return {
        ...prev,
        [provinceId]: {
          ...province,
          constructionProgress: progress,
        },
      };
    });
  };

  const cancelConstruction = (provinceId: string, buildingId: string) => {
    const buildingName =
      buildings.find((b) => b.id === buildingId)?.name ?? buildingId;
    const country = countries.find((c) => c.id === activeCountryId);
    setProvinces((prev) => {
      const province = prev[provinceId];
      if (!province || !province.constructionProgress) return prev;
      if (!(buildingId in province.constructionProgress)) return prev;
      const progress = { ...province.constructionProgress };
      const entries = Array.isArray(progress[buildingId])
        ? [...progress[buildingId]]
        : [];
      if (entries.length === 0) return prev;
      const removed = entries.pop();
      const ownerLabel =
        removed?.owner.type === 'state'
          ? countries.find((item) => item.id === removed?.owner.countryId)?.name ??
            'государство'
          : companies.find((item) => item.id === removed?.owner.companyId)?.name ??
            'компания';
      if (entries.length > 0) {
        progress[buildingId] = entries;
      } else {
        delete progress[buildingId];
      }
      addEvent({
        category: 'economy',
        message: `${country?.name ?? 'Страна'} отменила строительство ${buildingName} в провинции ${provinceId} (${ownerLabel}).`,
        countryId: province.ownerCountryId,
        priority: 'low',
      });
      return {
        ...prev,
        [provinceId]: {
          ...province,
          constructionProgress: progress,
        },
      };
    });
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
      setSortByPriority: setEventSortByPriority,
      setCountryScope: setEventCountryScope,
      clearLog: clearEventLog,
      trimOld: trimEventLog,
      toggleCollapsed: () => setEventLogCollapsed((prev) => !prev),
      collapsed: eventLogCollapsed,
    }),
    [
      eventLog,
      addEvent,
      setEventFilters,
      setEventSortByPriority,
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
        buildings={buildings}
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
        constructionGainPerTurn={gameSettings.constructionPointsPerTurn ?? 0}
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
      {pendingDiplomacyProposals.length > 0 && (
        <button
          onClick={() => setDiplomacyInboxOpen(true)}
          className="absolute left-1/2 -translate-x-1/2 top-[88px] h-9 px-4 rounded-xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400/20 hover:border-emerald-300/60 transition-colors z-40"
        >
          <Handshake className="w-4 h-4" />
          Договоры ({pendingDiplomacyProposals.length})
        </button>
      )}
      <LeftToolbar />

      {diplomacySentNotice.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-[360px] rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 text-white text-base font-semibold">
              Предложение отправлено
            </div>
            <div className="px-5 py-4 text-white/70 text-sm">
              Предложение направлено стране {diplomacySentNotice.toCountryName}.
            </div>
            <div className="px-5 py-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setDiplomacySentNotice({ open: false, toCountryName: '' })}
                className="h-9 px-4 rounded-lg border border-emerald-400/40 bg-emerald-500/20 text-emerald-200 text-sm"
              >
                Ок
              </button>
            </div>
          </div>
        </div>
      )}

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

      <BottomDock
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenIndustry={() => setIndustryOpen(true)}
        onOpenDiplomacy={() => setDiplomacyOpen(true)}
      />
      <EventLogPanel activeCountryId={activeCountryId} countries={countries} />

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
        onConstruct={() => {
          if (contextMenu?.provinceId) {
            setSelectedProvinceId(contextMenu.provinceId);
            setConstructionModalOpen(true);
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

      <ConstructionModal
        open={constructionModalOpen}
        provinceId={selectedProvinceId}
        province={selectedProvince}
        provinces={provinces}
        buildings={buildings}
        resources={resources}
        companies={companies}
        countries={countries}
        diplomacyAgreements={diplomacyAgreements}
        turn={turn}
        activeCountryId={activeCountryId}
        activeCountryPoints={
          countries.find((country) => country.id === activeCountryId)
            ?.constructionPoints ?? 0
        }
        onClose={() => setConstructionModalOpen(false)}
        onStart={(buildingId, owner) => {
          if (selectedProvinceId) {
            startConstruction(selectedProvinceId, buildingId, owner);
          }
        }}
        onCancel={(buildingId) => {
          if (selectedProvinceId) {
            cancelConstruction(selectedProvinceId, buildingId);
          }
        }}
      />

      <SettingsModal
        open={settingsOpen}
        settings={gameSettings}
        onChange={setGameSettings}
        onClose={() => setSettingsOpen(false)}
      />

      <IndustryModal
        open={industryOpen}
        provinces={provinces}
        buildings={buildings}
        industries={industries}
        resources={resources}
        countries={countries}
        companies={companies}
        diplomacyAgreements={diplomacyAgreements}
        turn={turn}
        activeCountryId={activeCountryId}
        activeCountryPoints={
          countries.find((country) => country.id === activeCountryId)
            ?.constructionPoints ?? 0
        }
        demolitionCostPercent={gameSettings.demolitionCostPercent ?? 20}
        onOpenConstruction={(provinceId) => {
          setSelectedProvinceId(provinceId);
          setConstructionModalOpen(true);
          setIndustryOpen(false);
        }}
        onChangeOwner={(provinceId, kind, buildingId, index, owner) => {
          setProvinces((prev) => {
            const province = prev[provinceId];
            if (!province) return prev;
            if (kind === 'built') {
              if (!province.buildingsBuilt) return prev;
              if (index < 0 || index >= province.buildingsBuilt.length) {
                return prev;
              }
              const nextBuilt = [...province.buildingsBuilt];
              nextBuilt[index] = { ...nextBuilt[index], owner };
              return {
                ...prev,
                [provinceId]: {
                  ...province,
                  buildingsBuilt: nextBuilt,
                },
              };
            }

            if (kind === 'construction') {
              const progressMap = province.constructionProgress ?? {};
              const entries = progressMap[buildingId];
              if (!entries || index < 0 || index >= entries.length) return prev;
              const nextEntries = [...entries];
              nextEntries[index] = { ...nextEntries[index], owner };
              return {
                ...prev,
                [provinceId]: {
                  ...province,
                  constructionProgress: {
                    ...progressMap,
                    [buildingId]: nextEntries,
                  },
                },
              };
            }

            return prev;
          });
        }}
        onCancelConstruction={(provinceId, buildingId, index) => {
          setProvinces((prev) => {
            const province = prev[provinceId];
            if (!province || !province.constructionProgress) return prev;
            const entries = province.constructionProgress[buildingId];
            if (!entries || index < 0 || index >= entries.length) return prev;
            const nextEntries = [...entries];
            const removed = nextEntries.splice(index, 1)[0];
            const nextProgress = { ...province.constructionProgress };
            if (nextEntries.length > 0) {
              nextProgress[buildingId] = nextEntries;
            } else {
              delete nextProgress[buildingId];
            }
            const buildingName =
              buildings.find((b) => b.id === buildingId)?.name ?? buildingId;
            const country = countries.find((c) => c.id === activeCountryId);
            const ownerLabel =
              removed?.owner.type === 'state'
                ? countries.find((item) => item.id === removed?.owner.countryId)
                    ?.name ?? 'государство'
                : companies.find((item) => item.id === removed?.owner.companyId)
                    ?.name ?? 'компания';
            addEvent({
              category: 'economy',
              message: `${country?.name ?? 'Страна'} отменила строительство ${buildingName} в провинции ${provinceId} (${ownerLabel}).`,
              countryId: province.ownerCountryId,
              priority: 'low',
            });
            return {
              ...prev,
              [provinceId]: {
                ...province,
                constructionProgress: nextProgress,
              },
            };
          });
        }}
        onDemolish={(provinceId, buildingId) => {
          const building = buildings.find((b) => b.id === buildingId);
          const baseCost = Math.max(1, building?.cost ?? 1);
          const percent = Math.max(0, gameSettings.demolitionCostPercent ?? 20);
          const demolishCost = Math.ceil((baseCost * percent) / 100);
          const country = countries.find((c) => c.id === activeCountryId);
          const available = country?.constructionPoints ?? 0;
          if (available < demolishCost) {
            addEvent({
              category: 'economy',
              message: `Недостаточно очков строительства для сноса здания в провинции ${provinceId}.`,
              countryId: country?.id,
              priority: 'low',
            });
            return;
          }

          setCountries((prev) =>
            prev.map((entry) =>
              entry.id === activeCountryId
                ? {
                    ...entry,
                    constructionPoints: Math.max(
                      0,
                      (entry.constructionPoints ?? 0) - demolishCost,
                    ),
                  }
                : entry,
            ),
          );

          setProvinces((prev) => {
            const province = prev[provinceId];
            if (!province || !province.buildingsBuilt) return prev;
            const index = province.buildingsBuilt.findIndex(
              (entry) => entry.buildingId === buildingId,
            );
            if (index === -1) return prev;
            const nextBuilt = [...province.buildingsBuilt];
            nextBuilt.splice(index, 1);
            const buildingName = building?.name ?? buildingId;
            addEvent({
              category: 'economy',
              message: `${country?.name ?? 'Страна'} снесла ${buildingName} в провинции ${provinceId} (стоимость: ${demolishCost}).`,
              countryId: province.ownerCountryId,
              priority: 'low',
            });
            return {
              ...prev,
              [provinceId]: {
                ...province,
                buildingsBuilt: nextBuilt,
              },
            };
          });
        }}
        onClose={() => setIndustryOpen(false)}
      />
      <DiplomacyModal
        open={diplomacyOpen}
        countries={countries}
        industries={industries}
        provinces={provinces}
        buildings={buildings}
        companies={companies}
        agreements={diplomacyAgreements}
        proposals={diplomacyProposals}
        turn={turn}
        activeCountryId={activeCountryId}
        onClose={() => setDiplomacyOpen(false)}
        onCreateProposal={addDiplomacyProposal}
        onDeleteAgreement={deleteDiplomacyAgreement}
        onWithdrawProposal={withdrawDiplomacyProposal}
      />
      <DiplomacyProposalsModal
        open={diplomacyInboxOpen}
        proposals={pendingDiplomacyProposals}
        countries={countries}
        industries={industries}
        buildings={buildings}
        companies={companies}
        onAccept={(id) => {
          acceptDiplomacyProposal(id);
          setDiplomacyInboxOpen(false);
        }}
        onDecline={(id) => {
          declineDiplomacyProposal(id);
          setDiplomacyInboxOpen(false);
        }}
        onClose={() => setDiplomacyInboxOpen(false)}
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
        buildings={buildings}
        industries={industries}
        companies={companies}
        onClose={() => setAdminOpen(false)}
        onAssignOwner={assignOwner}
        onAssignClimate={assignClimate}
        onAssignReligion={assignReligion}
        onAssignLandscape={assignLandscape}
        onAssignCulture={assignCulture}
        onSetProvinceResourceAmount={setProvinceResourceAmount}
        onSetColonizationCost={setColonizationCost}
        onSetColonizationDisabled={setColonizationDisabled}
        onSetRadiation={setRadiation}
        onSetPollution={setPollution}
        onAddClimate={addClimate}
        onAddReligion={addReligion}
        onAddLandscape={addLandscape}
        onAddCulture={addCulture}
        onAddResource={addResource}
        onAddBuilding={addBuilding}
        onAddIndustry={addIndustry}
        onUpdateIndustryIcon={updateIndustryIcon}
        onUpdateIndustryColor={updateIndustryColor}
        onAddCompany={addCompany}
        onUpdateCompanyIcon={updateCompanyIcon}
        onUpdateCompanyColor={updateCompanyColor}
        onUpdateReligionIcon={updateReligionIcon}
        onUpdateCultureIcon={updateCultureIcon}
        onUpdateResourceIcon={updateResourceIcon}
        onUpdateBuildingIcon={updateBuildingIcon}
        onUpdateBuildingIndustry={updateBuildingIndustry}
        onUpdateBuildingRequirements={updateBuildingRequirements}
        onUpdateClimateColor={(id, color) =>
          updateTraitColor(setClimates, id, color)
        }
        onUpdateReligionColor={(id, color) =>
          updateTraitColor(setReligions, id, color)
        }
        onUpdateLandscapeColor={(id, color) =>
          updateTraitColor(setLandscapes, id, color)
        }
        onUpdateCultureColor={(id, color) =>
          updateTraitColor(setCultures, id, color)
        }
        onUpdateResourceColor={(id, color) =>
          updateTraitColor(setResources, id, color)
        }
        onDeleteClimate={deleteClimate}
        onDeleteReligion={deleteReligion}
        onDeleteLandscape={deleteLandscape}
        onDeleteCulture={deleteCulture}
        onDeleteResource={deleteResource}
        onDeleteBuilding={deleteBuilding}
        onDeleteIndustry={deleteIndustry}
        onDeleteCompany={deleteCompany}
      />
    </div>
    </EventLogContext.Provider>
  );
}

export default App;

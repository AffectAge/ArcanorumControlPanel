import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import LogisticsModal from './components/LogisticsModal';
import MarketModal from './components/MarketModal';
import {
  createDefaultLogisticsState,
  ensureBaseLogisticsNodes,
} from './logistics';
import {
  EventLogContext,
  createDefaultLog,
  createDefaultFilters,
} from './eventLog';
import { resolveAgreementTerms } from './diplomacyUtils';
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
  BuiltBuilding,
  TraitCriteria,
  RequirementNode,
  DiplomacyAgreement,
  DiplomacyProposal,
  LogisticsState,
  LogisticsEdge,
  LogisticsRouteType,
  Market,
  ResourceCategory,
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
const DEFAULT_RESOURCE_BASE_PRICE = 1;
const MARKET_PRICE_SMOOTHING = 0.30;
const MARKET_PRICE_HISTORY_LENGTH = 10;
const MARKET_PRICE_EPSILON = 0.0001;

const normalizePositiveNumber = (value: unknown): number | undefined => {
  if (!Number.isFinite(value)) return undefined;
  const safe = Number(value);
  return safe > 0 ? safe : undefined;
};

const normalizeResourceMap = (
  value?: Record<string, number>,
): Record<string, number> | undefined => {
  if (!value) return undefined;
  const next = Object.fromEntries(
    Object.entries(value).filter(
      ([resourceId, amount]) =>
        Boolean(resourceId) &&
        Number.isFinite(amount) &&
        Number(amount) > 0,
    ),
  );
  return Object.keys(next).length > 0 ? next : undefined;
};

const normalizeResourcePrice = (value: unknown, fallback = DEFAULT_RESOURCE_BASE_PRICE) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0.01, Number(value));
};

const normalizeOptionalResourcePrice = (value: unknown): number | undefined => {
  if (!Number.isFinite(value)) return undefined;
  const safe = Math.max(0.01, Number(value));
  return safe > 0 ? safe : undefined;
};

const normalizeInfrastructureCostPerUnit = (value: unknown, fallback = 1): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0.01, Number(value));
};

const normalizeResourcePriceHistory = (
  value: unknown,
  fallback: number,
  historyLength = MARKET_PRICE_HISTORY_LENGTH,
): number[] => {
  if (!Array.isArray(value)) return [fallback];
  const normalized = value
    .map((item) => normalizeResourcePrice(item, fallback))
    .filter((item) => Number.isFinite(item) && item > 0);
  if (normalized.length === 0) return [fallback];
  return normalized.slice(-Math.max(1, Math.floor(historyLength)));
};

const normalizeResourceAmountHistory = (
  value: unknown,
  fallback = 0,
  historyLength = MARKET_PRICE_HISTORY_LENGTH,
): number[] => {
  if (!Array.isArray(value)) return [Math.max(0, fallback)];
  const normalized = value
    .map((item) => (Number.isFinite(item) ? Math.max(0, Number(item)) : NaN))
    .filter((item) => Number.isFinite(item));
  if (normalized.length === 0) return [Math.max(0, fallback)];
  return normalized.slice(-Math.max(1, Math.floor(historyLength)));
};

const computeNextMarketPrice = (params: {
  currentPrice: number;
  basePrice: number;
  demand: number;
  productionFact: number;
  marketVolume: number;
  minMarketPrice?: number;
  maxMarketPrice?: number;
  smoothing?: number;
  epsilon?: number;
}) => {
  const {
    currentPrice,
    basePrice,
    demand,
    productionFact,
    marketVolume,
    minMarketPrice,
    maxMarketPrice,
    smoothing,
    epsilon,
  } = params;
  const safeSmoothing = clamp01(smoothing ?? MARKET_PRICE_SMOOTHING);
  const safeEpsilon = Math.max(0, epsilon ?? MARKET_PRICE_EPSILON);

  const offer = Math.max(0, productionFact) + Math.max(0, marketVolume);
  const ratio = (Math.max(0, demand) + 1) / (offer + 1);
  let targetPrice =
    Math.abs(Math.max(0, demand) - offer) <= safeEpsilon
      ? basePrice
      : currentPrice * ratio;

  if (minMarketPrice != null) targetPrice = Math.max(targetPrice, minMarketPrice);
  if (maxMarketPrice != null) targetPrice = Math.min(targetPrice, maxMarketPrice);

  let nextPrice = currentPrice + (targetPrice - currentPrice) * safeSmoothing;
  if (minMarketPrice != null) nextPrice = Math.max(nextPrice, minMarketPrice);
  if (maxMarketPrice != null) nextPrice = Math.min(nextPrice, maxMarketPrice);

  return normalizeResourcePrice(nextPrice, basePrice);
};

const normalizeBuildingDefinitions = (
  list: BuildingDefinition[],
): BuildingDefinition[] =>
  list.map((building) => ({
    ...building,
    startingDucats: normalizePositiveNumber(building.startingDucats),
    consumptionByResourceId: normalizeResourceMap(building.consumptionByResourceId),
    extractionByResourceId: normalizeResourceMap(building.extractionByResourceId),
    productionByResourceId: normalizeResourceMap(building.productionByResourceId),
  }));

const normalizeResources = (list: Trait[]): Trait[] =>
  list.map((resource) => {
    const basePrice = normalizeResourcePrice(resource.basePrice);
    const minMarketPrice = normalizeOptionalResourcePrice(resource.minMarketPrice);
    const maxMarketPrice = normalizeOptionalResourcePrice(resource.maxMarketPrice);
    const infrastructureCostPerUnit = normalizeInfrastructureCostPerUnit(
      resource.infrastructureCostPerUnit,
    );
    const boundedMin =
      minMarketPrice == null ? undefined : Math.min(minMarketPrice, maxMarketPrice ?? minMarketPrice);
    const boundedMax =
      maxMarketPrice == null ? undefined : Math.max(maxMarketPrice, boundedMin ?? maxMarketPrice);
    return {
      ...resource,
      basePrice,
      minMarketPrice: boundedMin,
      maxMarketPrice: boundedMax,
      infrastructureCostPerUnit,
    };
  });

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

const fertilityColor = (value: number) => {
  const t = clamp01(value / 100);
  const hue = 35 + 85 * t;
  const lightness = 40 + t * 30;
  return `hsl(${hue} 55% ${lightness}%)`;
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
        province.buildingsBuilt = (province.buildingsBuilt as BuiltBuilding[]).map(
          (entry) => {
            const owner =
              entry.owner.type === 'state'
                ? {
                    type: 'state' as const,
                    countryId: entry.owner.countryId ?? province.ownerCountryId ?? 'state',
                  }
                : entry.owner;
            return {
              ...entry,
              owner,
              warehouseByResourceId: normalizeResourceMap(entry.warehouseByResourceId),
              ducats:
                Number.isFinite(entry.ducats) && Number(entry.ducats) > 0
                  ? Number(entry.ducats)
                  : undefined,
              lastProductivity:
                Number.isFinite(entry.lastProductivity)
                  ? clamp01(Number(entry.lastProductivity))
                  : 1,
              lastPurchaseNeedByResourceId: normalizeResourceMap(
                entry.lastPurchaseNeedByResourceId,
              ),
              lastPurchasedByResourceId: normalizeResourceMap(
                entry.lastPurchasedByResourceId,
              ),
              lastPurchaseCostDucats:
                Number.isFinite(entry.lastPurchaseCostDucats) &&
                Number(entry.lastPurchaseCostDucats) >= 0
                  ? Number(entry.lastPurchaseCostDucats)
                  : 0,
              lastPurchaseCostByResourceId: normalizeResourceMap(
                entry.lastPurchaseCostByResourceId,
              ),
              lastSoldByResourceId: normalizeResourceMap(
                entry.lastSoldByResourceId,
              ),
              lastSalesRevenueDucats:
                Number.isFinite(entry.lastSalesRevenueDucats) &&
                Number(entry.lastSalesRevenueDucats) >= 0
                  ? Number(entry.lastSalesRevenueDucats)
                  : 0,
              lastSalesRevenueByResourceId: normalizeResourceMap(
                entry.lastSalesRevenueByResourceId,
              ),
              lastConsumedByResourceId: normalizeResourceMap(
                entry.lastConsumedByResourceId,
              ),
              lastExtractedByResourceId: normalizeResourceMap(
                entry.lastExtractedByResourceId,
              ),
              lastProducedByResourceId: normalizeResourceMap(
                entry.lastProducedByResourceId,
              ),
            };
          },
        );
      } else {
        const converted: BuiltBuilding[] = [];
        (province.buildingsBuilt as unknown as string[]).forEach((id) => {
          converted.push({
            buildingId: id,
            owner: {
              type: 'state',
              countryId: province.ownerCountryId ?? 'state',
            },
            warehouseByResourceId: undefined,
            ducats: undefined,
            lastProductivity: 1,
            lastPurchaseNeedByResourceId: undefined,
            lastPurchasedByResourceId: undefined,
            lastPurchaseCostDucats: 0,
            lastPurchaseCostByResourceId: undefined,
            lastSoldByResourceId: undefined,
            lastSalesRevenueDucats: 0,
            lastSalesRevenueByResourceId: undefined,
            lastConsumedByResourceId: undefined,
            lastExtractedByResourceId: undefined,
            lastProducedByResourceId: undefined,
          });
        });
        province.buildingsBuilt = converted;
      }
    } else {
      const converted: BuiltBuilding[] = [];
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
              warehouseByResourceId: undefined,
              ducats: undefined,
              lastProductivity: 1,
              lastPurchaseNeedByResourceId: undefined,
              lastPurchasedByResourceId: undefined,
              lastPurchaseCostDucats: 0,
              lastPurchaseCostByResourceId: undefined,
              lastSoldByResourceId: undefined,
              lastSalesRevenueDucats: 0,
              lastSalesRevenueByResourceId: undefined,
              lastConsumedByResourceId: undefined,
              lastExtractedByResourceId: undefined,
              lastProducedByResourceId: undefined,
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
    province.lastLogisticsConsumedByCategory = normalizeResourceMap(
      province.lastLogisticsConsumedByCategory,
    );

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
const defaultResourceCategories: ResourceCategory[] = [
  { id: 'resource-category-liquid', name: 'Жидкость', color: '#38bdf8' },
  { id: 'resource-category-gas', name: 'Газ', color: '#a78bfa' },
  { id: 'resource-category-energy', name: 'Энергия', color: '#f59e0b' },
  { id: 'resource-category-goods', name: 'Товар', color: '#22c55e' },
  { id: 'resource-category-service', name: 'Услуга', color: '#f472b6' },
];

const initialMapLayers: MapLayer[] = [
  { id: 'political', name: 'Политическая', visible: true },
  { id: 'cultural', name: 'Культурная', visible: false },
  { id: 'landscape', name: 'Ландшафт', visible: false },
  { id: 'continent', name: 'Континент', visible: false },
  { id: 'region', name: 'Регион', visible: false },
  { id: 'climate', name: 'Климат', visible: false },
  { id: 'religion', name: 'Религии', visible: false },
  { id: 'resources', name: 'Ресурсы', visible: false },
  { id: 'fertility', name: 'Плодородность', visible: false },
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
    marketCapitalGraceTurns: 3,
    marketDefaultResourceBasePrice: DEFAULT_RESOURCE_BASE_PRICE,
    marketPriceSmoothing: MARKET_PRICE_SMOOTHING,
    marketPriceHistoryLength: MARKET_PRICE_HISTORY_LENGTH,
    marketPriceEpsilon: MARKET_PRICE_EPSILON,
    startingColonizationPoints: 100,
    startingConstructionPoints: 100,
    sciencePointsPerTurn: 0,
    culturePointsPerTurn: 0,
    religionPointsPerTurn: 0,
    goldPerTurn: 0,
    ducatsPerTurn: 0,
    startingSciencePoints: 0,
    startingCulturePoints: 0,
    startingReligionPoints: 0,
    startingGold: 0,
    startingDucats: 100000,
    colonizationMaxActive: 0,
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
  const [continents, setContinents] = useState<Trait[]>([]);
  const [regions, setRegions] = useState<Trait[]>([]);
  const [cultures, setCultures] = useState<Trait[]>([
    { id: createId(), name: 'Северяне', color: '#fb7185' },
    { id: createId(), name: 'Южане', color: '#f97316' },
  ]);
  const [resources, setResources] = useState<Trait[]>([]);
  const [resourceCategories, setResourceCategories] = useState<ResourceCategory[]>(
    defaultResourceCategories,
  );
  const [buildings, setBuildings] = useState<BuildingDefinition[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [diplomacyAgreements, setDiplomacyAgreements] = useState<
    DiplomacyAgreement[]
  >([]);
  const [diplomacyProposals, setDiplomacyProposals] = useState<
    DiplomacyProposal[]
  >([]);
  const [logistics, setLogistics] = useState<LogisticsState>(
    createDefaultLogisticsState(),
  );
  const [markets, setMarkets] = useState<Market[]>([]);
  const [diplomacyInboxOpen, setDiplomacyInboxOpen] = useState(false);
  const [diplomacySentNotice, setDiplomacySentNotice] = useState<{
    open: boolean;
    toCountryName: string;
  }>({ open: false, toCountryName: '' });
  const pendingDiplomacyProposals = useMemo(
    () =>
      diplomacyProposals.filter(
        (proposal) =>
          proposal.toCountryId === activeCountryId ||
          (proposal.kind === 'renewal' &&
            Boolean(
              activeCountryId &&
                proposal.targetCountryIds?.includes(activeCountryId) &&
                !proposal.approvals?.includes(activeCountryId),
            )),
      ),
    [diplomacyProposals, activeCountryId],
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    provinceId: string;
  } | null>(null);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [marketsOpen, setMarketsOpen] = useState(false);
  const [logisticsRoutePlannerActive, setLogisticsRoutePlannerActive] =
    useState(false);
  const [logisticsRouteProvinceIds, setLogisticsRouteProvinceIds] = useState<string[]>(
    [],
  );
  const [routePlannerHint, setRoutePlannerHint] = useState<string | undefined>(
    undefined,
  );
  const [logisticsRouteDraft, setLogisticsRouteDraft] = useState<{
    name: string;
    routeTypeId: string;
  } | null>(null);
  const [adjacencyRecomputeRequested, setAdjacencyRecomputeRequested] =
    useState(false);
  const [colonizationModalOpen, setColonizationModalOpen] = useState(false);
  const [constructionModalOpen, setConstructionModalOpen] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | undefined>(
    undefined,
  );
  const marketDefaultResourceBasePrice = Math.max(
    0.01,
    gameSettings.marketDefaultResourceBasePrice ?? DEFAULT_RESOURCE_BASE_PRICE,
  );
  const marketPriceSmoothing = clamp01(
    gameSettings.marketPriceSmoothing ?? MARKET_PRICE_SMOOTHING,
  );
  const marketPriceHistoryLength = Math.max(
    1,
    Math.floor(gameSettings.marketPriceHistoryLength ?? MARKET_PRICE_HISTORY_LENGTH),
  );
  const marketPriceEpsilon = Math.max(
    0,
    gameSettings.marketPriceEpsilon ?? MARKET_PRICE_EPSILON,
  );
  const pendingMarketPriceMetricsRef = useRef<{
    demandByMarketAndResource: Map<string, Record<string, number>>;
    factualSupplyByMarketAndResource: Map<string, Record<string, number>>;
    marketVolumeByMarketAndResource: Map<string, Record<string, number>>;
    productionMaxByMarketAndResource: Map<string, Record<string, number>>;
  } | null>(null);

  const ensureMarketsMapLayer = useCallback((layers: MapLayer[]) => {
    if (layers.some((layer) => layer.id === 'markets')) return layers;
    return [
      ...layers,
      { id: 'markets', name: 'Рынки', visible: false },
    ];
  }, []);

  useEffect(() => {
    setMapLayers((prev) => ensureMarketsMapLayer(prev));
  }, [ensureMarketsMapLayer]);

  useEffect(() => {
    setLogistics((prev) => {
      const nodes = ensureBaseLogisticsNodes(provinces, countries, prev.nodes);
      return {
        ...prev,
        nodes,
      };
    });
  }, [provinces, countries, logistics.edges, turn]);

  const getActiveColonizationsCount = (countryId?: string) => {
    if (!countryId) return 0;
    return Object.values(provinces).reduce((sum, province) => {
      if (!province.colonizationProgress) return sum;
      return countryId in province.colonizationProgress ? sum + 1 : sum;
    }, 0);
  };

  const createCountry = (country: Omit<Country, 'id' | 'colonizationPoints'>) => {
    const id = createId();
    const newCountry: Country = {
      id,
      colonizationPoints: Math.max(
        0,
        gameSettings.startingColonizationPoints ?? 100,
      ),
      constructionPoints: Math.max(
        0,
        gameSettings.startingConstructionPoints ?? 100,
      ),
      sciencePoints: Math.max(0, gameSettings.startingSciencePoints ?? 0),
      culturePoints: Math.max(0, gameSettings.startingCulturePoints ?? 0),
      religionPoints: Math.max(0, gameSettings.startingReligionPoints ?? 0),
      gold: Math.max(0, gameSettings.startingGold ?? 0),
      ducats: Math.max(0, gameSettings.startingDucats ?? 100000),
      ...country,
    };
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

  const addLogisticsEdge = (edge: LogisticsEdge) => {
    setLogistics((prev) => {
      const exists = prev.edges.some(
        (entry) =>
          ((entry.fromNodeId === edge.fromNodeId &&
            entry.toNodeId === edge.toNodeId) ||
            (entry.fromNodeId === edge.toNodeId &&
              entry.toNodeId === edge.fromNodeId)) &&
          (entry.routeTypeId ?? '') === (edge.routeTypeId ?? '') &&
          (entry.ownerCountryId ?? '') === (edge.ownerCountryId ?? ''),
      );
      if (exists) return prev;
      return {
        ...prev,
        edges: [...prev.edges, edge],
      };
    });
  };

  const addLogisticsRouteType = (payload: {
    name: string;
    color: string;
    lineWidth: number;
    dashPattern?: string;
    constructionCostPerSegment?: number;
    allowProvinceSkipping?: boolean;
    requiredBuildingIds?: string[];
    requiredBuildingsMode?: 'all' | 'any';
    landscape?: { anyOf?: string[]; noneOf?: string[] };
    allowAllLandscapes?: boolean;
    marketAccessCategoryIds?: string[];
    allowAllMarketCategories?: boolean;
    transportCapacityPerLevelByCategory?: Record<string, number>;
  }) => {
    setLogistics((prev) => ({
      ...prev,
      routeTypes: [
        ...prev.routeTypes,
        {
          id: createId(),
          name: payload.name,
          color: payload.color,
          lineWidth: Math.max(0.4, payload.lineWidth),
          dashPattern: payload.dashPattern?.trim() || undefined,
          constructionCostPerSegment: Math.max(
            0,
            Math.floor(payload.constructionCostPerSegment ?? 0),
          ),
          allowProvinceSkipping: Boolean(payload.allowProvinceSkipping),
          requiredBuildingIds: Array.from(
            new Set(payload.requiredBuildingIds ?? []),
          ),
          requiredBuildingsMode: payload.requiredBuildingsMode ?? 'all',
          landscape: {
            anyOf: Array.from(new Set(payload.landscape?.anyOf ?? [])),
            noneOf: Array.from(new Set(payload.landscape?.noneOf ?? [])),
          },
          allowAllLandscapes: payload.allowAllLandscapes ?? true,
          marketAccessCategoryIds: Array.from(
            new Set(payload.marketAccessCategoryIds ?? []),
          ),
          allowAllMarketCategories: payload.allowAllMarketCategories ?? true,
          transportCapacityPerLevelByCategory: {
            ...(payload.transportCapacityPerLevelByCategory ?? {}),
          },
        },
      ],
    }));
  };

  const updateLogisticsRouteType = (
    id: string,
    patch: Partial<
      Pick<
        LogisticsRouteType,
        | 'name'
        | 'color'
        | 'lineWidth'
        | 'dashPattern'
        | 'constructionCostPerSegment'
        | 'allowProvinceSkipping'
        | 'requiredBuildingIds'
        | 'requiredBuildingsMode'
        | 'landscape'
        | 'allowAllLandscapes'
        | 'marketAccessCategoryIds'
        | 'allowAllMarketCategories'
        | 'transportCapacityPerLevelByCategory'
      >
    >,
  ) => {
    setLogistics((prev) => ({
      ...prev,
      routeTypes: prev.routeTypes.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              lineWidth:
                patch.lineWidth == null ? item.lineWidth : Math.max(0.4, patch.lineWidth),
              dashPattern:
                patch.dashPattern == null
                  ? item.dashPattern
                  : patch.dashPattern.trim() || undefined,
              constructionCostPerSegment:
                patch.constructionCostPerSegment == null
                  ? item.constructionCostPerSegment ?? 0
                  : Math.max(0, Math.floor(patch.constructionCostPerSegment)),
              allowProvinceSkipping:
                patch.allowProvinceSkipping == null
                  ? item.allowProvinceSkipping ?? false
                  : patch.allowProvinceSkipping,
              requiredBuildingIds:
                patch.requiredBuildingIds == null
                  ? item.requiredBuildingIds ?? []
                  : Array.from(new Set(patch.requiredBuildingIds)),
              requiredBuildingsMode:
                patch.requiredBuildingsMode == null
                  ? item.requiredBuildingsMode ?? 'all'
                  : patch.requiredBuildingsMode,
              landscape:
                patch.landscape == null
                  ? item.landscape ?? { anyOf: [], noneOf: [] }
                  : {
                      anyOf: Array.from(new Set(patch.landscape.anyOf ?? [])),
                      noneOf: Array.from(new Set(patch.landscape.noneOf ?? [])),
                    },
              allowAllLandscapes:
                patch.allowAllLandscapes == null
                  ? item.allowAllLandscapes ?? true
                  : patch.allowAllLandscapes,
              marketAccessCategoryIds:
                patch.marketAccessCategoryIds == null
                  ? item.marketAccessCategoryIds ?? []
                  : Array.from(new Set(patch.marketAccessCategoryIds)),
              allowAllMarketCategories:
                patch.allowAllMarketCategories == null
                  ? item.allowAllMarketCategories ?? true
                  : patch.allowAllMarketCategories,
              transportCapacityPerLevelByCategory:
                patch.transportCapacityPerLevelByCategory == null
                  ? item.transportCapacityPerLevelByCategory ?? {}
                  : { ...patch.transportCapacityPerLevelByCategory },
            }
          : item,
      ),
    }));
  };

  const deleteLogisticsRouteType = (id: string) => {
    setLogistics((prev) => {
      if (prev.routeTypes.length <= 1) return prev;
      const fallback = prev.routeTypes.find((item) => item.id !== id);
      const nextTypes = prev.routeTypes.filter((item) => item.id !== id);
      return {
        ...prev,
        routeTypes: nextTypes,
        edges: prev.edges.map((edge) =>
          edge.routeTypeId === id && fallback
            ? { ...edge, routeTypeId: fallback.id }
            : edge,
        ),
      };
    });
  };

  const addMarket = (payload: {
    actorCountryId?: string;
    name: string;
    leaderCountryId: string;
    memberCountryIds: string[];
    color?: string;
    logoDataUrl?: string;
    capitalProvinceId?: string;
  }) => {
    if (!payload.actorCountryId) return;
    if (payload.actorCountryId !== payload.leaderCountryId) return;
    if (!payload.capitalProvinceId) return;
    const capitalProvince = provinces[payload.capitalProvinceId];
    if (!capitalProvince) return;
    if (capitalProvince.ownerCountryId !== payload.leaderCountryId) return;
    const creatorOwnedProvinceIds = Object.values(provinces).filter(
      (province) => province.ownerCountryId === payload.leaderCountryId,
    );
    if (creatorOwnedProvinceIds.length === 0) return;
    const marketId = createId();
    setMarkets((prev) => {
      const alreadyInMarket = prev.some((market) =>
        payload.actorCountryId
          ? market.memberCountryIds.includes(payload.actorCountryId)
          : false,
      );
      if (alreadyInMarket) return prev;
      const members = Array.from(
        new Set([payload.leaderCountryId, ...payload.memberCountryIds]),
      );
      const next = prev
        .map((market) => ({
          ...market,
          memberCountryIds: market.memberCountryIds.filter(
            (countryId) => !members.includes(countryId),
          ),
        }))
        .filter(
          (market) =>
            market.memberCountryIds.length > 0 &&
            market.memberCountryIds.includes(market.leaderCountryId),
        );
      return [
        ...next,
        {
          id: marketId,
          name: payload.name,
          leaderCountryId: payload.leaderCountryId,
          creatorCountryId: payload.actorCountryId,
          color:
            payload.color ??
            countries.find((country) => country.id === payload.leaderCountryId)?.color ??
            '#22c55e',
          logoDataUrl: payload.logoDataUrl,
          memberCountryIds: members,
          warehouseByResourceId: {},
          priceByResourceId: Object.fromEntries(
            resources.map((resource) => [
              resource.id,
              normalizeResourcePrice(resource.basePrice),
            ]),
          ),
          priceHistoryByResourceId: Object.fromEntries(
            resources.map((resource) => {
              const initialPrice = normalizeResourcePrice(resource.basePrice);
              return [resource.id, [initialPrice]];
            }),
          ),
          demandHistoryByResourceId: Object.fromEntries(
            resources.map((resource) => [resource.id, [0]]),
          ),
          offerHistoryByResourceId: Object.fromEntries(
            resources.map((resource) => [resource.id, [0]]),
          ),
          productionFactHistoryByResourceId: Object.fromEntries(
            resources.map((resource) => [resource.id, [0]]),
          ),
          productionMaxHistoryByResourceId: Object.fromEntries(
            resources.map((resource) => [resource.id, [0]]),
          ),
          capitalProvinceId: payload.capitalProvinceId,
          capitalLostSinceTurn: undefined,
          createdTurn: turn,
        },
      ];
    });
  };

  const updateMarket = (
    marketId: string,
    patch: {
      actorCountryId?: string;
      name?: string;
      leaderCountryId?: string;
      memberCountryIds?: string[];
      color?: string;
      logoDataUrl?: string;
      capitalProvinceId?: string;
    },
  ) => {
    setMarkets((prev) => {
      const current = prev.find((market) => market.id === marketId);
      if (!current) return prev;
      if (!patch.actorCountryId || patch.actorCountryId !== current.creatorCountryId) {
        return prev;
      }
      const leaderCountryId = patch.leaderCountryId ?? current.leaderCountryId;
      const memberCountryIds = Array.from(
        new Set([leaderCountryId, ...(patch.memberCountryIds ?? current.memberCountryIds)]),
      );
      const nextCapitalProvinceId = patch.capitalProvinceId ?? current.capitalProvinceId;
      if (!nextCapitalProvinceId) return prev;
      const capitalProvince = provinces[nextCapitalProvinceId];
      if (!capitalProvince) return prev;
      if (capitalProvince.ownerCountryId !== leaderCountryId) return prev;
      return prev
        .map((market) => {
          if (market.id === marketId) {
            return {
              ...market,
              name: patch.name ?? market.name,
              leaderCountryId,
              color: patch.color ?? market.color,
              logoDataUrl:
                typeof patch.logoDataUrl === 'undefined'
                  ? market.logoDataUrl
                  : patch.logoDataUrl,
              memberCountryIds,
              capitalProvinceId: nextCapitalProvinceId,
              capitalLostSinceTurn: undefined,
            };
          }
          return {
            ...market,
            memberCountryIds: market.memberCountryIds.filter(
              (countryId) => !memberCountryIds.includes(countryId),
            ),
          };
        })
        .filter(
          (market) =>
            market.memberCountryIds.length > 0 &&
            market.memberCountryIds.includes(market.leaderCountryId),
        );
    });
  };

  const deleteMarket = (marketId: string, actorCountryId?: string) => {
    setMarkets((prev) =>
      prev.filter(
        (market) =>
          market.id !== marketId || market.creatorCountryId !== actorCountryId,
      ),
    );
  };

  const leaveMarket = (countryId?: string, marketId?: string) => {
    if (!countryId) return;
    setMarkets((prev) =>
      prev
        .map((market) => {
          if (marketId && market.id !== marketId) return market;
          if (!market.memberCountryIds.includes(countryId)) return market;
          if (market.leaderCountryId === countryId) return market;
          return {
            ...market,
            memberCountryIds: market.memberCountryIds.filter((id) => id !== countryId),
          };
        })
        .filter(
          (market) =>
            market.memberCountryIds.length > 0 &&
            market.memberCountryIds.includes(market.leaderCountryId),
        ),
    );
    addEvent({
      category: 'economy',
      message: `${countries.find((entry) => entry.id === countryId)?.name ?? countryId} вышла из рынка.`,
      countryId,
      priority: 'low',
    });
  };

  const tradeWithMarketWarehouse = (payload: {
    marketId: string;
    actorCountryId?: string;
    resourceId: string;
    amount: number;
    action: 'buy' | 'sell';
  }) => {
    if (!payload.actorCountryId) return;
    const amount = Math.max(1, Math.floor(payload.amount || 0));
    if (!Number.isFinite(amount) || amount <= 0) return;

    let executed = false;
    setMarkets((prev) =>
      prev.map((market) => {
        if (market.id !== payload.marketId) return market;
        if (!market.memberCountryIds.includes(payload.actorCountryId as string)) {
          return market;
        }
        const stockMap = { ...(market.warehouseByResourceId ?? {}) };
        const current = Math.max(0, stockMap[payload.resourceId] ?? 0);
        const delta = payload.action === 'sell' ? amount : -amount;
        const next = current + delta;
        if (next < 0) return market;
        stockMap[payload.resourceId] = next;
        executed = true;
        return {
          ...market,
          warehouseByResourceId: stockMap,
        };
      }),
    );

    if (!executed) return;
    const actorName =
      countries.find((country) => country.id === payload.actorCountryId)?.name ??
      payload.actorCountryId;
    const resourceName =
      resources.find((resource) => resource.id === payload.resourceId)?.name ??
      payload.resourceId;
    addEvent({
      category: 'economy',
      countryId: payload.actorCountryId,
      priority: 'low',
      message:
        payload.action === 'sell'
          ? `${actorName} продала ${amount} ед. ресурса "${resourceName}" на склад рынка.`
          : `${actorName} купила ${amount} ед. ресурса "${resourceName}" со склада рынка.`,
    });
  };

  const setRouteCountryStatus = (
    routeId: string,
    countryId: string,
    status: 'open' | 'closed',
  ) => {
    setLogistics((prev) => ({
      ...prev,
      routes: prev.routes.map((route) =>
        route.id === routeId
          ? {
              ...route,
              countryStatuses: {
                ...(route.countryStatuses ?? {}),
                [countryId]: status,
              },
            }
          : route,
      ),
    }));
  };

  const setRouteLevel = (routeId: string, level: number, actorCountryId?: string) => {
    const safeLevel = Math.max(1, Math.floor(level || 1));
    setLogistics((prev) => ({
      ...prev,
      routes: prev.routes.map((route) => {
        if (route.id !== routeId) return route;
        if (!actorCountryId || route.ownerCountryId !== actorCountryId) return route;
        return { ...route, level: safeLevel };
      }),
    }));
  };

  const demolishLogisticsRoute = (routeId: string) => {
    if (!activeCountryId) return;
    const route = logistics.routes.find((entry) => entry.id === routeId);
    if (!route) return;

    const totalSegments = Math.max(0, route.provinceIds.length - 1);
    if (totalSegments <= 0) return;

    const isOwner = route.ownerCountryId === activeCountryId;
    const removableSegmentIndexes: number[] = [];
    for (let seg = 0; seg < totalSegments; seg += 1) {
      if (isOwner) {
        removableSegmentIndexes.push(seg);
        continue;
      }
      const provinceId = route.provinceIds[seg + 1];
      if (provinces[provinceId]?.ownerCountryId === activeCountryId) {
        removableSegmentIndexes.push(seg);
      }
    }
    if (removableSegmentIndexes.length === 0) return;

    const routeType = logistics.routeTypes.find(
      (type) => type.id === route.routeTypeId,
    );
    const fallbackTotalCost = Math.max(
      0,
      Math.floor(routeType?.constructionCostPerSegment ?? 0) * totalSegments,
    );
    const routeTotalCost = Math.max(
      0,
      route.constructionRequiredPoints ?? fallbackTotalCost,
    );
    const removedBaseCost = isOwner
      ? routeTotalCost
      : totalSegments > 0
        ? (routeTotalCost * removableSegmentIndexes.length) / totalSegments
        : 0;
    const percent = Math.max(0, gameSettings.demolitionCostPercent ?? 20);
    const demolishCost = Math.ceil((removedBaseCost * percent) / 100);

    const actorCountry = countries.find((entry) => entry.id === activeCountryId);
    const actorPoints = actorCountry?.constructionPoints ?? 0;
    if (actorPoints < demolishCost) {
      addEvent({
        category: 'economy',
        message: `Недостаточно очков строительства для сноса маршрута "${route.name}". Требуется: ${demolishCost}.`,
        countryId: activeCountryId,
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

    setLogistics((prev) => {
      const targetIndex = prev.routes.findIndex((entry) => entry.id === routeId);
      if (targetIndex === -1) return prev;
      const target = prev.routes[targetIndex];
      const targetSegments = Math.max(0, target.provinceIds.length - 1);
      if (targetSegments <= 0) return prev;

      const targetIsOwner = target.ownerCountryId === activeCountryId;
      const removedSegments = new Set<number>();
      for (let seg = 0; seg < targetSegments; seg += 1) {
        if (targetIsOwner) {
          removedSegments.add(seg);
          continue;
        }
        const provinceId = target.provinceIds[seg + 1];
        if (provinces[provinceId]?.ownerCountryId === activeCountryId) {
          removedSegments.add(seg);
        }
      }
      if (removedSegments.size === 0) return prev;

      const runs: Array<{ start: number; end: number }> = [];
      let runStart: number | null = null;
      for (let seg = 0; seg < targetSegments; seg += 1) {
        const isKept = !removedSegments.has(seg);
        if (isKept && runStart == null) {
          runStart = seg;
        }
        const closesRun =
          runStart != null && (!isKept || seg === targetSegments - 1);
        if (closesRun) {
          const runEnd = isKept ? seg : seg - 1;
          if (runEnd >= runStart) {
            runs.push({ start: runStart, end: runEnd });
          }
          runStart = null;
        }
      }

      const routeRequiredTotal = Math.max(0, target.constructionRequiredPoints ?? 0);
      const routeProgressTotal = Math.max(
        0,
        target.constructionProgressPoints ?? routeRequiredTotal,
      );
      const routeIsCompleted =
        routeRequiredTotal <= 0 || routeProgressTotal >= routeRequiredTotal;

      const segmentToRouteId = new Map<number, string>();
      const nextRoutesForTarget = runs.map((run, index) => {
        const segmentCount = run.end - run.start + 1;
        const nextRouteId = index === 0 ? target.id : createId();
        for (let seg = run.start; seg <= run.end; seg += 1) {
          segmentToRouteId.set(seg, nextRouteId);
        }
        const requiredPart =
          routeRequiredTotal > 0
            ? Math.round((routeRequiredTotal * segmentCount) / targetSegments)
            : 0;
        const progressPart =
          routeRequiredTotal <= 0
            ? 0
            : routeIsCompleted
              ? requiredPart
              : Math.min(
                  requiredPart,
                  Math.round((routeProgressTotal * segmentCount) / targetSegments),
                );
        return {
          ...target,
          id: nextRouteId,
          name:
            index === 0 ? target.name : `${target.name} (часть ${index + 1})`,
          provinceIds: target.provinceIds.slice(run.start, run.end + 2),
          constructionRequiredPoints: requiredPart,
          constructionProgressPoints: progressPart,
        };
      });

      const edgeSegmentByKey = new Map<string, number>();
      const toSegmentKey = (a: string, b: string) =>
        a < b ? `${a}::${b}` : `${b}::${a}`;
      for (let seg = 0; seg < target.provinceIds.length - 1; seg += 1) {
        const a = target.provinceIds[seg];
        const b = target.provinceIds[seg + 1];
        edgeSegmentByKey.set(toSegmentKey(a, b), seg);
      }

      const nextEdges = prev.edges.flatMap((edge) => {
        if (edge.routeId !== routeId) return [edge];
        if (
          !edge.fromNodeId.startsWith('province:') ||
          !edge.toNodeId.startsWith('province:')
        ) {
          return [];
        }
        const fromProvinceId = edge.fromNodeId.slice('province:'.length);
        const toProvinceId = edge.toNodeId.slice('province:'.length);
        const segmentIndex = edgeSegmentByKey.get(
          toSegmentKey(fromProvinceId, toProvinceId),
        );
        if (segmentIndex == null) return [];
        const nextRouteId = segmentToRouteId.get(segmentIndex);
        if (!nextRouteId) return [];
        if (nextRouteId === routeId) return [edge];
        return [{ ...edge, routeId: nextRouteId }];
      });

      const nextRoutes = [...prev.routes];
      nextRoutes.splice(targetIndex, 1, ...nextRoutesForTarget);
      return {
        ...prev,
        routes: nextRoutes.filter((entry) => entry.provinceIds.length > 1),
        edges: nextEdges,
      };
    });

    const actorName = actorCountry?.name ?? activeCountryId;
    addEvent({
      category: 'economy',
      message: isOwner
        ? `${actorName} снесла маршрут "${route.name}" (стоимость: ${demolishCost}).`
        : `${actorName} снесла графы маршрута "${route.name}" на своей территории (стоимость: ${demolishCost}).`,
      countryId: activeCountryId,
      priority: 'low',
    });
  };

  useEffect(() => {
    setLogistics((prev) => {
      if (prev.routes.length === 0 || prev.edges.length === 0) return prev;

      const routeById = new Map(prev.routes.map((route) => [route.id, route]));
      let changed = false;
      const nextEdges = prev.edges.map((edge) => {
        if (!edge.routeId) return edge;
        const route = routeById.get(edge.routeId);
        if (!route || route.provinceIds.length < 2) return edge;
        const requiredPoints = Math.max(0, route.constructionRequiredPoints ?? 0);
        const progressPoints = Math.max(
          0,
          route.constructionProgressPoints ?? requiredPoints,
        );
        if (requiredPoints > 0 && progressPoints < requiredPoints) {
          const isActive = false;
          if ((edge.active ?? true) === isActive) return edge;
          changed = true;
          return { ...edge, active: isActive };
        }

        const fromProvinceId = edge.fromNodeId.startsWith('province:')
          ? edge.fromNodeId.slice('province:'.length)
          : '';
        const toProvinceId = edge.toNodeId.startsWith('province:')
          ? edge.toNodeId.slice('province:'.length)
          : '';
        if (!fromProvinceId || !toProvinceId) return edge;

        let segmentIndex = -1;
        for (let i = 0; i < route.provinceIds.length - 1; i += 1) {
          const a = route.provinceIds[i];
          const b = route.provinceIds[i + 1];
          if (
            (a === fromProvinceId && b === toProvinceId) ||
            (a === toProvinceId && b === fromProvinceId)
          ) {
            segmentIndex = i;
            break;
          }
        }
        if (segmentIndex === -1) return edge;

        let cutoff = Number.POSITIVE_INFINITY;
        for (let i = 1; i < route.provinceIds.length; i += 1) {
          const provinceId = route.provinceIds[i];
          const ownerId = provinces[provinceId]?.ownerCountryId;
          if (!ownerId) continue;
          const status = route.countryStatuses?.[ownerId] ?? 'open';
          if (status === 'closed') {
            cutoff = Math.min(cutoff, i - 1);
            break;
          }
        }

        const isActive = segmentIndex < cutoff;
        if ((edge.active ?? true) === isActive) return edge;
        changed = true;
        return { ...edge, active: isActive };
      });

      return changed ? { ...prev, edges: nextEdges } : prev;
    });
  }, [provinces, logistics.routes]);

  useEffect(() => {
    if (turn <= 0) return;
    setProvinces((prev) => {
      const categoryIds = resourceCategories.map((category) => category.id);
      const routeById = new Map(logistics.routes.map((route) => [route.id, route]));
      const routeTypeById = new Map(
        logistics.routeTypes.map((routeType) => [routeType.id, routeType]),
      );
      const activeProvincesByRoute = new Map<string, Set<string>>();
      const parseProvinceNodeId = (nodeId: string) =>
        nodeId.startsWith('province:') ? nodeId.slice('province:'.length) : undefined;

      logistics.edges.forEach((edge) => {
        if (!edge.routeId || edge.active === false) return;
        const fromProvinceId = parseProvinceNodeId(edge.fromNodeId);
        const toProvinceId = parseProvinceNodeId(edge.toNodeId);
        if (!fromProvinceId || !toProvinceId) return;
        if (!prev[fromProvinceId] || !prev[toProvinceId]) return;
        if (!activeProvincesByRoute.has(edge.routeId)) {
          activeProvincesByRoute.set(edge.routeId, new Set<string>());
        }
        const set = activeProvincesByRoute.get(edge.routeId);
        set?.add(fromProvinceId);
        set?.add(toProvinceId);
      });

      const nextPointsByProvince = new Map<string, Record<string, number>>();
      activeProvincesByRoute.forEach((provinceIds, routeId) => {
        const route = routeById.get(routeId);
        if (!route) return;
        const routeType = routeTypeById.get(route.routeTypeId);
        if (!routeType) return;
        const level = Math.max(1, Math.floor(route.level ?? 1));
        const perLevel = routeType.transportCapacityPerLevelByCategory ?? {};
        const allowedCategories =
          routeType.allowAllMarketCategories ?? true
            ? categoryIds
            : (routeType.marketAccessCategoryIds ?? []).filter((id) =>
                categoryIds.includes(id),
              );
        if (allowedCategories.length === 0) return;
        provinceIds.forEach((provinceId) => {
          const current = nextPointsByProvince.get(provinceId) ?? {};
          const next = { ...current };
          allowedCategories.forEach((categoryId) => {
            const perLevelValue = Math.max(0, perLevel[categoryId] ?? 0);
            const gain = perLevelValue * level;
            if (gain <= 0) return;
            next[categoryId] = (next[categoryId] ?? 0) + gain;
          });
          nextPointsByProvince.set(provinceId, next);
        });
      });

      let changed = false;
      const next: ProvinceRecord = { ...prev };
      Object.values(prev).forEach((province) => {
        const expectedRaw = nextPointsByProvince.get(province.id) ?? {};
        const expected = Object.fromEntries(
          Object.entries(expectedRaw).filter(([, value]) => value > 0),
        );
        const current = province.logisticsPointsByCategory ?? {};
        const currentKeys = Object.keys(current);
        const expectedKeys = Object.keys(expected);
        const same =
          currentKeys.length === expectedKeys.length &&
          expectedKeys.every((key) => (current[key] ?? 0) === (expected[key] ?? 0));
        if (same) return;
        changed = true;
        next[province.id] = {
          ...province,
          logisticsPointsByCategory: expected,
        };
      });
      return changed ? next : prev;
    });
  }, [turn]);

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

    let buildingTasksCount = 0;
    Object.values(provinces).forEach((province) => {
      if (province.ownerCountryId !== countryId) return;
      const progress = province.constructionProgress ?? {};
      Object.values(progress).forEach((entries) => {
        buildingTasksCount += entries.length;
      });
    });

    const routeTaskIds = logistics.routes
      .filter((route) => {
        if (route.ownerCountryId !== countryId) return false;
        const required = Math.max(0, route.constructionRequiredPoints ?? 0);
        const progress = Math.max(
          0,
          route.constructionProgressPoints ?? required,
        );
        return required > 0 && progress < required;
      })
      .map((route) => route.id);

    const tasksCount = buildingTasksCount + routeTaskIds.length;
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

    const completedRoutes: { id: string; name: string }[] = [];
    if (routeTaskIds.length > 0) {
      setLogistics((prev) => {
        const routeTaskSet = new Set(routeTaskIds);
        let changed = false;
        const nextRoutes = prev.routes.map((route) => {
          if (!routeTaskSet.has(route.id)) return route;
          const required = Math.max(0, route.constructionRequiredPoints ?? 0);
          const current = Math.max(
            0,
            route.constructionProgressPoints ?? 0,
          );
          const updated = Math.min(required, current + share);
          if (updated >= required && current < required) {
            completedRoutes.push({ id: route.id, name: route.name });
          }
          if (updated === current) return route;
          changed = true;
          return {
            ...route,
            constructionProgressPoints: updated,
          };
        });
        const completedRouteIds = new Set(completedRoutes.map((item) => item.id));
        const nextEdges = prev.edges.map((edge) => {
          if (!edge.routeId || !completedRouteIds.has(edge.routeId)) return edge;
          if (edge.active === true) return edge;
          changed = true;
          return { ...edge, active: true };
        });
        return changed ? { ...prev, routes: nextRoutes, edges: nextEdges } : prev;
      });
    }

    completedRoutes.forEach((route) => {
      addEvent({
        category: 'economy',
        message: `Строительство маршрута завершено: ${route.name}.`,
        countryId,
        priority: 'medium',
      });
    });

    setCountries((prev) =>
      prev.map((c) =>
        c.id === countryId ? { ...c, constructionPoints: 0 } : c,
      ),
    );
  };

  const getOwnerCountryIdForBuilding = (
    owner: BuildingOwner,
    provinceOwnerCountryId?: string,
  ): string | undefined =>
    owner.type === 'state'
      ? owner.countryId || provinceOwnerCountryId
      : companies.find((company) => company.id === owner.companyId)?.countryId;

  const applyMarketPriceTurn = (metrics: {
    demandByMarketAndResource: Map<string, Record<string, number>>;
    factualSupplyByMarketAndResource: Map<string, Record<string, number>>;
    marketVolumeByMarketAndResource: Map<string, Record<string, number>>;
    productionMaxByMarketAndResource: Map<string, Record<string, number>>;
  }) => {
    setMarkets((prev) =>
      prev.map((market) => {
        const demand = metrics.demandByMarketAndResource.get(market.id) ?? {};
        const factualSupply =
          metrics.factualSupplyByMarketAndResource.get(market.id) ?? {};
        const marketVolume =
          metrics.marketVolumeByMarketAndResource.get(market.id) ?? {};
        const productionMax =
          metrics.productionMaxByMarketAndResource.get(market.id) ?? {};
        const nextPrices: Record<string, number> = {};
        resources.forEach((resource) => {
          const basePrice = normalizeResourcePrice(
            resource.basePrice,
            marketDefaultResourceBasePrice,
          );
          const currentPrice = normalizeResourcePrice(
            market.priceByResourceId?.[resource.id],
            basePrice,
          );
          const resourceDemand = Math.max(0, demand[resource.id] ?? 0);
          const resourceSupplyFact = Math.max(0, factualSupply[resource.id] ?? 0);
          const resourceMarketVolume = Math.max(0, marketVolume[resource.id] ?? 0);
          nextPrices[resource.id] = computeNextMarketPrice({
            currentPrice,
            basePrice,
            demand: resourceDemand,
            productionFact: resourceSupplyFact,
            marketVolume: resourceMarketVolume,
            minMarketPrice: resource.minMarketPrice,
            maxMarketPrice: resource.maxMarketPrice,
            smoothing: marketPriceSmoothing,
            epsilon: marketPriceEpsilon,
          });
        });
        const nextHistory: Record<string, number[]> = Object.fromEntries(
          resources.map((resource) => {
            const basePrice = normalizeResourcePrice(resource.basePrice);
            const nextPrice = normalizeResourcePrice(nextPrices[resource.id], basePrice);
            const prevHistory = normalizeResourcePriceHistory(
              market.priceHistoryByResourceId?.[resource.id],
              nextPrice,
              marketPriceHistoryLength,
            );
            return [
              resource.id,
              [...prevHistory, nextPrice].slice(-marketPriceHistoryLength),
            ];
          }),
        );
        const nextDemandHistory: Record<string, number[]> = Object.fromEntries(
          resources.map((resource) => {
            const resourceDemand = Math.max(0, demand[resource.id] ?? 0);
            const prevHistory = normalizeResourceAmountHistory(
              market.demandHistoryByResourceId?.[resource.id],
              resourceDemand,
              marketPriceHistoryLength,
            );
            return [
              resource.id,
              [...prevHistory, resourceDemand].slice(-marketPriceHistoryLength),
            ];
          }),
        );
        const nextOfferHistory: Record<string, number[]> = Object.fromEntries(
          resources.map((resource) => {
            const resourceSupplyFact = Math.max(0, factualSupply[resource.id] ?? 0);
            const resourceMarketVolume = Math.max(0, marketVolume[resource.id] ?? 0);
            const resourceOffer = resourceSupplyFact + resourceMarketVolume;
            const prevHistory = normalizeResourceAmountHistory(
              market.offerHistoryByResourceId?.[resource.id],
              resourceOffer,
              marketPriceHistoryLength,
            );
            return [
              resource.id,
              [...prevHistory, resourceOffer].slice(-marketPriceHistoryLength),
            ];
          }),
        );
        const nextProductionFactHistory: Record<string, number[]> = Object.fromEntries(
          resources.map((resource) => {
            const resourceSupplyFact = Math.max(0, factualSupply[resource.id] ?? 0);
            const prevHistory = normalizeResourceAmountHistory(
              market.productionFactHistoryByResourceId?.[resource.id],
              resourceSupplyFact,
              marketPriceHistoryLength,
            );
            return [
              resource.id,
              [...prevHistory, resourceSupplyFact].slice(-marketPriceHistoryLength),
            ];
          }),
        );
        const nextProductionMaxHistory: Record<string, number[]> = Object.fromEntries(
          resources.map((resource) => {
            const resourceProductionMax = Math.max(0, productionMax[resource.id] ?? 0);
            const prevHistory = normalizeResourceAmountHistory(
              market.productionMaxHistoryByResourceId?.[resource.id],
              resourceProductionMax,
              marketPriceHistoryLength,
            );
            return [
              resource.id,
              [...prevHistory, resourceProductionMax].slice(-marketPriceHistoryLength),
            ];
          }),
        );
        return {
          ...market,
          priceByResourceId: nextPrices,
          priceHistoryByResourceId: nextHistory,
          demandHistoryByResourceId: nextDemandHistory,
          offerHistoryByResourceId: nextOfferHistory,
          productionFactHistoryByResourceId: nextProductionFactHistory,
          productionMaxHistoryByResourceId: nextProductionMaxHistory,
        };
      }),
    );
  };

  const applyBuildingEconomyTurn = () => {
    type BuildingRuntime = {
      provinceId: string;
      provinceOwnerCountryId?: string;
      entry: BuiltBuilding;
      definition?: BuildingDefinition;
      ownerCountryId?: string;
    };

    const definitionById = new Map(buildings.map((building) => [building.id, building]));
    const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
    const marketByCountry = new Map<string, Market>();
    markets.forEach((market) => {
      market.memberCountryIds.forEach((countryId) => {
        marketByCountry.set(countryId, market);
      });
    });
    setProvinces((prev) => {
      const demandByMarketAndResource = new Map<string, Record<string, number>>();
      const factualSupplyCurrentTurnByMarketAndResource = new Map<string, Record<string, number>>();
      const marketVolumeCurrentTurnByMarketAndResource = new Map<string, Record<string, number>>();
      const productionMaxCurrentTurnByMarketAndResource = new Map<
        string,
        Record<string, number>
      >();
      Object.values(prev).forEach((province) => {
        if (!province.ownerCountryId) return;
        const market = marketByCountry.get(province.ownerCountryId);
        if (!market) return;
        const demand = demandByMarketAndResource.get(market.id) ?? {};
        (province.buildingsBuilt ?? []).forEach((entry) => {
          const inactiveByProductivity =
            Number.isFinite(entry.lastProductivity) &&
            Number(entry.lastProductivity) <= 0;
          if (inactiveByProductivity) return;
          const definition = definitionById.get(entry.buildingId);
          Object.entries(definition?.consumptionByResourceId ?? {}).forEach(
            ([resourceId, amount]) => {
              if (!Number.isFinite(amount) || amount <= 0) return;
              demand[resourceId] = Math.max(0, (demand[resourceId] ?? 0) + amount);
            },
          );
        });
        demandByMarketAndResource.set(market.id, demand);
      });

      const hasBuiltBuildings = Object.values(prev).some(
        (province) => (province.buildingsBuilt?.length ?? 0) > 0,
      );
      if (!hasBuiltBuildings) {
        pendingMarketPriceMetricsRef.current = null;
        let changed = false;
        const nextWithoutConsumption: ProvinceRecord = { ...prev };
        Object.values(nextWithoutConsumption).forEach((province) => {
          if (!province.lastLogisticsConsumedByCategory) return;
          province.lastLogisticsConsumedByCategory = undefined;
          changed = true;
        });
        return changed ? nextWithoutConsumption : prev;
      }

      const next: ProvinceRecord = {};
      const runtime: BuildingRuntime[] = [];
      const remainingBuyerInfrastructureByProvinceIdAndCategory = new Map<
        string,
        Record<string, number>
      >();
      const consumedInfrastructureByProvinceIdAndCategory = new Map<
        string,
        Record<string, number>
      >();

      Object.entries(prev).forEach(([provinceId, province]) => {
      const nextBuilt = (province.buildingsBuilt ?? []).map((entry) => {
        const definition = definitionById.get(entry.buildingId);
        const startingDucats = normalizePositiveNumber(definition?.startingDucats) ?? 0;
        return {
          ...entry,
          owner:
            entry.owner.type === 'state'
              ? {
                  type: 'state' as const,
                  countryId: entry.owner.countryId || province.ownerCountryId || 'state',
                }
              : entry.owner,
          warehouseByResourceId: {
            ...(normalizeResourceMap(entry.warehouseByResourceId) ?? {}),
          },
          ducats:
            Number.isFinite(entry.ducats) && Number(entry.ducats) >= 0
              ? Number(entry.ducats)
              : startingDucats,
          lastProductivity:
            Number.isFinite(entry.lastProductivity)
              ? clamp01(Number(entry.lastProductivity))
              : 1,
          lastPurchaseNeedByResourceId: undefined,
          lastPurchasedByResourceId: undefined,
          lastPurchaseCostDucats: 0,
          lastPurchaseCostByResourceId: undefined,
          lastSoldByResourceId: undefined,
          lastSalesRevenueDucats: 0,
          lastSalesRevenueByResourceId: undefined,
          lastConsumedByResourceId: {},
          lastExtractedByResourceId: {},
          lastProducedByResourceId: {},
        };
      });

      next[provinceId] = {
        ...province,
        buildingsBuilt: nextBuilt,
      };

      nextBuilt.forEach((entry) => {
        const ownerCountryId = getOwnerCountryIdForBuilding(
          entry.owner,
          province.ownerCountryId,
        );
        runtime.push({
          provinceId,
          provinceOwnerCountryId: province.ownerCountryId,
          entry,
          definition: definitionById.get(entry.buildingId),
          ownerCountryId,
        });
      });
    });

    runtime.forEach((buyer) => {
      const consumption = normalizeResourceMap(buyer.definition?.consumptionByResourceId);
      const extraction = normalizeResourceMap(buyer.definition?.extractionByResourceId);
      const production = normalizeResourceMap(buyer.definition?.productionByResourceId);
      const consumptionEntries = Object.entries(consumption ?? {});
      const buyerWarehouse = buyer.entry.warehouseByResourceId ?? {};
      const buyerMarket = buyer.ownerCountryId
        ? marketByCountry.get(buyer.ownerCountryId)
        : undefined;
      const purchaseNeedByResourceId: Record<string, number> = {};
      const actualPurchasedByResourceId: Record<string, number> = {};
      const purchaseCostByResourceId: Record<string, number> = {};
      let purchaseCostDucats = 0;

      if (consumptionEntries.length > 0 && buyerMarket) {
        consumptionEntries.forEach(([resourceId, requiredAmount]) => {
          let shortage = Math.max(
            0,
            requiredAmount - Math.max(0, buyerWarehouse[resourceId] ?? 0),
          );
          if (shortage > 0) {
            purchaseNeedByResourceId[resourceId] = shortage;
          }
          if (shortage <= 0) return;
          const resource = resourceById.get(resourceId);
          const resourceCategoryId = resource?.resourceCategoryId;
          const infrastructureCostPerUnit = normalizeInfrastructureCostPerUnit(
            resource?.infrastructureCostPerUnit,
          );
          let buyerInfrastructureLeft = Number.POSITIVE_INFINITY;
          if (resourceCategoryId) {
            const currentInfrastructureByCategory =
              remainingBuyerInfrastructureByProvinceIdAndCategory.get(buyer.provinceId) ??
              {
                ...(next[buyer.provinceId]?.logisticsPointsByCategory ?? {}),
              };
            remainingBuyerInfrastructureByProvinceIdAndCategory.set(
              buyer.provinceId,
              currentInfrastructureByCategory,
            );
            buyerInfrastructureLeft = Math.max(
              0,
              currentInfrastructureByCategory[resourceCategoryId] ?? 0,
            );
            if (buyerInfrastructureLeft <= 0) return;
          }

          const prioritizedSellers = runtime
            .filter((seller) => seller !== buyer)
            .sort((a, b) => {
              const aOwnCountry =
                Boolean(buyer.ownerCountryId) &&
                a.provinceOwnerCountryId === buyer.ownerCountryId;
              const bOwnCountry =
                Boolean(buyer.ownerCountryId) &&
                b.provinceOwnerCountryId === buyer.ownerCountryId;
              if (aOwnCountry === bOwnCountry) return 0;
              return aOwnCountry ? -1 : 1;
            });

          for (const seller of prioritizedSellers) {
            if (seller === buyer) continue;
            if (
              !seller.provinceOwnerCountryId ||
              !buyerMarket.memberCountryIds.includes(seller.provinceOwnerCountryId)
            ) {
              continue;
            }
            if (shortage <= 0) break;

            const sellerWarehouse = seller.entry.warehouseByResourceId ?? {};
            const sellerStock = Math.max(0, sellerWarehouse[resourceId] ?? 0);
            if (sellerStock <= 0) continue;
            const buyerMarketPrices = buyerMarket.priceByResourceId ?? {};
            const unitPrice = normalizeResourcePrice(
              buyerMarketPrices[resourceId],
              normalizeResourcePrice(resourceById.get(resourceId)?.basePrice),
            );

            const buyerFunds = Math.max(0, buyer.entry.ducats ?? 0);
            const affordable = Math.floor(buyerFunds / unitPrice);
            if (affordable <= 0) break;

            const amount = Math.min(
              shortage,
              sellerStock,
              affordable,
              resourceCategoryId
                ? Math.floor(buyerInfrastructureLeft / infrastructureCostPerUnit)
                : Number.POSITIVE_INFINITY,
            );
            if (amount <= 0) continue;

            buyerWarehouse[resourceId] = Math.max(
              0,
              (buyerWarehouse[resourceId] ?? 0) + amount,
            );
            sellerWarehouse[resourceId] = Math.max(
              0,
              (sellerWarehouse[resourceId] ?? 0) - amount,
            );
            if (sellerWarehouse[resourceId] <= 0) {
              delete sellerWarehouse[resourceId];
            }
            seller.entry.warehouseByResourceId = sellerWarehouse;
            buyer.entry.ducats = Math.max(
              0,
              (buyer.entry.ducats ?? 0) - amount * unitPrice,
            );
            actualPurchasedByResourceId[resourceId] = Math.max(
              0,
              (actualPurchasedByResourceId[resourceId] ?? 0) + amount,
            );
            purchaseCostDucats += amount * unitPrice;
            purchaseCostByResourceId[resourceId] = Math.max(
              0,
              (purchaseCostByResourceId[resourceId] ?? 0) + amount * unitPrice,
            );
            seller.entry.ducats = Math.max(
              0,
              (seller.entry.ducats ?? 0) + amount * unitPrice,
            );
            const sellerSoldByResourceId = {
              ...(seller.entry.lastSoldByResourceId ?? {}),
            };
            sellerSoldByResourceId[resourceId] = Math.max(
              0,
              (sellerSoldByResourceId[resourceId] ?? 0) + amount,
            );
            seller.entry.lastSoldByResourceId = sellerSoldByResourceId;
            seller.entry.lastSalesRevenueDucats = Math.max(
              0,
              (seller.entry.lastSalesRevenueDucats ?? 0) + amount * unitPrice,
            );
            const sellerRevenueByResourceId = {
              ...(seller.entry.lastSalesRevenueByResourceId ?? {}),
            };
            sellerRevenueByResourceId[resourceId] = Math.max(
              0,
              (sellerRevenueByResourceId[resourceId] ?? 0) + amount * unitPrice,
            );
            seller.entry.lastSalesRevenueByResourceId = sellerRevenueByResourceId;
            shortage -= amount;
            if (resourceCategoryId) {
              const consumedInfrastructure = amount * infrastructureCostPerUnit;
              buyerInfrastructureLeft = Math.max(
                0,
                buyerInfrastructureLeft - consumedInfrastructure,
              );
              const infrastructureByCategory =
                remainingBuyerInfrastructureByProvinceIdAndCategory.get(
                  buyer.provinceId,
                );
              if (infrastructureByCategory) {
                infrastructureByCategory[resourceCategoryId] = buyerInfrastructureLeft;
              }
              const consumedByCategory =
                consumedInfrastructureByProvinceIdAndCategory.get(buyer.provinceId) ?? {};
              consumedByCategory[resourceCategoryId] = Math.max(
                0,
                (consumedByCategory[resourceCategoryId] ?? 0) + consumedInfrastructure,
              );
              consumedInfrastructureByProvinceIdAndCategory.set(
                buyer.provinceId,
                consumedByCategory,
              );
              if (buyerInfrastructureLeft <= 0) break;
            }
          }
        });
      }

      let productivity = 1;
      const actualConsumedByResourceId: Record<string, number> = {};
      const actualExtractedByResourceId: Record<string, number> = {};
      const actualProducedByResourceId: Record<string, number> = {};
      if (consumptionEntries.length > 0) {
        productivity = consumptionEntries.reduce((minRatio, [resourceId, requiredAmount]) => {
          if (requiredAmount <= 0) return minRatio;
          const available = Math.max(0, buyerWarehouse[resourceId] ?? 0);
          return Math.min(minRatio, available / requiredAmount);
        }, 1);
        productivity = Number.isFinite(productivity) ? clamp01(productivity) : 0;

        consumptionEntries.forEach(([resourceId, requiredAmount]) => {
          const amountToConsume = requiredAmount * productivity;
          if (amountToConsume <= 0) return;
          actualConsumedByResourceId[resourceId] = amountToConsume;
          const remaining = Math.max(0, (buyerWarehouse[resourceId] ?? 0) - amountToConsume);
          if (remaining > 0) {
            buyerWarehouse[resourceId] = remaining;
          } else {
            delete buyerWarehouse[resourceId];
          }
        });
      }

      const buyerMarketId = buyer.ownerCountryId
        ? marketByCountry.get(buyer.ownerCountryId)?.id
        : undefined;
      if (buyerMarketId) {
        const productionMax =
          productionMaxCurrentTurnByMarketAndResource.get(buyerMarketId) ?? {};
        Object.entries(extraction ?? {}).forEach(([resourceId, amount]) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          productionMax[resourceId] = Math.max(
            0,
            (productionMax[resourceId] ?? 0) + amount,
          );
        });
        Object.entries(production ?? {}).forEach(([resourceId, amount]) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          productionMax[resourceId] = Math.max(
            0,
            (productionMax[resourceId] ?? 0) + amount,
          );
        });
        productionMaxCurrentTurnByMarketAndResource.set(buyerMarketId, productionMax);
      }
      const collectMarketVolume = () => {
        if (!buyerMarketId) return;
        const marketVolume =
          marketVolumeCurrentTurnByMarketAndResource.get(buyerMarketId) ?? {};
        Object.entries(buyerWarehouse).forEach(([resourceId, amount]) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          marketVolume[resourceId] = Math.max(
            0,
            (marketVolume[resourceId] ?? 0) + amount,
          );
        });
        marketVolumeCurrentTurnByMarketAndResource.set(buyerMarketId, marketVolume);
      };
      buyer.entry.lastProductivity = productivity;
      buyer.entry.lastPurchaseNeedByResourceId = normalizeResourceMap(
        purchaseNeedByResourceId,
      );
      buyer.entry.lastPurchasedByResourceId = normalizeResourceMap(
        actualPurchasedByResourceId,
      );
      buyer.entry.lastPurchaseCostDucats = Math.max(0, purchaseCostDucats);
      buyer.entry.lastPurchaseCostByResourceId = normalizeResourceMap(
        purchaseCostByResourceId,
      );
      buyer.entry.lastConsumedByResourceId = normalizeResourceMap(actualConsumedByResourceId);
      buyer.entry.warehouseByResourceId = buyerWarehouse;
      if (productivity <= 0) {
        collectMarketVolume();
        buyer.entry.lastExtractedByResourceId = undefined;
        buyer.entry.lastProducedByResourceId = undefined;
        return;
      }

      const provinceForExtraction = next[buyer.provinceId];
      const provinceResourceAmounts = {
        ...(provinceForExtraction.resourceAmounts ?? {}),
      };
      let provinceAmountsChanged = false;
      Object.entries(extraction ?? {}).forEach(([resourceId, baseAmount]) => {
        const plannedExtraction = baseAmount * productivity;
        if (plannedExtraction <= 0) return;
        const provinceStock = Math.max(0, provinceResourceAmounts[resourceId] ?? 0);
        const extracted = Math.min(plannedExtraction, provinceStock);
        if (extracted <= 0) return;
        actualExtractedByResourceId[resourceId] = extracted;
        buyerWarehouse[resourceId] = Math.max(
          0,
          (buyerWarehouse[resourceId] ?? 0) + extracted,
        );
        const provinceRemaining = Math.max(0, provinceStock - extracted);
        if (provinceRemaining > 0) {
          provinceResourceAmounts[resourceId] = provinceRemaining;
        } else {
          delete provinceResourceAmounts[resourceId];
        }
        provinceAmountsChanged = true;
      });
      if (provinceAmountsChanged) {
        provinceForExtraction.resourceAmounts = provinceResourceAmounts;
      }

      Object.entries(production ?? {}).forEach(([resourceId, baseAmount]) => {
        const produced = baseAmount * productivity;
        if (produced <= 0) return;
        actualProducedByResourceId[resourceId] = produced;
        buyerWarehouse[resourceId] = Math.max(
          0,
          (buyerWarehouse[resourceId] ?? 0) + produced,
        );
      });
      if (buyerMarketId) {
        const marketSupply =
          factualSupplyCurrentTurnByMarketAndResource.get(buyerMarketId) ?? {};
        Object.entries(actualExtractedByResourceId).forEach(([resourceId, amount]) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          marketSupply[resourceId] = Math.max(
            0,
            (marketSupply[resourceId] ?? 0) + amount,
          );
        });
        Object.entries(actualProducedByResourceId).forEach(([resourceId, amount]) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          marketSupply[resourceId] = Math.max(
            0,
            (marketSupply[resourceId] ?? 0) + amount,
          );
        });
        factualSupplyCurrentTurnByMarketAndResource.set(buyerMarketId, marketSupply);
      }
      collectMarketVolume();
      buyer.entry.lastExtractedByResourceId = normalizeResourceMap(actualExtractedByResourceId);
      buyer.entry.lastProducedByResourceId = normalizeResourceMap(actualProducedByResourceId);
    });
    Object.entries(next).forEach(([provinceId, province]) => {
      province.lastLogisticsConsumedByCategory = normalizeResourceMap(
        consumedInfrastructureByProvinceIdAndCategory.get(provinceId),
      );
    });
    pendingMarketPriceMetricsRef.current = {
      demandByMarketAndResource,
      factualSupplyByMarketAndResource: factualSupplyCurrentTurnByMarketAndResource,
      marketVolumeByMarketAndResource: marketVolumeCurrentTurnByMarketAndResource,
      productionMaxByMarketAndResource: productionMaxCurrentTurnByMarketAndResource,
    };
      return next;
    });
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
      const scienceGain = Math.max(0, gameSettings.sciencePointsPerTurn ?? 0);
      if (scienceGain > 0) {
        setCountries((prev) =>
          prev.map((country) => ({
            ...country,
            sciencePoints: (country.sciencePoints ?? 0) + scienceGain,
          })),
        );
      }
      const cultureGain = Math.max(0, gameSettings.culturePointsPerTurn ?? 0);
      if (cultureGain > 0) {
        setCountries((prev) =>
          prev.map((country) => ({
            ...country,
            culturePoints: (country.culturePoints ?? 0) + cultureGain,
          })),
        );
      }
      const religionGain = Math.max(0, gameSettings.religionPointsPerTurn ?? 0);
      if (religionGain > 0) {
        setCountries((prev) =>
          prev.map((country) => ({
            ...country,
            religionPoints: (country.religionPoints ?? 0) + religionGain,
          })),
        );
      }
      const goldGain = Math.max(0, gameSettings.goldPerTurn ?? 0);
      if (goldGain > 0) {
        setCountries((prev) =>
          prev.map((country) => ({
            ...country,
            gold: (country.gold ?? 0) + goldGain,
          })),
        );
      }
      const ducatsGain = Math.max(0, gameSettings.ducatsPerTurn ?? 0);
      if (ducatsGain > 0) {
        setCountries((prev) =>
          prev.map((country) => ({
            ...country,
            ducats: (country.ducats ?? 0) + ducatsGain,
          })),
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
      const [activeAgreements, expiredAgreements] = diplomacyAgreements.reduce<
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
      const renewalProposals: DiplomacyProposal[] = [];
      if (expiredAgreements.length > 0) {
        expiredAgreements.forEach((agreement) => {
          if (agreement.durationTurns && agreement.durationTurns > 0) {
            const { id: _ignoredAgreementId, ...agreementPayload } = agreement;
            renewalProposals.push({
              id: createId(),
              kind: 'renewal',
              fromCountryId: agreement.hostCountryId,
              toCountryId: agreement.guestCountryId,
              agreement: {
                ...agreementPayload,
                startTurn: undefined,
              },
              targetCountryIds: [
                agreement.hostCountryId,
                agreement.guestCountryId,
              ],
              approvals: [],
              sourceAgreementId: agreement.id,
              createdTurn: nextTurn,
            });
          }
          const hostName =
            countries.find((c) => c.id === agreement.hostCountryId)?.name ??
            agreement.hostCountryId;
          const guestName =
            countries.find((c) => c.id === agreement.guestCountryId)?.name ??
            agreement.guestCountryId;
          addEvent({
            category: 'diplomacy',
            message: `пїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ ${hostName} - ${guestName} пїЅпїЅпїЅпїЅпїЅ. пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ.`,
            countryId: agreement.hostCountryId,
            priority: 'low',
          });
        });
      }
      setDiplomacyAgreements(activeAgreements);
      if (renewalProposals.length > 0) {
        setDiplomacyProposals((prev) => [...prev, ...renewalProposals]);
      }

      const marketCapitalGraceTurns = Math.max(
        1,
        gameSettings.marketCapitalGraceTurns ?? 3,
      );
      if (markets.length > 0) {
        const nextMarkets: Market[] = [];
        let marketsChanged = false;
        markets.forEach((market) => {
          const capitalId = market.capitalProvinceId;
          const capitalProvince = capitalId ? provinces[capitalId] : undefined;
          const hasValidCapital = Boolean(
            capitalId &&
              capitalProvince &&
              capitalProvince.ownerCountryId &&
              market.memberCountryIds.includes(capitalProvince.ownerCountryId),
          );

          if (hasValidCapital) {
            if (market.capitalLostSinceTurn != null) {
              marketsChanged = true;
              nextMarkets.push({ ...market, capitalLostSinceTurn: undefined });
              addEvent({
                category: 'economy',
                message: `Столица рынка "${market.name}" снова назначена. Таймер удаления сброшен.`,
                countryId: market.creatorCountryId,
                priority: 'low',
              });
            } else {
              nextMarkets.push(market);
            }
            return;
          }

          const lostSinceTurn = market.capitalLostSinceTurn ?? nextTurn;
          const turnsWithoutCapital = nextTurn - lostSinceTurn;
          const turnsLeft = Math.max(0, marketCapitalGraceTurns - turnsWithoutCapital);

          if (turnsWithoutCapital >= marketCapitalGraceTurns) {
            marketsChanged = true;
            addEvent({
              category: 'economy',
              message: `Рынок "${market.name}" удален: новая столица не назначена в срок (${marketCapitalGraceTurns} ход.).`,
              countryId: market.creatorCountryId,
              priority: 'medium',
            });
            return;
          }

          if (market.capitalLostSinceTurn == null) {
            marketsChanged = true;
            addEvent({
              category: 'economy',
              message: `Рынок "${market.name}" потерял столицу. Назначьте новую в течение ${turnsLeft} ход.`,
              countryId: market.creatorCountryId,
              priority: 'high',
            });
          }

          nextMarkets.push({
            ...market,
            capitalLostSinceTurn: lostSinceTurn,
          });
        });
        if (marketsChanged) {
          setMarkets(nextMarkets);
        }
      }
      applyBuildingEconomyTurn();
      setProvinces((prev) => {
        const metrics = pendingMarketPriceMetricsRef.current;
        if (!metrics) return prev;
        pendingMarketPriceMetricsRef.current = null;
        Promise.resolve().then(() => applyMarketPriceTurn(metrics));
        return prev;
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
      continents,
      regions,
      cultures,
      resources,
      resourceCategories,
      buildings,
      industries,
      companies,
      diplomacy: diplomacyAgreements,
      diplomacyProposals,
      logistics,
      markets,
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
      continents,
      regions,
      cultures,
      resources,
      resourceCategories,
      buildings,
      industries,
      companies,
      diplomacyAgreements,
      diplomacyProposals,
      logistics,
      markets,
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
        constructionPoints: country.constructionPoints ?? 0,
        sciencePoints: country.sciencePoints ?? 0,
        culturePoints: country.culturePoints ?? 0,
        religionPoints: country.religionPoints ?? 0,
        gold: country.gold ?? 0,
        ducats: country.ducats ?? 0,
      })),
    );
    setActiveCountryId(
      save.data.activeCountryId ?? save.data.countries[0]?.id ?? undefined,
    );
    setMapLayers(ensureMarketsMapLayer(save.data.mapLayers ?? initialMapLayers));
    setSelectedProvinceId(save.data.selectedProvinceId);
    setProvinces(normalizeProvinceRecord(save.data.provinces ?? {}));
    setClimates(save.data.climates ?? climates);
    setReligions(save.data.religions ?? religions);
    setLandscapes(save.data.landscapes ?? landscapes);
    setContinents(save.data.continents ?? continents);
    setRegions(save.data.regions ?? regions);
    setCultures(save.data.cultures ?? cultures);
    const loadedResourceCategories =
      save.data.resourceCategories && save.data.resourceCategories.length > 0
        ? save.data.resourceCategories
        : defaultResourceCategories;
    setResourceCategories(loadedResourceCategories);
    const validResourceCategoryIds = new Set(
      loadedResourceCategories.map((category) => category.id),
    );
    const normalizedLoadedResources = normalizeResources(
      (save.data.resources ?? resources).map((item) => ({
        ...item,
        resourceCategoryId:
          item.resourceCategoryId &&
          validResourceCategoryIds.has(item.resourceCategoryId)
            ? item.resourceCategoryId
            : undefined,
      })),
    );
    setResources(normalizedLoadedResources);
    setBuildings(normalizeBuildingDefinitions(save.data.buildings ?? buildings));
    setIndustries(save.data.industries ?? industries);
    setCompanies(save.data.companies ?? companies);
    setDiplomacyAgreements(save.data.diplomacy ?? []);
    setDiplomacyProposals(save.data.diplomacyProposals ?? []);
    setMarkets(() => {
      const loaded = save.data.markets ?? [];
      const validCountryIds = new Set(
        (save.data.countries ?? []).map((country) => country.id),
      );
      const validProvinceIds = new Set(
        Object.keys(save.data.provinces ?? {}),
      );
      const validResourceIds = new Set(normalizedLoadedResources.map((resource) => resource.id));
      const resourceBasePriceById = new Map(
        normalizedLoadedResources.map((resource) => [
          resource.id,
          normalizeResourcePrice(resource.basePrice),
        ]),
      );
      return loaded
        .map((market) => {
          if (!validCountryIds.has(market.leaderCountryId)) return null;
          const members = Array.from(
            new Set(
              [
                market.leaderCountryId,
                ...(market.memberCountryIds ?? []),
              ].filter((countryId) => validCountryIds.has(countryId)),
            ),
          );
          const normalizedPrices = Object.fromEntries(
            normalizedLoadedResources.map((resource) => [
              resource.id,
              normalizeResourcePrice(
                market.priceByResourceId?.[resource.id],
                resourceBasePriceById.get(resource.id) ?? marketDefaultResourceBasePrice,
              ),
            ]),
          );
          const normalizedHistory = Object.fromEntries(
            normalizedLoadedResources.map((resource) => {
              const currentPrice = Number(normalizedPrices[resource.id]);
              return [
                resource.id,
                normalizeResourcePriceHistory(
                  market.priceHistoryByResourceId?.[resource.id],
                  currentPrice,
                  marketPriceHistoryLength,
                ),
              ];
            }),
          );
          const normalizedDemandHistory = Object.fromEntries(
            normalizedLoadedResources.map((resource) => [
              resource.id,
              normalizeResourceAmountHistory(
                market.demandHistoryByResourceId?.[resource.id],
                0,
                marketPriceHistoryLength,
              ),
            ]),
          );
          const normalizedOfferHistory = Object.fromEntries(
            normalizedLoadedResources.map((resource) => [
              resource.id,
              normalizeResourceAmountHistory(
                market.offerHistoryByResourceId?.[resource.id],
                0,
                marketPriceHistoryLength,
              ),
            ]),
          );
          const normalizedProductionFactHistory = Object.fromEntries(
            normalizedLoadedResources.map((resource) => [
              resource.id,
              normalizeResourceAmountHistory(
                market.productionFactHistoryByResourceId?.[resource.id],
                0,
                marketPriceHistoryLength,
              ),
            ]),
          );
          const normalizedProductionMaxHistory = Object.fromEntries(
            normalizedLoadedResources.map((resource) => [
              resource.id,
              normalizeResourceAmountHistory(
                market.productionMaxHistoryByResourceId?.[resource.id],
                0,
                marketPriceHistoryLength,
              ),
            ]),
          );
          return {
            ...market,
            creatorCountryId:
              market.creatorCountryId && validCountryIds.has(market.creatorCountryId)
                ? market.creatorCountryId
                : market.leaderCountryId,
            color:
              market.color ??
              (save.data.countries ?? []).find(
                (country) => country.id === market.leaderCountryId,
              )?.color ??
              '#22c55e',
            logoDataUrl: market.logoDataUrl,
            memberCountryIds: members,
            warehouseByResourceId: Object.fromEntries(
              Object.entries(market.warehouseByResourceId ?? {}).filter(
                ([resourceId, amount]) =>
                  validResourceIds.has(resourceId) &&
                  Number.isFinite(amount) &&
                  Number(amount) > 0,
              ),
            ),
            priceByResourceId: normalizedPrices,
            priceHistoryByResourceId: normalizedHistory,
            demandHistoryByResourceId: normalizedDemandHistory,
            offerHistoryByResourceId: normalizedOfferHistory,
            productionFactHistoryByResourceId: normalizedProductionFactHistory,
            productionMaxHistoryByResourceId: normalizedProductionMaxHistory,
            capitalProvinceId:
              market.capitalProvinceId &&
              validProvinceIds.has(market.capitalProvinceId)
                ? market.capitalProvinceId
                : undefined,
            capitalLostSinceTurn:
              typeof market.capitalLostSinceTurn === 'number'
                ? market.capitalLostSinceTurn
                : undefined,
          };
        })
        .filter(Boolean) as Market[];
    });
    setLogistics(() => {
      const base = createDefaultLogisticsState();
      const loaded = save.data.logistics;
      if (!loaded) return base;
      return {
        ...base,
        ...loaded,
        routeTypes:
          loaded.routeTypes && loaded.routeTypes.length > 0
            ? loaded.routeTypes.map((item) => ({
                ...item,
                constructionCostPerSegment:
                  item.constructionCostPerSegment ?? 0,
                allowProvinceSkipping: item.allowProvinceSkipping ?? false,
                requiredBuildingIds: item.requiredBuildingIds ?? [],
                requiredBuildingsMode: item.requiredBuildingsMode ?? 'all',
                landscape: item.landscape ?? { anyOf: [], noneOf: [] },
                allowAllLandscapes: item.allowAllLandscapes ?? true,
                marketAccessCategoryIds: (item.marketAccessCategoryIds ?? []).filter(
                  (categoryId) => validResourceCategoryIds.has(categoryId),
                ),
                allowAllMarketCategories: item.allowAllMarketCategories ?? true,
                transportCapacityPerLevelByCategory: {
                  ...(item.transportCapacityPerLevelByCategory ?? {}),
                },
              }))
            : base.routeTypes,
        routes: (loaded.routes ?? []).map((route) => {
          const required = Math.max(
            0,
            route.constructionRequiredPoints ?? 0,
          );
          const progress =
            route.constructionProgressPoints == null
              ? required
              : Math.max(0, route.constructionProgressPoints);
          return {
            ...route,
            constructionRequiredPoints: required,
            constructionProgressPoints: Math.min(progress, required),
            level: Math.max(1, Math.floor(route.level ?? 1)),
          };
        }),
      };
    });
    setGameSettings({
      colonizationPointsPerTurn: 10,
      constructionPointsPerTurn: 10,
      demolitionCostPercent: 20,
      eventLogRetainTurns: 3,
      diplomacyProposalExpireTurns: 3,
      marketCapitalGraceTurns: 3,
      marketDefaultResourceBasePrice: DEFAULT_RESOURCE_BASE_PRICE,
      marketPriceSmoothing: MARKET_PRICE_SMOOTHING,
      marketPriceHistoryLength: MARKET_PRICE_HISTORY_LENGTH,
      marketPriceEpsilon: MARKET_PRICE_EPSILON,
      startingColonizationPoints: 100,
      startingConstructionPoints: 100,
      sciencePointsPerTurn: 0,
      culturePointsPerTurn: 0,
      religionPointsPerTurn: 0,
      goldPerTurn: 0,
      ducatsPerTurn: 0,
      startingSciencePoints: 0,
      startingCulturePoints: 0,
      startingReligionPoints: 0,
      startingGold: 0,
      startingDucats: 100000,
      colonizationMaxActive: 0,
      ...(save.data.settings ?? {}),
    });
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
        name: typeof entry.name === 'string' ? entry.name : 'РРјРїРѕСЂС‚',
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
    setMapLayers(ensureMarketsMapLayer(initialMapLayers));
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
    setContinents([]);
    setRegions([]);
    setCultures([
      { id: createId(), name: 'Северяне', color: '#fb7185' },
      { id: createId(), name: 'Южане', color: '#f97316' },
    ]);
    setResources([]);
    setResourceCategories(defaultResourceCategories);
    setBuildings([]);
    setIndustries([]);
    setCompanies([]);
    setDiplomacyAgreements([]);
    setDiplomacyProposals([]);
    setMarkets([]);
    setLogistics(createDefaultLogisticsState());
    setGameSettings({
      colonizationPointsPerTurn: 10,
      constructionPointsPerTurn: 10,
      demolitionCostPercent: 20,
      eventLogRetainTurns: 3,
      diplomacyProposalExpireTurns: 3,
      marketCapitalGraceTurns: 3,
      marketDefaultResourceBasePrice: DEFAULT_RESOURCE_BASE_PRICE,
      marketPriceSmoothing: MARKET_PRICE_SMOOTHING,
      marketPriceHistoryLength: MARKET_PRICE_HISTORY_LENGTH,
      marketPriceEpsilon: MARKET_PRICE_EPSILON,
      startingColonizationPoints: 100,
      startingConstructionPoints: 100,
      sciencePointsPerTurn: 0,
      culturePointsPerTurn: 0,
      religionPointsPerTurn: 0,
      goldPerTurn: 0,
      ducatsPerTurn: 0,
      startingSciencePoints: 0,
      startingCulturePoints: 0,
      startingReligionPoints: 0,
      startingGold: 0,
      startingDucats: 100000,
      colonizationMaxActive: 0,
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
            fertility: 0,
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
        if (existing.fertility == null) {
          existing.fertility = 0;
          updated = true;
        }
        if (updated) changed = true;
      });
      return changed ? next : prev;
    });
  };

  const needsAdjacencyComputation = useMemo(
    () =>
      Object.values(provinces).some(
        (province) =>
          !province.adjacentProvinceIds ||
          province.adjacentProvinceIds.length === 0,
      ),
    [provinces],
  );

  const persistProvinceAdjacency = useCallback(
    (adjacency: Record<string, string[]>) => {
      setProvinces((prev) => {
        let changed = false;
        const next: ProvinceRecord = { ...prev };
        Object.entries(adjacency).forEach(([provinceId, neighbors]) => {
          const province = next[provinceId];
          if (!province) return;
          const normalized = Array.from(new Set(neighbors)).sort();
          const current = (province.adjacentProvinceIds ?? []).slice().sort();
          if (
            current.length !== normalized.length ||
            current.some((id, idx) => id !== normalized[idx])
          ) {
            next[provinceId] = {
              ...province,
              adjacentProvinceIds: normalized,
            };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    },
    [],
  );

  const shouldComputeAdjacency =
    needsAdjacencyComputation || adjacencyRecomputeRequested;

  const handleProvinceAdjacencyDetected = useCallback(
    (adjacency: Record<string, string[]>) => {
      persistProvinceAdjacency(adjacency);
      setAdjacencyRecomputeRequested(false);
    },
    [persistProvinceAdjacency],
  );

const layerPaint: MapLayerPaint = useMemo(() => {
    const paint: MapLayerPaint = {};
    mapLayers.forEach((layer) => {
      paint[layer.id] = {};
    });
    const marketByCountry = new Map<string, Market>();
    markets.forEach((market) => {
      market.memberCountryIds.forEach((countryId) => {
        marketByCountry.set(countryId, market);
      });
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
      if (province.continentId) {
        const continent = continents.find((c) => c.id === province.continentId);
        if (continent) {
          paint.continent ??= {};
          paint.continent[province.id] = continent.color;
        }
      }
      if (province.regionId) {
        const region = regions.find((r) => r.id === province.regionId);
        if (region) {
          paint.region ??= {};
          paint.region[province.id] = region.color;
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
      if (province.fertility != null) {
        paint.fertility ??= {};
        paint.fertility[province.id] = fertilityColor(province.fertility);
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
      if (province.ownerCountryId) {
        const market = marketByCountry.get(province.ownerCountryId);
        if (market) {
          paint.markets ??= {};
          paint.markets[province.id] = market.color;
        }
      }
    });

    return paint;
  }, [
    countries,
    markets,
    mapLayers,
    provinces,
    climates,
    religions,
    landscapes,
    continents,
    regions,
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
    legends.continent = continents.map((item) => ({
      label: item.name,
      color: item.color,
    }));
    legends.region = regions.map((item) => ({
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
    legends.markets = markets.slice(0, 8).map((market) => ({
      label: market.name,
      color: market.color,
    }));
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
    legends.fertility = envSteps.slice(0, -1).map((from, index) => {
      const to = envSteps[index + 1];
      return {
        label: `${from}-${to}%`,
        color: fertilityColor(from),
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
  }, [
    climates,
    religions,
    landscapes,
    continents,
    regions,
    cultures,
    resources,
    markets,
    selectedResourceId,
    countries,
  ]);

  const selectedProvince = selectedProvinceId
    ? provinces[selectedProvinceId]
    : undefined;
  const marketCapitals = useMemo(
    () =>
      markets
        .filter((market) => market.capitalProvinceId)
        .map((market) => ({
          provinceId: market.capitalProvinceId as string,
          marketId: market.id,
          marketName: market.name,
          color: market.color,
          logoDataUrl: market.logoDataUrl,
        }))
        .filter((entry) => Boolean(provinces[entry.provinceId])),
    [markets, provinces],
  );
  const logisticsDraftRouteType = logisticsRouteDraft
    ? logistics.routeTypes.find((item) => item.id === logisticsRouteDraft.routeTypeId)
    : undefined;
  const logisticsDraftSegmentCost = Math.max(
    0,
    Math.floor(logisticsDraftRouteType?.constructionCostPerSegment ?? 0),
  );
  const logisticsDraftTotalCost = Math.max(
    0,
    (logisticsRouteProvinceIds.length - 1) * logisticsDraftSegmentCost,
  );
  const selectedProvinceRouteConstructionProgress = useMemo(() => {
    if (!selectedProvinceId) return [];
    return logistics.routes
      .filter((route) => route.provinceIds.includes(selectedProvinceId))
      .map((route) => {
        const required = Math.max(0, route.constructionRequiredPoints ?? 0);
        const progress = Math.max(
          0,
          route.constructionProgressPoints ?? required,
        );
        return {
          routeName: route.name,
          progressPoints: progress,
          requiredPoints: required,
        };
      })
      .filter((entry) => entry.requiredPoints > 0 && entry.progressPoints < entry.requiredPoints);
  }, [selectedProvinceId, logistics.routes]);
  const activeCountryMarket = useMemo(() => {
    if (!activeCountryId) return undefined;
    return markets.find((market) => market.memberCountryIds.includes(activeCountryId));
  }, [markets, activeCountryId]);
  const selectedProvinceMarketAccessByCategory = useMemo<
    | {
      categoryId: string;
      categoryName: string;
      categoryColor?: string;
      status: 'available' | 'unavailable';
      points: number;
      consumedLastTurn: number;
    }[]
    | undefined
  >(() => {
    if (!selectedProvinceId || !activeCountryId) return undefined;
    const selected = provinces[selectedProvinceId];
    if (!selected || selected.ownerCountryId !== activeCountryId) return undefined;
    if (resourceCategories.length === 0) return [];

    const base = resourceCategories.map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      status: 'unavailable' as const,
      points: 0,
      consumedLastTurn: 0,
    }));

    const capitalId = activeCountryMarket?.capitalProvinceId;
    if (!capitalId || !provinces[capitalId]) return base;

    const parseProvinceNodeId = (nodeId: string) =>
      nodeId.startsWith('province:') ? nodeId.slice('province:'.length) : undefined;
    const routeById = new Map(logistics.routes.map((route) => [route.id, route]));
    const routeTypeById = new Map(
      logistics.routeTypes.map((routeType) => [routeType.id, routeType]),
    );
    const routeAllowsCategory = (routeId: string, categoryId: string) => {
      const route = routeById.get(routeId);
      if (!route) return false;
      const routeType = routeTypeById.get(route.routeTypeId);
      if (!routeType) return true;
      if (routeType.allowAllMarketCategories ?? true) return true;
      return (routeType.marketAccessCategoryIds ?? []).includes(categoryId);
    };

    return base.map((entry) => {
      const graph = new Map<string, Set<string>>();
      const addLink = (from: string, to: string) => {
        if (!graph.has(from)) {
          graph.set(from, new Set<string>());
        }
        graph.get(from)?.add(to);
      };

      logistics.edges.forEach((edge) => {
        if (!edge.routeId) return;
        if (edge.active === false) return;
        if (!routeAllowsCategory(edge.routeId, entry.categoryId)) return;
        const fromProvinceId = parseProvinceNodeId(edge.fromNodeId);
        const toProvinceId = parseProvinceNodeId(edge.toNodeId);
        if (!fromProvinceId || !toProvinceId) return;
        if (!provinces[fromProvinceId] || !provinces[toProvinceId]) return;
        addLink(fromProvinceId, toProvinceId);
        addLink(toProvinceId, fromProvinceId);
      });

      const visited = new Set<string>();
      const queue: string[] = [capitalId];
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        const neighbours = graph.get(current);
        if (!neighbours) continue;
        neighbours.forEach((provinceId) => {
          if (!visited.has(provinceId)) {
            queue.push(provinceId);
          }
        });
      }

      return {
        ...entry,
        status: visited.has(selectedProvinceId) ? 'available' : 'unavailable',
        points: Math.max(
          0,
          provinces[selectedProvinceId]?.logisticsPointsByCategory?.[entry.categoryId] ?? 0,
        ),
        consumedLastTurn: Math.max(
          0,
          provinces[selectedProvinceId]?.lastLogisticsConsumedByCategory?.[entry.categoryId] ?? 0,
        ),
      };
    });
  }, [
    selectedProvinceId,
    activeCountryId,
    provinces,
    resourceCategories,
    activeCountryMarket,
    logistics.edges,
    logistics.routes,
    logistics.routeTypes,
  ]);

  const isAgreementActive = (agreement: DiplomacyAgreement) => {
    if (!agreement.durationTurns || agreement.durationTurns <= 0) return true;
    if (!agreement.startTurn) return true;
    return turn - agreement.startTurn < agreement.durationTurns;
  };

  const hasRouteBuildAccessByAgreement = (
    hostCountryId: string,
    guestCountryId: string,
    provinceId: string,
    routeTypeId?: string,
  ) =>
    diplomacyAgreements.some((agreement) => {
      if (!isAgreementActive(agreement)) return false;
      const terms = resolveAgreementTerms(agreement, hostCountryId, guestCountryId);
      if (!terms) return false;
      const category = terms.agreementCategory ?? 'construction';
      if (category !== 'logistics') return false;
      const allowsState = terms.allowState ?? terms.kind === 'state';
      if (!allowsState) return false;
      if (terms.routeTypeIds && terms.routeTypeIds.length > 0) {
        if (!routeTypeId || !terms.routeTypeIds.includes(routeTypeId)) return false;
      }
      if (terms.provinceIds && terms.provinceIds.length > 0) {
        return terms.provinceIds.includes(provinceId);
      }
      return true;
    });

  const countRouteUsageOnHost = (
    hostCountryId: string,
    guestCountryId: string,
    routeTypeId: string,
    candidateProvinceIds?: string[],
  ) => {
    let routes = 0;
    let segments = 0;
    logistics.routes.forEach((route) => {
      if (route.ownerCountryId !== guestCountryId) return;
      if (route.routeTypeId !== routeTypeId) return;
      let routeSegmentsOnHost = 0;
      for (let i = 1; i < route.provinceIds.length; i += 1) {
        const provinceId = route.provinceIds[i];
        if (provinces[provinceId]?.ownerCountryId === hostCountryId) {
          routeSegmentsOnHost += 1;
        }
      }
      if (routeSegmentsOnHost > 0) {
        routes += 1;
        segments += routeSegmentsOnHost;
      }
    });
    if (candidateProvinceIds && candidateProvinceIds.length > 1) {
      let candidateSegmentsOnHost = 0;
      for (let i = 1; i < candidateProvinceIds.length; i += 1) {
        const provinceId = candidateProvinceIds[i];
        if (provinces[provinceId]?.ownerCountryId === hostCountryId) {
          candidateSegmentsOnHost += 1;
        }
      }
      if (candidateSegmentsOnHost > 0) {
        routes += 1;
        segments += candidateSegmentsOnHost;
      }
    }
    return { routes, segments };
  };

  const hasRouteBuildAccessByAgreementForPath = (
    hostCountryId: string,
    guestCountryId: string,
    routeTypeId: string,
    provinceIds: string[],
  ) => {
    const hostPathProvinceIds = provinceIds.filter(
      (provinceId) => provinces[provinceId]?.ownerCountryId === hostCountryId,
    );
    if (hostPathProvinceIds.length === 0) return true;
    return diplomacyAgreements.some((agreement) => {
      if (!isAgreementActive(agreement)) return false;
      const terms = resolveAgreementTerms(agreement, hostCountryId, guestCountryId);
      if (!terms) return false;
      const category = terms.agreementCategory ?? 'construction';
      if (category !== 'logistics') return false;
      const allowsState = terms.allowState ?? terms.kind === 'state';
      if (!allowsState) return false;
      if (terms.routeTypeIds && terms.routeTypeIds.length > 0) {
        if (!terms.routeTypeIds.includes(routeTypeId)) return false;
      }
      if (terms.provinceIds && terms.provinceIds.length > 0) {
        const allPathProvincesCovered = hostPathProvinceIds.every((provinceId) =>
          terms.provinceIds?.includes(provinceId),
        );
        if (!allPathProvincesCovered) return false;
      }
      const perTypeLimits = terms.logisticsRouteLimits?.[routeTypeId];
      if (perTypeLimits) {
        const usage = countRouteUsageOnHost(
          hostCountryId,
          guestCountryId,
          routeTypeId,
          provinceIds,
        );
        if (
          (perTypeLimits.maxRoutes ?? 0) > 0 &&
          usage.routes > (perTypeLimits.maxRoutes ?? 0)
        ) {
          return false;
        }
        if (
          (perTypeLimits.maxSegments ?? 0) > 0 &&
          usage.segments > (perTypeLimits.maxSegments ?? 0)
        ) {
          return false;
        }
      }
      return true;
    });
  };

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

  const assignContinent = (provinceId: string, continentId?: string) => {
    setProvinces((prev) => ({
      ...prev,
      [provinceId]: {
        ...(prev[provinceId] as ProvinceData),
        id: provinceId,
        continentId,
      },
    }));
  };

  const assignRegion = (provinceId: string, regionId?: string) => {
    setProvinces((prev) => ({
      ...prev,
      [provinceId]: {
        ...(prev[provinceId] as ProvinceData),
        id: provinceId,
        regionId,
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

  const setFertility = (provinceId: string, value: number) => {
    setProvinces((prev) => ({
      ...prev,
      [provinceId]: {
        ...(prev[provinceId] as ProvinceData),
        id: provinceId,
        fertility: value,
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
    const activeLimit = gameSettings.colonizationMaxActive ?? 0;
    const activeCount = getActiveColonizationsCount(countryId);
    if (activeLimit > 0 && activeCount >= activeLimit) {
      addEvent({
        category: 'colonization',
        message: `${country?.name ?? 'Страна'} достигла лимита активных колонизаций (${activeLimit}).`,
        countryId,
        priority: 'low',
      });
      return;
    }
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

  const addContinent = (name: string, color: string) => {
    setContinents((prev) => [...prev, { id: createId(), name, color }]);
  };

  const addRegion = (name: string, color: string) => {
    setRegions((prev) => [...prev, { id: createId(), name, color }]);
  };

  const addCulture = (name: string, color: string, iconDataUrl?: string) => {
    setCultures((prev) => [...prev, { id: createId(), name, color, iconDataUrl }]);
  };


  const addBuilding = (
    name: string,
    cost: number,
    iconDataUrl?: string,
    industryId?: string,
    startingDucats?: number,
    consumptionByResourceId?: Record<string, number>,
    extractionByResourceId?: Record<string, number>,
    productionByResourceId?: Record<string, number>,
    requirements?: BuildingDefinition['requirements'],
  ) => {
    setBuildings((prev) => [
      ...prev,
      {
        id: createId(),
        name,
        cost,
        iconDataUrl,
        industryId,
        startingDucats: normalizePositiveNumber(startingDucats),
        consumptionByResourceId: normalizeResourceMap(consumptionByResourceId),
        extractionByResourceId: normalizeResourceMap(extractionByResourceId),
        productionByResourceId: normalizeResourceMap(productionByResourceId),
        requirements,
      },
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

  const applyDiplomacyAgreement = (payload: Omit<DiplomacyAgreement, 'id'>) => {
    setDiplomacyAgreements((prev) => {
      const next = [
        ...prev,
        { ...payload, id: createId(), startTurn: turn },
      ];
      return next;
    });
  };

  const applyMarketMembershipByAgreement = (
    agreement: Omit<DiplomacyAgreement, 'id'>,
  ) => {
    const category = agreement.agreementCategory ?? 'construction';
    if (category !== 'market_invite' && category !== 'market') return;
    const leaderCountryId = agreement.marketLeaderCountryId ?? agreement.hostCountryId;
    const guestCountryId =
      agreement.hostCountryId === leaderCountryId
        ? agreement.guestCountryId
        : agreement.hostCountryId;
    if (!leaderCountryId || !guestCountryId || leaderCountryId === guestCountryId) {
      return;
    }
    setMarkets((prev) => {
      const targetMarket = prev.find(
        (market) => market.leaderCountryId === leaderCountryId,
      );
      if (!targetMarket) return prev;
      return prev
        .map((market) => ({
          ...market,
          memberCountryIds:
            market.id === targetMarket.id
              ? Array.from(new Set([...market.memberCountryIds, guestCountryId]))
              : market.memberCountryIds.filter((id) => id !== guestCountryId),
        }))
        .filter(
          (market) =>
            market.memberCountryIds.length > 0 &&
            market.memberCountryIds.includes(market.leaderCountryId),
        );
    });
  };

  const addDiplomacyProposal = (
    payload: Omit<DiplomacyProposal, 'id' | 'createdTurn'>,
  ) => {
    setDiplomacyProposals((prev) => [
      ...prev,
      {
        ...payload,
        kind: payload.kind ?? 'new',
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

  const inviteCountryToMarketByTreaty = (targetCountryId: string) => {
    if (!activeCountryId || !targetCountryId || activeCountryId === targetCountryId) {
      return;
    }
    const ownMarket = markets.find(
      (market) => market.leaderCountryId === activeCountryId,
    );
    if (!ownMarket) return;
    if (ownMarket.creatorCountryId !== activeCountryId) return;
    if (ownMarket.memberCountryIds.includes(targetCountryId)) return;
    const alreadyAssigned = markets.some((market) =>
      market.memberCountryIds.includes(targetCountryId),
    );
    if (alreadyAssigned) return;
    const existingInvite = diplomacyProposals.some((proposal) => {
      const category = proposal.agreement.agreementCategory ?? 'construction';
      return (
        (category === 'market_invite' || category === 'market') &&
        proposal.fromCountryId === activeCountryId &&
        proposal.toCountryId === targetCountryId &&
        proposal.agreement.marketLeaderCountryId === activeCountryId
      );
    });
    if (existingInvite) return;
    addDiplomacyProposal({
      fromCountryId: activeCountryId,
      toCountryId: targetCountryId,
      agreement: {
        title: `Приглашение в рынок ${ownMarket.name}`,
        hostCountryId: activeCountryId,
        guestCountryId: targetCountryId,
        agreementCategory: 'market_invite',
        marketLeaderCountryId: activeCountryId,
        allowState: true,
        allowCompanies: false,
      },
    });
  };

  const acceptDiplomacyProposal = (proposalId: string) => {
    const proposal = diplomacyProposals.find((entry) => entry.id === proposalId);
    if (!proposal) return;
    if (proposal.kind === 'renewal') {
      const voterId = activeCountryId;
      if (!voterId) return;
      let shouldRenew = false;
      let renewedAgreement: Omit<DiplomacyAgreement, 'id'> | null = null;
      setDiplomacyProposals((prev) =>
        prev.flatMap((entry) => {
          if (entry.id !== proposalId) return [entry];
          const targets =
            entry.targetCountryIds && entry.targetCountryIds.length > 0
              ? entry.targetCountryIds
              : [entry.toCountryId];
          const approvals = Array.from(new Set([...(entry.approvals ?? []), voterId]));
          const approvedByAll = targets.every((id) => approvals.includes(id));
          if (approvedByAll) {
            shouldRenew = true;
            renewedAgreement = {
              ...entry.agreement,
              startTurn: undefined,
            };
            return [];
          }
          return [{ ...entry, approvals }];
        }),
      );
      const voterName =
        countries.find((country) => country.id === voterId)?.name ?? voterId;
      const hostName =
        countries.find((country) => country.id === proposal.agreement.hostCountryId)
          ?.name ?? proposal.agreement.hostCountryId;
      const guestName =
        countries.find((country) => country.id === proposal.agreement.guestCountryId)
          ?.name ?? proposal.agreement.guestCountryId;
      addEvent({
        category: 'diplomacy',
        message: `${voterName} подтвердила продление договора ${hostName} ↔ ${guestName}.`,
        countryId: voterId,
        priority: 'low',
      });
      if (shouldRenew && renewedAgreement) {
        applyDiplomacyAgreement(renewedAgreement);
        addEvent({
          category: 'diplomacy',
          message: `Договор ${hostName} ↔ ${guestName} продлен.`,
          countryId: renewedAgreement.hostCountryId,
          priority: 'low',
        });
      }
      return;
    }
    const mergedAgreement: Omit<DiplomacyAgreement, 'id'> = {
      ...proposal.agreement,
      counterTerms: proposal.counterAgreement
        ? {
            agreementCategory: proposal.counterAgreement.agreementCategory,
            marketLeaderCountryId: proposal.counterAgreement.marketLeaderCountryId,
            kind: proposal.counterAgreement.kind,
            allowState: proposal.counterAgreement.allowState,
            allowCompanies: proposal.counterAgreement.allowCompanies,
            companyIds: proposal.counterAgreement.companyIds,
            buildingIds: proposal.counterAgreement.buildingIds,
            routeTypeIds: proposal.counterAgreement.routeTypeIds,
            logisticsRouteLimits: proposal.counterAgreement.logisticsRouteLimits,
            provinceIds: proposal.counterAgreement.provinceIds,
            industries: proposal.counterAgreement.industries,
            limits: proposal.counterAgreement.limits,
          }
        : proposal.reciprocal
          ? {
              agreementCategory: proposal.agreement.agreementCategory,
              marketLeaderCountryId: proposal.agreement.marketLeaderCountryId,
              kind: proposal.agreement.kind,
              allowState: proposal.agreement.allowState,
              allowCompanies: proposal.agreement.allowCompanies,
              companyIds: proposal.agreement.companyIds,
              buildingIds: proposal.agreement.buildingIds,
              routeTypeIds: proposal.agreement.routeTypeIds,
              logisticsRouteLimits: proposal.agreement.logisticsRouteLimits,
              provinceIds: proposal.agreement.provinceIds,
              industries: proposal.agreement.industries,
              limits: proposal.agreement.limits,
            }
          : undefined,
    };
    applyDiplomacyAgreement(mergedAgreement);
    applyMarketMembershipByAgreement(mergedAgreement);
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
    if (proposal.kind === 'renewal') {
      const deciderId = activeCountryId ?? proposal.toCountryId;
      const deciderName =
        countries.find((country) => country.id === deciderId)?.name ?? deciderId;
      const hostName =
        countries.find((country) => country.id === proposal.agreement.hostCountryId)
          ?.name ?? proposal.agreement.hostCountryId;
      const guestName =
        countries.find((country) => country.id === proposal.agreement.guestCountryId)
          ?.name ?? proposal.agreement.guestCountryId;
      addEvent({
        category: 'diplomacy',
        message: `${deciderName} отклонила продление договора ${hostName} ↔ ${guestName}.`,
        countryId: deciderId,
        priority: 'low',
      });
      return;
    }
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

  const updateBuildingEconomy = (
    id: string,
    patch: Pick<
      BuildingDefinition,
      | 'startingDucats'
      | 'consumptionByResourceId'
      | 'extractionByResourceId'
      | 'productionByResourceId'
    >,
  ) => {
    setBuildings((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              startingDucats: normalizePositiveNumber(patch.startingDucats),
              consumptionByResourceId: normalizeResourceMap(
                patch.consumptionByResourceId,
              ),
              extractionByResourceId: normalizeResourceMap(
                patch.extractionByResourceId,
              ),
              productionByResourceId: normalizeResourceMap(
                patch.productionByResourceId,
              ),
            }
          : item,
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
          (agreement) => isAgreementActive(agreement),
        );
        const matchesWithTerms = matches
          .map((agreement) => ({
            agreement,
            terms: resolveAgreementTerms(agreement, hostId, ownerCountryId),
          }))
          .filter(
            (entry) =>
              entry.terms != null &&
              (entry.terms.agreementCategory ?? 'construction') ===
                'construction',
          );
        if (matchesWithTerms.length === 0) return false;

        const industryAllowed = (
          agreement: DiplomacyAgreement,
          id: string,
          terms: ReturnType<typeof resolveAgreementTerms>,
        ) => {
          if (!terms?.industries || terms.industries.length === 0) {
            return true;
          }
          const industryId =
            buildings.find((item) => item.id === id)?.industryId ?? undefined;
          return Boolean(industryId && terms.industries.includes(industryId));
        };
        const buildingAllowed = (
          agreement: DiplomacyAgreement,
          id: string,
          terms: ReturnType<typeof resolveAgreementTerms>,
        ) => {
          if (!terms?.buildingIds || terms.buildingIds.length === 0) {
            return true;
          }
          return terms.buildingIds.includes(id);
        };
        const provinceAllowed = (
          agreement: DiplomacyAgreement,
          provId: string,
          terms: ReturnType<typeof resolveAgreementTerms>,
        ) => {
          if (!terms?.provinceIds || terms.provinceIds.length === 0) {
            return true;
          }
          return terms.provinceIds.includes(provId);
        };
        const ownerAllowed = (
          agreement: DiplomacyAgreement,
          terms: ReturnType<typeof resolveAgreementTerms>,
        ) => {
          const allowsState = terms?.allowState ?? terms?.kind === 'state';
          const allowsCompanies =
            terms?.allowCompanies ?? terms?.kind === 'company';
          if (owner.type === 'state') return allowsState;
          if (!allowsCompanies) return false;
          if (terms?.companyIds && terms.companyIds.length > 0) {
            return terms.companyIds.includes(owner.companyId);
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
            const terms = resolveAgreementTerms(
              agreement,
              hostId,
              ownerCountryId,
            );
            if (!terms) return false;
            const allowsState = terms.allowState ?? terms.kind === 'state';
            const allowsCompanies =
              terms.allowCompanies ?? terms.kind === 'company';
            if (target.type === 'state') {
              if (!allowsState) return false;
            } else {
              if (!allowsCompanies) return false;
              if (terms.companyIds && terms.companyIds.length > 0) {
                if (!terms.companyIds.includes(target.companyId)) return false;
              }
            }
            if (!provinceAllowed(agreement, provinceId, terms)) return false;
            if (!buildingAllowed(agreement, buildingId, terms)) return false;
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
              const terms = resolveAgreementTerms(match, hostId, ownerCountryId);
              if (!terms) return false;
              if (!provinceAllowed(match, prov.id, terms)) return false;
              return industryAllowed(match, entry.buildingId, terms);
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
                  const terms = resolveAgreementTerms(
                    match,
                    hostId,
                    ownerCountryId,
                  );
                  if (!terms) return false;
                  if (!provinceAllowed(match, prov.id, terms)) return false;
                  return industryAllowed(match, entryBuildingId, terms);
                });
                return sumProgress + filtered.length;
              },
              0,
            );
            return sum + built + inProgress;
          }, 0);

        return matchesWithTerms.some(({ agreement, terms }) => {
          if (!terms) return false;
          if (!ownerAllowed(agreement, terms)) return false;
          if (!provinceAllowed(agreement, provinceId, terms)) return false;
          if (!buildingAllowed(agreement, buildingId, terms)) return false;
          if (!industryAllowed(agreement, buildingId, terms)) return false;
          const limits = terms.limits ?? {};
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

  const addResource = (
    name: string,
    color: string,
    iconDataUrl?: string,
    resourceCategoryId?: string,
    basePrice?: number,
    minMarketPrice?: number,
    maxMarketPrice?: number,
    infrastructureCostPerUnit?: number,
  ) => {
    const normalizedBasePrice = normalizeResourcePrice(
      basePrice,
      marketDefaultResourceBasePrice,
    );
    const normalizedMin = normalizeOptionalResourcePrice(minMarketPrice);
    const normalizedMax = normalizeOptionalResourcePrice(maxMarketPrice);
    const boundedMin =
      normalizedMin == null ? undefined : Math.min(normalizedMin, normalizedMax ?? normalizedMin);
    const boundedMax =
      normalizedMax == null ? undefined : Math.max(normalizedMax, boundedMin ?? normalizedMax);
    const normalizedInfrastructureCostPerUnit = normalizeInfrastructureCostPerUnit(
      infrastructureCostPerUnit,
    );
    const resourceId = createId();
    setResources((prev) => [
      ...prev,
      {
        id: resourceId,
        name,
        color,
        iconDataUrl,
        resourceCategoryId,
        basePrice: normalizedBasePrice,
        minMarketPrice: boundedMin,
        maxMarketPrice: boundedMax,
        infrastructureCostPerUnit: normalizedInfrastructureCostPerUnit,
      },
    ]);
    setMarkets((prev) =>
      prev.map((market) => ({
        ...market,
        priceByResourceId: {
          ...(market.priceByResourceId ?? {}),
          [resourceId]: normalizedBasePrice,
        },
        priceHistoryByResourceId: {
          ...(market.priceHistoryByResourceId ?? {}),
          [resourceId]: [normalizedBasePrice],
        },
        demandHistoryByResourceId: {
          ...(market.demandHistoryByResourceId ?? {}),
          [resourceId]: [0],
        },
        offerHistoryByResourceId: {
          ...(market.offerHistoryByResourceId ?? {}),
          [resourceId]: [0],
        },
        productionFactHistoryByResourceId: {
          ...(market.productionFactHistoryByResourceId ?? {}),
          [resourceId]: [0],
        },
        productionMaxHistoryByResourceId: {
          ...(market.productionMaxHistoryByResourceId ?? {}),
          [resourceId]: [0],
        },
      })),
    );
  };

  const addResourceCategory = (name: string, color?: string) => {
    setResourceCategories((prev) => [
      ...prev,
      { id: createId(), name, color: color || '#38bdf8' },
    ]);
  };

  const updateResourceCategory = (resourceId: string, resourceCategoryId?: string) => {
    setResources((prev) =>
      prev.map((item) =>
        item.id === resourceId ? { ...item, resourceCategoryId } : item,
      ),
    );
  };

  const updateResourcePricing = (
    resourceId: string,
    patch: {
      basePrice?: number;
      minMarketPrice?: number;
      maxMarketPrice?: number;
      infrastructureCostPerUnit?: number;
    },
  ) => {
    let nextBasePrice = marketDefaultResourceBasePrice;
    setResources((prev) =>
      prev.map((item) => {
        if (item.id !== resourceId) return item;
        const basePrice = normalizeResourcePrice(
          patch.basePrice ?? item.basePrice,
          marketDefaultResourceBasePrice,
        );
        const minPriceRaw = normalizeOptionalResourcePrice(
          patch.minMarketPrice ?? item.minMarketPrice,
        );
        const maxPriceRaw = normalizeOptionalResourcePrice(
          patch.maxMarketPrice ?? item.maxMarketPrice,
        );
        const minMarketPrice =
          minPriceRaw == null ? undefined : Math.min(minPriceRaw, maxPriceRaw ?? minPriceRaw);
        const maxMarketPrice =
          maxPriceRaw == null ? undefined : Math.max(maxPriceRaw, minMarketPrice ?? maxPriceRaw);
        const infrastructureCostPerUnit = normalizeInfrastructureCostPerUnit(
          patch.infrastructureCostPerUnit ?? item.infrastructureCostPerUnit,
        );
        nextBasePrice = basePrice;
        return {
          ...item,
          basePrice,
          minMarketPrice,
          maxMarketPrice,
          infrastructureCostPerUnit,
        };
      }),
    );
    setMarkets((prev) =>
      prev.map((market) => {
        const current = normalizeResourcePrice(
          market.priceByResourceId?.[resourceId],
          nextBasePrice,
        );
        const nextPrices = {
          ...(market.priceByResourceId ?? {}),
          [resourceId]: current,
        };
        const nextHistory = {
          ...(market.priceHistoryByResourceId ?? {}),
          [resourceId]: normalizeResourcePriceHistory(
            market.priceHistoryByResourceId?.[resourceId],
            current,
            marketPriceHistoryLength,
          ),
        };
        const nextDemandHistory = {
          ...(market.demandHistoryByResourceId ?? {}),
          [resourceId]: normalizeResourceAmountHistory(
            market.demandHistoryByResourceId?.[resourceId],
            0,
            marketPriceHistoryLength,
          ),
        };
        const nextOfferHistory = {
          ...(market.offerHistoryByResourceId ?? {}),
          [resourceId]: normalizeResourceAmountHistory(
            market.offerHistoryByResourceId?.[resourceId],
            0,
            marketPriceHistoryLength,
          ),
        };
        const nextProductionFactHistory = {
          ...(market.productionFactHistoryByResourceId ?? {}),
          [resourceId]: normalizeResourceAmountHistory(
            market.productionFactHistoryByResourceId?.[resourceId],
            0,
            marketPriceHistoryLength,
          ),
        };
        const nextProductionMaxHistory = {
          ...(market.productionMaxHistoryByResourceId ?? {}),
          [resourceId]: normalizeResourceAmountHistory(
            market.productionMaxHistoryByResourceId?.[resourceId],
            0,
            marketPriceHistoryLength,
          ),
        };
        return {
          ...market,
          priceByResourceId: nextPrices,
          priceHistoryByResourceId: nextHistory,
          demandHistoryByResourceId: nextDemandHistory,
          offerHistoryByResourceId: nextOfferHistory,
          productionFactHistoryByResourceId: nextProductionFactHistory,
          productionMaxHistoryByResourceId: nextProductionMaxHistory,
        };
      }),
    );
  };

  const updateResourceCategoryColor = (id: string, color: string) => {
    setResourceCategories((prev) =>
      prev.map((item) => (item.id === id ? { ...item, color } : item)),
    );
  };

  const deleteResourceCategory = (id: string) => {
    setResourceCategories((prev) => prev.filter((item) => item.id !== id));
    setResources((prev) =>
      prev.map((item) =>
        item.resourceCategoryId === id
          ? { ...item, resourceCategoryId: undefined }
          : item,
      ),
    );
    setLogistics((prev) => ({
      ...prev,
      routeTypes: prev.routeTypes.map((item) => ({
        ...item,
        marketAccessCategoryIds: (item.marketAccessCategoryIds ?? []).filter(
          (categoryId) => categoryId !== id,
        ),
        transportCapacityPerLevelByCategory: Object.fromEntries(
          Object.entries(item.transportCapacityPerLevelByCategory ?? {}).filter(
            ([categoryId]) => categoryId !== id,
          ),
        ),
      })),
    }));
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

  const deleteContinent = (id: string) => {
    setContinents((prev) => prev.filter((c) => c.id !== id));
    setProvinces((prev) => {
      const next: ProvinceRecord = { ...prev };
      Object.values(next).forEach((province) => {
        if (province.continentId === id) {
          province.continentId = undefined;
        }
      });
      return next;
    });
  };

  const deleteRegion = (id: string) => {
    setRegions((prev) => prev.filter((r) => r.id !== id));
    setProvinces((prev) => {
      const next: ProvinceRecord = { ...prev };
      Object.values(next).forEach((province) => {
        if (province.regionId === id) {
          province.regionId = undefined;
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
    setMarkets((prev) =>
      prev.map((market) => {
        const hasPrice = Boolean(market.priceByResourceId && id in market.priceByResourceId);
        const hasHistory = Boolean(
          market.priceHistoryByResourceId && id in market.priceHistoryByResourceId,
        );
        const hasDemandHistory = Boolean(
          market.demandHistoryByResourceId && id in market.demandHistoryByResourceId,
        );
        const hasOfferHistory = Boolean(
          market.offerHistoryByResourceId && id in market.offerHistoryByResourceId,
        );
        const hasProductionFactHistory = Boolean(
          market.productionFactHistoryByResourceId &&
            id in market.productionFactHistoryByResourceId,
        );
        const hasProductionMaxHistory = Boolean(
          market.productionMaxHistoryByResourceId &&
            id in market.productionMaxHistoryByResourceId,
        );
        if (
          !hasPrice &&
          !hasHistory &&
          !hasDemandHistory &&
          !hasOfferHistory &&
          !hasProductionFactHistory &&
          !hasProductionMaxHistory
        ) {
          return market;
        }
        const nextPrices = { ...(market.priceByResourceId ?? {}) };
        const nextHistory = { ...(market.priceHistoryByResourceId ?? {}) };
        const nextDemandHistory = { ...(market.demandHistoryByResourceId ?? {}) };
        const nextOfferHistory = { ...(market.offerHistoryByResourceId ?? {}) };
        const nextProductionFactHistory = {
          ...(market.productionFactHistoryByResourceId ?? {}),
        };
        const nextProductionMaxHistory = {
          ...(market.productionMaxHistoryByResourceId ?? {}),
        };
        delete nextPrices[id];
        delete nextHistory[id];
        delete nextDemandHistory[id];
        delete nextOfferHistory[id];
        delete nextProductionFactHistory[id];
        delete nextProductionMaxHistory[id];
        return {
          ...market,
          priceByResourceId: nextPrices,
          priceHistoryByResourceId: nextHistory,
          demandHistoryByResourceId: nextDemandHistory,
          offerHistoryByResourceId: nextOfferHistory,
          productionFactHistoryByResourceId: nextProductionFactHistory,
          productionMaxHistoryByResourceId: nextProductionMaxHistory,
        };
      }),
    );
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
          logisticsNodes={logistics.nodes}
          logisticsEdges={logistics.edges}
          logisticsRouteTypes={logistics.routeTypes}
          logisticsRouteProvinceIds={logisticsRouteProvinceIds}
          marketCapitals={marketCapitals}
          selectedResourceId={selectedResourceId}
          onSelectResource={setSelectedResourceId}
          selectedId={selectedProvinceId}
          onToggleLayer={toggleLayer}
          onProvincesDetected={ensureProvinces}
          onProvinceAdjacencyDetected={
            shouldComputeAdjacency ? handleProvinceAdjacencyDetected : undefined
          }
          onSelectProvince={(id) => {
            if (logisticsRoutePlannerActive) {
              setLogisticsRouteProvinceIds((prev) => {
                if (prev[prev.length - 1] === id) return prev;
                const routeType = logistics.routeTypes.find(
                  (item) => item.id === logisticsRouteDraft?.routeTypeId,
                );
                const province = provinces[id];
                if (!province) {
                  setRoutePlannerHint('Провинция не найдена в данных карты.');
                  return prev;
                }
                if (!activeCountryId) {
                  setRoutePlannerHint('Выберите активную страну для строительства маршрута.');
                  return prev;
                }
                const provinceOwnerId = province.ownerCountryId;
                if (!provinceOwnerId) {
                  setRoutePlannerHint('У провинции нет владельца: строительство здесь невозможно.');
                  return prev;
                }
                if (
                  provinceOwnerId !== activeCountryId &&
                  !hasRouteBuildAccessByAgreement(
                    provinceOwnerId,
                    activeCountryId,
                    province.id,
                    logisticsRouteDraft?.routeTypeId,
                  )
                ) {
                  setRoutePlannerHint('Нет дипломатического доступа для строительства маршрута в этой провинции.');
                  return prev;
                }
                const requiredBuildingIds = routeType?.requiredBuildingIds ?? [];
                if (requiredBuildingIds.length > 0) {
                  const builtIds = new Set(
                    (province.buildingsBuilt ?? []).map((entry) => entry.buildingId),
                  );
                  const mode = routeType?.requiredBuildingsMode ?? 'all';
                  if (mode === 'all') {
                    const missing = requiredBuildingIds.filter(
                      (buildingId) => !builtIds.has(buildingId),
                    );
                    if (missing.length > 0) {
                      const missingName = buildings.find(
                        (item) => item.id === missing[0],
                      )?.name;
                      setRoutePlannerHint(
                        `В этой провинции не хватает нужного здания: ${missingName ?? missing[0]}.`,
                      );
                      return prev;
                    }
                  } else {
                    const hasAnyRequired = requiredBuildingIds.some((buildingId) =>
                      builtIds.has(buildingId),
                    );
                    if (!hasAnyRequired) {
                      setRoutePlannerHint(
                        'В этой провинции отсутствуют требуемые здания.',
                      );
                      return prev;
                    }
                  }
                }
                const landscapeAny = routeType?.landscape?.anyOf ?? [];
                const landscapeNone = routeType?.landscape?.noneOf ?? [];
                const provinceLandscapeId = province.landscapeId;
                if (!(routeType?.allowAllLandscapes ?? true)) {
                  if (
                    landscapeAny.length > 0 &&
                    (!provinceLandscapeId || !landscapeAny.includes(provinceLandscapeId))
                  ) {
                    setRoutePlannerHint(
                      'Ландшафт провинции не подходит для этого типа маршрута.',
                    );
                    return prev;
                  }
                  if (
                    provinceLandscapeId &&
                    landscapeNone.includes(provinceLandscapeId)
                  ) {
                    setRoutePlannerHint(
                      'Этот тип маршрута запрещен для выбранного ландшафта.',
                    );
                    return prev;
                  }
                }
                if (prev.includes(id)) {
                  setRoutePlannerHint(
                    'Провинция уже есть в этом маршруте. Выберите другую соседнюю.',
                  );
                  return prev;
                }
                const lastId = prev[prev.length - 1];
                if (lastId && !(routeType?.allowProvinceSkipping ?? false)) {
                  const neighbors = provinces[lastId]?.adjacentProvinceIds ?? [];
                  if (!neighbors.includes(id)) {
                    setRoutePlannerHint(
                      'Нельзя перескочить через провинцию: выберите соседнюю.',
                    );
                    return prev;
                  }
                }
                setRoutePlannerHint(undefined);
                return [...prev, id];
              });
              setSelectedProvinceId(id);
              setInfoPanelOpen(false);
              return;
            }
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
        scienceGainPerTurn={gameSettings.sciencePointsPerTurn ?? 0}
        cultureGainPerTurn={gameSettings.culturePointsPerTurn ?? 0}
        religionGainPerTurn={gameSettings.religionPointsPerTurn ?? 0}
        goldGainPerTurn={gameSettings.goldPerTurn ?? 0}
        ducatsGainPerTurn={gameSettings.ducatsPerTurn ?? 0}
        colonizationActiveCount={getActiveColonizationsCount(activeCountryId)}
        colonizationActiveLimit={gameSettings.colonizationMaxActive ?? 0}
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
          Предложения ({pendingDiplomacyProposals.length})
        </button>
      )}
      <LeftToolbar />
      {logisticsRoutePlannerActive && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-40 rounded-xl border border-cyan-400/40 bg-[#08131f]/90 backdrop-blur px-3 py-2 flex items-center gap-2 shadow-lg shadow-cyan-900/30">
          <div className="px-2">
            <div className="text-cyan-100/90 text-xs">
              Выбрано провинций: {logisticsRouteProvinceIds.length} шт.
            </div>
            <div className="text-cyan-100/70 text-[11px] leading-tight">
              Выберите провинции по пути на карте. Нельзя повторять провинции,
              перескакивать через соседей без разрешения и строить без договоров.
            </div>
            <div className="text-cyan-100/75 text-[11px] leading-tight mt-1">
              Стоимость: {logisticsDraftTotalCost} (участков: {Math.max(0, logisticsRouteProvinceIds.length - 1)} x {logisticsDraftSegmentCost})
            </div>
            {routePlannerHint && (
              <div className="text-amber-200/90 text-[11px] leading-tight mt-1">
                {routePlannerHint}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (!logisticsRouteDraft || logisticsRouteProvinceIds.length < 2) {
                setRoutePlannerHint('Для строительства нужно выбрать минимум 2 провинции.');
                return;
              }
              if (!activeCountryId) {
                setRoutePlannerHint('Выберите активную страну для строительства.');
                return;
              }
              const draftRouteType = logistics.routeTypes.find(
                (item) => item.id === logisticsRouteDraft.routeTypeId,
              );
              const segmentCount = Math.max(0, logisticsRouteProvinceIds.length - 1);
              const segmentCost = Math.max(
                0,
                Math.floor(draftRouteType?.constructionCostPerSegment ?? 0),
              );
              const totalCost = segmentCount * segmentCost;
              const foreignHostCountryIds = Array.from(
                new Set(
                  logisticsRouteProvinceIds
                    .map((provinceId) => provinces[provinceId]?.ownerCountryId)
                    .filter(
                      (ownerId): ownerId is string =>
                        Boolean(ownerId) && ownerId !== activeCountryId,
                    ),
                ),
              );
              const blockedHostId = foreignHostCountryIds.find(
                (hostCountryId) =>
                  !hasRouteBuildAccessByAgreementForPath(
                    hostCountryId,
                    activeCountryId,
                    logisticsRouteDraft.routeTypeId,
                    logisticsRouteProvinceIds,
                  ),
              );
              if (blockedHostId) {
                const blockedCountryName =
                  countries.find((item) => item.id === blockedHostId)?.name ??
                  blockedHostId;
                setRoutePlannerHint(
                  `Превышены лимиты или нет прав логистического договора для страны ${blockedCountryName}.`,
                );
                return;
              }
              const startsUnderConstruction = totalCost > 0;
              const routeId = createId();
              setLogistics((prev) => ({
                ...prev,
                routes: [
                  ...prev.routes,
                  {
                    id: routeId,
                    name: logisticsRouteDraft.name,
                    routeTypeId: logisticsRouteDraft.routeTypeId,
                    provinceIds: logisticsRouteProvinceIds,
                    ownerCountryId: activeCountryId,
                    countryStatuses: {},
                    constructionRequiredPoints: totalCost,
                    constructionProgressPoints: startsUnderConstruction ? 0 : totalCost,
                    level: 1,
                  },
                ],
              }));
              for (let i = 0; i < logisticsRouteProvinceIds.length - 1; i += 1) {
                const fromProvinceId = logisticsRouteProvinceIds[i];
                const toProvinceId = logisticsRouteProvinceIds[i + 1];
                if (
                  !fromProvinceId ||
                  !toProvinceId ||
                  fromProvinceId === toProvinceId
                ) {
                  continue;
                }
                addLogisticsEdge({
                  id: createId(),
                  routeId,
                  fromNodeId: `province:${fromProvinceId}`,
                  toNodeId: `province:${toProvinceId}`,
                  routeTypeId: logisticsRouteDraft.routeTypeId,
                  active: true,
                  bidirectional: true,
                  ownerCountryId: activeCountryId,
                });
              }
              if (startsUnderConstruction) {
                addEvent({
                  category: 'economy',
                  message: `Начато строительство маршрута "${logisticsRouteDraft.name}" (${totalCost} очков).`,
                  countryId: activeCountryId,
                  priority: 'low',
                });
              }
              setLogisticsRouteProvinceIds([]);
              setLogisticsRouteDraft(null);
              setRoutePlannerHint(undefined);
              setLogisticsRoutePlannerActive(false);
              setLogisticsOpen(true);
            }}
            className="h-8 px-3 rounded-lg border border-emerald-400/40 bg-emerald-500/20 text-emerald-200 text-sm"
          >
            Построить
          </button>
          <button
            onClick={() => {
              setLogisticsRoutePlannerActive(false);
              setLogisticsRouteDraft(null);
              setLogisticsRouteProvinceIds([]);
              setRoutePlannerHint(undefined);
              setLogisticsOpen(true);
            }}
            className="h-8 px-3 rounded-lg border border-white/15 bg-black/30 text-white/80 text-sm"
          >
            Отмена
          </button>
        </div>
      )}

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
          ownerFlagDataUrl={
            selectedProvinceId
              ? countries.find(
                  (country) =>
                    country.id === provinces[selectedProvinceId]?.ownerCountryId,
                )?.flagDataUrl
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
          cultureIconDataUrl={
            selectedProvinceId
              ? cultures.find((c) => c.id === provinces[selectedProvinceId]?.cultureId)
                  ?.iconDataUrl
              : undefined
          }
          landscape={
            selectedProvinceId
              ? landscapes.find((l) => l.id === provinces[selectedProvinceId]?.landscapeId)
                  ?.name
              : undefined
          }
          continent={
            selectedProvinceId
              ? continents.find((c) => c.id === provinces[selectedProvinceId]?.continentId)
                  ?.name
              : undefined
          }
          region={
            selectedProvinceId
              ? regions.find((r) => r.id === provinces[selectedProvinceId]?.regionId)
                  ?.name
              : undefined
          }
          religion={
            selectedProvinceId
              ? religions.find((r) => r.id === provinces[selectedProvinceId]?.religionId)
                  ?.name
              : undefined
          }
          religionIconDataUrl={
            selectedProvinceId
              ? religions.find((r) => r.id === provinces[selectedProvinceId]?.religionId)
                  ?.iconDataUrl
              : undefined
          }
          resources={
            selectedProvinceId
              ? Object.entries(provinces[selectedProvinceId]?.resourceAmounts ?? {})
                  .filter(([, amount]) => amount > 0)
                  .map(([resourceId, amount]) => {
                    const resource = resources.find((item) => item.id === resourceId);
                    return resource
                      ? { name: resource.name, amount, iconDataUrl: resource.iconDataUrl }
                      : null;
                  })
                  .filter(Boolean)
              : []
          }
          radiation={
            selectedProvinceId
              ? provinces[selectedProvinceId]?.radiation ?? 0
              : undefined
          }
          pollution={
            selectedProvinceId
              ? provinces[selectedProvinceId]?.pollution ?? 0
              : undefined
          }
          fertility={
            selectedProvinceId
              ? provinces[selectedProvinceId]?.fertility ?? 0
              : undefined
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
          routeConstructionProgress={selectedProvinceRouteConstructionProgress}
          marketAccessByCategory={selectedProvinceMarketAccessByCategory}
        />
      )}

      <BottomDock
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenIndustry={() => setIndustryOpen(true)}
        onOpenDiplomacy={() => setDiplomacyOpen(true)}
        onOpenMarkets={() => setMarketsOpen(true)}
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
        onOpenLogistics={() => {
          if (contextMenu?.provinceId) {
            setSelectedProvinceId(contextMenu.provinceId);
          }
          setLogisticsRouteProvinceIds([]);
          setLogisticsRoutePlannerActive(false);
          setLogisticsRouteDraft(null);
          setRoutePlannerHint(undefined);
          setLogisticsOpen(true);
        }}
      />

      <LogisticsModal
        open={logisticsOpen}
        provinces={provinces}
        countries={countries}
        routeTypes={logistics.routeTypes}
        routes={logistics.routes}
        activeCountryId={activeCountryId}
        demolitionCostPercent={gameSettings.demolitionCostPercent ?? 20}
        onSetRouteStatus={setRouteCountryStatus}
        onSetRouteLevel={setRouteLevel}
        onDemolishRoute={demolishLogisticsRoute}
        onClose={() => {
          setLogisticsOpen(false);
          setLogisticsRoutePlannerActive(false);
          setLogisticsRouteDraft(null);
          setLogisticsRouteProvinceIds([]);
          setRoutePlannerHint(undefined);
        }}
        onStartRouteBuild={(payload) => {
          setLogisticsRouteDraft({
            name: payload.name,
            routeTypeId: payload.routeTypeId,
          });
          setLogisticsRouteProvinceIds([]);
          setRoutePlannerHint(undefined);
          setLogisticsOpen(false);
          setLogisticsRoutePlannerActive(true);
        }}
      />
      <MarketModal
        open={marketsOpen}
        countries={countries}
        markets={markets}
        provinces={provinces}
        resources={resources}
        buildings={buildings}
        proposals={diplomacyProposals}
        activeCountryId={activeCountryId}
        onClose={() => setMarketsOpen(false)}
        onCreateMarket={addMarket}
        onUpdateMarket={updateMarket}
        onDeleteMarket={deleteMarket}
        onLeaveMarket={leaveMarket}
        onTradeWithWarehouse={tradeWithMarketWarehouse}
        onInviteByTreaty={inviteCountryToMarketByTreaty}
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
        onRecomputeAdjacency={() => setAdjacencyRecomputeRequested(true)}
        adjacencyNeedsComputation={needsAdjacencyComputation}
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
        routeTypes={logistics.routeTypes}
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
        routeTypes={logistics.routeTypes}
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
        continents={continents}
        regions={regions}
        cultures={cultures}
        resourceCategories={resourceCategories}
        resources={resources}
        buildings={buildings}
        industries={industries}
        routeTypes={logistics.routeTypes}
        companies={companies}
        onClose={() => setAdminOpen(false)}
        onAssignOwner={assignOwner}
        onAssignClimate={assignClimate}
        onAssignReligion={assignReligion}
        onAssignLandscape={assignLandscape}
        onAssignContinent={assignContinent}
        onAssignRegion={assignRegion}
        onAssignCulture={assignCulture}
        onSetProvinceResourceAmount={setProvinceResourceAmount}
        onSetColonizationCost={setColonizationCost}
        onSetColonizationDisabled={setColonizationDisabled}
        onSetRadiation={setRadiation}
        onSetPollution={setPollution}
        onSetFertility={setFertility}
        onAddClimate={addClimate}
        onAddReligion={addReligion}
        onAddLandscape={addLandscape}
        onAddContinent={addContinent}
        onAddRegion={addRegion}
        onAddCulture={addCulture}
        onAddResourceCategory={addResourceCategory}
        onAddResource={addResource}
        onAddBuilding={addBuilding}
        onAddIndustry={addIndustry}
        onAddRouteType={(
          name,
          color,
          lineWidth,
          dashPattern,
          constructionCostPerSegment,
          allowProvinceSkipping,
          requiredBuildingIds,
          landscape,
          requiredBuildingsMode,
          allowAllLandscapes,
          marketAccessCategoryIds,
          allowAllMarketCategories,
          transportCapacityPerLevelByCategory,
        ) =>
          addLogisticsRouteType({
            name,
            color,
            lineWidth,
            dashPattern,
            constructionCostPerSegment,
            allowProvinceSkipping,
            requiredBuildingIds,
            landscape,
            requiredBuildingsMode,
            allowAllLandscapes,
            marketAccessCategoryIds,
            allowAllMarketCategories,
            transportCapacityPerLevelByCategory,
          })
        }
        onUpdateRouteType={updateLogisticsRouteType}
        onDeleteRouteType={deleteLogisticsRouteType}
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
        onUpdateBuildingEconomy={updateBuildingEconomy}
        onUpdateClimateColor={(id, color) =>
          updateTraitColor(setClimates, id, color)
        }
        onUpdateReligionColor={(id, color) =>
          updateTraitColor(setReligions, id, color)
        }
        onUpdateLandscapeColor={(id, color) =>
          updateTraitColor(setLandscapes, id, color)
        }
        onUpdateContinentColor={(id, color) =>
          updateTraitColor(setContinents, id, color)
        }
        onUpdateRegionColor={(id, color) =>
          updateTraitColor(setRegions, id, color)
        }
        onUpdateCultureColor={(id, color) =>
          updateTraitColor(setCultures, id, color)
        }
        onUpdateResourceColor={(id, color) =>
          updateTraitColor(setResources, id, color)
        }
        onUpdateResourceCategoryColor={updateResourceCategoryColor}
        onUpdateResourcePricing={updateResourcePricing}
        onUpdateResourceCategory={updateResourceCategory}
        onDeleteClimate={deleteClimate}
        onDeleteReligion={deleteReligion}
        onDeleteLandscape={deleteLandscape}
        onDeleteContinent={deleteContinent}
        onDeleteRegion={deleteRegion}
        onDeleteCulture={deleteCulture}
        onDeleteResourceCategory={deleteResourceCategory}
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

export type Country = {
  id: string;
  name: string;
  color: string;
  flagDataUrl?: string;
  coatDataUrl?: string;
  colonizationPoints: number;
  constructionPoints?: number;
  sciencePoints?: number;
  culturePoints?: number;
  religionPoints?: number;
  gold?: number;
  ducats?: number;
};

export type GameState = {
  turn: number;
  activeCountryId?: string;
  countries: Country[];
  mapLayers?: MapLayer[];
  selectedProvinceId?: string;
  provinces?: ProvinceRecord;
  climates?: Trait[];
  religions?: Trait[];
  cultures?: Trait[];
  landscapes?: Trait[];
  continents?: Trait[];
  regions?: Trait[];
  resources?: Trait[];
  resourceCategories?: ResourceCategory[];
  buildings?: BuildingDefinition[];
  industries?: Industry[];
  companies?: Company[];
  diplomacy?: DiplomacyAgreement[];
  diplomacyProposals?: DiplomacyProposal[];
  logistics?: LogisticsState;
  markets?: Market[];
  settings?: GameSettings;
  eventLog?: EventLogState;
};

export type SaveGame = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: GameState;
  version: 1;
};

export type MapLayer = {
  id: string;
  name: string;
  visible: boolean;
};

export type MapLayerPaint = Record<string, Record<string, string>>;

export type ProvinceData = {
  id: string;
  adjacentProvinceIds?: string[];
  ownerCountryId?: string;
  climateId?: string;
  religionId?: string;
  cultureId?: string;
  landscapeId?: string;
  continentId?: string;
  regionId?: string;
  radiation?: number;
  pollution?: number;
  fertility?: number;
  resourceAmounts?: Record<string, number>;
  colonizationCost?: number;
  colonizationProgress?: Record<string, number>;
  colonizationDisabled?: boolean;
  buildingsBuilt?: BuiltBuilding[];
  constructionProgress?: Record<string, ConstructionEntry[]>;
  logisticsPointsByCategory?: Record<string, number>;
};

export type LogisticsRouteType = {
  id: string;
  name: string;
  color: string;
  lineWidth: number;
  dashPattern?: string;
  constructionCostPerSegment?: number;
  allowProvinceSkipping?: boolean;
  requiredBuildingIds?: string[];
  requiredBuildingsMode?: 'all' | 'any';
  landscape?: TraitCriteria;
  allowAllLandscapes?: boolean;
  marketAccessCategoryIds?: string[];
  allowAllMarketCategories?: boolean;
  transportCapacityPerLevelByCategory?: Record<string, number>;
};

export type LogisticsNodeType =
  | 'province'
  | 'country_market'
  | 'world_market'
  | 'port'
  | 'hub'
  | 'border';

export type LogisticsNode = {
  id: string;
  type: LogisticsNodeType;
  provinceId?: string;
  countryId?: string;
  name?: string;
};

export type LogisticsEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  routeId?: string;
  routeTypeId?: string;
  active?: boolean;
  bidirectional?: boolean;
  ownerCountryId?: string;
  requiresTransitAgreement?: boolean;
};

export type LogisticsRoute = {
  id: string;
  name: string;
  routeTypeId: string;
  provinceIds: string[];
  ownerCountryId?: string;
  countryStatuses?: Record<string, 'open' | 'closed'>;
  constructionRequiredPoints?: number;
  constructionProgressPoints?: number;
  level?: number;
};

export type LogisticsState = {
  nodes: LogisticsNode[];
  edges: LogisticsEdge[];
  routeTypes: LogisticsRouteType[];
  routes: LogisticsRoute[];
};

export type Market = {
  id: string;
  name: string;
  leaderCountryId: string;
  creatorCountryId: string;
  color: string;
  logoDataUrl?: string;
  memberCountryIds: string[];
  warehouseByResourceId?: Record<string, number>;
  capitalProvinceId?: string;
  capitalLostSinceTurn?: number;
  createdTurn?: number;
};

export type ProvinceRecord = Record<string, ProvinceData>;

export type Trait = {
  id: string;
  name: string;
  color: string;
  iconDataUrl?: string;
  resourceCategoryId?: string;
};

export type ResourceCategory = {
  id: string;
  name: string;
  color?: string;
};

export type GameSettings = {
  colonizationPointsPerTurn: number;
  eventLogRetainTurns?: number;
  constructionPointsPerTurn?: number;
  demolitionCostPercent?: number;
  diplomacyProposalExpireTurns?: number;
  marketCapitalGraceTurns?: number;
  startingColonizationPoints?: number;
  startingConstructionPoints?: number;
  sciencePointsPerTurn?: number;
  culturePointsPerTurn?: number;
  religionPointsPerTurn?: number;
  goldPerTurn?: number;
  ducatsPerTurn?: number;
  startingSciencePoints?: number;
  startingCulturePoints?: number;
  startingReligionPoints?: number;
  startingGold?: number;
  startingDucats?: number;
  colonizationMaxActive?: number;
};

export type BuildingDefinition = {
  id: string;
  name: string;
  cost: number;
  iconDataUrl?: string;
  industryId?: string;
  requirements?: {
    resources?: TraitCriteria;
    buildings?: Record<
      string,
      {
        province?: { min?: number; max?: number };
        country?: { min?: number; max?: number };
        global?: { min?: number; max?: number };
      }
    >;
    allowedCountries?: string[];
    allowedCompanies?: string[];
    allowedCountriesMode?: 'allow' | 'deny';
    allowedCompaniesMode?: 'allow' | 'deny';
    radiation?: { min?: number; max?: number };
    pollution?: { min?: number; max?: number };
    logic?: RequirementNode;
    climate?: TraitCriteria;
    landscape?: TraitCriteria;
    culture?: TraitCriteria;
    religion?: TraitCriteria;
    continent?: TraitCriteria;
    region?: TraitCriteria;
    climateId?: string;
    landscapeId?: string;
    cultureId?: string;
    religionId?: string;
    continentId?: string;
    regionId?: string;
    dependencies?: string[];
    maxPerProvince?: number;
    maxPerCountry?: number;
    maxGlobal?: number;
  };
};

export type TraitCriteria = {
  anyOf?: string[];
  noneOf?: string[];
};

export type RequirementNode =
  | {
      type: 'group';
      op: 'and' | 'or' | 'not' | 'xor' | 'nand' | 'nor' | 'implies' | 'eq';
      children: RequirementNode[];
    }
  | {
      type: 'trait';
      category:
        | 'climate'
        | 'landscape'
        | 'culture'
        | 'religion'
        | 'continent'
        | 'region';
      id: string;
    };

export type Industry = {
  id: string;
  name: string;
  iconDataUrl?: string;
  color?: string;
};

export type Company = {
  id: string;
  name: string;
  countryId: string;
  iconDataUrl?: string;
  color?: string;
};

export type DiplomacyAgreement = {
  id: string;
  title?: string;
  hostCountryId: string;
  guestCountryId: string;
  agreementCategory?: 'construction' | 'logistics' | 'market_invite' | 'market';
  marketLeaderCountryId?: string;
  kind?: 'company' | 'state';
  allowState?: boolean;
  allowCompanies?: boolean;
  companyIds?: string[];
  buildingIds?: string[];
  routeTypeIds?: string[];
  logisticsRouteLimits?: Record<
    string,
    {
      maxRoutes?: number;
      maxSegments?: number;
    }
  >;
  provinceIds?: string[];
  industries?: string[];
  limits?: {
    perProvince?: number;
    perCountry?: number;
    global?: number;
  };
  counterTerms?: {
    agreementCategory?: 'construction' | 'logistics' | 'market_invite' | 'market';
    marketLeaderCountryId?: string;
    kind?: 'company' | 'state';
    allowState?: boolean;
    allowCompanies?: boolean;
    companyIds?: string[];
    buildingIds?: string[];
    routeTypeIds?: string[];
    logisticsRouteLimits?: Record<
      string,
      {
        maxRoutes?: number;
        maxSegments?: number;
      }
    >;
    provinceIds?: string[];
    industries?: string[];
    limits?: {
      perProvince?: number;
      perCountry?: number;
      global?: number;
    };
  };
  startTurn?: number;
  durationTurns?: number;
};

export type DiplomacyProposal = {
  id: string;
  kind?: 'new' | 'renewal';
  fromCountryId: string;
  toCountryId: string;
  agreement: Omit<DiplomacyAgreement, 'id'>;
  counterAgreement?: Omit<DiplomacyAgreement, 'id'>;
  reciprocal?: boolean;
  targetCountryIds?: string[];
  approvals?: string[];
  sourceAgreementId?: string;
  createdTurn: number;
};

export type BuildingOwner =
  | { type: 'state'; countryId: string }
  | { type: 'company'; companyId: string };

export type ConstructionEntry = {
  progress: number;
  owner: BuildingOwner;
};

export type BuiltBuilding = {
  buildingId: string;
  owner: BuildingOwner;
};

export type EventCategory =
  | 'system'
  | 'colonization'
  | 'politics'
  | 'economy'
  | 'military'
  | 'diplomacy';

export type EventPriority = 'low' | 'medium' | 'high';
export type EventVisibility = 'public' | 'private';

export type EventLogEntry = {
  id: string;
  turn: number;
  timestamp: string;
  category: EventCategory;
  priority: EventPriority;
  visibility?: EventVisibility;
  title?: string;
  message: string;
  countryId?: string;
};

export type EventLogState = {
  entries: EventLogEntry[];
  filters: Record<EventCategory, boolean>;
  sortByPriority?: boolean;
  countryScope?: 'all' | 'own' | 'others';
};

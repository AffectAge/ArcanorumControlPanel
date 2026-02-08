export type Country = {
  id: string;
  name: string;
  color: string;
  flagDataUrl?: string;
  coatDataUrl?: string;
  colonizationPoints: number;
  constructionPoints?: number;
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
  resources?: Trait[];
  buildings?: BuildingDefinition[];
  industries?: Industry[];
  companies?: Company[];
  diplomacy?: DiplomacyAgreement[];
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
  ownerCountryId?: string;
  climateId?: string;
  religionId?: string;
  cultureId?: string;
  landscapeId?: string;
  radiation?: number;
  pollution?: number;
  resourceAmounts?: Record<string, number>;
  colonizationCost?: number;
  colonizationProgress?: Record<string, number>;
  colonizationDisabled?: boolean;
  buildingsBuilt?: BuiltBuilding[];
  constructionProgress?: Record<string, ConstructionEntry[]>;
};

export type ProvinceRecord = Record<string, ProvinceData>;

export type Trait = {
  id: string;
  name: string;
  color: string;
  iconDataUrl?: string;
};

export type GameSettings = {
  colonizationPointsPerTurn: number;
  eventLogRetainTurns?: number;
  constructionPointsPerTurn?: number;
  demolitionCostPercent?: number;
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
    climateId?: string;
    landscapeId?: string;
    cultureId?: string;
    religionId?: string;
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
      category: 'climate' | 'landscape' | 'culture' | 'religion';
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
  kind: 'company' | 'state';
  hostCountryId: string;
  guestCountryId: string;
  industries?: string[];
  limits?: {
    perProvince?: number;
    perCountry?: number;
    global?: number;
  };
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

export type Country = {
  id: string;
  name: string;
  color: string;
  flagDataUrl?: string;
  coatDataUrl?: string;
  colonizationPoints: number;
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
  resourceAmounts?: Record<string, number>;
  colonizationCost?: number;
  colonizationProgress?: Record<string, number>;
  colonizationDisabled?: boolean;
};

export type ProvinceRecord = Record<string, ProvinceData>;

export type Trait = {
  id: string;
  name: string;
  color: string;
  iconDataUrl?: string;
};

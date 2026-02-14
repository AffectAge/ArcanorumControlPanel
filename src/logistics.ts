import type {
  LogisticsEdge,
  LogisticsNode,
  LogisticsRouteType,
  ProvinceRecord,
} from './types';

const provinceNodeId = (provinceId: string) => `province:${provinceId}`;

export const ensureBaseLogisticsNodes = (
  provinces: ProvinceRecord,
  _countries: unknown[],
  existing: LogisticsNode[],
): LogisticsNode[] => {
  const byId = new Map(existing.map((node) => [node.id, node]));
  Object.values(provinces).forEach((province) => {
    const id = provinceNodeId(province.id);
    const prev = byId.get(id);
    byId.set(id, {
      id,
      type: 'province',
      provinceId: province.id,
      countryId: province.ownerCountryId,
      name: prev?.name ?? province.id,
    });
  });

  return Array.from(byId.values()).filter((node) => node.type === 'province');
};

export const defaultLogisticsRouteTypes = (): LogisticsRouteType[] => [
  {
    id: 'route-road',
    name: 'Дорога',
    color: '#f59e0b',
    lineWidth: 1.2,
    constructionCostPerSegment: 2,
    allowProvinceSkipping: false,
    requiredBuildingIds: [],
    requiredBuildingsMode: 'all',
    landscape: { anyOf: [], noneOf: [] },
    allowAllLandscapes: true,
    marketAccessCategoryIds: [],
    allowAllMarketCategories: true,
    transportCapacityPerLevelByCategory: {},
  },
  {
    id: 'route-rail',
    name: 'Железная дорога',
    color: '#d1d5db',
    lineWidth: 1.2,
    dashPattern: '7 4',
    constructionCostPerSegment: 4,
    allowProvinceSkipping: false,
    requiredBuildingIds: [],
    requiredBuildingsMode: 'all',
    landscape: { anyOf: [], noneOf: [] },
    allowAllLandscapes: true,
    marketAccessCategoryIds: [],
    allowAllMarketCategories: true,
    transportCapacityPerLevelByCategory: {},
  },
  {
    id: 'route-sea',
    name: 'Морской путь',
    color: '#38bdf8',
    lineWidth: 1.2,
    dashPattern: '10 5',
    constructionCostPerSegment: 3,
    allowProvinceSkipping: false,
    requiredBuildingIds: [],
    requiredBuildingsMode: 'all',
    landscape: { anyOf: [], noneOf: [] },
    allowAllLandscapes: true,
    marketAccessCategoryIds: [],
    allowAllMarketCategories: true,
    transportCapacityPerLevelByCategory: {},
  },
  {
    id: 'route-air',
    name: 'Воздушный маршрут',
    color: '#a78bfa',
    lineWidth: 1.1,
    dashPattern: '3 4',
    constructionCostPerSegment: 6,
    allowProvinceSkipping: true,
    requiredBuildingIds: [],
    requiredBuildingsMode: 'all',
    landscape: { anyOf: [], noneOf: [] },
    allowAllLandscapes: true,
    marketAccessCategoryIds: [],
    allowAllMarketCategories: true,
    transportCapacityPerLevelByCategory: {},
  },
];

export const createDefaultLogisticsState = () => ({
  nodes: [] as LogisticsNode[],
  edges: [] as LogisticsEdge[],
  routeTypes: defaultLogisticsRouteTypes(),
  routes: [],
});

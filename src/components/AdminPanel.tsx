import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Shield,
  Cloud,
  Landmark,
  Mountain,
  Palette,
  Package,
  Sliders,
  Image as ImageIcon,
  Building2,
  Briefcase,
  Factory,
} from 'lucide-react';
import type {
  Country,
  ProvinceRecord,
  Trait,
  BuildingDefinition,
  Company,
  Industry,
  TraitCriteria,
  RequirementNode,
} from '../types';

type AdminTab =
  | 'provinces'
  | 'climates'
  | 'religions'
  | 'landscapes'
  | 'cultures'
  | 'resources'
  | 'buildings'
  | 'companies'
  | 'industries';

type AdminPanelProps = {
  open: boolean;
  selectedProvinceId?: string;
  provinces: ProvinceRecord;
  countries: Country[];
  climates: Trait[];
  religions: Trait[];
  landscapes: Trait[];
  cultures: Trait[];
  resources: Trait[];
  buildings: BuildingDefinition[];
  industries: Industry[];
  companies: Company[];
  onClose: () => void;
  onAssignOwner: (provinceId: string, ownerId?: string) => void;
  onAssignClimate: (provinceId: string, climateId?: string) => void;
  onAssignReligion: (provinceId: string, religionId?: string) => void;
  onAssignLandscape: (provinceId: string, landscapeId?: string) => void;
  onAssignCulture: (provinceId: string, cultureId?: string) => void;
  onSetProvinceResourceAmount: (
    provinceId: string,
    resourceId: string,
    amount: number,
  ) => void;
  onSetColonizationCost: (provinceId: string, cost: number) => void;
  onSetColonizationDisabled: (provinceId: string, disabled: boolean) => void;
  onSetRadiation: (provinceId: string, value: number) => void;
  onSetPollution: (provinceId: string, value: number) => void;
  onAddClimate: (name: string, color: string) => void;
  onAddReligion: (name: string, color: string, iconDataUrl?: string) => void;
  onAddLandscape: (name: string, color: string) => void;
  onAddCulture: (name: string, color: string, iconDataUrl?: string) => void;
  onAddResource: (name: string, color: string, iconDataUrl?: string) => void;
  onAddBuilding: (
    name: string,
    cost: number,
    iconDataUrl?: string,
    industryId?: string,
    requirements?: BuildingDefinition['requirements'],
  ) => void;
  onAddIndustry: (name: string, iconDataUrl?: string, color?: string) => void;
  onAddCompany: (
    name: string,
    countryId: string,
    iconDataUrl?: string,
    color?: string,
  ) => void;
  onUpdateCompanyIcon: (id: string, iconDataUrl?: string) => void;
  onUpdateReligionIcon: (id: string, iconDataUrl?: string) => void;
  onUpdateCultureIcon: (id: string, iconDataUrl?: string) => void;
  onUpdateResourceIcon: (id: string, iconDataUrl?: string) => void;
  onUpdateBuildingIcon: (id: string, iconDataUrl?: string) => void;
  onUpdateIndustryIcon: (id: string, iconDataUrl?: string) => void;
  onUpdateBuildingIndustry: (id: string, industryId?: string) => void;
  onUpdateBuildingRequirements: (
    id: string,
    requirements?: BuildingDefinition['requirements'],
  ) => void;
  onUpdateIndustryColor: (id: string, color: string) => void;
  onUpdateCompanyColor: (id: string, color: string) => void;
  onUpdateClimateColor: (id: string, color: string) => void;
  onUpdateReligionColor: (id: string, color: string) => void;
  onUpdateLandscapeColor: (id: string, color: string) => void;
  onUpdateCultureColor: (id: string, color: string) => void;
  onUpdateResourceColor: (id: string, color: string) => void;
  onDeleteClimate: (id: string) => void;
  onDeleteReligion: (id: string) => void;
  onDeleteLandscape: (id: string) => void;
  onDeleteCulture: (id: string) => void;
  onDeleteResource: (id: string) => void;
  onDeleteBuilding: (id: string) => void;
  onDeleteIndustry: (id: string) => void;
  onDeleteCompany: (id: string) => void;
};

const emptyColor = '#4ade80';

export default function AdminPanel({
  open,
  selectedProvinceId,
  provinces,
  countries,
  climates,
  religions,
  landscapes,
  cultures,
  resources,
  buildings,
  industries,
  companies,
  onClose,
  onAssignOwner,
  onAssignClimate,
  onAssignReligion,
  onAssignLandscape,
  onAssignCulture,
  onSetProvinceResourceAmount,
  onSetColonizationCost,
  onSetColonizationDisabled,
  onSetRadiation,
  onSetPollution,
  onAddClimate,
  onAddReligion,
  onAddLandscape,
  onAddCulture,
  onAddResource,
  onAddBuilding,
  onAddIndustry,
  onAddCompany,
  onUpdateCompanyIcon,
  onUpdateReligionIcon,
  onUpdateCultureIcon,
  onUpdateResourceIcon,
  onUpdateBuildingIcon,
  onUpdateIndustryIcon,
  onUpdateBuildingIndustry,
  onUpdateBuildingRequirements,
  onUpdateIndustryColor,
  onUpdateCompanyColor,
  onUpdateClimateColor,
  onUpdateReligionColor,
  onUpdateLandscapeColor,
  onUpdateCultureColor,
  onUpdateResourceColor,
  onDeleteClimate,
  onDeleteReligion,
  onDeleteLandscape,
  onDeleteCulture,
  onDeleteResource,
  onDeleteBuilding,
  onDeleteIndustry,
  onDeleteCompany,
}: AdminPanelProps) {
  const [tab, setTab] = useState<AdminTab>('provinces');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [climateName, setClimateName] = useState('');
  const [climateColor, setClimateColor] = useState(emptyColor);
  const [religionName, setReligionName] = useState('');
  const [religionColor, setReligionColor] = useState('#facc15');
  const [religionIcon, setReligionIcon] = useState<string | undefined>(undefined);
  const [landscapeName, setLandscapeName] = useState('');
  const [landscapeColor, setLandscapeColor] = useState('#22c55e');
  const [cultureName, setCultureName] = useState('');
  const [cultureColor, setCultureColor] = useState('#fb7185');
  const [cultureIcon, setCultureIcon] = useState<string | undefined>(undefined);
  const [resourceName, setResourceName] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [buildingCost, setBuildingCost] = useState(100);
  const [buildingIcon, setBuildingIcon] = useState<string | undefined>(undefined);
  const [buildingIndustryId, setBuildingIndustryId] = useState<string>('');
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editReqMaxPerProvince, setEditReqMaxPerProvince] = useState<number | ''>(0);
  const [editReqMaxPerCountry, setEditReqMaxPerCountry] = useState<number | ''>(0);
  const [editReqMaxGlobal, setEditReqMaxGlobal] = useState<number | ''>(0);
  const [editReqResourceAny, setEditReqResourceAny] = useState<Set<string>>(
    () => new Set(),
  );
  const [editReqResourceNone, setEditReqResourceNone] = useState<Set<string>>(
    () => new Set(),
  );
  const [editReqBuildingCriteria, setEditReqBuildingCriteria] = useState<
    Record<
      string,
      {
        province?: { min?: number; max?: number };
        country?: { min?: number; max?: number };
        global?: { min?: number; max?: number };
      }
    >
  >({});
  const [editReqAllowedCountries, setEditReqAllowedCountries] = useState<
    Set<string>
  >(() => new Set());
  const [editReqAllowedCompanies, setEditReqAllowedCompanies] = useState<
    Set<string>
  >(() => new Set());
  const [editReqAllowedCountriesMode, setEditReqAllowedCountriesMode] = useState<
    'allow' | 'deny'
  >('allow');
  const [editReqAllowedCompaniesMode, setEditReqAllowedCompaniesMode] = useState<
    'allow' | 'deny'
  >('allow');
  const [editReqRadiationMin, setEditReqRadiationMin] = useState<number | ''>(0);
  const [editReqRadiationMax, setEditReqRadiationMax] = useState<number | ''>(0);
  const [editReqPollutionMin, setEditReqPollutionMin] = useState<number | ''>(0);
  const [editReqPollutionMax, setEditReqPollutionMax] = useState<number | ''>(0);
  const [editReqLogic, setEditReqLogic] = useState<RequirementNode>({
    type: 'group',
    op: 'and',
    children: [],
  });
  const [industryName, setIndustryName] = useState('');
  const [industryIcon, setIndustryIcon] = useState<string | undefined>(undefined);
  const [industryColor, setIndustryColor] = useState('#f59e0b');
  const [companyName, setCompanyName] = useState('');
  const [companyCountryId, setCompanyCountryId] = useState<string>('');
  const [companyIcon, setCompanyIcon] = useState<string | undefined>(undefined);
  const [companyColor, setCompanyColor] = useState('#a855f7');
  const [resourceColor, setResourceColor] = useState('#22c55e');
  const [resourceIcon, setResourceIcon] = useState<string | undefined>(undefined);

  const provinceIds = useMemo(() => Object.keys(provinces).sort(), [provinces]);
  const activeProvince = selectedProvince ? provinces[selectedProvince] : undefined;

  useEffect(() => {
    if (!open || !selectedProvinceId) return;
    setTab('provinces');
    setSelectedProvince(selectedProvinceId);
  }, [open, selectedProvinceId]);


  if (!open) return null;

  const editingBuilding = editingBuildingId
    ? buildings.find((building) => building.id === editingBuildingId)
    : undefined;

  const handleAddClimate = () => {
    const name = climateName.trim();
    if (!name) return;
    onAddClimate(name, climateColor);
    setClimateName('');
  };

  const handleAddReligion = () => {
    const name = religionName.trim();
    if (!name) return;
    onAddReligion(name, religionColor, religionIcon);
    setReligionName('');
    setReligionIcon(undefined);
  };

  const handleAddLandscape = () => {
    const name = landscapeName.trim();
    if (!name) return;
    onAddLandscape(name, landscapeColor);
    setLandscapeName('');
  };

  const handleAddCulture = () => {
    const name = cultureName.trim();
    if (!name) return;
    onAddCulture(name, cultureColor, cultureIcon);
    setCultureName('');
    setCultureIcon(undefined);
  };

  const handleAddResource = () => {
    const name = resourceName.trim();
    if (!name) return;
    onAddResource(name, resourceColor, resourceIcon);
    setResourceName('');
    setResourceIcon(undefined);
  };



  const handleAddBuilding = () => {
    const name = buildingName.trim();
    if (!name) return;
    onAddBuilding(
      name,
      Math.max(1, Number(buildingCost) || 1),
      buildingIcon,
      buildingIndustryId || undefined,
    );
    setBuildingName('');
    setBuildingCost(100);
    setBuildingIcon(undefined);
    setBuildingIndustryId('');
  };

  const openEditRequirements = (building: BuildingDefinition) => {
    const requirements = building.requirements;
    const buildTraitNode = (
      category: 'climate' | 'landscape' | 'culture' | 'religion',
      criteria?: TraitCriteria,
      legacyId?: string,
    ): RequirementNode | undefined => {
      const anyList = criteria?.anyOf ?? (legacyId ? [legacyId] : []);
      const noneList = criteria?.noneOf ?? [];
      const nodes: RequirementNode[] = [];
      if (anyList.length > 0) {
        nodes.push(
          anyList.length === 1
            ? { type: 'trait', category, id: anyList[0] }
            : {
                type: 'group',
                op: 'or',
                children: anyList.map((id) => ({
                  type: 'trait',
                  category,
                  id,
                })),
              },
        );
      }
      if (noneList.length > 0) {
        nodes.push({
          type: 'group',
          op: 'not',
          children: [
            noneList.length === 1
              ? { type: 'trait', category, id: noneList[0] }
              : {
                  type: 'group',
                  op: 'or',
                  children: noneList.map((id) => ({
                    type: 'trait',
                    category,
                    id,
                  })),
                },
          ],
        });
      }
      if (nodes.length === 0) return undefined;
      if (nodes.length === 1) return nodes[0];
      return { type: 'group', op: 'and', children: nodes };
    };

    const legacyNodes: RequirementNode[] = [];
    const climateNode = buildTraitNode(
      'climate',
      requirements?.climate,
      requirements?.climateId,
    );
    if (climateNode) legacyNodes.push(climateNode);
    const landscapeNode = buildTraitNode(
      'landscape',
      requirements?.landscape,
      requirements?.landscapeId,
    );
    if (landscapeNode) legacyNodes.push(landscapeNode);
    const cultureNode = buildTraitNode(
      'culture',
      requirements?.culture,
      requirements?.cultureId,
    );
    if (cultureNode) legacyNodes.push(cultureNode);
    const religionNode = buildTraitNode(
      'religion',
      requirements?.religion,
      requirements?.religionId,
    );
    if (religionNode) legacyNodes.push(religionNode);
    const derivedLogic =
      requirements?.logic ??
      (legacyNodes.length > 0
        ? { type: 'group', op: 'and', children: legacyNodes }
        : { type: 'group', op: 'and', children: [] });
    setEditingBuildingId(building.id);
    setEditReqMaxPerProvince(
      requirements?.maxPerProvince ?? 0,
    );
    setEditReqMaxPerCountry(requirements?.maxPerCountry ?? 0);
    setEditReqMaxGlobal(requirements?.maxGlobal ?? 0);
    setEditReqAllowedCountries(new Set(requirements?.allowedCountries ?? []));
    setEditReqAllowedCompanies(new Set(requirements?.allowedCompanies ?? []));
    setEditReqAllowedCountriesMode(requirements?.allowedCountriesMode ?? 'allow');
    setEditReqAllowedCompaniesMode(requirements?.allowedCompaniesMode ?? 'allow');
    setEditReqRadiationMin(requirements?.radiation?.min ?? 0);
    setEditReqRadiationMax(requirements?.radiation?.max ?? 0);
    setEditReqPollutionMin(requirements?.pollution?.min ?? 0);
    setEditReqPollutionMax(requirements?.pollution?.max ?? 0);
    const legacyResourceAny = requirements?.resources
      ? Object.entries(requirements.resources)
          .filter(([, value]) => typeof value === 'number' && value > 0)
          .map(([id]) => id)
      : [];
    setEditReqResourceAny(
      new Set(requirements?.resources?.anyOf ?? legacyResourceAny),
    );
    setEditReqResourceNone(
      new Set(requirements?.resources?.noneOf ?? []),
    );
    const legacyBuildingCriteria: Record<
      string,
      { province?: { min?: number; max?: number } }
    > = {};
    (requirements?.dependencies ?? []).forEach((id) => {
      legacyBuildingCriteria[id] = { province: { min: 1 } };
    });
    const normalizedBuildings: Record<
      string,
      {
        province?: { min?: number; max?: number };
        country?: { min?: number; max?: number };
        global?: { min?: number; max?: number };
      }
    > = {};
    Object.entries(requirements?.buildings ?? {}).forEach(([id, value]) => {
      const hasScope =
        typeof (value as any)?.province !== 'undefined' ||
        typeof (value as any)?.country !== 'undefined' ||
        typeof (value as any)?.global !== 'undefined';
      if (hasScope) {
        normalizedBuildings[id] = value as {
          province?: { min?: number; max?: number };
          country?: { min?: number; max?: number };
          global?: { min?: number; max?: number };
        };
      } else {
        const legacy = value as { min?: number; max?: number };
        normalizedBuildings[id] = { province: { ...legacy } };
      }
    });
    setEditReqBuildingCriteria(
      Object.keys(normalizedBuildings).length > 0
        ? normalizedBuildings
        : legacyBuildingCriteria,
    );
    setEditReqLogic(derivedLogic);
  };

  const closeEditRequirements = () => {
    setEditingBuildingId(null);
  };

  const saveEditRequirements = () => {
    if (!editingBuildingId) return;
    const requirements = {
      resources:
        editReqResourceAny.size > 0 || editReqResourceNone.size > 0
          ? {
              anyOf:
                editReqResourceAny.size > 0
                  ? Array.from(editReqResourceAny)
                  : undefined,
              noneOf:
                editReqResourceNone.size > 0
                  ? Array.from(editReqResourceNone)
                  : undefined,
            }
          : undefined,
      allowedCountries:
        editReqAllowedCountries.size > 0
          ? Array.from(editReqAllowedCountries)
          : undefined,
      allowedCompanies:
        editReqAllowedCompanies.size > 0
          ? Array.from(editReqAllowedCompanies)
          : undefined,
      allowedCountriesMode: editReqAllowedCountriesMode,
      allowedCompaniesMode: editReqAllowedCompaniesMode,
      radiation:
        (editReqRadiationMin !== '' && Number(editReqRadiationMin) > 0) ||
        (editReqRadiationMax !== '' && Number(editReqRadiationMax) > 0)
          ? {
              min:
                editReqRadiationMin === '' || Number(editReqRadiationMin) <= 0
                  ? undefined
                  : Math.max(0, Number(editReqRadiationMin)),
              max:
                editReqRadiationMax === '' || Number(editReqRadiationMax) <= 0
                  ? undefined
                  : Math.max(0, Number(editReqRadiationMax)),
            }
          : undefined,
      pollution:
        (editReqPollutionMin !== '' && Number(editReqPollutionMin) > 0) ||
        (editReqPollutionMax !== '' && Number(editReqPollutionMax) > 0)
          ? {
              min:
                editReqPollutionMin === '' || Number(editReqPollutionMin) <= 0
                  ? undefined
                  : Math.max(0, Number(editReqPollutionMin)),
              max:
                editReqPollutionMax === '' || Number(editReqPollutionMax) <= 0
                  ? undefined
                  : Math.max(0, Number(editReqPollutionMax)),
            }
          : undefined,
      buildings:
        Object.keys(editReqBuildingCriteria).length > 0
          ? Object.fromEntries(
              Object.entries(editReqBuildingCriteria)
                .map(([id, value]) => {
                  const normalize = (entry?: { min?: number; max?: number }) => {
                    const min =
                      entry?.min == null || entry.min <= 0
                        ? undefined
                        : Math.max(1, Number(entry.min));
                    const max =
                      entry?.max == null || entry.max <= 0
                        ? undefined
                        : Math.max(1, Number(entry.max));
                    return min == null && max == null ? undefined : { min, max };
                  };
                  const province = normalize(value.province);
                  const country = normalize(value.country);
                  const global = normalize(value.global);
                  const payload = {
                    province,
                    country,
                    global,
                  };
                  return [id, payload];
                })
                .filter(([, value]) =>
                  Boolean(value.province || value.country || value.global),
                ),
            )
          : undefined,
      logic:
        editReqLogic &&
        (editReqLogic.type !== 'group' || editReqLogic.children.length > 0)
          ? editReqLogic
          : undefined,
      maxPerProvince:
        editReqMaxPerProvince === '' || Number(editReqMaxPerProvince) <= 0
          ? undefined
          : Math.max(1, Number(editReqMaxPerProvince)),
      maxPerCountry:
        editReqMaxPerCountry === '' || Number(editReqMaxPerCountry) <= 0
          ? undefined
          : Math.max(1, Number(editReqMaxPerCountry)),
      maxGlobal:
        editReqMaxGlobal === '' || Number(editReqMaxGlobal) <= 0
          ? undefined
          : Math.max(1, Number(editReqMaxGlobal)),
    };
    onUpdateBuildingRequirements(editingBuildingId, requirements);
    closeEditRequirements();
  };

  const handleAddIndustry = () => {
    const name = industryName.trim();
    if (!name) return;
    onAddIndustry(name, industryIcon, industryColor);
    setIndustryName('');
    setIndustryIcon(undefined);
    setIndustryColor('#f59e0b');
  };

  const handleAddCompany = () => {
    const name = companyName.trim();
    if (!name || !companyCountryId) return;
    onAddCompany(name, companyCountryId, companyIcon, companyColor);
    setCompanyName('');
    setCompanyIcon(undefined);
    setCompanyColor('#a855f7');
  };


  const handleIconUpload = (
    file: File | undefined,
    onDone: (value: string | undefined) => void,
  ) => {
    if (!file) {
      onDone(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : undefined;
      onDone(result ?? undefined);
    };
    reader.readAsDataURL(file);
  };

  type TraitCategory = 'climate' | 'landscape' | 'culture' | 'religion';
  const traitOptions: Record<TraitCategory, Trait[]> = {
    climate: climates,
    landscape: landscapes,
    culture: cultures,
    religion: religions,
  };

  const updateNodeAt = (
    node: RequirementNode,
    path: number[],
    updater: (current: RequirementNode) => RequirementNode,
  ): RequirementNode => {
    if (path.length === 0) return updater(node);
    if (node.type !== 'group') return node;
    const [index, ...rest] = path;
    const nextChildren = node.children.map((child, childIndex) =>
      childIndex === index ? updateNodeAt(child, rest, updater) : child,
    );
    return { ...node, children: nextChildren };
  };

  const removeNodeAt = (node: RequirementNode, path: number[]): RequirementNode => {
    if (path.length === 0) return node;
    if (node.type !== 'group') return node;
    const [index, ...rest] = path;
    if (rest.length === 0) {
      return {
        ...node,
        children: node.children.filter((_, childIndex) => childIndex !== index),
      };
    }
    const nextChildren = node.children.map((child, childIndex) =>
      childIndex === index ? removeNodeAt(child, rest) : child,
    );
    return { ...node, children: nextChildren };
  };

  const addChildAt = (
    node: RequirementNode,
    path: number[],
    child: RequirementNode,
  ): RequirementNode =>
    updateNodeAt(node, path, (current) => {
      if (current.type !== 'group') return current;
      if (current.op === 'not' && current.children.length > 0) return current;
      return { ...current, children: [...current.children, child] };
    });

  const renderLogicNode = (node: RequirementNode, path: number[] = []) => {
    const getOperatorHint = (op: RequirementNode['op']) => {
      switch (op) {
        case 'and':
          return 'AND — все условия должны быть истинны';
        case 'or':
          return 'OR — хотя бы одно условие истинно';
        case 'not':
          return 'NOT — отрицание условий (ни одно не должно быть истинным)';
        case 'xor':
          return 'XOR — ровно одно условие истинно';
        case 'nand':
          return 'NAND — НЕ (AND), хотя бы одно условие ложно';
        case 'nor':
          return 'NOR — НЕ (OR), ни одно условие не истинно';
        case 'implies':
          return 'IMPLIES — если A, то B';
        case 'eq':
          return 'EQ — все условия имеют одинаковое значение';
        default:
          return '';
      }
    };

    const getValidationMessage = (current: RequirementNode): string | null => {
      if (current.type === 'trait') {
        return current.id ? null : 'Выберите значение';
      }
      const count = current.children.length;
      if (current.op === 'not') {
        return count < 1 ? 'NOT требует минимум 1 условие' : null;
      }
      if (current.op === 'implies') {
        return count < 2 ? 'IMPLIES требует минимум 2 условия' : null;
      }
      if (current.op === 'eq') {
        return count < 2 ? 'EQ требует минимум 2 условия' : null;
      }
      if (current.op === 'xor') {
        return count < 2 ? 'XOR требует минимум 2 условия' : null;
      }
      if (current.op === 'and' || current.op === 'or') {
        return count < 1 ? 'Группа должна содержать условия' : null;
      }
      if (current.op === 'nand' || current.op === 'nor') {
        return count < 1 ? 'Группа должна содержать условия' : null;
      }
      return null;
    };

    if (node.type === 'trait') {
      const options = traitOptions[node.category];
      const isInvalid = !node.id;
      return (
        <div
          className={`flex items-center gap-2 rounded-lg border bg-black/30 px-3 py-2 ${
            isInvalid ? 'border-red-400/50' : 'border-white/10'
          }`}
        >
          <select
            value={node.category}
            onChange={(event) =>
              setEditReqLogic((prev) =>
                updateNodeAt(prev, path, (current) =>
                  current.type !== 'trait'
                    ? current
                    : {
                        ...current,
                        category: event.target.value as TraitCategory,
                        id:
                          traitOptions[
                            event.target.value as TraitCategory
                          ][0]?.id ?? '',
                      },
                ),
              )
            }
            className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
          >
            <option value="climate" className="bg-[#0b111b] text-white">
              Климат
            </option>
            <option value="landscape" className="bg-[#0b111b] text-white">
              Ландшафт
            </option>
            <option value="culture" className="bg-[#0b111b] text-white">
              Культура
            </option>
            <option value="religion" className="bg-[#0b111b] text-white">
              Религия
            </option>
          </select>
          <select
            value={node.id}
            onChange={(event) =>
              setEditReqLogic((prev) =>
                updateNodeAt(prev, path, (current) =>
                  current.type !== 'trait'
                    ? current
                    : { ...current, id: event.target.value },
                ),
              )
            }
            className="flex-1 h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60"
          >
            {options.map((item) => (
              <option
                key={item.id}
                value={item.id}
                className="bg-[#0b111b] text-white"
              >
                {item.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setEditReqLogic((prev) => removeNodeAt(prev, path))}
            className="h-8 w-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40 relative group"
          >
            <Trash2 className="w-4 h-4 text-white/60" />
            <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              Удалить условие
            </span>
          </button>
        </div>
      );
    }

    const isRoot = path.length === 0;
    const canAddChild = true;
    const validationMessage = getValidationMessage(node);
    return (
      <div
        className={`rounded-xl border bg-white/5 p-3 space-y-2 ${
          validationMessage ? 'border-red-400/50' : 'border-white/10'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="relative group">
            <select
              value={node.op}
              onChange={(event) =>
                setEditReqLogic((prev) =>
                  updateNodeAt(prev, path, (current) =>
                    current.type !== 'group'
                      ? current
                      : {
                          ...current,
                          op: event.target.value as RequirementNode['op'],
                          children:
                            event.target.value === 'not' &&
                            current.children.length > 1
                              ? current.children
                              : current.children,
                        },
                  ),
                )
              }
              className={`h-8 rounded-lg bg-black/40 border px-2 text-white text-xs focus:outline-none focus:border-emerald-400/60 ${
                validationMessage ? 'border-red-400/50' : 'border-white/10'
              }`}
            >
              <option value="and" className="bg-[#0b111b] text-white">
                AND
              </option>
              <option value="or" className="bg-[#0b111b] text-white">
                OR
              </option>
              <option value="not" className="bg-[#0b111b] text-white">
                NOT
              </option>
              <option value="xor" className="bg-[#0b111b] text-white">
                XOR
              </option>
              <option value="nand" className="bg-[#0b111b] text-white">
                NAND
              </option>
              <option value="nor" className="bg-[#0b111b] text-white">
                NOR
              </option>
              <option value="implies" className="bg-[#0b111b] text-white">
                IMPLIES
              </option>
              <option value="eq" className="bg-[#0b111b] text-white">
                EQ
              </option>
            </select>
            <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              {getOperatorHint(node.op)}
            </span>
          </div>
          <button
            onClick={() =>
              setEditReqLogic((prev) =>
                addChildAt(prev, path, {
                  type: 'trait',
                  category: 'climate',
                  id: climates[0]?.id ?? '',
                }),
              )
            }
            disabled={!canAddChild}
            className={`h-8 px-2 rounded-lg border text-[11px] flex items-center gap-1 ${
              canAddChild
                ? 'bg-black/30 border-white/10 text-white/70 hover:border-emerald-400/40'
                : 'bg-black/30 border-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Условие
          </button>
          <button
            onClick={() =>
              setEditReqLogic((prev) =>
                addChildAt(prev, path, {
                  type: 'group',
                  op: 'and',
                  children: [],
                }),
              )
            }
            disabled={!canAddChild}
            className={`h-8 px-2 rounded-lg border text-[11px] flex items-center gap-1 ${
              canAddChild
                ? 'bg-black/30 border-white/10 text-white/70 hover:border-emerald-400/40'
                : 'bg-black/30 border-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Группа
          </button>
          {!isRoot && (
            <button
              onClick={() =>
                setEditReqLogic((prev) => removeNodeAt(prev, path))
              }
              className="ml-auto h-8 w-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40 relative group"
            >
              <Trash2 className="w-4 h-4 text-white/60" />
              <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] text-white/85 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Удалить группу
              </span>
            </button>
          )}
        </div>
        {validationMessage && (
          <div className="text-red-300 text-[11px]">{validationMessage}</div>
        )}
        <div className="space-y-2">
          {node.children.length > 0 ? (
            node.children.map((child, index) => (
              <div key={`${path.join('.')}-${index}`}>
                {renderLogicNode(child, [...path, index])}
              </div>
            ))
          ) : (
            <div className="text-white/40 text-xs">
              Добавьте условия или группу.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-[980px] max-w-[96vw] h-[620px] max-h-[92vh] bg-[#0b111b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex">
        <div className="w-56 border-r border-white/10 p-4 flex flex-col gap-2">
          <div className="text-white text-lg font-semibold mb-2">
            Панель администратора
          </div>
          <button
            onClick={() => setTab('provinces')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'provinces'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Shield className="w-4 h-4" />
            Провинции
          </button>
          <button
            onClick={() => setTab('climates')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'climates'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Cloud className="w-4 h-4" />
            Климат
          </button>
          <button
            onClick={() => setTab('religions')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'religions'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Landmark className="w-4 h-4" />
            Религии
          </button>
          <button
            onClick={() => setTab('landscapes')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'landscapes'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Mountain className="w-4 h-4" />
            Ландшафт
          </button>
          <button
            onClick={() => setTab('cultures')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'cultures'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Palette className="w-4 h-4" />
            Культуры
          </button>
          <button
            onClick={() => setTab('resources')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'resources'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Package className="w-4 h-4" />
            Ресурсы
          </button>
          <button
            onClick={() => setTab('buildings')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'buildings'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Здания
          </button>
          <button
            onClick={() => setTab('industries')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'industries'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Factory className="w-4 h-4" />
            Отрасли
          </button>
          <button
            onClick={() => setTab('companies')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              tab === 'companies'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Компании
          </button>
                    <button
            onClick={onClose}
            className="mt-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm border bg-white/5 border-white/10 text-white/60 hover:border-emerald-400/30"
          >
            <X className="w-4 h-4" />
            Закрыть
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto legend-scroll">
          {tab === 'provinces' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Данные провинций</h2>
                <p className="text-white/60 text-sm">
                  Выберите провинцию и назначьте параметры.
                </p>
              </div>

              <label className="flex flex-col gap-2 text-white/70 text-sm">
                Провинция
                <select
                  value={selectedProvince}
                  onChange={(event) => setSelectedProvince(event.target.value)}
                  className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                >
                  <option value="" className="bg-[#0b111b] text-white">
                    Выберите провинцию
                  </option>
                  {provinceIds.map((id) => (
                    <option key={id} value={id} className="bg-[#0b111b] text-white">
                      {id}
                    </option>
                  ))}
                </select>
              </label>

              {activeProvince && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Владелец
                    <select
                      value={activeProvince.ownerCountryId ?? ''}
                      onChange={(event) =>
                        onAssignOwner(
                          activeProvince.id,
                          event.target.value || undefined,
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="" className="bg-[#0b111b] text-white">
                        Без владельца
                      </option>
                      {countries.map((country) => (
                        <option
                          key={country.id}
                          value={country.id}
                          className="bg-[#0b111b] text-white"
                        >
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Климат
                    <select
                      value={activeProvince.climateId ?? ''}
                      onChange={(event) =>
                        onAssignClimate(
                          activeProvince.id,
                          event.target.value || undefined,
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="" className="bg-[#0b111b] text-white">
                        Не назначен
                      </option>
                      {climates.map((climate) => (
                        <option
                          key={climate.id}
                          value={climate.id}
                          className="bg-[#0b111b] text-white"
                        >
                          {climate.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Религия
                    <select
                      value={activeProvince.religionId ?? ''}
                      onChange={(event) =>
                        onAssignReligion(
                          activeProvince.id,
                          event.target.value || undefined,
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="" className="bg-[#0b111b] text-white">
                        Не назначена
                      </option>
                      {religions.map((religion) => (
                        <option
                          key={religion.id}
                          value={religion.id}
                          className="bg-[#0b111b] text-white"
                        >
                          {religion.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Ландшафт
                    <select
                      value={activeProvince.landscapeId ?? ''}
                      onChange={(event) =>
                        onAssignLandscape(
                          activeProvince.id,
                          event.target.value || undefined,
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="" className="bg-[#0b111b] text-white">
                        Не назначен
                      </option>
                      {landscapes.map((landscape) => (
                        <option
                          key={landscape.id}
                          value={landscape.id}
                          className="bg-[#0b111b] text-white"
                        >
                          {landscape.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Культура
                    <select
                      value={activeProvince.cultureId ?? ''}
                      onChange={(event) =>
                        onAssignCulture(
                          activeProvince.id,
                          event.target.value || undefined,
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    >
                      <option value="" className="bg-[#0b111b] text-white">
                        Не назначена
                      </option>
                      {cultures.map((culture) => (
                        <option
                          key={culture.id}
                          value={culture.id}
                          className="bg-[#0b111b] text-white"
                        >
                          {culture.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="md:col-span-2">
                    <div className="text-white/70 text-sm mb-2">Ресурсы</div>
                    {resources.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {resources.map((resource) => (
                          <label
                            key={resource.id}
                            className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white/70 text-sm"
                          >
                            <span className="flex-1">{resource.name}</span>
                            <input
                              type="number"
                              min={0}
                              value={activeProvince.resourceAmounts?.[resource.id] ?? 0}
                              onChange={(event) =>
                                onSetProvinceResourceAmount(
                                  activeProvince.id,
                                  resource.id,
                                  Math.max(0, Number(event.target.value) || 0),
                                )
                              }
                              className="w-20 h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-white focus:outline-none focus:border-emerald-400/60"
                            />
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-white/50 text-sm">Нет ресурсов</div>
                    )}
                  </div>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Стоимость колонизации
                    <input
                      type="number"
                      min={1}
                      value={activeProvince.colonizationCost ?? 100}
                      onChange={(event) =>
                        onSetColonizationCost(
                          activeProvince.id,
                          Math.max(1, Number(event.target.value) || 1),
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    />
                  </label>

                  <label className="flex items-center gap-3 text-white/70 text-sm">
                    <input
                      type="checkbox"
                      checked={activeProvince.colonizationDisabled ?? false}
                      onChange={(event) =>
                        onSetColonizationDisabled(
                          activeProvince.id,
                          event.target.checked,
                        )
                      }
                      className="w-4 h-4 accent-emerald-500"
                    />
                    Запретить колонизацию
                  </label>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Радиация
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={activeProvince.radiation ?? 0}
                      onChange={(event) =>
                        onSetRadiation(
                          activeProvince.id,
                          Math.max(0, Number(event.target.value) || 0),
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Загрязнение
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={activeProvince.pollution ?? 0}
                      onChange={(event) =>
                        onSetPollution(
                          activeProvince.id,
                          Math.max(0, Number(event.target.value) || 0),
                        )
                      }
                      className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    />
                  </label>

                  <div className="md:col-span-2">
                    <div className="text-white/70 text-sm mb-2">Здания</div>
                    {buildings.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {buildings.map((building) => {
                          const builtCount =
                            activeProvince.buildingsBuilt?.filter(
                              (entry) => entry.buildingId === building.id,
                            ).length ?? 0;
                          const cost = Math.max(1, building.cost ?? 1);
                          const progressEntries =
                            activeProvince.constructionProgress?.[building.id] ?? [];
                          const inProgressCount = progressEntries.length;
                          const progressSum = progressEntries.reduce(
                            (sum, entry) => sum + entry.progress,
                            0,
                          );
                          const average = inProgressCount
                            ? Math.min(100, Math.round((progressSum / inProgressCount / cost) * 100))
                            : 0;
                          const inProgress = inProgressCount > 0;

                          return (
                            <div
                              key={building.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white/70 text-sm"
                            >
                              <div className="flex items-center gap-3">
                                {building.iconDataUrl ? (
                                  <img
                                    src={building.iconDataUrl}
                                    alt=""
                                    className="w-7 h-7 rounded-md object-cover border border-white/10"
                                  />
                                ) : (
                                  <Building2 className="w-5 h-5 text-white/50" />
                                )}
                                <div>
                                  <div className="text-white/80 text-sm">
                                    {building.name}
                                  </div>
                                  <div className="text-white/50 text-xs">
                                    Стоимость: {cost}
                                  </div>
                                </div>
                              </div>
                              <div className="text-white/50 text-xs">
                                {builtCount > 0 || inProgress
                                  ? `Построено: ${builtCount}${
                                      inProgress ? `, в стройке: ${inProgressCount}` : ''
                                    }`
                                  : 'Не построено'}
                                {inProgress && (
                                  <span className="ml-2 text-white/40">
                                    Ср. прогресс: {average}%
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-white/50 text-sm">Нет зданий</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'climates' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Климат</h2>
                <p className="text-white/60 text-sm">
                  Добавляйте и редактируйте типы климата.
                </p>
              </div>

              <div className="flex gap-3 items-end">
                <label className="flex-1 flex flex-col gap-2 text-white/70 text-sm">
                  Название
                  <input
                    value={climateName}
                    onChange={(event) => setClimateName(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Цвет
                  <input
                    type="color"
                    value={climateColor}
                    onChange={(event) => setClimateColor(event.target.value)}
                    className="w-14 h-10 rounded-lg border border-white/10 bg-transparent"
                  />
                </label>
                <button
                  onClick={handleAddClimate}
                  className="h-10 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {climates.map((climate) => (
                  <div
                    key={climate.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full border border-white/10"
                        style={{ backgroundColor: climate.color }}
                      />
                      <span className="text-white/80 text-sm">{climate.name}</span>
                    </div>
                    <input
                      type="color"
                      value={climate.color}
                      onChange={(event) =>
                        onUpdateClimateColor(climate.id, event.target.value)
                      }
                      className="w-8 h-8 rounded-lg border border-white/10 bg-transparent"
                    />
                    <button
                      onClick={() => onDeleteClimate(climate.id)}
                      className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                    >
                      <Trash2 className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'religions' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Религии</h2>
                <p className="text-white/60 text-sm">
                  Добавляйте и редактируйте религии.
                </p>
              </div>

              <div className="flex gap-3 items-end flex-wrap">
                <label className="flex-1 flex flex-col gap-2 text-white/70 text-sm min-w-[200px]">
                  Название
                  <input
                    value={religionName}
                    onChange={(event) => setReligionName(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Цвет
                  <input
                    type="color"
                    value={religionColor}
                    onChange={(event) => setReligionColor(event.target.value)}
                    className="w-14 h-10 rounded-lg border border-white/10 bg-transparent"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Логотип
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handleIconUpload(event.target.files?.[0], setReligionIcon)
                      }
                      className="hidden"
                      id="religion-icon"
                    />
                    <label
                      htmlFor="religion-icon"
                      className="h-10 px-3 rounded-lg border border-white/10 bg-black/40 text-white/70 text-xs flex items-center gap-2 cursor-pointer hover:border-emerald-400/40"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Выбрать
                    </label>
                    {religionIcon && (
                      <img
                        src={religionIcon}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-white/10"
                      />
                    )}
                  </div>
                </label>
                <button
                  onClick={handleAddReligion}
                  className="h-10 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {religions.map((religion) => (
                  <div
                    key={religion.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      {religion.iconDataUrl ? (
                        <img
                          src={religion.iconDataUrl}
                          alt=""
                          className="w-6 h-6 rounded-md object-cover border border-white/10"
                        />
                      ) : (
                        <span
                          className="w-4 h-4 rounded-full border border-white/10"
                          style={{ backgroundColor: religion.color }}
                        />
                      )}
                      <span className="text-white/80 text-sm">{religion.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={religion.color}
                        onChange={(event) =>
                          onUpdateReligionColor(religion.id, event.target.value)
                        }
                        className="w-8 h-8 rounded-lg border border-white/10 bg-transparent"
                      />
                      <div className="flex items-center gap-2 flex-row-reverse">
                        {religion.iconDataUrl && (
                          <button
                            onClick={() => onUpdateReligionIcon(religion.id, undefined)}
                            className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40 relative group"
                          >
                            <Trash2 className="w-4 h-4 text-white/60" />
                            <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                              Удалить логотип
                            </span>
                          </button>
                        )}
                        <label
                          className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 text-white/70 flex items-center justify-center cursor-pointer hover:border-emerald-400/40 relative group"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) =>
                              handleIconUpload(
                                event.target.files?.[0],
                                (value) => onUpdateReligionIcon(religion.id, value),
                              )
                            }
                          />
                          <ImageIcon className="w-4 h-4" />
                          <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            Изменить логотип
                          </span>
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteReligion(religion.id)}
                      className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                    >
                      <Trash2 className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'landscapes' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Ландшафт</h2>
                <p className="text-white/60 text-sm">
                  Добавляйте и редактируйте ландшафты.
                </p>
              </div>

              <div className="flex gap-3 items-end">
                <label className="flex-1 flex flex-col gap-2 text-white/70 text-sm">
                  Название
                  <input
                    value={landscapeName}
                    onChange={(event) => setLandscapeName(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Цвет
                  <input
                    type="color"
                    value={landscapeColor}
                    onChange={(event) => setLandscapeColor(event.target.value)}
                    className="w-14 h-10 rounded-lg border border-white/10 bg-transparent"
                  />
                </label>
                <button
                  onClick={handleAddLandscape}
                  className="h-10 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {landscapes.map((landscape) => (
                  <div
                    key={landscape.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full border border-white/10"
                        style={{ backgroundColor: landscape.color }}
                      />
                      <span className="text-white/80 text-sm">{landscape.name}</span>
                    </div>
                    <input
                      type="color"
                      value={landscape.color}
                      onChange={(event) =>
                        onUpdateLandscapeColor(landscape.id, event.target.value)
                      }
                      className="w-8 h-8 rounded-lg border border-white/10 bg-transparent"
                    />
                    <button
                      onClick={() => onDeleteLandscape(landscape.id)}
                      className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                    >
                      <Trash2 className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'cultures' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Культуры</h2>
                <p className="text-white/60 text-sm">
                  Добавляйте и редактируйте культуры.
                </p>
              </div>

              <div className="flex gap-3 items-end flex-wrap">
                <label className="flex-1 flex flex-col gap-2 text-white/70 text-sm min-w-[200px]">
                  Название
                  <input
                    value={cultureName}
                    onChange={(event) => setCultureName(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Цвет
                  <input
                    type="color"
                    value={cultureColor}
                    onChange={(event) => setCultureColor(event.target.value)}
                    className="w-14 h-10 rounded-lg border border-white/10 bg-transparent"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Логотип
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handleIconUpload(event.target.files?.[0], setCultureIcon)
                      }
                      className="hidden"
                      id="culture-icon"
                    />
                    <label
                      htmlFor="culture-icon"
                      className="h-10 px-3 rounded-lg border border-white/10 bg-black/40 text-white/70 text-xs flex items-center gap-2 cursor-pointer hover:border-emerald-400/40"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Выбрать
                    </label>
                    {cultureIcon && (
                      <img
                        src={cultureIcon}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-white/10"
                      />
                    )}
                  </div>
                </label>
                <button
                  onClick={handleAddCulture}
                  className="h-10 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {cultures.map((culture) => (
                  <div
                    key={culture.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      {culture.iconDataUrl ? (
                        <img
                          src={culture.iconDataUrl}
                          alt=""
                          className="w-6 h-6 rounded-md object-cover border border-white/10"
                        />
                      ) : (
                        <span
                          className="w-4 h-4 rounded-full border border-white/10"
                          style={{ backgroundColor: culture.color }}
                        />
                      )}
                      <span className="text-white/80 text-sm">{culture.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={culture.color}
                        onChange={(event) =>
                          onUpdateCultureColor(culture.id, event.target.value)
                        }
                        className="w-8 h-8 rounded-lg border border-white/10 bg-transparent"
                      />
                      <div className="flex items-center gap-2 flex-row-reverse">
                        {culture.iconDataUrl && (
                          <button
                            onClick={() => onUpdateCultureIcon(culture.id, undefined)}
                            className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40 relative group"
                          >
                            <Trash2 className="w-4 h-4 text-white/60" />
                            <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                              Удалить логотип
                            </span>
                          </button>
                        )}
                        <label
                          className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 text-white/70 flex items-center justify-center cursor-pointer hover:border-emerald-400/40 relative group"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) =>
                              handleIconUpload(
                                event.target.files?.[0],
                                (value) => onUpdateCultureIcon(culture.id, value),
                              )
                            }
                          />
                          <ImageIcon className="w-4 h-4" />
                          <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            Изменить логотип
                          </span>
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteCulture(culture.id)}
                      className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                    >
                      <Trash2 className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'resources' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Ресурсы</h2>
                <p className="text-white/60 text-sm">
                  Добавляйте и редактируйте ресурсы.
                </p>
              </div>

              <div className="flex gap-3 items-end flex-wrap">
                <label className="flex-1 flex flex-col gap-2 text-white/70 text-sm min-w-[200px]">
                  Название
                  <input
                    value={resourceName}
                    onChange={(event) => setResourceName(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Цвет
                  <input
                    type="color"
                    value={resourceColor}
                    onChange={(event) => setResourceColor(event.target.value)}
                    className="w-14 h-10 rounded-lg border border-white/10 bg-transparent"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Логотип
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handleIconUpload(event.target.files?.[0], setResourceIcon)
                      }
                      className="hidden"
                      id="resource-icon"
                    />
                    <label
                      htmlFor="resource-icon"
                      className="h-10 px-3 rounded-lg border border-white/10 bg-black/40 text-white/70 text-xs flex items-center gap-2 cursor-pointer hover:border-emerald-400/40"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Выбрать
                    </label>
                    {resourceIcon && (
                      <img
                        src={resourceIcon}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-white/10"
                      />
                    )}
                  </div>
                </label>
                <button
                  onClick={handleAddResource}
                  className="h-10 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      {resource.iconDataUrl ? (
                        <img
                          src={resource.iconDataUrl}
                          alt=""
                          className="w-6 h-6 rounded-md object-cover border border-white/10"
                        />
                      ) : (
                        <span
                          className="w-4 h-4 rounded-full border border-white/10"
                          style={{ backgroundColor: resource.color }}
                        />
                      )}
                      <span className="text-white/80 text-sm">{resource.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={resource.color}
                        onChange={(event) =>
                          onUpdateResourceColor(resource.id, event.target.value)
                        }
                        className="w-8 h-8 rounded-lg border border-white/10 bg-transparent"
                      />
                      <div className="flex items-center gap-2 flex-row-reverse">
                        {resource.iconDataUrl && (
                          <button
                            onClick={() => onUpdateResourceIcon(resource.id, undefined)}
                            className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40 relative group"
                          >
                            <Trash2 className="w-4 h-4 text-white/60" />
                            <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                              Удалить логотип
                            </span>
                          </button>
                        )}
                        <label
                          className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 text-white/70 flex items-center justify-center cursor-pointer hover:border-emerald-400/40 relative group"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) =>
                              handleIconUpload(
                                event.target.files?.[0],
                                (value) => onUpdateResourceIcon(resource.id, value),
                              )
                            }
                          />
                          <ImageIcon className="w-4 h-4" />
                          <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            Изменить логотип
                          </span>
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteResource(resource.id)}
                      className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                    >
                      <Trash2 className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'buildings' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Здания</h2>
                <p className="text-white/60 text-sm">
                  Добавляйте и редактируйте здания для строительства.
                </p>
              </div>

              <div className="flex gap-3 items-end flex-wrap">
                <label className="flex-1 flex flex-col gap-2 text-white/70 text-sm min-w-[200px]">
                  Название
                  <input
                    value={buildingName}
                    onChange={(event) => setBuildingName(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Стоимость
                  <input
                    type="number"
                    min={1}
                    value={buildingCost}
                    onChange={(event) =>
                      setBuildingCost(Math.max(1, Number(event.target.value) || 1))
                    }
                    className="w-24 h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm min-w-[200px]">
                  Отрасль
                  <select
                    value={buildingIndustryId}
                    onChange={(event) => setBuildingIndustryId(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  >
                    <option value="" className="bg-[#0b111b] text-white">
                      Без отрасли
                    </option>
                    {industries.map((industry) => (
                      <option
                        key={industry.id}
                        value={industry.id}
                        className="bg-[#0b111b] text-white"
                      >
                        {industry.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Логотип
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handleIconUpload(event.target.files?.[0], setBuildingIcon)
                      }
                      className="hidden"
                      id="building-icon"
                    />
                    <label
                      htmlFor="building-icon"
                      className="h-10 px-3 rounded-lg border border-white/10 bg-black/40 text-white/70 text-xs flex items-center gap-2 cursor-pointer hover:border-emerald-400/40"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Выбрать
                    </label>
                    {buildingIcon && (
                      <img
                        src={buildingIcon}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-white/10"
                      />
                    )}
                  </div>
                </label>
                <button
                  onClick={handleAddBuilding}
                  className="h-10 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {buildings.length > 0 ? (
                  buildings.map((building) => (
                    <div
                      key={building.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        {building.iconDataUrl ? (
                          <img
                            src={building.iconDataUrl}
                            alt=""
                            className="w-6 h-6 rounded-md object-cover border border-white/10"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-white/50" />
                        )}
                        <div>
                          <div className="text-white/80 text-sm">
                            {building.name}
                          </div>
                          <div className="text-white/50 text-xs">
                            Стоимость: {Math.max(1, building.cost ?? 1)}
                          </div>
                          <div className="text-white/40 text-xs">
                            Отрасль:{' '}
                            {industries.find((i) => i.id === building.industryId)
                              ?.name ?? '—'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={building.industryId ?? ''}
                          onChange={(event) =>
                            onUpdateBuildingIndustry(
                              building.id,
                              event.target.value || undefined,
                            )
                          }
                          className="h-7 rounded-lg bg-black/30 border border-white/10 px-2 text-white/70 text-[11px] focus:outline-none focus:border-emerald-400/40"
                        >
                          <option value="" className="bg-[#0b111b] text-white">
                            Без отрасли
                          </option>
                          {industries.map((industry) => (
                            <option
                              key={industry.id}
                              value={industry.id}
                              className="bg-[#0b111b] text-white"
                            >
                              {industry.name}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2 flex-row-reverse">
                          {building.iconDataUrl && (
                            <button
                              onClick={() =>
                                onUpdateBuildingIcon(building.id, undefined)
                              }
                              className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40 relative group"
                            >
                              <Trash2 className="w-4 h-4 text-white/60" />
                              <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                Удалить логотип
                              </span>
                            </button>
                          )}
                          <label
                            className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 text-white/70 flex items-center justify-center cursor-pointer hover:border-emerald-400/40 relative group"
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) =>
                                handleIconUpload(
                                  event.target.files?.[0],
                                  (value) =>
                                    onUpdateBuildingIcon(building.id, value),
                                )
                              }
                            />
                            <ImageIcon className="w-4 h-4" />
                            <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                              Изменить логотип
                            </span>
                          </label>
                          <button
                            onClick={() => openEditRequirements(building)}
                            className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-emerald-400/40 relative group"
                          >
                            <Sliders className="w-4 h-4 text-white/60" />
                            <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                              Критерии
                            </span>
                          </button>
                        </div>
                        <button
                          onClick={() => onDeleteBuilding(building.id)}
                          className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                        >
                          <Trash2 className="w-4 h-4 text-white/60" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-white/50 text-sm">Нет зданий</div>
                )}
              </div>
            </div>
          )}

          {tab === 'industries' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Отрасли</h2>
                <p className="text-white/60 text-sm">
                  Добавляйте отрасли и логотипы для зданий.
                </p>
              </div>

              <div className="flex gap-3 items-end flex-wrap">
                <label className="flex-1 flex flex-col gap-2 text-white/70 text-sm min-w-[200px]">
                  Название
                  <input
                    value={industryName}
                    onChange={(event) => setIndustryName(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Цвет
                  <input
                    type="color"
                    value={industryColor}
                    onChange={(event) => setIndustryColor(event.target.value)}
                    className="w-14 h-10 rounded-lg border border-white/10 bg-transparent"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Логотип
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handleIconUpload(event.target.files?.[0], setIndustryIcon)
                      }
                      className="hidden"
                      id="industry-icon"
                    />
                    <label
                      htmlFor="industry-icon"
                      className="h-10 px-3 rounded-lg border border-white/10 bg-black/40 text-white/70 text-xs flex items-center gap-2 cursor-pointer hover:border-emerald-400/40"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Выбрать
                    </label>
                    {industryIcon && (
                      <img
                        src={industryIcon}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-white/10"
                      />
                    )}
                  </div>
                </label>
                <button
                  onClick={handleAddIndustry}
                  className="h-10 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {industries.length > 0 ? (
                  industries.map((industry) => (
                    <div
                      key={industry.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        {industry.iconDataUrl ? (
                          <img
                            src={industry.iconDataUrl}
                            alt=""
                            className="w-6 h-6 rounded-md object-cover border border-white/10"
                          />
                        ) : industry.color ? (
                          <span
                            className="w-4 h-4 rounded-full border border-white/10"
                            style={{ backgroundColor: industry.color }}
                          />
                        ) : (
                          <Factory className="w-4 h-4 text-white/60" />
                        )}
                        <span className="text-white/80 text-sm">
                          {industry.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={industry.color ?? '#f59e0b'}
                          onChange={(event) =>
                            onUpdateIndustryColor(industry.id, event.target.value)
                          }
                          className="w-8 h-8 rounded-lg border border-white/10 bg-transparent"
                        />
                        <div className="flex items-center gap-2 flex-row-reverse">
                          {industry.iconDataUrl && (
                            <button
                              onClick={() => onUpdateIndustryIcon(industry.id, undefined)}
                              className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40 relative group"
                            >
                              <Trash2 className="w-4 h-4 text-white/60" />
                              <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                Удалить логотип
                              </span>
                            </button>
                          )}
                          <label
                            className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 text-white/70 flex items-center justify-center cursor-pointer hover:border-emerald-400/40 relative group"
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) =>
                                handleIconUpload(
                                  event.target.files?.[0],
                                  (value) => onUpdateIndustryIcon(industry.id, value),
                                )
                              }
                            />
                            <ImageIcon className="w-4 h-4" />
                            <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                              Изменить логотип
                            </span>
                          </label>
                        </div>
                        <button
                          onClick={() => onDeleteIndustry(industry.id)}
                          className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                        >
                          <Trash2 className="w-4 h-4 text-white/60" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-white/50 text-sm">Нет отраслей</div>
                )}
              </div>
            </div>
          )}
                    {tab === 'companies' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white text-xl font-semibold">Компании</h2>
                <p className="text-white/60 text-sm">
                  Создавайте компании и назначайте их странам.
                </p>
              </div>

              <div className="flex gap-3 items-end flex-wrap">
                <label className="flex-1 flex flex-col gap-2 text-white/70 text-sm min-w-[200px]">
                  Название
                  <input
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm min-w-[200px]">
                  Страна
                  <select
                    value={companyCountryId}
                    onChange={(event) => setCompanyCountryId(event.target.value)}
                    className="h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                  >
                    <option value="" className="bg-[#0b111b] text-white">
                      Выберите страну
                    </option>
                    {countries.map((country) => (
                      <option
                        key={country.id}
                        value={country.id}
                        className="bg-[#0b111b] text-white"
                      >
                        {country.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Цвет
                  <input
                    type="color"
                    value={companyColor}
                    onChange={(event) => setCompanyColor(event.target.value)}
                    className="w-14 h-10 rounded-lg border border-white/10 bg-transparent"
                  />
                </label>
                <label className="flex flex-col gap-2 text-white/70 text-sm">
                  Логотип
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handleIconUpload(event.target.files?.[0], setCompanyIcon)
                      }
                      className="hidden"
                      id="company-icon"
                    />
                    <label
                      htmlFor="company-icon"
                      className="h-10 px-3 rounded-lg border border-white/10 bg-black/40 text-white/70 text-xs flex items-center gap-2 cursor-pointer hover:border-emerald-400/40"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Выбрать
                    </label>
                    {companyIcon && (
                      <img
                        src={companyIcon}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-white/10"
                      />
                    )}
                  </div>
                </label>
                <button
                  onClick={handleAddCompany}
                  className="h-10 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>

              <div className="space-y-2">
                {companies.length > 0 ? (
                  companies.map((company) => {
                    const country = countries.find((c) => c.id === company.countryId);
                    return (
                      <div
                        key={company.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          {company.iconDataUrl ? (
                            <img
                              src={company.iconDataUrl}
                              alt=""
                              className="w-6 h-6 rounded-md object-cover border border-white/10"
                            />
                          ) : company.color ? (
                            <span
                              className="w-4 h-4 rounded-full border border-white/10"
                              style={{ backgroundColor: company.color }}
                            />
                          ) : (
                            <Briefcase className="w-4 h-4 text-white/60" />
                          )}
                          <div>
                            <div className="text-white/80 text-sm">{company.name}</div>
                            <div className="text-white/50 text-xs">
                              {country?.name ?? 'Без страны'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={company.color ?? '#a855f7'}
                            onChange={(event) =>
                              onUpdateCompanyColor(company.id, event.target.value)
                            }
                            className="w-8 h-8 rounded-lg border border-white/10 bg-transparent"
                          />
                          <div className="flex items-center gap-2 flex-row-reverse">
                            {company.iconDataUrl && (
                              <button
                                onClick={() => onUpdateCompanyIcon(company.id, undefined)}
                                className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40 relative group"
                              >
                                <Trash2 className="w-4 h-4 text-white/60" />
                                <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                  Удалить логотип
                                </span>
                              </button>
                            )}
                            <label
                              className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 text-white/70 flex items-center justify-center cursor-pointer hover:border-emerald-400/40 relative group"
                            >
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) =>
                                  handleIconUpload(
                                    event.target.files?.[0],
                                    (value) => onUpdateCompanyIcon(company.id, value),
                                  )
                                }
                              />
                              <ImageIcon className="w-4 h-4" />
                              <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                Изменить логотип
                              </span>
                            </label>
                          </div>
                        </div>
                        <button
                          onClick={() => onDeleteCompany(company.id)}
                          className="w-8 h-8 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center hover:border-red-400/40"
                        >
                          <Trash2 className="w-4 h-4 text-white/60" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-white/50 text-sm">Нет компаний</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {editingBuildingId && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-4 rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <div className="text-white text-lg font-semibold">
                  Критерии здания
                </div>
                <div className="text-white/60 text-sm">
                  {editingBuilding?.name ?? 'Здание'}
                </div>
              </div>
              <button
                onClick={closeEditRequirements}
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/70 flex items-center justify-center hover:border-emerald-400/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto legend-scroll px-5 py-4 space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="text-white/80 text-sm font-semibold">
                  Требования
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Лимит на провинцию
                    <input
                      type="number"
                      min={0}
                      value={editReqMaxPerProvince}
                      onChange={(event) =>
                        setEditReqMaxPerProvince(
                          event.target.value === ''
                            ? ''
                            : Math.max(0, Number(event.target.value) || 0),
                        )
                      }
                      className="w-32 h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Лимит на государство
                    <input
                      type="number"
                      min={0}
                      value={editReqMaxPerCountry}
                      onChange={(event) =>
                        setEditReqMaxPerCountry(
                          event.target.value === ''
                            ? ''
                            : Math.max(0, Number(event.target.value) || 0),
                        )
                      }
                      className="w-32 h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-white/70 text-sm">
                    Лимит на мир
                    <input
                      type="number"
                      min={0}
                      value={editReqMaxGlobal}
                      onChange={(event) =>
                        setEditReqMaxGlobal(
                          event.target.value === ''
                            ? ''
                            : Math.max(0, Number(event.target.value) || 0),
                        )
                      }
                      className="w-32 h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-white focus:outline-none focus:border-emerald-400/60"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="text-white/70 text-sm">
                    Логические группы (климат/ландшафт/культура/религия)
                  </div>
                  {renderLogicNode(editReqLogic)}
                </div>

                <div className="space-y-2">
                  <div className="text-white/70 text-sm">
                    Ограничение по владельцу
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-white/50 text-xs">Страны</div>
                        <select
                          value={editReqAllowedCountriesMode}
                          onChange={(event) =>
                            setEditReqAllowedCountriesMode(
                              event.target.value as 'allow' | 'deny',
                            )
                          }
                          className="h-7 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-[11px] focus:outline-none focus:border-emerald-400/60"
                        >
                          <option value="allow" className="bg-[#0b111b] text-white">
                            Белый список
                          </option>
                          <option value="deny" className="bg-[#0b111b] text-white">
                            Черный список
                          </option>
                        </select>
                      </div>
                      {countries.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {countries.map((country) => (
                            <label
                              key={country.id}
                              className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white/70 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={editReqAllowedCountries.has(country.id)}
                                onChange={(event) =>
                                  setEditReqAllowedCountries((prev) => {
                                    const next = new Set(prev);
                                    if (event.target.checked) next.add(country.id);
                                    else next.delete(country.id);
                                    return next;
                                  })
                                }
                                className="w-4 h-4 accent-emerald-500"
                              />
                              <span>{country.name}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-white/50 text-sm">Нет стран</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-white/50 text-xs">Компании</div>
                        <select
                          value={editReqAllowedCompaniesMode}
                          onChange={(event) =>
                            setEditReqAllowedCompaniesMode(
                              event.target.value as 'allow' | 'deny',
                            )
                          }
                          className="h-7 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-[11px] focus:outline-none focus:border-emerald-400/60"
                        >
                          <option value="allow" className="bg-[#0b111b] text-white">
                            Белый список
                          </option>
                          <option value="deny" className="bg-[#0b111b] text-white">
                            Черный список
                          </option>
                        </select>
                      </div>
                      {companies.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {companies.map((company) => (
                            <label
                              key={company.id}
                              className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white/70 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={editReqAllowedCompanies.has(company.id)}
                                onChange={(event) =>
                                  setEditReqAllowedCompanies((prev) => {
                                    const next = new Set(prev);
                                    if (event.target.checked) next.add(company.id);
                                    else next.delete(company.id);
                                    return next;
                                  })
                                }
                                className="w-4 h-4 accent-emerald-500"
                              />
                              <span>{company.name}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-white/50 text-sm">Нет компаний</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-white/70 text-sm">Радиация / Загрязнение</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
                      <div className="text-white/60 text-xs">Радиация</div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1 text-[10px] text-white/50">
                          Мин
                          <input
                            type="number"
                            min={0}
                            value={editReqRadiationMin}
                            onChange={(event) =>
                              setEditReqRadiationMin(
                                event.target.value === ''
                                  ? ''
                                  : Math.max(0, Number(event.target.value) || 0),
                              )
                            }
                            className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[10px] text-white/50">
                          Макс
                          <input
                            type="number"
                            min={0}
                            value={editReqRadiationMax}
                            onChange={(event) =>
                              setEditReqRadiationMax(
                                event.target.value === ''
                                  ? ''
                                  : Math.max(0, Number(event.target.value) || 0),
                              )
                            }
                            className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60"
                          />
                        </label>
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
                      <div className="text-white/60 text-xs">Загрязнение</div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1 text-[10px] text-white/50">
                          Мин
                          <input
                            type="number"
                            min={0}
                            value={editReqPollutionMin}
                            onChange={(event) =>
                              setEditReqPollutionMin(
                                event.target.value === ''
                                  ? ''
                                  : Math.max(0, Number(event.target.value) || 0),
                              )
                            }
                            className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[10px] text-white/50">
                          Макс
                          <input
                            type="number"
                            min={0}
                            value={editReqPollutionMax}
                            onChange={(event) =>
                              setEditReqPollutionMax(
                                event.target.value === ''
                                  ? ''
                                  : Math.max(0, Number(event.target.value) || 0),
                              )
                            }
                            className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-white/70 text-sm">Ресурсы</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="text-white/50 text-xs">Должны быть</div>
                      {resources.length > 0 ? (
                        resources.map((resource) => (
                          <label
                            key={resource.id}
                            className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white/70 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={editReqResourceAny.has(resource.id)}
                              onChange={(event) =>
                                setEditReqResourceAny((prev) => {
                                  const next = new Set(prev);
                                  if (event.target.checked) {
                                    next.add(resource.id);
                                    setEditReqResourceNone((prevNone) => {
                                      const nextNone = new Set(prevNone);
                                      nextNone.delete(resource.id);
                                      return nextNone;
                                    });
                                  } else {
                                    next.delete(resource.id);
                                  }
                                  return next;
                                })
                              }
                              className="w-4 h-4 accent-emerald-500"
                            />
                            <span>{resource.name}</span>
                          </label>
                        ))
                      ) : (
                        <div className="text-white/50 text-sm">Нет ресурсов</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="text-white/50 text-xs">Запрещены</div>
                      {resources.length > 0 ? (
                        resources.map((resource) => (
                          <label
                            key={resource.id}
                            className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white/70 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={editReqResourceNone.has(resource.id)}
                              onChange={(event) =>
                                setEditReqResourceNone((prev) => {
                                  const next = new Set(prev);
                                  if (event.target.checked) {
                                    next.add(resource.id);
                                    setEditReqResourceAny((prevAny) => {
                                      const nextAny = new Set(prevAny);
                                      nextAny.delete(resource.id);
                                      return nextAny;
                                    });
                                  } else {
                                    next.delete(resource.id);
                                  }
                                  return next;
                                })
                              }
                              className="w-4 h-4 accent-rose-400"
                            />
                            <span>{resource.name}</span>
                          </label>
                        ))
                      ) : (
                        <div className="text-white/50 text-sm">Нет ресурсов</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-white/70 text-sm">
                    Требования по зданиям
                  </div>
                  {buildings.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {buildings
                        .filter((b) => b.id !== editingBuildingId)
                        .map((b) => {
                          const current = editReqBuildingCriteria[b.id] ?? {};
                          const province = current.province ?? {};
                          const country = current.country ?? {};
                          const global = current.global ?? {};
                          return (
                            <div
                              key={b.id}
                              className="rounded-lg border border-white/10 bg-black/30 p-3 text-white/70 text-sm space-y-2"
                            >
                              <div className="text-white/80 text-sm font-medium">
                                {b.name}
                              </div>
                              <div className="grid grid-cols-1 gap-3 text-xs">
                                <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
                                  <div className="text-white/60 text-[11px]">
                                    Провинция
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    <label className="flex flex-col gap-1 text-[10px] text-white/50">
                                      Мин
                                      <input
                                        type="number"
                                        min={0}
                                        value={province.min ?? 0}
                                        onChange={(event) =>
                                          setEditReqBuildingCriteria((prev) => ({
                                            ...prev,
                                            [b.id]: {
                                              ...prev[b.id],
                                              province: {
                                                ...prev[b.id]?.province,
                                                min: Math.max(
                                                  0,
                                                  Number(event.target.value) || 0,
                                                ),
                                              },
                                            },
                                          }))
                                        }
                                        className="w-full h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm placeholder-white/40 focus:outline-none focus:border-emerald-400/60"
                                      />
                                    </label>
                                    <label className="flex flex-col gap-1 text-[10px] text-white/50">
                                      Макс
                                      <input
                                        type="number"
                                        min={0}
                                        value={province.max ?? 0}
                                        onChange={(event) =>
                                          setEditReqBuildingCriteria((prev) => ({
                                            ...prev,
                                            [b.id]: {
                                              ...prev[b.id],
                                              province: {
                                                ...prev[b.id]?.province,
                                                max: Math.max(
                                                  0,
                                                  Number(event.target.value) || 0,
                                                ),
                                              },
                                            },
                                          }))
                                        }
                                        className="w-full h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm placeholder-white/40 focus:outline-none focus:border-emerald-400/60"
                                      />
                                    </label>
                                  </div>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
                                  <div className="text-white/60 text-[11px]">
                                    Государство
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    <label className="flex flex-col gap-1 text-[10px] text-white/50">
                                      Мин
                                      <input
                                        type="number"
                                        min={0}
                                        value={country.min ?? 0}
                                        onChange={(event) =>
                                          setEditReqBuildingCriteria((prev) => ({
                                            ...prev,
                                            [b.id]: {
                                              ...prev[b.id],
                                              country: {
                                                ...prev[b.id]?.country,
                                                min: Math.max(
                                                  0,
                                                  Number(event.target.value) || 0,
                                                ),
                                              },
                                            },
                                          }))
                                        }
                                        className="w-full h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm placeholder-white/40 focus:outline-none focus:border-emerald-400/60"
                                      />
                                    </label>
                                    <label className="flex flex-col gap-1 text-[10px] text-white/50">
                                      Макс
                                      <input
                                        type="number"
                                        min={0}
                                        value={country.max ?? 0}
                                        onChange={(event) =>
                                          setEditReqBuildingCriteria((prev) => ({
                                            ...prev,
                                            [b.id]: {
                                              ...prev[b.id],
                                              country: {
                                                ...prev[b.id]?.country,
                                                max: Math.max(
                                                  0,
                                                  Number(event.target.value) || 0,
                                                ),
                                              },
                                            },
                                          }))
                                        }
                                        className="w-full h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm placeholder-white/40 focus:outline-none focus:border-emerald-400/60"
                                      />
                                    </label>
                                  </div>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
                                  <div className="text-white/60 text-[11px]">
                                    Мир
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    <label className="flex flex-col gap-1 text-[10px] text-white/50">
                                      Мин
                                      <input
                                        type="number"
                                        min={0}
                                        value={global.min ?? 0}
                                        onChange={(event) =>
                                          setEditReqBuildingCriteria((prev) => ({
                                            ...prev,
                                            [b.id]: {
                                              ...prev[b.id],
                                              global: {
                                                ...prev[b.id]?.global,
                                                min: Math.max(
                                                  0,
                                                  Number(event.target.value) || 0,
                                                ),
                                              },
                                            },
                                          }))
                                        }
                                        className="w-full h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm placeholder-white/40 focus:outline-none focus:border-emerald-400/60"
                                      />
                                    </label>
                                    <label className="flex flex-col gap-1 text-[10px] text-white/50">
                                      Макс
                                      <input
                                        type="number"
                                        min={0}
                                        value={global.max ?? 0}
                                        onChange={(event) =>
                                          setEditReqBuildingCriteria((prev) => ({
                                            ...prev,
                                            [b.id]: {
                                              ...prev[b.id],
                                              global: {
                                                ...prev[b.id]?.global,
                                                max: Math.max(
                                                  0,
                                                  Number(event.target.value) || 0,
                                                ),
                                              },
                                            },
                                          }))
                                        }
                                        className="w-full h-10 rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm placeholder-white/40 focus:outline-none focus:border-emerald-400/60"
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-white/50 text-sm">Нет зданий</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/10">
              <button
                onClick={closeEditRequirements}
                className="h-9 px-3 rounded-lg border border-white/10 bg-black/30 text-white/60 text-sm hover:border-emerald-400/40"
              >
                Отмена
              </button>
              <button
                onClick={saveEditRequirements}
                className="h-9 px-4 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

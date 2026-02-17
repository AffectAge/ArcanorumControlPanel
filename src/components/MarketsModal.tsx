import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Globe2,
  Plus,
  Save,
  Send,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BuildingDefinition,
  Country,
  DiplomacyProposal,
  Market,
  ProvinceRecord,
  ResourceCategory,
  Trait,
  WorldMarket,
} from '../types';
import Tooltip from './Tooltip';

type MarketsModalProps = {
  open: boolean;
  countries: Country[];
  markets: Market[];
  worldMarket: WorldMarket;
  provinces: ProvinceRecord;
  resources: Trait[];
  resourceCategories: ResourceCategory[];
  buildings: BuildingDefinition[];
  proposals: DiplomacyProposal[];
  activeCountryId?: string;
  onClose: () => void;
  onCreateMarket: (payload: {
    actorCountryId?: string;
    name: string;
    leaderCountryId: string;
    memberCountryIds: string[];
    color?: string;
    logoDataUrl?: string;
    capitalProvinceId?: string;
    allowInfrastructureAccessWithoutTreaties?: boolean;
  }) => void;
  onUpdateMarket: (
    marketId: string,
    patch: {
      actorCountryId?: string;
      name?: string;
      leaderCountryId?: string;
      memberCountryIds?: string[];
      color?: string;
      logoDataUrl?: string;
      capitalProvinceId?: string;
      allowInfrastructureAccessWithoutTreaties?: boolean;
    },
  ) => void;
  onDeleteMarket: (marketId: string, actorCountryId?: string) => void;
  onLeaveMarket: (countryId?: string, marketId?: string) => void;
  onTradeWithWarehouse: (payload: {
    marketId: string;
    actorCountryId?: string;
    resourceId: string;
    amount: number;
    action: 'buy' | 'sell';
  }) => void;
  onInviteByTreaty: (targetCountryId: string) => void;
  onRequestJoinMarket: (marketId: string) => void;
  onUpdateOwnTradePolicy: (
    marketId: string,
    actorCountryId: string | undefined,
    resourceId: string,
    targetCountryId: string | undefined,
    policy?: {
      allowExportToMarketMembers?: boolean;
      allowImportFromMarketMembers?: boolean;
      maxExportAmountPerTurnToMarketMembers?: number;
      maxImportAmountPerTurnFromMarketMembers?: number;
    },
  ) => void;
  onUpdateOwnWorldTradePolicy: (
    marketId: string,
    actorCountryId: string | undefined,
    resourceId: string,
    targetMode: 'all' | 'market' | 'country',
    targetId: string | undefined,
    policy?: {
      allowExportToWorld?: boolean;
      allowImportFromWorld?: boolean;
      maxExportAmountPerTurnToWorld?: number;
      maxImportAmountPerTurnFromWorld?: number;
    },
  ) => void;
};

type MarketsTab = 'market' | 'goods' | 'world';

const PRICE_TREND_EPSILON = 0.0001;
const GRAPH_WIDTH = 84;
const GRAPH_HEIGHT = 24;
const ALL_RESOURCES_WORLD_TRADE_POLICY_KEY = '__all_resources__';

const formatCompactNumber = (value: number, smallDigits = 1) => {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const trim = (input: string) =>
    input.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  if (abs >= 1_000_000_000) return `${sign}${trim((abs / 1_000_000_000).toFixed(2))}b`;
  if (abs >= 1_000_000) return `${sign}${trim((abs / 1_000_000).toFixed(2))}m`;
  if (abs >= 1_000) return `${sign}${trim((abs / 1_000).toFixed(2))}k`;
  if (Number.isInteger(value)) return `${value}`;
  return trim(value.toFixed(smallDigits));
};

const formatInfrastructureAmount = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  const digits = abs > 0 && abs < 1 ? 4 : 2;
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
};

const getSparklinePath = (values: number[], width = GRAPH_WIDTH, height = GRAPH_HEIGHT) => {
  if (values.length === 0) return '';
  if (values.length === 1) {
    const y = height / 2;
    return `M 0 ${y} L ${width} ${y}`;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const step = width / Math.max(1, values.length - 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const normalizedY = range <= PRICE_TREND_EPSILON ? 0.5 : (value - min) / range;
      const y = height - normalizedY * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
};

const MiniGraphCard = ({
  title,
  value,
  valueClassName,
  borderClassName,
  bgClassName,
  values,
  stroke,
  ariaLabel,
  tooltip,
}: {
  title: string;
  value: string;
  valueClassName: string;
  borderClassName: string;
  bgClassName: string;
  values: number[];
  stroke: string;
  ariaLabel: string;
  tooltip: string;
}) => (
  <Tooltip label={title} description={tooltip}>
    <div
      className={`relative min-h-[86px] rounded-md border px-2 py-1.5 min-w-[116px] flex flex-col justify-between ${borderClassName} ${bgClassName}`}
    >
      <div className="text-[10px] text-white/80 leading-none mb-1">{title}</div>
      <div className="inline-flex items-center justify-between gap-2 w-full">
        <span className={`text-xs tabular-nums ${valueClassName}`}>{value}</span>
        <svg
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          className="h-6 w-[84px]"
          aria-label={ariaLabel}
        >
          <path
            d={getSparklinePath(values, GRAPH_WIDTH, GRAPH_HEIGHT)}
            fill="none"
            stroke={stroke}
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  </Tooltip>
);

const ShareDonut = ({
  label,
  value,
  pathColor,
  amount,
  amountLabel,
  secondaryAmountLabel,
  secondaryAmount,
  description,
}: {
  label: string;
  value: number;
  pathColor: string;
  amount: number;
  amountLabel: string;
  secondaryAmountLabel: string;
  secondaryAmount: number;
  description: string;
}) => {
  const normalized = Math.max(0, Math.min(100, value));
  const pieBackground = `conic-gradient(${pathColor} 0% ${normalized}%, rgba(255,255,255,0.08) ${normalized}% 100%)`;
  return (
    <Tooltip
      label={label}
      description={`${description} ${amountLabel}: ${formatCompactNumber(amount, 0)} | ${secondaryAmountLabel}: ${formatCompactNumber(secondaryAmount, 0)} (${normalized.toFixed(1)}%)`}
    >
      <div className="group relative inline-flex flex-col items-center gap-1 min-w-[116px] rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
        <div className="relative h-8 w-[84px] transition-transform duration-150 group-hover:scale-105">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-[30px] w-[30px]">
              <div
                className="absolute inset-0 rounded-full border border-white/20 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]"
                style={{ background: pieBackground }}
              />
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_48%)]" />
              <div className="absolute inset-[5px] rounded-full border border-white/15 bg-[#09101a]/95" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[8px] font-medium text-white/90 tabular-nums">
                  {normalized.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
        <span className="text-[10px] text-white/60 leading-none">{label}</span>
        <span className="text-[10px] text-white/85 tabular-nums leading-none">
          {amountLabel}: {formatCompactNumber(amount, 0)}
        </span>
        <span className="text-[9px] text-white/50 tabular-nums leading-none">
          {secondaryAmountLabel}: {formatCompactNumber(secondaryAmount, 0)}
        </span>
      </div>
    </Tooltip>
  );
};

export default function MarketsModal({
  open,
  countries,
  markets,
  worldMarket,
  provinces,
  resources,
  resourceCategories,
  buildings,
  proposals,
  activeCountryId,
  onClose,
  onCreateMarket,
  onUpdateMarket,
  onDeleteMarket,
  onLeaveMarket,
  onTradeWithWarehouse: _onTradeWithWarehouse,
  onInviteByTreaty,
  onRequestJoinMarket,
  onUpdateOwnTradePolicy,
  onUpdateOwnWorldTradePolicy,
}: MarketsModalProps) {
  const [tab, setTab] = useState<MarketsTab>('market');
  const [newMarketName, setNewMarketName] = useState('');
  const [marketNameDraft, setMarketNameDraft] = useState('');
  const [capitalProvinceIdDraft, setCapitalProvinceIdDraft] = useState('');
  const [marketColorDraft, setMarketColorDraft] = useState('#22c55e');
  const [marketLogoDraft, setMarketLogoDraft] = useState<string | undefined>(undefined);
  const [allowInfrastructureAccessWithoutTreatiesDraft, setAllowInfrastructureAccessWithoutTreatiesDraft] =
    useState(true);
  const [tradePolicyModalResourceId, setTradePolicyModalResourceId] = useState<
    string | undefined
  >(undefined);
  const [tradePolicyModalTargetCountryId, setTradePolicyModalTargetCountryId] =
    useState<string>('');
  const [worldTradePolicyModalResourceId, setWorldTradePolicyModalResourceId] = useState<
    string | undefined
  >(undefined);
  const [worldTradePolicyTargetMode, setWorldTradePolicyTargetMode] = useState<
    'all' | 'market' | 'country'
  >('all');
  const [worldTradePolicyTargetId, setWorldTradePolicyTargetId] = useState<string>('');
  const [tradePolicyDraftByResourceId, setTradePolicyDraftByResourceId] = useState<
    Record<
      string,
      {
        allowExportToMarketMembers: boolean;
        allowImportFromMarketMembers: boolean;
        maxExportAmountPerTurnToMarketMembers: string;
        maxImportAmountPerTurnFromMarketMembers: string;
      }
    >
  >({});
  const [tradePolicyDraftByResourceAndCountryId, setTradePolicyDraftByResourceAndCountryId] =
    useState<
      Record<
        string,
        Record<
          string,
          {
            allowExportToMarketMembers: boolean;
            allowImportFromMarketMembers: boolean;
            maxExportAmountPerTurnToMarketMembers: string;
            maxImportAmountPerTurnFromMarketMembers: string;
          }
        >
      >
    >({});
  const [worldTradePolicyDraftByResourceId, setWorldTradePolicyDraftByResourceId] = useState<
    Record<
      string,
      {
        allowExportToWorld: boolean;
        allowImportFromWorld: boolean;
        maxExportAmountPerTurnToWorld: string;
        maxImportAmountPerTurnFromWorld: string;
      }
    >
  >({});
  const [worldTradePolicyDraftByResourceAndCountryId, setWorldTradePolicyDraftByResourceAndCountryId] =
    useState<
      Record<
        string,
        Record<
          string,
          {
            allowExportToWorld: boolean;
            allowImportFromWorld: boolean;
            maxExportAmountPerTurnToWorld: string;
            maxImportAmountPerTurnFromWorld: string;
          }
        >
      >
    >({});
  const [worldTradePolicyDraftByResourceAndMarketId, setWorldTradePolicyDraftByResourceAndMarketId] =
    useState<
      Record<
        string,
        Record<
          string,
          {
            allowExportToWorld: boolean;
            allowImportFromWorld: boolean;
            maxExportAmountPerTurnToWorld: string;
            maxImportAmountPerTurnFromWorld: string;
          }
        >
      >
    >({});

  const activeCountry = countries.find((country) => country.id === activeCountryId);
  const memberMarket = activeCountryId
    ? markets.find((market) => market.memberCountryIds.includes(activeCountryId))
    : undefined;
  const ownMarket =
    memberMarket?.leaderCountryId === activeCountryId ? memberMarket : undefined;
  const canEditOwnMarket = Boolean(
    ownMarket && activeCountryId && ownMarket.creatorCountryId === activeCountryId,
  );

  const ownCountryProvinceIds = useMemo(() => {
    if (!activeCountryId) return [] as string[];
    return Object.values(provinces)
      .filter((province) => province.ownerCountryId === activeCountryId)
      .map((province) => province.id)
      .sort((a, b) => a.localeCompare(b));
  }, [provinces, activeCountryId]);

  useEffect(() => {
    if (!open) return;
    setTab('market');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (ownMarket) {
      setMarketNameDraft(ownMarket.name);
      setCapitalProvinceIdDraft(ownMarket.capitalProvinceId ?? '');
      setMarketColorDraft(ownMarket.color ?? '#22c55e');
      setMarketLogoDraft(ownMarket.logoDataUrl);
      setAllowInfrastructureAccessWithoutTreatiesDraft(
        Boolean(ownMarket.allowInfrastructureAccessWithoutTreaties),
      );
      return;
    }
    if (!newMarketName && activeCountry) {
      setNewMarketName(`Рынок ${activeCountry.name}`);
    }
    setCapitalProvinceIdDraft((prev) => prev || ownCountryProvinceIds[0] || '');
    setMarketColorDraft((prev) => prev || activeCountry?.color || '#22c55e');
    setAllowInfrastructureAccessWithoutTreatiesDraft(true);
  }, [open, ownMarket, activeCountry, newMarketName, ownCountryProvinceIds]);

  useEffect(() => {
    if (!open || !memberMarket || !activeCountryId) {
      setTradePolicyDraftByResourceId({});
      setTradePolicyDraftByResourceAndCountryId({});
      return;
    }
    const byResource = memberMarket.resourceTradePolicyByCountryId?.[activeCountryId] ?? {};
    const nextByResourceAndCountry: Record<
      string,
      Record<
        string,
        {
          allowExportToMarketMembers: boolean;
          allowImportFromMarketMembers: boolean;
          maxExportAmountPerTurnToMarketMembers: string;
          maxImportAmountPerTurnFromMarketMembers: string;
        }
      >
    > = {};
    const next: Record<
      string,
      {
        allowExportToMarketMembers: boolean;
        allowImportFromMarketMembers: boolean;
        maxExportAmountPerTurnToMarketMembers: string;
        maxImportAmountPerTurnFromMarketMembers: string;
      }
    > = {};
    resources.forEach((resource) => {
      const policy = byResource[resource.id];
      next[resource.id] = {
        allowExportToMarketMembers: policy?.allowExportToMarketMembers !== false,
        allowImportFromMarketMembers: policy?.allowImportFromMarketMembers !== false,
        maxExportAmountPerTurnToMarketMembers:
          policy?.maxExportAmountPerTurnToMarketMembers != null
            ? String(policy.maxExportAmountPerTurnToMarketMembers)
            : '',
        maxImportAmountPerTurnFromMarketMembers:
          policy?.maxImportAmountPerTurnFromMarketMembers != null
            ? String(policy.maxImportAmountPerTurnFromMarketMembers)
            : '',
      };
      const overrides: Record<
        string,
        {
          allowExportToMarketMembers: boolean;
          allowImportFromMarketMembers: boolean;
          maxExportAmountPerTurnToMarketMembers: string;
          maxImportAmountPerTurnFromMarketMembers: string;
        }
      > = {};
      Object.entries(policy?.countryOverridesByCountryId ?? {}).forEach(
        ([countryId, override]) => {
          overrides[countryId] = {
            allowExportToMarketMembers:
              override?.allowExportToMarketMembers !== false,
            allowImportFromMarketMembers:
              override?.allowImportFromMarketMembers !== false,
            maxExportAmountPerTurnToMarketMembers:
              override?.maxExportAmountPerTurnToMarketMembers != null
                ? String(override.maxExportAmountPerTurnToMarketMembers)
                : '',
            maxImportAmountPerTurnFromMarketMembers:
              override?.maxImportAmountPerTurnFromMarketMembers != null
                ? String(override.maxImportAmountPerTurnFromMarketMembers)
                : '',
          };
        },
      );
      if (Object.keys(overrides).length > 0) {
        nextByResourceAndCountry[resource.id] = overrides;
      }
    });
    setTradePolicyDraftByResourceId(next);
    setTradePolicyDraftByResourceAndCountryId(nextByResourceAndCountry);
  }, [open, memberMarket, activeCountryId, resources]);

  useEffect(() => {
    if (!open || !memberMarket) {
      setWorldTradePolicyDraftByResourceId({});
      setWorldTradePolicyDraftByResourceAndCountryId({});
      setWorldTradePolicyDraftByResourceAndMarketId({});
      return;
    }
    const nextBase: Record<
      string,
      {
        allowExportToWorld: boolean;
        allowImportFromWorld: boolean;
        maxExportAmountPerTurnToWorld: string;
        maxImportAmountPerTurnFromWorld: string;
      }
    > = {};
    const nextByCountry: Record<
      string,
      Record<
        string,
        {
          allowExportToWorld: boolean;
          allowImportFromWorld: boolean;
          maxExportAmountPerTurnToWorld: string;
          maxImportAmountPerTurnFromWorld: string;
        }
      >
    > = {};
    const nextByMarket: Record<
      string,
      Record<
        string,
        {
          allowExportToWorld: boolean;
          allowImportFromWorld: boolean;
          maxExportAmountPerTurnToWorld: string;
          maxImportAmountPerTurnFromWorld: string;
        }
      >
    > = {};
    const resourcePolicyIds = [
      ALL_RESOURCES_WORLD_TRADE_POLICY_KEY,
      ...resources.map((resource) => resource.id),
    ];
    resourcePolicyIds.forEach((resourceId) => {
      const policy = memberMarket.worldTradePolicyByResourceId?.[resourceId];
      nextBase[resourceId] = {
        allowExportToWorld: policy?.allowExportToWorld !== false,
        allowImportFromWorld: policy?.allowImportFromWorld !== false,
        maxExportAmountPerTurnToWorld:
          policy?.maxExportAmountPerTurnToWorld != null
            ? String(policy.maxExportAmountPerTurnToWorld)
            : '',
        maxImportAmountPerTurnFromWorld:
          policy?.maxImportAmountPerTurnFromWorld != null
            ? String(policy.maxImportAmountPerTurnFromWorld)
            : '',
      };
      const countryOverrides: Record<
        string,
        {
          allowExportToWorld: boolean;
          allowImportFromWorld: boolean;
          maxExportAmountPerTurnToWorld: string;
          maxImportAmountPerTurnFromWorld: string;
        }
      > = {};
      Object.entries(policy?.countryOverridesByCountryId ?? {}).forEach(
        ([countryId, override]) => {
          countryOverrides[countryId] = {
            allowExportToWorld: override?.allowExportToWorld !== false,
            allowImportFromWorld: override?.allowImportFromWorld !== false,
            maxExportAmountPerTurnToWorld:
              override?.maxExportAmountPerTurnToWorld != null
                ? String(override.maxExportAmountPerTurnToWorld)
                : '',
            maxImportAmountPerTurnFromWorld:
              override?.maxImportAmountPerTurnFromWorld != null
                ? String(override.maxImportAmountPerTurnFromWorld)
                : '',
          };
        },
      );
      if (Object.keys(countryOverrides).length > 0) {
        nextByCountry[resourceId] = countryOverrides;
      }
      const marketOverrides: Record<
        string,
        {
          allowExportToWorld: boolean;
          allowImportFromWorld: boolean;
          maxExportAmountPerTurnToWorld: string;
          maxImportAmountPerTurnFromWorld: string;
        }
      > = {};
      Object.entries(policy?.marketOverridesByMarketId ?? {}).forEach(
        ([marketId, override]) => {
          marketOverrides[marketId] = {
            allowExportToWorld: override?.allowExportToWorld !== false,
            allowImportFromWorld: override?.allowImportFromWorld !== false,
            maxExportAmountPerTurnToWorld:
              override?.maxExportAmountPerTurnToWorld != null
                ? String(override.maxExportAmountPerTurnToWorld)
                : '',
            maxImportAmountPerTurnFromWorld:
              override?.maxImportAmountPerTurnFromWorld != null
                ? String(override.maxImportAmountPerTurnFromWorld)
                : '',
          };
        },
      );
      if (Object.keys(marketOverrides).length > 0) {
        nextByMarket[resourceId] = marketOverrides;
      }
    });
    setWorldTradePolicyDraftByResourceId(nextBase);
    setWorldTradePolicyDraftByResourceAndCountryId(nextByCountry);
    setWorldTradePolicyDraftByResourceAndMarketId(nextByMarket);
  }, [open, memberMarket, resources]);

  const assignedMarketByCountry = useMemo(() => {
    const map = new Map<string, string>();
    markets.forEach((market) => {
      market.memberCountryIds.forEach((countryId) => {
        map.set(countryId, market.id);
      });
    });
    return map;
  }, [markets]);

  const pendingInviteCountryIds = useMemo(() => {
    if (!activeCountryId) return new Set<string>();
    const result = new Set<string>();
    proposals.forEach((proposal) => {
      const agreement = proposal.agreement;
      const category = agreement.agreementCategory ?? 'construction';
      if (category !== 'market_invite' && category !== 'market') return;
      if (proposal.fromCountryId !== activeCountryId) return;
      if (agreement.marketLeaderCountryId !== activeCountryId) return;
      result.add(proposal.toCountryId);
    });
    return result;
  }, [proposals, activeCountryId]);
  const pendingJoinRequestMarketLeaderIds = useMemo(() => {
    if (!activeCountryId) return new Set<string>();
    const result = new Set<string>();
    proposals.forEach((proposal) => {
      const category = proposal.agreement.agreementCategory ?? 'construction';
      if (category !== 'market_invite' && category !== 'market') return;
      const leaderId = proposal.agreement.marketLeaderCountryId;
      if (!leaderId) return;
      if (proposal.fromCountryId !== activeCountryId) return;
      if (proposal.toCountryId !== leaderId) return;
      result.add(leaderId);
    });
    return result;
  }, [proposals, activeCountryId]);

  const inviteCandidates = useMemo(() => {
    if (!activeCountryId || !ownMarket) return [];
    const ownMembers = new Set(ownMarket.memberCountryIds);
    return countries.filter((country) => {
      if (country.id === activeCountryId) return false;
      if (ownMembers.has(country.id)) return false;
      const assignedMarketId = assignedMarketByCountry.get(country.id);
      return !assignedMarketId;
    });
  }, [countries, activeCountryId, ownMarket, assignedMarketByCountry]);
  const joinableMarkets = useMemo(() => {
    if (!activeCountryId || memberMarket) return [] as Market[];
    return markets.filter((market) => {
      if (market.memberCountryIds.includes(activeCountryId)) return false;
      return Boolean(market.leaderCountryId);
    });
  }, [markets, activeCountryId, memberMarket]);

  const worldPolicyMarketTargets = useMemo(() => {
    if (!memberMarket) return [] as Market[];
    return markets.filter((market) => market.id !== memberMarket.id);
  }, [markets, memberMarket]);

  const worldPolicyCountryTargets = useMemo(() => {
    if (!memberMarket) return [] as Country[];
    const ownMemberIds = new Set(memberMarket.memberCountryIds);
    return countries.filter((country) => !ownMemberIds.has(country.id));
  }, [countries, memberMarket]);
  const selectedWorldPolicyMarket = useMemo(
    () => worldPolicyMarketTargets.find((market) => market.id === worldTradePolicyTargetId),
    [worldPolicyMarketTargets, worldTradePolicyTargetId],
  );
  const selectedWorldPolicyCountry = useMemo(
    () => worldPolicyCountryTargets.find((country) => country.id === worldTradePolicyTargetId),
    [worldPolicyCountryTargets, worldTradePolicyTargetId],
  );

  useEffect(() => {
    if (!open) return;
    if (worldTradePolicyTargetMode === 'market') {
      const firstMarketId = worldPolicyMarketTargets[0]?.id ?? '';
      setWorldTradePolicyTargetId((prev) =>
        prev && worldPolicyMarketTargets.some((market) => market.id === prev)
          ? prev
          : firstMarketId,
      );
      return;
    }
    if (worldTradePolicyTargetMode === 'country') {
      const firstCountryId = worldPolicyCountryTargets[0]?.id ?? '';
      setWorldTradePolicyTargetId((prev) =>
        prev && worldPolicyCountryTargets.some((country) => country.id === prev)
          ? prev
          : firstCountryId,
      );
      return;
    }
    setWorldTradePolicyTargetId('');
  }, [
    open,
    worldTradePolicyTargetMode,
    worldPolicyMarketTargets,
    worldPolicyCountryTargets,
  ]);

  const canCreateMarket = Boolean(
    activeCountryId &&
      !memberMarket &&
      ownCountryProvinceIds.length > 0 &&
      capitalProvinceIdDraft &&
      capitalProvinceIdDraft.length > 0,
  );

  const handleLogoUpload = (file: File | undefined) => {
    if (!file) {
      setMarketLogoDraft(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setMarketLogoDraft(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  const createEmptyTradePolicyDraft = () => ({
    allowExportToMarketMembers: true,
    allowImportFromMarketMembers: true,
    maxExportAmountPerTurnToMarketMembers: '',
    maxImportAmountPerTurnFromMarketMembers: '',
  });

  const getTradePolicyDraft = (
    resourceId: string,
    targetCountryId?: string,
  ) =>
    targetCountryId
      ? tradePolicyDraftByResourceAndCountryId[resourceId]?.[targetCountryId] ??
        createEmptyTradePolicyDraft()
      : tradePolicyDraftByResourceId[resourceId] ?? createEmptyTradePolicyDraft();

  const updateTradePolicyDraft = (
    resourceId: string,
    targetCountryId: string | undefined,
    patch: Partial<{
      allowExportToMarketMembers: boolean;
      allowImportFromMarketMembers: boolean;
      maxExportAmountPerTurnToMarketMembers: string;
      maxImportAmountPerTurnFromMarketMembers: string;
    }>,
  ) => {
    if (targetCountryId) {
      setTradePolicyDraftByResourceAndCountryId((prev) => ({
        ...prev,
        [resourceId]: {
          ...(prev[resourceId] ?? {}),
          [targetCountryId]: {
            ...(prev[resourceId]?.[targetCountryId] ?? createEmptyTradePolicyDraft()),
            ...patch,
          },
        },
      }));
      return;
    }
    setTradePolicyDraftByResourceId((prev) => ({
      ...prev,
      [resourceId]: {
        ...(prev[resourceId] ?? createEmptyTradePolicyDraft()),
        ...patch,
      },
    }));
  };

  const saveTradePolicyForResource = (
    resourceId: string,
    targetCountryId?: string,
  ) => {
    if (!memberMarket || !activeCountryId) return;
    const draft = getTradePolicyDraft(resourceId, targetCountryId);
    if (!draft) return;
    const parseLimit = (raw: string) => {
      const parsed = Math.max(0, Math.floor(Number(raw)));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    };
    onUpdateOwnTradePolicy(
      memberMarket.id,
      activeCountryId,
      resourceId,
      targetCountryId,
      {
      allowExportToMarketMembers: draft.allowExportToMarketMembers,
      allowImportFromMarketMembers: draft.allowImportFromMarketMembers,
      maxExportAmountPerTurnToMarketMembers: parseLimit(
        draft.maxExportAmountPerTurnToMarketMembers,
      ),
      maxImportAmountPerTurnFromMarketMembers: parseLimit(
        draft.maxImportAmountPerTurnFromMarketMembers,
      ),
      },
    );
  };

  const createEmptyWorldTradePolicyDraft = () => ({
    allowExportToWorld: true,
    allowImportFromWorld: true,
    maxExportAmountPerTurnToWorld: '',
    maxImportAmountPerTurnFromWorld: '',
  });

  const getWorldTradePolicyDraft = (
    resourceId: string,
    targetMode: 'all' | 'market' | 'country',
    targetId?: string,
  ) => {
    if (targetMode === 'country' && targetId) {
      return (
        worldTradePolicyDraftByResourceAndCountryId[resourceId]?.[targetId] ??
        createEmptyWorldTradePolicyDraft()
      );
    }
    if (targetMode === 'market' && targetId) {
      return (
        worldTradePolicyDraftByResourceAndMarketId[resourceId]?.[targetId] ??
        createEmptyWorldTradePolicyDraft()
      );
    }
    return worldTradePolicyDraftByResourceId[resourceId] ?? createEmptyWorldTradePolicyDraft();
  };

  const updateWorldTradePolicyDraft = (
    resourceId: string,
    targetMode: 'all' | 'market' | 'country',
    targetId: string | undefined,
    patch: Partial<{
      allowExportToWorld: boolean;
      allowImportFromWorld: boolean;
      maxExportAmountPerTurnToWorld: string;
      maxImportAmountPerTurnFromWorld: string;
    }>,
  ) => {
    if (targetMode === 'country' && targetId) {
      setWorldTradePolicyDraftByResourceAndCountryId((prev) => ({
        ...prev,
        [resourceId]: {
          ...(prev[resourceId] ?? {}),
          [targetId]: {
            ...(prev[resourceId]?.[targetId] ?? createEmptyWorldTradePolicyDraft()),
            ...patch,
          },
        },
      }));
      return;
    }
    if (targetMode === 'market' && targetId) {
      setWorldTradePolicyDraftByResourceAndMarketId((prev) => ({
        ...prev,
        [resourceId]: {
          ...(prev[resourceId] ?? {}),
          [targetId]: {
            ...(prev[resourceId]?.[targetId] ?? createEmptyWorldTradePolicyDraft()),
            ...patch,
          },
        },
      }));
      return;
    }
    setWorldTradePolicyDraftByResourceId((prev) => ({
      ...prev,
      [resourceId]: {
        ...(prev[resourceId] ?? createEmptyWorldTradePolicyDraft()),
        ...patch,
      },
    }));
  };

  const saveWorldTradePolicyForResource = (
    resourceId: string,
    targetMode: 'all' | 'market' | 'country',
    targetId?: string,
  ) => {
    if (!memberMarket || !activeCountryId) return;
    const draft = getWorldTradePolicyDraft(resourceId, targetMode, targetId);
    const parseLimit = (raw: string) => {
      const parsed = Math.max(0, Math.floor(Number(raw)));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    };
    onUpdateOwnWorldTradePolicy(
      memberMarket.id,
      activeCountryId,
      resourceId,
      targetMode,
      targetId,
      {
        allowExportToWorld: draft.allowExportToWorld,
        allowImportFromWorld: draft.allowImportFromWorld,
        maxExportAmountPerTurnToWorld: parseLimit(draft.maxExportAmountPerTurnToWorld),
        maxImportAmountPerTurnFromWorld: parseLimit(draft.maxImportAmountPerTurnFromWorld),
      },
    );
  };

  const tradePolicyModalResource = resources.find(
    (resource) => resource.id === tradePolicyModalResourceId,
  );
  const selectedWorldTradePolicyResourceId = worldTradePolicyModalResourceId;
  const worldTradePolicyModalResource = resources.find(
    (resource) => resource.id === selectedWorldTradePolicyResourceId,
  );
  const selectedWorldTradePolicyResourceName =
    selectedWorldTradePolicyResourceId === ALL_RESOURCES_WORLD_TRADE_POLICY_KEY
      ? 'Все ресурсы'
      : worldTradePolicyModalResource?.name ?? 'Ресурс';
  const worldTradePolicyActiveDetails = useMemo(() => {
    if (!memberMarket || !selectedWorldTradePolicyResourceId) {
      return {
        base: {
          allowExportToWorld: true,
          allowImportFromWorld: true,
          maxExportAmountPerTurnToWorld: undefined as number | undefined,
          maxImportAmountPerTurnFromWorld: undefined as number | undefined,
        },
        marketOverrides: [] as Array<{
          id: string;
          name: string;
          allowExportToWorld: boolean;
          allowImportFromWorld: boolean;
          maxExportAmountPerTurnToWorld?: number;
          maxImportAmountPerTurnFromWorld?: number;
        }>,
        countryOverrides: [] as Array<{
          id: string;
          name: string;
          allowExportToWorld: boolean;
          allowImportFromWorld: boolean;
          maxExportAmountPerTurnToWorld?: number;
          maxImportAmountPerTurnFromWorld?: number;
        }>,
      };
    }
    const policy =
      memberMarket.worldTradePolicyByResourceId?.[selectedWorldTradePolicyResourceId];
    const base = {
      allowExportToWorld: policy?.allowExportToWorld !== false,
      allowImportFromWorld: policy?.allowImportFromWorld !== false,
      maxExportAmountPerTurnToWorld:
        policy?.maxExportAmountPerTurnToWorld != null
          ? Math.max(0, Number(policy.maxExportAmountPerTurnToWorld))
          : undefined,
      maxImportAmountPerTurnFromWorld:
        policy?.maxImportAmountPerTurnFromWorld != null
          ? Math.max(0, Number(policy.maxImportAmountPerTurnFromWorld))
          : undefined,
    };
    const marketOverrides = Object.entries(policy?.marketOverridesByMarketId ?? {})
      .map(([id, override]) => ({
        id,
        name: markets.find((market) => market.id === id)?.name ?? id,
        allowExportToWorld: override?.allowExportToWorld !== false,
        allowImportFromWorld: override?.allowImportFromWorld !== false,
        maxExportAmountPerTurnToWorld:
          override?.maxExportAmountPerTurnToWorld != null
            ? Math.max(0, Number(override.maxExportAmountPerTurnToWorld))
            : undefined,
        maxImportAmountPerTurnFromWorld:
          override?.maxImportAmountPerTurnFromWorld != null
            ? Math.max(0, Number(override.maxImportAmountPerTurnFromWorld))
            : undefined,
      }))
      .filter(
        (item) =>
          item.allowExportToWorld === false ||
          item.allowImportFromWorld === false ||
          item.maxExportAmountPerTurnToWorld != null ||
          item.maxImportAmountPerTurnFromWorld != null,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    const countryOverrides = Object.entries(policy?.countryOverridesByCountryId ?? {})
      .map(([id, override]) => ({
        id,
        name: countries.find((country) => country.id === id)?.name ?? id,
        allowExportToWorld: override?.allowExportToWorld !== false,
        allowImportFromWorld: override?.allowImportFromWorld !== false,
        maxExportAmountPerTurnToWorld:
          override?.maxExportAmountPerTurnToWorld != null
            ? Math.max(0, Number(override.maxExportAmountPerTurnToWorld))
            : undefined,
        maxImportAmountPerTurnFromWorld:
          override?.maxImportAmountPerTurnFromWorld != null
            ? Math.max(0, Number(override.maxImportAmountPerTurnFromWorld))
            : undefined,
      }))
      .filter(
        (item) =>
          item.allowExportToWorld === false ||
          item.allowImportFromWorld === false ||
          item.maxExportAmountPerTurnToWorld != null ||
          item.maxImportAmountPerTurnFromWorld != null,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    return { base, marketOverrides, countryOverrides };
  }, [memberMarket, selectedWorldTradePolicyResourceId, markets, countries]);

  const goodsStats = useMemo(() => {
    const memberSet = new Set(memberMarket?.memberCountryIds ?? []);
    const worldDeposits = new Map<string, number>();
    const worldMarketVolume = new Map<string, number>();
    const marketBuildingVolume = new Map<string, number>();
    const depositSupply = new Map<string, number>();
    const marketDemand = new Map<string, number>();
    const marketProductionMax = new Map<string, number>();
    const marketProductionFact = new Map<string, number>();
    const supplierCountries = new Map<string, Set<string>>();
    const warehouse = memberMarket?.warehouseByResourceId ?? {};
    const definitionById = new Map(buildings.map((building) => [building.id, building]));

    Object.values(provinces).forEach((province) => {
      const owner = province.ownerCountryId;
      Object.entries(province.resourceAmounts ?? {}).forEach(([resourceId, amount]) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        worldDeposits.set(resourceId, (worldDeposits.get(resourceId) ?? 0) + amount);
        if (!memberMarket || !owner || !memberSet.has(owner)) return;
        depositSupply.set(resourceId, (depositSupply.get(resourceId) ?? 0) + amount);
        const suppliers = supplierCountries.get(resourceId) ?? new Set<string>();
        suppliers.add(owner);
        supplierCountries.set(resourceId, suppliers);
      });
      if (!memberMarket || !owner || !memberSet.has(owner)) return;
      (province.buildingsBuilt ?? []).forEach((entry) => {
        Object.entries(entry.warehouseByResourceId ?? {}).forEach(([resourceId, amount]) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          marketBuildingVolume.set(
            resourceId,
            (marketBuildingVolume.get(resourceId) ?? 0) + amount,
          );
        });
        const inactiveByProductivity =
          Number.isFinite(entry.lastProductivity) &&
          Number(entry.lastProductivity) <= 0;
        if (inactiveByProductivity) {
          return;
        }
        const definition = definitionById.get(entry.buildingId);
        Object.entries(definition?.consumptionByResourceId ?? {}).forEach(
          ([resourceId, amount]) => {
            if (!Number.isFinite(amount) || amount <= 0) return;
            marketDemand.set(resourceId, (marketDemand.get(resourceId) ?? 0) + amount);
          },
        );
        Object.entries(definition?.extractionByResourceId ?? {}).forEach(
          ([resourceId, amount]) => {
            if (!Number.isFinite(amount) || amount <= 0) return;
            marketProductionMax.set(
              resourceId,
              (marketProductionMax.get(resourceId) ?? 0) + amount,
            );
          },
        );
        Object.entries(definition?.productionByResourceId ?? {}).forEach(
          ([resourceId, amount]) => {
            if (!Number.isFinite(amount) || amount <= 0) return;
            marketProductionMax.set(
              resourceId,
              (marketProductionMax.get(resourceId) ?? 0) + amount,
            );
          },
        );
        Object.entries(entry.lastExtractedByResourceId ?? {}).forEach(([resourceId, amount]) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          marketProductionFact.set(
            resourceId,
            (marketProductionFact.get(resourceId) ?? 0) + amount,
          );
        });
        Object.entries(entry.lastProducedByResourceId ?? {}).forEach(([resourceId, amount]) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          marketProductionFact.set(
            resourceId,
            (marketProductionFact.get(resourceId) ?? 0) + amount,
          );
        });
      });
    });

    Object.values(provinces).forEach((province) => {
      (province.buildingsBuilt ?? []).forEach((entry) => {
        Object.entries(entry.warehouseByResourceId ?? {}).forEach(([resourceId, amount]) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          worldMarketVolume.set(
            resourceId,
            (worldMarketVolume.get(resourceId) ?? 0) + amount,
          );
        });
      });
    });

    const rows = resources.map((resource, index) => {
      const deposits = depositSupply.get(resource.id) ?? 0;
      const worldDepositsAmount = worldDeposits.get(resource.id) ?? 0;
      const worldMarketAmount = worldMarketVolume.get(resource.id) ?? 0;
      const demand = marketDemand.get(resource.id) ?? 0;
      const supplyMax = marketProductionMax.get(resource.id) ?? 0;
      const supplyFact = marketProductionFact.get(resource.id) ?? 0;
      const totalMarketStock = Math.max(0, marketBuildingVolume.get(resource.id) ?? 0);
      const marketOffer = supplyFact + totalMarketStock;
      const marketPrice = Math.max(
        0.01,
        Number(
          memberMarket?.priceByResourceId?.[resource.id] ??
            resource.basePrice ??
            1,
        ) || 1,
      );
      const historyRaw = (memberMarket?.priceHistoryByResourceId?.[resource.id] ?? []).filter(
        (item) => Number.isFinite(item) && Number(item) > 0,
      ) as number[];
      const marketPriceHistory =
        historyRaw.length > 0
          ? [...historyRaw.slice(-10)]
          : [marketPrice];
      if (
        marketPriceHistory.length === 0 ||
        Math.abs(marketPriceHistory[marketPriceHistory.length - 1] - marketPrice) >
          PRICE_TREND_EPSILON
      ) {
        marketPriceHistory.push(marketPrice);
      }
      const normalizedPriceHistory = marketPriceHistory.slice(-10);
      const demandHistoryRaw = (
        memberMarket?.demandHistoryByResourceId?.[resource.id] ?? []
      ).filter((item) => Number.isFinite(item) && Number(item) >= 0) as number[];
      const marketDemandHistory =
        demandHistoryRaw.length > 0 ? [...demandHistoryRaw.slice(-10)] : [demand];
      if (
        marketDemandHistory.length === 0 ||
        Math.abs(marketDemandHistory[marketDemandHistory.length - 1] - demand) >
          PRICE_TREND_EPSILON
      ) {
        marketDemandHistory.push(demand);
      }
      const normalizedDemandHistory = marketDemandHistory.slice(-10);
      const offerHistoryRaw = (
        memberMarket?.offerHistoryByResourceId?.[resource.id] ?? []
      ).filter((item) => Number.isFinite(item) && Number(item) >= 0) as number[];
      const marketOfferHistory =
        offerHistoryRaw.length > 0 ? [...offerHistoryRaw.slice(-10)] : [marketOffer];
      if (
        marketOfferHistory.length === 0 ||
        Math.abs(marketOfferHistory[marketOfferHistory.length - 1] - marketOffer) >
          PRICE_TREND_EPSILON
      ) {
        marketOfferHistory.push(marketOffer);
      }
      const normalizedOfferHistory = marketOfferHistory.slice(-10);
      const productionFactHistoryRaw = (
        memberMarket?.productionFactHistoryByResourceId?.[resource.id] ?? []
      ).filter((item) => Number.isFinite(item) && Number(item) >= 0) as number[];
      const marketProductionFactHistory =
        productionFactHistoryRaw.length > 0
          ? [...productionFactHistoryRaw.slice(-10)]
          : [supplyFact];
      if (
        marketProductionFactHistory.length === 0 ||
        Math.abs(marketProductionFactHistory[marketProductionFactHistory.length - 1] - supplyFact) >
          PRICE_TREND_EPSILON
      ) {
        marketProductionFactHistory.push(supplyFact);
      }
      const normalizedProductionFactHistory = marketProductionFactHistory.slice(-10);
      const productionMaxHistoryRaw = (
        memberMarket?.productionMaxHistoryByResourceId?.[resource.id] ?? []
      ).filter((item) => Number.isFinite(item) && Number(item) >= 0) as number[];
      const marketProductionMaxHistory =
        productionMaxHistoryRaw.length > 0 ? [...productionMaxHistoryRaw.slice(-10)] : [supplyMax];
      if (
        marketProductionMaxHistory.length === 0 ||
        Math.abs(marketProductionMaxHistory[marketProductionMaxHistory.length - 1] - supplyMax) >
          PRICE_TREND_EPSILON
      ) {
        marketProductionMaxHistory.push(supplyMax);
      }
      const normalizedProductionMaxHistory = marketProductionMaxHistory.slice(-10);
      const previousPrice =
        normalizedPriceHistory.length > 1
          ? normalizedPriceHistory[normalizedPriceHistory.length - 2]
          : normalizedPriceHistory[normalizedPriceHistory.length - 1];
      const delta = marketPrice - previousPrice;
      const priceTrend =
        delta > PRICE_TREND_EPSILON
          ? 'up'
          : delta < -PRICE_TREND_EPSILON
            ? 'down'
            : 'flat';
      const marketShare = worldMarketAmount > 0 ? (totalMarketStock / worldMarketAmount) * 100 : 0;
      const depositShare =
        worldDepositsAmount > 0 ? (deposits / worldDepositsAmount) * 100 : 0;
      return {
        index: index + 1,
        resourceId: resource.id,
        resourceName: resource.name,
        resourceColor: resource.color,
        resourceIconDataUrl: resource.iconDataUrl,
        marketPrice,
        marketPriceHistory: normalizedPriceHistory,
        priceTrend,
        marketValue: totalMarketStock * marketPrice,
        depositValue: deposits * marketPrice,
        marketDemand: demand,
        marketProductionFact: supplyFact,
        marketProductionMax: supplyMax,
        marketProductionFactHistory: normalizedProductionFactHistory,
        marketProductionMaxHistory: normalizedProductionMaxHistory,
        marketOffer,
        marketDemandHistory: normalizedDemandHistory,
        marketOfferHistory: normalizedOfferHistory,
        marketSupply: totalMarketStock,
        depositSupply: deposits,
        worldMarketSupply: worldMarketAmount,
        worldDeposits: worldDepositsAmount,
        depositShare,
        marketShare,
      };
    });

    const maxWorldDeposits = Math.max(1, ...rows.map((row) => row.worldDeposits));
    const maxWorldMarketSupply = Math.max(1, ...rows.map((row) => row.worldMarketSupply));
    const normalizedRows = rows.map((row) => ({
      ...row,
      worldDepositsRelative: (row.worldDeposits / maxWorldDeposits) * 100,
      worldMarketSupplyRelative: (row.worldMarketSupply / maxWorldMarketSupply) * 100,
    }));

    const warehouseTotal = Object.values(warehouse).reduce(
      (acc, value) => acc + (Number.isFinite(value) ? Math.max(0, value) : 0),
      0,
    );

    return { rows: normalizedRows, warehouseTotal };
  }, [memberMarket, provinces, resources, buildings]);

  const worldGoodsStats = useMemo(() => {
    return resources.map((resource) => {
      const marketPrice = Math.max(
        0.01,
        Number(worldMarket.priceByResourceId?.[resource.id] ?? resource.basePrice ?? 1) || 1,
      );
      const marketPriceHistory = (
        worldMarket.priceHistoryByResourceId?.[resource.id] ?? [marketPrice]
      ).slice(-10);
      const demandHistory = (
        worldMarket.demandHistoryByResourceId?.[resource.id] ?? [0]
      ).slice(-10);
      const offerHistory = (
        worldMarket.offerHistoryByResourceId?.[resource.id] ?? [0]
      ).slice(-10);
      const productionFactHistory = (
        worldMarket.productionFactHistoryByResourceId?.[resource.id] ?? [0]
      ).slice(-10);
      const productionMaxHistory = (
        worldMarket.productionMaxHistoryByResourceId?.[resource.id] ?? [0]
      ).slice(-10);
      const marketDemand = demandHistory[demandHistory.length - 1] ?? 0;
      const marketOffer = offerHistory[offerHistory.length - 1] ?? 0;
      const marketProductionFact =
        productionFactHistory[productionFactHistory.length - 1] ?? 0;
      const marketProductionMax =
        productionMaxHistory[productionMaxHistory.length - 1] ?? 0;
      const previousPrice =
        marketPriceHistory.length > 1
          ? marketPriceHistory[marketPriceHistory.length - 2]
          : marketPriceHistory[marketPriceHistory.length - 1];
      const delta = marketPrice - previousPrice;
      const priceTrend =
        delta > PRICE_TREND_EPSILON ? 'up' : delta < -PRICE_TREND_EPSILON ? 'down' : 'flat';
      return {
        resourceId: resource.id,
        resourceName: resource.name,
        resourceColor: resource.color,
        resourceIconDataUrl: resource.iconDataUrl,
        marketPrice,
        marketPriceHistory,
        marketDemand,
        marketDemandHistory: demandHistory,
        marketOffer,
        marketOfferHistory: offerHistory,
        marketProductionFact,
        marketProductionFactHistory: productionFactHistory,
        marketProductionMax,
        marketProductionMaxHistory: productionMaxHistory,
        priceTrend,
      };
    });
  }, [resources, worldMarket]);

  const worldMarketSharedInfrastructureRows = useMemo(() => {
    if (!memberMarket)
      return [] as Array<{
        categoryId: string;
        name: string;
        amount: number;
        iconDataUrl?: string;
        color?: string;
      }>;
    const memberSet = new Set(memberMarket.memberCountryIds);
    const definitionById = new Map(buildings.map((building) => [building.id, building]));
    const amountByCategoryId = new Map<string, number>();

    Object.values(provinces).forEach((province) => {
      if (!province.ownerCountryId || !memberSet.has(province.ownerCountryId)) return;
      (province.buildingsBuilt ?? []).forEach((entry) => {
        const definition = definitionById.get(entry.buildingId);
        Object.entries(definition?.marketInfrastructureByCategory ?? {}).forEach(
          ([categoryId, amount]) => {
            if (!Number.isFinite(amount) || amount <= 0) return;
            amountByCategoryId.set(
              categoryId,
              Math.max(0, (amountByCategoryId.get(categoryId) ?? 0) + amount),
            );
          },
        );
      });
    });

    return resourceCategories
      .map((category) => ({
        categoryId: category.id,
        name: category.name,
        amount: Math.max(0, amountByCategoryId.get(category.id) ?? 0),
        iconDataUrl: category.iconDataUrl,
        color: category.color,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [memberMarket, provinces, buildings, resourceCategories]);

  const worldMarketSharedInfrastructureOverviewRows = useMemo(() => {
    const currentByCategory = new Map(
      worldMarketSharedInfrastructureRows.map((row) => [row.categoryId, row.amount]),
    );
    const consumedByCategory = new Map(
      resourceCategories.map((category) => [
        category.id,
        Math.max(
          0,
          memberMarket?.lastSharedInfrastructureConsumedByCategory?.[category.id] ?? 0,
        ),
      ]),
    );
    return resourceCategories.map((category) => ({
      categoryId: category.id,
      name: category.name,
      iconDataUrl: category.iconDataUrl,
      color: category.color,
      current: Math.max(0, currentByCategory.get(category.id) ?? 0),
      consumed: Math.max(0, consumedByCategory.get(category.id) ?? 0),
      remainingAfterLastTurn: Math.max(
        0,
        Math.max(0, currentByCategory.get(category.id) ?? 0) -
          Math.max(0, consumedByCategory.get(category.id) ?? 0),
      ),
    }));
  }, [resourceCategories, worldMarketSharedInfrastructureRows, memberMarket]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-4 rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-white/10 bg-black/40 flex items-center justify-center">
              <Globe2 className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <div className="text-white text-lg font-semibold">Рынки</div>
              <div className="text-white/60 text-sm">
                Управление только своим рынком
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/70 flex items-center justify-center hover:border-emerald-400/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex">
          <div className="w-[360px] border-r border-white/10 p-4 space-y-2">
            <button
              onClick={() => setTab('market')}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                tab === 'market'
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:border-emerald-400/30'
              }`}
            >
              Мой рынок
            </button>
            <button
              onClick={() => setTab('goods')}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                tab === 'goods'
                  ? 'bg-sky-500/15 border-sky-400/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:border-sky-400/30'
              }`}
            >
              Товары и торговля
            </button>
            <button
              onClick={() => setTab('world')}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                tab === 'world'
                  ? 'bg-indigo-500/15 border-indigo-400/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:border-indigo-400/30'
              }`}
            >
              Мировой рынок
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto legend-scroll p-6">
            {tab === 'market' ? (
              <div className="w-full space-y-4">
                {!activeCountryId ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/60 text-sm">
                    Выберите активную страну.
                  </div>
                ) : !memberMarket ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
                      <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.06] p-3">
                      <div className="text-white/90 text-sm font-semibold">Создание рынка</div>
                      <div className="text-white/55 text-xs mt-1">
                        Заполните базовые параметры. Лидером и создателем будет активная страна.
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                        <span
                          className={`px-2 py-1 rounded-md border ${
                            (newMarketName.trim() || `Рынок ${activeCountry?.name ?? ''}`).trim()
                              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                              : 'border-rose-400/30 bg-rose-500/10 text-rose-200'
                          }`}
                        >
                          Название {(newMarketName.trim() || `Рынок ${activeCountry?.name ?? ''}`).trim() ? 'готово' : 'не задано'}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-md border ${
                            capitalProvinceIdDraft
                              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                              : 'border-rose-400/30 bg-rose-500/10 text-rose-200'
                          }`}
                        >
                          Столица {capitalProvinceIdDraft ? 'выбрана' : 'не выбрана'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 text-white/70 text-sm">
                        Название
                        <input
                          type="text"
                          value={newMarketName}
                          onChange={(event) => setNewMarketName(event.target.value)}
                          className="h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-emerald-400/60"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-white/70 text-sm">
                        Столица рынка
                        <select
                          value={capitalProvinceIdDraft}
                          onChange={(event) => setCapitalProvinceIdDraft(event.target.value)}
                          className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60"
                        >
                          <option value="" className="bg-[#0b111b] text-white">
                            Выберите провинцию
                          </option>
                          {ownCountryProvinceIds.map((provinceId) => (
                            <option
                              key={`market-capital-new:${provinceId}`}
                              value={provinceId}
                              className="bg-[#0b111b] text-white"
                            >
                              {provinceId}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3">
                      <label className="flex flex-col gap-1 text-white/70 text-sm">
                        Цвет рынка
                        <input
                          type="color"
                          value={marketColorDraft}
                          onChange={(event) => setMarketColorDraft(event.target.value)}
                          className="h-12 w-24 rounded-lg bg-black/40 border border-white/10 p-1 cursor-pointer"
                        />
                      </label>
                      <div className="flex flex-col gap-1 text-white/70 text-sm">
                        <span>Логотип рынка</span>
                        <div className="rounded-lg border border-white/10 bg-black/30 p-2 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center">
                            {marketLogoDraft ? (
                              <img src={marketLogoDraft} alt="Логотип рынка" className="w-full h-full object-cover" />
                            ) : (
                              <Globe2 className="w-5 h-5 text-white/40" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="h-8 px-3 rounded-lg border border-white/15 bg-black/40 text-white/80 text-xs inline-flex items-center cursor-pointer hover:border-emerald-400/40 hover:text-emerald-200 transition-colors">
                              {marketLogoDraft ? 'Заменить' : 'Выбрать'}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                                className="hidden"
                              />
                            </label>
                            {marketLogoDraft && (
                              <button
                                type="button"
                                onClick={() => setMarketLogoDraft(undefined)}
                                className="h-8 px-3 rounded-lg border border-rose-400/35 bg-rose-500/10 text-rose-200 text-xs inline-flex items-center hover:bg-rose-500/20 transition-colors"
                              >
                                Удалить
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-white/45">
                          PNG/JPG/WebP. Лучше использовать квадратное изображение.
                        </div>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-white/75 text-sm">
                      <input
                        type="checkbox"
                        checked={allowInfrastructureAccessWithoutTreatiesDraft}
                        onChange={(event) =>
                          setAllowInfrastructureAccessWithoutTreatiesDraft(
                            event.target.checked,
                          )
                        }
                        className="h-4 w-4 rounded border-white/20 bg-black/40 accent-emerald-500"
                      />
                      Общая инфраструктура рынка без договоров
                    </label>
                    <div className="text-[11px] text-white/50 leading-relaxed">
                      Если включено, маршруты всех стран-участников рынка считаются общей
                      инфраструктурой для доступа к столице рынка по категориям. Сами маршруты
                      остаются независимыми и не объединяются в один маршрут.
                    </div>
                    {ownCountryProvinceIds.length === 0 && (
                      <div className="text-rose-200/90 text-xs">
                        У страны нет провинций для столицы рынка.
                      </div>
                    )}
                    <button
                      onClick={() =>
                        onCreateMarket({
                          actorCountryId: activeCountryId,
                          name: newMarketName.trim() || `Рынок ${activeCountry?.name ?? ''}`,
                          leaderCountryId: activeCountryId,
                          memberCountryIds: [activeCountryId],
                          color: marketColorDraft,
                          logoDataUrl: marketLogoDraft,
                          capitalProvinceId: capitalProvinceIdDraft || undefined,
                          allowInfrastructureAccessWithoutTreaties:
                            allowInfrastructureAccessWithoutTreatiesDraft,
                        })
                      }
                      disabled={!canCreateMarket}
                      className={`h-9 px-3 rounded-lg border text-sm inline-flex items-center gap-2 ${
                        canCreateMarket
                          ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                          : 'border-white/10 bg-black/30 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Создать рынок
                    </button>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2 h-fit">
                      <div className="text-white/85 text-sm font-semibold">
                        Попроситься в существующий рынок
                      </div>
                      <div className="text-white/55 text-xs">
                        Запрос отправится лидеру рынка как дипломатическое предложение.
                      </div>
                      <div className="space-y-2">
                        {joinableMarkets.length > 0 ? (
                          joinableMarkets.map((market) => {
                            const leader = countries.find(
                              (country) => country.id === market.leaderCountryId,
                            );
                            const pending = pendingJoinRequestMarketLeaderIds.has(
                              market.leaderCountryId,
                            );
                            return (
                              <div
                                key={`join-market:${market.id}`}
                                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 flex items-center justify-between gap-3"
                              >
                                <div className="flex flex-col">
                                  <span className="text-white/85 text-sm">{market.name}</span>
                                  <span className="text-white/55 text-[11px]">
                                    Лидер: {leader?.name ?? market.leaderCountryId} ·
                                    участников: {market.memberCountryIds.length}
                                  </span>
                                </div>
                                <button
                                  onClick={() => onRequestJoinMarket(market.id)}
                                  disabled={pending}
                                  className={`h-7 px-2 rounded-md border text-xs inline-flex items-center gap-1 ${
                                    pending
                                      ? 'border-white/10 bg-black/30 text-white/35 cursor-not-allowed'
                                      : 'border-emerald-400/35 bg-emerald-600 text-white'
                                  }`}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  {pending ? 'Запрос отправлен' : 'Попроситься'}
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-white/50 text-sm">Нет рынков для запроса вступления.</div>
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                ) : !ownMarket ? (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 space-y-3">
                    <div className="text-white/85 text-sm font-semibold">Участие в рынке</div>
                    <div className="text-white/70 text-sm">
                      Страна состоит в рынке: <span className="text-amber-200">{memberMarket.name}</span>
                    </div>
                    <div className="text-white/65 text-xs">
                      Общая инфраструктура без договоров:{' '}
                      <span
                        className={
                          memberMarket.allowInfrastructureAccessWithoutTreaties
                            ? 'text-emerald-200'
                            : 'text-white/75'
                        }
                      >
                        {memberMarket.allowInfrastructureAccessWithoutTreaties
                          ? 'включена'
                          : 'выключена'}
                      </span>
                    </div>
                    <div className="text-white/55 text-xs">
                      Пока страна состоит в рынке, создать свой рынок нельзя.
                    </div>
                    <button
                      onClick={() => onLeaveMarket(activeCountryId, memberMarket.id)}
                      className="h-9 px-3 rounded-lg border border-rose-400/35 bg-rose-500/10 text-rose-200 text-sm inline-flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Выйти из рынка
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-4 items-start">
                      <div className="space-y-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                      <div className="text-white/85 text-sm font-semibold">Параметры рынка</div>
                      {!canEditOwnMarket && (
                        <div className="text-amber-200/90 text-xs">
                          Параметры может менять только создатель рынка.
                        </div>
                      )}
                      <label className="flex flex-col gap-1 text-white/70 text-sm">
                        Название
                        <input
                          type="text"
                          value={marketNameDraft}
                          onChange={(event) => setMarketNameDraft(event.target.value)}
                          disabled={!canEditOwnMarket}
                          className="h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-emerald-400/60 disabled:opacity-60"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-white/70 text-sm">
                        Столица рынка
                        <select
                          value={capitalProvinceIdDraft}
                          onChange={(event) => setCapitalProvinceIdDraft(event.target.value)}
                          disabled={!canEditOwnMarket}
                          className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60 disabled:opacity-60"
                        >
                          <option value="" className="bg-[#0b111b] text-white">
                            Выберите провинцию
                          </option>
                          {ownCountryProvinceIds.map((provinceId) => (
                            <option
                              key={`market-capital-edit:${provinceId}`}
                              value={provinceId}
                              className="bg-[#0b111b] text-white"
                            >
                              {provinceId}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-white/70 text-sm">
                        Цвет рынка
                        <input
                          type="color"
                          value={marketColorDraft}
                          onChange={(event) => setMarketColorDraft(event.target.value)}
                          disabled={!canEditOwnMarket}
                          className="h-12 w-24 rounded-lg bg-black/40 border border-white/10 p-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </label>
                      <div className="flex flex-col gap-1 text-white/70 text-sm">
                        <span>Логотип рынка</span>
                        <div className="rounded-lg border border-white/10 bg-black/30 p-2 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center">
                            {marketLogoDraft ? (
                              <img src={marketLogoDraft} alt="Логотип рынка" className="w-full h-full object-cover" />
                            ) : (
                              <Globe2 className="w-5 h-5 text-white/40" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <label
                              className={`h-8 px-3 rounded-lg border text-xs inline-flex items-center transition-colors ${
                                canEditOwnMarket
                                  ? 'border-white/15 bg-black/40 text-white/80 cursor-pointer hover:border-emerald-400/40 hover:text-emerald-200'
                                  : 'border-white/10 bg-black/20 text-white/40 cursor-not-allowed'
                              }`}
                            >
                              {marketLogoDraft ? 'Заменить' : 'Выбрать'}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={!canEditOwnMarket}
                                onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                                className="hidden"
                              />
                            </label>
                            {marketLogoDraft && (
                              <button
                                type="button"
                                onClick={() => setMarketLogoDraft(undefined)}
                                disabled={!canEditOwnMarket}
                                className={`h-8 px-3 rounded-lg border text-xs inline-flex items-center transition-colors ${
                                  canEditOwnMarket
                                    ? 'border-rose-400/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                                    : 'border-white/10 bg-black/20 text-white/40 cursor-not-allowed'
                                }`}
                              >
                                Удалить
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-white/45">
                          PNG/JPG/WebP. Лучше использовать квадратное изображение.
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-white/75 text-sm">
                        <input
                          type="checkbox"
                          checked={allowInfrastructureAccessWithoutTreatiesDraft}
                          onChange={(event) =>
                            setAllowInfrastructureAccessWithoutTreatiesDraft(
                              event.target.checked,
                            )
                          }
                          disabled={!canEditOwnMarket}
                          className="h-4 w-4 rounded border-white/20 bg-black/40 accent-emerald-500 disabled:opacity-50"
                        />
                        Общая инфраструктура рынка без договоров
                      </label>
                      <div className="text-[11px] text-white/50 leading-relaxed">
                        Если включено, маршруты всех стран-участников рынка считаются общей
                        инфраструктурой для доступа к столице рынка по категориям. Сами маршруты
                        остаются независимыми и не объединяются в один маршрут.
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            onUpdateMarket(ownMarket.id, {
                              actorCountryId: activeCountryId,
                              name: marketNameDraft.trim() || ownMarket.name,
                              color: marketColorDraft,
                              logoDataUrl: marketLogoDraft,
                              capitalProvinceId: capitalProvinceIdDraft || undefined,
                              allowInfrastructureAccessWithoutTreaties:
                                allowInfrastructureAccessWithoutTreatiesDraft,
                            })
                          }
                          disabled={!canEditOwnMarket || !capitalProvinceIdDraft}
                          className={`h-9 px-3 rounded-lg border text-sm inline-flex items-center gap-2 ${
                            canEditOwnMarket && Boolean(capitalProvinceIdDraft)
                              ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                              : 'border-white/10 bg-black/30 text-white/40 cursor-not-allowed'
                          }`}
                        >
                          <Save className="w-4 h-4" />
                          Сохранить
                        </button>
                        <button
                          onClick={() => onDeleteMarket(ownMarket.id, activeCountryId)}
                          disabled={!canEditOwnMarket}
                          className={`h-9 px-3 rounded-lg border text-sm inline-flex items-center gap-2 ${
                            canEditOwnMarket
                              ? 'border-red-400/35 bg-red-500/10 text-red-200'
                              : 'border-white/10 bg-black/30 text-white/40 cursor-not-allowed'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                          Удалить рынок
                        </button>
                      </div>
                    </div>

                      </div>

                      <div className="space-y-3 w-full">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 w-full">
                      <div className="text-white/85 text-sm font-semibold mb-2">Участники рынка</div>
                      <div className="mb-2 text-[11px] text-white/60">
                        Общая инфраструктура без договоров:{' '}
                        <span
                          className={
                            ownMarket.allowInfrastructureAccessWithoutTreaties
                              ? 'text-emerald-200'
                              : 'text-white/75'
                          }
                        >
                          {ownMarket.allowInfrastructureAccessWithoutTreaties
                            ? 'включена'
                            : 'выключена'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {ownMarket.memberCountryIds.map((memberId) => {
                          const country = countries.find((item) => item.id === memberId);
                          const canRemove = memberId !== ownMarket.leaderCountryId;
                          return (
                            <div
                              key={`member:${memberId}`}
                              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 flex items-center justify-between gap-3"
                            >
                              <div className="inline-flex items-center gap-2 text-white/75 text-sm">
                                {country?.flagDataUrl ? (
                                  <img
                                    src={country.flagDataUrl}
                                    alt={`${country.name} flag`}
                                    className="w-5 h-3.5 rounded-sm border border-white/20 object-cover"
                                  />
                                ) : null}
                                {country?.name ?? memberId}
                              </div>
                              {canRemove ? (
                                <button
                                  onClick={() =>
                                    onUpdateMarket(ownMarket.id, {
                                      actorCountryId: activeCountryId,
                                      memberCountryIds: ownMarket.memberCountryIds.filter(
                                        (id) => id !== memberId,
                                      ),
                                    })
                                  }
                                  disabled={!canEditOwnMarket}
                                  className="h-7 px-2 rounded-md border border-red-400/30 bg-red-500/10 text-red-200 text-xs disabled:opacity-50"
                                >
                                  Убрать
                                </button>
                              ) : (
                                <span className="text-[11px] text-emerald-200/80">Центр рынка</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 w-full">
                      <div className="text-white/85 text-sm font-semibold mb-2">
                        Приглашение стран договором
                      </div>
                      <div className="text-white/55 text-xs mb-3">
                        Новые страны добавляются только через дипломатическое предложение.
                      </div>
                      <div className="space-y-2">
                        {inviteCandidates.length > 0 ? (
                          inviteCandidates.map((country) => {
                            const pending = pendingInviteCountryIds.has(country.id);
                            return (
                              <div
                                key={`invite:${country.id}`}
                                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 flex items-center justify-between gap-3"
                              >
                                <div className="inline-flex items-center gap-2 text-white/75 text-sm">
                                  {country.flagDataUrl ? (
                                    <img
                                      src={country.flagDataUrl}
                                      alt={`${country.name} flag`}
                                      className="w-5 h-3.5 rounded-sm border border-white/20 object-cover"
                                    />
                                  ) : null}
                                  {country.name}
                                </div>
                                <button
                                  onClick={() => onInviteByTreaty(country.id)}
                                  disabled={pending || !canEditOwnMarket}
                                  className={`h-7 px-2 rounded-md border text-xs inline-flex items-center gap-1 ${
                                    pending || !canEditOwnMarket
                                      ? 'border-white/10 bg-black/30 text-white/35 cursor-not-allowed'
                                      : 'border-sky-400/35 bg-sky-500/15 text-sky-200'
                                  }`}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  {pending ? 'Уже отправлено' : 'Пригласить'}
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-white/50 text-sm">Нет доступных стран для приглашения.</div>
                        )}
                      </div>
                    </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : tab === 'goods' ? (
              <div className="w-full space-y-4">
                {!memberMarket ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/60 text-sm">
                    Страна не состоит в рынке.
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <Tooltip
                        label="Биржа товаров"
                        description="Карточки ресурсов с ключевыми метриками рынка."
                        side="bottom"
                      >
                        <div className="text-white/85 text-sm font-semibold mb-2 inline-flex items-center gap-2">
                          <span>Биржа товаров</span>
                        </div>
                      </Tooltip>
                      <div className="space-y-2">
                        {goodsStats.rows.map((row) => (
                          <div
                            key={`exchange:${row.resourceId}`}
                            className="w-full rounded-xl border border-white/10 bg-black/30 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="inline-flex items-center gap-2 text-white/90">
                                {row.resourceIconDataUrl ? (
                                  <img
                                    src={row.resourceIconDataUrl}
                                    alt={row.resourceName}
                                    className="w-4 h-4 rounded-sm border border-white/15 object-cover"
                                  />
                                ) : (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: row.resourceColor }}
                                  />
                                )}
                                <span className="text-sm">{row.resourceName}</span>
                              </div>
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <MiniGraphCard
                                  title="Цена за ед."
                                  value={formatCompactNumber(row.marketPrice, 1)}
                                  valueClassName="text-yellow-200"
                                  borderClassName="border-yellow-400/35"
                                  bgClassName="bg-yellow-500/10"
                                  values={row.marketPriceHistory}
                                  stroke={
                                    row.priceTrend === 'up'
                                      ? '#34d399'
                                      : row.priceTrend === 'down'
                                        ? '#fb7185'
                                        : '#fde047'
                                  }
                                  ariaLabel="График цены за единицу за 10 ходов"
                                  tooltip="Цена одной единицы ресурса в вашем рынке за последние 10 ходов."
                                />
                                <MiniGraphCard
                                  title="Цена рынка"
                                  value={formatCompactNumber(row.marketValue, 1)}
                                  valueClassName="text-amber-200"
                                  borderClassName="border-amber-400/35"
                                  bgClassName="bg-amber-500/10"
                                  values={row.marketPriceHistory.map((price) => row.marketSupply * price)}
                                  stroke="#f59e0b"
                                  ariaLabel="График цены рынка за 10 ходов"
                                  tooltip="Оценка запасов ресурса в вашем рынке: объем в хранилищах × цена за единицу."
                                />
                                <MiniGraphCard
                                  title="Стоимость мест."
                                  value={formatCompactNumber(row.depositValue, 1)}
                                  valueClassName="text-fuchsia-200"
                                  borderClassName="border-fuchsia-400/35"
                                  bgClassName="bg-fuchsia-500/10"
                                  values={row.marketPriceHistory.map((price) => row.depositSupply * price)}
                                  stroke="#e879f9"
                                  ariaLabel="График стоимости месторождений за 10 ходов"
                                  tooltip="Оценка ваших месторождений по текущей цене ресурса за последние 10 ходов."
                                />
                                <MiniGraphCard
                                  title="Спрос"
                                  value={formatCompactNumber(row.marketDemand, 0)}
                                  valueClassName="text-rose-200"
                                  borderClassName="border-rose-400/35"
                                  bgClassName="bg-rose-500/10"
                                  values={row.marketDemandHistory}
                                  stroke="#fb7185"
                                  ariaLabel="График спроса за 10 ходов"
                                  tooltip="Сколько ресурса в сумме потребляют здания рынка за ход."
                                />
                                <MiniGraphCard
                                  title="Предложение"
                                  value={formatCompactNumber(row.marketOffer, 0)}
                                  valueClassName="text-teal-200"
                                  borderClassName="border-teal-400/35"
                                  bgClassName="bg-teal-500/10"
                                  values={row.marketOfferHistory}
                                  stroke="#2dd4bf"
                                  ariaLabel="График предложения за 10 ходов"
                                  tooltip="Доступный объем ресурса: фактическое производство + складские запасы."
                                />
                                <MiniGraphCard
                                  title="Произв. факт"
                                  value={formatCompactNumber(row.marketProductionFact, 0)}
                                  valueClassName="text-emerald-200"
                                  borderClassName="border-emerald-400/35"
                                  bgClassName="bg-emerald-500/10"
                                  values={row.marketProductionFactHistory}
                                  stroke="#34d399"
                                  ariaLabel="График фактического производства за 10 ходов"
                                  tooltip="Реально произведенный объем ресурса (добыча + производство) за ход."
                                />
                                <MiniGraphCard
                                  title="Произв. макс"
                                  value={formatCompactNumber(row.marketProductionMax, 0)}
                                  valueClassName="text-cyan-200"
                                  borderClassName="border-cyan-400/35"
                                  bgClassName="bg-cyan-500/10"
                                  values={row.marketProductionMaxHistory}
                                  stroke="#22d3ee"
                                  ariaLabel="График максимального производства за 10 ходов"
                                  tooltip="Теоретический максимум производства при 100% эффективности зданий."
                                />
                                <ShareDonut
                                  label="Доля месторождений"
                                  value={row.depositShare}
                                  pathColor="rgba(232, 121, 249, 0.95)"
                                  amount={row.depositSupply}
                                  amountLabel="Ваши"
                                  secondaryAmountLabel="В мире"
                                  secondaryAmount={row.worldDeposits}
                                  description="Доля ваших месторождений этого ресурса от мировых запасов."
                                />
                                <ShareDonut
                                  label="Доля объема рынка"
                                  value={row.marketShare}
                                  pathColor="rgba(125, 211, 252, 0.95)"
                                  amount={row.marketSupply}
                                  amountLabel="Ваш"
                                  secondaryAmountLabel="В мире"
                                  secondaryAmount={row.worldMarketSupply}
                                  description="Доля запасов вашего рынка от суммарного мирового объема на складах."
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-white/85 text-sm font-semibold mb-1">Мировой рынок</div>
                  <div className="text-white/60 text-xs">
                    Включает все рынки автоматически. Выход невозможен, лидера нет.
                  </div>
                  <div className="text-white/55 text-xs mt-2">
                    Порядок закупки: страна → рынок → мировой рынок.
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-white/85 text-sm font-semibold mb-2">
                    Общая инфраструктура вашего рынка
                  </div>
                  <div className="text-white/55 text-xs mb-3">
                    Этот пул используется для мировых закупок вместе с инфраструктурой
                    провинции.
                  </div>
                  {memberMarket ? (
                    <div className="space-y-3">
                      <div className="text-[11px] text-white/60">
                        Суммарно потреблено общей инфраструктуры за прошлый ход (все страны рынка):{' '}
                        <span className="text-amber-200 tabular-nums">
                          {formatInfrastructureAmount(
                            worldMarketSharedInfrastructureOverviewRows.reduce(
                              (sum, row) => sum + row.consumed,
                              0,
                            ),
                          )}
                        </span>
                      </div>
                      <div className="grid grid-cols-[minmax(180px,1fr)_120px_160px_120px] gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[11px] text-white/65">
                        <span className="uppercase tracking-wide text-white/45">Категория</span>
                        <div className="justify-self-center">
                          <Tooltip
                            label="Доступно"
                            description="Базовый объем общей инфраструктуры категории на текущий ход до списаний."
                            side="bottom"
                          >
                            <span className="inline-flex justify-center uppercase tracking-wide hover:text-white/85 cursor-help">
                              Доступно
                            </span>
                          </Tooltip>
                        </div>
                        <div className="justify-self-center">
                          <Tooltip
                            label="Использовано за ход"
                            description="Сколько общей инфраструктуры этой категории было потрачено за прошлый ход."
                            side="bottom"
                          >
                            <span className="inline-flex justify-center uppercase tracking-wide hover:text-white/85 cursor-help">
                              Использовано за ход
                            </span>
                          </Tooltip>
                        </div>
                        <div className="justify-self-center">
                          <Tooltip
                            label="Остаток"
                            description="Расчетный остаток после списаний прошлого хода: доступно минус использовано."
                            side="bottom"
                          >
                            <span className="inline-flex justify-center uppercase tracking-wide hover:text-white/85 cursor-help">
                              Остаток
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {worldMarketSharedInfrastructureOverviewRows.map((row) => {
                          const hasAccess = row.current > 0;
                          return (
                            <div
                              key={`world-market-shared-infra-overview:${row.categoryId}`}
                              className="grid grid-cols-[minmax(180px,1fr)_120px_160px_120px] items-center gap-2 rounded-md border border-white/10 bg-black/25 px-2 py-1.5"
                            >
                              <span className="inline-flex items-center gap-2 text-white/70">
                                {row.iconDataUrl ? (
                                  <img
                                    src={row.iconDataUrl}
                                    alt={row.name}
                                    className="w-4 h-4 rounded-sm border border-white/15 object-cover"
                                  />
                                ) : (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-white/20"
                                    style={{ backgroundColor: row.color ?? '#64748b' }}
                                  />
                                )}
                                {row.name}
                              </span>
                              <span
                                className={`justify-self-center inline-flex items-center px-2 py-0.5 rounded-md border tabular-nums ${
                                  hasAccess
                                    ? 'text-emerald-200 border-emerald-400/30 bg-emerald-500/10'
                                    : 'text-rose-200 border-rose-400/30 bg-rose-500/10'
                                }`}
                              >
                                {formatInfrastructureAmount(row.current)}
                              </span>
                              <span className="justify-self-center inline-flex items-center px-2 py-0.5 rounded-md border border-amber-400/30 bg-amber-500/10 text-amber-200 tabular-nums">
                                {formatInfrastructureAmount(row.consumed)}
                              </span>
                              <span className="justify-self-center inline-flex items-center px-2 py-0.5 rounded-md border border-sky-400/30 bg-sky-500/10 text-sky-200 tabular-nums">
                                {formatInfrastructureAmount(row.remainingAfterLastTurn)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-white/50 text-sm">
                      Страна не состоит в рынке.
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-white/85 text-sm font-semibold mb-2">Мировая биржа</div>
                  <div className="space-y-2">
                    {worldGoodsStats.map((row) => (
                      <div
                        key={`world-exchange:${row.resourceId}`}
                        className="w-full rounded-xl border border-white/10 bg-black/30 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="inline-flex items-center gap-2 text-white/90">
                              {row.resourceIconDataUrl ? (
                                <img
                                  src={row.resourceIconDataUrl}
                                  alt={row.resourceName}
                                  className="w-4 h-4 rounded-sm border border-white/15 object-cover"
                                />
                              ) : (
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: row.resourceColor }}
                                />
                              )}
                              <span className="text-sm">{row.resourceName}</span>
                              {memberMarket && activeCountryId && (
                                <Tooltip
                                  label="Ограничения импорта/экспорта"
                                  description="Открыть полноэкранные настройки ограничений мировой торговли для этого ресурса, включая общие правила, правила по рынкам и по странам."
                                  side="bottom"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setWorldTradePolicyModalResourceId(row.resourceId);
                                      setWorldTradePolicyTargetMode('all');
                                      setWorldTradePolicyTargetId('');
                                    }}
                                    className="h-7 w-7 rounded-md border border-white/15 bg-black/35 text-cyan-200 inline-flex items-center justify-center hover:text-white hover:border-cyan-300/45 hover:bg-cyan-500/15 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.2)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                    aria-label={`Ограничения импорта/экспорта для ${row.resourceName}`}
                                  >
                                    <SlidersHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                </Tooltip>
                              )}
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <MiniGraphCard
                              title="Цена за ед."
                              value={formatCompactNumber(row.marketPrice, 1)}
                              valueClassName="text-yellow-200"
                              borderClassName="border-yellow-400/35"
                              bgClassName="bg-yellow-500/10"
                              values={row.marketPriceHistory}
                              stroke={
                                row.priceTrend === 'up'
                                  ? '#34d399'
                                  : row.priceTrend === 'down'
                                    ? '#fb7185'
                                    : '#fde047'
                              }
                              ariaLabel="График мировой цены за 10 ходов"
                              tooltip="Цена одной единицы ресурса на мировом рынке."
                            />
                            <MiniGraphCard
                              title="Спрос"
                              value={formatCompactNumber(row.marketDemand, 0)}
                              valueClassName="text-rose-200"
                              borderClassName="border-rose-400/35"
                              bgClassName="bg-rose-500/10"
                              values={row.marketDemandHistory}
                              stroke="#fb7185"
                              ariaLabel="График мирового спроса за 10 ходов"
                              tooltip="Суммарный спрос по всем странам."
                            />
                            <MiniGraphCard
                              title="Предложение"
                              value={formatCompactNumber(row.marketOffer, 0)}
                              valueClassName="text-teal-200"
                              borderClassName="border-teal-400/35"
                              bgClassName="bg-teal-500/10"
                              values={row.marketOfferHistory}
                              stroke="#2dd4bf"
                              ariaLabel="График мирового предложения за 10 ходов"
                              tooltip="Суммарное предложение: факт производства + складские остатки."
                            />
                            <MiniGraphCard
                              title="Произв. факт"
                              value={formatCompactNumber(row.marketProductionFact, 0)}
                              valueClassName="text-emerald-200"
                              borderClassName="border-emerald-400/35"
                              bgClassName="bg-emerald-500/10"
                              values={row.marketProductionFactHistory}
                              stroke="#34d399"
                              ariaLabel="График мирового фактического производства за 10 ходов"
                              tooltip="Фактическое производство по миру за ход."
                            />
                            <MiniGraphCard
                              title="Произв. макс"
                              value={formatCompactNumber(row.marketProductionMax, 0)}
                              valueClassName="text-cyan-200"
                              borderClassName="border-cyan-400/35"
                              bgClassName="bg-cyan-500/10"
                              values={row.marketProductionMaxHistory}
                              stroke="#22d3ee"
                              ariaLabel="График мирового максимального производства за 10 ходов"
                              tooltip="Теоретический максимум производства по миру."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {memberMarket && activeCountryId && selectedWorldTradePolicyResourceId && (
          <div className="fixed inset-0 z-[94] bg-black/75 backdrop-blur-sm">
            <div className="absolute inset-3 rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="text-white text-base font-semibold">
                  Ограничения мирового рынка: {selectedWorldTradePolicyResourceName}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWorldTradePolicyModalResourceId(undefined);
                    setWorldTradePolicyTargetMode('all');
                    setWorldTradePolicyTargetId('');
                  }}
                  className="h-8 w-8 rounded-md border border-white/10 bg-black/30 text-white/70 inline-flex items-center justify-center hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="min-h-0 overflow-y-auto legend-scroll rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                {!canEditOwnMarket && (
                  <div className="text-[11px] text-amber-200/80 rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-1.5">
                    Режим просмотра: менять настройки может только создатель рынка.
                  </div>
                )}
                <label className="flex flex-col gap-1 text-white/70 text-sm">
                  <Tooltip
                    label="Ресурс"
                    description='Режим "Все ресурсы" задает общее правило по умолчанию. Если у конкретного ресурса есть собственная настройка, она имеет более высокий приоритет.'
                    side="bottom"
                  >
                    <span className="inline-flex">Ресурс</span>
                  </Tooltip>
                  <div className="relative">
                    <select
                      value={selectedWorldTradePolicyResourceId}
                      onChange={(event) => {
                        setWorldTradePolicyModalResourceId(event.target.value);
                        setWorldTradePolicyTargetMode('all');
                        setWorldTradePolicyTargetId('');
                      }}
                      className="h-10 w-full rounded-lg bg-[#0b111b] border border-white/10 px-3 pr-8 text-white text-sm focus:outline-none focus:border-emerald-400/60 appearance-none"
                    >
                          <option
                            value={ALL_RESOURCES_WORLD_TRADE_POLICY_KEY}
                            className="bg-[#0b111b] text-white"
                          >
                            Все ресурсы
                          </option>
                          {resources.map((resource) => (
                        <option
                          key={`world-policy-resource-select:${resource.id}`}
                          value={resource.id}
                          className="bg-[#0b111b] text-white"
                        >
                          {resource.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-white/45 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-white/70 text-sm">
                  Тип ограничения
                  <div className="relative">
                    <select
                      value={worldTradePolicyTargetMode}
                      onChange={(event) =>
                        setWorldTradePolicyTargetMode(
                          event.target.value as 'all' | 'market' | 'country',
                        )
                      }
                      disabled={!canEditOwnMarket}
                      className="h-9 w-full rounded-lg bg-[#0b111b] border border-white/10 px-3 pr-8 text-white text-sm focus:outline-none focus:border-emerald-400/60 appearance-none disabled:opacity-70"
                    >
                      <option value="all" className="bg-[#0b111b] text-white">
                        Для всех внешних рынков и стран
                      </option>
                      <option value="market" className="bg-[#0b111b] text-white">
                        Для конкретного рынка
                      </option>
                      <option value="country" className="bg-[#0b111b] text-white">
                        Для конкретной страны
                      </option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-white/45 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                  </div>
                </label>
                {worldTradePolicyTargetMode === 'market' && (
                  <label className="flex flex-col gap-1 text-white/70 text-sm">
                    Рынок-партнер
                    <div className="relative">
                      <select
                        value={worldTradePolicyTargetId}
                        onChange={(event) => setWorldTradePolicyTargetId(event.target.value)}
                        disabled={!canEditOwnMarket || worldPolicyMarketTargets.length === 0}
                        className="h-9 w-full rounded-lg bg-[#0b111b] border border-white/10 px-3 pr-8 text-white text-sm focus:outline-none focus:border-emerald-400/60 appearance-none disabled:opacity-70"
                      >
                        {worldPolicyMarketTargets.length === 0 ? (
                          <option value="" className="bg-[#0b111b] text-white">
                            Нет внешних рынков
                          </option>
                        ) : (
                          worldPolicyMarketTargets.map((market) => (
                            <option
                              key={`world-policy-market:${market.id}`}
                              value={market.id}
                              className="bg-[#0b111b] text-white"
                            >
                              {market.name}
                            </option>
                          ))
                        )}
                      </select>
                        <ChevronDown className="w-4 h-4 text-white/45 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                      </div>
                      {selectedWorldPolicyMarket && (
                        <div className="inline-flex items-center gap-2 text-xs text-white/70 mt-1">
                          {selectedWorldPolicyMarket.logoDataUrl ? (
                            <img
                              src={selectedWorldPolicyMarket.logoDataUrl}
                              alt={selectedWorldPolicyMarket.name}
                              className="w-4 h-4 rounded-sm border border-white/15 object-cover"
                            />
                          ) : (
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-white/20"
                              style={{ backgroundColor: selectedWorldPolicyMarket.color ?? '#64748b' }}
                            />
                          )}
                          {selectedWorldPolicyMarket.name}
                        </div>
                      )}
                  </label>
                )}
                {worldTradePolicyTargetMode === 'country' && (
                  <label className="flex flex-col gap-1 text-white/70 text-sm">
                    Страна-партнер
                    <div className="relative">
                      <select
                        value={worldTradePolicyTargetId}
                        onChange={(event) => setWorldTradePolicyTargetId(event.target.value)}
                        disabled={!canEditOwnMarket || worldPolicyCountryTargets.length === 0}
                        className="h-9 w-full rounded-lg bg-[#0b111b] border border-white/10 px-3 pr-8 text-white text-sm focus:outline-none focus:border-emerald-400/60 appearance-none disabled:opacity-70"
                      >
                        {worldPolicyCountryTargets.length === 0 ? (
                          <option value="" className="bg-[#0b111b] text-white">
                            Нет внешних стран
                          </option>
                        ) : (
                          worldPolicyCountryTargets.map((country) => (
                            <option
                              key={`world-policy-country:${country.id}`}
                              value={country.id}
                              className="bg-[#0b111b] text-white"
                            >
                              {country.name}
                            </option>
                          ))
                        )}
                      </select>
                        <ChevronDown className="w-4 h-4 text-white/45 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                      </div>
                      {selectedWorldPolicyCountry && (
                        <div className="inline-flex items-center gap-2 text-xs text-white/70 mt-1">
                          {selectedWorldPolicyCountry.flagDataUrl ? (
                            <img
                              src={selectedWorldPolicyCountry.flagDataUrl}
                              alt={selectedWorldPolicyCountry.name}
                              className="w-4 h-4 rounded-sm border border-white/15 object-cover"
                            />
                          ) : (
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-white/20"
                              style={{ backgroundColor: selectedWorldPolicyCountry.color ?? '#64748b' }}
                            />
                          )}
                          {selectedWorldPolicyCountry.name}
                        </div>
                      )}
                  </label>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-white/70 text-sm">
                    Экспорт с нашего рынка
                    <div className="relative">
                      <select
                        value={
                          getWorldTradePolicyDraft(
                            selectedWorldTradePolicyResourceId,
                            worldTradePolicyTargetMode,
                            worldTradePolicyTargetId || undefined,
                          ).allowExportToWorld
                            ? 'allow'
                            : 'deny'
                        }
                        onChange={(event) =>
                          updateWorldTradePolicyDraft(
                            selectedWorldTradePolicyResourceId,
                            worldTradePolicyTargetMode,
                            worldTradePolicyTargetId || undefined,
                            { allowExportToWorld: event.target.value === 'allow' },
                          )
                        }
                        disabled={
                          !canEditOwnMarket ||
                          ((worldTradePolicyTargetMode === 'country' ||
                            worldTradePolicyTargetMode === 'market') &&
                            !worldTradePolicyTargetId)
                        }
                        className="h-9 w-full rounded-lg bg-[#0b111b] border border-white/10 px-3 pr-8 text-white text-sm focus:outline-none focus:border-emerald-400/60 appearance-none disabled:opacity-70"
                      >
                        <option value="allow" className="bg-[#0b111b] text-white">
                          Разрешить
                        </option>
                        <option value="deny" className="bg-[#0b111b] text-white">
                          Запретить
                        </option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-white/45 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1 text-white/70 text-sm">
                    Импорт на наш рынок
                    <div className="relative">
                      <select
                        value={
                          getWorldTradePolicyDraft(
                            selectedWorldTradePolicyResourceId,
                            worldTradePolicyTargetMode,
                            worldTradePolicyTargetId || undefined,
                          ).allowImportFromWorld
                            ? 'allow'
                            : 'deny'
                        }
                        onChange={(event) =>
                          updateWorldTradePolicyDraft(
                            selectedWorldTradePolicyResourceId,
                            worldTradePolicyTargetMode,
                            worldTradePolicyTargetId || undefined,
                            { allowImportFromWorld: event.target.value === 'allow' },
                          )
                        }
                        disabled={
                          !canEditOwnMarket ||
                          ((worldTradePolicyTargetMode === 'country' ||
                            worldTradePolicyTargetMode === 'market') &&
                            !worldTradePolicyTargetId)
                        }
                        className="h-9 w-full rounded-lg bg-[#0b111b] border border-white/10 px-3 pr-8 text-white text-sm focus:outline-none focus:border-emerald-400/60 appearance-none disabled:opacity-70"
                      >
                        <option value="allow" className="bg-[#0b111b] text-white">
                          Разрешить
                        </option>
                        <option value="deny" className="bg-[#0b111b] text-white">
                          Запретить
                        </option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-white/45 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1 text-white/70 text-sm">
                    <Tooltip
                      label="Лимит экспорта за ход"
                      description="Максимум единиц ресурса, который ваш рынок может продать во внешние сделки за один ход. После достижения лимита экспорт блокируется до следующего хода."
                      side="bottom"
                    >
                      <span className="inline-flex">Лимит экспорта за ход (ед.)</span>
                    </Tooltip>
                    <input
                      type="number"
                      min={0}
                      value={
                        getWorldTradePolicyDraft(
                            selectedWorldTradePolicyResourceId,
                          worldTradePolicyTargetMode,
                          worldTradePolicyTargetId || undefined,
                        ).maxExportAmountPerTurnToWorld ?? ''
                      }
                      onChange={(event) =>
                        updateWorldTradePolicyDraft(
                            selectedWorldTradePolicyResourceId,
                          worldTradePolicyTargetMode,
                          worldTradePolicyTargetId || undefined,
                          { maxExportAmountPerTurnToWorld: event.target.value },
                        )
                      }
                      disabled={
                        !canEditOwnMarket ||
                        ((worldTradePolicyTargetMode === 'country' ||
                          worldTradePolicyTargetMode === 'market') &&
                          !worldTradePolicyTargetId)
                      }
                      placeholder="Без лимита"
                      className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60 disabled:opacity-70"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-white/70 text-sm">
                    <Tooltip
                      label="Лимит импорта за ход"
                      description="Максимум единиц ресурса, который ваш рынок может купить во внешних сделках за один ход. После достижения лимита импорт блокируется до следующего хода."
                      side="bottom"
                    >
                      <span className="inline-flex">Лимит импорта за ход (ед.)</span>
                    </Tooltip>
                    <input
                      type="number"
                      min={0}
                      value={
                        getWorldTradePolicyDraft(
                            selectedWorldTradePolicyResourceId,
                          worldTradePolicyTargetMode,
                          worldTradePolicyTargetId || undefined,
                        ).maxImportAmountPerTurnFromWorld ?? ''
                      }
                      onChange={(event) =>
                        updateWorldTradePolicyDraft(
                            selectedWorldTradePolicyResourceId,
                          worldTradePolicyTargetMode,
                          worldTradePolicyTargetId || undefined,
                          { maxImportAmountPerTurnFromWorld: event.target.value },
                        )
                      }
                      disabled={
                        !canEditOwnMarket ||
                        ((worldTradePolicyTargetMode === 'country' ||
                          worldTradePolicyTargetMode === 'market') &&
                          !worldTradePolicyTargetId)
                      }
                      placeholder="Без лимита"
                      className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60 disabled:opacity-70"
                    />
                  </label>
                </div>
                </div>
                <div className="min-h-0 overflow-y-auto legend-scroll rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                  <Tooltip
                    label="Наложенные ограничения"
                    description="Приоритет применения: правило по стране выше правила по рынку, а правило по рынку выше общего правила."
                    side="bottom"
                  >
                    <div className="inline-flex text-white/85 text-sm font-semibold">
                      Наложенные ограничения
                    </div>
                  </Tooltip>
                  <div className="text-xs text-white/55">
                    Сводка по активным ограничениям для выбранного товара.
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
                    <Tooltip
                      label="Общие правила"
                      description="Базовый уровень. Используется, если нет более точного правила для конкретного рынка или страны."
                      side="bottom"
                    >
                      <div className="inline-flex text-xs text-white/75 font-semibold">Общие правила</div>
                    </Tooltip>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span
                        className={
                          worldTradePolicyActiveDetails.base.allowExportToWorld
                            ? 'px-2 py-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                            : 'px-2 py-1 rounded-md border border-rose-400/30 bg-rose-500/10 text-rose-200'
                        }
                      >
                        Экспорт {worldTradePolicyActiveDetails.base.allowExportToWorld ? 'разрешен' : 'запрещен'}
                      </span>
                      <span
                        className={
                          worldTradePolicyActiveDetails.base.allowImportFromWorld
                            ? 'px-2 py-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                            : 'px-2 py-1 rounded-md border border-rose-400/30 bg-rose-500/10 text-rose-200'
                        }
                      >
                        Импорт {worldTradePolicyActiveDetails.base.allowImportFromWorld ? 'разрешен' : 'запрещен'}
                      </span>
                      {worldTradePolicyActiveDetails.base.maxExportAmountPerTurnToWorld != null && (
                        <span className="px-2 py-1 rounded-md border border-sky-400/30 bg-sky-500/10 text-sky-200">
                          Лимит экспорта: {formatCompactNumber(
                            worldTradePolicyActiveDetails.base.maxExportAmountPerTurnToWorld,
                            0,
                          )}
                        </span>
                      )}
                      {worldTradePolicyActiveDetails.base.maxImportAmountPerTurnFromWorld != null && (
                        <span className="px-2 py-1 rounded-md border border-sky-400/30 bg-sky-500/10 text-sky-200">
                          Лимит импорта: {formatCompactNumber(
                            worldTradePolicyActiveDetails.base.maxImportAmountPerTurnFromWorld,
                            0,
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
                    <Tooltip
                      label="По рынкам"
                      description="Средний приоритет. Переопределяет общее правило, но уступает персональному правилу по стране."
                      side="bottom"
                    >
                      <div className="inline-flex text-xs text-white/75 font-semibold">По рынкам</div>
                    </Tooltip>
                    {worldTradePolicyActiveDetails.marketOverrides.length === 0 ? (
                      <div className="text-xs text-white/45">Нет ограничений по рынкам.</div>
                    ) : (
                      <div className="space-y-1.5">
                        {worldTradePolicyActiveDetails.marketOverrides.map((item) => (
                          <div
                            key={`world-policy-market-summary:${item.id}`}
                            className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1.5"
                          >
                            <span className="inline-flex items-center gap-2 text-xs text-white/75">
                              {markets.find((market) => market.id === item.id)?.logoDataUrl ? (
                                <img
                                  src={markets.find((market) => market.id === item.id)?.logoDataUrl}
                                  alt={item.name}
                                  className="w-4 h-4 rounded-sm border border-white/15 object-cover"
                                />
                              ) : (
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-white/20"
                                  style={{
                                    backgroundColor:
                                      markets.find((market) => market.id === item.id)?.color ?? '#64748b',
                                  }}
                                />
                              )}
                              {item.name}
                            </span>
                            <span className="flex flex-wrap gap-1.5 text-[11px]">
                              <span
                                className={
                                  item.allowExportToWorld
                                    ? 'px-1.5 py-0.5 rounded border border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                    : 'px-1.5 py-0.5 rounded border border-rose-400/30 bg-rose-500/10 text-rose-200'
                                }
                              >
                                Экспорт {item.allowExportToWorld ? 'разрешен' : 'запрещен'}
                              </span>
                              <span
                                className={
                                  item.allowImportFromWorld
                                    ? 'px-1.5 py-0.5 rounded border border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                    : 'px-1.5 py-0.5 rounded border border-rose-400/30 bg-rose-500/10 text-rose-200'
                                }
                              >
                                Импорт {item.allowImportFromWorld ? 'разрешен' : 'запрещен'}
                              </span>
                              {item.maxExportAmountPerTurnToWorld != null && (
                                <Tooltip
                                  label="Лимит экспорта"
                                  description="Ограничение действует на суммарный внешний экспорт вашего рынка за один ход для этого ресурса."
                                  side="bottom"
                                >
                                  <span className="px-1.5 py-0.5 rounded border border-sky-400/25 bg-sky-500/10 text-sky-200">
                                    Лимит экспорта {formatCompactNumber(item.maxExportAmountPerTurnToWorld, 0)}
                                  </span>
                                </Tooltip>
                              )}
                              {item.maxImportAmountPerTurnFromWorld != null && (
                                <Tooltip
                                  label="Лимит импорта"
                                  description="Ограничение действует на суммарный внешний импорт вашего рынка за один ход для этого ресурса."
                                  side="bottom"
                                >
                                  <span className="px-1.5 py-0.5 rounded border border-sky-400/25 bg-sky-500/10 text-sky-200">
                                    Лимит импорта {formatCompactNumber(item.maxImportAmountPerTurnFromWorld, 0)}
                                  </span>
                                </Tooltip>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
                    <Tooltip
                      label="По странам"
                      description="Высший приоритет. Если для страны задано правило, оно перекрывает и правила по рынку, и общие правила."
                      side="bottom"
                    >
                      <div className="inline-flex text-xs text-white/75 font-semibold">По странам</div>
                    </Tooltip>
                    {worldTradePolicyActiveDetails.countryOverrides.length === 0 ? (
                      <div className="text-xs text-white/45">Нет ограничений по странам.</div>
                    ) : (
                      <div className="space-y-1.5">
                        {worldTradePolicyActiveDetails.countryOverrides.map((item) => (
                          <div
                            key={`world-policy-country-summary:${item.id}`}
                            className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1.5"
                          >
                            <span className="inline-flex items-center gap-2 text-xs text-white/75">
                              {countries.find((country) => country.id === item.id)?.flagDataUrl ? (
                                <img
                                  src={countries.find((country) => country.id === item.id)?.flagDataUrl}
                                  alt={item.name}
                                  className="w-4 h-4 rounded-sm border border-white/15 object-cover"
                                />
                              ) : (
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-white/20"
                                  style={{
                                    backgroundColor:
                                      countries.find((country) => country.id === item.id)?.color ?? '#64748b',
                                  }}
                                />
                              )}
                              {item.name}
                            </span>
                            <span className="flex flex-wrap gap-1.5 text-[11px]">
                              <span
                                className={
                                  item.allowExportToWorld
                                    ? 'px-1.5 py-0.5 rounded border border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                    : 'px-1.5 py-0.5 rounded border border-rose-400/30 bg-rose-500/10 text-rose-200'
                                }
                              >
                                Экспорт {item.allowExportToWorld ? 'разрешен' : 'запрещен'}
                              </span>
                              <span
                                className={
                                  item.allowImportFromWorld
                                    ? 'px-1.5 py-0.5 rounded border border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                    : 'px-1.5 py-0.5 rounded border border-rose-400/30 bg-rose-500/10 text-rose-200'
                                }
                              >
                                Импорт {item.allowImportFromWorld ? 'разрешен' : 'запрещен'}
                              </span>
                              {item.maxExportAmountPerTurnToWorld != null && (
                                <Tooltip
                                  label="Лимит экспорта"
                                  description="Ограничение действует на суммарный внешний экспорт вашего рынка за один ход для этого ресурса."
                                  side="bottom"
                                >
                                  <span className="px-1.5 py-0.5 rounded border border-sky-400/25 bg-sky-500/10 text-sky-200">
                                    Лимит экспорта {formatCompactNumber(item.maxExportAmountPerTurnToWorld, 0)}
                                  </span>
                                </Tooltip>
                              )}
                              {item.maxImportAmountPerTurnFromWorld != null && (
                                <Tooltip
                                  label="Лимит импорта"
                                  description="Ограничение действует на суммарный внешний импорт вашего рынка за один ход для этого ресурса."
                                  side="bottom"
                                >
                                  <span className="px-1.5 py-0.5 rounded border border-sky-400/25 bg-sky-500/10 text-sky-200">
                                    Лимит импорта {formatCompactNumber(item.maxImportAmountPerTurnFromWorld, 0)}
                                  </span>
                                </Tooltip>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWorldTradePolicyModalResourceId(undefined);
                    setWorldTradePolicyTargetMode('all');
                    setWorldTradePolicyTargetId('');
                  }}
                  className="h-9 px-4 rounded-lg border border-white/15 bg-black/30 text-white/75 text-sm"
                >
                  Закрыть
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveWorldTradePolicyForResource(
                      selectedWorldTradePolicyResourceId,
                      worldTradePolicyTargetMode,
                      worldTradePolicyTargetId || undefined,
                    );
                  }}
                  disabled={
                    !canEditOwnMarket ||
                    ((worldTradePolicyTargetMode === 'country' ||
                      worldTradePolicyTargetMode === 'market') &&
                      !worldTradePolicyTargetId)
                  }
                  className="h-9 px-4 rounded-lg border border-emerald-400/35 bg-emerald-500/15 text-emerald-200 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}
        {memberMarket && activeCountryId && tradePolicyModalResource && (
          <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="w-[520px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-[#0b111b] shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="text-white text-sm font-semibold">
                  Настройки торговли: {tradePolicyModalResource.name}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTradePolicyModalResourceId(undefined);
                    setTradePolicyModalTargetCountryId('');
                  }}
                  className="h-8 w-8 rounded-md border border-white/10 bg-black/30 text-white/70 inline-flex items-center justify-center hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <label className="flex flex-col gap-1 text-white/70 text-sm">
                  Страна-партнер
                  <div className="relative">
                    <select
                      value={tradePolicyModalTargetCountryId}
                      onChange={(event) =>
                        setTradePolicyModalTargetCountryId(event.target.value)
                      }
                      className="h-9 w-full rounded-lg bg-[#0b111b] border border-white/10 px-3 pr-8 text-white text-sm focus:outline-none focus:border-emerald-400/60 appearance-none"
                    >
                      <option value="" className="bg-[#0b111b] text-white">
                        Общие настройки для товара
                      </option>
                      {memberMarket.memberCountryIds
                        .filter((countryId) => countryId !== activeCountryId)
                        .map((countryId) => (
                          <option
                            key={`trade-policy-country:${countryId}`}
                            value={countryId}
                            className="bg-[#0b111b] text-white"
                          >
                            {countries.find((country) => country.id === countryId)?.name ??
                              countryId}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-white/45 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                  </div>
                </label>
                {tradePolicyModalTargetCountryId && (
                  <div className="text-[11px] text-white/55">
                    Для выбранной страны действуют индивидуальные правила. Если их не задать,
                    применяются общие настройки товара.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-white/70 text-sm">
                    Продажа другим странам рынка
                    <div className="relative">
                      <select
                        value={
                          (
                            getTradePolicyDraft(
                              tradePolicyModalResource.id,
                              tradePolicyModalTargetCountryId || undefined,
                            ).allowExportToMarketMembers ?? true
                          )
                            ? 'allow'
                            : 'deny'
                        }
                        onChange={(event) =>
                          updateTradePolicyDraft(
                            tradePolicyModalResource.id,
                            tradePolicyModalTargetCountryId || undefined,
                            { allowExportToMarketMembers: event.target.value === 'allow' },
                          )
                        }
                        className="h-9 w-full rounded-lg bg-[#0b111b] border border-white/10 px-3 pr-8 text-white text-sm focus:outline-none focus:border-emerald-400/60 appearance-none"
                      >
                        <option value="allow" className="bg-[#0b111b] text-white">
                          Разрешить продажу
                        </option>
                        <option value="deny" className="bg-[#0b111b] text-white">
                          Запретить продажу
                        </option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-white/45 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1 text-white/70 text-sm">
                    Закупка у других стран рынка
                    <div className="relative">
                      <select
                        value={
                          (
                            getTradePolicyDraft(
                              tradePolicyModalResource.id,
                              tradePolicyModalTargetCountryId || undefined,
                            ).allowImportFromMarketMembers ?? true
                          )
                            ? 'allow'
                            : 'deny'
                        }
                        onChange={(event) =>
                          updateTradePolicyDraft(
                            tradePolicyModalResource.id,
                            tradePolicyModalTargetCountryId || undefined,
                            { allowImportFromMarketMembers: event.target.value === 'allow' },
                          )
                        }
                        className="h-9 w-full rounded-lg bg-[#0b111b] border border-white/10 px-3 pr-8 text-white text-sm focus:outline-none focus:border-emerald-400/60 appearance-none"
                      >
                        <option value="allow" className="bg-[#0b111b] text-white">
                          Разрешить закупку
                        </option>
                        <option value="deny" className="bg-[#0b111b] text-white">
                          Запретить закупку
                        </option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-white/45 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1 text-white/70 text-sm">
                    Лимит продажи за ход (ед.)
                    <input
                      type="number"
                      min={0}
                      value={
                        getTradePolicyDraft(
                          tradePolicyModalResource.id,
                          tradePolicyModalTargetCountryId || undefined,
                        ).maxExportAmountPerTurnToMarketMembers ?? ''
                      }
                      onChange={(event) =>
                        updateTradePolicyDraft(
                          tradePolicyModalResource.id,
                          tradePolicyModalTargetCountryId || undefined,
                          { maxExportAmountPerTurnToMarketMembers: event.target.value },
                        )
                      }
                      placeholder="Без лимита"
                      className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-white/70 text-sm">
                    Лимит покупки за ход (ед.)
                    <input
                      type="number"
                      min={0}
                      value={
                        getTradePolicyDraft(
                          tradePolicyModalResource.id,
                          tradePolicyModalTargetCountryId || undefined,
                        ).maxImportAmountPerTurnFromMarketMembers ?? ''
                      }
                      onChange={(event) =>
                        updateTradePolicyDraft(
                          tradePolicyModalResource.id,
                          tradePolicyModalTargetCountryId || undefined,
                          { maxImportAmountPerTurnFromMarketMembers: event.target.value },
                        )
                      }
                      placeholder="Без лимита"
                      className="h-9 rounded-lg bg-black/40 border border-white/10 px-2 text-white text-sm focus:outline-none focus:border-emerald-400/60"
                    />
                  </label>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTradePolicyModalResourceId(undefined);
                    setTradePolicyModalTargetCountryId('');
                  }}
                  className="h-8 px-3 rounded-lg border border-white/15 bg-black/30 text-white/75 text-sm"
                >
                  Закрыть
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveTradePolicyForResource(
                      tradePolicyModalResource.id,
                      tradePolicyModalTargetCountryId || undefined,
                    );
                    setTradePolicyModalResourceId(undefined);
                    setTradePolicyModalTargetCountryId('');
                  }}
                  className="h-8 px-3 rounded-lg border border-emerald-400/35 bg-emerald-500/15 text-emerald-200 text-sm"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ModulesMasterView — Écran maître unique pour la gouvernance des droits
 * 
 * Affiche l'arbre module_registry avec :
 * - Nom (indenté par niveau)
 * - Type (section/screen/feature)
 * - Déployé (switch)
 * - Plan minimum (badge cliquable)
 * - Effectif (badge read-only)
 * - Rôle min. (badge dropdown)
 * - Privilèges (badge compteur + popover user overrides)
 * 
 * Section "En cours de développement" en bas pour les modules non déployés.
 * Seul N6 (superadmin) peut changer le statut is_deployed.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  useModuleRegistry,
  useUpdateModuleNode,
  usePropagateToChildren,
  getDescendantKeys,
  type RegistryNode,
  type PlanLevel,
} from '@/hooks/access-rights/useModuleRegistry';
import { RIGHTS_CATEGORIES, nodeMatchesCategory, nodeMatchesAnyCategory, getRightsDisplayLabel, type RightsCategory } from './rightsTaxonomy';
import {
  useModuleOverrides,
  useAddOverride,
  useRemoveOverride,
  useSearchProfiles,
  type UserOverride,
} from '@/hooks/access-rights/useModuleOverrides';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Layers, Monitor, Zap, TreePine, ChevronRight, CornerDownRight, X, Search, Users, Construction, ExternalLink, AlertTriangle, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { GLOBAL_ROLES } from '@/types/globalRoles';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// Role config for badges
// ============================================================================

interface RoleConfig {
  level: number;
  label: string;
  shortLabel: string;
  className: string;
}

const ROLE_CONFIGS: RoleConfig[] = [
  { level: 0, label: 'N0 · Partenaire externe', shortLabel: 'N0', className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' },
  { level: 1, label: 'N1 · Utilisateur agence', shortLabel: 'N1', className: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700' },
  { level: 2, label: 'N2 · Dirigeant agence', shortLabel: 'N2', className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700' },
  { level: 3, label: 'N3 · Animateur réseau', shortLabel: 'N3', className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700' },
  { level: 4, label: 'N4 · Direction réseau', shortLabel: 'N4', className: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700' },
  { level: 5, label: 'N5 · Support avancé', shortLabel: 'N5', className: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700' },
  { level: 6, label: 'N6 · Administrateur', shortLabel: 'N6', className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700' },
];

function getRoleConfig(level: number): RoleConfig {
  return ROLE_CONFIGS[Math.min(Math.max(level, 0), 6)];
}

// ============================================================================
// Sub-components
// ============================================================================

const NODE_TYPE_CONFIG: Record<string, { label: string; icon: typeof Layers; className: string }> = {
  section: { label: 'Module', icon: Layers, className: 'bg-muted text-muted-foreground' },
  screen: { label: 'Section', icon: Monitor, className: 'bg-accent/50 text-accent-foreground' },
  feature: { label: 'Outil', icon: Zap, className: 'bg-primary/10 text-primary' },
};

function NodeTypeBadge({ nodeType }: { nodeType: string }) {
  const config = NODE_TYPE_CONFIG[nodeType] ?? NODE_TYPE_CONFIG.feature;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn('text-[10px] gap-1 px-1.5 py-0', config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

function PlanBadge({
  plan, onClick, readOnly = false, dimmed = false,
}: { plan: PlanLevel; onClick?: () => void; readOnly?: boolean; dimmed?: boolean; }) {
  const config = plan === 'NONE'
    ? { label: 'Individuel', className: 'bg-destructive/10 text-destructive border-destructive/30' }
    : plan === 'STARTER'
    ? { label: 'Basique', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' }
    : { label: 'Pro', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' };

  return (
    <Badge
      variant="secondary"
      className={cn(
        'text-xs cursor-default select-none transition-opacity',
        !readOnly && 'cursor-pointer hover:opacity-80',
        dimmed && 'opacity-40',
        config.className
      )}
      onClick={readOnly ? undefined : onClick}
    >
      {config.label}
    </Badge>
  );
}

function RoleBadge({
  minRole, onChangeRole, dimmed = false, disabled = false,
}: { minRole: number; onChangeRole: (newRole: number) => void; dimmed?: boolean; disabled?: boolean; }) {
  const config = getRoleConfig(minRole);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger disabled={disabled} className="focus:outline-none">
        <Badge
          variant="outline"
          className={cn(
            'text-[11px] cursor-pointer select-none transition-opacity font-medium px-3 py-1',
            'hover:opacity-80 hover:ring-2 hover:ring-primary/30', 
            dimmed && 'opacity-40', 
            disabled && 'cursor-not-allowed opacity-30',
            config.className
          )}
        >
          {config.label.split(' · ')[1] ?? config.shortLabel}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[220px] z-[100]">
        {ROLE_CONFIGS.map((rc) => (
          <DropdownMenuItem
            key={rc.level}
            onClick={() => onChangeRole(rc.level)}
            className={cn('text-xs cursor-pointer py-2', rc.level === minRole && 'bg-accent font-semibold')}
          >
            <Badge variant="outline" className={cn('text-[10px] mr-2 px-1.5 py-0', rc.className)}>
              {rc.shortLabel}
            </Badge>
            {rc.label.split(' · ')[1]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Redundancy check helper
// ============================================================================

const ROLE_LEVEL_MAP: Record<string, number> = {
  base_user: 0, franchisee_user: 1, franchisee_admin: 2,
  franchisor_user: 3, franchisor_admin: 4, platform_admin: 5, superadmin: 6,
};

function isOverrideRedundant(
  override: UserOverride,
  moduleMinRole: number,
  moduleRequiredPlan: PlanLevel,
): boolean {
  // If module plan is NONE, override is the ONLY way to grant access → never redundant
  if (moduleRequiredPlan === 'NONE') return false;

  const userRoleLevel = override.globalRole ? (ROLE_LEVEL_MAP[override.globalRole] ?? 0) : 0;
  const userTier = override.agencyTierKey ?? 'STARTER';

  // Check role requirement
  const meetsRole = userRoleLevel >= moduleMinRole || userRoleLevel >= 5;

  // Check plan requirement
  const meetsPlan = userTier === 'PRO' || moduleRequiredPlan === 'STARTER';

  return meetsRole && meetsPlan;
}

// ============================================================================
// Overrides Popover
// ============================================================================

function OverridesPopover({
  moduleKey,
  overrides,
  dimmed,
  moduleMinRole,
  moduleRequiredPlan,
}: {
  moduleKey: string;
  overrides: UserOverride[];
  dimmed: boolean;
  moduleMinRole: number;
  moduleRequiredPlan: PlanLevel;
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: searchResults, isLoading: searching } = useSearchProfiles(debouncedSearch);
  const addOverride = useAddOverride();
  const removeOverride = useRemoveOverride();

  const count = overrides.length;
  const existingIds = new Set(overrides.map(o => o.userId));
  const filteredResults = (searchResults ?? []).filter(p => !existingIds.has(p.id));

  const redundantOverrides = useMemo(() => 
    overrides.filter(o => isOverrideRedundant(o, moduleMinRole, moduleRequiredPlan)),
    [overrides, moduleMinRole, moduleRequiredPlan]
  );
  const redundantCount = redundantOverrides.length;

  const handleCleanRedundant = () => {
    for (const o of redundantOverrides) {
      removeOverride.mutate({ userId: o.userId, moduleKey });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded-full border text-[11px] cursor-pointer select-none transition-opacity font-medium px-2 py-0.5',
            'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            dimmed && 'opacity-40',
            count > 0
              ? redundantCount === count
                ? 'bg-muted text-muted-foreground border-border'
                : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700'
              : 'bg-muted text-muted-foreground border-border'
          )}
        >
          {count > 0 ? count : '—'}
          {redundantCount > 0 && (
            <AlertTriangle className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-50" align="end" sideOffset={5}>
        <div className="p-3 pb-2">
          <p className="text-xs font-medium text-foreground mb-2">
            Privilèges — <span className="text-muted-foreground font-normal">{moduleKey}</span>
          </p>

          {/* Cleanup button */}
          {redundantCount > 0 && (
            <div className="mb-2 p-2 rounded bg-muted/50 border border-border">
              <p className="text-[10px] text-muted-foreground mb-1.5">
                {redundantCount} privilège{redundantCount > 1 ? 's' : ''} redondant{redundantCount > 1 ? 's' : ''} — ces utilisateurs ont déjà accès via leur rôle et plan.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1"
                onClick={handleCleanRedundant}
                disabled={removeOverride.isPending}
              >
                <Trash2 className="w-3 h-3" />
                Nettoyer {redundantCount} redondant{redundantCount > 1 ? 's' : ''}
              </Button>
            </div>
          )}

          {/* Current overrides */}
          {count > 0 && (
            <ScrollArea className="max-h-48 overflow-y-auto mb-2">
              <div className="space-y-1">
                <TooltipProvider delayDuration={200}>
                  {overrides.map(o => {
                    const redundant = isOverrideRedundant(o, moduleMinRole, moduleRequiredPlan);
                    return (
                      <div key={o.userId} className={cn(
                        'group flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded hover:bg-muted/50',
                        redundant && 'opacity-50'
                      )}>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium truncate block">
                            {[o.firstName, o.lastName].filter(Boolean).join(' ') || 'Inconnu'}
                          </span>
                          {o.email && (
                            <span className="text-muted-foreground text-[10px] truncate block">{o.email}</span>
                          )}
                        </div>
                        {redundant && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-muted text-muted-foreground border-border shrink-0">
                                Redondant
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs max-w-[200px]">
                              Accès déjà garanti par le rôle ({o.globalRole}) et le plan ({o.agencyTierKey})
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Retirer ce privilège"
                          onClick={() => removeOverride.mutate({ userId: o.userId, moduleKey })}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </TooltipProvider>
              </div>
            </ScrollArea>
          )}

          {count > 0 && <Separator className="my-2" />}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un utilisateur…"
              className="h-8 text-xs pl-7"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Results */}
          {debouncedSearch.length >= 2 && (
            <ScrollArea className="max-h-32 mt-2">
              {searching ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">Recherche…</p>
              ) : filteredResults.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">Aucun résultat</p>
              ) : (
                <div className="space-y-0.5">
                  {filteredResults.map(p => (
                    <button
                      key={p.id}
                      className="w-full flex items-center gap-2 text-xs py-1.5 px-1 rounded hover:bg-muted/50 text-left"
                      onClick={() => {
                        addOverride.mutate({ userId: p.id, moduleKey });
                        setSearch('');
                      }}
                    >
                      <Users className="w-3 h-3 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">
                        {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Row component
// ============================================================================

// Route mapping for module keys → app routes
const MODULE_ROUTES: Record<string, string> = {
  agence: '/?tab=pilotage',
  stats: '/?tab=pilotage',
  prospection: '/?tab=commercial',
  realisations: '/?tab=commercial',
  rh: '/?tab=organisation',
  divers_apporteurs: '/?tab=organisation',
  divers_plannings: '/?tab=organisation',
  divers_reunions: '/?tab=organisation',
  parc: '/?tab=organisation',
  divers_documents: '/?tab=documents',
  documents: '/?tab=documents',
  aide: '/?tab=support',
  guides: '/?tab=support',
  ticketing: '/?tab=support',
  reseau_franchiseur: '/?tab=franchiseur',
  admin_plateforme: '/?tab=admin',
};

function getModuleRoute(key: string): string | null {
  // Check exact key first, then first segment
  if (MODULE_ROUTES[key]) return MODULE_ROUTES[key];
  const root = key.split('.')[0];
  if (MODULE_ROUTES[root]) return MODULE_ROUTES[root];
  return null;
}

const GRID_COLS = 'grid-cols-[minmax(200px,max-content)_80px_60px_80px_80px_140px_80px_50px]';

interface ModuleRowProps {
  node: RegistryNode;
  overrides: UserOverride[];
  onToggleDeploy: (node: RegistryNode) => void;
  onTogglePlan: (node: RegistryNode) => void;
  onChangeRole: (node: RegistryNode, newRole: number) => void;
  onRenameLabel: (node: RegistryNode, newLabel: string) => void;
  isUpdating: boolean;
  canDeploy: boolean;
  isDevSection?: boolean;
}

function ModuleRow({ node, overrides, onToggleDeploy, onTogglePlan, onChangeRole, onRenameLabel, isUpdating, canDeploy, isDevSection }: ModuleRowProps) {
  const navigate = useNavigate();
  const route = getModuleRoute(node.key);
  const isNeutralized = !node.effectiveDeployed && node.is_deployed;
  const depthColors = ['text-primary', 'text-blue-500', 'text-violet-500', 'text-emerald-500'];
  const branchColor = depthColors[Math.min(node.depth, depthColors.length - 1)];
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(node.label);

  useEffect(() => {
    setDraftLabel(node.label);
  }, [node.label]);

  const commitRename = () => {
    const trimmed = draftLabel.trim();
    setIsEditing(false);

    if (!trimmed || trimmed === node.label) {
      setDraftLabel(node.label);
      return;
    }

    onRenameLabel(node, trimmed);
  };

  return (
    <div
      className={cn(
        `grid ${GRID_COLS} gap-2 items-center py-2 px-3 border-b border-border/50 text-sm`,
        'hover:bg-muted/30 transition-colors',
        !node.effectiveDeployed && !isDevSection && 'opacity-50',
        isNeutralized && 'bg-destructive/5',
        node.depth === 0 && !isDevSection && 'bg-muted/20',
        isDevSection && 'bg-amber-500/5'
      )}
    >
      {/* Name */}
      <div
        className="flex items-center min-w-0"
        style={{ paddingLeft: `${(isDevSection ? 0 : node.depth) * 16}px` }}
      >
        {node.depth > 0 && !isDevSection && <CornerDownRight className={cn('w-3.5 h-3.5 mr-1.5 shrink-0', branchColor)} />}
        {isDevSection && (
          <Construction className="w-3.5 h-3.5 mr-1.5 shrink-0 text-amber-500" />
        )}

        {isEditing ? (
          <div className="flex flex-col gap-0.5">
            <Input
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setDraftLabel(node.label);
                  setIsEditing(false);
                }
              }}
              autoFocus
              className="h-7 text-xs"
            />
            <span className="text-[9px] text-muted-foreground">
              Renommage visuel uniquement — ne modifie pas la clé technique ni les permissions.
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => !isUpdating && setIsEditing(true)}
            className={cn(
              'truncate text-left hover:underline underline-offset-2',
              isUpdating && 'cursor-not-allowed opacity-70',
              isDevSection && 'text-amber-700 dark:text-amber-400 font-medium',
              !isDevSection && node.depth === 0 && 'font-semibold text-foreground uppercase tracking-wide',
              !isDevSection && node.depth === 1 && 'font-medium text-blue-600 dark:text-blue-400',
              !isDevSection && node.depth >= 2 && 'text-violet-600 dark:text-violet-400'
            )}
            title="Cliquer pour renommer le libellé (visuel uniquement)"
          >
            {node.label}
          </button>
        )}

        {/* Clé technique (lecture seule) */}
        <span className="ml-2 text-[10px] text-muted-foreground font-mono select-all" title="Clé technique (immuable)">
          {node.key}
        </span>

        {isDevSection && node.parent_key && (
          <span className="ml-2 text-[10px] text-muted-foreground">
            ({node.parent_key})
          </span>
        )}
      </div>

      <div><NodeTypeBadge nodeType={node.node_type} /></div>

      <div className="flex justify-center">
        <Switch
          checked={node.is_deployed}
          onCheckedChange={() => onToggleDeploy(node)}
          disabled={isUpdating || !canDeploy}
          className="scale-90"
          title={!canDeploy ? 'Seul un superadmin (N6) peut déployer' : undefined}
        />
      </div>

      <div className="flex justify-center">
        <PlanBadge plan={node.required_plan} onClick={() => onTogglePlan(node)} dimmed={!node.effectiveDeployed} />
      </div>

      <div className="flex justify-center">
        <PlanBadge plan={node.effectivePlan} readOnly dimmed={!node.effectiveDeployed} />
      </div>

      <div className="flex justify-center">
        <RoleBadge minRole={node.min_role} onChangeRole={(r) => onChangeRole(node, r)} dimmed={!node.effectiveDeployed} disabled={isUpdating} />
      </div>

      {/* Privilèges */}
      <div className="flex justify-center relative z-10">
        <OverridesPopover moduleKey={node.key} overrides={overrides} dimmed={!node.effectiveDeployed} moduleMinRole={node.min_role} moduleRequiredPlan={node.required_plan} />
      </div>

      {/* Lien */}
      <div className="flex justify-center">
        {route ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-primary/10"
            title={`Ouvrir ${node.label}`}
            onClick={() => navigate(route)}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <span className="text-muted-foreground/30 text-xs">—</span>
        )}
      </div>
    </div>
  );
}

function CategoryHeaderRow({
  category,
  collapsed,
  onToggle,
  moduleCount,
}: {
  category: RightsCategory;
  collapsed: boolean;
  onToggle: () => void;
  moduleCount: number;
}) {
  return (
    <div className={cn(`grid ${GRID_COLS} gap-2 items-center py-2.5 px-3 border-b border-border bg-muted/20`)}>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 min-w-0 text-left"
      >
        <ChevronRight className={cn('w-4 h-4 shrink-0 transition-transform text-primary', !collapsed && 'rotate-90')} />
        <span className="font-semibold uppercase tracking-wide text-foreground truncate">{category.label}</span>
        <Badge variant="secondary" className="text-[10px]">{moduleCount}</Badge>
      </button>
      <div className="text-center text-muted-foreground/30">—</div>
      <div className="text-center text-muted-foreground/30">—</div>
      <div className="text-center text-muted-foreground/30">—</div>
      <div className="text-center text-muted-foreground/30">—</div>
      <div className="text-center text-muted-foreground/30">—</div>
      <div className="text-center text-muted-foreground/30">—</div>
      <div className="text-center text-muted-foreground/30">—</div>
    </div>
  );
}

// ============================================================================
// Main view
// ============================================================================

interface PropagateDialogState {
  open: boolean;
  node: RegistryNode | null;
  field: 'is_deployed' | 'required_plan' | 'min_role';
  newValue: boolean | PlanLevel | number;
  descendantCount: number;
  nonDeployedCount: number;
}

function countNonDeployedDescendants(node: RegistryNode): number {
  let count = 0;
  function walk(n: RegistryNode) {
    for (const child of n.children) {
      if (!child.is_deployed) count++;
      walk(child);
    }
  }
  walk(node);
  return count;
}

export function ModulesMasterView() {
  const { flatNodes, isLoading } = useModuleRegistry();
  const { overrides } = useModuleOverrides();
  const { hasGlobalRole } = usePermissions();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showLegacy, setShowLegacy] = useState(false);
  const updateNode = useUpdateModuleNode();
  const propagate = usePropagateToChildren();

  // Only N6 (superadmin) can toggle is_deployed
  const canDeploy = hasGlobalRole('superadmin');

  // Split nodes into deployed (main tree) and non-deployed (dev section)
  const { deployedNodes, devNodes } = useMemo(() => {
    const deployed: RegistryNode[] = [];
    const dev: RegistryNode[] = [];

    // Collect root-level non-deployed nodes and all their descendants
    const devRootKeys = new Set<string>();
    for (const node of flatNodes) {
      if (node.depth === 0 && !node.is_deployed) {
        devRootKeys.add(node.key);
      }
    }

    for (const node of flatNodes) {
      // A node is "dev" if it's a non-deployed root, or any descendant of one
      const rootKey = node.key.split('.')[0];
      if (devRootKeys.has(rootKey) || (!node.is_deployed && !node.effectiveDeployed)) {
        dev.push(node);
      } else {
        deployed.push(node);
      }
    }

    return { deployedNodes: deployed, devNodes: dev };
  }, [flatNodes]);

  const toDisplayNode = useCallback((node: RegistryNode): RegistryNode => {
    // Subtract 1 from depth since root container nodes are hidden
    // (e.g., pilotage.statistiques is depth=1 in tree → display as depth=0)
    return {
      ...node,
      depth: Math.max(0, node.depth),
      label: getRightsDisplayLabel(node.key, node.label),
    };
  }, []);

  // Root container nodes (node_type='module', parent_key=null) are structural —
  // they map 1:1 to the category headers, so hide them from the tree rows.
  const ROOT_CONTAINER_KEYS = new Set(['pilotage', 'commercial', 'organisation', 'mediatheque', 'support', 'admin']);

  const groupedCategories = useMemo(() => {
    return RIGHTS_CATEGORIES.map((category) => ({
      category,
      nodes: deployedNodes
        .filter((node) => nodeMatchesCategory(node.key, category.moduleKeys) && !ROOT_CONTAINER_KEYS.has(node.key))
        .map(toDisplayNode),
    }));
  }, [deployedNodes, toDisplayNode]);

  const legacyNodes = useMemo(() => {
    return deployedNodes
      .filter((node) => !nodeMatchesAnyCategory(node.key))
      .map(toDisplayNode);
  }, [deployedNodes, toDisplayNode]);

  const [dialog, setDialog] = useState<PropagateDialogState>({
    open: false, node: null, field: 'is_deployed', newValue: false, descendantCount: 0, nonDeployedCount: 0,
  });

  const handleToggleDeploy = useCallback((node: RegistryNode) => {
    const newValue = !node.is_deployed;
    const descendants = getDescendantKeys(node);
    updateNode.mutate({ key: node.key, updates: { is_deployed: newValue } });
    if (descendants.length > 0) {
      const nonDeployed = countNonDeployedDescendants(node);
      setDialog({ open: true, node, field: 'is_deployed', newValue, descendantCount: descendants.length, nonDeployedCount: nonDeployed });
    }
  }, [updateNode]);

  const handleTogglePlan = useCallback((node: RegistryNode) => {
    const cycle: PlanLevel[] = ['STARTER', 'PRO', 'NONE'];
    const idx = cycle.indexOf(node.required_plan);
    const newValue: PlanLevel = cycle[(idx + 1) % cycle.length];
    const descendants = getDescendantKeys(node);
    updateNode.mutate({ key: node.key, updates: { required_plan: newValue } });
    if (descendants.length > 0) {
      const nonDeployed = countNonDeployedDescendants(node);
      setDialog({ open: true, node, field: 'required_plan', newValue, descendantCount: descendants.length, nonDeployedCount: nonDeployed });
    }
  }, [updateNode]);

  const handleChangeRole = useCallback((node: RegistryNode, newRole: number) => {
    const descendants = getDescendantKeys(node);
    updateNode.mutate({ key: node.key, updates: { min_role: newRole } });
    if (descendants.length > 0) {
      const nonDeployed = countNonDeployedDescendants(node);
      setDialog({ open: true, node, field: 'min_role', newValue: newRole, descendantCount: descendants.length, nonDeployedCount: nonDeployed });
    }
  }, [updateNode]);

  const handleRenameLabel = useCallback((node: RegistryNode, newLabel: string) => {
    updateNode.mutate({ key: node.key, updates: { label: newLabel } });
  }, [updateNode]);

  const toggleCategory = useCallback((categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const handlePropagate = useCallback(() => {
    if (!dialog.node) return;
    const keys = getDescendantKeys(dialog.node);
    const updates =
      dialog.field === 'is_deployed' ? { is_deployed: dialog.newValue as boolean }
      : dialog.field === 'required_plan' ? { required_plan: dialog.newValue as PlanLevel }
      : { min_role: dialog.newValue as number };
    propagate.mutate({ keys, updates });
    setDialog(prev => ({ ...prev, open: false }));
  }, [dialog, propagate]);

  const nonDeployedHint = dialog.nonDeployedCount > 0
    ? ` (dont ${dialog.nonDeployedCount} non déployé${dialog.nonDeployedCount > 1 ? 's' : ''})`
    : '';

  const getDialogDescription = () => {
    if (dialog.field === 'is_deployed') {
      return `Appliquer "${dialog.newValue ? 'Déployé' : 'Non déployé'}" aux ${dialog.descendantCount} descendants${nonDeployedHint} de "${dialog.node?.label}" ?`;
    }
    if (dialog.field === 'required_plan') {
      const planLabel = dialog.newValue === 'STARTER' ? 'Basique' : dialog.newValue === 'PRO' ? 'Pro' : 'Individuel';
      return `Appliquer le plan "${planLabel}" aux ${dialog.descendantCount} descendants${nonDeployedHint} de "${dialog.node?.label}" ?`;
    }
    const roleConfig = getRoleConfig(dialog.newValue as number);
    return `Appliquer le rôle minimum "${roleConfig.label}" aux ${dialog.descendantCount} descendants${nonDeployedHint} de "${dialog.node?.label}" ?`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const headerRow = (
    <div className={cn(
      `grid ${GRID_COLS} gap-2 items-center py-2 px-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide`
    )}>
      <div>Nom</div>
      <div className="text-center">Type</div>
      <div className="text-center">Déployé</div>
      <div className="text-center">Plan min.</div>
      <div className="text-center">Effectif</div>
      <div className="text-center">Rôle min.</div>
      <div className="text-center">Privil.</div>
      <div className="text-center">Lien</div>
    </div>
  );

  return (
    <>
      {/* Main deployed modules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TreePine className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Gestion des Droits</CardTitle>
          </div>
          <CardDescription>
            Source de vérité unique. Déploiement, plans, rôles et privilèges individuels sur chaque nœud.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {headerRow}

          {groupedCategories.map(({ category, nodes }) => {
            if (nodes.length === 0) return null;
            const isCategoryCollapsed = collapsedCategories.has(category.id);

            return (
              <div key={category.id}>
                <CategoryHeaderRow
                  category={category}
                  collapsed={isCategoryCollapsed}
                  onToggle={() => toggleCategory(category.id)}
                  moduleCount={nodes.filter((node) => node.depth === 1).length}
                />

                {!isCategoryCollapsed && nodes.map((node) => (
                  <ModuleRow
                    key={node.key}
                    node={node}
                    overrides={overrides.get(node.key) ?? []}
                    onToggleDeploy={handleToggleDeploy}
                    onTogglePlan={handleTogglePlan}
                    onChangeRole={handleChangeRole}
                    onRenameLabel={handleRenameLabel}
                    isUpdating={updateNode.isPending || propagate.isPending}
                    canDeploy={canDeploy}
                  />
                ))}
              </div>
            );
          })}

          {legacyNodes.length > 0 && (
            <>
              <div className={cn(`grid ${GRID_COLS} gap-2 items-center py-2 px-3 border-b border-border bg-muted/10`)}>
                <button
                  type="button"
                  onClick={() => setShowLegacy((prev) => !prev)}
                  className="flex items-center gap-2 min-w-0 text-left"
                >
                  <ChevronRight className={cn('w-4 h-4 shrink-0 transition-transform text-muted-foreground', showLegacy && 'rotate-90')} />
                  <span className="font-medium text-muted-foreground truncate">Legacy / non classé</span>
                  <Badge variant="outline" className="text-[10px]">{legacyNodes.filter((node) => node.depth === 1).length}</Badge>
                </button>
                <div className="text-center text-muted-foreground/30">—</div>
                <div className="text-center text-muted-foreground/30">—</div>
                <div className="text-center text-muted-foreground/30">—</div>
                <div className="text-center text-muted-foreground/30">—</div>
                <div className="text-center text-muted-foreground/30">—</div>
                <div className="text-center text-muted-foreground/30">—</div>
                <div className="text-center text-muted-foreground/30">—</div>
              </div>

              {showLegacy && legacyNodes.map((node) => (
                <ModuleRow
                  key={node.key}
                  node={node}
                  overrides={overrides.get(node.key) ?? []}
                  onToggleDeploy={handleToggleDeploy}
                  onTogglePlan={handleTogglePlan}
                  onChangeRole={handleChangeRole}
                  onRenameLabel={handleRenameLabel}
                  isUpdating={updateNode.isPending || propagate.isPending}
                  canDeploy={canDeploy}
                />
              ))}
            </>
          )}

          {groupedCategories.every((group) => group.nodes.length === 0) && legacyNodes.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              Aucun module déployé dans le registre.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dev section — non-deployed modules */}
      {devNodes.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Construction className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-lg text-amber-700 dark:text-amber-400">
                En cours de développement
              </CardTitle>
              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                {devNodes.length}
              </Badge>
            </div>
            <CardDescription>
              Modules non encore déployés. Ils apparaîtront automatiquement dans la section correspondante une fois activés.
              {!canDeploy && (
                <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                  🔒 Seul un superadmin (N6) peut activer le déploiement.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {headerRow}
            {devNodes.map(node => (
              <ModuleRow
                key={node.key}
                node={node}
                overrides={overrides.get(node.key) ?? []}
                onToggleDeploy={handleToggleDeploy}
                onTogglePlan={handleTogglePlan}
                onChangeRole={handleChangeRole}
                onRenameLabel={handleRenameLabel}
                isUpdating={updateNode.isPending || propagate.isPending}
                canDeploy={canDeploy}
                isDevSection
              />
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={dialog.open} onOpenChange={(open) => setDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Propager aux enfants ?</AlertDialogTitle>
            <AlertDialogDescription>
              {getDialogDescription()}
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                Chaque enfant peut ensuite être surchargé individuellement.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, ce nœud seulement</AlertDialogCancel>
            <AlertDialogAction onClick={handlePropagate}>
              Oui, propager à {dialog.descendantCount} enfants
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
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
 */

import { useState, useCallback } from 'react';
import {
  useModuleRegistry,
  useUpdateModuleNode,
  usePropagateToChildren,
  flattenTree,
  getDescendantKeys,
  type RegistryNode,
  type PlanLevel,
} from '@/hooks/access-rights/useModuleRegistry';
import {
  useModuleOverrides,
  useAddOverride,
  useRemoveOverride,
  useSearchProfiles,
  type UserOverride,
} from '@/hooks/access-rights/useModuleOverrides';
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
import { Layers, Monitor, Zap, TreePine, ChevronRight, CornerDownRight, X, Search, Users } from 'lucide-react';

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
  section: { label: 'Section', icon: Layers, className: 'bg-muted text-muted-foreground' },
  screen: { label: 'Écran', icon: Monitor, className: 'bg-accent/50 text-accent-foreground' },
  feature: { label: 'Feature', icon: Zap, className: 'bg-primary/10 text-primary' },
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
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Badge
          variant="outline"
          className={cn(
            'text-[11px] cursor-pointer select-none transition-opacity font-medium px-2 py-0.5',
            'hover:opacity-80', dimmed && 'opacity-40', config.className
          )}
        >
          {config.shortLabel}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[200px]">
        {ROLE_CONFIGS.map((rc) => (
          <DropdownMenuItem
            key={rc.level}
            onClick={() => onChangeRole(rc.level)}
            className={cn('text-xs cursor-pointer', rc.level === minRole && 'bg-accent font-semibold')}
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
// Overrides Popover
// ============================================================================

function OverridesPopover({
  moduleKey,
  overrides,
  dimmed,
}: {
  moduleKey: string;
  overrides: UserOverride[];
  dimmed: boolean;
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: searchResults, isLoading: searching } = useSearchProfiles(debouncedSearch);
  const addOverride = useAddOverride();
  const removeOverride = useRemoveOverride();

  const count = overrides.length;
  const existingIds = new Set(overrides.map(o => o.userId));
  const filteredResults = (searchResults ?? []).filter(p => !existingIds.has(p.id));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            'text-[11px] cursor-pointer select-none transition-opacity font-medium px-2 py-0.5',
            'hover:opacity-80',
            dimmed && 'opacity-40',
            count > 0
              ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700'
              : 'bg-muted text-muted-foreground border-border'
          )}
        >
          {count > 0 ? count : '—'}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 pb-2">
          <p className="text-xs font-medium text-foreground mb-2">
            Privilèges — <span className="text-muted-foreground font-normal">{moduleKey}</span>
          </p>

          {/* Current overrides */}
          {count > 0 && (
            <ScrollArea className="max-h-32 mb-2">
              <div className="space-y-1">
                {overrides.map(o => (
                  <div key={o.userId} className="flex items-center justify-between gap-2 text-xs py-1 px-1 rounded hover:bg-muted/50">
                    <div className="min-w-0 truncate">
                      <span className="font-medium">
                        {[o.firstName, o.lastName].filter(Boolean).join(' ') || 'Inconnu'}
                      </span>
                      {o.email && (
                        <span className="text-muted-foreground ml-1 text-[10px]">{o.email}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => removeOverride.mutate({ userId: o.userId, moduleKey })}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
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

const GRID_COLS = 'grid-cols-[minmax(200px,max-content)_80px_60px_80px_80px_60px_70px]';

interface ModuleRowProps {
  node: RegistryNode;
  overrides: UserOverride[];
  onToggleDeploy: (node: RegistryNode) => void;
  onTogglePlan: (node: RegistryNode) => void;
  onChangeRole: (node: RegistryNode, newRole: number) => void;
  isUpdating: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function ModuleRow({ node, overrides, onToggleDeploy, onTogglePlan, onChangeRole, isUpdating, isCollapsed, onToggleCollapse }: ModuleRowProps) {
  const isNeutralized = !node.effectiveDeployed && node.is_deployed;
  const depthColors = ['text-primary', 'text-blue-500', 'text-violet-500', 'text-emerald-500'];
  const branchColor = depthColors[Math.min(node.depth, depthColors.length - 1)];

  return (
    <div
      className={cn(
        `grid ${GRID_COLS} gap-2 items-center py-2 px-3 border-b border-border/50 text-sm`,
        'hover:bg-muted/30 transition-colors',
        !node.effectiveDeployed && 'opacity-50',
        isNeutralized && 'bg-destructive/5',
        node.depth === 0 && 'bg-muted/20'
      )}
    >
      {/* Name */}
      <div
        className={cn('flex items-center min-w-0', node.depth === 0 && 'cursor-pointer select-none')}
        style={{ paddingLeft: `${node.depth * 16}px` }}
        onClick={node.depth === 0 ? onToggleCollapse : undefined}
      >
        {node.depth > 0 && <CornerDownRight className={cn('w-3.5 h-3.5 mr-1.5 shrink-0', branchColor)} />}
        {node.depth === 0 && (
          <ChevronRight className={cn('w-4 h-4 mr-1.5 shrink-0 transition-transform duration-200', branchColor, !isCollapsed && 'rotate-90')} />
        )}
        <span className={cn('truncate', node.depth === 0 && 'font-semibold text-foreground', node.depth === 1 && 'font-medium')}>
          {node.label}
        </span>
      </div>

      <div><NodeTypeBadge nodeType={node.node_type} /></div>

      <div className="flex justify-center">
        <Switch checked={node.is_deployed} onCheckedChange={() => onToggleDeploy(node)} disabled={isUpdating} className="scale-90" />
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
      <div className="flex justify-center">
        <OverridesPopover moduleKey={node.key} overrides={overrides} dimmed={!node.effectiveDeployed} />
      </div>
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
}

export function ModulesMasterView() {
  const { tree, flatNodes, isLoading } = useModuleRegistry();
  const { overrides } = useModuleOverrides();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const updateNode = useUpdateModuleNode();
  const propagate = usePropagateToChildren();

  const [dialog, setDialog] = useState<PropagateDialogState>({
    open: false, node: null, field: 'is_deployed', newValue: false, descendantCount: 0,
  });

  const handleToggleDeploy = useCallback((node: RegistryNode) => {
    const newValue = !node.is_deployed;
    const descendants = getDescendantKeys(node);
    updateNode.mutate({ key: node.key, updates: { is_deployed: newValue } });
    if (descendants.length > 0) {
      setDialog({ open: true, node, field: 'is_deployed', newValue, descendantCount: descendants.length });
    }
  }, [updateNode]);

  const handleTogglePlan = useCallback((node: RegistryNode) => {
    const cycle: PlanLevel[] = ['STARTER', 'PRO', 'NONE'];
    const idx = cycle.indexOf(node.required_plan);
    const newValue: PlanLevel = cycle[(idx + 1) % cycle.length];
    const descendants = getDescendantKeys(node);
    updateNode.mutate({ key: node.key, updates: { required_plan: newValue } });
    if (descendants.length > 0) {
      setDialog({ open: true, node, field: 'required_plan', newValue, descendantCount: descendants.length });
    }
  }, [updateNode]);

  const handleChangeRole = useCallback((node: RegistryNode, newRole: number) => {
    const descendants = getDescendantKeys(node);
    updateNode.mutate({ key: node.key, updates: { min_role: newRole } });
    if (descendants.length > 0) {
      setDialog({ open: true, node, field: 'min_role', newValue: newRole, descendantCount: descendants.length });
    }
  }, [updateNode]);

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

  const getDialogDescription = () => {
    if (dialog.field === 'is_deployed') {
      return `Appliquer "${dialog.newValue ? 'Déployé' : 'Non déployé'}" aux ${dialog.descendantCount} descendants de "${dialog.node?.label}" ?`;
    }
    if (dialog.field === 'required_plan') {
      const planLabel = dialog.newValue === 'STARTER' ? 'Basique' : dialog.newValue === 'PRO' ? 'Pro' : 'Individuel';
      return `Appliquer le plan "${planLabel}" aux ${dialog.descendantCount} descendants de "${dialog.node?.label}" ?`;
    }
    const roleConfig = getRoleConfig(dialog.newValue as number);
    return `Appliquer le rôle minimum "${roleConfig.label}" aux ${dialog.descendantCount} descendants de "${dialog.node?.label}" ?`;
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

  return (
    <>
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
          {/* Header */}
          <div className={cn(
            `grid ${GRID_COLS} gap-2 items-center py-2 px-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide`
          )}>
            <div>Module</div>
            <div className="text-center">Type</div>
            <div className="text-center">Déployé</div>
            <div className="text-center">Plan min.</div>
            <div className="text-center">Effectif</div>
            <div className="text-center">Rôle</div>
            <div className="text-center">Privil.</div>
          </div>

          {flatNodes.map(node => (
            <ModuleRow
              key={node.key}
              node={node}
              overrides={overrides.get(node.key) ?? []}
              onToggleDeploy={handleToggleDeploy}
              onTogglePlan={handleTogglePlan}
              onChangeRole={handleChangeRole}
              isUpdating={updateNode.isPending || propagate.isPending}
            />
          ))}

          {flatNodes.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              Aucun module dans le registre. Vérifiez le seed de la migration.
            </div>
          )}
        </CardContent>
      </Card>

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

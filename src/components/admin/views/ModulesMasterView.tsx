/**
 * ModulesMasterView — Écran maître unique pour la gouvernance des modules
 * 
 * Affiche l'arbre module_registry avec :
 * - Nom (indenté par niveau)
 * - Type (section/screen/feature)
 * - Déployé (switch, valeur propre)
 * - Plan minimum (badge cliquable, valeur propre)
 * - Effectif (badge read-only)
 * - Rôle min. (badge dropdown cliquable)
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Layers, Monitor, Zap, TreePine, ChevronRight, CornerDownRight } from 'lucide-react';

// ============================================================================
// Role config for badges (matching the PJ screenshot)
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
  plan,
  onClick,
  readOnly = false,
  dimmed = false,
}: {
  plan: PlanLevel;
  onClick?: () => void;
  readOnly?: boolean;
  dimmed?: boolean;
}) {
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
  minRole,
  onChangeRole,
  dimmed = false,
  disabled = false,
}: {
  minRole: number;
  onChangeRole: (newRole: number) => void;
  dimmed?: boolean;
  disabled?: boolean;
}) {
  const config = getRoleConfig(minRole);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Badge
          variant="outline"
          className={cn(
            'text-[11px] cursor-pointer select-none transition-opacity font-medium px-2 py-0.5',
            'hover:opacity-80',
            dimmed && 'opacity-40',
            config.className
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
            className={cn(
              'text-xs cursor-pointer',
              rc.level === minRole && 'bg-accent font-semibold'
            )}
          >
            <Badge
              variant="outline"
              className={cn('text-[10px] mr-2 px-1.5 py-0', rc.className)}
            >
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
// Row component
// ============================================================================

interface ModuleRowProps {
  node: RegistryNode;
  onToggleDeploy: (node: RegistryNode) => void;
  onTogglePlan: (node: RegistryNode) => void;
  onChangeRole: (node: RegistryNode, newRole: number) => void;
  isUpdating: boolean;
}

function ModuleRow({ node, onToggleDeploy, onTogglePlan, onChangeRole, isUpdating }: ModuleRowProps) {
  const isNeutralized = !node.effectiveDeployed && node.is_deployed;

  const depthColors = [
    'text-primary',
    'text-blue-500',
    'text-violet-500',
    'text-emerald-500',
  ];
  const branchColor = depthColors[Math.min(node.depth, depthColors.length - 1)];

  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(200px,1fr)_80px_60px_80px_80px_60px] gap-2 items-center py-2 px-3 border-b border-border/50 text-sm',
        'hover:bg-muted/30 transition-colors',
        !node.effectiveDeployed && 'opacity-50',
        isNeutralized && 'bg-destructive/5',
        node.depth === 0 && 'bg-muted/20'
      )}
    >
      {/* Name with tree branch indicators */}
      <div
        className="flex items-center min-w-0"
        style={{ paddingLeft: `${node.depth * 16}px` }}
      >
        {node.depth > 0 && (
          <CornerDownRight className={cn('w-3.5 h-3.5 mr-1.5 shrink-0', branchColor)} />
        )}
        {node.depth === 0 && (
          <ChevronRight className={cn('w-4 h-4 mr-1.5 shrink-0', branchColor)} />
        )}
        <span className={cn(
          'truncate',
          node.depth === 0 && 'font-semibold text-foreground',
          node.depth === 1 && 'font-medium',
        )}>
          {node.label}
        </span>
      </div>

      {/* Node Type */}
      <div>
        <NodeTypeBadge nodeType={node.node_type} />
      </div>

      {/* Deploy Switch (stored value) */}
      <div className="flex justify-center">
        <Switch
          checked={node.is_deployed}
          onCheckedChange={() => onToggleDeploy(node)}
          disabled={isUpdating}
          className="scale-90"
        />
      </div>

      {/* Plan minimum (stored value, clickable) */}
      <div className="flex justify-center">
        <PlanBadge
          plan={node.required_plan}
          onClick={() => onTogglePlan(node)}
          dimmed={!node.effectiveDeployed}
        />
      </div>

      {/* Effective plan (read-only) */}
      <div className="flex justify-center">
        <PlanBadge plan={node.effectivePlan} readOnly dimmed={!node.effectiveDeployed} />
      </div>

      {/* Rôle min. (dropdown) */}
      <div className="flex justify-center">
        <RoleBadge
          minRole={node.min_role}
          onChangeRole={(newRole) => onChangeRole(node, newRole)}
          dimmed={!node.effectiveDeployed}
          disabled={isUpdating}
        />
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
  const updateNode = useUpdateModuleNode();
  const propagate = usePropagateToChildren();

  const [dialog, setDialog] = useState<PropagateDialogState>({
    open: false,
    node: null,
    field: 'is_deployed',
    newValue: false,
    descendantCount: 0,
  });

  const handleToggleDeploy = useCallback(
    (node: RegistryNode) => {
      const newValue = !node.is_deployed;
      const descendants = getDescendantKeys(node);
      updateNode.mutate({ key: node.key, updates: { is_deployed: newValue } });
      if (descendants.length > 0) {
        setDialog({ open: true, node, field: 'is_deployed', newValue, descendantCount: descendants.length });
      }
    },
    [updateNode]
  );

  const handleTogglePlan = useCallback(
    (node: RegistryNode) => {
      const cycle: PlanLevel[] = ['STARTER', 'PRO', 'NONE'];
      const idx = cycle.indexOf(node.required_plan);
      const newValue: PlanLevel = cycle[(idx + 1) % cycle.length];
      const descendants = getDescendantKeys(node);
      updateNode.mutate({ key: node.key, updates: { required_plan: newValue } });
      if (descendants.length > 0) {
        setDialog({ open: true, node, field: 'required_plan', newValue, descendantCount: descendants.length });
      }
    },
    [updateNode]
  );

  const handleChangeRole = useCallback(
    (node: RegistryNode, newRole: number) => {
      const descendants = getDescendantKeys(node);
      updateNode.mutate({ key: node.key, updates: { min_role: newRole } });
      if (descendants.length > 0) {
        setDialog({ open: true, node, field: 'min_role', newValue: newRole, descendantCount: descendants.length });
      }
    },
    [updateNode]
  );

  const handlePropagate = useCallback(() => {
    if (!dialog.node) return;
    const keys = getDescendantKeys(dialog.node);
    const updates =
      dialog.field === 'is_deployed'
        ? { is_deployed: dialog.newValue as boolean }
        : dialog.field === 'required_plan'
        ? { required_plan: dialog.newValue as PlanLevel }
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
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
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
            <CardTitle className="text-lg">Registre des Modules</CardTitle>
          </div>
          <CardDescription>
            Source de vérité unique. Chaque nœud porte son état de déploiement, son plan minimum requis et son rôle minimum.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-[minmax(200px,1fr)_80px_60px_80px_80px_60px] gap-2 items-center py-2 px-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <div>Module</div>
            <div className="text-center">Type</div>
            <div className="text-center">Déployé</div>
            <div className="text-center">Plan min.</div>
            <div className="text-center">Effectif</div>
            <div className="text-center">Rôle</div>
          </div>

          {/* Rows */}
          {flatNodes.map(node => (
            <ModuleRow
              key={node.key}
              node={node}
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

      {/* Propagation dialog */}
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

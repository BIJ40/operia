/**
 * ModulesMasterView — Écran maître unique pour la gouvernance des modules
 * 
 * Affiche l'arbre module_registry avec :
 * - Nom (indenté par niveau)
 * - Type (section/screen/feature)
 * - Déployé (switch, valeur propre)
 * - Plan minimum (badge cliquable, valeur propre)
 * - Effectif (badge read-only)
 * - État (hérité/surchargé)
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
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { Layers, Monitor, Zap, TreePine } from 'lucide-react';

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

function StatusIndicator({ node }: { node: RegistryNode }) {
  if (!node.effectiveDeployed && node.is_deployed) {
    return (
      <span className="text-[10px] text-destructive font-medium">
        neutralisé
      </span>
    );
  }
  if (node.isDeployOverridden) {
    return (
      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
        hérité
      </span>
    );
  }
  return null;
}

// ============================================================================
// Row component
// ============================================================================

interface ModuleRowProps {
  node: RegistryNode;
  onToggleDeploy: (node: RegistryNode) => void;
  onTogglePlan: (node: RegistryNode) => void;
  isUpdating: boolean;
}

function ModuleRow({ node, onToggleDeploy, onTogglePlan, isUpdating }: ModuleRowProps) {
  const isNeutralized = !node.effectiveDeployed && node.is_deployed;

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_80px_60px_80px_80px_80px] gap-2 items-center py-2 px-3 border-b border-border/50 text-sm',
        'hover:bg-muted/30 transition-colors',
        !node.effectiveDeployed && 'opacity-50',
        isNeutralized && 'bg-destructive/5'
      )}
    >
      {/* Name with indentation */}
      <div
        className="flex items-center gap-1.5 min-w-0"
        style={{ paddingLeft: `${node.depth * 20}px` }}
      >
        <span className={cn('truncate', node.depth === 0 && 'font-semibold')}>
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

      {/* Status indicator */}
      <div className="flex justify-center">
        <StatusIndicator node={node} />
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
  field: 'is_deployed' | 'required_plan';
  newValue: boolean | PlanLevel;
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

      // Update this node
      updateNode.mutate({ key: node.key, updates: { is_deployed: newValue } });

      // If has children, propose propagation
      if (descendants.length > 0) {
        setDialog({
          open: true,
          node,
          field: 'is_deployed',
          newValue,
          descendantCount: descendants.length,
        });
      }
    },
    [updateNode]
  );

  const handleTogglePlan = useCallback(
    (node: RegistryNode) => {
      const newValue: PlanLevel = node.required_plan === 'STARTER' ? 'PRO' : 'STARTER';
      const descendants = getDescendantKeys(node);

      // Update this node
      updateNode.mutate({ key: node.key, updates: { required_plan: newValue } });

      // If has children, propose propagation
      if (descendants.length > 0) {
        setDialog({
          open: true,
          node,
          field: 'required_plan',
          newValue,
          descendantCount: descendants.length,
        });
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
        : { required_plan: dialog.newValue as PlanLevel };
    propagate.mutate({ keys, updates });
    setDialog(prev => ({ ...prev, open: false }));
  }, [dialog, propagate]);

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
            Source de vérité unique. Chaque nœud porte son état de déploiement et son plan minimum requis.
            Les valeurs effectives sont calculées par héritage parent→enfant.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_60px_80px_80px_80px] gap-2 items-center py-2 px-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <div>Module</div>
            <div className="text-center">Type</div>
            <div className="text-center">Déployé</div>
            <div className="text-center">Plan min.</div>
            <div className="text-center">Effectif</div>
            <div className="text-center">État</div>
          </div>

          {/* Rows */}
          {flatNodes.map(node => (
            <ModuleRow
              key={node.key}
              node={node}
              onToggleDeploy={handleToggleDeploy}
              onTogglePlan={handleTogglePlan}
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
              {dialog.field === 'is_deployed'
                ? `Appliquer "${dialog.newValue ? 'Déployé' : 'Non déployé'}" aux ${dialog.descendantCount} descendants de "${dialog.node?.label}" ?`
                : `Appliquer le plan "${dialog.newValue === 'STARTER' ? 'Basique' : 'Pro'}" aux ${dialog.descendantCount} descendants de "${dialog.node?.label}" ?`}
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

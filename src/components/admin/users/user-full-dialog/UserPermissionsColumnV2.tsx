import React, { useState, useCallback } from 'react';
import { useUserPermissionsV2 } from '@/hooks/useUserPermissionsV2';
import { useUpsertUserAccess, useRemoveUserAccess, useUserAccessEntries } from '@/hooks/access-rights/useUserAccess';
import { useModuleCatalog, ModuleCatalogTree, filterDeployedOnly } from '@/hooks/access-rights/useModuleCatalog';
import { SOURCE_LABELS, PermissionSource } from '@/types/permissions-v2';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, ChevronRight, ChevronDown, Folder, FileText, Zap } from 'lucide-react';

const ROLE_LEVELS: Record<string, number> = {
  base_user: 0, franchisee_user: 1, franchisee_admin: 2,
  franchisor_user: 3, franchisor_admin: 4, platform_admin: 5, superadmin: 6,
};

// Icône selon le type de nœud
const NODE_ICON: Record<string, React.ElementType> = {
  section: Folder,
  screen: FileText,
  feature: Zap,
};

// Emoji catégorie pour les sections racines
const CATEGORY_EMOJI: Record<string, string> = {
  accueil: '🏠', pilotage: '📊', commercial: '💼', organisation: '🗂️',
  mediatheque: '📚', support: '🎧', ticketing: '🎫', admin: '⚙️',
};

interface Props {
  userId: string;
  userRole: string;
  editMode: boolean;
}

function flattenTree(nodes: ModuleCatalogTree[]): ModuleCatalogTree[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export function UserPermissionsColumnV2({ userId, userRole, editMode }: Props) {
  const userLevel = ROLE_LEVELS[userRole] ?? 0;
  const { data: permissions = [], isLoading: permLoad } = useUserPermissionsV2(userId);
  const { data: userAccessEntries = [], isLoading: accessLoad } = useUserAccessEntries(userId);
  const { tree, isLoading: modLoad } = useModuleCatalog();
  const upsert = useUpsertUserAccess();
  const remove = useRemoveUserAccess();

  // Optimistic local overrides: key → desired granted state
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  // Sections racines dépliées par défaut
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    return new Set(tree.filter(n => n.is_deployed).map(n => n.key));
  });

  const isLoading = permLoad || modLoad || accessLoad;

  const permMap = new Map(permissions.map(p => [p.module_key, p]));
  const accessMap = new Map(userAccessEntries.map(entry => [entry.module_key, entry]));

  const hasIndividualOverwrite = (key: string) => {
    const p = permMap.get(key);
    if (p) {
      return ['manual_exception', 'platform_assignment', 'agency_delegation'].includes(p.source_summary);
    }
    return ['manual_exception', 'platform_assignment', 'agency_delegation'].includes(accessMap.get(key)?.source ?? '');
  };

  const isGranted = (key: string) => {
    if (key in optimistic) return optimistic[key];
    if (permMap.has(key)) return permMap.get(key)?.granted ?? false;
    return accessMap.get(key)?.granted ?? false;
  };

  const isDenied = (key: string) => {
    if (key in optimistic) return !optimistic[key];
    const p = permMap.get(key);
    if (p != null) return !p.granted && p.source_summary === 'manual_exception';
    const access = accessMap.get(key);
    return access != null && !access.granted && access.source === 'manual_exception';
  };


  const getSource = (key: string): PermissionSource | null => {
    return (permMap.get(key)?.source_summary as PermissionSource)
      ?? (accessMap.get(key)?.source as PermissionSource)
      ?? null;
  };

  const toggleModule = useCallback((key: string, currentlyGranted: boolean) => {
    const newState = !currentlyGranted;
    // Optimistic update
    setOptimistic(prev => ({ ...prev, [key]: newState }));

    const onSettled = () => {
      // Clear optimistic state after mutation settles (success or error)
      setOptimistic(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    };

    if (currentlyGranted) {
      const source = getSource(key);
      const isManualException = source === 'manual_exception';
      if (isManualException) {
        // It was manually granted → just remove the row to revert to plan/platform state
        remove.mutate({ user_id: userId, module_key: key }, { onSettled });
      } else {
        // Granted via plan/platform/delegation → create explicit deny
        upsert.mutate({ user_id: userId, module_key: key, granted: false, access_level: 'none' }, { onSettled });
      }
    } else {
      const source = getSource(key);
      const isDenyException = source === 'manual_exception';
      if (isDenyException) {
        // It was manually denied → remove the deny to revert to plan/platform state
        remove.mutate({ user_id: userId, module_key: key }, { onSettled });
      } else {
        // Not granted at all → create explicit grant
        upsert.mutate({ user_id: userId, module_key: key, granted: true, access_level: 'full' }, { onSettled });
      }
    }
  }, [userId, upsert, remove, permMap, accessMap]);

  const toggleExpanded = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isLoading) return (
    <div className="flex-1 p-6 flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  const renderNode = (node: ModuleCatalogTree): React.ReactNode => {
    const granted = isGranted(node.key);
    const denied = isDenied(node.key);
    const belowMinRole = node.min_role > userLevel;
    const isExp = expanded.has(node.key);
    const hasChildren = node.children.length > 0;
    const hasOverwrite = hasIndividualOverwrite(node.key);
    const source = getSource(node.key);
    const isSection = node.node_type === 'section';
    const Icon = NODE_ICON[node.node_type] ?? FileText;
    const emoji = node.depth === 0 ? CATEGORY_EMOJI[node.category ?? ''] ?? '' : '';

    return (
      <div key={node.key}>
        {/* Node row */}
        <div
          className={`
            flex items-center justify-between py-1.5 rounded transition-colors
            ${belowMinRole ? 'opacity-35' : 'hover:bg-muted/40'}
            ${isSection && node.depth === 0 ? 'mt-1' : ''}
          `}
          style={{ paddingLeft: `${node.depth * 20 + 8}px`, paddingRight: '8px' }}
        >
          {/* Left: chevron + icon + label */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                onClick={() => toggleExpanded(node.key)}
                className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded hover:bg-muted/60"
              >
                {isExp
                  ? <ChevronDown className="h-3.5 w-3.5" />
                  : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-[18px] shrink-0" />
            )}

            <Icon className={`h-3.5 w-3.5 shrink-0 ${isSection ? 'text-primary' : 'text-muted-foreground'}`} />

            <div className="min-w-0 flex-1">
              <span className={`text-xs truncate block ${isSection ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                {emoji && <span className="mr-1">{emoji}</span>}
                {node.label}
              </span>
            </div>
          </div>

          {/* Right: badges + source + switch */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {hasOverwrite && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 text-amber-600 whitespace-nowrap">
                individuel
              </Badge>
            )}
            {denied && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-destructive text-destructive whitespace-nowrap">
                bloqué
              </Badge>
            )}
            {source && !isSection && granted && !denied && (
              <span className="text-[9px] text-muted-foreground whitespace-nowrap hidden sm:inline">
                {SOURCE_LABELS[source] ?? ''}
              </span>
            )}
            {editMode && !belowMinRole && !isSection ? (
              <Switch
                checked={granted && !denied}
                onCheckedChange={() => toggleModule(node.key, granted && !denied)}
                disabled={upsert.isPending || remove.isPending}
                className="scale-[0.65] ml-1"
              />
            ) : !isSection ? (
              <span className={`text-[11px] font-mono w-4 text-center ${granted && !denied ? 'text-green-600' : 'text-muted-foreground/40'}`}>
                {granted && !denied ? '✓' : '·'}
              </span>
            ) : null}
          </div>
        </div>

        {/* Children */}
        {isExp && hasChildren && (
          <div className={node.depth === 0 ? 'border-l border-border/50 ml-[18px]' : ''}>
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  const deployedTree = filterDeployedOnly(tree);
  const flatTree = flattenTree(tree);
  const deployedKeys = new Set(flattenTree(deployedTree).map(node => node.key));
  const nodeMap = new Map(flatTree.map(node => [node.key, node]));

  const getNodePath = (key: string) => {
    const parts: string[] = [];
    let current = nodeMap.get(key);

    while (current) {
      parts.unshift(current.label);
      if (!current.parent_key) break;
      current = nodeMap.get(current.parent_key);
    }

    return parts.join(' / ');
  };

  const hiddenAssignedModules = Array.from(new Set([
    ...permissions.map(permission => permission.module_key),
    ...userAccessEntries.map(entry => entry.module_key),
  ]))
    .map((key) => {
      const node = nodeMap.get(key);
      const active = isGranted(key) && !isDenied(key);
      const denied = isDenied(key);
      const hasRawOverride = accessMap.has(key);

      if (node && deployedKeys.has(key)) return null;
      if (node?.is_deployed) return null;
      if (!active && !denied && !hasRawOverride) return null;

      return {
        key,
        label: node?.label ?? key,
        path: node ? getNodePath(key) : key,
        existsInCatalog: Boolean(node),
        active,
        denied,
        hasRawOverride,
        source: getSource(key),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.path.localeCompare(b.path, 'fr'));

  // Compteurs
  const totalGranted = permissions.filter(p => p.granted && p.node_type !== 'section').length;
  const totalDenied = permissions.filter(p => !p.granted && p.source_summary === 'manual_exception').length;

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Permissions</h3>
          <Badge variant="outline" className="text-[10px]">V2</Badge>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="text-green-600 font-medium">{totalGranted} actifs</span>
          {totalDenied > 0 && (
            <span className="text-destructive font-medium">{totalDenied} bloqués</span>
          )}
          {hiddenAssignedModules.length > 0 && (
            <span className="font-medium">{hiddenAssignedModules.length} masqués</span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap text-[10px] text-muted-foreground mb-3 pb-2 border-b border-border/50">
        <span className="flex items-center gap-1"><Folder className="h-3 w-3 text-primary" /> Section</span>
        <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Écran</span>
        <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Feature</span>
      </div>

      {/* Tree */}
      <div className="space-y-0">
        {deployedTree.map(node => renderNode(node))}
      </div>

      {hiddenAssignedModules.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
          <div className="mb-3 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-foreground">Modules désactivés encore liés à cet utilisateur</h4>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{hiddenAssignedModules.length}</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Ces modules sont masqués de l’arbre principal car ils sont en développement ou désactivés dans le catalogue.
            </p>
          </div>

          <div className="space-y-2">
            {hiddenAssignedModules.map((module) => (
              <div
                key={module.key}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/80 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground">{module.label}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">désactivé</Badge>
                    {module.active && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">actif</Badge>
                    )}
                    {module.denied && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">bloqué</Badge>
                    )}
                    {module.hasRawOverride && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">override</Badge>
                    )}
                  </div>

                  <p className="mt-1 truncate text-[10px] text-muted-foreground">{module.path}</p>
                  {module.source && (
                    <p className="text-[10px] text-muted-foreground">Source : {SOURCE_LABELS[module.source] ?? module.source}</p>
                  )}
                  {!module.existsInCatalog && (
                    <p className="text-[10px] text-muted-foreground">Clé absente du catalogue : {module.key}</p>
                  )}
                </div>

                {editMode && (module.active || module.hasRawOverride) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (module.active) {
                        toggleModule(module.key, true);
                        return;
                      }

                      remove.mutate({ user_id: userId, module_key: module.key });
                    }}
                    disabled={upsert.isPending || remove.isPending}
                    className="inline-flex shrink-0 items-center rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {module.active ? 'Bloquer' : 'Nettoyer'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserPermissionsColumnV2;

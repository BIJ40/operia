import React, { useState } from 'react';
import { useUserPermissionsV2 } from '@/hooks/useUserPermissionsV2';
import { useUpsertUserAccess, useRemoveUserAccess } from '@/hooks/access-rights/useUserAccess';
import { useModuleCatalog, ModuleCatalogTree } from '@/hooks/access-rights/useModuleCatalog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, ChevronRight, ChevronDown } from 'lucide-react';

const ROLE_LEVELS: Record<string, number> = {
  base_user: 0, franchisee_user: 1, franchisee_admin: 2,
  franchisor_user: 3, franchisor_admin: 4, platform_admin: 5, superadmin: 6,
};

interface Props {
  userId: string;
  userRole: string;
  editMode: boolean;
}

export function UserPermissionsColumnV2({ userId, userRole, editMode }: Props) {
  const userLevel = ROLE_LEVELS[userRole] ?? 0;
  const { data: permissions = [], isLoading: permLoad } = useUserPermissionsV2(userId);
  const { tree, isLoading: modLoad } = useModuleCatalog();
  const upsert = useUpsertUserAccess();
  const remove = useRemoveUserAccess();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const isLoading = permLoad || modLoad;

  const permMap = new Map(permissions.map(p => [p.module_key, p]));

  const hasIndividualOverwrite = (key: string) => {
    const p = permMap.get(key);
    return p && ['manual_exception', 'platform_assignment', 'agency_delegation'].includes(p.source_summary);
  };

  const isGranted = (key: string) => permMap.get(key)?.granted ?? false;
  const isDenied = (key: string) => {
    const p = permMap.get(key);
    return p && !p.granted && p.source_summary === 'manual_exception';
  };

  const toggleModule = (key: string, currentlyGranted: boolean) => {
    if (currentlyGranted) {
      if (hasIndividualOverwrite(key)) {
        remove.mutate({ user_id: userId, module_key: key });
      } else {
        upsert.mutate({ user_id: userId, module_key: key, granted: false, access_level: 'none' });
      }
    } else {
      upsert.mutate({ user_id: userId, module_key: key, granted: true, access_level: 'full' });
    }
  };

  const toggleExpanded = (key: string) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  const renderNode = (node: ModuleCatalogTree): React.ReactNode => {
    const granted = isGranted(node.key);
    const denied = isDenied(node.key);
    const belowMinRole = node.min_role > userLevel;
    const isExpanded = expanded.has(node.key);
    const hasChildren = node.children.length > 0;
    const hasOverwrite = hasIndividualOverwrite(node.key);

    return (
      <div key={node.key} className={belowMinRole ? 'opacity-40' : ''}>
        <div
          className="flex items-center justify-between py-1.5 px-1 hover:bg-muted/30 rounded"
          style={{ paddingLeft: `${node.depth * 16 + 4}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                onClick={() => toggleExpanded(node.key)}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                {isExpanded
                  ? <ChevronDown className="h-3.5 w-3.5" />
                  : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <div className="min-w-0">
              <span className="text-xs font-medium text-foreground truncate block">
                {node.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{node.key}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasOverwrite && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 text-amber-600">
                individuel
              </Badge>
            )}
            {denied && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-destructive text-destructive">
                bloqué
              </Badge>
            )}
            {editMode && !belowMinRole ? (
              <Switch
                checked={granted && !denied}
                onCheckedChange={() => toggleModule(node.key, granted && !denied)}
                disabled={upsert.isPending || remove.isPending}
                className="scale-75"
              />
            ) : (
              <span className={`text-xs font-mono ${granted && !denied ? 'text-green-600' : 'text-muted-foreground'}`}>
                {granted && !denied ? '✓' : '—'}
              </span>
            )}
          </div>
        </div>

        {isExpanded && node.children.map(child => renderNode(child))}
      </div>
    );
  };

  const deployedTree = tree.filter(m => m.is_deployed);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Permissions</h4>
        <Badge variant="outline" className="text-[10px]">V2</Badge>
      </div>

      <div className="flex gap-2 flex-wrap text-[10px] text-muted-foreground">
        <span>🔶 overwrite individuel</span>
        <span>🔴 bloqué explicitement</span>
        <span>grisé = min_role non atteint</span>
      </div>

      <div className="border rounded-lg p-2 max-h-[500px] overflow-y-auto">
        {deployedTree.map(node => renderNode(node))}
      </div>
    </div>
  );
}

export default UserPermissionsColumnV2;

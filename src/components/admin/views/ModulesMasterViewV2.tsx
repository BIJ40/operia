import React, { useState } from 'react';
import { useModuleCatalog, ModuleCatalogTree } from '@/hooks/access-rights/useModuleCatalog';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ChevronRight, ChevronDown } from 'lucide-react';

const ROLE_LABELS: Record<number, string> = {
  0: 'Partenaire externe',
  1: 'Utilisateur agence',
  2: 'Dirigeant agence',
  3: 'Animateur réseau',
  4: 'Directeur réseau',
  5: 'Support avancé',
  6: 'Super-admin',
};

const NODE_TYPE_LABELS: Record<string, string> = {
  section: 'Section',
  screen: 'Module',
  feature: 'Outil',
};

function DistributionBadges({
  module,
  onToggle,
  canEdit,
}: {
  module: ModuleCatalogTree;
  onToggle: (field: 'via_plan' | 'via_agency_option' | 'via_user_assignment', value: boolean) => void;
  canEdit: boolean;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 py-0 ${canEdit ? 'cursor-pointer' : ''} ${
          module.via_plan
            ? 'bg-primary/10 text-primary border-primary/30'
            : 'bg-muted text-muted-foreground border-border'
        }`}
        onClick={() => canEdit && onToggle('via_plan', !module.via_plan)}
      >
        Plan
      </Badge>
      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 py-0 ${canEdit ? 'cursor-pointer' : ''} ${
          module.via_agency_option
            ? 'bg-accent text-accent-foreground border-accent'
            : 'bg-muted text-muted-foreground border-border'
        }`}
        onClick={() => canEdit && onToggle('via_agency_option', !module.via_agency_option)}
      >
        Option
      </Badge>
      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 py-0 ${canEdit ? 'cursor-pointer' : ''} ${
          module.via_user_assignment
            ? 'bg-secondary text-secondary-foreground border-secondary'
            : 'bg-muted text-muted-foreground border-border'
        }`}
        onClick={() => canEdit && onToggle('via_user_assignment', !module.via_user_assignment)}
      >
        Individuel
      </Badge>
    </div>
  );
}

function ModuleRow({
  module,
  isN6,
  onToggleDeployed,
  onToggleCore,
  onUpdateMinRole,
  onToggleDistribution,
}: {
  module: ModuleCatalogTree;
  isN6: boolean;
  onToggleDeployed: (key: string, value: boolean) => void;
  onToggleCore: (key: string, value: boolean) => void;
  onUpdateMinRole: (key: string, value: number) => void;
  onToggleDistribution: (key: string, field: 'via_plan' | 'via_agency_option' | 'via_user_assignment', value: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const indent = module.depth * 20;
  const hasChildren = module.children.length > 0;

  return (
    <>
      <tr className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${!module.effective_is_deployed ? 'opacity-50' : ''}`}>
        {/* Nom */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5" style={{ paddingLeft: indent }}>
            {hasChildren ? (
              <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-3.5" />
            )}
            <span className="text-sm font-medium text-foreground">{module.label}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{module.key}</span>
          </div>
        </td>

        {/* Type */}
        <td className="px-3 py-2 text-center">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {NODE_TYPE_LABELS[module.node_type] ?? module.node_type}
          </Badge>
        </td>

        {/* Déployé */}
        <td className="px-3 py-2 text-center">
          <Switch
            checked={module.is_deployed}
            onCheckedChange={(v) => isN6 && onToggleDeployed(module.key, v)}
            disabled={!isN6}
            className="scale-75"
          />
        </td>

        {/* Core */}
        <td className="px-3 py-2 text-center">
          {module.is_core ? (
            <Badge
              className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/30 cursor-pointer"
              variant="outline"
              onClick={() => isN6 && onToggleCore(module.key, false)}
            >
              Socle
            </Badge>
          ) : (
            <span
              className={`text-muted-foreground text-xs ${isN6 ? 'cursor-pointer hover:text-foreground' : ''}`}
              onClick={() => isN6 && onToggleCore(module.key, true)}
            >
              —
            </span>
          )}
        </td>

        {/* Rôle minimum */}
        <td className="px-3 py-2 text-center">
          <Select
            value={String(module.min_role)}
            onValueChange={(v) => onUpdateMinRole(module.key, Number(v))}
          >
            <SelectTrigger className="h-7 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([level, label]) => (
                <SelectItem key={level} value={level} className="text-xs">
                  N{level} — {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>

        {/* Distribution */}
        <td className="px-3 py-2">
          <DistributionBadges
            module={module}
            canEdit={isN6}
            onToggle={(field, value) => onToggleDistribution(module.key, field, value)}
          />
        </td>
      </tr>

      {/* Enfants */}
      {expanded && module.children.map(child => (
        <ModuleRow
          key={child.key}
          module={child}
          isN6={isN6}
          onToggleDeployed={onToggleDeployed}
          onToggleCore={onToggleCore}
          onUpdateMinRole={onUpdateMinRole}
          onToggleDistribution={onToggleDistribution}
        />
      ))}
    </>
  );
}

// Filtre récursif : ne garde que les nœuds déployés, en élagant les enfants non déployés
function filterDeployedOnly(nodes: ModuleCatalogTree[]): ModuleCatalogTree[] {
  return nodes
    .filter(n => n.is_deployed)
    .map(n => ({ ...n, children: filterDeployedOnly(n.children) }));
}

// Extrait tous les modules non déployés, y compris les enfants de parents déployés
function extractNonDeployed(nodes: ModuleCatalogTree[]): ModuleCatalogTree[] {
  const result: ModuleCatalogTree[] = [];
  for (const node of nodes) {
    if (!node.is_deployed) {
      result.push(node);
    } else {
      result.push(...extractNonDeployed(node.children));
    }
  }
  return result;
}

export function ModulesMasterViewV2() {
  const { globalRole, isAdmin } = usePermissionsBridge();
  const isN6 = globalRole === 'superadmin';
  const {
    tree, isLoading, error,
    toggleDeployed, toggleCore, updateMinRole, toggleDistribution,
  } = useModuleCatalog();

  const [showDev, setShowDev] = useState(false);

  const deployed = filterDeployedOnly(tree);
  const dev = extractNonDeployed(tree);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        Erreur lors du chargement du catalogue modules.
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Accès réservé aux administrateurs plateforme.
      </div>
    );
  }

  const handleToggleDeployed = (key: string, value: boolean) => {
    toggleDeployed.mutate({ key, value });
  };

  const handleToggleCore = (key: string, value: boolean) => {
    toggleCore.mutate({ key, value });
  };

  const handleUpdateMinRole = (key: string, value: number) => {
    updateMinRole.mutate({ key, value });
  };

  const handleToggleDistribution = (
    key: string,
    field: 'via_plan' | 'via_agency_option' | 'via_user_assignment',
    value: boolean
  ) => {
    toggleDistribution.mutate({ key, field, value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gestion des Droits</h2>
          <p className="text-sm text-muted-foreground">
            Source de vérité unique. Déploiement, plans, rôles et privilèges individuels sur chaque nœud.
          </p>
        </div>
        <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">
          V2
        </Badge>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto bg-card">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Nom</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-center">Type</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-center">Déployé</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-center">Core</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-center">Rôle min.</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Distribution</th>
            </tr>
          </thead>
          <tbody>
            {deployed.map(m => (
              <ModuleRow
                key={m.key}
                module={m}
                isN6={isN6}
                onToggleDeployed={handleToggleDeployed}
                onToggleCore={handleToggleCore}
                onUpdateMinRole={handleUpdateMinRole}
                onToggleDistribution={handleToggleDistribution}
              />
            ))}
          </tbody>
        </table>
      </div>

      {dev.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowDev(!showDev)}
            className="flex items-center gap-2 text-sm text-destructive/70 hover:text-destructive font-medium"
          >
            {showDev ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            🚧 En cours de développement ({dev.length})
          </button>

          {showDev && (
            <div className="border border-dashed border-border rounded-lg overflow-x-auto bg-muted/30">
              <table className="w-full text-left">
                <tbody>
                  {dev.map(m => (
                    <ModuleRow
                      key={m.key}
                      module={m}
                      isN6={isN6}
                      onToggleDeployed={handleToggleDeployed}
                      onToggleCore={handleToggleCore}
                      onUpdateMinRole={handleUpdateMinRole}
                      onToggleDistribution={handleToggleDistribution}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ModulesMasterViewV2;

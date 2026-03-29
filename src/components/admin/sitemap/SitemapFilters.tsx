import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, X, Filter } from "lucide-react";
import { SECTION_LABELS, type SitemapSection } from "@/config/sitemapData";
import { type GlobalRole } from "@/types/globalRoles";
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { MODULE_DEFINITIONS, type ModuleKey } from "@/types/modules";
import { useModuleLabels } from "@/hooks/useModuleLabels";
import { PLAN_LABELS } from "@/permissions/shared-constants";
type PlanKey = string;
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface SitemapFiltersState {
  search: string;
  section: SitemapSection | 'all';
  minRole: GlobalRole | 'all';
  moduleKey: ModuleKey | 'all';
  planRequired: PlanKey | 'all';
  showRedirects: boolean;
  showDynamic: boolean;
}

interface SitemapFiltersProps {
  filters: SitemapFiltersState;
  onChange: (filters: SitemapFiltersState) => void;
}

const ALL_ROLES: GlobalRole[] = [
  'base_user',
  'franchisee_user',
  'franchisee_admin',
  'franchisor_user',
  'franchisor_admin',
  'platform_admin',
  'superadmin',
];

const ALL_MODULES: ModuleKey[] = MODULE_DEFINITIONS.map(m => m.key);

const ALL_PLANS: PlanKey[] = Object.keys(PLAN_LABELS) as PlanKey[];

export function SitemapFilters({ filters, onChange }: SitemapFiltersProps) {
  const { getLabel } = useModuleLabels();
  const activeFiltersCount = [
    filters.section !== 'all',
    filters.minRole !== 'all',
    filters.moduleKey !== 'all',
    filters.planRequired !== 'all',
    !filters.showRedirects,
    !filters.showDynamic,
  ].filter(Boolean).length;

  const resetFilters = () => {
    onChange({
      search: '',
      section: 'all',
      minRole: 'all',
      moduleKey: 'all',
      planRequired: 'all',
      showRedirects: true,
      showDynamic: true,
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher path, label, composant..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9 pr-8"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6"
            onClick={() => onChange({ ...filters, search: '' })}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Section Filter */}
      <Select
        value={filters.section}
        onValueChange={(value) => onChange({ ...filters, section: value as SitemapSection | 'all' })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Section" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes sections</SelectItem>
          {Object.entries(SECTION_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Advanced Filters Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtres
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="font-medium">Filtres avancés</div>
            
            {/* Role Filter */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Rôle minimum</Label>
              <Select
                value={filters.minRole}
                onValueChange={(value) => onChange({ ...filters, minRole: value as GlobalRole | 'all' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {VISIBLE_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Module Filter */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Module requis</Label>
              <Select
                value={filters.moduleKey}
                onValueChange={(value) => onChange({ ...filters, moduleKey: value as ModuleKey | 'all' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les modules</SelectItem>
                  {ALL_MODULES.map((module) => (
                    <SelectItem key={module} value={module}>
                      {getLabel(module, module)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Plan Required Filter */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Plan requis</Label>
              <Select
                value={filters.planRequired}
                onValueChange={(value) => onChange({ ...filters, planRequired: value as PlanKey | 'all' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les plans</SelectItem>
                  {ALL_PLANS.map((plan) => (
                    <SelectItem key={plan} value={plan}>
                      {PLAN_LABELS[plan]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggle Redirects */}
            <div className="flex items-center justify-between">
              <Label htmlFor="show-redirects" className="text-sm">
                Afficher redirections
              </Label>
              <Switch
                id="show-redirects"
                checked={filters.showRedirects}
                onCheckedChange={(checked) => onChange({ ...filters, showRedirects: checked })}
              />
            </div>

            {/* Toggle Dynamic */}
            <div className="flex items-center justify-between">
              <Label htmlFor="show-dynamic" className="text-sm">
                Afficher routes dynamiques
              </Label>
              <Switch
                id="show-dynamic"
                checked={filters.showDynamic}
                onCheckedChange={(checked) => onChange({ ...filters, showDynamic: checked })}
              />
            </div>

            {/* Reset */}
            {activeFiltersCount > 0 && (
              <Button variant="ghost" className="w-full" onClick={resetFilters}>
                <X className="w-4 h-4 mr-2" />
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

import { useState, useMemo } from "react";
import { Map as MapIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  SitemapStats,
  SitemapFilters,
  SitemapTree,
  SitemapTable,
  SitemapMermaid,
  type SitemapFiltersState,
} from "@/components/admin/sitemap";
import { 
  SITEMAP_ROUTES, 
  type RouteMetadata,
  type SitemapSection 
} from "@/config/sitemapData";
import type { GlobalRole } from "@/types/globalRoles";
import type { ModuleKey } from "@/types/modules";
import { ROLE_HIERARCHY } from "@/permissions";

export default function AdminSitemap() {
  const [activeTab, setActiveTab] = useState<'tree' | 'table' | 'diagram'>('tree');
  const [filters, setFilters] = useState<SitemapFiltersState>({
    search: '',
    section: 'all',
    minRole: 'all',
    moduleKey: 'all',
    planRequired: 'all',
    showRedirects: true,
    showDynamic: true,
  });

  // Filter routes based on current filters
  const filteredRoutes = useMemo(() => {
    return SITEMAP_ROUTES.filter((route) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          route.path.toLowerCase().includes(searchLower) ||
          route.label.toLowerCase().includes(searchLower) ||
          route.component.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Section filter
      if (filters.section !== 'all' && route.section !== filters.section) {
        return false;
      }

      // Role filter - show routes requiring this role level or higher
      if (filters.minRole !== 'all') {
        const routeRoleLevel = route.guards.roleGuard 
          ? ROLE_LEVELS[route.guards.roleGuard.minRole] 
          : 0;
        const filterRoleLevel = ROLE_LEVELS[filters.minRole];
        if (routeRoleLevel < filterRoleLevel) return false;
      }

      // Module filter
      if (filters.moduleKey !== 'all') {
        if (route.guards.moduleGuard?.moduleKey !== filters.moduleKey) {
          return false;
        }
      }

      // Plan required filter
      if (filters.planRequired !== 'all') {
        if (route.planRequired !== filters.planRequired) {
          return false;
        }
      }

      // Redirect filter
      if (!filters.showRedirects && route.isRedirect) {
        return false;
      }

      // Dynamic filter
      if (!filters.showDynamic && route.isDynamic) {
        return false;
      }

      return true;
    });
  }, [filters]);

  // Group routes by section
  const groupedBySection = useMemo((): Map<SitemapSection, RouteMetadata[]> => {
    const grouped: Map<SitemapSection, RouteMetadata[]> = new Map();
    
    filteredRoutes.forEach((route) => {
      const existing = grouped.get(route.section) || [];
      grouped.set(route.section, [...existing, route]);
    });

    return grouped;
  }, [filteredRoutes]);

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <MapIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sitemap Routes</h1>
          <p className="text-muted-foreground">
            Arborescence complète des routes et permissions de l'application
          </p>
        </div>
      </div>

      {/* Stats */}
      <SitemapStats />

      {/* Main content */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="tree">Arborescence</TabsTrigger>
                <TabsTrigger value="table">Tableau</TabsTrigger>
                <TabsTrigger value="diagram">Diagramme</TabsTrigger>
              </TabsList>

              <SitemapFilters filters={filters} onChange={setFilters} />
            </div>

            <TabsContent value="tree" className="mt-0">
              <SitemapTree routes={filteredRoutes} groupedBySection={groupedBySection} />
            </TabsContent>

            <TabsContent value="table" className="mt-0">
              <SitemapTable routes={filteredRoutes} />
            </TabsContent>

            <TabsContent value="diagram" className="mt-0">
              <SitemapMermaid routes={filteredRoutes} groupedBySection={groupedBySection} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <h3 className="font-medium mb-3">Légende des couleurs</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>RoleGuard + ModuleGuard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>RoleGuard uniquement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              <span>ModuleGuard uniquement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Plan agence requis</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>Guard spécial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span>Route publique</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

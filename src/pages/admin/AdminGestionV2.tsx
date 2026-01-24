/**
 * Gestion V2 - Prototype basé sur le Sitemap
 * Exploration d'une interface unifiée pour la gestion des permissions
 */

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { SitemapStats } from '@/components/admin/sitemap/SitemapStats';
import { SitemapFilters, SitemapFiltersState } from '@/components/admin/sitemap/SitemapFilters';
import { SitemapTree } from '@/components/admin/sitemap/SitemapTree';
import { SitemapTable } from '@/components/admin/sitemap/SitemapTable';
import { SitemapMermaid } from '@/components/admin/sitemap/SitemapMermaid';
import { SITEMAP_ROUTES, RouteMetadata, SitemapSection } from '@/config/sitemapData';
import { TreePine, Table, BarChart3, MapIcon } from 'lucide-react';

export default function AdminGestionV2() {
  const [activeTab, setActiveTab] = useState('tree');
  const [filters, setFilters] = useState<SitemapFiltersState>({
    search: '',
    section: 'all',
    minRole: 'all',
    moduleKey: 'all',
    showRedirects: true,
    showDynamic: true,
  });

  // Filtrer les routes selon les critères
  const filteredRoutes = useMemo(() => {
    return SITEMAP_ROUTES.filter(route => {
      // Filtre recherche
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchPath = route.path.toLowerCase().includes(searchLower);
        const matchLabel = route.label?.toLowerCase().includes(searchLower);
        const matchComponent = route.component?.toLowerCase().includes(searchLower);
        if (!matchPath && !matchLabel && !matchComponent) return false;
      }

      // Filtre section
      if (filters.section !== 'all' && route.section !== filters.section) return false;

      // Filtre rôle minimum
      if (filters.minRole !== 'all' && route.guards.roleGuard?.minRole !== filters.minRole) return false;

      // Filtre module
      if (filters.moduleKey !== 'all' && route.guards.moduleGuard?.moduleKey !== filters.moduleKey) return false;

      // Filtre redirections
      if (!filters.showRedirects && route.isRedirect) return false;

      // Filtre dynamiques
      if (!filters.showDynamic && route.isDynamic) return false;

      return true;
    });
  }, [filters]);

  // Grouper par section
  const groupedBySection = useMemo((): Map<SitemapSection, RouteMetadata[]> => {
    const map = new Map<SitemapSection, RouteMetadata[]>();
    filteredRoutes.forEach(route => {
      const existing = map.get(route.section) || [];
      existing.push(route);
      map.set(route.section, existing);
    });
    return map;
  }, [filteredRoutes]);

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        title="Gestion V2 (Prototype)"
        subtitle="Exploration d'une interface unifiée basée sur le Sitemap"
        backTo="/admin"
        backLabel="Administration"
      />

      {/* Statistiques globales */}
      <SitemapStats />

      {/* Filtres */}
      <SitemapFilters filters={filters} onChange={setFilters} />

      {/* Onglets de visualisation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger value="tree" className="flex items-center gap-2 py-2">
            <TreePine className="h-4 w-4" />
            <span className="hidden sm:inline">Arborescence</span>
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2 py-2">
            <Table className="h-4 w-4" />
            <span className="hidden sm:inline">Tableau</span>
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center gap-2 py-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Graphique</span>
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2 py-2">
            <MapIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Carte</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree">
          <SitemapTree routes={filteredRoutes} groupedBySection={groupedBySection} />
        </TabsContent>

        <TabsContent value="table">
          <SitemapTable routes={filteredRoutes} />
        </TabsContent>

        <TabsContent value="chart">
          <SitemapMermaid routes={filteredRoutes} groupedBySection={groupedBySection} />
        </TabsContent>

        <TabsContent value="map">
          <div className="p-8 text-center text-muted-foreground border rounded-lg">
            <MapIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Vue carte interactive (à développer)</p>
            <p className="text-sm mt-2">Visualisation géographique des accès par rôle/module</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  SECTION_LABELS, 
  type RouteMetadata, 
  type SitemapSection,
  getAllSections 
} from "@/config/sitemapData";

interface SitemapMermaidProps {
  routes: RouteMetadata[];
  groupedBySection: Map<SitemapSection, RouteMetadata[]>;
}

export function SitemapMermaid({ routes, groupedBySection }: SitemapMermaidProps) {
  const diagram = useMemo(() => {
    const sections = Array.from(groupedBySection.keys());
    
    return {
      sections,
      stats: sections.map(section => ({
        section,
        label: SECTION_LABELS[section],
        count: groupedBySection.get(section)?.filter(r => !r.isRedirect).length || 0,
        redirects: groupedBySection.get(section)?.filter(r => r.isRedirect).length || 0,
      }))
    };
  }, [groupedBySection]);

  const colorMap: Record<SitemapSection, string> = {
    core: 'bg-slate-500',
    academy: 'bg-emerald-500',
    pilotage: 'bg-blue-500',
    rh: 'bg-purple-500',
    support: 'bg-cyan-500',
    reseau: 'bg-orange-500',
    projects: 'bg-pink-500',
    admin: 'bg-red-500',
    apporteur: 'bg-amber-500',
    dev: 'bg-gray-500',
    public: 'bg-gray-400',
  };

  const totalActive = routes.filter(r => !r.isRedirect).length;
  const totalRedirects = routes.filter(r => r.isRedirect).length;

  return (
    <div className="space-y-6">
      {/* Visual tree representation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Arborescence visuelle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            {/* Root */}
            <div className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium">
              Application Routes
            </div>
            
            {/* Connector line */}
            <div className="w-px h-6 bg-border" />
            
            {/* Horizontal connector */}
            <div className="relative w-full max-w-4xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] h-px bg-border" />
              
              {/* Section nodes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-6">
                {diagram.stats.map(({ section, label, count, redirects }) => (
                  <div key={section} className="flex flex-col items-center">
                    {/* Vertical connector */}
                    <div className="w-px h-4 bg-border -mt-4 mb-2" />
                    
                    {/* Section node */}
                    <div className="relative group">
                      <div className={`px-3 py-2 rounded-lg text-white text-sm font-medium text-center shadow-sm ${colorMap[section]}`}>
                        {label}
                      </div>
                      
                      {/* Count badge */}
                      <Badge 
                        variant="secondary" 
                        className="absolute -top-2 -right-2 text-xs"
                      >
                        {count}
                      </Badge>
                      
                      {/* Tooltip-like hover info */}
                      <div className="opacity-0 group-hover:opacity-100 absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-popover border rounded text-xs whitespace-nowrap z-10 transition-opacity">
                        {count} routes actives
                        {redirects > 0 && `, ${redirects} redirections`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalActive}</div>
            <div className="text-sm text-muted-foreground">Routes actives</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalRedirects}</div>
            <div className="text-sm text-muted-foreground">Redirections</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{diagram.sections.length}</div>
            <div className="text-sm text-muted-foreground">Sections</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{routes.filter(r => r.isDynamic).length}</div>
            <div className="text-sm text-muted-foreground">Routes dynamiques</div>
          </CardContent>
        </Card>
      </div>

      {/* Section breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Répartition par section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {diagram.stats.sort((a, b) => b.count - a.count).map(({ section, label, count, redirects }) => {
              const percentage = Math.round((count / totalActive) * 100);
              return (
                <div key={section} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground">
                      {count} routes ({percentage}%)
                      {redirects > 0 && ` + ${redirects} redir.`}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${colorMap[section]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

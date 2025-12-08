/**
 * WidgetLibrary - Bibliothèque de widgets disponibles avec gestion des droits
 */

import { useState, useMemo } from 'react';
import { useWidgetTemplatesWithEligibility, useUserWidgets, useAddWidget, useRemoveWidget, WidgetEligibility } from '@/hooks/useDashboard';
import { WidgetTemplate, WidgetType } from '@/types/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Check, 
  Search,
  TrendingUp,
  BarChart3,
  PieChart,
  List,
  Table,
  AlertTriangle,
  Ticket,
  FileText,
  Wrench,
  FolderOpen,
  Clock,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const ICONS: Record<string, React.ElementType> = {
  TrendingUp,
  BarChart3,
  PieChart,
  List,
  Table,
  AlertTriangle,
  Ticket,
  FileText,
  Wrench,
  FolderOpen,
  Clock,
  LayoutGrid,
};

const TYPE_LABELS: Record<WidgetType, string> = {
  kpi: 'KPIs',
  chart: 'Graphiques',
  list: 'Listes',
  table: 'Tableaux',
  alerts: 'Alertes',
  custom: 'Personnalisés',
};

const TYPE_COLORS: Record<WidgetType, string> = {
  kpi: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  chart: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  list: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  table: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  alerts: 'bg-red-500/10 text-red-700 border-red-500/30',
  custom: 'bg-gray-500/10 text-gray-700 border-gray-500/30',
};

const MODULE_LABELS: Record<string, string> = {
  pilotage_agence: 'Pilotage Agence',
  support: 'Support',
  rh: 'Ressources Humaines',
  help_academy: 'Help Academy',
  apogee_tickets: 'Gestion de Projet',
  reseau_franchiseur: 'Réseau Franchiseur',
};

const ROLE_LABELS: Record<number, string> = {
  0: 'Utilisateur',
  1: 'Utilisateur Agence',
  2: 'Admin Agence',
  3: 'Animateur Réseau',
  4: 'Directeur Réseau',
  5: 'Admin Plateforme',
  6: 'Super Admin',
};

export function WidgetLibrary() {
  const { data: eligibilityList, isLoading: templatesLoading } = useWidgetTemplatesWithEligibility();
  const { data: userWidgets } = useUserWidgets();
  const addWidget = useAddWidget();
  const removeWidget = useRemoveWidget();
  const { globalRole } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<WidgetType | 'all'>('all');

  const activeWidgetIds = useMemo(() => 
    new Set(userWidgets?.map(w => w.template_id) ?? []),
    [userWidgets]
  );

  // Only show eligible widgets - locked widgets are never displayed
  const filteredEligibility = useMemo(() => {
    if (!eligibilityList) return [];
    
    return eligibilityList.filter(e => {
      if (!e.isEligible) return false; // Never show locked widgets
      
      const t = e.template;
      const matchesSearch = search === '' || 
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase());
      const matchesType = selectedType === 'all' || t.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [eligibilityList, search, selectedType]);

  const eligibleCount = useMemo(() => 
    eligibilityList?.filter(e => e.isEligible).length ?? 0,
    [eligibilityList]
  );

  const groupedEligibility = useMemo(() => {
    const groups: Record<WidgetType, WidgetEligibility[]> = {
      kpi: [],
      chart: [],
      list: [],
      table: [],
      alerts: [],
      custom: [],
    };
    
    filteredEligibility.forEach(e => {
      groups[e.template.type].push(e);
    });
    
    return groups;
  }, [filteredEligibility]);

  const handleToggleWidget = (eligibility: WidgetEligibility) => {
    if (!eligibility.isEligible) return;
    
    const userWidget = userWidgets?.find(w => w.template_id === eligibility.template.id);
    
    if (userWidget) {
      removeWidget.mutate(userWidget.id);
    } else {
      addWidget.mutate({ templateId: eligibility.template.id });
    }
  };

  if (templatesLoading) {
    return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Banner */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium">{eligibleCount} widget(s) disponible(s)</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un widget..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as WidgetType | 'all')}>
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="kpi">KPIs</TabsTrigger>
            <TabsTrigger value="chart">Charts</TabsTrigger>
            <TabsTrigger value="list">Listes</TabsTrigger>
            <TabsTrigger value="alerts">Alertes</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Widget Grid */}
      {selectedType === 'all' ? (
        <div className="space-y-8">
          {(Object.keys(groupedEligibility) as WidgetType[]).map(type => {
            const widgets = groupedEligibility[type];
            if (widgets.length === 0) return null;
            
            return (
              <section key={type}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Badge variant="outline" className={TYPE_COLORS[type]}>
                    {TYPE_LABELS[type]}
                  </Badge>
                  <span className="text-muted-foreground text-sm font-normal">
                    ({widgets.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {widgets.map(eligibility => (
                    <WidgetCard
                      key={eligibility.template.id}
                      eligibility={eligibility}
                      isActive={activeWidgetIds.has(eligibility.template.id)}
                      onToggle={() => handleToggleWidget(eligibility)}
                      isLoading={addWidget.isPending || removeWidget.isPending}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEligibility.map(eligibility => (
            <WidgetCard
              key={eligibility.template.id}
              eligibility={eligibility}
              isActive={activeWidgetIds.has(eligibility.template.id)}
              onToggle={() => handleToggleWidget(eligibility)}
              isLoading={addWidget.isPending || removeWidget.isPending}
            />
          ))}
        </div>
      )}

      {filteredEligibility.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Aucun widget trouvé
        </div>
      )}
    </div>
  );
}

interface WidgetCardProps {
  eligibility: WidgetEligibility;
  isActive: boolean;
  onToggle: () => void;
  isLoading: boolean;
}

function WidgetCard({ eligibility, isActive, onToggle, isLoading }: WidgetCardProps) {
  const { template } = eligibility;
  const Icon = ICONS[template.icon] || LayoutGrid;

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      isActive && 'ring-2 ring-primary/50 bg-primary/5'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              TYPE_COLORS[template.type]
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <Badge variant="outline" className="text-xs mt-1">
                {TYPE_LABELS[template.type]}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="mb-4 line-clamp-2">
          {template.description || 'Aucune description'}
        </CardDescription>
        
        {/* Required modules display */}
        {template.required_modules && template.required_modules.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {template.required_modules.map(mod => (
              <Badge key={mod} variant="outline" className="text-xs">
                {MODULE_LABELS[mod] || mod}
              </Badge>
            ))}
          </div>
        )}
        
        <Button
          variant={isActive ? 'outline' : 'default'}
          size="sm"
          className="w-full"
          onClick={onToggle}
          disabled={isLoading}
        >
          {isActive ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Actif
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

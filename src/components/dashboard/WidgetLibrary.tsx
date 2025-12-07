/**
 * WidgetLibrary - Bibliothèque de widgets disponibles
 */

import { useState, useMemo } from 'react';
import { useWidgetTemplates, useUserWidgets, useAddWidget, useRemoveWidget } from '@/hooks/useDashboard';
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

export function WidgetLibrary() {
  const { data: templates, isLoading: templatesLoading } = useWidgetTemplates();
  const { data: userWidgets } = useUserWidgets();
  const addWidget = useAddWidget();
  const removeWidget = useRemoveWidget();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<WidgetType | 'all'>('all');

  const activeWidgetIds = useMemo(() => 
    new Set(userWidgets?.map(w => w.template_id) ?? []),
    [userWidgets]
  );

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    
    return templates.filter(t => {
      const matchesSearch = search === '' || 
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase());
      const matchesType = selectedType === 'all' || t.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [templates, search, selectedType]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<WidgetType, WidgetTemplate[]> = {
      kpi: [],
      chart: [],
      list: [],
      table: [],
      alerts: [],
      custom: [],
    };
    
    filteredTemplates.forEach(t => {
      groups[t.type].push(t);
    });
    
    return groups;
  }, [filteredTemplates]);

  const handleToggleWidget = (template: WidgetTemplate) => {
    const userWidget = userWidgets?.find(w => w.template_id === template.id);
    
    if (userWidget) {
      removeWidget.mutate(userWidget.id);
    } else {
      addWidget.mutate({ templateId: template.id });
    }
  };

  if (templatesLoading) {
    return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
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
          {(Object.keys(groupedTemplates) as WidgetType[]).map(type => {
            const widgets = groupedTemplates[type];
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
                  {widgets.map(template => (
                    <WidgetCard
                      key={template.id}
                      template={template}
                      isActive={activeWidgetIds.has(template.id)}
                      onToggle={() => handleToggleWidget(template)}
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
          {filteredTemplates.map(template => (
            <WidgetCard
              key={template.id}
              template={template}
              isActive={activeWidgetIds.has(template.id)}
              onToggle={() => handleToggleWidget(template)}
              isLoading={addWidget.isPending || removeWidget.isPending}
            />
          ))}
        </div>
      )}

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Aucun widget trouvé
        </div>
      )}
    </div>
  );
}

interface WidgetCardProps {
  template: WidgetTemplate;
  isActive: boolean;
  onToggle: () => void;
  isLoading: boolean;
}

function WidgetCard({ template, isActive, onToggle, isLoading }: WidgetCardProps) {
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

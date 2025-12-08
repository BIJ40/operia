import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WidgetTemplate } from '@/types/dashboard';
import { GLOBAL_ROLE_LABELS } from '@/types/globalRoles';
import { MODULE_DEFINITIONS, ModuleKey } from '@/types/modules';
import { 
  LayoutGrid, 
  Shield, 
  Package, 
  Check, 
  X, 
  Edit, 
  Save,
  ChevronDown,
  ChevronRight,
  BarChart3,
  TrendingUp,
  AlertCircle,
  List,
  Table,
  Puzzle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const WIDGET_TYPE_ICONS = {
  kpi: TrendingUp,
  chart: BarChart3,
  list: List,
  table: Table,
  alerts: AlertCircle,
  custom: Puzzle,
};

const ROLE_OPTIONS = [
  { value: 0, label: 'N0 - Utilisateur de base' },
  { value: 1, label: 'N1 - Salarié' },
  { value: 2, label: 'N2 - Dirigeant' },
  { value: 3, label: 'N3 - Franchiseur' },
  { value: 4, label: 'N4 - Franchiseur Admin' },
  { value: 5, label: 'N5 - Admin Plateforme' },
  { value: 6, label: 'N6 - Superadmin' },
];

const MODULE_OPTIONS = MODULE_DEFINITIONS.map(mod => ({
  value: mod.key,
  label: mod.label,
}));

interface EditingState {
  templateId: string;
  minRole: number;
  requiredModules: string[];
}

export default function AdminWidgets() {
  const queryClient = useQueryClient();
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['kpi', 'chart']));
  const [editing, setEditing] = useState<EditingState | null>(null);

  // Fetch all widget templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-widget-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('widget_templates')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as WidgetTemplate[];
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, minRole, requiredModules }: { id: string; minRole: number; requiredModules: string[] }) => {
      const { error } = await supabase
        .from('widget_templates')
        .update({ 
          min_global_role: minRole,
          required_modules: requiredModules,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-widget-templates'] });
      queryClient.invalidateQueries({ queryKey: ['widget-templates'] });
      toast.success('Widget mis à jour');
      setEditing(null);
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    },
  });

  // Group templates by type
  const templatesByType = templates.reduce((acc, t) => {
    if (!acc[t.type]) acc[t.type] = [];
    acc[t.type].push(t);
    return acc;
  }, {} as Record<string, WidgetTemplate[]>);

  const toggleType = (type: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const startEditing = (template: WidgetTemplate) => {
    setEditing({
      templateId: template.id,
      minRole: template.min_global_role,
      requiredModules: template.required_modules || [],
    });
  };

  const cancelEditing = () => setEditing(null);

  const saveEditing = () => {
    if (!editing) return;
    updateMutation.mutate({
      id: editing.templateId,
      minRole: editing.minRole,
      requiredModules: editing.requiredModules,
    });
  };

  const toggleModule = (mod: string) => {
    if (!editing) return;
    setEditing(prev => {
      if (!prev) return prev;
      const mods = prev.requiredModules.includes(mod)
        ? prev.requiredModules.filter(m => m !== mod)
        : [...prev.requiredModules, mod];
      return { ...prev, requiredModules: mods };
    });
  };

  // Stats
  const totalWidgets = templates.length;
  const widgetsByRole = templates.reduce((acc, t) => {
    acc[t.min_global_role] = (acc[t.min_global_role] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <div className="w-12 h-12 rounded-xl bg-helpconfort-blue/10 flex items-center justify-center">
          <LayoutGrid className="w-6 h-6 text-helpconfort-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Widgets</h1>
          <p className="text-sm text-muted-foreground">
            Configurez les permissions d'accès aux widgets du dashboard
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-helpconfort-blue/20">
          <CardHeader className="pb-2">
            <CardDescription>Total widgets</CardDescription>
            <CardTitle className="text-3xl">{totalWidgets}</CardTitle>
          </CardHeader>
        </Card>
        
        {ROLE_OPTIONS.slice(0, 3).map(role => (
          <Card key={role.value} className="border-helpconfort-blue/20">
            <CardHeader className="pb-2">
              <CardDescription>Accessibles N{role.value}+</CardDescription>
              <CardTitle className="text-3xl">
                {templates.filter(t => t.min_global_role <= role.value).length}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Legend */}
      <Card className="border-helpconfort-blue/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-helpconfort-blue" />
            Légende des permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map(role => (
            <Badge 
              key={role.value} 
              variant="outline"
              className="text-xs"
            >
              N{role.value}: {role.label.split(' - ')[1]}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {/* Widgets by Type */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-helpconfort-blue border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(templatesByType).map(([type, typeTemplates]) => {
            const TypeIcon = WIDGET_TYPE_ICONS[type as keyof typeof WIDGET_TYPE_ICONS] || Puzzle;
            const isExpanded = expandedTypes.has(type);

            return (
              <Card key={type} className="border-helpconfort-blue/20 overflow-hidden">
                <button
                  onClick={() => toggleType(type)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div className="w-8 h-8 rounded-lg bg-helpconfort-blue/10 flex items-center justify-center">
                    <TypeIcon className="w-4 h-4 text-helpconfort-blue" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-medium capitalize">{type}</h3>
                    <p className="text-xs text-muted-foreground">{typeTemplates.length} widget(s)</p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/50">
                    <UITable>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Widget</TableHead>
                          <TableHead>Rôle minimum</TableHead>
                          <TableHead>Modules requis</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {typeTemplates.map(template => {
                          const isEditing = editing?.templateId === template.id;

                          return (
                            <TableRow key={template.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{template.name}</p>
                                  <p className="text-xs text-muted-foreground">{template.description}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Select
                                    value={String(editing.minRole)}
                                    onValueChange={(v) => setEditing(prev => prev ? { ...prev, minRole: Number(v) } : prev)}
                                  >
                                    <SelectTrigger className="w-[180px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ROLE_OPTIONS.map(role => (
                                        <SelectItem key={role.value} value={String(role.value)}>
                                          N{role.value} - {role.label.split(' - ')[1]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant="secondary">
                                    N{template.min_global_role}+
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <div className="flex flex-wrap gap-2 max-w-[300px]">
                                    {MODULE_OPTIONS.map(mod => (
                                      <label
                                        key={mod.value}
                                        className={cn(
                                          "flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer text-xs",
                                          editing.requiredModules.includes(mod.value)
                                            ? "border-helpconfort-blue bg-helpconfort-blue/10"
                                            : "border-border hover:border-helpconfort-blue/50"
                                        )}
                                      >
                                        <Checkbox
                                          checked={editing.requiredModules.includes(mod.value)}
                                          onCheckedChange={() => toggleModule(mod.value)}
                                        />
                                        {mod.label}
                                      </label>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {(template.required_modules || []).length > 0 ? (
                                      template.required_modules.map(mod => (
                                        <Badge key={mod} variant="outline" className="text-xs">
                                          <Package className="w-3 h-3 mr-1" />
                                          {MODULE_DEFINITIONS.find(m => m.key === mod)?.label || mod}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Aucun</span>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={saveEditing}
                                      disabled={updateMutation.isPending}
                                    >
                                      <Check className="w-4 h-4 text-green-600" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={cancelEditing}
                                    >
                                      <X className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => startEditing(template)}
                                  >
                                    <Edit className="w-4 h-4 text-muted-foreground" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </UITable>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

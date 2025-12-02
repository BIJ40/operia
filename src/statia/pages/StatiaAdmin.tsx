/**
 * STATiA-BY-BIJ - Page d'administration des métriques
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, FlaskConical, Search, Settings, Plus } from 'lucide-react';
import { MetricDefinition } from '../types';
import { MetricTestPanel } from '../components/MetricTestPanel';
import { MetricCard } from '../components/MetricCard';
import { ApogeeSchemaViewer } from '../components/ApogeeSchemaViewer';
import { MetricBuilderDialog } from '../components/MetricBuilderDialog';
import { toast } from 'sonner';

export default function StatiaAdmin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const queryClient = useQueryClient();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['statia-metrics-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metrics_definitions')
        .select('*')
        .order('label');

      if (error) throw error;

      return (data || []).map(m => ({
        id: m.id,
        label: m.label,
        description_agence: m.description_agence ?? undefined,
        description_franchiseur: m.description_franchiseur ?? undefined,
        scope: m.scope as MetricDefinition['scope'],
        input_sources: m.input_sources as unknown as MetricDefinition['input_sources'],
        formula: m.formula as unknown as MetricDefinition['formula'],
        compute_hint: (m.compute_hint ?? 'auto') as MetricDefinition['compute_hint'],
        validation_status: m.validation_status as MetricDefinition['validation_status'],
        visibility: m.visibility as unknown as MetricDefinition['visibility'],
        cache_ttl_seconds: m.cache_ttl_seconds ?? 300,
        created_at: m.created_at ?? undefined,
        updated_at: m.updated_at ?? undefined,
      })) as MetricDefinition[];
    },
  });

  const filteredMetrics = metrics?.filter(m => {
    const matchesSearch = m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesScope = scopeFilter === 'all' || m.scope === scopeFilter;
    const matchesStatus = statusFilter === 'all' || m.validation_status === statusFilter;
    return matchesSearch && matchesScope && matchesStatus;
  }) ?? [];

  const selectedMetric = metrics?.find(m => m.id === selectedMetricId);

  const stats = {
    total: metrics?.length ?? 0,
    validated: metrics?.filter(m => m.validation_status === 'validated').length ?? 0,
    test: metrics?.filter(m => m.validation_status === 'test').length ?? 0,
    draft: metrics?.filter(m => m.validation_status === 'draft').length ?? 0,
  };

  // Mutation pour créer une métrique
  const createMetricMutation = useMutation({
    mutationFn: async (metric: MetricDefinition) => {
      const { error } = await supabase
        .from('metrics_definitions')
        .insert({
          id: metric.id,
          label: metric.label,
          description_agence: metric.description_agence,
          description_franchiseur: metric.description_franchiseur,
          scope: metric.scope,
          input_sources: metric.input_sources as any,
          formula: metric.formula as any,
          compute_hint: metric.compute_hint,
          validation_status: metric.validation_status,
          visibility: metric.visibility as any,
          cache_ttl_seconds: metric.cache_ttl_seconds,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statia-metrics-admin'] });
      toast.success('Métrique créée avec succès');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la création', { description: error.message });
    },
  });

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-helpconfort-blue">
          <CardHeader className="pb-2">
            <CardDescription>Total métriques</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardDescription>Validées</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.validated}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardDescription>En test</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{stats.test}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-muted-foreground">
          <CardHeader className="pb-2">
            <CardDescription>Brouillons</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">{stats.draft}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <Database className="h-4 w-4" />
            Catalogue
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Test
          </TabsTrigger>
          <TabsTrigger value="schema" className="gap-2">
            <Settings className="h-4 w-4" />
            Schéma Apogée
          </TabsTrigger>
        </TabsList>

        {/* Catalogue Tab */}
        <TabsContent value="list" className="space-y-4">
          {/* Filters + Actions */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une métrique..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={scopeFilter} onValueChange={setScopeFilter}>
                  <SelectTrigger className="w-[180px] bg-background">
                    <SelectValue placeholder="Scope" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">Tous les scopes</SelectItem>
                    <SelectItem value="agency">Agence</SelectItem>
                    <SelectItem value="franchiseur">Franchiseur</SelectItem>
                    <SelectItem value="apporteur">Apporteur</SelectItem>
                    <SelectItem value="tech">Technicien</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-background">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="validated">Validée</SelectItem>
                    <SelectItem value="test">En test</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => setBuilderOpen(true)} className="bg-helpconfort-blue hover:bg-helpconfort-blue/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle métrique
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Grid */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Chargement des métriques...
            </div>
          ) : filteredMetrics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune métrique trouvée
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMetrics.map((metric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  isSelected={selectedMetricId === metric.id}
                  onSelect={() => setSelectedMetricId(metric.id)}
                  onTest={() => {
                    setSelectedMetricId(metric.id);
                    setActiveTab('test');
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test">
          <MetricTestPanel
            metrics={metrics ?? []}
            selectedMetricId={selectedMetricId}
            onSelectMetric={setSelectedMetricId}
          />
        </TabsContent>

        {/* Schema Tab */}
        <TabsContent value="schema">
          <ApogeeSchemaViewer />
        </TabsContent>
      </Tabs>

      {/* Builder Dialog */}
      <MetricBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onSave={(metric) => createMetricMutation.mutate(metric)}
      />
    </div>
  );
}

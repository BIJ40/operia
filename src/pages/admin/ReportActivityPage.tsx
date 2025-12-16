import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Settings, History, FileText, Download, Eye, RefreshCw, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReportSettings {
  id?: string;
  agency_id: string | null;
  generation_day: number;
  generation_hour: string;
  enabled_sections: Record<string, boolean>;
  comparison_period: 'month' | 'year' | 'both';
  auto_email: boolean;
  extra_emails: string[];
  custom_note: string;
  ca_format: 'euro' | 'kilo';
}

interface MonthlyReport {
  id: string;
  agency_id: string;
  month: number;
  year: number;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  status: string;
  error_message: string | null;
  generated_at: string | null;
  created_at: string;
  agency?: { label: string; slug: string };
}

const DEFAULT_SECTIONS = {
  synthese: true,
  ca: true,
  techniciens: true,
  univers: true,
  apporteurs: true,
  sav: true,
  recouvrement: true,
  devis: true,
  interventions: true,
  actions: true,
};

const SECTION_LABELS: Record<string, string> = {
  synthese: 'Synthèse Dirigeant',
  ca: 'Performance CA',
  techniciens: 'Techniciens',
  univers: 'Univers',
  apporteurs: 'Apporteurs',
  sav: 'Qualité SAV',
  recouvrement: 'Recouvrement',
  devis: 'Pipeline Devis',
  interventions: 'Interventions',
  actions: 'Actions à Mener',
};

export default function ReportActivityPage() {
  const queryClient = useQueryClient();
  const [selectedAgency, setSelectedAgency] = useState<string>('global');
  const [activeTab, setActiveTab] = useState('settings');

  // Fetch agencies
  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies-for-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_agencies')
        .select('id, label, slug')
        .eq('is_active', true)
        .order('label');
      if (error) throw error;
      return data;
    },
  });

  // Fetch settings for selected agency
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['report-settings', selectedAgency],
    queryFn: async () => {
      if (selectedAgency === 'global') return null;
      const { data, error } = await supabase
        .from('report_settings')
        .select('*')
        .eq('agency_id', selectedAgency)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: selectedAgency !== 'global',
  });

  // Fetch reports history
  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['monthly-reports', selectedAgency],
    queryFn: async () => {
      let query = supabase
        .from('monthly_reports')
        .select('*, agency:apogee_agencies(label, slug)')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(50);

      if (selectedAgency !== 'global') {
        query = query.eq('agency_id', selectedAgency);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MonthlyReport[];
    },
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<ReportSettings>) => {
      if (selectedAgency === 'global') throw new Error('Sélectionnez une agence');
      
      const payload = {
        agency_id: selectedAgency,
        ...newSettings,
      };

      const { data, error } = await supabase
        .from('report_settings')
        .upsert(payload, { onConflict: 'agency_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Paramètres enregistrés');
      queryClient.invalidateQueries({ queryKey: ['report-settings'] });
    },
    onError: (error) => {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
    },
  });

  // Generate report mutation
  const generateMutation = useMutation({
    mutationFn: async ({ agencySlug, month, year, preview }: { agencySlug: string; month: number; year: number; preview?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('generate-monthly-report', {
        body: { agencySlug, month, year, preview },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      if (variables.preview) {
        // Open preview in new tab
        const blob = new Blob([data], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        toast.success('Rapport généré avec succès');
        queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
      }
    },
    onError: (error) => {
      toast.error('Erreur lors de la génération');
      console.error(error);
    },
  });

  // Download report
  const downloadReport = async (report: MonthlyReport) => {
    if (!report.file_path) {
      toast.error('Fichier non disponible');
      return;
    }

    const { data, error } = await supabase.storage
      .from('monthly-reports')
      .createSignedUrl(report.file_path, 3600);

    if (error || !data?.signedUrl) {
      toast.error('Erreur lors du téléchargement');
      return;
    }

    window.open(data.signedUrl, '_blank');
  };

  // Form state for settings
  const [formSettings, setFormSettings] = useState<Partial<ReportSettings>>({
    generation_day: 10,
    generation_hour: '08:00',
    enabled_sections: DEFAULT_SECTIONS,
    comparison_period: 'both',
    auto_email: true,
    extra_emails: [],
    custom_note: '',
    ca_format: 'euro',
  });

  // Update form when settings load
  useState(() => {
    if (settings) {
      setFormSettings({
        generation_day: settings.generation_day,
        generation_hour: settings.generation_hour,
        enabled_sections: settings.enabled_sections as Record<string, boolean>,
        comparison_period: settings.comparison_period as 'month' | 'year' | 'both',
        auto_email: settings.auto_email,
        extra_emails: settings.extra_emails || [],
        custom_note: settings.custom_note || '',
        ca_format: settings.ca_format as 'euro' | 'kilo',
      });
    }
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const selectedAgencyData = agencies.find(a => a.id === selectedAgency);

  return (
    <div className="container max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rapports d'Activité</h1>
          <p className="text-sm text-muted-foreground">Configuration et historique des rapports mensuels</p>
        </div>
      </div>

      {/* Agency Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sélectionner une agence</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedAgency} onValueChange={setSelectedAgency}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Choisir une agence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">🌐 Vue globale (toutes agences)</SelectItem>
              {agencies.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Paramètres
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          {selectedAgency === 'global' ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center py-8">
                  Sélectionnez une agence pour configurer ses paramètres de rapport
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Generation Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Génération automatique</CardTitle>
                  <CardDescription>Configuration de la génération mensuelle</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Jour de génération (1-28)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        value={formSettings.generation_day}
                        onChange={(e) => setFormSettings(s => ({ ...s, generation_day: parseInt(e.target.value) || 10 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Heure de génération</Label>
                      <Input
                        type="time"
                        value={formSettings.generation_hour}
                        onChange={(e) => setFormSettings(s => ({ ...s, generation_hour: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Envoi email automatique</Label>
                      <p className="text-sm text-muted-foreground">Envoyer le rapport aux N2+ de l'agence</p>
                    </div>
                    <Switch
                      checked={formSettings.auto_email}
                      onCheckedChange={(checked) => setFormSettings(s => ({ ...s, auto_email: checked }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Format montants</Label>
                    <Select
                      value={formSettings.ca_format}
                      onValueChange={(v) => setFormSettings(s => ({ ...s, ca_format: v as 'euro' | 'kilo' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="euro">Euros (1 234,56 €)</SelectItem>
                        <SelectItem value="kilo">Kilo-euros (1,2 k€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Sections */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sections du rapport</CardTitle>
                  <CardDescription>Activez ou désactivez les sections incluses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(SECTION_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                        <span className="text-sm">{label}</span>
                        <Switch
                          checked={formSettings.enabled_sections?.[key] ?? true}
                          onCheckedChange={(checked) => setFormSettings(s => ({
                            ...s,
                            enabled_sections: { ...s.enabled_sections, [key]: checked },
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Custom Note */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Note personnalisée</CardTitle>
                  <CardDescription>Texte affiché en fin de rapport</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Message optionnel à inclure dans le rapport..."
                    value={formSettings.custom_note}
                    onChange={(e) => setFormSettings(s => ({ ...s, custom_note: e.target.value }))}
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => saveSettingsMutation.mutate(formSettings)}
                  disabled={saveSettingsMutation.isPending}
                >
                  {saveSettingsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enregistrer les paramètres
                </Button>

                <Button
                  variant="outline"
                  onClick={() => selectedAgencyData && generateMutation.mutate({
                    agencySlug: selectedAgencyData.slug,
                    month: currentMonth === 1 ? 12 : currentMonth - 1,
                    year: currentMonth === 1 ? currentYear - 1 : currentYear,
                    preview: true,
                  })}
                  disabled={!selectedAgencyData || generateMutation.isPending}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Prévisualiser (mois précédent)
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => selectedAgencyData && generateMutation.mutate({
                    agencySlug: selectedAgencyData.slug,
                    month: currentMonth === 1 ? 12 : currentMonth - 1,
                    year: currentMonth === 1 ? currentYear - 1 : currentYear,
                  })}
                  disabled={!selectedAgencyData || generateMutation.isPending}
                >
                  {generateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Générer maintenant
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Historique des rapports
              </CardTitle>
              <CardDescription>
                {selectedAgency === 'global' ? 'Tous les rapports générés' : `Rapports de l'agence sélectionnée`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReports ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : reports.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Aucun rapport généré</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Période</TableHead>
                      {selectedAgency === 'global' && <TableHead>Agence</TableHead>}
                      <TableHead>Statut</TableHead>
                      <TableHead>Généré le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {format(new Date(report.year, report.month - 1), 'MMMM yyyy', { locale: fr })}
                        </TableCell>
                        {selectedAgency === 'global' && (
                          <TableCell>{report.agency?.label || 'N/A'}</TableCell>
                        )}
                        <TableCell>
                          <Badge variant={
                            report.status === 'completed' ? 'default' :
                            report.status === 'failed' ? 'destructive' :
                            'secondary'
                          }>
                            {report.status === 'completed' ? '✅ Généré' :
                             report.status === 'failed' ? '❌ Erreur' :
                             report.status === 'generating' ? '⏳ En cours' : '🕐 En attente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.generated_at
                            ? format(new Date(report.generated_at), 'dd/MM/yyyy HH:mm', { locale: fr })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {report.file_path && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadReport(report)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => report.agency && generateMutation.mutate({
                                agencySlug: report.agency.slug,
                                month: report.month,
                                year: report.year,
                              })}
                              disabled={generateMutation.isPending}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { FileText, Download, Loader2, Calendar, TrendingUp, Play } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  metrics_snapshot: any;
}

export default function MonthlyReportsPage() {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch reports for current agency
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['my-monthly-reports', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      
      const { data, error } = await supabase
        .from('monthly_reports')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('status', 'completed')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data as MonthlyReport[];
    },
    enabled: !!agencyId,
  });

  // Generate report manually for current agency
  const handleGenerateReport = async () => {
    if (!agencyId) {
      toast.error('Aucune agence sélectionnée');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-monthly-reports', {
        headers: {
          'X-CRON-SECRET': '9f3c8a1d6e4b52a0c7f9d81e6b4a2f0c5e9d3a7b8c1f4e2a6d0b9c5f7e1a4'
        },
        body: { agency_id: agencyId }
      });

      if (error) throw error;

      if (data?.generated > 0) {
        toast.success('Rapport généré avec succès');
      } else if (data?.failed > 0) {
        toast.error('Échec de la génération', {
          description: data?.errors?.[0]?.error || 'Erreur inconnue'
        });
      } else {
        toast.warning('Aucun rapport généré');
      }

      // Refresh reports list after a delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['my-monthly-reports'] });
      }, 5000);
    } catch (err) {
      console.error('Error generating reports:', err);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (!agencyId) {
    return (
      <div className="container max-w-4xl mx-auto p-4 sm:p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">
              Vous n'êtes pas rattaché à une agence
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rapports d'Activité</h1>
            <p className="text-sm text-muted-foreground">Consultez vos rapports mensuels</p>
          </div>
        </div>
        <Button onClick={handleGenerateReport} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Générer maintenant
        </Button>
      </div>

      {/* Last Report Summary */}
      {reports.length > 0 && reports[0].metrics_snapshot && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Dernier rapport - {format(new Date(reports[0].year, reports[0].month - 1), 'MMMM yyyy', { locale: fr })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(reports[0].metrics_snapshot?.ca?.period || 0)}
                </div>
                <div className="text-sm text-muted-foreground">CA HT</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-foreground">
                  {reports[0].metrics_snapshot?.interventions?.count || 0}
                </div>
                <div className="text-sm text-muted-foreground">Interventions</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-foreground">
                  {reports[0].metrics_snapshot?.devis?.count || 0}
                </div>
                <div className="text-sm text-muted-foreground">Devis</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-foreground">
                  {(reports[0].metrics_snapshot?.sav?.rate || 0).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Taux SAV</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Historique (12 derniers mois)
          </CardTitle>
          <CardDescription>
            Téléchargez vos rapports d'activité mensuels au format PDF
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Aucun rapport disponible</p>
              <p className="text-sm text-muted-foreground mt-1">
                Les rapports sont générés automatiquement le 10 de chaque mois
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead>Généré le</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {format(new Date(report.year, report.month - 1), 'MMMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {report.generated_at
                        ? format(new Date(report.generated_at), 'dd/MM/yyyy', { locale: fr })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {formatFileSize(report.file_size)}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.file_path ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReport(report)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Télécharger
                        </Button>
                      ) : (
                        <Badge variant="secondary">Non disponible</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

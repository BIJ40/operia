/**
 * Section Contrat & Salaire simplifiée
 * - Heures hebdo éditables directement
 * - Lien vers document contrat (médiathèque)
 * - Historique salaire avec taux horaire + graphique évolution
 */

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Clock,
  FileText,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BarChart3,
  X,
} from 'lucide-react';
import { useEmploymentContracts, useSalaryHistory } from '@/hooks/useEmploymentContracts';
import { useHasMinLevel } from '@/hooks/useHasGlobalRole';
import { supabase } from '@/integrations/supabase/client';
import { monitorEdgeCall } from '@/lib/edge-monitor';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import type { RHCollaborator } from '@/types/rh-suivi';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface RHContractSalarySimpleProps {
  collaborator: RHCollaborator;
}

export function RHContractSalarySimple({ collaborator }: RHContractSalarySimpleProps) {
  const canManage = useHasMinLevel(2);
  
  // Contract & Salary hooks
  const {
    currentContract,
    isLoading: isLoadingContracts,
    createContract,
    updateContract,
  } = useEmploymentContracts(collaborator.id);

  const {
    history: salaryHistory,
    currentSalary,
    isLoading: isLoadingSalary,
    createSalaryEntry,
    updateSalaryEntry,
    deleteSalaryEntry,
  } = useSalaryHistory(currentContract?.id);

  // Local state
  const [weeklyHours, setWeeklyHours] = useState<string>('');
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [showSalaryTable, setShowSalaryTable] = useState(false);
  const [showSalaryChart, setShowSalaryChart] = useState(false);
  const [showSalaryDialog, setShowSalaryDialog] = useState(false);
  const [editingSalary, setEditingSalary] = useState<typeof currentSalary | null>(null);
  const [deletingSalaryId, setDeletingSalaryId] = useState<string | null>(null);

  // Sync weekly hours from contract
  useEffect(() => {
    if (currentContract?.weekly_hours) {
      setWeeklyHours(currentContract.weekly_hours.toString());
    }
  }, [currentContract?.weekly_hours]);

  // Type for contract document
  type ContractDoc = { id: string; file_name: string; storage_path: string; mime_type: string } | null;

  // Fetch latest contract document from media library (search by filename pattern)
  const { data: contractDocument } = useQuery({
    queryKey: ['contract-document', collaborator.id, collaborator.agency_id],
    queryFn: async (): Promise<ContractDoc> => {
      // Search for contract-like documents for this collaborator
      const collaboratorName = `${collaborator.last_name || ''} ${collaborator.first_name || ''}`.trim().toLowerCase();
      
      const { data: assets } = await supabase
        .from('media_assets')
        .select('id, file_name, storage_path, mime_type')
        .eq('agency_id', collaborator.agency_id)
        .ilike('file_name', '%contrat%')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!assets || assets.length === 0) return null;

      // Try to find a contract matching the collaborator name
      const match = assets.find(a => 
        a.file_name?.toLowerCase().includes(collaborator.last_name?.toLowerCase() || '')
      );
      
      return (match || assets[0]) as ContractDoc;
    },
    enabled: !!collaborator.id && !!collaborator.agency_id,
  });



  // Handle weekly hours save
  const handleSaveWeeklyHours = async () => {
    const hours = parseFloat(weeklyHours);
    if (isNaN(hours) || hours <= 0 || hours > 60) {
      toast.error('Heures hebdo invalides (1-60)');
      return;
    }

    try {
      if (currentContract) {
        await updateContract.mutateAsync({
          id: currentContract.id,
          data: { weekly_hours: hours },
        });
      } else {
        // Create minimal contract with just weekly hours
        await createContract.mutateAsync({
          collaborator_id: collaborator.id,
          contract_type: 'CDI',
          start_date: collaborator.hiring_date || new Date().toISOString().split('T')[0],
          end_date: null,
          weekly_hours: hours,
          job_title: collaborator.role || null,
          job_category: collaborator.type || null,
          is_current: true,
        });
      }
      setIsEditingHours(false);
      toast.success('Heures hebdo mises à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: fr });
  };

  // Chart data
  const chartData = useMemo(() => {
    if (!salaryHistory || salaryHistory.length === 0) return [];
    return [...salaryHistory]
      .reverse()
      .filter((s) => s.hourly_rate)
      .map((s) => ({
        date: format(new Date(s.effective_date), 'MMM yyyy', { locale: fr }),
        taux: s.hourly_rate,
      }));
  }, [salaryHistory]);

  // Open document in new tab
  const handleOpenDocument = async () => {
    if (!contractDocument?.id) return;
    
    // Get signed URL via asset_id (required by Edge Function)
    const { data } = await monitorEdgeCall('media-get-signed-url', () =>
      supabase.functions.invoke('media-get-signed-url', {
        body: { asset_id: contractDocument.id },
      })
    );
    
    if (data?.url) {
      window.open(data.url, '_blank');
    } else {
      toast.error('Impossible d\'ouvrir le document');
    }
  };

  if (isLoadingContracts) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section 1: Heures hebdo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Durée hebdo</span>
        </div>
        
        {isEditingHours ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              className="w-20 h-8 text-sm"
              min={1}
              max={60}
              step={0.5}
            />
            <span className="text-sm text-muted-foreground">h/sem</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={handleSaveWeeklyHours}
              disabled={updateContract.isPending || createContract.isPending}
            >
              {(updateContract.isPending || createContract.isPending) ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                '✓'
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => {
                setIsEditingHours(false);
                setWeeklyHours(currentContract?.weekly_hours?.toString() || '');
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {currentContract?.weekly_hours ? `${currentContract.weekly_hours}h` : 'Non défini'}
            </Badge>
            {canManage && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setIsEditingHours(true)}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Section 2: Document contrat */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Document contrat</span>
        </div>
        
        {contractDocument ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleOpenDocument}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            {contractDocument.file_name?.substring(0, 20)}...
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Aucun document</span>
        )}
      </div>

      <Separator />

      {/* Section 3: Taux horaire actuel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Taux horaire</span>
          </div>
          
          <div className="flex items-center gap-2">
            {currentSalary?.hourly_rate ? (
              <Badge variant="default" className="font-mono text-sm">
                {currentSalary.hourly_rate.toFixed(2)} €/h
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Non défini</span>
            )}
            
            {/* Toggle table */}
            {salaryHistory && salaryHistory.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => setShowSalaryTable(!showSalaryTable)}
                    >
                      {showSalaryTable ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Voir l'historique</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Toggle chart */}
            {chartData.length > 1 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={showSalaryChart ? 'secondary' : 'ghost'}
                      className="h-6 w-6 p-0"
                      onClick={() => setShowSalaryChart(!showSalaryChart)}
                    >
                      <BarChart3 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Voir la courbe d'évolution</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Add new entry */}
            {canManage && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setEditingSalary(null);
                        setShowSalaryDialog(true);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Nouvelle entrée salaire</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Salary Chart */}
        {showSalaryChart && chartData.length > 1 && (
          <div className="h-32 w-full mt-2 bg-muted/30 rounded-md p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  domain={['dataMin - 1', 'dataMax + 1']}
                  className="text-muted-foreground"
                />
                <RechartsTooltip
                  formatter={(value: number) => [`${value.toFixed(2)} €/h`, 'Taux']}
                  labelStyle={{ color: 'var(--foreground)' }}
                  contentStyle={{ 
                    backgroundColor: 'var(--popover)', 
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="taux"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Salary Table */}
        {showSalaryTable && salaryHistory && salaryHistory.length > 0 && (
          <div className="mt-2 border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-right px-3 py-2 font-medium">Taux horaire</th>
                  {canManage && <th className="w-16"></th>}
                </tr>
              </thead>
              <tbody>
                {salaryHistory.map((entry, index) => (
                  <tr 
                    key={entry.id} 
                    className={`border-t ${index === 0 ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-3 py-2">
                      {formatDate(entry.effective_date)}
                      {index === 0 && (
                        <Badge variant="outline" className="ml-2 text-[10px] px-1">
                          Actuel
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {entry.hourly_rate ? `${entry.hourly_rate.toFixed(2)} €` : '-'}
                    </td>
                    {canManage && (
                      <td className="px-2 py-2">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setEditingSalary(entry);
                              setShowSalaryDialog(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setDeletingSalaryId(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Salary Dialog - Simplified */}
      <Dialog open={showSalaryDialog} onOpenChange={setShowSalaryDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingSalary ? 'Modifier le taux' : 'Nouveau taux horaire'}
            </DialogTitle>
          </DialogHeader>
          <SalaryForm
            contractId={currentContract?.id}
            collaboratorId={collaborator.id}
            hiringDate={collaborator.hiring_date}
            salary={editingSalary}
            onSave={async (data) => {
              if (editingSalary) {
                await updateSalaryEntry.mutateAsync({ id: editingSalary.id, data });
              } else {
                // Ensure contract exists before adding salary
                let contractId = currentContract?.id;
                if (!contractId) {
                  const newContract = await createContract.mutateAsync({
                    collaborator_id: collaborator.id,
                    contract_type: 'CDI',
                    start_date: collaborator.hiring_date || new Date().toISOString().split('T')[0],
                    end_date: null,
                    weekly_hours: 35,
                    job_title: collaborator.role || null,
                    job_category: collaborator.type || null,
                    is_current: true,
                  });
                  contractId = newContract.id;
                }
                await createSalaryEntry.mutateAsync({ ...data, contract_id: contractId });
              }
              setShowSalaryDialog(false);
              setEditingSalary(null);
            }}
            isSaving={createSalaryEntry.isPending || updateSalaryEntry.isPending}
            onCancel={() => {
              setShowSalaryDialog(false);
              setEditingSalary(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSalaryId} onOpenChange={() => setDeletingSalaryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingSalaryId) {
                  deleteSalaryEntry.mutate(deletingSalaryId);
                  setDeletingSalaryId(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Simplified Salary Form
function SalaryForm({
  contractId,
  collaboratorId,
  hiringDate,
  salary,
  onSave,
  isSaving,
  onCancel,
}: {
  contractId?: string;
  collaboratorId: string;
  hiringDate: string | null;
  salary: any;
  onSave: (data: any) => Promise<void>;
  isSaving: boolean;
  onCancel: () => void;
}) {
  const [effectiveDate, setEffectiveDate] = useState(
    salary?.effective_date || new Date().toISOString().split('T')[0]
  );
  const [hourlyRate, setHourlyRate] = useState(salary?.hourly_rate?.toString() || '');

  const handleSubmit = async () => {
    if (!effectiveDate || !hourlyRate) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    await onSave({
      effective_date: effectiveDate,
      hourly_rate: parseFloat(hourlyRate),
      monthly_salary: null,
      reason_type: salary ? 'AUGMENTATION' : 'EMBAUCHE',
      comment: null,
      decided_by: null,
    });
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Date d'effet *</Label>
        <Input
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Taux horaire (€/h) *</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value)}
          placeholder="Ex: 16.50"
        />
      </div>
      <DialogFooter className="pt-2">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving || !effectiveDate || !hourlyRate}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {salary ? 'Modifier' : 'Ajouter'}
        </Button>
      </DialogFooter>
    </div>
  );
}

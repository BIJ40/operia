/**
 * Onglet Contrat & Salaire - Phase 2 RH
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Briefcase,
  Calendar,
  User,
  Edit,
  Plus,
  Loader2,
  Clock,
  Trash2,
} from 'lucide-react';
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
import { useEmploymentContracts, useSalaryHistory } from '@/hooks/useEmploymentContracts';
import {
  EmploymentContract,
  SalaryHistory,
  CONTRACT_TYPES,
  JOB_CATEGORIES,
  SALARY_REASON_TYPES,
  ContractType,
  JobCategory,
  SalaryReasonType,
} from '@/types/collaborator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useProfile } from '@/contexts/ProfileContext';

interface ContractSalaryTabProps {
  collaboratorId: string;
  canManage: boolean;
}

export function ContractSalaryTab({ collaboratorId, canManage }: ContractSalaryTabProps) {
  const { agencyId } = useAuth();
  const {
    currentContract,
    pastContracts,
    isLoading: isLoadingContracts,
    createContract,
    updateContract,
    closeContract,
  } = useEmploymentContracts(collaboratorId);

  const {
    history: salaryHistory,
    currentSalary,
    isLoading: isLoadingSalary,
    createSalaryEntry,
    updateSalaryEntry,
    deleteSalaryEntry,
  } = useSalaryHistory(currentContract?.id);

  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showSalaryDialog, setShowSalaryDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<EmploymentContract | null>(null);
  const [editingSalary, setEditingSalary] = useState<SalaryHistory | null>(null);
  const [deletingSalaryId, setDeletingSalaryId] = useState<string | null>(null);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' €';
  };

  if (isLoadingContracts) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Chargement du contrat...</span>
        </CardContent>
      </Card>
    );
  }

  if (!currentContract) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Contrat & Salaire</span>
              {canManage && (
                <Button size="sm" onClick={() => setShowContractDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un contrat
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Aucun contrat en cours pour ce collaborateur.
            </p>
          </CardContent>
        </Card>

        <ContractDialog
          open={showContractDialog}
          onOpenChange={setShowContractDialog}
          collaboratorId={collaboratorId}
          contract={null}
          onSave={createContract.mutateAsync}
          isSaving={createContract.isPending}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Contrat courant */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>Contrat en cours</span>
              <Badge variant="outline">{currentContract.contract_type}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={Briefcase} label="Poste" value={currentContract.job_title} />
            <InfoRow icon={User} label="Catégorie" value={currentContract.job_category} />
            <InfoRow icon={Calendar} label="Date de début" value={formatDate(currentContract.start_date)} />
            <InfoRow icon={Calendar} label="Date de fin" value={formatDate(currentContract.end_date)} />
            <InfoRow
              icon={Clock}
              label="Durée hebdo"
              value={currentContract.weekly_hours ? `${currentContract.weekly_hours} h` : null}
            />

            {canManage && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingContract(currentContract);
                    setShowContractDialog(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCloseDialog(true)}
                >
                  Clôturer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salaire */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>Salaire</span>
              {currentSalary && (
                <Badge variant="outline">
                  Depuis {formatDate(currentSalary.effective_date)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingSalary ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Chargement de l'historique des salaires...
                </span>
              </div>
            ) : !currentSalary ? (
              <p className="text-muted-foreground">
                Aucun historique de salaire enregistré pour ce contrat.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow
                    icon={Briefcase}
                    label="Salaire mensuel"
                    value={formatCurrency(currentSalary.monthly_salary)}
                  />
                  <InfoRow
                    icon={Briefcase}
                    label="Taux horaire"
                    value={currentSalary.hourly_rate ? `${currentSalary.hourly_rate} €/h` : null}
                  />
                </div>

                {salaryHistory.length > 1 && (
                  <>
                    <Separator />
                    <p className="text-sm font-medium">Historique des évolutions</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {salaryHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start justify-between gap-3 text-sm border rounded-md px-3 py-2 group"
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              {formatDate(entry.effective_date)} · {entry.reason_type || 'MAJ'}
                            </p>
                            {entry.comment && (
                              <p className="text-muted-foreground">{entry.comment}</p>
                            )}
                          </div>
                          <div className="text-right flex items-start gap-2">
                            <div>
                              {entry.monthly_salary && <p>{formatCurrency(entry.monthly_salary)}</p>}
                              {entry.hourly_rate && (
                                <p className="text-xs text-muted-foreground">
                                  {entry.hourly_rate} €/h
                                </p>
                              )}
                            </div>
                            {canManage && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {canManage && currentContract && (
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowSalaryDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nouvelle entrée salaire
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contrats passés */}
        {pastContracts.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Contrats précédents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pastContracts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                >
                  <div>
                    <p className="font-medium">
                      {c.contract_type} · {c.job_title || 'Poste non renseigné'}
                    </p>
                    <p className="text-muted-foreground">
                      {formatDate(c.start_date)} → {formatDate(c.end_date)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>


      {/* Dialogs */}
      <ContractDialog
        open={showContractDialog}
        onOpenChange={(open) => {
          setShowContractDialog(open);
          if (!open) setEditingContract(null);
        }}
        collaboratorId={collaboratorId}
        contract={editingContract}
        onSave={editingContract ? 
          (data) => updateContract.mutateAsync({ id: editingContract.id, data }) :
          createContract.mutateAsync
        }
        isSaving={createContract.isPending || updateContract.isPending}
      />

      <SalaryDialog
        open={showSalaryDialog}
        onOpenChange={(open) => {
          setShowSalaryDialog(open);
          if (!open) setEditingSalary(null);
        }}
        contractId={currentContract?.id || ''}
        salary={editingSalary}
        onSave={editingSalary
          ? (data) => updateSalaryEntry.mutateAsync({ id: editingSalary.id, data })
          : createSalaryEntry.mutateAsync
        }
        isSaving={createSalaryEntry.isPending || updateSalaryEntry.isPending}
      />

      <AlertDialog open={!!deletingSalaryId} onOpenChange={() => setDeletingSalaryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'entrée de salaire sera définitivement supprimée.
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

      <CloseContractDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        contractId={currentContract?.id || ''}
        onClose={closeContract.mutateAsync}
        isClosing={closeContract.isPending}
      />
    </>
  );
}

// Helper component
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-1" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value || '-'}</p>
      </div>
    </div>
  );
}

// Contract Dialog
interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorId: string;
  contract: EmploymentContract | null;
  onSave: (data: any) => Promise<any>;
  isSaving: boolean;
}

function ContractDialog({
  open,
  onOpenChange,
  collaboratorId,
  contract,
  onSave,
  isSaving,
}: ContractDialogProps) {
  const [formData, setFormData] = useState({
    contract_type: contract?.contract_type || 'CDI' as ContractType,
    start_date: contract?.start_date || '',
    end_date: contract?.end_date || '',
    weekly_hours: contract?.weekly_hours?.toString() || '35',
    job_title: contract?.job_title || '',
    job_category: contract?.job_category || '' as JobCategory | '',
  });

  const handleSave = async () => {
    await onSave({
      collaborator_id: collaboratorId,
      contract_type: formData.contract_type,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      weekly_hours: formData.weekly_hours ? parseFloat(formData.weekly_hours) : null,
      job_title: formData.job_title || null,
      job_category: formData.job_category || null,
      is_current: true,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{contract ? 'Modifier le contrat' : 'Nouveau contrat'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type de contrat *</Label>
            <Select
              value={formData.contract_type}
              onValueChange={(v) => setFormData({ ...formData, contract_type: v as ContractType })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {CONTRACT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de début *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Intitulé du poste</Label>
            <Input
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              placeholder="Ex: Technicien plombier"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                value={formData.job_category}
                onValueChange={(v) => setFormData({ ...formData, job_category: v as JobCategory })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {JOB_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Heures/semaine</Label>
              <Input
                type="number"
                value={formData.weekly_hours}
                onChange={(e) => setFormData({ ...formData, weekly_hours: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !formData.start_date}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {contract ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Salary Dialog
interface SalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  salary: SalaryHistory | null;
  onSave: (data: any) => Promise<any>;
  isSaving: boolean;
}

function SalaryDialog({ open, onOpenChange, contractId, salary, onSave, isSaving }: SalaryDialogProps) {
  const [formData, setFormData] = useState({
    effective_date: salary?.effective_date || '',
    monthly_salary: salary?.monthly_salary?.toString() || '',
    hourly_rate: salary?.hourly_rate?.toString() || '',
    reason_type: (salary?.reason_type || '') as SalaryReasonType | '',
    comment: salary?.comment || '',
  });

  // Reset form when salary changes
  useState(() => {
    if (salary) {
      setFormData({
        effective_date: salary.effective_date || '',
        monthly_salary: salary.monthly_salary?.toString() || '',
        hourly_rate: salary.hourly_rate?.toString() || '',
        reason_type: (salary.reason_type || '') as SalaryReasonType | '',
        comment: salary.comment || '',
      });
    }
  });

  const handleSave = async () => {
    const payload = {
      effective_date: formData.effective_date,
      monthly_salary: formData.monthly_salary ? parseFloat(formData.monthly_salary) : null,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      reason_type: formData.reason_type || null,
      comment: formData.comment || null,
    };

    if (!salary) {
      // Create mode - include contract_id
      await onSave({
        ...payload,
        contract_id: contractId,
        decided_by: null,
      });
    } else {
      // Edit mode
      await onSave(payload);
    }
    
    onOpenChange(false);
    setFormData({ effective_date: '', monthly_salary: '', hourly_rate: '', reason_type: '', comment: '' });
  };

  // Update form when salary prop changes
  useState(() => {
    setFormData({
      effective_date: salary?.effective_date || '',
      monthly_salary: salary?.monthly_salary?.toString() || '',
      hourly_rate: salary?.hourly_rate?.toString() || '',
      reason_type: (salary?.reason_type || '') as SalaryReasonType | '',
      comment: salary?.comment || '',
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{salary ? 'Modifier l\'entrée salaire' : 'Nouvelle entrée de salaire'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Date d'effet *</Label>
            <Input
              type="date"
              value={formData.effective_date}
              onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Salaire mensuel (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.monthly_salary}
                onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                placeholder="Ex: 2500"
              />
            </div>
            <div className="space-y-2">
              <Label>Taux horaire (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                placeholder="Ex: 16.50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Motif</Label>
            <Select
              value={formData.reason_type}
              onValueChange={(v) => setFormData({ ...formData, reason_type: v as SalaryReasonType })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {SALARY_REASON_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Commentaire</Label>
            <Textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Notes optionnelles..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !formData.effective_date}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {salary ? 'Mettre à jour' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Close Contract Dialog
interface CloseContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  onClose: (data: { id: string; end_date: string }) => Promise<any>;
  isClosing: boolean;
}

function CloseContractDialog({
  open,
  onOpenChange,
  contractId,
  onClose,
  isClosing,
}: CloseContractDialogProps) {
  const [endDate, setEndDate] = useState('');

  const handleClose = async () => {
    await onClose({ id: contractId, end_date: endDate });
    onOpenChange(false);
    setEndDate('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Clôturer le contrat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Date de fin *</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Cette action marquera le contrat comme terminé. Vous pourrez ensuite créer un nouveau contrat si nécessaire.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleClose} disabled={isClosing || !endDate}>
            {isClosing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Clôturer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

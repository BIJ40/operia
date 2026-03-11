/**
 * TechnicianQuickEditDialog - Popup édition rapide paramètres performance
 * Champs: durée hebdo, type collaborateur, role
 * Accès depuis la page Performance Terrain
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, User, Briefcase, Save, Loader2, AlertCircle, ExternalLink, Link2 } from 'lucide-react';
import { TechnicianPerformance } from '@/hooks/usePerformanceTerrain';
import { useEmploymentContracts } from '@/hooks/useEmploymentContracts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import type { JobCategory } from '@/types/collaborator';

interface Props {
  technician: TechnicianPerformance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLLABORATOR_TYPES: { value: JobCategory; label: string }[] = [
  { value: 'TECHNICIEN', label: 'Technicien' },
  { value: 'ASSISTANTE', label: 'Assistante' },
  { value: 'DIRIGEANT', label: 'Dirigeant' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'AUTRE', label: 'Autre' },
];

export function TechnicianQuickEditDialog({ technician, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { agencyId } = useEffectiveAuth();
  const [weeklyHours, setWeeklyHours] = useState<string>('');
  const [collabType, setCollabType] = useState<JobCategory>('TECHNICIEN');
  const [role, setRole] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);

  // Fetch collaborator by apogee_user_id
  const { data: collaborator, isLoading: isLoadingCollab } = useQuery({
    queryKey: ['collaborator-by-apogee-id', technician?.id],
    queryFn: async () => {
      if (!technician?.id) return null;
      
      // L'id du technicien est son apogee_user_id (number)
      const apogeeId = parseInt(technician.id, 10);
      if (isNaN(apogeeId)) return null;

      const { data, error } = await supabase
        .from('collaborators')
        .select('id, first_name, last_name, type, role, apogee_user_id, agency_id, hiring_date')
        .eq('apogee_user_id', apogeeId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching collaborator:', error);
        return null;
      }
      return data;
    },
    enabled: open && !!technician?.id,
  });

  // Fetch current contract for weekly hours
  const {
    currentContract,
    isLoading: isLoadingContract,
    createContract,
    updateContract,
  } = useEmploymentContracts(collaborator?.id || undefined);

  // Sync state when data loads
  useEffect(() => {
    if (currentContract?.weekly_hours) {
      setWeeklyHours(currentContract.weekly_hours.toString());
    } else {
      setWeeklyHours(technician?.weeklyHours?.toString() || '35');
    }
  }, [currentContract?.weekly_hours, technician?.weeklyHours]);

  useEffect(() => {
    if (collaborator) {
      setCollabType((collaborator.type as JobCategory) || 'TECHNICIEN');
      setRole(collaborator.role || '');
    }
  }, [collaborator]);

  // Update collaborator mutation
  const updateCollaborator = useMutation({
    mutationFn: async (data: { type: string; role: string }) => {
      if (!collaborator?.id) throw new Error('Collaborateur non trouvé');
      
      const { error } = await supabase
        .from('collaborators')
        .update({ type: data.type, role: data.role })
        .eq('id', collaborator.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborator-by-apogee-id'] });
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
    },
  });

  // Handle save
  const handleSave = async () => {
    try {
      // Validate weekly hours
      const hours = parseFloat(weeklyHours);
      if (isNaN(hours) || hours <= 0 || hours > 60) {
        toast.error('Heures hebdo invalides (1-60)');
        return;
      }

      // Update weekly hours
      if (collaborator?.id) {
        if (currentContract) {
          await updateContract.mutateAsync({
            id: currentContract.id,
            data: { weekly_hours: hours },
          });
        } else {
          await createContract.mutateAsync({
            collaborator_id: collaborator.id,
            contract_type: 'CDI',
            start_date: collaborator.hiring_date || new Date().toISOString().split('T')[0],
            end_date: null,
            weekly_hours: hours,
            job_title: role || null,
            job_category: collabType || null,
            is_current: true,
          });
        }

        // Update type & role
        await updateCollaborator.mutateAsync({
          type: collabType,
          role: role,
        });
      }

      // Invalidate performance data to refresh
      queryClient.invalidateQueries({ queryKey: ['performance-terrain'] });
      
      toast.success('Paramètres performance mis à jour');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const isLoading = isLoadingCollab || isLoadingContract;
  const isSaving = updateContract.isPending || createContract.isPending || updateCollaborator.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {technician?.name || 'Technicien'}
          </DialogTitle>
          <DialogDescription>
            Paramètres impactant les calculs de performance
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !collaborator ? (
          <div className="py-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Ce technicien n'a pas de fiche salarié liée.
              <br />
              <span className="text-xs">ID Apogée : {technician?.id || 'inconnu'}</span>
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                variant="default" 
                size="sm"
                disabled={isLinking}
                onClick={async () => {
                  if (!technician?.id || !agencyId) return;
                  setIsLinking(true);
                  try {
                    const apogeeId = parseInt(technician.id, 10);
                    if (isNaN(apogeeId)) throw new Error('ID Apogée invalide');
                    
                    // Créer automatiquement la fiche collaborateur liée
                    const nameParts = technician.name.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    
                    const { error } = await supabase
                      .from('collaborators')
                      .insert({
                        agency_id: agencyId,
                        first_name: firstName,
                        last_name: lastName,
                        apogee_user_id: apogeeId,
                        type: 'TECHNICIEN',
                        role: 'Technicien',
                        is_registered_user: false,
                      });
                    
                    if (error) throw error;
                    
                    queryClient.invalidateQueries({ queryKey: ['collaborator-by-apogee-id', technician.id] });
                    toast.success('Fiche collaborateur créée et liée');
                  } catch (err: any) {
                    console.error('Error creating collaborator link:', err);
                    toast.error(`Erreur: ${err.message}`);
                  } finally {
                    setIsLinking(false);
                  }
                }}
              >
                {isLinking ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création...</>
                ) : (
                  <><Link2 className="w-4 h-4 mr-2" />Créer la fiche salarié</>
                )}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/?tab=organisation">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ouvrir le module Salariés
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-4">
            {/* Indicateur source actuelle */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Source capacité:</span>
              <Badge variant={technician?.weeklyHoursSource === 'contract' ? 'default' : 'secondary'}>
                {technician?.weeklyHoursSource === 'contract' ? 'Contrat RH' : 'Défaut (35h)'}
              </Badge>
            </div>

            {/* Durée hebdomadaire */}
            <div className="space-y-2">
              <Label htmlFor="weeklyHours" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Durée hebdomadaire (heures)
              </Label>
              <Input
                id="weeklyHours"
                type="number"
                min={1}
                max={60}
                step={0.5}
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(e.target.value)}
                placeholder="35"
              />
              <p className="text-xs text-muted-foreground">
                Impacte directement le calcul du ratio de charge (capacité journalière)
              </p>
            </div>

            {/* Type collaborateur */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Type de collaborateur
              </Label>
              <Select value={collabType} onValueChange={(v) => setCollabType(v as JobCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {COLLABORATOR_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rôle / Poste */}
            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                Rôle / Poste
              </Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Technicien plombier"
              />
            </div>

            {/* Lien vers fiche complète */}
            <div className="pt-2 border-t">
              <Button variant="ghost" size="sm" className="text-xs" asChild>
                <Link to={`/?tab=rh&collab=${collaborator.id}`}>
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Voir la fiche complète
                </Link>
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || isSaving || !collaborator}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

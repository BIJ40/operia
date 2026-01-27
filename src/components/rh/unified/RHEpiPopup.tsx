/**
 * Popup EPI compact - gestion des EPI obligatoires avec checkboxes
 * Statut couleur: Vert (tous cochés), Orange (partiel), Rouge (aucun)
 * Option "Non soumis aux EPI"
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Save, 
  Plus, 
  Trash2, 
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { useUpdateEpiProfile } from '@/hooks/useRHSuivi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Liste des EPI standards obligatoires
const DEFAULT_MANDATORY_EPI = [
  'Casque de chantier',
  'Chaussures de sécurité',
  'Gants de protection',
  'Lunettes de protection',
  'Gilet haute visibilité',
];

interface RHEpiPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator: RHCollaborator;
  onGeneratePdf?: () => void;
}

export function RHEpiPopup({ open, onOpenChange, collaborator, onGeneratePdf }: RHEpiPopupProps) {
  const epi = collaborator.epi_profile;
  const updateEpi = useUpdateEpiProfile();
  
  // État local
  // Note: "Non soumis" stocké via notes_securite contenant "[NON_SOUMIS_EPI]"
  const isNotSubjectMarker = (notes: string | null | undefined) => 
    notes?.includes('[NON_SOUMIS_EPI]') || false;
  
  const [mandatoryEpi, setMandatoryEpi] = useState<string[]>(
    epi?.epi_requis?.length ? epi.epi_requis : DEFAULT_MANDATORY_EPI
  );
  const [checkedEpi, setCheckedEpi] = useState<string[]>(
    epi?.epi_remis || []
  );
  const [newEpi, setNewEpi] = useState('');
  const [notSubject, setNotSubject] = useState(isNotSubjectMarker(epi?.notes_securite));
  const [lastRemiseDate, setLastRemiseDate] = useState(epi?.date_derniere_remise || '');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setMandatoryEpi(epi?.epi_requis?.length ? epi.epi_requis : DEFAULT_MANDATORY_EPI);
      setCheckedEpi(epi?.epi_remis || []);
      setNotSubject(isNotSubjectMarker(epi?.notes_securite));
      setLastRemiseDate(epi?.date_derniere_remise || '');
    }
  }, [open, epi]);

  // Toggle un EPI
  const toggleEpi = (epiName: string) => {
    setCheckedEpi(prev => 
      prev.includes(epiName) 
        ? prev.filter(e => e !== epiName)
        : [...prev, epiName]
    );
  };

  // Ajouter un EPI obligatoire
  const addMandatoryEpi = () => {
    if (newEpi.trim() && !mandatoryEpi.includes(newEpi.trim())) {
      setMandatoryEpi(prev => [...prev, newEpi.trim()]);
      setNewEpi('');
    }
  };

  // Supprimer un EPI obligatoire
  const removeMandatoryEpi = (epiName: string) => {
    setMandatoryEpi(prev => prev.filter(e => e !== epiName));
    setCheckedEpi(prev => prev.filter(e => e !== epiName));
  };

  // Calcul du statut
  const getStatus = () => {
    if (notSubject) return 'not_applicable';
    if (mandatoryEpi.length === 0) return 'ok';
    
    const checkedMandatory = mandatoryEpi.filter(e => checkedEpi.includes(e)).length;
    if (checkedMandatory === mandatoryEpi.length) return 'ok';
    if (checkedMandatory > 0) return 'partial';
    return 'none';
  };

  const status = getStatus();

  const handleSave = () => {
    const newStatus = status === 'ok' ? 'OK' : 
                      status === 'partial' ? 'TO_RENEW' : 'MISSING';
    
    // Marquer "non soumis" via notes_securite
    const currentNotes = epi?.notes_securite || '';
    const cleanNotes = currentNotes.replace('[NON_SOUMIS_EPI]', '').trim();
    const updatedNotes = notSubject 
      ? (cleanNotes ? `${cleanNotes} [NON_SOUMIS_EPI]` : '[NON_SOUMIS_EPI]')
      : cleanNotes;
    
    updateEpi.mutate({
      collaboratorId: collaborator.id,
      data: {
        epi_requis: mandatoryEpi,
        epi_remis: checkedEpi,
        statut_epi: newStatus as 'OK' | 'TO_RENEW' | 'MISSING',
        date_derniere_remise: lastRemiseDate || null,
        notes_securite: updatedNotes || null,
      },
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Équipements de Protection Individuelle
          </DialogTitle>
          <DialogDescription>
            {collaborator.first_name} {collaborator.last_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Option "Non soumis aux EPI" */}
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
            <Checkbox
              id="not-subject"
              checked={notSubject}
              onCheckedChange={(checked) => setNotSubject(checked === true)}
            />
            <div className="flex-1">
              <Label htmlFor="not-subject" className="font-medium cursor-pointer">
                Non soumis aux EPI
              </Label>
              <p className="text-xs text-muted-foreground">
                Ce collaborateur n'est pas concerné par les équipements de protection
              </p>
            </div>
            {notSubject && <Ban className="h-5 w-5 text-muted-foreground" />}
          </div>
          
          {!notSubject && (
            <>
              {/* Statut actuel */}
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium">Statut EPI :</span>
                <EpiStatusBadge status={status} />
              </div>
              
              {/* Date dernière remise */}
              <div className="flex items-center gap-3">
                <Label className="text-sm min-w-fit">Dernière remise :</Label>
                <Input
                  type="date"
                  value={lastRemiseDate}
                  onChange={(e) => setLastRemiseDate(e.target.value)}
                  className="max-w-[180px]"
                />
              </div>
              
              <Separator />
              
              {/* Liste des EPI obligatoires */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">EPI obligatoires</Label>
                  <span className="text-xs text-muted-foreground">
                    {checkedEpi.filter(e => mandatoryEpi.includes(e)).length}/{mandatoryEpi.length} remis
                  </span>
                </div>
                
                <ScrollArea className="h-[200px] border rounded-lg p-3">
                  <div className="space-y-2">
                    {mandatoryEpi.map((epiName) => {
                      const isChecked = checkedEpi.includes(epiName);
                      return (
                        <div 
                          key={epiName}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg transition-colors",
                            isChecked ? "bg-primary/10" : "hover:bg-accent"
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleEpi(epiName)}
                          />
                          <span className={cn(
                            "flex-1 text-sm",
                            isChecked && "font-medium"
                          )}>
                            {epiName}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => removeMandatoryEpi(epiName)}
                            title="Retirer de la liste"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                
                {/* Ajouter un EPI */}
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Ajouter un EPI..."
                    value={newEpi}
                    onChange={(e) => setNewEpi(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addMandatoryEpi()}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={addMandatoryEpi}
                    disabled={!newEpi.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          {!notSubject && onGeneratePdf && (
            <Button 
              variant="outline"
              onClick={onGeneratePdf}
              className="gap-2 mr-auto"
            >
              <FileText className="h-4 w-4" />
              Attestation PDF
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateEpi.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Badge de statut EPI
function EpiStatusBadge({ status }: { status: 'ok' | 'partial' | 'none' | 'not_applicable' }) {
  const config = {
    ok: { 
      label: 'Complet', 
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
    },
    partial: { 
      label: 'Partiel', 
      icon: AlertTriangle,
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
    },
    none: { 
      label: 'Manquant', 
      icon: XCircle,
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
    },
    not_applicable: { 
      label: 'Non concerné', 
      icon: Ban,
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' 
    },
  };
  
  const { label, icon: Icon, className } = config[status];
  
  return (
    <Badge className={cn("gap-1", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// Indicateur compact pour la colonne du tableau
export type EpiIndicatorStatus = 'ok' | 'partial' | 'none' | 'not_applicable';

interface RHEpiIndicatorProps {
  collaborator: RHCollaborator;
  onClick: () => void;
}

export function RHEpiIndicator({ collaborator, onClick }: RHEpiIndicatorProps) {
  const epi = collaborator.epi_profile;
  
  // Vérifier si non soumis via notes_securite
  const isNotSubject = epi?.notes_securite?.includes('[NON_SOUMIS_EPI]') || false;
  
  // Calcul du statut
  const getStatus = (): EpiIndicatorStatus => {
    if (isNotSubject) return 'not_applicable';
    
    const mandatoryEpi = epi?.epi_requis || DEFAULT_MANDATORY_EPI;
    const checkedEpi = epi?.epi_remis || [];
    
    if (mandatoryEpi.length === 0) return 'ok';
    
    const checkedMandatory = mandatoryEpi.filter((e: string) => checkedEpi.includes(e)).length;
    if (checkedMandatory === mandatoryEpi.length) return 'ok';
    if (checkedMandatory > 0) return 'partial';
    return 'none';
  };
  
  const status = getStatus();
  
  const config = {
    ok: { icon: CheckCircle2, color: 'text-emerald-600', label: 'EPI complets' },
    partial: { icon: AlertTriangle, color: 'text-amber-500', label: 'EPI partiels' },
    none: { icon: XCircle, color: 'text-red-500', label: 'EPI manquants' },
    not_applicable: { icon: Ban, color: 'text-muted-foreground', label: 'Non concerné' },
  };
  
  const { icon: Icon, color, label } = config[status];
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0"
      onClick={onClick}
      title={label}
    >
      <Icon className={cn("h-5 w-5", color)} />
    </Button>
  );
}

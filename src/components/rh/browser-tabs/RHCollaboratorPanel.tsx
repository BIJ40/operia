/**
 * Panneau fiche collaborateur dans un onglet
 * Une seule fiche avec sections repliables (plus d'onglets internes)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  Award, 
  FolderOpen,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Clock,
  Loader2,
  MoreVertical,
  ChevronDown,
  Briefcase,
  AlertTriangle,
  Calendar as CalendarIcon,
  Archive,
  Check as CheckIcon,
  Shirt
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRHCollaborator, useDeleteCollaborator } from '@/hooks/useRHSuivi';
import { updateCollaboratorField } from '@/hooks/useAutoSaveCollaborator';
import { useSensitiveData } from '@/hooks/useSensitiveData';
import { InlineEditCompact } from '@/components/ui/inline-edit';
import type { RHCollaborator } from '@/types/rh-suivi';
import { useRHTabs } from './RHTabsContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RHSectionSecurite } from '@/components/rh/sections/RHSectionSecurite';
import { RHSectionCompetences } from '@/components/rh/sections/RHSectionCompetences';
import { RHSectionDocuments } from '@/components/rh/sections/RHSectionDocuments';
import { RHSectionContrat } from '@/components/rh/sections/RHSectionContrat';
import { RHTaillesPopup } from '@/components/rh/unified/RHTaillesPopup';

import {
  FONCTION_OPTIONS,
  getPostesForFonction, getDefaultPoste, validateFonctionPoste,
  fonctionToDbType, dbTypeToFonction,
  POSTE_LABELS, type Poste,
} from '@/lib/fonctionPosteMapping';

// Legacy TYPE_OPTIONS replaced by FONCTION_OPTIONS from central mapping

function getCollaboratorStatus(c: RHCollaborator): 'active' | 'inactive' | 'exited' {
  if (c.leaving_date) {
    const leaveDate = new Date(c.leaving_date);
    if (leaveDate <= new Date()) return 'exited';
  }
  return 'active';
}

function StatusBadge({ status }: { status: 'active' | 'inactive' | 'exited' }) {
  const variants = {
    active: { label: 'Actif', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: UserCheck },
    inactive: { label: 'Inactif', className: 'bg-muted text-muted-foreground', icon: Clock },
    exited: { label: 'Sorti', className: 'bg-destructive/10 text-destructive', icon: UserX },
  };
  const { label, className, icon: Icon } = variants[status];
  
  return (
    <Badge className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultOpen = false, children, badge }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen} 
      className="rounded-2xl overflow-hidden bg-gradient-to-br from-card via-card to-muted/40 border border-border/60 shadow-warm h-fit"
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/30 transition-all duration-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-warm-blue/20 to-warm-teal/15 text-warm-blue shadow-sm">
            {icon}
          </div>
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          {badge}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>
      <CollapsibleContent forceMount className={cn("border-t border-border/40", !isOpen && "hidden")}>
        <div className="p-4 bg-gradient-to-b from-background/50 to-background/80">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface RHCollaboratorPanelProps {
  collaboratorId: string;
}

export function RHCollaboratorPanel({ collaboratorId }: RHCollaboratorPanelProps) {
  const queryClient = useQueryClient();
  const { data: collaborator, isLoading } = useRHCollaborator(collaboratorId);
  const deleteCollaborator = useDeleteCollaborator();
  const { closeTab } = useRHTabs();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showTaillesPopup, setShowTaillesPopup] = useState(false);
  const [archiveDate, setArchiveDate] = useState<Date | undefined>(new Date());
  const [isArchiving, setIsArchiving] = useState(false);
  
  // ICE data
  const { 
    sensitiveData, 
    isLoading: loadingICE, 
    updateSensitiveData,
    isUpdating: updatingICE 
  } = useSensitiveData(collaboratorId);
  
  // Helper pour update avec invalidation cache
  const handleFieldUpdate = useCallback(async (field: string, value: unknown) => {
    await updateCollaboratorField(collaboratorId, field, value);
    queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
    queryClient.invalidateQueries({ queryKey: ['rh-collaborator', collaboratorId] });
  }, [collaboratorId, queryClient]);
  
  const [iceContact, setIceContact] = useState('');
  const [icePhone, setIcePhone] = useState('');
  
  useEffect(() => {
    if (sensitiveData) {
      setIceContact(sensitiveData.emergency_contact || '');
      setIcePhone(sensitiveData.emergency_phone || '');
    }
  }, [sensitiveData]);
  
  const handleSaveIceContact = (value: string) => {
    setIceContact(value);
    updateSensitiveData({
      collaboratorId,
      data: {
        emergency_contact: value || null,
        emergency_phone: icePhone || null,
      },
    });
  };
  
  const handleSaveIcePhone = (value: string) => {
    setIcePhone(value);
    updateSensitiveData({
      collaboratorId,
      data: {
        emergency_contact: iceContact || null,
        emergency_phone: value || null,
      },
    });
  };
  
  const hasIce = !!(iceContact || icePhone);

  const handleArchive = async () => {
    if (!archiveDate) return;
    setIsArchiving(true);
    try {
      await updateCollaboratorField(
        collaboratorId, 
        'leaving_date', 
        format(archiveDate, 'yyyy-MM-dd')
      );
      setShowArchiveDialog(false);
    } finally {
      setIsArchiving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!collaborator) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Collaborateur non trouvé
      </div>
    );
  }

  const fullName = `${collaborator.first_name} ${collaborator.last_name}`;
  const initials = `${collaborator.first_name?.[0] || ''}${collaborator.last_name?.[0] || ''}`.toUpperCase();
  const status = getCollaboratorStatus(collaborator);

  return (
    <div className="p-4 space-y-3">
      {/* Header enrichi avec infos de contact - Warm Pastel style */}
      <Card className="rounded-2xl border border-border/60 shadow-warm bg-gradient-to-br from-card via-card to-muted/40">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11 shrink-0 ring-2 ring-warm-blue/20 ring-offset-2 ring-offset-background">
              <AvatarFallback className="bg-gradient-to-br from-warm-blue/20 to-warm-teal/20 text-warm-blue text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Ligne 1: Nom + Status + Type (dropdown) + Rôle (dropdown) */}
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold">{fullName}</h2>
                <StatusBadge status={status} />
                
                {/* Fonction sélectionnable */}
                <Select
                  value={dbTypeToFonction(collaborator.type) || ''}
                  onValueChange={async (v) => {
                    const dbType = fonctionToDbType(v);
                    await handleFieldUpdate('type', dbType);
                    // Auto-set default poste based on fonction
                    const defaultPoste = getDefaultPoste(v);
                    if (defaultPoste) {
                      await handleFieldUpdate('poste', defaultPoste);
                    }
                    // Reset old role field if poste now handles it
                    const currentPoste = (collaborator as any).poste;
                    if (currentPoste) {
                      const check = validateFonctionPoste(v, currentPoste);
                      if (!check.valid && defaultPoste) {
                        await handleFieldUpdate('poste', defaultPoste);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="h-6 w-auto min-w-[90px] text-xs border-dashed px-2 gap-1">
                    <SelectValue placeholder="Fonction..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {FONCTION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Poste/Spécialité sélectionnable — filtré par fonction */}
                {(() => {
                  const currentFonction = dbTypeToFonction(collaborator.type);
                  const postesForFonction = currentFonction ? getPostesForFonction(currentFonction) : [];
                  const currentPoste = (collaborator as any).poste as string | null;
                  const posteLabel = currentPoste ? (POSTE_LABELS[currentPoste as Poste] || currentPoste) : null;
                  
                  if (postesForFonction.length === 0) return null;
                  
                  return (
                    <Select
                      value={currentPoste || ''}
                      onValueChange={(v) => handleFieldUpdate('poste', v)}
                    >
                      <SelectTrigger className="h-6 w-auto min-w-[100px] text-xs border-dashed px-2 gap-1">
                        <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {posteLabel || 'Poste...'}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {postesForFonction.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
                
                {/* Indicateur Tailles compact cliquable */}
                {(() => {
                  const epi = collaborator.epi_profile;
                  const sizes = [epi?.taille_haut, epi?.taille_bas, epi?.pointure, epi?.taille_gants].filter(Boolean);
                  const hasSizes = sizes.length > 0;
                  
                  return (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-6 px-2 text-xs gap-1 border border-dashed",
                        hasSizes ? "text-foreground" : "text-muted-foreground"
                      )}
                      onClick={() => setShowTaillesPopup(true)}
                      title={hasSizes ? sizes.join(' / ') : 'Renseigner les tailles'}
                    >
                      <Shirt className="h-3 w-3" />
                      {hasSizes ? (
                        <span className="truncate max-w-[80px]">{sizes.join('/')}</span>
                      ) : (
                        <span>Tailles</span>
                      )}
                    </Button>
                  );
                })()}
              </div>
              
              {/* Ligne 2: Email & Téléphone éditables inline */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <InlineEditCompact
                    value={collaborator.email || ''}
                    onSave={(v) => updateCollaboratorField(collaborator.id, 'email', v)}
                    placeholder="email@..."
                    type="email"
                  />
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <InlineEditCompact
                    value={collaborator.phone || ''}
                    onSave={(v) => updateCollaboratorField(collaborator.id, 'phone', v)}
                    placeholder="Téléphone..."
                    type="tel"
                  />
                </span>
              </div>
              
              {/* Ligne 3: ICE (Contact d'urgence) */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm border-t pt-1.5 mt-1">
                <span className={cn(
                  "flex items-center gap-1.5",
                  hasIce ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                )}>
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs font-medium">ICE:</span>
                </span>
                {loadingICE ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <InlineEditCompact
                      value={iceContact}
                      onSave={handleSaveIceContact}
                      placeholder="Contact urgence..."
                    />
                    <span className="text-muted-foreground">|</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <InlineEditCompact
                        value={icePhone}
                        onSave={handleSaveIcePhone}
                        placeholder="Tél urgence..."
                        type="tel"
                      />
                    </span>
                    {updatingICE && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </>
                )}
              </div>
            </div>
            
            {/* Right side: Entry date + Actions */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              {/* Entry date */}
              {collaborator.hiring_date && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>Entrée: {format(new Date(collaborator.hiring_date), 'dd/MM/yyyy')}</span>
                </div>
              )}
              
              {/* Exit date - only shown when employee has left */}
              {status === 'exited' && collaborator.leaving_date && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <UserX className="h-3.5 w-3.5" />
                  <span>Sortie: {format(new Date(collaborator.leaving_date), 'dd/MM/yyyy')}</span>
                </div>
              )}
              
              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-background z-50">
                  <DropdownMenuItem 
                    onClick={() => setShowArchiveDialog(true)}
                    className="cursor-pointer"
                    disabled={status === 'exited'}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archiver le collaborateur
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Archive confirmation dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce collaborateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{fullName}</strong> sera marqué comme sorti à la date sélectionnée. Cette action peut être annulée en modifiant la date de sortie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Label className="text-sm font-medium mb-2 block">Date de sortie</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !archiveDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {archiveDate ? format(archiveDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <Calendar
                  mode="single"
                  selected={archiveDate}
                  onSelect={setArchiveDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving || !archiveDate}
            >
              {isArchiving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Archivage...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archiver
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sections en grille - 2x2 : Contrat, Compétences, Sécurité, Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contrat & Salaire - colonne 1 */}
        <CollapsibleSection 
          title="Contrat & Salaire" 
          icon={<Briefcase className="h-4 w-4" />}
          defaultOpen={true}
        >
          <RHSectionContrat collaborator={collaborator} />
        </CollapsibleSection>

        {/* Compétences - colonne 2 */}
        <CollapsibleSection 
          title="Compétences" 
          icon={<Award className="h-4 w-4" />}
          defaultOpen={true}
          badge={collaborator.competencies?.competences_techniques?.length ? (
            <Badge variant="secondary" className="text-xs">
              {collaborator.competencies.competences_techniques.length}
            </Badge>
          ) : undefined}
        >
          <RHSectionCompetences collaborator={collaborator} />
        </CollapsibleSection>

        {/* Sécurité - colonne 3 */}
        <CollapsibleSection 
          title="Sécurité" 
          icon={<Shield className="h-4 w-4" />}
          badge={(() => {
            // Calculer le pourcentage d'EPI remis
            const epiRequis = collaborator.epi_profile?.epi_requis || [];
            const epiRemis = collaborator.epi_profile?.epi_remis || [];
            
            if (epiRequis.length === 0) {
              return undefined;
            }
            
            const completedCount = epiRequis.filter(epi => epiRemis.includes(epi)).length;
            const percentage = (completedCount / epiRequis.length) * 100;
            
            // Couleur basée sur le pourcentage : vert UNIQUEMENT à 100%
            const iconColor = percentage === 100 
              ? 'text-green-600' 
              : percentage >= 50 
                ? 'text-orange-500' 
                : 'text-red-500';
            
            const badgeClass = percentage === 100
              ? 'bg-green-100 dark:bg-green-900/30'
              : percentage >= 50
                ? 'bg-orange-100 dark:bg-orange-900/30'
                : 'bg-red-100 dark:bg-red-900/30';
            
            return (
              <Badge variant="outline" className={cn("gap-1.5 text-xs", badgeClass)}>
                <CheckIcon className={cn("h-3 w-3", iconColor)} />
                <span className="text-muted-foreground">{completedCount}/{epiRequis.length}</span>
              </Badge>
            );
          })()}
        >
          <RHSectionSecurite collaborator={collaborator} />
        </CollapsibleSection>

        {/* Documents - colonne 4 */}
        <CollapsibleSection 
          title="Documents" 
          icon={<FolderOpen className="h-4 w-4" />}
          defaultOpen={true}
        >
          <RHSectionDocuments collaborator={collaborator} />
        </CollapsibleSection>
      </div>
      
      {/* Popup Tailles */}
      <RHTaillesPopup
        open={showTaillesPopup}
        onOpenChange={setShowTaillesPopup}
        collaborator={collaborator}
      />
    </div>
  );
}

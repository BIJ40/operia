/**
 * Panneau fiche collaborateur dans un onglet
 * Une seule fiche avec sections repliables (plus d'onglets internes)
 */

import React, { useState } from 'react';
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
  User, 
  Shield, 
  Award, 
  FolderOpen,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Clock,
  Trash2,
  Loader2,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRHCollaborator, useDeleteCollaborator } from '@/hooks/useRHSuivi';
import { updateCollaboratorField } from '@/hooks/useAutoSaveCollaborator';
import { InlineEditCompact } from '@/components/ui/inline-edit';
import type { RHCollaborator } from '@/types/rh-suivi';
import { useRHTabs } from './RHTabsContext';
import { cn } from '@/lib/utils';

// Section components
import { RHSectionEssentiel } from '@/components/rh/sections/RHSectionEssentiel';
import { RHSectionSecurite } from '@/components/rh/sections/RHSectionSecurite';
import { RHSectionCompetences } from '@/components/rh/sections/RHSectionCompetences';
import { RHSectionDocuments } from '@/components/rh/sections/RHSectionDocuments';

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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg overflow-hidden bg-card h-fit">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
          <h3 className="font-medium text-sm">{title}</h3>
          {badge}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>
      <CollapsibleContent forceMount className={cn("border-t", !isOpen && "hidden")}>
        <div className="p-3">
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
  const { data: collaborator, isLoading } = useRHCollaborator(collaboratorId);
  const deleteCollaborator = useDeleteCollaborator();
  const { closeTab } = useRHTabs();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    deleteCollaborator.mutate(collaboratorId, {
      onSuccess: () => {
        closeTab(collaboratorId);
        setShowDeleteDialog(false);
      },
    });
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
      {/* Header enrichi avec infos de contact */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-1">
              {/* Ligne 1: Nom + Status + Type */}
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold">{fullName}</h2>
                <StatusBadge status={status} />
                {collaborator.type && (
                  <Badge variant="outline" className="text-xs">{collaborator.type}</Badge>
                )}
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
            </div>
            
            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background z-50">
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer définitivement
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ce collaborateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données liées à <strong>{fullName}</strong> seront supprimées : profil EPI, compétences, matériel, accès IT et documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCollaborator.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteCollaborator.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCollaborator.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sections en grille 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Ligne 1 */}
        <CollapsibleSection 
          title="Essentiel" 
          icon={<User className="h-4 w-4" />}
          defaultOpen={true}
        >
          <RHSectionEssentiel collaborator={collaborator} />
        </CollapsibleSection>

        <CollapsibleSection 
          title="Compétences" 
          icon={<Award className="h-4 w-4" />}
          badge={collaborator.competencies?.competences_techniques?.length ? (
            <Badge variant="secondary" className="text-xs">
              {collaborator.competencies.competences_techniques.length}
            </Badge>
          ) : undefined}
        >
          <RHSectionCompetences collaborator={collaborator} />
        </CollapsibleSection>

        {/* Ligne 2 */}
        <CollapsibleSection 
          title="Sécurité" 
          icon={<Shield className="h-4 w-4" />}
          badge={collaborator.epi_profile?.statut_epi ? (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs",
                collaborator.epi_profile.statut_epi === 'OK' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                collaborator.epi_profile.statut_epi === 'TO_RENEW' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                collaborator.epi_profile.statut_epi === 'MISSING' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}
            >
              {collaborator.epi_profile.statut_epi === 'OK' ? '✓' : collaborator.epi_profile.statut_epi === 'TO_RENEW' ? '⏰' : '⚠'}
            </Badge>
          ) : undefined}
        >
          <RHSectionSecurite collaborator={collaborator} />
        </CollapsibleSection>

        <CollapsibleSection 
          title="Documents" 
          icon={<FolderOpen className="h-4 w-4" />}
        >
          <RHSectionDocuments collaborator={collaborator} />
        </CollapsibleSection>
      </div>
    </div>
  );
}

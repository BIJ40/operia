/**
 * Panneau fiche collaborateur dans un onglet
 * Reprend la structure de RHCollaborateurPage mais sans navigation
 */

import React from 'react';
import { usePersistedTab } from '@/hooks/usePersistedState';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  FileText, 
  Shield, 
  Award, 
  Car, 
  Laptop, 
  FolderOpen,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  UserX,
  Clock
} from 'lucide-react';
import { useRHCollaborator } from '@/hooks/useRHSuivi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RHCollaborator } from '@/types/rh-suivi';

// Tab components
import { RHTabEssentiel } from '@/components/rh/tabs/RHTabEssentiel';
import { RHTabRH } from '@/components/rh/tabs/RHTabRH';
import { RHTabSecurite } from '@/components/rh/tabs/RHTabSecurite';
import { RHTabCompetences } from '@/components/rh/tabs/RHTabCompetences';
import { RHTabParc } from '@/components/rh/tabs/RHTabParc';
import { RHTabIT } from '@/components/rh/tabs/RHTabIT';
import { RHTabDocuments } from '@/components/rh/tabs/RHTabDocuments';

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
    inactive: { label: 'Inactif', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: Clock },
    exited: { label: 'Sorti', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: UserX },
  };
  const { label, className, icon: Icon } = variants[status];
  
  return (
    <Badge className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

interface RHCollaboratorPanelProps {
  collaboratorId: string;
}

export function RHCollaboratorPanel({ collaboratorId }: RHCollaboratorPanelProps) {
  const { data: collaborator, isLoading } = useRHCollaborator(collaboratorId);
  const [activeTab, setActiveTab] = usePersistedTab<string>(`rh-panel-${collaboratorId}-tab`, 'essentiel');

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
    <div className="p-4 space-y-4">
      {/* Header compact */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold truncate">{fullName}</h2>
                <StatusBadge status={status} />
                {collaborator.type && (
                  <Badge variant="outline" className="text-xs">{collaborator.type}</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                {collaborator.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[180px]">{collaborator.email}</span>
                  </span>
                )}
                {collaborator.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {collaborator.phone}
                  </span>
                )}
                {collaborator.hiring_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Depuis {format(new Date(collaborator.hiring_date), 'MMM yyyy', { locale: fr })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets internes */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="essentiel" className="gap-1.5 text-xs">
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Essentiel</span>
          </TabsTrigger>
          <TabsTrigger value="rh" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">RH</span>
          </TabsTrigger>
          <TabsTrigger value="securite" className="gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sécurité</span>
          </TabsTrigger>
          <TabsTrigger value="competences" className="gap-1.5 text-xs">
            <Award className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Compétences</span>
          </TabsTrigger>
          <TabsTrigger value="parc" className="gap-1.5 text-xs">
            <Car className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Parc</span>
          </TabsTrigger>
          <TabsTrigger value="it" className="gap-1.5 text-xs">
            <Laptop className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">IT</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 text-xs">
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="essentiel" className="mt-4">
          <RHTabEssentiel collaborator={collaborator} />
        </TabsContent>
        <TabsContent value="rh" className="mt-4">
          <RHTabRH collaborator={collaborator} />
        </TabsContent>
        <TabsContent value="securite" className="mt-4">
          <RHTabSecurite collaborator={collaborator} />
        </TabsContent>
        <TabsContent value="competences" className="mt-4">
          <RHTabCompetences collaborator={collaborator} />
        </TabsContent>
        <TabsContent value="parc" className="mt-4">
          <RHTabParc collaborator={collaborator} />
        </TabsContent>
        <TabsContent value="it" className="mt-4">
          <RHTabIT collaborator={collaborator} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <RHTabDocuments collaborator={collaborator} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

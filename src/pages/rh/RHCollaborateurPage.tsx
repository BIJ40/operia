/**
 * Fiche collaborateur avec onglets thématiques
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { RHCollaborator, RHTabId } from '@/types/rh-suivi';

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

export default function RHCollaborateurPage() {
  const { id } = useParams<{ id: string }>();
  const { data: collaborator, isLoading } = useRHCollaborator(id);
  const [activeTab, setActiveTab] = useState<RHTabId>('general');

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!collaborator) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title="Collaborateur non trouvé"
          backTo="/rh"
          backLabel="Suivi RH"
        />
      </div>
    );
  }

  const fullName = `${collaborator.first_name} ${collaborator.last_name}`;
  const initials = `${collaborator.first_name?.[0] || ''}${collaborator.last_name?.[0] || ''}`.toUpperCase();
  const status = getCollaboratorStatus(collaborator);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title={fullName}
        backTo="/rh"
        backLabel="Suivi RH"
      />

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-16 w-16 text-lg">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold">{fullName}</h2>
                <StatusBadge status={status} />
                {collaborator.type && (
                  <Badge variant="outline">{collaborator.type}</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {collaborator.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {collaborator.email}
                  </span>
                )}
                {collaborator.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {collaborator.phone}
                  </span>
                )}
                {collaborator.hiring_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Depuis {format(new Date(collaborator.hiring_date), 'MMMM yyyy', { locale: fr })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RHTabId)}>
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="essentiel" className="gap-1.5">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Essentiel</span>
          </TabsTrigger>
          <TabsTrigger value="rh" className="gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">RH</span>
          </TabsTrigger>
          <TabsTrigger value="securite" className="gap-1.5">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Sécurité & EPI</span>
          </TabsTrigger>
          <TabsTrigger value="competences" className="gap-1.5">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Compétences</span>
          </TabsTrigger>
          <TabsTrigger value="parc" className="gap-1.5">
            <Car className="h-4 w-4" />
            <span className="hidden sm:inline">Parc & Matériel</span>
          </TabsTrigger>
          <TabsTrigger value="it" className="gap-1.5">
            <Laptop className="h-4 w-4" />
            <span className="hidden sm:inline">IT & Accès</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="essentiel" className="mt-6">
          <RHTabEssentiel collaborator={collaborator} />
        </TabsContent>
        <TabsContent value="rh" className="mt-6">
          <RHTabRH collaborator={collaborator} />
        </TabsContent>
        <TabsContent value="securite" className="mt-6">
          <RHTabSecurite collaborator={collaborator} />
        </TabsContent>
        <TabsContent value="competences" className="mt-6">
          <RHTabCompetences collaborator={collaborator} />
        </TabsContent>
        <TabsContent value="parc" className="mt-6">
          <RHTabParc collaborator={collaborator} />
        </TabsContent>
        <TabsContent value="it" className="mt-6">
          <RHTabIT collaborator={collaborator} />
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          <RHTabDocuments collaborator={collaborator} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

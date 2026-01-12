/**
 * Profil 360° d'un collaborateur avec onglets
 * RGPD: Les données sensibles sont chargées séparément via useSensitiveData
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
  ArrowLeft,
  Edit,
  Trash2,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  AlertCircle,
  FileText,
  Briefcase,
  Wrench,
  Car,
  Bell,
  Lock,
} from 'lucide-react';
import { Collaborator, CollaboratorTab, COLLABORATOR_TABS } from '@/types/collaborator';
import { ContractSalaryTab } from './ContractSalaryTab';
import { DocumentsTab } from './DocumentsTab';
import { useSensitiveData } from '@/hooks/useSensitiveData';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CollaboratorProfileProps {
  collaborator: Collaborator;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  defaultTab?: CollaboratorTab;
}

export function CollaboratorProfile({
  collaborator,
  canManage,
  onEdit,
  onDelete,
  isDeleting,
  defaultTab = 'identity',
}: CollaboratorProfileProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CollaboratorTab>(defaultTab);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // RGPD: Charger les données sensibles séparément
  const { sensitiveData } = useSensitiveData(collaborator.id);

  const initials = `${collaborator.first_name?.[0] || ''}${collaborator.last_name?.[0] || ''}`.toUpperCase();
  const isActive = !collaborator.leaving_date;

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/hc-agency/collaborateurs')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Avatar className="h-16 w-16 bg-primary/10">
          <AvatarFallback className="text-primary text-xl">
            {initials || <User className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              {collaborator.first_name} {collaborator.last_name}
            </h1>
            {!isActive && (
              <Badge variant="secondary">Parti</Badge>
            )}
            {collaborator.is_registered_user && (
              <Badge variant="default">Compte actif</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {collaborator.role || collaborator.type}
          </p>
        </div>

        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CollaboratorTab)}>
        <TabsList className="grid grid-cols-6 w-full">
          {COLLABORATOR_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={tab.phase > 1}
              className="relative"
            >
              {tab.label}
              {tab.phase > 1 && (
                <Lock className="h-3 w-3 ml-1 opacity-50" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Identity Tab */}
        <TabsContent value="identity" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Informations personnelles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow icon={User} label="Nom complet" value={`${collaborator.first_name} ${collaborator.last_name}`} />
                <InfoRow icon={Mail} label="Email" value={collaborator.email} />
                <InfoRow icon={Phone} label="Téléphone" value={collaborator.phone} />
                <InfoRow icon={Calendar} label="Date de naissance" value={formatDate(sensitiveData.birth_date)} />
                <InfoRow icon={MapPin} label="Lieu de naissance" value={collaborator.birth_place} />
                <InfoRow icon={FileText} label="N° Sécurité sociale" value={sensitiveData.social_security_number} />
                <Separator />
                <InfoRow icon={MapPin} label="Rue" value={collaborator.street} />
                <InfoRow icon={MapPin} label="Code postal" value={collaborator.postal_code} />
                <InfoRow icon={MapPin} label="Ville" value={collaborator.city} />
              </CardContent>
            </Card>

            {/* Informations professionnelles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Informations professionnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow icon={Briefcase} label="Poste" value={collaborator.role} />
                <InfoRow icon={User} label="Type" value={collaborator.type} />
                <InfoRow icon={Calendar} label="Date d'embauche" value={formatDate(collaborator.hiring_date)} />
                {collaborator.leaving_date && (
                  <InfoRow icon={Calendar} label="Date de départ" value={formatDate(collaborator.leaving_date)} />
                )}
                {collaborator.apogee_user_id && (
                  <InfoRow icon={User} label="ID Apogée" value={String(collaborator.apogee_user_id)} />
                )}
              </CardContent>
            </Card>

            {/* Contact d'urgence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Contact d'urgence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow icon={User} label="Nom" value={sensitiveData.emergency_contact} />
                <InfoRow icon={Phone} label="Téléphone" value={sensitiveData.emergency_phone} />
              </CardContent>
            </Card>

            {/* Notes */}
            {collaborator.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {collaborator.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Documents RH Tab */}
        <TabsContent value="documents" className="mt-6">
          <DocumentsTab collaboratorId={collaborator.id} canManage={canManage} />
        </TabsContent>

        <TabsContent value="contract" className="mt-6">
          <ContractSalaryTab collaboratorId={collaborator.id} canManage={canManage} />
        </TabsContent>

        <TabsContent value="equipment" className="mt-6">
          <PlaceholderTab
            icon={Wrench}
            title="Matériel & EPI"
            description="Cette section sera disponible dans la Phase 3 du module RH & Maintenance."
          />
        </TabsContent>

        <TabsContent value="vehicle" className="mt-6">
          <PlaceholderTab
            icon={Car}
            title="Véhicule"
            description="Cette section sera disponible dans la Phase 4 du module RH & Maintenance."
          />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <PlaceholderTab
            icon={Bell}
            title="Alertes"
            description="Cette section sera disponible dans la Phase 5 du module RH & Maintenance."
          />
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce collaborateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données associées à{' '}
              {collaborator.first_name} {collaborator.last_name} seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper components
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

function PlaceholderTab({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof User;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 bg-muted/50 rounded-full mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-md">{description}</p>
        <Badge variant="outline" className="mt-4">
          <Lock className="h-3 w-3 mr-1" />
          Bientôt disponible
        </Badge>
      </CardContent>
    </Card>
  );
}

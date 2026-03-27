/**
 * Popup de détail pour un collaborateur RH
 * S'ouvre au clic sur une ligne du tableau
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Phone, Mail, MapPin, Calendar, User, Shield, Award, Car, Key, 
  FileText, Pencil, ExternalLink, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { CollaboratorEpiSummary } from '@/hooks/epi/useCollaboratorsEpiSummary';
import { RHCollaboratorAvatar } from './RHCollaboratorAvatar';
import { RHStatusBadges } from './RHStatusBadges';
import { RHProfileProgressBar } from './RHProfileProgressBar';
import { useProfileCompleteness } from '@/hooks/rh/useProfileCompleteness';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';

interface CollaboratorDetailPopupProps {
  collaborator: RHCollaborator | null;
  epiSummary?: CollaboratorEpiSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onViewProfile?: () => void;
}

// Mapping des types vers labels français
const TYPE_LABELS: Record<RHCollaborator['type'], string> = {
  TECHNICIEN: 'Technicien',
  ADMINISTRATIF: 'Administratif',
  DIRIGEANT: 'Dirigeant',
  COMMERCIAL: 'Commercial',
  AUTRE: 'Autre',
};

type DetailTab = 'general' | 'security' | 'skills' | 'fleet';

export function CollaboratorDetailPopup({
  collaborator,
  epiSummary,
  open,
  onOpenChange,
  onEdit,
  onViewProfile,
}: CollaboratorDetailPopupProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('general');
  const completeness = useProfileCompleteness(collaborator ?? undefined);

  if (!collaborator) return null;

  const isActive = !collaborator.leaving_date;
  const typeLabel = TYPE_LABELS[collaborator.type] || 'Autre';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header avec avatar et actions */}
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-br from-primary/5 to-background">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <RHCollaboratorAvatar 
                collaborator={collaborator} 
                size="lg" 
                showTypeIcon 
              />
              <div className="space-y-1">
                <DialogTitle className="text-xl flex items-center gap-2">
                  {collaborator.first_name} {collaborator.last_name}
                  {!isActive && (
                    <Badge variant="secondary" className="text-xs">Parti</Badge>
                  )}
                </DialogTitle>
                <p className="text-muted-foreground">{typeLabel}</p>
                {collaborator.role && (
                  <p className="text-sm text-muted-foreground">{collaborator.role}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Modifier
                </Button>
              )}
              {onViewProfile && (
                <Button variant="default" size="sm" onClick={onViewProfile}>
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Ouvrir onglet
                </Button>
              )}
            </div>
          </div>

          {/* Barre de progression + badges */}
          <div className="mt-4 space-y-3">
            <RHProfileProgressBar completeness={completeness} size="md" />
            <RHStatusBadges collaborator={collaborator} epiSummary={epiSummary} />
          </div>
        </DialogHeader>

        {/* Contenu avec onglets */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DetailTab)}>
            <TabsList className="mb-4 w-full justify-start">
              <TabsTrigger value="general" className="gap-1.5">
                <User className="h-3.5 w-3.5" />
                Général
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Sécurité
              </TabsTrigger>
              <TabsTrigger value="skills" className="gap-1.5">
                <Award className="h-3.5 w-3.5" />
                Compétences
              </TabsTrigger>
              <TabsTrigger value="fleet" className="gap-1.5">
                <Car className="h-3.5 w-3.5" />
                Parc
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                {/* Contact */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {collaborator.phone ? (
                      <a href={`tel:${collaborator.phone}`} className="flex items-center gap-2 hover:text-primary">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {collaborator.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Pas de téléphone</span>
                    )}
                    {collaborator.email ? (
                      <a href={`mailto:${collaborator.email}`} className="flex items-center gap-2 hover:text-primary">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {collaborator.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Pas d'email</span>
                    )}
                  </CardContent>
                </Card>

                {/* Adresse */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Adresse
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {collaborator.street || collaborator.city ? (
                      <div className="space-y-0.5">
                        {collaborator.street && <p>{collaborator.street}</p>}
                        <p>{[collaborator.postal_code, collaborator.city].filter(Boolean).join(' ')}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Adresse non renseignée</span>
                    )}
                  </CardContent>
                </Card>

                {/* Dates */}
                <Card className="col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Entrée:</span>{' '}
                      {collaborator.hiring_date 
                        ? format(new Date(collaborator.hiring_date), 'dd MMMM yyyy', { locale: fr })
                        : '—'
                      }
                    </div>
                    {collaborator.leaving_date && (
                      <div>
                        <span className="text-muted-foreground">Sortie:</span>{' '}
                        {format(new Date(collaborator.leaving_date), 'dd MMMM yyyy', { locale: fr })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Notes */}
              {collaborator.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Observations</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {collaborator.notes}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="security" className="space-y-4 animate-fade-in">
              {/* Tailles EPI */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tailles EPI</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">Haut</span>
                      <span className="font-medium">{collaborator.epi_profile?.taille_haut || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Bas</span>
                      <span className="font-medium">{collaborator.epi_profile?.taille_bas || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Pointure</span>
                      <span className="font-medium">{collaborator.epi_profile?.pointure || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Gants</span>
                      <span className="font-medium">{collaborator.epi_profile?.taille_gants || '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* EPI remis */}
              {(collaborator.epi_profile?.epi_remis?.length || 0) > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">EPI remis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {collaborator.epi_profile?.epi_remis?.map((epi, idx) => (
                        <Badge key={idx} variant="secondary">{epi}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Permis:</span>{' '}
                    <span className={collaborator.permis ? 'text-foreground' : 'text-destructive'}>
                      {collaborator.permis || 'Non renseigné'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CNI:</span>{' '}
                    <span className={collaborator.cni ? 'text-foreground' : 'text-destructive'}>
                      {collaborator.cni || 'Non renseignée'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skills" className="space-y-4 animate-fade-in">
              {/* Compétences techniques */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Compétences techniques</CardTitle>
                </CardHeader>
                <CardContent>
                  {(collaborator.competencies?.competences_techniques?.length || 0) > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {collaborator.competencies?.competences_techniques?.map((skill, idx) => (
                        <Badge key={idx} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Aucune compétence renseignée</span>
                  )}
                </CardContent>
              </Card>

              {/* Habilitation */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Habilitation électrique</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {collaborator.competencies?.habilitation_electrique_statut ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{collaborator.competencies.habilitation_electrique_statut}</Badge>
                      {collaborator.competencies.habilitation_electrique_date && (
                        <span className="text-muted-foreground">
                          (depuis {format(new Date(collaborator.competencies.habilitation_electrique_date), 'dd/MM/yyyy')})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Non renseignée</span>
                  )}
                </CardContent>
              </Card>

              {/* CACES */}
              {(collaborator.competencies?.caces?.length || 0) > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">CACES</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {collaborator.competencies?.caces?.map((caces, idx) => (
                        <Badge key={idx} variant="secondary">
                          {caces.type}
                          {caces.expiration && (
                            <span className="ml-1 opacity-60">
                              (exp. {format(new Date(caces.expiration), 'MM/yyyy')})
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="fleet" className="space-y-4 animate-fade-in">
              {/* Véhicule */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Car className="h-4 w-4 text-primary" />
                    Véhicule
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {collaborator.assets?.vehicule_attribue ? (
                    <span>{collaborator.assets.vehicule_attribue}</span>
                  ) : (
                    <span className="text-muted-foreground">Pas de véhicule attribué</span>
                  )}
                </CardContent>
              </Card>

              {/* Cartes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Cartes</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      collaborator.assets?.carte_carburant ? "bg-green-500" : "bg-muted"
                    )} />
                    <span>Carburant</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      collaborator.assets?.carte_bancaire ? "bg-green-500" : "bg-muted"
                    )} />
                    <span>Bancaire</span>
                  </div>
                  {collaborator.assets?.carte_autre_nom && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>{collaborator.assets.carte_autre_nom}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Équipements */}
              {(collaborator.assets?.autres_equipements?.length || 0) > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Autres équipements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {collaborator.assets?.autres_equipements?.map((equip, idx) => (
                        <Badge key={idx} variant="outline">{equip.nom}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

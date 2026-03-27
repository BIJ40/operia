/**
 * ApporteurDemandeDetailDrawer - Affiche le détail d'une demande d'intervention
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Calendar, 
  Clock,
  AlertTriangle,
  MessageSquare,
  XCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  ApporteurDemande, 
  REQUEST_TYPE_LABELS, 
  STATUS_LABELS, 
  URGENCY_LABELS 
} from '../hooks/useApporteurDemandes';

interface ApporteurDemandeDetailDrawerProps {
  demande: ApporteurDemande | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApporteurDemandeDetailDrawer({ 
  demande, 
  open, 
  onOpenChange 
}: ApporteurDemandeDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);

  if (!demande) return null;

  const statusInfo = STATUS_LABELS[demande.status] || STATUS_LABELS.pending;
  const urgencyInfo = URGENCY_LABELS[demande.urgency] || URGENCY_LABELS.normal;
  
  // Can only cancel if status is pending (not already cancelled or in_progress)
  const canCancel = demande.status === 'pending' && !demande.apogee_project_id;

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-apporteur-request', {
        body: { request_id: demande.id }
      });

      if (error) throw error;

      toast.success('Demande annulée', {
        description: 'Un email d\'annulation a été envoyé à l\'agence.'
      });
      
      queryClient.invalidateQueries({ queryKey: ['apporteur-demandes'] });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast.error('Erreur', {
        description: error.message || 'Impossible d\'annuler la demande'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl font-bold text-left">
              {REQUEST_TYPE_LABELS[demande.request_type] || demande.request_type}
            </DialogTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn('text-xs', statusInfo.color)}>
              {statusInfo.label}
            </Badge>
            {demande.urgency === 'urgent' && (
              <Badge variant="outline" className={cn('text-xs gap-1', urgencyInfo.color)}>
                <AlertTriangle className="w-3 h-3" />
                {urgencyInfo.label}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Dates */}
          <Section icon={Calendar} title="Dates">
            <InfoRow 
              label="Créée le" 
              value={format(new Date(demande.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })} 
            />
            {demande.updated_at !== demande.created_at && (
              <InfoRow 
                label="Mise à jour" 
                value={format(new Date(demande.updated_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })} 
              />
            )}
          </Section>

          <Separator />

          {/* Contact locataire */}
          <Section icon={User} title="Contact locataire">
            <InfoRow label="Nom" value={demande.tenant_name} />
            {demande.tenant_phone && (
              <InfoRow 
                label="Téléphone" 
                value={demande.tenant_phone}
                icon={<Phone className="w-3.5 h-3.5" />}
              />
            )}
            {demande.tenant_email && (
              <InfoRow 
                label="Email" 
                value={demande.tenant_email}
                icon={<Mail className="w-3.5 h-3.5" />}
              />
            )}
            {demande.owner_name && (
              <InfoRow label="Propriétaire" value={demande.owner_name} />
            )}
          </Section>

          <Separator />

          {/* Adresse */}
          <Section icon={MapPin} title="Adresse d'intervention">
            <p className="text-sm text-foreground">{demande.address}</p>
            {(demande.postal_code || demande.city) && (
              <p className="text-sm text-muted-foreground">
                {[demande.postal_code, demande.city].filter(Boolean).join(' ')}
              </p>
            )}
          </Section>

          <Separator />

          {/* Description */}
          <Section icon={FileText} title="Description du problème">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {demande.description}
            </p>
          </Section>

          {/* Disponibilités */}
          {demande.availability && (
            <>
              <Separator />
              <Section icon={Clock} title="Disponibilités">
                <p className="text-sm text-foreground">{demande.availability}</p>
              </Section>
            </>
          )}

          {/* Commentaires */}
          {demande.comments && (
            <>
              <Separator />
              <Section icon={MessageSquare} title="Commentaires additionnels">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {demande.comments}
                </p>
              </Section>
            </>
          )}

          {/* Cancel Button */}
          {canCancel && (
            <>
              <Separator />
              <div className="pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="w-full gap-2"
                      disabled={isCancelling}
                    >
                      {isCancelling ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Annuler cette demande
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Annuler la demande ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Un email d'annulation sera envoyé à l'agence HelpConfort.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Non, conserver</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleCancel}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Oui, annuler
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ 
  icon: Icon, 
  title, 
  children 
}: { 
  icon: React.ElementType; 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h3>
      <div className="space-y-2 pl-6">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ 
  label, 
  value, 
  icon 
}: { 
  label: string; 
  value: string; 
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground min-w-[80px]">{label}:</span>
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-foreground">{value}</span>
    </div>
  );
}

/**
 * ApporteurDemandeDetailDrawer - Affiche le détail d'une demande d'intervention
 */

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  if (!demande) return null;

  const statusInfo = STATUS_LABELS[demande.status] || STATUS_LABELS.pending;
  const urgencyInfo = URGENCY_LABELS[demande.urgency] || URGENCY_LABELS.normal;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <SheetTitle className="text-xl font-bold text-left">
              {REQUEST_TYPE_LABELS[demande.request_type] || demande.request_type}
            </SheetTitle>
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
        </SheetHeader>

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
        </div>
      </SheetContent>
    </Sheet>
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

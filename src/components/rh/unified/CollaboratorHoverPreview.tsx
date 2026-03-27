/**
 * HoverCard Preview pour les collaborateurs RH
 * Affiche un aperçu enrichi au survol d'une ligne
 */

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { CollaboratorEpiSummary } from '@/hooks/epi/useCollaboratorsEpiSummary';
import { RHCollaboratorAvatar } from './RHCollaboratorAvatar';
import { RHStatusBadges } from './RHStatusBadges';
import { RHProfileProgressBar } from './RHProfileProgressBar';
import { useProfileCompleteness } from '@/hooks/rh/useProfileCompleteness';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CollaboratorHoverPreviewProps {
  collaborator: RHCollaborator;
  epiSummary?: CollaboratorEpiSummary;
  children: React.ReactNode;
  onOpenProfile?: () => void;
}

// Mapping des types vers labels français
const TYPE_LABELS: Record<RHCollaborator['type'], string> = {
  TECHNICIEN: 'Technicien',
  ADMINISTRATIF: 'Administratif',
  DIRIGEANT: 'Dirigeant',
  COMMERCIAL: 'Commercial',
  AUTRE: 'Autre',
};

export function CollaboratorHoverPreview({
  collaborator,
  epiSummary,
  children,
  onOpenProfile,
}: CollaboratorHoverPreviewProps) {
  const completeness = useProfileCompleteness(collaborator);
  const isActive = !collaborator.leaving_date;
  const typeLabel = TYPE_LABELS[collaborator.type] || 'Autre';

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent 
        side="right" 
        align="start" 
        className="w-80 p-0 overflow-hidden z-[100]"
        sideOffset={8}
      >
        {/* Header avec avatar et infos principales */}
        <div className={cn(
          'p-4 border-b',
          isActive 
            ? 'bg-gradient-to-br from-primary/5 to-background' 
            : 'bg-muted/50'
        )}>
          <div className="flex items-start gap-3">
            <RHCollaboratorAvatar 
              collaborator={collaborator} 
              size="lg" 
              showTypeIcon 
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base truncate">
                  {collaborator.first_name} {collaborator.last_name}
                </h3>
                {!isActive && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    Parti
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{typeLabel}</p>
              {collaborator.role && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {collaborator.role}
                </p>
              )}
            </div>
          </div>

          {/* Barre de progression */}
          <div className="mt-3">
            <RHProfileProgressBar 
              completeness={completeness} 
              size="sm" 
              showTooltip={false}
            />
          </div>
        </div>

        {/* Statuts rapides */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <RHStatusBadges 
            collaborator={collaborator} 
            epiSummary={epiSummary}
            compact={false}
          />
        </div>

        {/* Informations de contact */}
        <div className="p-4 space-y-2">
          {collaborator.phone && (
            <a 
              href={`tel:${collaborator.phone}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3.5 w-3.5 shrink-0 group-hover:text-primary" />
              <span className="truncate">{collaborator.phone}</span>
            </a>
          )}
          {collaborator.email && (
            <a 
              href={`mailto:${collaborator.email}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-3.5 w-3.5 shrink-0 group-hover:text-primary" />
              <span className="truncate">{collaborator.email}</span>
            </a>
          )}
          {collaborator.city && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {[collaborator.postal_code, collaborator.city].filter(Boolean).join(' ')}
              </span>
            </div>
          )}
          {collaborator.hiring_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                Depuis le {format(new Date(collaborator.hiring_date), 'dd MMM yyyy', { locale: fr })}
              </span>
            </div>
          )}
        </div>

        {/* Footer avec action */}
        {onOpenProfile && (
          <div className="px-4 py-3 border-t bg-muted/20">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onOpenProfile();
              }}
            >
              Ouvrir dans un onglet
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

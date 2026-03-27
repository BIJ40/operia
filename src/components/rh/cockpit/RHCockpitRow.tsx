/**
 * Ligne du tableau cockpit RH
 * Affiche une synthèse visuelle de chaque collaborateur (style LUCCA)
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { CockpitIndicators, INDICATOR_COLORS } from '@/hooks/rh/useRHCockpitIndicators';
import { RHCockpitCell, RHCockpitCountCell, RHCockpitICECell } from './RHCockpitCell';
import { RHCollaboratorAvatar } from '@/components/rh/unified/RHCollaboratorAvatar';
import { CollaboratorHoverPreview } from '@/components/rh/unified/CollaboratorHoverPreview';
import { 
  ContactHoverCard, 
  ICEHoverCard, 
  EPIHoverCard, 
  ParcHoverCard, 
  DocsHoverCard, 
  CompetencesHoverCard 
} from './RHCockpitHoverCards';
import { Car, UserPlus } from 'lucide-react';
import { DrawerDomain } from './RHCockpitDrawer';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RHCockpitRowProps {
  collaborator: RHCollaborator;
  indicators: CockpitIndicators;
  onOpenDrawer: (domain: DrawerDomain) => void;
  onOpenProfile: () => void;
  onDoubleClick: () => void;
  onCreateAccount?: (collaborator: RHCollaborator) => void;
  canCreateAccount?: boolean;
  className?: string;
}

export function RHCockpitRow({
  collaborator,
  indicators,
  onOpenDrawer,
  onOpenProfile,
  onDoubleClick,
  onCreateAccount,
  canCreateAccount = false,
  className,
}: RHCockpitRowProps) {
  const isFormer = !!collaborator.leaving_date;

  return (
    <tr
      className={cn(
        'group transition-colors hover:bg-muted/30 cursor-pointer',
        isFormer && 'opacity-60',
        className
      )}
      onDoubleClick={onDoubleClick}
    >
      {/* Collaborateur */}
      <td className="px-3 py-2.5 sticky left-0 bg-background z-10">
        <CollaboratorHoverPreview collaborator={collaborator} onOpenProfile={onOpenProfile}>
          <div className="flex items-center gap-3 cursor-pointer">
            <RHCollaboratorAvatar collaborator={collaborator} size="sm" />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">
                {collaborator.last_name} {collaborator.first_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {collaborator.role || collaborator.type}
              </p>
            </div>
            {isFormer && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                Parti
              </span>
            )}
            {canCreateAccount && !collaborator.user_id && !isFormer && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-6 w-6 text-primary hover:text-primary/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateAccount?.(collaborator);
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Créer un compte Operia</TooltipContent>
              </Tooltip>
            )}
          </div>
        </CollaboratorHoverPreview>
      </td>

      {/* Contact */}
      <td className="px-2 py-2.5 text-center">
        <ContactHoverCard collaborator={collaborator}>
          <div>
            <RHCockpitCell
              status={indicators.contact}
              onClick={() => onOpenDrawer('contact')}
            />
          </div>
        </ContactHoverCard>
      </td>

      {/* ICE (contacts d'urgence) */}
      <td className="px-2 py-2.5 text-center">
        <ICEHoverCard collaborator={collaborator}>
          <div>
            <RHCockpitICECell
              count={indicators.ice}
              onClick={() => onOpenDrawer('ice')}
            />
          </div>
        </ICEHoverCard>
      </td>

      {/* EPI & Tailles */}
      <td className="px-2 py-2.5 text-center">
        <EPIHoverCard collaborator={collaborator}>
          <div>
            <RHCockpitCell
              status={indicators.epiTailles}
              onClick={() => onOpenDrawer('epi')}
            />
          </div>
        </EPIHoverCard>
      </td>

      {/* Parc */}
      <td className="px-2 py-2.5 text-center">
        <ParcHoverCard collaborator={collaborator}>
          <div>
            <RHCockpitCell
              status={indicators.parc === 'vehicle' ? 'ok' : 'na'}
              icon={Car}
              iconOnly
              onClick={() => onOpenDrawer('parc')}
            />
          </div>
        </ParcHoverCard>
      </td>

      {/* Documents */}
      <td className="px-2 py-2.5 text-center">
        <DocsHoverCard collaborator={collaborator} indicators={indicators}>
          <div>
            <RHCockpitCountCell
              count={indicators.documents.count}
              onClick={() => onOpenDrawer('docs')}
              threshold={1}
            />
          </div>
        </DocsHoverCard>
      </td>

      {/* Compétences */}
      <td className="px-2 py-2.5 text-center">
        <CompetencesHoverCard collaborator={collaborator}>
          <div>
            <RHCockpitCountCell
              count={indicators.competences}
              onClick={() => onOpenDrawer('competences')}
              threshold={3}
            />
          </div>
        </CompetencesHoverCard>
      </td>

      {/* Complétude - Pie chart compact */}
      <td className="px-2 py-2.5 text-center">
        <div 
          className="inline-flex items-center justify-center"
          title={`${indicators.completeness}% complété`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" className="transform -rotate-90">
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-secondary"
            />
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${indicators.completeness * 0.628} 62.8`}
              className={cn(
                indicators.completeness >= 80 ? 'text-emerald-500' :
                indicators.completeness >= 50 ? 'text-amber-500' : 'text-red-500'
              )}
            />
          </svg>
        </div>
      </td>
    </tr>
  );
}

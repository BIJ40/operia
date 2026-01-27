/**
 * Ligne du tableau cockpit RH
 * Affiche une synthèse visuelle de chaque collaborateur (style LUCCA)
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { CockpitIndicators, INDICATOR_COLORS } from '@/hooks/rh/useRHCockpitIndicators';
import { RHCockpitCell, RHCockpitRatioCell, RHCockpitCountCell, RHCockpitICECell } from './RHCockpitCell';
import { RHCollaboratorAvatar } from '@/components/rh/unified/RHCollaboratorAvatar';
import { CollaboratorHoverPreview } from '@/components/rh/unified/CollaboratorHoverPreview';
import { Car, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DrawerDomain } from './RHCockpitDrawer';

interface RHCockpitRowProps {
  collaborator: RHCollaborator;
  indicators: CockpitIndicators;
  onOpenDrawer: (domain: DrawerDomain) => void;
  onOpenProfile: () => void;
  onDoubleClick: () => void;
  className?: string;
}

export function RHCockpitRow({
  collaborator,
  indicators,
  onOpenDrawer,
  onOpenProfile,
  onDoubleClick,
  className,
}: RHCockpitRowProps) {
  const isFormer = !!collaborator.leaving_date;
  
  // Couleur de la barre de progression
  const getProgressColor = (percent: number) => {
    if (percent >= 80) return 'bg-emerald-500';
    if (percent >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <tr
      className={cn(
        'group transition-colors hover:bg-muted/30',
        isFormer && 'opacity-60',
        className
      )}
      onDoubleClick={onDoubleClick}
    >
      {/* Collaborateur */}
      <td className="px-3 py-2.5 sticky left-0 bg-background z-10">
        <CollaboratorHoverPreview collaborator={collaborator}>
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
          </div>
        </CollaboratorHoverPreview>
      </td>

      {/* Contact */}
      <td className="px-2 py-2.5 text-center">
        <RHCockpitCell
          status={indicators.contact}
          onClick={() => onOpenDrawer('contact')}
          tooltip={indicators.contact === 'ok' ? 'Email et téléphone renseignés' : 'Contact incomplet'}
        />
      </td>

      {/* ICE (contacts d'urgence) */}
      <td className="px-2 py-2.5 text-center">
        <RHCockpitICECell
          count={indicators.ice}
          onClick={() => onOpenDrawer('ice')}
        />
      </td>

      {/* RH (dates) */}
      <td className="px-2 py-2.5 text-center">
        <RHCockpitCell
          status={indicators.rh}
          onClick={() => onOpenDrawer('rh')}
          tooltip={indicators.rh === 'ok' ? 'Dates RH complètes' : 'Date d\'entrée manquante'}
        />
      </td>

      {/* EPI & Tailles */}
      <td className="px-2 py-2.5 text-center">
        <RHCockpitCell
          status={indicators.epiTailles}
          onClick={() => onOpenDrawer('epi')}
          tooltip={
            indicators.epiTailles === 'ok' ? 'EPI et tailles OK' :
            indicators.epiTailles === 'na' ? 'Non applicable' :
            'EPI ou tailles manquants'
          }
        />
      </td>

      {/* Parc */}
      <td className="px-2 py-2.5 text-center">
        <RHCockpitCell
          status={indicators.parc === 'vehicle' ? 'ok' : 'na'}
          icon={Car}
          iconOnly
          onClick={() => onOpenDrawer('parc')}
          tooltip={indicators.parc === 'vehicle' ? 'Véhicule attribué' : 'Aucun véhicule'}
        />
      </td>

      {/* Documents */}
      <td className="px-2 py-2.5 text-center">
        <RHCockpitRatioCell
          filled={indicators.documents.filled}
          total={indicators.documents.total}
          onClick={() => onOpenDrawer('docs')}
          tooltip={`${indicators.documents.filled} document(s) sur ${indicators.documents.total}`}
        />
      </td>

      {/* Compétences */}
      <td className="px-2 py-2.5 text-center">
        <RHCockpitCountCell
          count={indicators.competences}
          onClick={() => onOpenDrawer('competences')}
          tooltip={`${indicators.competences} compétence(s) validée(s)`}
          threshold={3}
        />
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

      {/* Actions */}
      <td className="px-2 py-2.5 text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenProfile}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">Voir la fiche</span>
        </Button>
      </td>
    </tr>
  );
}

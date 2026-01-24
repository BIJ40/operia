/**
 * Badges de statut pour les collaborateurs RH
 * Affiche l'état EPI, Documents, Compétences
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { CollaboratorEpiSummary } from '@/hooks/epi/useCollaboratorsEpiSummary';
import { ShieldCheck, ShieldAlert, FileCheck, FileWarning, Award, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RHStatusBadgesProps {
  collaborator: RHCollaborator;
  epiSummary?: CollaboratorEpiSummary;
  compact?: boolean;
  className?: string;
}

type StatusLevel = 'ok' | 'warning' | 'error' | 'unknown';

interface StatusInfo {
  level: StatusLevel;
  label: string;
  details?: string[];
}

// Calcul du statut EPI
function getEpiStatus(collaborator: RHCollaborator, epiSummary?: CollaboratorEpiSummary): StatusInfo {
  // Si pas de profil EPI du tout
  if (!collaborator.epi_profile) {
    return { level: 'unknown', label: 'Non configuré', details: ['Profil EPI non créé'] };
  }

  const issues: string[] = [];

  // Vérifier les tailles
  const sizesComplete = !!(
    collaborator.epi_profile.taille_haut &&
    collaborator.epi_profile.taille_bas &&
    collaborator.epi_profile.pointure
  );
  if (!sizesComplete) {
    issues.push('Tailles incomplètes');
  }

  // Vérifier via le summary si disponible
  if (epiSummary) {
    if (epiSummary.renewal_due_count > 0) {
      issues.push(`${epiSummary.renewal_due_count} EPI à renouveler`);
    }
    if (epiSummary.pending_requests > 0) {
      issues.push(`${epiSummary.pending_requests} demandes en attente`);
    }
    if (epiSummary.open_incidents > 0) {
      issues.push(`${epiSummary.open_incidents} incidents ouverts`);
    }
  }

  // Statut selon le profile
  if (collaborator.epi_profile.statut_epi === 'MISSING') {
    issues.push('EPI manquants');
  } else if (collaborator.epi_profile.statut_epi === 'TO_RENEW') {
    issues.push('EPI à renouveler');
  }

  if (issues.length === 0) {
    return { level: 'ok', label: 'OK', details: ['Tout est à jour'] };
  }
  if (issues.some(i => i.includes('incidents') || i.includes('manquants'))) {
    return { level: 'error', label: 'Alerte', details: issues };
  }
  return { level: 'warning', label: 'Attention', details: issues };
}

// Calcul du statut Documents
function getDocumentsStatus(collaborator: RHCollaborator): StatusInfo {
  const issues: string[] = [];

  if (!collaborator.permis) {
    issues.push('Permis manquant');
  }
  if (!collaborator.cni) {
    issues.push('CNI manquante');
  }

  if (issues.length === 0) {
    return { level: 'ok', label: 'OK', details: ['Documents complets'] };
  }
  if (issues.length === 2) {
    return { level: 'error', label: 'Manquants', details: issues };
  }
  return { level: 'warning', label: 'Incomplet', details: issues };
}

// Calcul du statut Compétences
function getCompetenciesStatus(collaborator: RHCollaborator): StatusInfo {
  const issues: string[] = [];

  const hasCompetences = (collaborator.competencies?.competences_techniques?.length || 0) > 0;
  const hasHabilitation = !!collaborator.competencies?.habilitation_electrique_statut;

  if (!hasCompetences) {
    issues.push('Aucune compétence');
  }
  if (!hasHabilitation) {
    issues.push('Habilitation non renseignée');
  }

  // Vérifier les expirations CACES
  const caces = collaborator.competencies?.caces || [];
  const now = new Date();
  const expiredCaces = caces.filter(c => c.expiration && new Date(c.expiration) < now);
  if (expiredCaces.length > 0) {
    issues.push(`${expiredCaces.length} CACES expiré(s)`);
  }

  if (issues.length === 0) {
    return { level: 'ok', label: 'OK', details: ['Compétences à jour'] };
  }
  if (issues.some(i => i.includes('expiré'))) {
    return { level: 'error', label: 'Expiration', details: issues };
  }
  return { level: 'warning', label: 'Incomplet', details: issues };
}

// Couleurs et icônes par niveau
const LEVEL_CONFIG: Record<StatusLevel, { 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  ok: {
    variant: 'secondary',
    className: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  warning: {
    variant: 'secondary',
    className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  },
  error: {
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  unknown: {
    variant: 'outline',
    className: 'bg-muted text-muted-foreground',
  },
};

function StatusBadge({
  icon: Icon,
  status,
  label,
  compact,
}: {
  icon: React.ComponentType<{ className?: string }>;
  status: StatusInfo;
  label: string;
  compact?: boolean;
}) {
  const config = LEVEL_CONFIG[status.level];

  const badge = (
    <Badge
      variant={config.variant}
      className={cn(
        'gap-1 transition-all duration-200',
        config.className,
        compact && 'px-1.5 py-0.5',
      )}
    >
      <Icon className={cn('h-3 w-3', compact && 'h-2.5 w-2.5')} />
      {!compact && <span className="text-[10px] font-medium">{label}</span>}
    </Badge>
  );

  if (compact || status.details?.length) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{label}: {status.label}</p>
              {status.details?.map((detail, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {detail}</p>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

export function RHStatusBadges({
  collaborator,
  epiSummary,
  compact = false,
  className,
}: RHStatusBadgesProps) {
  const epiStatus = getEpiStatus(collaborator, epiSummary);
  const docsStatus = getDocumentsStatus(collaborator);
  const competenciesStatus = getCompetenciesStatus(collaborator);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <StatusBadge
        icon={epiStatus.level === 'ok' ? ShieldCheck : ShieldAlert}
        status={epiStatus}
        label="EPI"
        compact={compact}
      />
      <StatusBadge
        icon={docsStatus.level === 'ok' ? FileCheck : FileWarning}
        status={docsStatus}
        label="Docs"
        compact={compact}
      />
      <StatusBadge
        icon={competenciesStatus.level === 'ok' ? Award : AlertTriangle}
        status={competenciesStatus}
        label="Compétences"
        compact={compact}
      />
    </div>
  );
}

// Indicateur global simple (pastille colorée)
export function RHGlobalStatusIndicator({
  collaborator,
  epiSummary,
  className,
}: {
  collaborator: RHCollaborator;
  epiSummary?: CollaboratorEpiSummary;
  className?: string;
}) {
  const epi = getEpiStatus(collaborator, epiSummary);
  const docs = getDocumentsStatus(collaborator);
  const competencies = getCompetenciesStatus(collaborator);

  // Le niveau global est le pire des trois
  const levels: StatusLevel[] = [epi.level, docs.level, competencies.level];
  let globalLevel: StatusLevel = 'ok';
  if (levels.includes('error')) {
    globalLevel = 'error';
  } else if (levels.includes('warning')) {
    globalLevel = 'warning';
  } else if (levels.includes('unknown')) {
    globalLevel = 'unknown';
  }

  const colorClasses: Record<StatusLevel, string> = {
    ok: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    unknown: 'bg-gray-400',
  };

  const allIssues = [
    ...(epi.details || []),
    ...(docs.details || []),
    ...(competencies.details || []),
  ].filter(d => !d.includes('OK') && !d.includes('à jour') && !d.includes('complets'));

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full shrink-0 transition-all',
              colorClasses[globalLevel],
              globalLevel !== 'ok' && 'animate-pulse',
              className,
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-1.5">
              {globalLevel === 'ok' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
              {globalLevel === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />}
              {globalLevel === 'error' && <ShieldAlert className="h-3.5 w-3.5 text-red-500" />}
              {globalLevel === 'ok' ? 'Profil complet' : `${allIssues.length} point(s) d'attention`}
            </p>
            {allIssues.slice(0, 5).map((issue, i) => (
              <p key={i} className="text-xs text-muted-foreground">• {issue}</p>
            ))}
            {allIssues.length > 5 && (
              <p className="text-xs text-muted-foreground">... et {allIssues.length - 5} autre(s)</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

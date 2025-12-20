/**
 * Composants de rendu des cellules EPI dans le tableau /rh/suivi
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Check, Clock, FileText, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CollaboratorEpiSummary } from '@/hooks/epi/useCollaboratorsEpiSummary';

interface EpiCellProps {
  summary?: CollaboratorEpiSummary;
}

// Nombre d'EPI attribués
export function EpiCountCell({ summary }: EpiCellProps) {
  const count = summary?.epi_count ?? 0;
  
  return (
    <div className="flex items-center justify-center">
      <Badge variant={count > 0 ? "default" : "secondary"} className="min-w-[2rem] justify-center">
        {count}
      </Badge>
    </div>
  );
}

// EPI à renouveler
export function EpiRenewalCell({ summary }: EpiCellProps) {
  const count = summary?.renewal_due_count ?? 0;
  
  if (count === 0) {
    return (
      <div className="flex items-center justify-center">
        <Check className="h-4 w-4 text-green-600" />
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <Badge variant="destructive" className="min-w-[2rem] justify-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {count}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {count} EPI à renouveler dans les 30 jours
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Demandes en cours
export function EpiRequestsCell({ summary }: EpiCellProps) {
  const count = summary?.pending_requests ?? 0;
  
  if (count === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground">
        —
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <Badge variant="outline" className="min-w-[2rem] justify-center gap-1 text-orange-600 border-orange-300">
              <Clock className="h-3 w-3" />
              {count}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {count} demande(s) EPI en attente
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Incidents ouverts
export function EpiIncidentsCell({ summary }: EpiCellProps) {
  const count = summary?.open_incidents ?? 0;
  
  if (count === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground">
        —
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <Badge variant="destructive" className="min-w-[2rem] justify-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              {count}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {count} incident(s) EPI ouvert(s)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Statut attestation mensuelle
export function EpiAckStatusCell({ summary }: EpiCellProps) {
  const status = summary?.ack_status;
  
  if (!status) {
    return (
      <div className="flex items-center justify-center text-muted-foreground">
        —
      </div>
    );
  }
  
  const statusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    pending: {
      icon: <Clock className="h-3 w-3" />,
      label: 'En attente signature',
      className: 'text-yellow-600 border-yellow-300 bg-yellow-50',
    },
    signed_by_n1: {
      icon: <FileText className="h-3 w-3" />,
      label: 'Signé N1',
      className: 'text-blue-600 border-blue-300 bg-blue-50',
    },
    signed_by_n2: {
      icon: <Check className="h-3 w-3" />,
      label: 'Validé N2',
      className: 'text-green-600 border-green-300 bg-green-50',
    },
    overdue: {
      icon: <X className="h-3 w-3" />,
      label: 'Non signé',
      className: 'text-red-600 border-red-300 bg-red-50',
    },
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <Badge variant="outline" className={cn("gap-1", config.className)}>
              {config.icon}
              <span className="hidden sm:inline text-[10px]">{config.label}</span>
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>{config.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Synthèse globale EPI OK
export function EpiOkCell({ summary }: EpiCellProps) {
  const isOk = summary?.epi_ok ?? false;
  
  return (
    <div className="flex items-center justify-center">
      {isOk ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-green-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </TooltipTrigger>
            <TooltipContent>EPI à jour, aucun problème</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-orange-500">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </TooltipTrigger>
            <TooltipContent>Attention requise (demande, incident ou attestation)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

/**
 * Hook de détection des incohérences entre statuts devis et statuts dossier.
 *
 * Règle métier :
 *   Un devis "accepté" (accepted / order) ne peut exister que dans un dossier dont
 *   le state fait partie de VALID_PROJECT_STATES_FOR_ACCEPTED_DEVIS.
 *   Tout autre cas est une anomalie.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { DataService } from '@/apogee-connect/services/dataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import type { Project, Client, Devis } from '@/apogee-connect/types';

// --- Règles métier ---

/** Statuts devis considérés comme "validé / accepté" */
const ACCEPTED_DEVIS_STATES = new Set(['accepted', 'order']);

/** Statuts dossier cohérents avec un devis accepté */
const VALID_PROJECT_STATES_FOR_ACCEPTED_DEVIS = new Set([
  'devis_to_order',   // À commander
  'wait_fourn',       // Attente fourn.
  'to_planify_tvx',   // À planifier
  'planified_tvx',    // À planifier (variante)
  'planifie_rt',      // Planifié RT
  'to_be_invoiced',   // À facturer
  'stand_by',         // En attente
]);

/** Labels lisibles pour les états */
const STATE_LABELS: Record<string, string> = {
  'new': 'Nouveau',
  'devis_sent': 'Devis envoyé',
  'devis_to_order': 'À commander',
  'devis_a_faire': 'Devis à faire',
  'wait_fourn': 'Attente fourn.',
  'to_planify_tvx': 'À planifier',
  'planified_tvx': 'À planifier',
  'planifie_rt': 'Planifié RT',
  'rt_fait': 'RT fait',
  'to_be_invoiced': 'À facturer',
  'invoiced': 'Facturé',
  'invoice': 'Facturé',
  'done': 'Terminé',
  'canceled': 'Annulé',
  'stand_by': 'En attente',
  'accepted': 'Accepté',
  'order': 'Commandé',
  'refused': 'Refusé',
  'draft': 'Brouillon',
  'sent': 'Envoyé',
};

function label(state: string): string {
  return STATE_LABELS[state] || state || '—';
}

/** Matrice de raisons d'anomalie par état dossier */
function getAnomalyReason(projectState: string, devisState: string): string {
  const ps = label(projectState);
  const ds = label(devisState);

  switch (projectState) {
    case 'invoiced':
    case 'invoice':
      return `Dossier "${ps}" : le devis devrait être en "Facturé", pas "${ds}"`;
    case 'done':
      return `Dossier "${ps}" : le devis devrait être clôturé ou facturé, pas "${ds}"`;
    case 'canceled':
      return `Dossier "${ps}" : le devis devrait être annulé ou refusé, pas "${ds}"`;
    case 'new':
      return `Dossier "${ps}" : aucun devis ne devrait être accepté à ce stade`;
    case 'devis_sent':
      return `Dossier "${ps}" : le devis est encore en envoi, il ne peut pas être accepté`;
    case 'devis_a_faire':
      return `Dossier "${ps}" : le devis n'est pas encore fait, il ne peut pas être accepté`;
    case 'rt_fait':
      return `Dossier "${ps}" : le RT est fait mais le dossier n'est pas passé en commande/planification`;
    default:
      return `Statut dossier "${ps}" incohérent avec un devis "${ds}"`;
  }
}

// --- Types ---

export interface AnomalieDevisDossier {
  projectId: string;
  projectRef: string;
  projectLabel: string;
  projectState: string;
  projectStateLabel: string;
  clientName: string;
  devisId: string;
  devisState: string;
  devisStateLabel: string;
  devisHT: number;
  reason: string;
}

export type AnomalySeverity = 'critical' | 'warning';

export function getAnomalySeverity(projectState: string): AnomalySeverity {
  if (['invoiced', 'invoice', 'done', 'canceled'].includes(projectState)) return 'critical';
  return 'warning';
}

// --- Hook ---

export function useAnomaliesDevisDossier() {
  const { agence } = useProfile();
  const { isAgencyReady } = useAgency();

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['anomalies-devis-dossier', agence],
    enabled: !!agence && isAgencyReady,
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const apiData = await DataService.loadAllData(true, false, agence);
      return {
        devis: (apiData.devis || []) as Devis[],
        projects: (apiData.projects || []) as Project[],
        clients: (apiData.clients || []) as Client[],
      };
    },
  });

  const anomalies = useMemo<AnomalieDevisDossier[]>(() => {
    if (!rawData) return [];

    const { devis, projects, clients } = rawData;
    const projectMap = new Map(projects.map(p => [String(p.id), p]));
    const clientMap = new Map(clients.map(c => [String(c.id), c]));

    const result: AnomalieDevisDossier[] = [];

    for (const d of devis) {
      const devisState = (d.state || (d as any).data?.state || '').trim().toLowerCase();
      if (!ACCEPTED_DEVIS_STATES.has(devisState)) continue;

      const pid = String(d.projectId);
      const project = projectMap.get(pid);
      if (!project) continue;

      const projectState = (project.state || '').toLowerCase();

      // Si le statut dossier est valide pour un devis accepté → pas d'anomalie
      if (VALID_PROJECT_STATES_FOR_ACCEPTED_DEVIS.has(projectState)) continue;

      // Anomalie détectée
      const client = project.clientId ? clientMap.get(String(project.clientId)) : undefined;
      const ht = parseFloat(String((d as any).data?.totalHT ?? d.totalHT ?? 0).replace(/[^0-9.\-]/g, '')) || 0;

      result.push({
        projectId: pid,
        projectRef: (project as any).ref || `#${pid}`,
        projectLabel: (project as any).label || project.nom || '',
        projectState,
        projectStateLabel: label(projectState),
        clientName: client?.nom || client?.raisonSociale || '—',
        devisId: String(d.id),
        devisState,
        devisStateLabel: label(devisState),
        devisHT: ht,
        reason: getAnomalyReason(projectState, devisState),
      });
    }

    // Sort: critical first, then by project ref
    result.sort((a, b) => {
      const sa = getAnomalySeverity(a.projectState);
      const sb = getAnomalySeverity(b.projectState);
      if (sa !== sb) return sa === 'critical' ? -1 : 1;
      return a.projectRef.localeCompare(b.projectRef);
    });

    return result;
  }, [rawData]);

  const stats = useMemo(() => {
    const critical = anomalies.filter(a => getAnomalySeverity(a.projectState) === 'critical').length;
    const warning = anomalies.length - critical;
    const totalHT = anomalies.reduce((s, a) => s + a.devisHT, 0);
    return { total: anomalies.length, critical, warning, totalHT };
  }, [anomalies]);

  return { anomalies, stats, isLoading };
}

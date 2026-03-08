/**
 * useApporteurDashboardLive - KPIs calculés en LIVE depuis l'API Apogée
 * 
 * Contrairement à useApporteurDashboard qui lit des tables pré-agrégées,
 * ce hook récupère les données brutes Apogée (projets, factures, devis)
 * et calcule les KPIs à la volée en filtrant par commanditaireId.
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { apogeeProxy } from '@/services/apogeeProxy';
import type { AggregatedKPIs, UniversAggregated } from '../engine/aggregators';
import type { ApporteurDashboardData } from './useApporteurDashboard';
import { computeAdaptiveScore, type AdaptiveScore, type MonthlyTrendEntry } from '../engine/adaptiveScoring';

interface UseApporteurDashboardLiveOptions {
  apporteurId: string | null;
  dateFrom: string;
  dateTo: string;
  enabled?: boolean;
}

/**
 * Calcule les KPIs d'un apporteur directement depuis les données Apogée brutes
 */
export interface ApporteurDashboardLiveData extends ApporteurDashboardData {
  adaptiveScore: AdaptiveScore | null;
  monthlyTrendFull: MonthlyTrendEntry[];
}

export function useApporteurDashboardLive({
  apporteurId,
  dateFrom,
  dateTo,
  enabled = true,
}: UseApporteurDashboardLiveOptions) {
  const { agence } = useProfile();

  return useQuery<ApporteurDashboardLiveData>({
    queryKey: ['prospection-apporteur-live', agence, apporteurId, dateFrom, dateTo],
    queryFn: async (): Promise<ApporteurDashboardLiveData> => {
      if (!agence || !apporteurId) throw new Error('Missing params');

      const numericId = Number(apporteurId);

      // Charger projets, factures, devis en parallèle via le proxy Apogée
      const [projects, factures, devis] = await Promise.all([
        apogeeProxy.getProjects({ agencySlug: agence }),
        apogeeProxy.getFactures({ agencySlug: agence }),
        apogeeProxy.getDevis({ agencySlug: agence }),
      ]);

      // Filtrer les projets de cet apporteur (commanditaireId)
      const apporteurProjects = (projects || []).filter((p: any) => {
        const cmdId = p?.data?.commanditaireId;
        return cmdId !== undefined && cmdId !== null && Number(cmdId) === numericId;
      });

      const projectIds = new Set(apporteurProjects.map((p: any) => p.id));

      // Filtrer par période
      const inDateRange = (dateStr: string | undefined) => {
        if (!dateStr) return false;
        const d = dateStr.slice(0, 10);
        return d >= dateFrom && d <= dateTo;
      };

      // Projets dans la période
      const periodProjects = apporteurProjects.filter((p: any) => {
        const d = p.dateReelle || p.date || p.created_at;
        return inDateRange(d);
      });

      // Factures liées aux projets de cet apporteur + dans la période
      const apporteurFactures = (factures || []).filter((f: any) => {
        const fProjectId = f.projectId ?? f.project_id;
        if (!projectIds.has(fProjectId) && !projectIds.has(Number(fProjectId)) && !projectIds.has(String(fProjectId))) return false;
        const d = f.dateReelle || f.date || f.created_at;
        return inDateRange(d);
      });

      // Devis liés aux projets de cet apporteur + dans la période
      const apporteurDevis = (devis || []).filter((d: any) => {
        const dProjectId = d.projectId ?? d.project_id;
        if (!projectIds.has(dProjectId) && !projectIds.has(Number(dProjectId)) && !projectIds.has(String(dProjectId))) return false;
        const dt = d.dateReelle || d.date || d.created_at;
        return inDateRange(dt);
      });

      // Set des projets facturés (preuve de transformation)
      const facturatedProjectIds = new Set(
        apporteurFactures.map((f: any) => String(f.projectId ?? f.project_id))
      );

      // Devis signés (validés)
      const validDevisStates = ['validated', 'signed', 'order', 'accepted'];
      const signedDevis = apporteurDevis.filter((d: any) => {
        if (validDevisStates.includes(d.state?.toLowerCase?.())) return true;
        if (d.refId || d.invoiceId) return true;
        // Projet facturé = devis transformé
        if (facturatedProjectIds.has(String(d.projectId ?? d.project_id))) return true;
        return false;
      });

      // CA HT depuis factures
      const caHT = apporteurFactures.reduce((sum: number, f: any) => {
        const ht = f.data?.totalHT ?? f.totalHT ?? 0;
        return sum + (Number(ht) || 0);
      }, 0);

      // KPIs
      const dossiers_received = periodProjects.length;
      const devis_total = apporteurDevis.length;
      const devis_signed = signedDevis.length;
      const facturesCount = apporteurFactures.length;

      // Dossiers avec facture (transformés) — qu'ils aient un devis ou non
      const dossiersAvecFacture = periodProjects.filter((p: any) => {
        const pid = p.id;
        return apporteurFactures.some((f: any) => (f.projectId ?? f.project_id) == pid);
      }).length;

      // Dossiers sans devis MAIS avec facture = transformés directement
      const dossiersSansDevis = periodProjects.filter((p: any) => {
        const pid = p.id;
        return !apporteurDevis.some((d: any) => (d.projectId ?? d.project_id) == pid);
      });
      const dossiersAvecFactureSansDevis = dossiersSansDevis.filter((p: any) => {
        const pid = p.id;
        return apporteurFactures.some((f: any) => (f.projectId ?? f.project_id) == pid);
      }).length;

      const kpis: AggregatedKPIs = {
        dossiers_received,
        dossiers_closed: periodProjects.filter((p: any) => ['clos', 'done', 'closed', 'invoiced'].includes(p.state?.toLowerCase?.() || '')).length,
        devis_total,
        devis_signed,
        factures: facturesCount,
        ca_ht: Math.round(caHT * 100) / 100,
        panier_moyen: facturesCount > 0 ? Math.round(caHT / facturesCount) : null,
        taux_transfo_devis: devis_total > 0 ? Math.round((devis_signed / devis_total) * 10000) / 100 : null,
        taux_transfo_dossier: dossiers_received > 0 ? Math.round((dossiersAvecFacture / dossiers_received) * 10000) / 100 : null,
        dossiers_sans_devis: dossiersSansDevis.length,
        dossiers_avec_facture_sans_devis: dossiersAvecFactureSansDevis,
        devis_non_signes: devis_total - devis_signed,
        delai_dossier_devis_avg: null,
        delai_devis_signature_avg: null,
        delai_signature_facture_avg: null,
      };

      // Mix univers
      const universMap = new Map<string, UniversAggregated>();
      for (const p of periodProjects) {
        const universes: string[] = p.data?.universes || ['Non classé'];
        const share = 1 / universes.length;
        
        // Trouver factures et devis liés à ce projet
        const pFactures = apporteurFactures.filter((f: any) => (f.projectId ?? f.project_id) == p.id);
        const pDevis = apporteurDevis.filter((d: any) => (d.projectId ?? d.project_id) == p.id);
        const pCA = pFactures.reduce((s: number, f: any) => s + (Number(f.data?.totalHT ?? f.totalHT ?? 0) || 0), 0);
        
        for (const uni of universes) {
          const code = uni || 'Non classé';
          const existing = universMap.get(code) || { univers_code: code, dossiers: 0, devis: 0, factures: 0, ca_ht: 0 };
          existing.dossiers += share;
          existing.devis += pDevis.length * share;
          existing.factures += pFactures.length * share;
          existing.ca_ht += pCA * share;
          universMap.set(code, existing);
        }
      }
      const universData = Array.from(universMap.values())
        .map(u => ({ ...u, dossiers: Math.round(u.dossiers), devis: Math.round(u.devis), factures: Math.round(u.factures), ca_ht: Math.round(u.ca_ht) }))
        .sort((a, b) => b.ca_ht - a.ca_ht);

      // Tendances mensuelles (période sélectionnée)
      const monthMap = new Map<string, { dossiers: number; ca_ht: number; devis_total: number; devis_signed: number; factures: number }>();
      
      for (const p of periodProjects) {
        const d = (p.dateReelle || p.date || p.created_at || '').slice(0, 7);
        if (!d) continue;
        const m = monthMap.get(d) || { dossiers: 0, ca_ht: 0, devis_total: 0, devis_signed: 0, factures: 0 };
        m.dossiers++;
        monthMap.set(d, m);
      }
      for (const f of apporteurFactures) {
        const d = (f.dateReelle || f.date || f.created_at || '').slice(0, 7);
        if (!d) continue;
        const m = monthMap.get(d) || { dossiers: 0, ca_ht: 0, devis_total: 0, devis_signed: 0, factures: 0 };
        m.ca_ht += Number(f.data?.totalHT ?? f.totalHT ?? 0) || 0;
        m.factures++;
        monthMap.set(d, m);
      }
      for (const d of apporteurDevis) {
        const dt = (d.dateReelle || d.date || d.created_at || '').slice(0, 7);
        if (!dt) continue;
        const m = monthMap.get(dt) || { dossiers: 0, ca_ht: 0, devis_total: 0, devis_signed: 0, factures: 0 };
        m.devis_total++;
        if (validDevisStates.includes(d.state?.toLowerCase?.()) || d.refId || d.invoiceId
            || facturatedProjectIds.has(String(d.projectId ?? d.project_id))) {
          m.devis_signed++;
        }
        monthMap.set(dt, m);
      }

      const monthlyTrend = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, d]) => ({
          month,
          dossiers: d.dossiers,
          ca_ht: Math.round(d.ca_ht),
          taux_transfo: d.devis_total > 0 ? Math.round((d.devis_signed / d.devis_total) * 10000) / 100 : null,
        }));

      // ─── Monthly trend FULL (tous mois, sans filtre date) pour scoring adaptatif ───
      const fullMonthMap = new Map<string, { dossiers: number; ca_ht: number; devis_total: number; devis_signed: number; factures: number }>();

      for (const p of apporteurProjects) {
        const d = (p.dateReelle || p.date || p.created_at || '').slice(0, 7);
        if (!d) continue;
        const m = fullMonthMap.get(d) || { dossiers: 0, ca_ht: 0, devis_total: 0, devis_signed: 0, factures: 0 };
        m.dossiers++;
        fullMonthMap.set(d, m);
      }

      // Toutes factures de l'apporteur (sans filtre date)
      const allApporteurFactures = (factures || []).filter((f: any) => {
        const fProjectId = f.projectId ?? f.project_id;
        return projectIds.has(fProjectId) || projectIds.has(Number(fProjectId)) || projectIds.has(String(fProjectId));
      });
      for (const f of allApporteurFactures) {
        const d = (f.dateReelle || f.date || f.created_at || '').slice(0, 7);
        if (!d) continue;
        const m = fullMonthMap.get(d) || { dossiers: 0, ca_ht: 0, devis_total: 0, devis_signed: 0, factures: 0 };
        m.ca_ht += Number(f.data?.totalHT ?? f.totalHT ?? 0) || 0;
        m.factures++;
        fullMonthMap.set(d, m);
      }

      // Tous devis de l'apporteur (sans filtre date)
      const allApporteurDevis = (devis || []).filter((d: any) => {
        const dProjectId = d.projectId ?? d.project_id;
        return projectIds.has(dProjectId) || projectIds.has(Number(dProjectId)) || projectIds.has(String(dProjectId));
      });
      const allFacturatedProjectIds = new Set(
        allApporteurFactures.map((f: any) => String(f.projectId ?? f.project_id))
      );
      for (const d of allApporteurDevis) {
        const dt = (d.dateReelle || d.date || d.created_at || '').slice(0, 7);
        if (!dt) continue;
        const m = fullMonthMap.get(dt) || { dossiers: 0, ca_ht: 0, devis_total: 0, devis_signed: 0, factures: 0 };
        m.devis_total++;
        if (validDevisStates.includes(d.state?.toLowerCase?.()) || d.refId || d.invoiceId
            || allFacturatedProjectIds.has(String(d.projectId ?? d.project_id))) {
          m.devis_signed++;
        }
        fullMonthMap.set(dt, m);
      }

      const monthlyTrendFull: MonthlyTrendEntry[] = Array.from(fullMonthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, d]) => ({
          month,
          dossiers: d.dossiers,
          ca_ht: Math.round(d.ca_ht),
          factures: d.factures,
          devis_total: d.devis_total,
          devis_signed: d.devis_signed,
          taux_transfo: d.devis_total > 0 ? Math.round((d.devis_signed / d.devis_total) * 10000) / 100 : null,
        }));

      const adaptiveScore = computeAdaptiveScore(monthlyTrendFull, 3, kpis);

      return { kpis, universData, monthlyTrend, adaptiveScore, monthlyTrendFull };
    },
    enabled: enabled && !!agence && !!apporteurId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Utilitaires pour le mode développement apporteur
 */

export function isApporteurDevMode(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname.includes('preview') ||
    hostname.includes('lovable')
  );
}

/**
 * Données mock pour le mode développement
 */
export const MOCK_PLANNING_RESPONSE = {
  success: true,
  data: {
    events: [] as Array<{
      id: number;
      projectId: number;
      projectRef: string;
      clientName: string;
      city: string;
      date: string;
      time: string | null;
      type: string;
      typeLabel: string;
      technicianName: string | null;
    }>,
    week: {
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      offset: 0,
    },
  },
};

export const MOCK_DOSSIERS_RESPONSE = {
  success: true,
  data: {
    dossiers: [] as Array<{
      id: number;
      ref: string;
      clientName: string;
      address: string;
      city: string;
      status: string;
      statusLabel: string;
      dateCreation: string | null;
      datePremierRdv: string | null;
      dateDevisEnvoye: string | null;
      dateDevisValide: string | null;
      dateRdvTravaux: string | null;
      dateFacture: string | null;
      dateReglement: string | null;
      lastModified: string | null;
      devisHT: number;
      factureHT: number;
      restedu: number;
      devisId: number | null;
      factureId: number | null;
    }>,
    totals: {
      count: 0,
      resteDu: 0,
    },
  },
};

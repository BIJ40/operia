import { Intervention, Devis } from "./index";

export interface AnalyseRTDevis {
  // IDs
  rtId: string;
  devisId: string;
  projectId: string;
  
  // Dates et délais
  dateRT?: string;
  dateDevis?: string;
  deltaJours?: number;
  
  // Données brutes
  rt: Intervention;
  devis: Devis;
  
  // Lignes normalisées pour ML
  lignesRT: LigneNormalisee[];
  lignesDevis: LigneNormalisee[];
  
  // Enrichissement
  apporteurId?: string;
  apporteurLabel: string;
  typeApporteur?: string;
  univers: string[];
  
  // Métriques
  montantDevisHT?: number;
  nbLignesDevis?: number;
}

export interface LigneNormalisee {
  type?: string;
  categorie?: string;
  descriptif?: string;
  quantite?: number;
  montantHT?: number;
  univers?: string;
}

export interface AnalyseRTDevisFilters {
  apporteurs: string[];
  univers: string[];
}

export interface AnalyseRTDevisSummary {
  totalPaires: number;
  apporteursUniques: string[];
  universUniques: string[];
  deltaMoyen?: number;
  montantMoyenDevisHT?: number;
}

/**
 * Types pour le module Bon d'Intervention
 */

export interface TravailEffectue {
  id: string;
  description: string;
  quantite?: number;
  unite?: string;
}

export interface MateriauUtilise {
  id: string;
  designation: string;
  quantite: number;
  unite: string;
  reference?: string;
}

export interface PhotoBI {
  id: string;
  dataUrl: string;
  legende?: string;
  timestamp: string;
}

export interface BonIntervention {
  id: string;
  interventionId: number;
  projectId: number;
  
  // Infos dossier (pré-remplies)
  clientNom: string;
  clientAdresse: string;
  clientTelephone?: string;
  clientEmail?: string;
  refDossier: string;
  
  // Infos intervention
  dateIntervention: string;
  heureDepart: string;
  heureArrivee: string;
  heureFin: string;
  tempsPasse?: number; // en minutes, calculé
  
  // Technicien
  technicienId: number;
  technicienNom: string;
  
  // Travaux et matériaux
  travaux: TravailEffectue[];
  materiaux: MateriauUtilise[];
  
  // Observations
  observations?: string;
  recommandations?: string;
  
  // Photos
  photos: PhotoBI[];
  
  // Signature client
  signatureClient?: string; // data:image/png base64
  signataireNom?: string;
  signatureDate?: string;
  
  // Métadonnées
  status: 'draft' | 'signed' | 'exported';
  createdAt: string;
  updatedAt: string;
}

export interface BonInterventionFormData {
  heureDepart: string;
  heureArrivee: string;
  heureFin: string;
  tempsPasse?: number;
  travaux: TravailEffectue[];
  materiaux: MateriauUtilise[];
  observations: string;
  recommandations: string;
  photos: PhotoBI[];
}

export const createEmptyBI = (
  interventionId: number,
  projectId: number,
  clientNom: string,
  clientAdresse: string,
  refDossier: string,
  technicienId: number,
  technicienNom: string,
  dateIntervention: string
): BonIntervention => ({
  id: `bi-${interventionId}-${Date.now()}`,
  interventionId,
  projectId,
  clientNom,
  clientAdresse,
  refDossier,
  dateIntervention,
  heureDepart: '',
  heureArrivee: '',
  heureFin: '',
  technicienId,
  technicienNom,
  travaux: [],
  materiaux: [],
  photos: [],
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

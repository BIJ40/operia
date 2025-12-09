/**
 * Types pour le module PV Apporteur
 * PV de réception pour les apporteurs d'affaires
 */

export interface ConstatRealise {
  id: string;
  description: string;
  conforme: boolean;
  commentaire?: string;
}

export interface ReserveFormule {
  id: string;
  description: string;
  estLevee: boolean;
  dateLevee?: string;
}

export interface PhotoPV {
  id: string;
  dataUrl: string;
  legende?: string;
  timestamp: string;
}

export interface PvApporteur {
  id: string;
  dossierId: number;
  projectId: number;
  
  // Infos dossier (pré-remplies)
  clientNom: string;
  clientAdresse: string;
  clientTelephone?: string;
  clientEmail?: string;
  refDossier: string;
  apporteurNom?: string;
  apporteurId?: number;
  
  // Infos réception
  dateReception: string;
  heureReception: string;
  
  // Technicien / Représentant agence
  technicienId: number;
  technicienNom: string;
  
  // Constats
  constats: ConstatRealise[];
  
  // Réserves
  reserves: ReserveFormule[];
  sansReserve: boolean;
  
  // Observations
  observations?: string;
  conclusionGenerale?: string;
  
  // Photos
  photos: PhotoPV[];
  
  // Signature client
  signatureClient?: string; // data:image/png base64
  signataireNom?: string;
  signatureDate?: string;
  
  // Signature apporteur (optionnel)
  signatureApporteur?: string;
  signataireApporteurNom?: string;
  signatureApporteurDate?: string;
  
  // Métadonnées
  status: 'draft' | 'signed' | 'exported';
  createdAt: string;
  updatedAt: string;
}

export interface PvApporteurFormData {
  dateReception: string;
  heureReception: string;
  constats: ConstatRealise[];
  reserves: ReserveFormule[];
  sansReserve: boolean;
  observations: string;
  conclusionGenerale: string;
  photos: PhotoPV[];
}

export const createEmptyPV = (
  dossierId: number,
  projectId: number,
  clientNom: string,
  clientAdresse: string,
  refDossier: string,
  technicienId: number,
  technicienNom: string,
  dateReception: string,
  apporteurNom?: string,
  apporteurId?: number
): PvApporteur => ({
  id: `pv-${dossierId}-${Date.now()}`,
  dossierId,
  projectId,
  clientNom,
  clientAdresse,
  refDossier,
  apporteurNom,
  apporteurId,
  dateReception,
  heureReception: '',
  technicienId,
  technicienNom,
  constats: [],
  reserves: [],
  sansReserve: true,
  photos: [],
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/**
 * Types enrichis pour les utilisateurs Apogée (API /apiGetUsers)
 */

export interface ApogeeUserData {
  color?: { hex?: string } | null;
  bgcolor?: { hex?: string; hex8?: string } | null;
  activity?: Array<{ date: string; userId: number; is_on: boolean }> | null;
  matricule?: string | null;
  universes?: string[] | null;
  skills?: string[] | null;
  dFields?: unknown[] | null;
  numtel2?: string | null;
}

export interface ApogeeUserFull {
  id: number;
  name?: string | null;         // Nom de famille
  firstname?: string | null;    // Prénom
  initiales?: string | null;
  type?: string | null;         // "technicien", "utilisateur", "admin", "commercial"
  username?: string | null;
  email?: string | null;
  rights?: unknown[];
  data?: ApogeeUserData | null;
  email_verified_at?: string | null;
  image?: Array<{ id: number; IS_MEDIA: boolean }> | null;
  documents?: unknown[];
  numtel?: string | null;       // Téléphone principal
  signature?: number | null;
  created_at?: string | null;   // Date création = date embauche
  updated_at?: string | null;
  is_on?: boolean | null;       // Actif/Inactif - CLEF POUR LE STATUT
  adresse?: string | null;
  adresse2?: string | null;
  ville?: string | null;
  cp?: string | null;
  locationId?: string | null;
  startFromHome?: boolean;
}

/**
 * Mapping du type Apogée vers le type Collaborator
 */
export function mapApogeeTypeToCollaboratorType(apogeeType: string | null | undefined): 'TECHNICIEN' | 'ADMINISTRATIF' | 'DIRIGEANT' | 'COMMERCIAL' | 'AUTRE' {
  switch (apogeeType?.toLowerCase()) {
    case 'technicien':
      return 'TECHNICIEN';
    case 'admin':
      return 'DIRIGEANT';
    case 'utilisateur':
      return 'ADMINISTRATIF';
    case 'commercial':
      return 'COMMERCIAL';
    default:
      return 'AUTRE';
  }
}

/**
 * Extraire la couleur de fond pour affichage
 */
export function getApogeeBgColor(user: ApogeeUserFull): string | null {
  return user.data?.bgcolor?.hex || null;
}

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  tel?: string;
  role?: string;
  type?: string;
  universes?: string[];
  initiales?: string;
}

export interface Client {
  id: string;
  nom: string;
  prenom?: string;
  raisonSociale?: string;
  civilite?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  tel?: string;
  email?: string;
  type?: string;
  typeClient?: string;
  codeCompta?: string;
  state?: string;
}

export interface Project {
  id: string;
  clientId: string;
  siteId?: string;
  nom?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  state?: string;
  universes?: string[];
  commanditaireId?: string;
  dateIntervention?: string;
  totalHT?: number;
  totalTTC?: number;
  aPercevoir?: number;
  data?: {
    commanditaireId?: string;
    [key: string]: any;
  };
}

export interface Intervention {
  id: string;
  projectId: string;
  clientId: string;
  client_id?: string;
  date?: string;
  dateIntervention?: string;
  type?: string;
  type2?: string;
  state?: string;
  universes?: string[];
  usersIds?: string[];
  duree?: number;
  nbTechs?: number;
  techTimeStart?: string;
  techTimeEnd?: string;
  cp?: string;
  ville?: string;
  data?: {
    biRt?: any;
    biDepan?: any;
    biTvx?: any;
    biV3?: any;
    visites?: any[];
    anomalies?: any[];
    actions?: any[];
    isRT?: boolean;
    [key: string]: any;
  };
}

export interface Devis {
  id: string;
  projectId: string;
  clientId: string;
  date?: string;
  state?: string;
  totalHT?: number;
  totalTTC?: number;
  items?: DevisItem[];
  calc?: {
    facturedHT?: number;
    facturedTTC?: number;
    facturedPourc?: number;
    resteFacturedHT?: number;
    resteFacturedTTC?: number;
  };
  data?: {
    universe?: string;
    [key: string]: any;
  };
}

export interface DevisItem {
  uid?: string;
  type?: string;
  product?: string;
  productId?: string;
  descriptif?: string;
  qte?: number;
  qteMO?: number;
  prixUnitaire?: number;
  prixAchat?: number;
  tva?: number;
  totalHt?: number;
  totalTtc?: number;
}

export interface Facture {
  id: string;
  projectId: string;
  clientId: string;
  numeroFacture?: string;
  date?: string;
  typeFacture?: string;
  state?: string;
  etatReglement?: string;
  totalHT?: number;
  totalTTC?: number;
  isPaid?: boolean;
  items?: FactureItem[];
  refDevisId?: string;
  refInterventionId?: string;
  calc?: {
    paidTTC?: number;
    paidPourc?: number;
    restePaidTTC?: number;
  };
  reglementsData?: any[];
}

export interface FactureItem {
  uid?: string;
  type?: string;
  product?: string;
  descriptif?: string;
  qte?: number;
  qtePaid?: number;
  prixUnitaire?: number;
  tva?: number;
  totalHt?: number;
  totalTtc?: number;
}

export interface InterventionCreneau {
  id: string;
  interventionId: string;
  date?: string;
  duree?: number;
  usersIds?: string[];
  state?: string;
}

export interface DashboardStats {
  totalClients: number;
  activeProjects: number;
  pendingInterventions: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  clientsGrowth: number;
  projectsGrowth: number;
}

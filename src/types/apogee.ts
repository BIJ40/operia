/**
 * Shared types for Apogée API data records.
 * Used across KPI calculations, performance, SAV detection, etc.
 * Replaces `any` in hooks that process Apogée API responses.
 */

/** Generic nested data wrapper from Apogée */
export interface ApogeeNestedData {
  [key: string]: unknown;
}

/** Apogée User */
export interface ApogeeUser {
  id: number;
  firstname?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
}

/** Apogée Intervention */
export interface ApogeeIntervention {
  id?: number;
  type2?: string;
  userId?: number | string;
  user_id?: number | string;
  usersIds?: Array<string | number>;
  visites?: ApogeeVisite[];
  dateReelle?: string;
  date?: string;
  createdAt?: string;
  projectId?: number;
  project_id?: number;
  data?: {
    type2?: string;
    visites?: ApogeeVisite[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Apogée Visite (sub-record of intervention) */
export interface ApogeeVisite {
  type2?: string;
  usersIds?: Array<string | number>;
  [key: string]: unknown;
}

/** Apogée Project */
export interface ApogeeProject {
  id?: number;
  clientId?: number;
  client_id?: number;
  pictos?: string[];
  pictosInterv?: string[];
  data?: {
    pictosInterv?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Apogée Facture */
export interface ApogeeFacture {
  id?: number;
  type?: string;
  typeFacture?: string;
  totalHT?: number | string;
  montantHT?: number | string;
  dateReelle?: string;
  dateEmission?: string;
  date?: string;
  createdAt?: string;
  created_at?: string;
  createdBy?: number;
  userId?: number;
  technicien?: string;
  data?: {
    totalHT?: number | string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Apogée Devis */
export interface ApogeeDevis {
  id?: number;
  dateReelle?: string;
  date?: string;
  createdAt?: string;
  createdBy?: number;
  userId?: number;
  status?: string;
  [key: string]: unknown;
}

/** Apogée Client */
export interface ApogeeClient {
  id?: number;
  name?: string;
  [key: string]: unknown;
}

/** Loaded data set from Apogée API */
export interface ApogeeLoadedData {
  users: ApogeeUser[];
  clients: ApogeeClient[];
  projects: ApogeeProject[];
  interventions: ApogeeIntervention[];
  factures: ApogeeFacture[];
  devis: ApogeeDevis[];
}

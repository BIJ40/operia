/**
 * Types pour les documents PDF générés via apiGetProjectByHashZipCode
 */

export interface ApogeeGeneratedDoc {
  id: string;
  userId: string;
  type: string;
  fileName: string;
  kind: string;
  refId: string;
  url: string;
  state: string;
  created_at: string;
  data: {
    docLabel?: string;
    nbPages?: number;
    isSignature?: boolean;
    size?: number;
  };
}

export interface ApogeeGeneratedDocsResponse {
  projects: ApogeeGeneratedDoc[][];
  deviss: ApogeeGeneratedDoc[][];
  factures: ApogeeGeneratedDoc[][];
  interventions: ApogeeGeneratedDoc[][];
}

/** Catégorie de document pour l'affichage */
export interface DocCategory {
  key: keyof ApogeeGeneratedDocsResponse;
  label: string;
  icon: string;
}

export const DOC_CATEGORIES: DocCategory[] = [
  { key: 'factures', label: 'Factures', icon: 'FileText' },
  { key: 'deviss', label: 'Devis', icon: 'FileCheck' },
  { key: 'interventions', label: "Rapports d'intervention", icon: 'Wrench' },
  { key: 'projects', label: 'Documents projet', icon: 'FolderOpen' },
];

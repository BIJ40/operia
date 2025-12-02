/**
 * STATiA-BY-BIJ - Schéma Apogée enrichi V2
 * 
 * Ce fichier contient la définition complète et documentée de tous les endpoints Apogée.
 * Source unique de vérité pour STATiA, le viewer de schéma et le futur builder IA.
 * 
 * IMPORTANT - Gestion des agences :
 * - Une seule clé API partagée pour toutes les agences
 * - La séparation par agence se fait par la BASE URL, pas par un champ interne
 * - Exemple: https://dax.hc-apogee.fr/api/ vs https://pau.hc-apogee.fr/api/
 */

import { 
  ApogeeEndpointDefinition, 
  ApogeeFieldDefinition, 
  ApogeeJoinDefinition,
  ApogeeFilterDefinition,
  BusinessConcept,
  SchemaSearchResult,
  AgencyRouting
} from './types';

// ============================================
// AGENCY ROUTING - Configuration multi-agences
// ============================================

/**
 * Configuration du routing agence via URL
 * 
 * IMPORTANT: Il n'y a qu'une seule clé API Apogée.
 * La séparation par agence se fait par la base URL, pas par un champ interne.
 */
export const APOGEE_AGENCY_ROUTING: AgencyRouting = {
  paramName: 'agency_slug',
  baseUrlTemplate: 'https://{agency_slug}.hc-apogee.fr/api/',
  description: 'Une seule clé API partagée. La séparation par agence se fait par la base URL. Le slug agence (dax, pau, etc.) détermine quelle instance Apogée est appelée.',
  apiKeyShared: true,
};

/**
 * Construit l'URL de base pour une agence donnée
 */
export function buildAgencyBaseUrl(agencySlug: string): string {
  return APOGEE_AGENCY_ROUTING.baseUrlTemplate.replace('{agency_slug}', agencySlug);
}

// ============================================
// DÉFINITIONS DES ENDPOINTS
// ============================================

export const APOGEE_SCHEMA: Record<string, ApogeeEndpointDefinition> = {
  interventions: {
    id: 'apiGetInterventions',
    name: 'interventions',
    label: 'Interventions',
    description: 'RDV terrain des techniciens : travaux, dépannage, relevé technique, maintenance. Brique activité principale.',
    httpMethod: 'POST',
    primaryKey: 'id',
    datePrimaryField: 'date',
    tags: ['activité', 'planning', 'technicien', 'terrain'],
    inputParams: [
      { name: 'date_from', type: 'date', required: false, description: 'Date début période', example: '2025-01-01' },
      { name: 'date_to', type: 'date', required: false, description: 'Date fin période', example: '2025-01-31' },
      { name: 'state', type: 'enum', required: false, description: 'Filtrer par état', enumValues: ['planned', 'in_progress', 'completed', 'validated', 'cancelled'] },
      { name: 'type', type: 'enum', required: false, description: 'Filtrer par type', enumValues: ['technique', 'releve_technique', 'maintenance', 'sav', 'urgence'] },
    ],
    pagination: { supported: false },
    fields: [
      { name: 'id', type: 'number', role: 'id', semanticRole: 'dimension', description: 'Identifiant unique intervention', example: 12345 },
      { name: 'projectId', type: 'number', role: 'foreignId', semanticRole: 'dimension', description: 'ID du projet/dossier lié', groupable: true, filterable: true, keywords: ['dossier', 'project'] },
      { name: 'userId', type: 'number', role: 'foreignId', semanticRole: 'dimension', description: 'ID technicien principal', groupable: true, filterable: true, keywords: ['technicien', 'tech', 'user'] },
      { name: 'date', type: 'date', role: 'date', semanticRole: 'dimension', description: 'Date de l\'intervention', example: '2025-01-15', filterable: true, keywords: ['date_intervention', 'rdv'] },
      { name: 'state', type: 'enum', role: 'state', semanticRole: 'dimension', description: 'État de l\'intervention', enumValues: ['planned', 'in_progress', 'completed', 'validated', 'cancelled'], groupable: true, filterable: true, keywords: ['statut', 'etat'] },
      { name: 'type', type: 'enum', role: 'category', semanticRole: 'dimension', description: 'Type d\'intervention', enumValues: ['technique', 'releve_technique', 'maintenance', 'sav', 'urgence'], groupable: true, filterable: true, keywords: ['type_intervention', 'nature'] },
      { name: 'visites', type: 'array', role: 'metadata', semanticRole: 'attribute', description: 'Liste des visites avec détails techniciens' },
      { name: 'duration', type: 'number', path: 'data.duration', role: 'computed', semanticRole: 'measure', description: 'Durée en minutes', aggregable: true, example: 120, keywords: ['duree', 'temps', 'minutes'] },
      { name: 'heureDebut', type: 'string', path: 'data.heureDebut', role: 'datetime', semanticRole: 'attribute', description: 'Heure de début', example: '08:30' },
      { name: 'heureFin', type: 'string', path: 'data.heureFin', role: 'datetime', semanticRole: 'attribute', description: 'Heure de fin', example: '10:30' },
      { name: 'comments', type: 'string', path: 'data.comments', role: 'label', semanticRole: 'attribute', description: 'Commentaires intervention', nullable: true },
      { name: 'createdAt', type: 'date', role: 'date', semanticRole: 'attribute', description: 'Date création', filterable: true },
      { name: 'updatedAt', type: 'date', role: 'date', semanticRole: 'attribute', description: 'Date dernière mise à jour' },
    ],
    joins: [
      { target: 'projects', localField: 'projectId', remoteField: 'id', cardinality: 'many-to-one', description: 'Chaque intervention appartient à un projet/dossier' },
      { target: 'users', localField: 'userId', remoteField: 'id', cardinality: 'many-to-one', description: 'Technicien principal de l\'intervention' },
    ],
    filters: [
      { name: 'date_range', field: 'date', type: 'date', description: 'Filtrer par période (date_from / date_to)' },
      { name: 'state', field: 'state', type: 'enum', description: 'Filtrer par état', enumValues: ['planned', 'in_progress', 'completed', 'validated', 'cancelled'] },
      { name: 'type', field: 'type', type: 'enum', description: 'Filtrer par type d\'intervention', enumValues: ['technique', 'releve_technique', 'maintenance', 'sav', 'urgence'] },
      { name: 'technicien', field: 'userId', type: 'number', description: 'Filtrer par technicien' },
    ],
  },

  projects: {
    id: 'apiGetProjects',
    name: 'projects',
    label: 'Projets / Dossiers',
    description: 'Dossiers Apogée : sinistre, chantier, dépannage. Unité de travail principale regroupant interventions, devis et factures.',
    httpMethod: 'POST',
    primaryKey: 'id',
    datePrimaryField: 'date',
    tags: ['dossier', 'sinistre', 'chantier', 'client', 'apporteur'],
    inputParams: [
      { name: 'date_from', type: 'date', required: false, description: 'Date début période', example: '2025-01-01' },
      { name: 'date_to', type: 'date', required: false, description: 'Date fin période', example: '2025-01-31' },
      { name: 'state', type: 'enum', required: false, description: 'Filtrer par état', enumValues: ['stand_by', 'in_progress', 'invoiced', 'done', 'clos', 'cancelled'] },
    ],
    pagination: { supported: false },
    fields: [
      { name: 'id', type: 'number', role: 'id', semanticRole: 'dimension', description: 'Identifiant unique du dossier', example: 5678, keywords: ['project_id', 'dossier_id'] },
      { name: 'ref', type: 'string', role: 'reference', semanticRole: 'dimension', description: 'Référence métier du dossier', example: 'DOS-2025-001', keywords: ['reference', 'numero_dossier'] },
      { name: 'clientId', type: 'number', role: 'foreignId', semanticRole: 'dimension', description: 'ID client final', groupable: true, filterable: true, keywords: ['client', 'beneficiaire'] },
      { name: 'state', type: 'enum', role: 'state', semanticRole: 'dimension', description: 'État du dossier', enumValues: ['stand_by', 'in_progress', 'invoiced', 'done', 'clos', 'cancelled'], groupable: true, filterable: true, keywords: ['statut', 'etat_dossier'] },
      { name: 'label', type: 'string', role: 'label', semanticRole: 'attribute', description: 'Libellé court du dossier', keywords: ['titre', 'nom_dossier'] },
      { name: 'date', type: 'date', role: 'date', semanticRole: 'dimension', description: 'Date de création/ouverture', filterable: true, keywords: ['date_creation', 'date_ouverture'] },
      { name: 'commanditaireId', type: 'number', path: 'data.commanditaireId', role: 'foreignId', semanticRole: 'dimension', description: 'ID apporteur (assurance, bailleur...)', groupable: true, filterable: true, keywords: ['apporteur', 'commanditaire', 'assurance', 'bailleur'] },
      { name: 'universes', type: 'array', path: 'data.universes', role: 'category', semanticRole: 'dimension', description: 'Univers métiers (plomberie, électricité...)', groupable: true, filterable: true, keywords: ['univers', 'metier', 'specialite'] },
      { name: 'pictosInterv', type: 'array', path: 'data.pictosInterv', role: 'category', semanticRole: 'attribute', description: 'Pictos/tags d\'intervention', keywords: ['pictos', 'tags'] },
      { name: 'nbHeures', type: 'number', path: 'data.nbHeures', role: 'computed', semanticRole: 'measure', description: 'Heures prévues', aggregable: true, keywords: ['heures', 'temps_prevu'] },
      { name: 'nbTechs', type: 'number', path: 'data.nbTechs', role: 'computed', semanticRole: 'measure', description: 'Nombre de techniciens', aggregable: true, keywords: ['techniciens', 'effectif'] },
      { name: 'assuranceId', type: 'number', path: 'data.assuranceId', role: 'foreignId', semanticRole: 'dimension', description: 'ID assurance si sinistre', groupable: true, filterable: true, nullable: true, keywords: ['assurance', 'sinistre'] },
      { name: 'refDossierAssurance', type: 'string', path: 'data.refDossierAssurance', role: 'reference', semanticRole: 'attribute', description: 'Référence assurance', nullable: true, keywords: ['ref_assurance'] },
      { name: 'dateSinistre', type: 'date', path: 'data.dateSinistre', role: 'date', semanticRole: 'dimension', description: 'Date du sinistre', nullable: true, filterable: true, keywords: ['date_sinistre'] },
      { name: 'isSAV', type: 'boolean', path: 'data.isSAV', role: 'flag', semanticRole: 'dimension', description: 'Est un dossier SAV', groupable: true, filterable: true, keywords: ['sav', 'service_apres_vente'] },
      { name: 'financier', type: 'object', path: 'data.financier', role: 'metadata', semanticRole: 'attribute', description: 'Infos financières (franchise, reste à charge...)', keywords: ['financier', 'franchise'] },
      { name: 'history', type: 'array', role: 'metadata', semanticRole: 'attribute', description: 'Historique des transitions workflow', keywords: ['historique', 'workflow'] },
      { name: 'createdAt', type: 'date', path: 'created_at', role: 'date', semanticRole: 'attribute', description: 'Date création système', keywords: ['created_at'] },
    ],
    joins: [
      { target: 'clients', localField: 'clientId', remoteField: 'id', cardinality: 'many-to-one', description: 'Client final du dossier' },
      { target: 'clients', localField: 'commanditaireId', remoteField: 'id', cardinality: 'many-to-one', description: 'Apporteur/commanditaire du dossier', isOptional: true },
      { target: 'interventions', localField: 'id', remoteField: 'projectId', cardinality: 'one-to-many', description: 'Interventions rattachées au dossier' },
      { target: 'factures', localField: 'id', remoteField: 'projectId', cardinality: 'one-to-many', description: 'Factures du dossier' },
      { target: 'devis', localField: 'id', remoteField: 'projectId', cardinality: 'one-to-many', description: 'Devis du dossier' },
    ],
    filters: [
      { name: 'date_range', field: 'date', type: 'date', description: 'Filtrer par date création dossier' },
      { name: 'state', field: 'state', type: 'enum', description: 'Filtrer par état dossier', enumValues: ['stand_by', 'in_progress', 'invoiced', 'done', 'clos'] },
      { name: 'univers', field: 'universes', type: 'string', description: 'Filtrer par univers métier' },
      { name: 'apporteur', field: 'commanditaireId', type: 'number', description: 'Filtrer par apporteur' },
      { name: 'isSAV', field: 'isSAV', type: 'boolean', description: 'Filtrer dossiers SAV' },
    ],
  },

  factures: {
    id: 'apiGetFactures',
    name: 'factures',
    label: 'Factures',
    description: 'Factures émises : CA réalisé, recouvrement. Source de vérité pour le chiffre d\'affaires.',
    httpMethod: 'POST',
    primaryKey: 'id',
    datePrimaryField: 'dateReelle',
    tags: ['finance', 'ca', 'comptabilité', 'paiement'],
    inputParams: [
      { name: 'date_from', type: 'date', required: false, description: 'Date début période', example: '2025-01-01' },
      { name: 'date_to', type: 'date', required: false, description: 'Date fin période', example: '2025-01-31' },
      { name: 'typeFacture', type: 'enum', required: false, description: 'Type facture/avoir', enumValues: ['facture', 'avoir'] },
      { name: 'paymentStatus', type: 'enum', required: false, description: 'Statut paiement', enumValues: ['pending', 'paid', 'partially_paid', 'overdue'] },
    ],
    pagination: { supported: false },
    fields: [
      { name: 'id', type: 'number', role: 'id', semanticRole: 'dimension', description: 'Identifiant unique facture' },
      { name: 'projectId', type: 'number', role: 'foreignId', semanticRole: 'dimension', description: 'ID du dossier facturé', groupable: true, filterable: true, keywords: ['dossier', 'project'] },
      { name: 'reference', type: 'string', role: 'reference', semanticRole: 'dimension', description: 'Référence facture', example: 'FAC-2025-0123', keywords: ['ref', 'numero'] },
      { name: 'refId', type: 'string', role: 'foreignId', semanticRole: 'dimension', description: 'Référence du devis associé', nullable: true },
      { name: 'typeFacture', type: 'enum', role: 'category', semanticRole: 'dimension', description: 'Type : facture ou avoir', enumValues: ['facture', 'avoir'], groupable: true, filterable: true, keywords: ['type', 'avoir'] },
      { name: 'dateReelle', type: 'date', role: 'date', semanticRole: 'dimension', description: 'Date réelle de facturation', filterable: true, keywords: ['date_facture', 'date_facturation'] },
      { name: 'dateEmission', type: 'date', role: 'date', semanticRole: 'dimension', description: 'Date d\'émission', filterable: true },
      { name: 'totalHT', type: 'number', path: 'data.totalHT', role: 'amount', semanticRole: 'measure', description: 'Montant HT', aggregable: true, example: 1500.00, keywords: ['ca', 'chiffre_affaires', 'montant', 'revenue', 'ht'] },
      { name: 'totalTTC', type: 'number', path: 'data.totalTTC', role: 'amount', semanticRole: 'measure', description: 'Montant TTC', aggregable: true, example: 1800.00, keywords: ['montant_ttc', 'ttc'] },
      { name: 'paymentStatus', type: 'enum', role: 'state', semanticRole: 'dimension', description: 'Statut paiement', enumValues: ['pending', 'paid', 'partially_paid', 'overdue'], groupable: true, filterable: true, keywords: ['paiement', 'encaissement', 'recouvrement'] },
      { name: 'restePaidTTC', type: 'number', role: 'amount', semanticRole: 'measure', description: 'Reste à payer TTC', aggregable: true, keywords: ['encours', 'impaye'] },
      { name: 'payments', type: 'array', role: 'metadata', semanticRole: 'attribute', description: 'Liste des paiements enregistrés' },
      { name: 'technicians', type: 'array', path: 'data.technicians', role: 'metadata', semanticRole: 'attribute', description: 'Techniciens associés à la facture', keywords: ['tech'] },
      { name: 'client', type: 'object', role: 'metadata', semanticRole: 'attribute', description: 'Objet client facturé' },
      { name: 'facturedItems', type: 'array', role: 'metadata', semanticRole: 'attribute', description: 'Lignes facturées' },
      { name: 'invoiceType', type: 'string', role: 'category', semanticRole: 'dimension', description: 'Type facture (originale, avoir, refacturation)', groupable: true },
      { name: 'createdAt', type: 'date', role: 'date', semanticRole: 'attribute', description: 'Date création' },
      { name: 'updatedAt', type: 'date', role: 'date', semanticRole: 'attribute', description: 'Date mise à jour' },
    ],
    joins: [
      { target: 'projects', localField: 'projectId', remoteField: 'id', cardinality: 'many-to-one', description: 'Dossier facturé' },
      { target: 'devis', localField: 'refId', remoteField: 'reference', cardinality: 'many-to-one', description: 'Devis source', isOptional: true },
    ],
    filters: [
      { name: 'date_range', field: 'dateReelle', type: 'date', description: 'Filtrer par date facturation' },
      { name: 'type', field: 'typeFacture', type: 'enum', description: 'Type (facture/avoir)', enumValues: ['facture', 'avoir'] },
      { name: 'paymentStatus', field: 'paymentStatus', type: 'enum', description: 'Statut paiement', enumValues: ['pending', 'paid', 'partially_paid', 'overdue'] },
    ],
  },

  devis: {
    id: 'apiGetDevis',
    name: 'devis',
    label: 'Devis',
    description: 'Devis commerciaux : CA prévisionnel, pipeline avant facturation.',
    httpMethod: 'POST',
    primaryKey: 'id',
    datePrimaryField: 'dateReelle',
    tags: ['finance', 'commercial', 'pipeline', 'prévisionnel'],
    inputParams: [
      { name: 'date_from', type: 'date', required: false, description: 'Date début période', example: '2025-01-01' },
      { name: 'date_to', type: 'date', required: false, description: 'Date fin période', example: '2025-01-31' },
      { name: 'state', type: 'enum', required: false, description: 'Filtrer par état', enumValues: ['draft', 'sent', 'accepted', 'refused', 'cancelled', 'invoiced'] },
    ],
    pagination: { supported: false },
    fields: [
      { name: 'id', type: 'number', role: 'id', semanticRole: 'dimension', description: 'Identifiant unique devis', keywords: ['devis_id'] },
      { name: 'projectId', type: 'number', role: 'foreignId', semanticRole: 'dimension', description: 'ID du dossier lié', groupable: true, filterable: true, keywords: ['dossier', 'project'] },
      { name: 'clientId', type: 'number', role: 'foreignId', semanticRole: 'dimension', description: 'ID client', groupable: true, filterable: true, keywords: ['client'] },
      { name: 'reference', type: 'string', role: 'reference', semanticRole: 'dimension', description: 'Référence devis', example: 'DEV-2025-0456', keywords: ['ref_devis', 'numero_devis'] },
      { name: 'state', type: 'enum', role: 'state', semanticRole: 'dimension', description: 'État du devis', enumValues: ['draft', 'sent', 'accepted', 'refused', 'cancelled', 'invoiced'], groupable: true, filterable: true, keywords: ['statut_devis', 'etat'] },
      { name: 'dateReelle', type: 'date', role: 'date', semanticRole: 'dimension', description: 'Date validation/émission', filterable: true, keywords: ['date_devis', 'date_emission'] },
      { name: 'totalHT', type: 'number', path: 'data.totalHT', role: 'amount', semanticRole: 'measure', description: 'Montant HT', aggregable: true, keywords: ['montant_ht', 'ca_previsionnel', 'pipeline'] },
      { name: 'totalTTC', type: 'number', path: 'data.totalTTC', role: 'amount', semanticRole: 'measure', description: 'Montant TTC', aggregable: true, keywords: ['montant_ttc'] },
      { name: 'items', type: 'array', role: 'metadata', semanticRole: 'attribute', description: 'Postes et lignes du devis', keywords: ['lignes', 'postes'] },
      { name: 'financier', type: 'object', path: 'data.financier', role: 'metadata', semanticRole: 'attribute', description: 'Conditions règlement, franchise...', keywords: ['financier'] },
      { name: 'createdAt', type: 'date', role: 'date', semanticRole: 'attribute', description: 'Date création', keywords: ['created_at'] },
    ],
    joins: [
      { target: 'projects', localField: 'projectId', remoteField: 'id', cardinality: 'many-to-one', description: 'Dossier lié au devis' },
      { target: 'clients', localField: 'clientId', remoteField: 'id', cardinality: 'many-to-one', description: 'Client du devis' },
      { target: 'factures', localField: 'reference', remoteField: 'refId', cardinality: 'one-to-many', description: 'Factures générées depuis ce devis', isOptional: true },
    ],
    filters: [
      { name: 'date_range', field: 'dateReelle', type: 'date', description: 'Filtrer par date devis' },
      { name: 'state', field: 'state', type: 'enum', description: 'Filtrer par état', enumValues: ['draft', 'sent', 'accepted', 'refused', 'invoiced'] },
    ],
  },

  users: {
    id: 'apiGetUsers',
    name: 'users',
    label: 'Utilisateurs',
    description: 'Utilisateurs Apogée : techniciens, assistants, administrateurs. Référentiel personnes.',
    httpMethod: 'POST',
    primaryKey: 'id',
    tags: ['équipe', 'technicien', 'rh', 'planning'],
    inputParams: [
      { name: 'type', type: 'enum', required: false, description: 'Filtrer par type', enumValues: ['technicien', 'admin', 'assistant', 'commercial'] },
      { name: 'isActive', type: 'boolean', required: false, description: 'Filtrer actifs uniquement' },
    ],
    pagination: { supported: false },
    fields: [
      { name: 'id', type: 'number', role: 'id', semanticRole: 'dimension', description: 'Identifiant unique utilisateur', keywords: ['user_id', 'tech_id'] },
      { name: 'firstname', type: 'string', role: 'label', semanticRole: 'attribute', description: 'Prénom', keywords: ['prenom'] },
      { name: 'lastname', type: 'string', role: 'label', semanticRole: 'attribute', description: 'Nom', keywords: ['nom'] },
      { name: 'name', type: 'string', role: 'label', semanticRole: 'dimension', description: 'Nom complet', keywords: ['nom_complet', 'technicien'] },
      { name: 'initiales', type: 'string', role: 'label', semanticRole: 'attribute', description: 'Initiales', example: 'JD', keywords: ['initiales'] },
      { name: 'email', type: 'string', role: 'label', semanticRole: 'attribute', description: 'Email', keywords: ['email', 'mail'] },
      { name: 'type', type: 'enum', role: 'category', semanticRole: 'dimension', description: 'Type utilisateur', enumValues: ['technicien', 'admin', 'assistant', 'commercial'], groupable: true, filterable: true, keywords: ['type_user', 'role'] },
      { name: 'universes', type: 'array', role: 'category', semanticRole: 'dimension', description: 'Univers métiers couverts', groupable: true, keywords: ['univers', 'specialites'] },
      { name: 'skills', type: 'array', role: 'metadata', semanticRole: 'attribute', description: 'Compétences techniques', keywords: ['competences', 'skills'] },
      { name: 'color', type: 'string', role: 'metadata', semanticRole: 'attribute', description: 'Couleur planning', keywords: ['couleur'] },
      { name: 'bgcolor', type: 'string', role: 'metadata', semanticRole: 'attribute', description: 'Couleur fond planning', keywords: ['background'] },
      { name: 'activity', type: 'object', role: 'metadata', semanticRole: 'attribute', description: 'Indicateurs activité', keywords: ['activite', 'stats'] },
      { name: 'isActive', type: 'boolean', role: 'flag', semanticRole: 'dimension', description: 'Utilisateur actif', groupable: true, filterable: true, keywords: ['actif', 'is_on'] },
    ],
    joins: [
      { target: 'interventions', localField: 'id', remoteField: 'userId', cardinality: 'one-to-many', description: 'Interventions du technicien' },
    ],
    filters: [
      { name: 'type', field: 'type', type: 'enum', description: 'Filtrer par type', enumValues: ['technicien', 'admin', 'assistant', 'commercial'] },
      { name: 'isActive', field: 'isActive', type: 'boolean', description: 'Filtrer actifs uniquement' },
    ],
  },

  clients: {
    id: 'apiGetClients',
    name: 'clients',
    label: 'Clients / Apporteurs',
    description: 'Clients finaux et apporteurs d\'affaires : particuliers, assurances, bailleurs, gestionnaires.',
    httpMethod: 'POST',
    primaryKey: 'id',
    tags: ['client', 'apporteur', 'assurance', 'bailleur'],
    inputParams: [
      { name: 'type', type: 'enum', required: false, description: 'Filtrer par type', enumValues: ['particulier', 'assurance', 'bailleur', 'gestionnaire', 'entreprise'] },
    ],
    pagination: { supported: false },
    fields: [
      { name: 'id', type: 'number', role: 'id', semanticRole: 'dimension', description: 'Identifiant unique client', keywords: ['client_id', 'apporteur_id'] },
      { name: 'name', type: 'string', role: 'label', semanticRole: 'dimension', description: 'Nom du client/apporteur', keywords: ['nom_client', 'nom_apporteur', 'raison_sociale'] },
      { name: 'type', type: 'enum', role: 'category', semanticRole: 'dimension', description: 'Type client', enumValues: ['particulier', 'assurance', 'bailleur', 'gestionnaire', 'entreprise'], groupable: true, filterable: true, keywords: ['type_client', 'nature'] },
      { name: 'address', type: 'string', role: 'label', semanticRole: 'attribute', description: 'Adresse', keywords: ['adresse'] },
      { name: 'city', type: 'string', role: 'label', semanticRole: 'dimension', description: 'Ville', groupable: true, keywords: ['ville'] },
      { name: 'postalCode', type: 'string', role: 'label', semanticRole: 'dimension', description: 'Code postal', groupable: true, keywords: ['cp', 'code_postal'] },
      { name: 'phone', type: 'string', role: 'label', semanticRole: 'attribute', description: 'Téléphone', keywords: ['telephone'] },
      { name: 'email', type: 'string', role: 'label', semanticRole: 'attribute', description: 'Email', keywords: ['email', 'mail'] },
    ],
    joins: [
      { target: 'projects', localField: 'id', remoteField: 'clientId', cardinality: 'one-to-many', description: 'Dossiers du client' },
      { target: 'projects', localField: 'id', remoteField: 'commanditaireId', cardinality: 'one-to-many', description: 'Dossiers où ce client est apporteur' },
    ],
    filters: [
      { name: 'type', field: 'type', type: 'enum', description: 'Filtrer par type', enumValues: ['particulier', 'assurance', 'bailleur', 'gestionnaire', 'entreprise'] },
    ],
  },
};

// ============================================
// CONCEPTS MÉTIER - OÙ TROUVER QUOI ?
// ============================================

export const BUSINESS_CONCEPTS: BusinessConcept[] = [
  {
    id: 'technicien',
    label: 'Technicien',
    description: 'Personne réalisant les interventions terrain',
    locations: [
      { endpoint: 'users', field: 'id', note: 'Table référentiel avec type="technicien"' },
      { endpoint: 'interventions', field: 'userId', note: 'Technicien principal de l\'intervention' },
      { endpoint: 'interventions', field: 'visites', path: 'visites[].usersIds', note: 'Techniciens présents sur chaque visite' },
      { endpoint: 'factures', field: 'technicians', path: 'data.technicians', note: 'Techniciens associés à la facture' },
    ],
  },
  {
    id: 'client',
    label: 'Client final',
    description: 'Bénéficiaire des travaux',
    locations: [
      { endpoint: 'clients', field: 'id', note: 'Table référentiel clients' },
      { endpoint: 'projects', field: 'clientId', note: 'Client du dossier' },
      { endpoint: 'factures', field: 'client', path: 'client.id', note: 'Client facturé (objet embarqué)' },
      { endpoint: 'devis', field: 'clientId', note: 'Client du devis' },
    ],
  },
  {
    id: 'apporteur',
    label: 'Apporteur / Commanditaire',
    description: 'Assurance, bailleur ou gestionnaire qui apporte les dossiers',
    locations: [
      { endpoint: 'clients', field: 'id', note: 'Dans la table clients avec type="assurance|bailleur|gestionnaire"' },
      { endpoint: 'projects', field: 'commanditaireId', path: 'data.commanditaireId', note: 'ID de l\'apporteur sur le dossier' },
    ],
  },
  {
    id: 'montant_ht',
    label: 'Montant HT',
    description: 'Chiffre d\'affaires hors taxes',
    locations: [
      { endpoint: 'factures', field: 'totalHT', path: 'data.totalHT', note: 'CA réalisé (factures)' },
      { endpoint: 'devis', field: 'totalHT', path: 'data.totalHT', note: 'CA prévisionnel (devis)' },
    ],
  },
  {
    id: 'montant_ttc',
    label: 'Montant TTC',
    description: 'Montant toutes taxes comprises',
    locations: [
      { endpoint: 'factures', field: 'totalTTC', path: 'data.totalTTC', note: 'Montant TTC facturé' },
      { endpoint: 'devis', field: 'totalTTC', path: 'data.totalTTC', note: 'Montant TTC devisé' },
    ],
  },
  {
    id: 'univers',
    label: 'Univers métier',
    description: 'Domaine d\'activité : plomberie, électricité, serrurerie...',
    locations: [
      { endpoint: 'projects', field: 'universes', path: 'data.universes', note: 'Univers du dossier (peut être multiple)' },
      { endpoint: 'users', field: 'universes', note: 'Univers couverts par le technicien' },
    ],
  },
  {
    id: 'date_intervention',
    label: 'Date intervention',
    description: 'Date de passage technicien',
    locations: [
      { endpoint: 'interventions', field: 'date', note: 'Date principale de l\'intervention' },
      { endpoint: 'interventions', field: 'visites', path: 'visites[].date', note: 'Date de chaque visite' },
    ],
  },
  {
    id: 'date_facture',
    label: 'Date facturation',
    description: 'Date d\'émission ou réelle de la facture',
    locations: [
      { endpoint: 'factures', field: 'dateReelle', note: 'Date réelle de facturation (recommandée)' },
      { endpoint: 'factures', field: 'dateEmission', note: 'Date d\'émission comptable' },
    ],
  },
  {
    id: 'sav',
    label: 'SAV / Retour intervention',
    description: 'Dossier de service après-vente',
    locations: [
      { endpoint: 'projects', field: 'isSAV', path: 'data.isSAV', note: 'Flag booléen sur le dossier' },
      { endpoint: 'interventions', field: 'type', note: 'type="sav" sur l\'intervention' },
    ],
  },
  {
    id: 'recouvrement',
    label: 'Recouvrement',
    description: 'Suivi des paiements et encours',
    locations: [
      { endpoint: 'factures', field: 'paymentStatus', note: 'Statut paiement (paid, pending, overdue...)' },
      { endpoint: 'factures', field: 'restePaidTTC', note: 'Montant restant à encaisser' },
      { endpoint: 'factures', field: 'payments', note: 'Liste des paiements reçus' },
    ],
  },
];

// ============================================
// HELPERS DE RECHERCHE ET VALIDATION
// ============================================

/**
 * Recherche globale dans le schéma
 */
export function searchSchema(query: string): SchemaSearchResult[] {
  const results: SchemaSearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const [key, endpoint] of Object.entries(APOGEE_SCHEMA)) {
    // Match sur le nom de l'endpoint
    if (endpoint.name.toLowerCase().includes(lowerQuery) || 
        endpoint.label.toLowerCase().includes(lowerQuery) ||
        endpoint.description.toLowerCase().includes(lowerQuery)) {
      results.push({
        type: 'endpoint',
        endpointId: endpoint.name,
        endpointLabel: endpoint.label,
        relevanceScore: 100,
      });
    }

    // Match sur les champs
    for (const field of endpoint.fields) {
      if (field.name.toLowerCase().includes(lowerQuery) ||
          field.description.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'field',
          endpointId: endpoint.name,
          endpointLabel: endpoint.label,
          fieldName: field.name,
          fieldDescription: field.description,
          fieldRole: field.role,
          relevanceScore: field.name.toLowerCase() === lowerQuery ? 90 : 70,
        });
      }
    }

    // Match sur les jointures
    for (const join of endpoint.joins) {
      if (join.target.toLowerCase().includes(lowerQuery) ||
          join.description.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'join',
          endpointId: endpoint.name,
          endpointLabel: endpoint.label,
          joinTarget: join.target,
          relevanceScore: 60,
        });
      }
    }
  }

  // Recherche dans les concepts métier
  for (const concept of BUSINESS_CONCEPTS) {
    if (concept.id.includes(lowerQuery) ||
        concept.label.toLowerCase().includes(lowerQuery) ||
        concept.description.toLowerCase().includes(lowerQuery)) {
      for (const loc of concept.locations) {
        results.push({
          type: 'field',
          endpointId: loc.endpoint,
          endpointLabel: APOGEE_SCHEMA[loc.endpoint]?.label || loc.endpoint,
          fieldName: loc.field,
          fieldDescription: `${concept.label}: ${loc.note || ''}`,
          relevanceScore: 85,
        });
      }
    }
  }

  // Trier par pertinence
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Valide qu'un champ existe dans une source
 * Accepte: nom direct (duration), path complet (data.isSAV), ou nom avec path défini
 */
export function validateField(sourceName: string, fieldName: string): { valid: boolean; error?: string } {
  const endpoint = APOGEE_SCHEMA[sourceName];
  if (!endpoint) {
    return { valid: false, error: `Source "${sourceName}" inconnue` };
  }

  // Recherche flexible : par nom, par path complet, ou le nom du champ dont le path correspond
  const field = endpoint.fields.find(f => {
    // Correspondance directe par nom
    if (f.name === fieldName) return true;
    // Correspondance par path complet (ex: "data.isSAV")
    if (f.path === fieldName) return true;
    // Si le fieldName contient un path (ex: "data.totalHT"), vérifier si un champ a ce path
    if (fieldName.includes('.') && f.path === fieldName) return true;
    return false;
  });

  if (!field) {
    const availableFields = endpoint.fields.map(f => f.path ? `${f.name} (${f.path})` : f.name).join(', ');
    return { valid: false, error: `Champ "${fieldName}" non trouvé dans ${sourceName}. Champs disponibles: ${availableFields}` };
  }

  return { valid: true };
}

/**
 * Valide une définition de métrique complète
 */
export function validateMetricDefinition(metric: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!metric.input_sources || metric.input_sources.length === 0) {
    errors.push('Au moins une source de données requise');
  }

  for (const source of metric.input_sources || []) {
    if (!APOGEE_SCHEMA[source.source]) {
      errors.push(`Source "${source.source}" inconnue`);
    }

    // Valider les filtres
    for (const filter of source.filters || []) {
      const validation = validateField(source.source, filter.field);
      if (!validation.valid) {
        errors.push(`Filtre: ${validation.error}`);
      }
    }
  }

  // Valider le champ de la formule
  if (metric.formula?.field && metric.input_sources?.length > 0) {
    const mainSource = metric.input_sources[0].source;
    const validation = validateField(mainSource, metric.formula.field);
    if (!validation.valid) {
      errors.push(`Formule: ${validation.error}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Récupère tous les endpoints
 */
export function getAllEndpoints(): ApogeeEndpointDefinition[] {
  return Object.values(APOGEE_SCHEMA);
}

/**
 * Récupère un endpoint par son nom
 */
export function getEndpoint(name: string): ApogeeEndpointDefinition | undefined {
  return APOGEE_SCHEMA[name];
}

/**
 * Récupère les relations entre tous les endpoints (pour le graphe)
 */
export function getSchemaRelations(): { source: string; target: string; label: string }[] {
  const relations: { source: string; target: string; label: string }[] = [];
  
  for (const [key, endpoint] of Object.entries(APOGEE_SCHEMA)) {
    for (const join of endpoint.joins) {
      relations.push({
        source: endpoint.name,
        target: join.target,
        label: `${join.localField} → ${join.remoteField}`,
      });
    }
  }
  
  return relations;
}

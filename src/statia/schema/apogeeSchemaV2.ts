/**
 * STATiA-BY-BIJ - Schéma Apogée enrichi V2
 * 
 * Ce fichier contient la définition complète et documentée de tous les endpoints Apogée.
 * Source unique de vérité pour STATiA, le viewer de schéma et le futur builder IA.
 */

import { 
  ApogeeEndpointDefinition, 
  ApogeeFieldDefinition, 
  ApogeeJoinDefinition,
  ApogeeFilterDefinition,
  BusinessConcept,
  SchemaSearchResult
} from './types';

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
    fields: [
      { name: 'id', type: 'number', role: 'id', description: 'Identifiant unique intervention', example: 12345 },
      { name: 'projectId', type: 'number', role: 'foreignId', description: 'ID du projet/dossier lié', groupable: true, filterable: true },
      { name: 'userId', type: 'number', role: 'foreignId', description: 'ID technicien principal', groupable: true, filterable: true },
      { name: 'date', type: 'date', role: 'date', description: 'Date de l\'intervention', example: '2025-01-15', filterable: true },
      { name: 'state', type: 'enum', role: 'state', description: 'État de l\'intervention', enumValues: ['planned', 'in_progress', 'completed', 'validated', 'cancelled'], groupable: true, filterable: true },
      { name: 'type', type: 'enum', role: 'category', description: 'Type d\'intervention', enumValues: ['technique', 'releve_technique', 'maintenance', 'sav', 'urgence'], groupable: true, filterable: true },
      { name: 'visites', type: 'array', role: 'metadata', description: 'Liste des visites avec détails techniciens' },
      { name: 'duration', type: 'number', path: 'data.duration', role: 'computed', description: 'Durée en minutes', aggregable: true, example: 120 },
      { name: 'heureDebut', type: 'string', path: 'data.heureDebut', role: 'datetime', description: 'Heure de début', example: '08:30' },
      { name: 'heureFin', type: 'string', path: 'data.heureFin', role: 'datetime', description: 'Heure de fin', example: '10:30' },
      { name: 'comments', type: 'string', path: 'data.comments', role: 'label', description: 'Commentaires intervention', nullable: true },
      { name: 'createdAt', type: 'date', role: 'date', description: 'Date création', filterable: true },
      { name: 'updatedAt', type: 'date', role: 'date', description: 'Date dernière mise à jour' },
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
    fields: [
      { name: 'id', type: 'number', role: 'id', description: 'Identifiant unique du dossier', example: 5678 },
      { name: 'ref', type: 'string', role: 'reference', description: 'Référence métier du dossier', example: 'DOS-2025-001' },
      { name: 'clientId', type: 'number', role: 'foreignId', description: 'ID client final', groupable: true, filterable: true },
      { name: 'state', type: 'enum', role: 'state', description: 'État du dossier', enumValues: ['stand_by', 'in_progress', 'invoiced', 'done', 'clos', 'cancelled'], groupable: true, filterable: true },
      { name: 'label', type: 'string', role: 'label', description: 'Libellé court du dossier' },
      { name: 'date', type: 'date', role: 'date', description: 'Date de création/ouverture', filterable: true },
      { name: 'commanditaireId', type: 'number', path: 'data.commanditaireId', role: 'foreignId', description: 'ID apporteur (assurance, bailleur...)', groupable: true, filterable: true },
      { name: 'universes', type: 'array', path: 'data.universes', role: 'category', description: 'Univers métiers (plomberie, électricité...)', groupable: true, filterable: true },
      { name: 'pictosInterv', type: 'array', path: 'data.pictosInterv', role: 'category', description: 'Pictos/tags d\'intervention' },
      { name: 'nbHeures', type: 'number', path: 'data.nbHeures', role: 'computed', description: 'Heures prévues', aggregable: true },
      { name: 'nbTechs', type: 'number', path: 'data.nbTechs', role: 'computed', description: 'Nombre de techniciens', aggregable: true },
      { name: 'assuranceId', type: 'number', path: 'data.assuranceId', role: 'foreignId', description: 'ID assurance si sinistre', groupable: true, filterable: true, nullable: true },
      { name: 'refDossierAssurance', type: 'string', path: 'data.refDossierAssurance', role: 'reference', description: 'Référence assurance', nullable: true },
      { name: 'dateSinistre', type: 'date', path: 'data.dateSinistre', role: 'date', description: 'Date du sinistre', nullable: true, filterable: true },
      { name: 'isSAV', type: 'boolean', path: 'data.isSAV', role: 'flag', description: 'Est un dossier SAV', groupable: true, filterable: true },
      { name: 'financier', type: 'object', path: 'data.financier', role: 'metadata', description: 'Infos financières (franchise, reste à charge...)' },
      { name: 'history', type: 'array', role: 'metadata', description: 'Historique des transitions workflow' },
      { name: 'createdAt', type: 'date', path: 'created_at', role: 'date', description: 'Date création système' },
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
    fields: [
      { name: 'id', type: 'number', role: 'id', description: 'Identifiant unique facture' },
      { name: 'projectId', type: 'number', role: 'foreignId', description: 'ID du dossier facturé', groupable: true, filterable: true },
      { name: 'reference', type: 'string', role: 'reference', description: 'Référence facture', example: 'FAC-2025-0123' },
      { name: 'refId', type: 'string', role: 'foreignId', description: 'Référence du devis associé', nullable: true },
      { name: 'typeFacture', type: 'enum', role: 'category', description: 'Type : facture ou avoir', enumValues: ['facture', 'avoir'], groupable: true, filterable: true },
      { name: 'dateReelle', type: 'date', role: 'date', description: 'Date réelle de facturation', filterable: true },
      { name: 'dateEmission', type: 'date', role: 'date', description: 'Date d\'émission', filterable: true },
      { name: 'totalHT', type: 'number', path: 'data.totalHT', role: 'amount', description: 'Montant HT', aggregable: true, example: 1500.00 },
      { name: 'totalTTC', type: 'number', path: 'data.totalTTC', role: 'amount', description: 'Montant TTC', aggregable: true, example: 1800.00 },
      { name: 'paymentStatus', type: 'enum', role: 'state', description: 'Statut paiement', enumValues: ['pending', 'paid', 'partially_paid', 'overdue'], groupable: true, filterable: true },
      { name: 'restePaidTTC', type: 'number', role: 'amount', description: 'Reste à payer TTC', aggregable: true },
      { name: 'payments', type: 'array', role: 'metadata', description: 'Liste des paiements enregistrés' },
      { name: 'technicians', type: 'array', path: 'data.technicians', role: 'metadata', description: 'Techniciens associés à la facture' },
      { name: 'client', type: 'object', role: 'metadata', description: 'Objet client facturé' },
      { name: 'facturedItems', type: 'array', role: 'metadata', description: 'Lignes facturées' },
      { name: 'invoiceType', type: 'string', role: 'category', description: 'Type facture (originale, avoir, refacturation)', groupable: true },
      { name: 'createdAt', type: 'date', role: 'date', description: 'Date création' },
      { name: 'updatedAt', type: 'date', role: 'date', description: 'Date mise à jour' },
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
    fields: [
      { name: 'id', type: 'number', role: 'id', description: 'Identifiant unique devis' },
      { name: 'projectId', type: 'number', role: 'foreignId', description: 'ID du dossier lié', groupable: true, filterable: true },
      { name: 'clientId', type: 'number', role: 'foreignId', description: 'ID client', groupable: true, filterable: true },
      { name: 'reference', type: 'string', role: 'reference', description: 'Référence devis', example: 'DEV-2025-0456' },
      { name: 'state', type: 'enum', role: 'state', description: 'État du devis', enumValues: ['draft', 'sent', 'accepted', 'refused', 'cancelled', 'invoiced'], groupable: true, filterable: true },
      { name: 'dateReelle', type: 'date', role: 'date', description: 'Date validation/émission', filterable: true },
      { name: 'totalHT', type: 'number', path: 'data.totalHT', role: 'amount', description: 'Montant HT', aggregable: true },
      { name: 'totalTTC', type: 'number', path: 'data.totalTTC', role: 'amount', description: 'Montant TTC', aggregable: true },
      { name: 'items', type: 'array', role: 'metadata', description: 'Postes et lignes du devis' },
      { name: 'financier', type: 'object', path: 'data.financier', role: 'metadata', description: 'Conditions règlement, franchise...' },
      { name: 'createdAt', type: 'date', role: 'date', description: 'Date création' },
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
    fields: [
      { name: 'id', type: 'number', role: 'id', description: 'Identifiant unique utilisateur' },
      { name: 'firstname', type: 'string', role: 'label', description: 'Prénom' },
      { name: 'lastname', type: 'string', role: 'label', description: 'Nom' },
      { name: 'name', type: 'string', role: 'label', description: 'Nom complet' },
      { name: 'initiales', type: 'string', role: 'label', description: 'Initiales', example: 'JD' },
      { name: 'email', type: 'string', role: 'label', description: 'Email' },
      { name: 'type', type: 'enum', role: 'category', description: 'Type utilisateur', enumValues: ['technicien', 'admin', 'assistant', 'commercial'], groupable: true, filterable: true },
      { name: 'universes', type: 'array', role: 'category', description: 'Univers métiers couverts', groupable: true },
      { name: 'skills', type: 'array', role: 'metadata', description: 'Compétences techniques' },
      { name: 'color', type: 'string', role: 'metadata', description: 'Couleur planning' },
      { name: 'bgcolor', type: 'string', role: 'metadata', description: 'Couleur fond planning' },
      { name: 'activity', type: 'object', role: 'metadata', description: 'Indicateurs activité' },
    ],
    joins: [
      { target: 'interventions', localField: 'id', remoteField: 'userId', cardinality: 'one-to-many', description: 'Interventions du technicien' },
    ],
    filters: [
      { name: 'type', field: 'type', type: 'enum', description: 'Filtrer par type', enumValues: ['technicien', 'admin', 'assistant', 'commercial'] },
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
    fields: [
      { name: 'id', type: 'number', role: 'id', description: 'Identifiant unique client' },
      { name: 'name', type: 'string', role: 'label', description: 'Nom du client/apporteur' },
      { name: 'type', type: 'enum', role: 'category', description: 'Type client', enumValues: ['particulier', 'assurance', 'bailleur', 'gestionnaire', 'entreprise'], groupable: true, filterable: true },
      { name: 'address', type: 'string', role: 'label', description: 'Adresse' },
      { name: 'city', type: 'string', role: 'label', description: 'Ville', groupable: true },
      { name: 'postalCode', type: 'string', role: 'label', description: 'Code postal', groupable: true },
      { name: 'phone', type: 'string', role: 'label', description: 'Téléphone' },
      { name: 'email', type: 'string', role: 'label', description: 'Email' },
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

/**
 * STATiA-BY-BIJ - Schema d'abstraction des endpoints Apogée
 * 
 * Ce fichier décrit la structure des données Apogée pour le moteur de métriques.
 * Il permet au compute engine de comprendre les relations et les champs disponibles.
 */

import { ApogeeSourceName } from '../types';

// ============================================
// DÉFINITION DES SOURCES APOGÉE
// ============================================

export interface ApogeeFieldDefinition {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  path?: string; // chemin JSON si nested (ex: 'data.totalHT')
  description?: string;
  aggregable?: boolean; // peut être utilisé dans sum/avg
  groupable?: boolean; // peut être utilisé dans groupBy
}

export interface ApogeeSourceDefinition {
  name: ApogeeSourceName;
  endpoint: string;
  primaryKey: string;
  fields: ApogeeFieldDefinition[];
  joins: {
    targetSource: ApogeeSourceName;
    localKey: string;
    foreignKey: string;
  }[];
}

// ============================================
// SCHEMA DES SOURCES APOGÉE
// ============================================

export const APOGEE_SOURCES: Record<ApogeeSourceName, ApogeeSourceDefinition> = {
  interventions: {
    name: 'interventions',
    endpoint: 'apiGetInterventions',
    primaryKey: 'id',
    fields: [
      { name: 'id', type: 'number', description: 'ID intervention' },
      { name: 'projectId', type: 'number', description: 'ID projet lié', groupable: true },
      { name: 'userId', type: 'number', description: 'ID technicien principal', groupable: true },
      { name: 'date', type: 'date', description: 'Date intervention' },
      { name: 'state', type: 'string', description: 'État (planned, completed, etc.)', groupable: true },
      { name: 'type', type: 'string', description: 'Type intervention (technique, releve, etc.)', groupable: true },
      { name: 'visites', type: 'array', description: 'Liste des visites' },
      { name: 'duration', type: 'number', path: 'data.duration', description: 'Durée en minutes', aggregable: true },
      { name: 'heureDebut', type: 'string', path: 'data.heureDebut', description: 'Heure début' },
      { name: 'heureFin', type: 'string', path: 'data.heureFin', description: 'Heure fin' },
    ],
    joins: [
      { targetSource: 'projects', localKey: 'projectId', foreignKey: 'id' },
      { targetSource: 'users', localKey: 'userId', foreignKey: 'id' },
    ],
  },

  projects: {
    name: 'projects',
    endpoint: 'apiGetProjects',
    primaryKey: 'id',
    fields: [
      { name: 'id', type: 'number', description: 'ID projet/dossier' },
      { name: 'ref', type: 'string', description: 'Référence dossier' },
      { name: 'clientId', type: 'number', description: 'ID client', groupable: true },
      { name: 'state', type: 'string', description: 'État du dossier', groupable: true },
      { name: 'label', type: 'string', description: 'Libellé' },
      { name: 'date', type: 'date', description: 'Date création' },
      { name: 'commanditaireId', type: 'number', path: 'data.commanditaireId', description: 'ID apporteur', groupable: true },
      { name: 'universes', type: 'array', path: 'data.universes', description: 'Univers métiers', groupable: true },
      { name: 'nbHeures', type: 'number', path: 'data.nbHeures', description: 'Heures prévues', aggregable: true },
      { name: 'nbTechs', type: 'number', path: 'data.nbTechs', description: 'Nb techniciens', aggregable: true },
      { name: 'assuranceId', type: 'number', path: 'data.assuranceId', description: 'ID assurance', groupable: true },
      { name: 'isSAV', type: 'boolean', path: 'data.isSAV', description: 'Est un SAV', groupable: true },
    ],
    joins: [
      { targetSource: 'clients', localKey: 'clientId', foreignKey: 'id' },
      { targetSource: 'clients', localKey: 'commanditaireId', foreignKey: 'id' },
    ],
  },

  factures: {
    name: 'factures',
    endpoint: 'apiGetFactures',
    primaryKey: 'id',
    fields: [
      { name: 'id', type: 'number', description: 'ID facture' },
      { name: 'projectId', type: 'number', description: 'ID projet lié', groupable: true },
      { name: 'reference', type: 'string', description: 'Référence facture' },
      { name: 'type', type: 'string', description: 'Type (facture, avoir)', groupable: true },
      { name: 'dateReelle', type: 'date', description: 'Date réelle facture' },
      { name: 'dateEmission', type: 'date', description: 'Date émission' },
      { name: 'totalHT', type: 'number', path: 'data.totalHT', description: 'Montant HT', aggregable: true },
      { name: 'totalTTC', type: 'number', path: 'data.totalTTC', description: 'Montant TTC', aggregable: true },
      { name: 'paymentStatus', type: 'string', description: 'Statut paiement', groupable: true },
      { name: 'restePaidTTC', type: 'number', description: 'Reste à payer TTC', aggregable: true },
      { name: 'technicians', type: 'array', path: 'data.technicians', description: 'Techniciens' },
    ],
    joins: [
      { targetSource: 'projects', localKey: 'projectId', foreignKey: 'id' },
    ],
  },

  devis: {
    name: 'devis',
    endpoint: 'apiGetDevis',
    primaryKey: 'id',
    fields: [
      { name: 'id', type: 'number', description: 'ID devis' },
      { name: 'projectId', type: 'number', description: 'ID projet lié', groupable: true },
      { name: 'reference', type: 'string', description: 'Référence devis' },
      { name: 'state', type: 'string', description: 'État du devis', groupable: true },
      { name: 'dateReelle', type: 'date', description: 'Date validation' },
      { name: 'totalHT', type: 'number', path: 'data.totalHT', description: 'Montant HT', aggregable: true },
      { name: 'totalTTC', type: 'number', path: 'data.totalTTC', description: 'Montant TTC', aggregable: true },
    ],
    joins: [
      { targetSource: 'projects', localKey: 'projectId', foreignKey: 'id' },
    ],
  },

  users: {
    name: 'users',
    endpoint: 'apiGetUsers',
    primaryKey: 'id',
    fields: [
      { name: 'id', type: 'number', description: 'ID utilisateur' },
      { name: 'firstname', type: 'string', description: 'Prénom' },
      { name: 'lastname', type: 'string', description: 'Nom' },
      { name: 'name', type: 'string', description: 'Nom complet' },
      { name: 'email', type: 'string', description: 'Email' },
      { name: 'type', type: 'string', description: 'Type (technicien, admin, etc.)', groupable: true },
      { name: 'universes', type: 'array', description: 'Univers couverts' },
    ],
    joins: [],
  },

  clients: {
    name: 'clients',
    endpoint: 'apiGetClients',
    primaryKey: 'id',
    fields: [
      { name: 'id', type: 'number', description: 'ID client' },
      { name: 'name', type: 'string', description: 'Nom client' },
      { name: 'type', type: 'string', description: 'Type (particulier, apporteur, etc.)', groupable: true },
      { name: 'address', type: 'string', description: 'Adresse' },
      { name: 'phone', type: 'string', description: 'Téléphone' },
    ],
    joins: [],
  },
};

// ============================================
// HELPERS POUR LE MOTEUR
// ============================================

/**
 * Récupère la définition d'une source
 */
export function getSourceDefinition(sourceName: ApogeeSourceName): ApogeeSourceDefinition | undefined {
  return APOGEE_SOURCES[sourceName];
}

/**
 * Récupère un champ d'une source (supporte les paths nested)
 */
export function getFieldDefinition(sourceName: ApogeeSourceName, fieldName: string): ApogeeFieldDefinition | undefined {
  const source = APOGEE_SOURCES[sourceName];
  return source?.fields.find(f => f.name === fieldName);
}

/**
 * Détermine si une jointure est possible entre deux sources
 */
export function canJoin(sourceA: ApogeeSourceName, sourceB: ApogeeSourceName): boolean {
  const defA = APOGEE_SOURCES[sourceA];
  return defA?.joins.some(j => j.targetSource === sourceB) ?? false;
}

/**
 * Récupère la clé de jointure entre deux sources
 */
export function getJoinKeys(sourceA: ApogeeSourceName, sourceB: ApogeeSourceName): { localKey: string; foreignKey: string } | undefined {
  const defA = APOGEE_SOURCES[sourceA];
  const join = defA?.joins.find(j => j.targetSource === sourceB);
  if (join) {
    return { localKey: join.localKey, foreignKey: join.foreignKey };
  }
  // Essayer dans l'autre sens
  const defB = APOGEE_SOURCES[sourceB];
  const reverseJoin = defB?.joins.find(j => j.targetSource === sourceA);
  if (reverseJoin) {
    return { localKey: reverseJoin.foreignKey, foreignKey: reverseJoin.localKey };
  }
  return undefined;
}

/**
 * Liste les champs agrégables d'une source
 */
export function getAggregableFields(sourceName: ApogeeSourceName): ApogeeFieldDefinition[] {
  const source = APOGEE_SOURCES[sourceName];
  return source?.fields.filter(f => f.aggregable) ?? [];
}

/**
 * Liste les champs groupables d'une source
 */
export function getGroupableFields(sourceName: ApogeeSourceName): ApogeeFieldDefinition[] {
  const source = APOGEE_SOURCES[sourceName];
  return source?.fields.filter(f => f.groupable) ?? [];
}

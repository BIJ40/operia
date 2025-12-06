/**
 * NL Intent Extractor - Extraction structurée d'intent, dimension et features
 * 
 * Pipeline: tokens → intent/dimension/topic/features
 */

import { type TokenizedQuery, hasToken, hasAnyToken } from './nlTokenizer.ts';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type IntentType = 'valeur' | 'moyenne' | 'top' | 'taux' | 'volume' | 'delay';
export type DimensionType = 'global' | 'technicien' | 'apporteur' | 'univers' | 'agence';
export type TopicType = 'ca' | 'recouvrement' | 'devis' | 'dossiers' | 'sav' | 'productivite' | 'interventions' | 'delais';

export interface ExtractedFeatures {
  mentionsMoyenne: boolean;    // tokens contient "moyen", "moyenne"
  mentionsJour: boolean;       // tokens contient "jour", "quotidien"
  mentionsClassement: boolean; // tokens contient "top", "meilleur", "classement"
  mentionsTaux: boolean;       // tokens contient "taux", "pourcentage", "%"
  mentionsVolume: boolean;     // tokens contient "combien", "nombre"
  mentionsDelay: boolean;      // tokens contient "delai", "temps", "duree"
}

export interface ExtractedIntent {
  intent: IntentType;
  dimension: DimensionType;
  topic: TopicType | null;
  features: ExtractedFeatures;
  confidence: 'high' | 'medium' | 'low';
}

// ═══════════════════════════════════════════════════════════════
// KEYWORD DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const MOYENNE_KEYWORDS = ['moyen', 'moyenne', 'moyenparjour', 'moyennejour'];
const JOUR_KEYWORDS = ['jour', 'quotidien', 'journalier', 'parjour'];
const CLASSEMENT_KEYWORDS = ['top', 'meilleur', 'meilleurs', 'classement', 'premier', 'premiers'];
const TAUX_KEYWORDS = ['taux', 'pourcentage', '%', 'ratio'];
const VOLUME_KEYWORDS = ['combien', 'nombre', 'nb', 'volume', 'quantite'];
const DELAY_KEYWORDS = ['delai', 'temps', 'duree', 'encombientemps', 'rapidite'];

const TECHNICIEN_KEYWORDS = ['technicien', 'techniciens', 'tech', 'techs', 'intervenant', 'intervenants'];
const APPORTEUR_KEYWORDS = ['apporteur', 'apporteurs', 'commanditaire', 'prescripteur', 'assureur', 'assurance', 'mutuelle', 'partenaire'];
const UNIVERS_KEYWORDS = ['univers', 'metier', 'plomberie', 'vitrerie', 'serrurerie', 'electricite', 'menuiserie', 'peinture'];
const AGENCE_KEYWORDS = ['agence', 'agences'];

const CA_KEYWORDS = ['ca', 'chiffre', 'chiffredaffaire', 'chiffredaffaires', 'caht', 'recette', 'recettes', 'facture', 'factures', 'facturation'];
const RECOUVREMENT_KEYWORDS = ['recouvrement', 'impayes', 'impaye', 'encours', 'duclient', 'reste', 'encaisser', 'encaissement'];
const DEVIS_KEYWORDS = ['devis', 'transformation', 'conversion', 'signe', 'accepte'];
const DOSSIERS_KEYWORDS = ['dossier', 'dossiers', 'projet', 'projets', 'affaire', 'affaires', 'ouvert', 'ouverts', 'cree', 'crees', 'recu', 'recus'];
const SAV_KEYWORDS = ['sav', 'garantie', 'retour', 'reclamation', 'apres', 'vente'];
const PRODUCTIVITE_KEYWORDS = ['productivite', 'rendement', 'efficacite', 'performance'];
const INTERVENTIONS_KEYWORDS = ['intervention', 'interventions', 'rdv', 'visite', 'visites'];
const DELAIS_KEYWORDS = ['delai', 'delais', 'temps', 'duree', 'rapidite', 'vitesse'];

// ═══════════════════════════════════════════════════════════════
// EXTRACTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extrait les features booléennes de la requête
 */
export function extractFeatures(tokenized: TokenizedQuery): ExtractedFeatures {
  return {
    mentionsMoyenne: hasAnyToken(tokenized, MOYENNE_KEYWORDS),
    mentionsJour: hasAnyToken(tokenized, JOUR_KEYWORDS),
    mentionsClassement: hasAnyToken(tokenized, CLASSEMENT_KEYWORDS),
    mentionsTaux: hasAnyToken(tokenized, TAUX_KEYWORDS),
    mentionsVolume: hasAnyToken(tokenized, VOLUME_KEYWORDS),
    mentionsDelay: hasAnyToken(tokenized, DELAY_KEYWORDS),
  };
}

/**
 * Détermine l'intent principal de la requête
 */
export function extractIntent(tokenized: TokenizedQuery, features: ExtractedFeatures): IntentType {
  // Priorité aux features explicites
  if (features.mentionsMoyenne) return 'moyenne';
  if (features.mentionsClassement) return 'top';
  if (features.mentionsTaux) return 'taux';
  if (features.mentionsVolume) return 'volume';
  if (features.mentionsDelay) return 'delay';
  
  // Default: valeur (simple consultation de donnée)
  return 'valeur';
}

/**
 * Détermine la dimension principale de la requête
 */
export function extractDimension(tokenized: TokenizedQuery): DimensionType {
  if (hasAnyToken(tokenized, TECHNICIEN_KEYWORDS)) return 'technicien';
  if (hasAnyToken(tokenized, APPORTEUR_KEYWORDS)) return 'apporteur';
  if (hasAnyToken(tokenized, UNIVERS_KEYWORDS)) return 'univers';
  if (hasAnyToken(tokenized, AGENCE_KEYWORDS)) return 'agence';
  
  return 'global';
}

/**
 * Détermine le topic (sujet) principal de la requête
 */
export function extractTopic(tokenized: TokenizedQuery): TopicType | null {
  // Ordre de priorité: sujets spécifiques avant CA (générique)
  if (hasAnyToken(tokenized, SAV_KEYWORDS)) return 'sav';
  if (hasAnyToken(tokenized, RECOUVREMENT_KEYWORDS)) return 'recouvrement';
  if (hasAnyToken(tokenized, DEVIS_KEYWORDS)) return 'devis';
  if (hasAnyToken(tokenized, DOSSIERS_KEYWORDS)) return 'dossiers';
  if (hasAnyToken(tokenized, INTERVENTIONS_KEYWORDS)) return 'interventions';
  if (hasAnyToken(tokenized, DELAIS_KEYWORDS)) return 'delais';
  if (hasAnyToken(tokenized, PRODUCTIVITE_KEYWORDS)) return 'productivite';
  if (hasAnyToken(tokenized, CA_KEYWORDS)) return 'ca';
  
  return null;
}

/**
 * Calcule la confiance de l'extraction
 */
export function computeConfidence(
  intent: IntentType,
  dimension: DimensionType,
  topic: TopicType | null,
  features: ExtractedFeatures
): 'high' | 'medium' | 'low' {
  let score = 0;
  
  // Topic détecté → +2
  if (topic) score += 2;
  
  // Features explicites → +1 chacune
  if (features.mentionsMoyenne) score++;
  if (features.mentionsClassement) score++;
  if (features.mentionsTaux) score++;
  if (features.mentionsVolume) score++;
  if (features.mentionsDelay) score++;
  
  // Dimension non-global → +1
  if (dimension !== 'global') score++;
  
  if (score >= 3) return 'high';
  if (score >= 1) return 'medium';
  return 'low';
}

/**
 * Pipeline complet d'extraction d'intent
 */
export function extractIntentFromTokens(tokenized: TokenizedQuery): ExtractedIntent {
  const features = extractFeatures(tokenized);
  const intent = extractIntent(tokenized, features);
  const dimension = extractDimension(tokenized);
  const topic = extractTopic(tokenized);
  const confidence = computeConfidence(intent, dimension, topic, features);
  
  return {
    intent,
    dimension,
    topic,
    features,
    confidence,
  };
}

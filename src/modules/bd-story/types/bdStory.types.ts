/**
 * BD Story — Types complets du module
 * Moteur narratif industriel pour planches BD HelpConfort
 */

// ============================================================================
// PERSONNAGES
// ============================================================================

export type CharacterRole = 'dirigeant' | 'directrice' | 'assistante' | 'commercial' | 'technicien';

export interface CharacterVisualIdentity {
  hair: string;
  silhouette: string;
  clothes: string;
  accessories: string[];
  facialTraits: string[];
}

export interface Character {
  id: string;
  slug: string;
  firstName: string;
  role: CharacterRole;
  specialties: string[];
  usageRules: string[];
  visualIdentity: CharacterVisualIdentity;
  officeOnly: boolean;
  active: boolean;
  sortOrder: number;
  photoAsset?: string; // import path for local asset
}

// ============================================================================
// CREW POOLS
// ============================================================================

export type UniverseKey =
  | 'plomberie'
  | 'electricite'
  | 'serrurerie'
  | 'vitrerie'
  | 'menuiserie'
  | 'peinture'
  | 'sols_tapisserie'
  | 'polyvalent';

export type CrewPools = Record<UniverseKey, string[]>;

// ============================================================================
// PROFILS CLIENTS
// ============================================================================

export type ClientCategory = 'particulier' | 'pro' | 'narratif' | 'contextuel';

export interface ClientProfile {
  slug: string;
  label: string;
  category: ClientCategory;
  householdType?: string;
  tone?: 'calme' | 'inquiet' | 'presse' | 'frustre' | 'rassure' | 'sceptique' | 'exigeant';
  homeStyle?: 'moderne' | 'classique' | 'ancien' | 'renove';
}

// ============================================================================
// LOGEMENTS
// ============================================================================

export type PropertyType =
  | 'maison_moderne' | 'maison_classique' | 'maison_ancienne'
  | 'appartement_recent' | 'appartement_ancien' | 'studio'
  | 'local_commercial' | 'petite_copro' | 'residence_secondaire'
  | 'maison_en_renovation';

export type RoomContext =
  | 'cuisine' | 'salle_de_bain' | 'salon' | 'chambre' | 'entree'
  | 'couloir' | 'garage' | 'buanderie' | 'terrasse' | 'balcon'
  | 'baie_vitree' | 'plafond' | 'mur' | 'sol' | 'escalier'
  | 'facade' | 'local_technique' | 'vitrine_commerce';

export type TimeContext =
  | 'matin' | 'midi' | 'apres_midi' | 'soir' | 'nuit'
  | 'pluie' | 'hiver' | 'ete' | 'printemps' | 'automne';

export interface LocationContext {
  propertyType: PropertyType;
  room: RoomContext;
  time: TimeContext;
}

// ============================================================================
// PROBLÈMES
// ============================================================================

export type ProblemUniverse = 'plomberie' | 'electricite' | 'serrurerie' | 'vitrerie' | 'menuiserie' | 'peinture_renovation';
export type UrgencyLevel = 'faible' | 'moyenne' | 'forte';

export interface ProblemType {
  slug: string;
  label: string;
  universe: ProblemUniverse;
  urgencyLevel: UrgencyLevel;
  symptoms: string[];
  allowedTechnicians: string[]; // character slugs
  allowsTemporaryRepair: boolean;
  allowsQuote: boolean;
  compatibleRooms: RoomContext[];
}

// ============================================================================
// FAMILLES NARRATIVES
// ============================================================================

export type StoryFamilyKey =
  | 'urgence_domestique' | 'panne_progressive' | 'reparation_provisoire'
  | 'diagnostic_devis' | 'mauvais_bricolage' | 'securisation'
  | 'retour_confort' | 'entretien_preventif' | 'probleme_ignore'
  | 'degat_imprevu' | 'intervention_rapide' | 'avant_apres'
  | 'client_rassure' | 'resolution_progressive' | 'degradation_visible'
  | 'mise_en_securite' | 'amelioration_confort' | 'suivi_client';

export interface StoryFamily {
  key: StoryFamilyKey;
  label: string;
  description: string;
  tensionLevel: 'low' | 'medium' | 'high';
}

// ============================================================================
// TEMPLATES NARRATIFS
// ============================================================================

export type TemplateKey =
  | 'urgence_simple' | 'panne_progressive' | 'provisoire_devis'
  | 'diagnostic_travaux' | 'avant_apres' | 'probleme_aggrave'
  | 'reparation_immediate' | 'mise_en_securite' | 'intervention_preventive'
  | 'petit_probleme_evite' | 'erreur_bricolage' | 'retour_confort'
  | 'resolution_progressive' | 'suivi_client';

export type NarrativeFunction =
  | 'client_setup'
  | 'client_context'
  | 'problem_appears'
  | 'problem_worsens'
  | 'decision_to_call'
  | 'call_received'
  | 'scheduling'
  | 'technician_arrival'
  | 'inspection_diagnosis'
  | 'repair_action'
  | 'result_visible'
  | 'cta_moral';

export type BrandPromise = 'reactivite' | 'rassurance' | 'expertise' | 'proximite';
export type OutcomeType = 'reparation_immediate' | 'mise_en_securite' | 'provisoire_plus_devis' | 'diagnostic_plus_travaux';
export type TensionCurve = 'calm_to_resolved' | 'normal_to_panic_to_resolved' | 'slow_build_to_action' | 'surprise_to_quick_fix';

export interface PanelRule {
  panelNumber: number; // 1-12
  narrativeFunction: NarrativeFunction;
  allowedActors: ('client' | 'assistante' | 'technicien' | 'dirigeant' | 'commercial')[];
  allowedLocations: ('maison' | 'bureau' | 'exterieur' | 'vehicule' | 'chantier')[];
  mandatoryConstraints: string[];
}

export interface StoryTemplate {
  key: TemplateKey;
  label: string;
  storyFamily: StoryFamilyKey;
  tensionCurve: TensionCurve;
  outcomeType: OutcomeType;
  brandPromise: BrandPromise;
  panelRules: PanelRule[];
}

// ============================================================================
// OUTCOMES
// ============================================================================

export interface OutcomeStep {
  slug: string;
  label: string;
  actionType: 'inspection' | 'securisation' | 'reparation' | 'provisoire' | 'mesure' | 'chiffrage';
  visibleResult: string;
}

// ============================================================================
// DÉCLENCHEURS
// ============================================================================

export interface Trigger {
  slug: string;
  label: string;
}

// ============================================================================
// CTA
// ============================================================================

export interface CtaEntry {
  text: string;
  mode: 'appel' | 'devis' | 'message' | 'intervention' | 'general';
}

// ============================================================================
// TEXT ATOMS (micro-phrases)
// ============================================================================

export interface TextAtomEntry {
  text: string;
  universe?: ProblemUniverse | 'general';
  narrativeFunction: NarrativeFunction;
  tone?: 'rassurant' | 'pedagogique' | 'reactif' | 'proximite';
  urgencyLevel?: UrgencyLevel;
}

// ============================================================================
// STORY GÉNÉRÉE
// ============================================================================

export interface GeneratedPanel {
  number: number; // 1-12
  narrativeFunction: NarrativeFunction;
  text: string;
  actors: string[]; // character slugs or 'client'
  location: string;
  visualPrompt: string;
  shotType: 'wide' | 'medium' | 'close' | 'detail';
}

export interface GeneratedStory {
  id: string;
  storyKey: string;
  title: string;
  summary: string;
  universe: ProblemUniverse;
  storyFamily: StoryFamilyKey;
  templateKey: TemplateKey;
  problemSlug: string;
  locationContext: LocationContext;
  clientProfileSlug: string;
  triggerSlug: string;
  assignedCharacters: {
    clientProfile: string;
    assistante: string;
    technician: string;
    dirigeant?: string;
    commercial?: string;
  };
  panels: GeneratedPanel[];
  outcomeSlugs: string[];
  ctaText: string;
  tone: 'rassurant' | 'pedagogique' | 'reactif' | 'proximite';
  visualPack: {
    styleSeed: string;
    palette: string;
    lighting: string;
    weather?: string;
  };
  diversityFingerprint: string[];
  diversityScore: DiversityScoreBreakdown;
  validation: ValidationResult;
  campaignMode?: StoryCampaignMode;
  createdAt: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

export type ValidationSeverity = 'blocking' | 'major' | 'minor';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  panelNumber?: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

// ============================================================================
// DIVERSITÉ
// ============================================================================

export interface DiversityScoreBreakdown {
  sameProblemType: number;
  sameStoryFamily: number;
  sameTechnician: number;
  sameLocation: number;
  sameOutcomeType: number;
  sameCta: number;
  totalScore: number;
}

// ============================================================================
// CAMPAGNE
// ============================================================================

export type StoryCampaignMode =
  | 'auto_balanced'
  | 'seasonal'
  | 'plomberie_focus'
  | 'electricite_focus'
  | 'mix_services'
  | 'urgence_only'
  | 'renovation_soft';

// ============================================================================
// INPUTS / OUTPUTS GÉNÉRATION
// ============================================================================

export interface BdStoryGenerationInput {
  agencyId: string;
  universe?: ProblemUniverse;
  templateType?: TemplateKey;
  storyFamily?: StoryFamilyKey;
  technicianPreference?: string[];
  season?: 'printemps' | 'ete' | 'automne' | 'hiver';
  tone?: 'rassurant' | 'pedagogique' | 'reactif' | 'proximite';
  ctaMode?: 'appel' | 'devis' | 'message' | 'intervention';
  campaignMode?: StoryCampaignMode;
  avoidRecentStoryKeys?: string[];
  avoidRecentProblemSlugs?: string[];
  avoidRecentTechnicianSlugs?: string[];
}

export interface BdStoryGenerationOutput {
  story: GeneratedStory;
  boardPromptMaster: string;
}

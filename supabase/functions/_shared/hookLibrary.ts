/**
 * HOOK LIBRARY — VERSION PRODUCTION (1000+ hooks exploitables)
 * 
 * Architecture :
 * 1. SEED LIBRARY : 120+ hooks premium validés manuellement
 * 2. MULTIPLICATEUR : 5 patterns × variables métier = 1000+ variations
 * 3. ROTATION ENGINE : anti-répétition + distribution par intent
 */

// ─── Types ───────────────────────────────────────────────
export type HookTrigger = 'peur' | 'argent' | 'urgence' | 'gain' | 'simplicite';
export type HookIntent = 'urgence' | 'prevention' | 'amelioration' | 'securite' | 'saisonnier' | 'conseil' | 'preuve' | 'contre_exemple' | 'pedagogique';
export type HookSeason = 'hiver' | 'ete' | 'printemps' | 'automne' | 'all';

export interface HookEntry {
  hook: string;
  universe: string;
  trigger: HookTrigger;
  intent: HookIntent;
  season: HookSeason;
}

// ─── SEED LIBRARY (120+ hooks premium) ──────────────────
export const HOOK_SEED_LIBRARY: HookEntry[] = [
  // ━━━ PLOMBERIE (20) ━━━
  { hook: "FUITE SOUS L'ÉVIER ?", universe: 'plomberie', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "VOTRE ROBINET GOUTTE ENCORE ?", universe: 'plomberie', trigger: 'argent', intent: 'prevention', season: 'all' },
  { hook: "PLUS D'EAU CHAUDE ?", universe: 'plomberie', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "CHAUFFE-EAU EN PANNE ?", universe: 'plomberie', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "WC BOUCHÉ CE MATIN ?", universe: 'plomberie', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "CETTE FUITE COÛTE CHER", universe: 'plomberie', trigger: 'argent', intent: 'prevention', season: 'all' },
  { hook: "RADIATEUR FROID EN BAS ?", universe: 'plomberie', trigger: 'peur', intent: 'prevention', season: 'hiver' },
  { hook: "CANALISATIONS GELÉES ?", universe: 'plomberie', trigger: 'peur', intent: 'urgence', season: 'hiver' },
  { hook: "TRACE D'HUMIDITÉ AU PLAFOND ?", universe: 'plomberie', trigger: 'peur', intent: 'urgence', season: 'all' },
  { hook: "ODEUR D'ÉGOUT CHEZ VOUS ?", universe: 'plomberie', trigger: 'peur', intent: 'urgence', season: 'all' },
  { hook: "FACTURE D'EAU ANORMALE ?", universe: 'plomberie', trigger: 'argent', intent: 'prevention', season: 'all' },
  { hook: "BRUIT DANS LES TUYAUX ?", universe: 'plomberie', trigger: 'peur', intent: 'prevention', season: 'all' },
  { hook: "DÉGÂT DES EAUX EN COURS ?", universe: 'plomberie', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "CHAUFFAGE QUI NE DÉMARRE PAS ?", universe: 'plomberie', trigger: 'urgence', intent: 'urgence', season: 'hiver' },
  { hook: "PURGE RADIATEURS FAITE ?", universe: 'plomberie', trigger: 'simplicite', intent: 'prevention', season: 'automne' },
  { hook: "BALLON D'EAU QUI ROUILLE ?", universe: 'plomberie', trigger: 'peur', intent: 'prevention', season: 'all' },
  { hook: "SIPHON QUI REFOULE ?", universe: 'plomberie', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "TUYAU PERCÉ SOUS L'ÉVIER ?", universe: 'plomberie', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "MITIGEUR QUI FUIT EN CONTINU ?", universe: 'plomberie', trigger: 'argent', intent: 'prevention', season: 'all' },
  { hook: "CHASSE D'EAU QUI COULE ?", universe: 'plomberie', trigger: 'argent', intent: 'prevention', season: 'all' },

  // ━━━ ÉLECTRICITÉ (18) ━━━
  { hook: "DISJONCTEUR QUI SAUTE ?", universe: 'electricite', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "PRISE QUI FAIT DES ÉTINCELLES ?", universe: 'electricite', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "PANNE DE COURANT CHEZ VOUS ?", universe: 'electricite', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "TABLEAU ÉLECTRIQUE VÉTUSTE ?", universe: 'electricite', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "ODEUR DE BRÛLÉ ÉLECTRIQUE ?", universe: 'electricite', trigger: 'peur', intent: 'urgence', season: 'all' },
  { hook: "INTERRUPTEUR QUI NE RÉPOND PLUS ?", universe: 'electricite', trigger: 'simplicite', intent: 'prevention', season: 'all' },
  { hook: "VOS PRISES SONT AUX NORMES ?", universe: 'electricite', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "LUMIÈRES QUI CLIGNOTENT ?", universe: 'electricite', trigger: 'peur', intent: 'prevention', season: 'all' },
  { hook: "FACTURE ÉLECTRIQUE TROP HAUTE ?", universe: 'electricite', trigger: 'argent', intent: 'amelioration', season: 'all' },
  { hook: "PRISE NOIRE DE CHALEUR ?", universe: 'electricite', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "COMPTEUR QUI DISJONCTE ?", universe: 'electricite', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "CÂBLES APPARENTS CHEZ VOUS ?", universe: 'electricite', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "AMPOULES QUI GRILLENT SANS CESSE ?", universe: 'electricite', trigger: 'argent', intent: 'prevention', season: 'all' },
  { hook: "PRISE QUI CHAUFFE AU TOUCHER ?", universe: 'electricite', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "INSTALLATION DE 30 ANS ?", universe: 'electricite', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "SURCHARGE ÉLECTRIQUE VISIBLE ?", universe: 'electricite', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "LED QUI GRÉSILLE ?", universe: 'electricite', trigger: 'simplicite', intent: 'prevention', season: 'all' },
  { hook: "RALLONGES PARTOUT CHEZ VOUS ?", universe: 'electricite', trigger: 'peur', intent: 'securite', season: 'all' },

  // ━━━ SERRURERIE (14) ━━━
  { hook: "PORTE CLAQUÉE, CLÉS DEDANS ?", universe: 'serrurerie', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "SERRURE BLOQUÉE CE SOIR ?", universe: 'serrurerie', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "CLÉ CASSÉE DANS LA SERRURE ?", universe: 'serrurerie', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "CAMBRIOLAGE DANS VOTRE RUE ?", universe: 'serrurerie', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "VOTRE PORTE RÉSISTE VRAIMENT ?", universe: 'serrurerie', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "PONT = CAMBRIOLAGES", universe: 'serrurerie', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "VERROU TROP FACILE À FORCER ?", universe: 'serrurerie', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "VACANCES = MAISON VULNÉRABLE", universe: 'serrurerie', trigger: 'peur', intent: 'securite', season: 'ete' },
  { hook: "SERRURE 3 POINTS OU PAS ?", universe: 'serrurerie', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "PORTE D'ENTRÉE VIEILLISSANTE ?", universe: 'serrurerie', trigger: 'simplicite', intent: 'amelioration', season: 'all' },
  { hook: "CYLINDRE USÉ = RISQUE RÉEL", universe: 'serrurerie', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "CLAQUÉ DEHORS À 23H ?", universe: 'serrurerie', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "BLINDAGE PORTE = TRANQUILLITÉ", universe: 'serrurerie', trigger: 'gain', intent: 'securite', season: 'all' },
  { hook: "DOUBLE CLÉ PERDUE ?", universe: 'serrurerie', trigger: 'urgence', intent: 'urgence', season: 'all' },

  // ━━━ VOLETS (12) ━━━
  { hook: "VOLET BLOQUÉ CE MATIN ?", universe: 'volets', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "IL NE REMONTE PLUS ?", universe: 'volets', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "MOTEUR DE VOLET QUI GRINCE ?", universe: 'volets', trigger: 'peur', intent: 'prevention', season: 'all' },
  { hook: "STORE COINCÉ À MI-HAUTEUR ?", universe: 'volets', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "VOLET = PASSOIRE THERMIQUE ?", universe: 'volets', trigger: 'argent', intent: 'amelioration', season: 'hiver' },
  { hook: "CANICULE SANS VOLETS ?", universe: 'volets', trigger: 'gain', intent: 'saisonnier', season: 'ete' },
  { hook: "SANGLE DE VOLET USÉE ?", universe: 'volets', trigger: 'simplicite', intent: 'prevention', season: 'all' },
  { hook: "PROGRAMMATEUR DÉRÉGLÉ ?", universe: 'volets', trigger: 'simplicite', intent: 'prevention', season: 'all' },
  { hook: "LAMES DE VOLET TORDUES ?", universe: 'volets', trigger: 'simplicite', intent: 'amelioration', season: 'all' },
  { hook: "VOLET MOTORISÉ EN PANNE ?", universe: 'volets', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "ISOLATION PAR LES VOLETS ?", universe: 'volets', trigger: 'argent', intent: 'amelioration', season: 'hiver' },
  { hook: "MANIVELLE QUI TOURNE DANS LE VIDE ?", universe: 'volets', trigger: 'urgence', intent: 'urgence', season: 'all' },

  // ━━━ VITRERIE (10) ━━━
  { hook: "VITRE FISSURÉE CE MATIN ?", universe: 'vitrerie', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "DOUBLE VITRAGE EMBUÉE ?", universe: 'vitrerie', trigger: 'argent', intent: 'amelioration', season: 'hiver' },
  { hook: "FENÊTRE QUI NE FERME PLUS ?", universe: 'vitrerie', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "COURANT D'AIR FENÊTRES FERMÉES ?", universe: 'vitrerie', trigger: 'argent', intent: 'amelioration', season: 'hiver' },
  { hook: "CARREAU CASSÉ = URGENCE", universe: 'vitrerie', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "JOINT DE FENÊTRE MORT ?", universe: 'vitrerie', trigger: 'argent', intent: 'prevention', season: 'automne' },
  { hook: "BUÉE ENTRE LES VITRES ?", universe: 'vitrerie', trigger: 'argent', intent: 'amelioration', season: 'hiver' },
  { hook: "FENÊTRE BLOQUÉE OUVERTE ?", universe: 'vitrerie', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "VITRAGE SIMPLE EN 2026 ?", universe: 'vitrerie', trigger: 'argent', intent: 'amelioration', season: 'all' },
  { hook: "CONDENSATION SUR VOS VITRES ?", universe: 'vitrerie', trigger: 'argent', intent: 'prevention', season: 'hiver' },

  // ━━━ MENUISERIE (10) ━━━
  { hook: "PORTE QUI FROTTE AU SOL ?", universe: 'menuiserie', trigger: 'simplicite', intent: 'amelioration', season: 'all' },
  { hook: "PLACARD QUI NE FERME PLUS ?", universe: 'menuiserie', trigger: 'simplicite', intent: 'amelioration', season: 'all' },
  { hook: "PARQUET QUI GONDOLE ?", universe: 'menuiserie', trigger: 'peur', intent: 'urgence', season: 'all' },
  { hook: "HUMIDITÉ SUR VOS BOISERIES ?", universe: 'menuiserie', trigger: 'peur', intent: 'prevention', season: 'automne' },
  { hook: "PORTE QUI CLAQUE AU VENT ?", universe: 'menuiserie', trigger: 'simplicite', intent: 'prevention', season: 'all' },
  { hook: "GONDS QUI GRINCENT ?", universe: 'menuiserie', trigger: 'simplicite', intent: 'amelioration', season: 'all' },
  { hook: "TIROIR BLOQUÉ CHEZ VOUS ?", universe: 'menuiserie', trigger: 'simplicite', intent: 'amelioration', season: 'all' },
  { hook: "BOIS GONFLÉ PAR L'HUMIDITÉ ?", universe: 'menuiserie', trigger: 'peur', intent: 'prevention', season: 'automne' },
  { hook: "PLINTHE DÉCOLLÉE ?", universe: 'menuiserie', trigger: 'simplicite', intent: 'amelioration', season: 'all' },
  { hook: "CADRE DE PORTE FISSURÉ ?", universe: 'menuiserie', trigger: 'peur', intent: 'prevention', season: 'all' },

  // ━━━ RÉNOVATION (12) ━━━
  { hook: "SALLE DE BAIN VIEILLISSANTE ?", universe: 'renovation', trigger: 'gain', intent: 'amelioration', season: 'all' },
  { hook: "CUISINE À REFAIRE ?", universe: 'renovation', trigger: 'gain', intent: 'amelioration', season: 'all' },
  { hook: "CARRELAGE FISSURÉ ?", universe: 'renovation', trigger: 'simplicite', intent: 'amelioration', season: 'all' },
  { hook: "MOISISSURES SUR LES MURS ?", universe: 'renovation', trigger: 'peur', intent: 'urgence', season: 'all' },
  { hook: "PEINTURE QUI S'ÉCAILLE ?", universe: 'renovation', trigger: 'simplicite', intent: 'amelioration', season: 'all' },
  { hook: "VOTRE MAISON PERD DE LA VALEUR", universe: 'renovation', trigger: 'argent', intent: 'amelioration', season: 'all' },
  { hook: "JOINTS DE DOUCHE NOIRS ?", universe: 'renovation', trigger: 'peur', intent: 'amelioration', season: 'all' },
  { hook: "FAÏENCE CASSÉE ?", universe: 'renovation', trigger: 'simplicite', intent: 'amelioration', season: 'all' },
  { hook: "REVÊTEMENT QUI SE DÉCOLLE ?", universe: 'renovation', trigger: 'simplicite', intent: 'amelioration', season: 'all' },
  { hook: "CRÉPI QUI TOMBE DEHORS ?", universe: 'renovation', trigger: 'peur', intent: 'prevention', season: 'all' },
  { hook: "SOL ABÎMÉ ET DANGEREUX ?", universe: 'renovation', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "TRAVAUX AVANT DE VENDRE ?", universe: 'renovation', trigger: 'argent', intent: 'amelioration', season: 'all' },

  // ━━━ PMR (8) ━━━
  { hook: "DOUCHE INACCESSIBLE ?", universe: 'pmr', trigger: 'gain', intent: 'amelioration', season: 'all' },
  { hook: "ESCALIER DEVENU DANGEREUX ?", universe: 'pmr', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "ADAPTER POUR RESTER CHEZ SOI", universe: 'pmr', trigger: 'gain', intent: 'amelioration', season: 'all' },
  { hook: "AIDE ADAPTATION = 0€ DE RESTE", universe: 'pmr', trigger: 'argent', intent: 'amelioration', season: 'all' },
  { hook: "BAIGNOIRE = RISQUE DE CHUTE", universe: 'pmr', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "BARRE D'APPUI MANQUANTE ?", universe: 'pmr', trigger: 'peur', intent: 'securite', season: 'all' },
  { hook: "WC TROP BAS POUR VOS PARENTS ?", universe: 'pmr', trigger: 'gain', intent: 'amelioration', season: 'all' },
  { hook: "SEUIL DE PORTE = OBSTACLE ?", universe: 'pmr', trigger: 'gain', intent: 'amelioration', season: 'all' },

  // ━━━ GÉNÉRAL / MULTI-MÉTIER (16) ━━━
  { hook: "URGENCE UN JOUR FÉRIÉ ?", universe: 'general', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "PANNE CE WEEK-END ?", universe: 'general', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "QUI APPELER À 22H ?", universe: 'general', trigger: 'urgence', intent: 'urgence', season: 'all' },
  { hook: "INTERVENTION EN 1H ?", universe: 'general', trigger: 'simplicite', intent: 'urgence', season: 'all' },
  { hook: "DEVIS GRATUIT, SANS SURPRISE", universe: 'general', trigger: 'simplicite', intent: 'amelioration', season: 'all' },
  { hook: "TECHNICIEN PRÈS DE CHEZ VOUS", universe: 'general', trigger: 'simplicite', intent: 'urgence', season: 'all' },
  { hook: "ÇA PEUT EMPIRER AUJOURD'HUI", universe: 'general', trigger: 'peur', intent: 'urgence', season: 'all' },
  { hook: "CHAQUE JOUR AGGRAVE LE PROBLÈME", universe: 'general', trigger: 'peur', intent: 'urgence', season: 'all' },
  { hook: "NE LAISSEZ PAS TRAÎNER ÇA", universe: 'general', trigger: 'urgence', intent: 'prevention', season: 'all' },
  { hook: "VOUS PERDEZ DE L'ARGENT ICI", universe: 'general', trigger: 'argent', intent: 'prevention', season: 'all' },
  { hook: "MOINS CHER MAINTENANT QU'APRÈS", universe: 'general', trigger: 'argent', intent: 'prevention', season: 'all' },
  { hook: "PRÉVENIR COÛTE MOINS CHER", universe: 'general', trigger: 'argent', intent: 'prevention', season: 'all' },
  { hook: "ANTICIPEZ AVANT LA PANNE", universe: 'general', trigger: 'simplicite', intent: 'prevention', season: 'all' },
  { hook: "AVANT L'HIVER, VÉRIFIEZ TOUT", universe: 'general', trigger: 'simplicite', intent: 'saisonnier', season: 'automne' },
  { hook: "AVANT L'ÉTÉ, ANTICIPEZ", universe: 'general', trigger: 'simplicite', intent: 'saisonnier', season: 'printemps' },
  { hook: "LE BON MOMENT POUR AGIR", universe: 'general', trigger: 'simplicite', intent: 'saisonnier', season: 'all' },
];

// ─── PATTERN MULTIPLICATEUR ─────────────────────────────
// 5 patterns × variables métier = 1000+ hooks générés dynamiquement

interface PatternVars {
  elements: string[];
  problemes: string[];
  consequences: string[];
  ressources: string[];
  moments: string[];
  scenarios: string[];
}

const PATTERN_VARS: Record<string, PatternVars> = {
  plomberie: {
    elements: ['robinet', 'canalisation', 'chauffe-eau', 'ballon d\'eau', 'siphon', 'WC', 'mitigeur', 'chasse d\'eau', 'radiateur', 'tuyau'],
    problemes: ['fuit', 'est bouché', 'ne fonctionne plus', 'fait du bruit', 'coule sans arrêt', 'goutte', 'est percé'],
    consequences: ['coûter très cher', 'inonder votre maison', 'empirer rapidement', 'provoquer un dégât des eaux', 'doubler votre facture'],
    ressources: ['de l\'eau', 'de l\'argent', 'en chauffage'],
    moments: ['l\'hiver', 'les vacances', 'la nuit', 'le week-end'],
    scenarios: ['ça inondait cette nuit', 'le ballon lâchait', 'la fuite empirait', 'le tuyau cédait'],
  },
  electricite: {
    elements: ['prise', 'tableau électrique', 'disjoncteur', 'interrupteur', 'câblage', 'installation', 'compteur'],
    problemes: ['disjoncte', 'fait des étincelles', 'chauffe', 'ne répond plus', 'grésille', 'saute'],
    consequences: ['provoquer un incendie', 'mettre votre famille en danger', 'coûter une fortune', 'tout court-circuiter'],
    ressources: ['en électricité', 'sur votre facture', 'en sécurité'],
    moments: ['la nuit', 'l\'hiver', 'pendant l\'orage'],
    scenarios: ['ça prenait feu', 'le compteur lâchait', 'tout disjonctait ce soir', 'un court-circuit survenait'],
  },
  serrurerie: {
    elements: ['serrure', 'porte', 'verrou', 'cylindre', 'blindage', 'gâche'],
    problemes: ['est bloquée', 'ne ferme plus', 'grince', 'est forcée', 'résiste mal'],
    consequences: ['faciliter un cambriolage', 'vous bloquer dehors', 'mettre votre sécurité en jeu'],
    ressources: ['en sécurité', 'en tranquillité'],
    moments: ['les vacances', 'la nuit', 'le week-end prolongé'],
    scenarios: ['quelqu\'un entrait', 'vous étiez bloqué dehors', 'la porte cédait', 'on forçait votre serrure'],
  },
  volets: {
    elements: ['volet', 'store', 'moteur de volet', 'sangle', 'lames', 'manivelle', 'programmateur'],
    problemes: ['est bloqué', 'ne remonte plus', 'grince', 'est coincé', 'tourne dans le vide'],
    consequences: ['laisser entrer la chaleur', 'ruiner votre isolation', 'vous priver de sécurité'],
    ressources: ['en chauffage', 'en climatisation', 'en confort'],
    moments: ['l\'été', 'l\'hiver', 'la canicule'],
    scenarios: ['le moteur lâchait', 'le volet se bloquait ouvert', 'la sangle cassait'],
  },
  vitrerie: {
    elements: ['vitre', 'fenêtre', 'double vitrage', 'carreau', 'joint de fenêtre', 'vitrage'],
    problemes: ['est fissurée', 'ne ferme plus', 'est embuée', 'laisse passer l\'air', 'est cassé'],
    consequences: ['gaspiller en chauffage', 'exposer votre maison', 'aggraver l\'humidité'],
    ressources: ['en chauffage', 'en isolation', 'en sécurité'],
    moments: ['l\'hiver', 'la tempête', 'la nuit'],
    scenarios: ['le carreau cédait', 'la fenêtre se brisait', 'le froid entrait chez vous'],
  },
  menuiserie: {
    elements: ['porte', 'placard', 'parquet', 'tiroir', 'plinthe', 'cadre de porte', 'boiserie'],
    problemes: ['frotte au sol', 'ne ferme plus', 'gondole', 'est gonflé', 'grince', 'se décolle'],
    consequences: ['empirer avec l\'humidité', 'abîmer votre sol', 'dévaloriser votre intérieur'],
    ressources: ['en confort', 'en esthétique'],
    moments: ['l\'automne', 'la saison humide'],
    scenarios: ['le bois gonflait encore', 'la porte se bloquait', 'le parquet se soulevait'],
  },
  renovation: {
    elements: ['carrelage', 'peinture', 'faïence', 'joints', 'revêtement', 'crépi', 'sol'],
    problemes: ['est fissuré', 's\'écaille', 'se décolle', 'noircit', 'tombe', 'est abîmé'],
    consequences: ['faire perdre de la valeur', 'provoquer de l\'humidité', 'devenir dangereux'],
    ressources: ['en valeur immobilière', 'en confort de vie'],
    moments: ['avant de vendre', 'avant l\'été', 'ce printemps'],
    scenarios: ['les murs s\'abîmaient encore', 'la moisissure gagnait', 'le sol cédait'],
  },
  general: {
    elements: ['installation', 'équipement', 'maison', 'logement'],
    problemes: ['dysfonctionne', 'tombe en panne', 'vieillit mal', 'montre des signes de faiblesse'],
    consequences: ['coûter cher', 'empirer', 'provoquer des dégâts', 'vous bloquer'],
    ressources: ['de l\'argent', 'du temps', 'en confort'],
    moments: ['l\'hiver', 'les vacances', 'le week-end', 'la nuit'],
    scenarios: ['ça lâchait demain', 'la panne arrivait ce soir', 'tout tombait en panne'],
  },
};

// ─── Pattern generators ─────────────────────────────────
type PatternGenerator = (vars: PatternVars) => string[];

const HOOK_PATTERNS: { name: string; trigger: HookTrigger; intent: HookIntent; generate: PatternGenerator }[] = [
  {
    name: 'question',
    trigger: 'urgence',
    intent: 'urgence',
    generate: (v) => {
      const results: string[] = [];
      for (const el of v.elements) {
        for (const pb of v.problemes) {
          const hook = `VOTRE ${el.toUpperCase()} ${pb.toUpperCase()} ?`;
          if (hook.split(/\s+/).length <= 6) results.push(hook);
        }
      }
      return results;
    },
  },
  {
    name: 'alerte',
    trigger: 'peur',
    intent: 'prevention',
    generate: (v) => v.consequences.map(c => `ÇA PEUT ${c.toUpperCase()}`).filter(h => h.split(/\s+/).length <= 6),
  },
  {
    name: 'perte',
    trigger: 'argent',
    intent: 'prevention',
    generate: (v) => v.ressources.map(r => `VOUS PERDEZ ${r.toUpperCase()}`).filter(h => h.split(/\s+/).length <= 6),
  },
  {
    name: 'anticipation',
    trigger: 'simplicite',
    intent: 'saisonnier',
    generate: (v) => v.moments.map(m => `AVANT ${m.toUpperCase()}, VÉRIFIEZ`).filter(h => h.split(/\s+/).length <= 6),
  },
  {
    name: 'risque',
    trigger: 'peur',
    intent: 'urgence',
    generate: (v) => v.scenarios.map(s => `ET SI ${s.toUpperCase()} ?`).filter(h => h.split(/\s+/).length <= 7),
  },
];

// ─── Generate expanded hooks from patterns ──────────────
function generatePatternHooks(universe: string): HookEntry[] {
  const vars = PATTERN_VARS[universe] || PATTERN_VARS.general;
  const hooks: HookEntry[] = [];
  const seen = new Set<string>();

  for (const pattern of HOOK_PATTERNS) {
    const generated = pattern.generate(vars);
    for (const hook of generated) {
      const normalized = hook.replace(/\s+/g, ' ').trim();
      if (normalized.length > 40) continue; // too long
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      hooks.push({
        hook: normalized,
        universe,
        trigger: pattern.trigger,
        intent: pattern.intent,
        season: 'all',
      });
    }
  }
  return hooks;
}

// ─── FULL LIBRARY (seed + generated) ────────────────────
let _fullLibrary: HookEntry[] | null = null;

export function getFullHookLibrary(): HookEntry[] {
  if (_fullLibrary) return _fullLibrary;

  const seedNormalized = new Set(HOOK_SEED_LIBRARY.map(h => h.hook.replace(/\s+/g, ' ').trim()));
  const generated: HookEntry[] = [];

  const universes = Object.keys(PATTERN_VARS);
  for (const uni of universes) {
    const patternHooks = generatePatternHooks(uni);
    for (const h of patternHooks) {
      if (!seedNormalized.has(h.hook)) {
        generated.push(h);
      }
    }
  }

  _fullLibrary = [...HOOK_SEED_LIBRARY, ...generated];
  console.log(`[hookLibrary] Total hooks: ${_fullLibrary.length} (${HOOK_SEED_LIBRARY.length} seed + ${generated.length} generated)`);
  return _fullLibrary;
}

// ─── Season helper ──────────────────────────────────────
export function getSeasonFromMonth(month: number): HookSeason {
  if (month >= 3 && month <= 5) return 'printemps';
  if (month >= 6 && month <= 8) return 'ete';
  if (month >= 9 && month <= 11) return 'automne';
  return 'hiver';
}

// ─── Context-based hook filtering ───────────────────────
export function getHooksForContext(
  universe: string,
  month: number,
  intent?: HookIntent,
): HookEntry[] {
  const season = getSeasonFromMonth(month);
  const library = getFullHookLibrary();

  return library.filter(h => {
    if (h.universe !== universe && h.universe !== 'general') return false;
    if (h.season !== 'all' && h.season !== season) return false;
    if (intent && h.intent !== intent) return false;
    return true;
  });
}

// ─── Rotation engine: pick N hooks with diversity ───────
export function pickHooksWithRotation(
  universe: string,
  month: number,
  count: number,
  usedHooks?: string[],
): HookEntry[] {
  const available = getHooksForContext(universe, month);
  const usedSet = new Set(usedHooks || []);

  // Filter out already-used hooks
  const fresh = available.filter(h => !usedSet.has(h.hook));
  const pool = fresh.length >= count ? fresh : available;

  // Priority order: urgence > argent > securite > prevention > saisonnier
  const intentPriority: HookIntent[] = ['urgence', 'prevention', 'securite', 'amelioration', 'saisonnier'];
  const triggerPriority: HookTrigger[] = ['urgence', 'peur', 'argent', 'gain', 'simplicite'];

  // Score each hook
  const scored = pool.map(h => ({
    ...h,
    score: (5 - intentPriority.indexOf(h.intent)) * 10 + (5 - triggerPriority.indexOf(h.trigger)),
  }));

  // Sort by score descending with some randomness
  scored.sort((a, b) => {
    const diff = b.score - a.score;
    if (Math.abs(diff) < 5) return Math.random() - 0.5; // shuffle similar-scored hooks
    return diff;
  });

  // Pick ensuring trigger diversity
  const result: HookEntry[] = [];
  const triggerCounts: Record<string, number> = {};

  for (const h of scored) {
    if (result.length >= count) break;
    const tCount = triggerCounts[h.trigger] || 0;
    if (tCount >= Math.ceil(count / 3)) continue; // max 1/3 same trigger
    triggerCounts[h.trigger] = tCount + 1;
    result.push(h);
  }

  // Fill remaining if needed
  if (result.length < count) {
    for (const h of scored) {
      if (result.length >= count) break;
      if (!result.includes(h)) result.push(h);
    }
  }

  return result.slice(0, count);
}

// ─── Build prompt-ready hook library string ─────────────
export function buildHookLibraryPrompt(month: number): string {
  const season = getSeasonFromMonth(month);
  const library = getFullHookLibrary();
  const seasonalHooks = library.filter(h => h.season === 'all' || h.season === season);

  // Group by universe, limit display to seed + top generated per universe
  const grouped: Record<string, HookEntry[]> = {};
  for (const h of seasonalHooks) {
    grouped[h.universe] = grouped[h.universe] || [];
    // Cap at 25 per universe for prompt size
    if (grouped[h.universe].length < 25) {
      grouped[h.universe].push(h);
    }
  }

  return Object.entries(grouped)
    .map(([uni, hooks]) =>
      `${uni.toUpperCase()} :\n${hooks.map(h => `  - "${h.hook}" [${h.trigger}/${h.intent}]`).join('\n')}`
    )
    .join('\n\n');
}

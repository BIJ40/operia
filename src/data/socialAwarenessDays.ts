/**
 * Dataset filtré de journées nationales/internationales pertinentes pour le métier HelpConfort.
 * Seules les journées avec un lien direct au secteur habitat/énergie/sécurité/entretien sont incluses.
 */

export interface AwarenessDay {
  month: number;
  day: number;
  label: string;
  tags: string[];
  relevanceDomains: string[];
  priorityScore: number;
  contentTypeHint: 'pedagogique' | 'prevention' | 'engagement' | 'local_branding';
  preferredUniverses: string[];
  ctaHint: string;
}

export const AWARENESS_DAYS: AwarenessDay[] = [
  // ─── Janvier ───
  { month: 1, day: 1, label: "Bonne année — Résolutions habitat", tags: ['habitat', 'entretien'], relevanceDomains: ['habitat', 'renovation'], priorityScore: 75, contentTypeHint: 'engagement', preferredUniverses: ['general'], ctaHint: 'devis_entretien_annuel' },
  { month: 1, day: 10, label: "Journée de la dépression saisonnière — Confort chez soi", tags: ['confort', 'habitat'], relevanceDomains: ['habitat', 'confort'], priorityScore: 55, contentTypeHint: 'engagement', preferredUniverses: ['general'], ctaHint: 'diagnostic_confort' },
  { month: 1, day: 15, label: "Pic de froid — Prévention gel canalisations", tags: ['eau', 'urgence', 'plomberie'], relevanceDomains: ['urgence', 'entretien'], priorityScore: 95, contentTypeHint: 'prevention', preferredUniverses: ['plomberie'], ctaHint: 'urgence_gel_canalisation' },

  // ─── Février ───
  { month: 2, day: 1, label: "Début période grand froid — Chauffage & isolation", tags: ['energie', 'habitat', 'confort'], relevanceDomains: ['energie', 'entretien'], priorityScore: 85, contentTypeHint: 'pedagogique', preferredUniverses: ['plomberie', 'renovation'], ctaHint: 'bilan_chauffage' },
  { month: 2, day: 10, label: "Journée mondiale des énergies — Économies d'énergie", tags: ['energie', 'habitat'], relevanceDomains: ['energie', 'renovation'], priorityScore: 80, contentTypeHint: 'pedagogique', preferredUniverses: ['electricite', 'plomberie'], ctaHint: 'audit_energetique' },
  { month: 2, day: 14, label: "Saint-Valentin — Cocooning à deux", tags: ['confort', 'habitat'], relevanceDomains: ['habitat', 'confort'], priorityScore: 60, contentTypeHint: 'engagement', preferredUniverses: ['general'], ctaHint: 'ambiance_interieure' },

  // ─── Mars ───
  { month: 3, day: 1, label: "Début du printemps — Check-up maison", tags: ['entretien', 'habitat'], relevanceDomains: ['habitat', 'entretien'], priorityScore: 90, contentTypeHint: 'pedagogique', preferredUniverses: ['general'], ctaHint: 'check_up_printemps' },
  { month: 3, day: 8, label: "Journée de la femme — Nos techniciennes", tags: ['engagement'], relevanceDomains: ['habitat'], priorityScore: 65, contentTypeHint: 'local_branding', preferredUniverses: ['general'], ctaHint: 'portrait_equipe' },
  { month: 3, day: 22, label: "Journée mondiale de l'eau", tags: ['eau', 'plomberie', 'habitat'], relevanceDomains: ['habitat', 'entretien', 'urgence'], priorityScore: 95, contentTypeHint: 'pedagogique', preferredUniverses: ['plomberie'], ctaHint: 'diagnostic_fuite_entretien' },
  { month: 3, day: 26, label: "Earth Hour — Économies d'énergie", tags: ['energie', 'habitat'], relevanceDomains: ['energie'], priorityScore: 70, contentTypeHint: 'engagement', preferredUniverses: ['electricite'], ctaHint: 'conseils_economies' },

  // ─── Avril ───
  { month: 4, day: 7, label: "Journée mondiale de la santé — Air intérieur", tags: ['habitat', 'confort', 'securite'], relevanceDomains: ['habitat', 'confort'], priorityScore: 75, contentTypeHint: 'pedagogique', preferredUniverses: ['plomberie', 'renovation'], ctaHint: 'qualite_air' },
  { month: 4, day: 15, label: "Saison allergies — Entretien VMC & filtres", tags: ['entretien', 'confort'], relevanceDomains: ['entretien', 'confort'], priorityScore: 80, contentTypeHint: 'prevention', preferredUniverses: ['plomberie'], ctaHint: 'entretien_vmc' },
  { month: 4, day: 22, label: "Jour de la Terre", tags: ['energie', 'habitat', 'renovation'], relevanceDomains: ['energie', 'renovation'], priorityScore: 85, contentTypeHint: 'pedagogique', preferredUniverses: ['general', 'renovation'], ctaHint: 'renovation_ecologique' },
  { month: 4, day: 28, label: "Journée sécurité au travail", tags: ['securite'], relevanceDomains: ['securite'], priorityScore: 70, contentTypeHint: 'engagement', preferredUniverses: ['general'], ctaHint: 'securite_chantier' },

  // ─── Mai ───
  { month: 5, day: 1, label: "Fête du travail — Nos artisans", tags: ['engagement'], relevanceDomains: ['habitat'], priorityScore: 65, contentTypeHint: 'local_branding', preferredUniverses: ['general'], ctaHint: 'portrait_equipe' },
  { month: 5, day: 10, label: "Préparer l'été — Entretien climatisation", tags: ['entretien', 'confort', 'energie'], relevanceDomains: ['entretien', 'confort'], priorityScore: 90, contentTypeHint: 'prevention', preferredUniverses: ['plomberie', 'electricite'], ctaHint: 'entretien_clim' },
  { month: 5, day: 15, label: "Journée de l'accessibilité — PMR", tags: ['habitat', 'renovation'], relevanceDomains: ['habitat', 'renovation'], priorityScore: 80, contentTypeHint: 'pedagogique', preferredUniverses: ['pmr'], ctaHint: 'adaptation_logement' },
  { month: 5, day: 25, label: "Journée des voisins", tags: ['engagement', 'habitat'], relevanceDomains: ['habitat'], priorityScore: 60, contentTypeHint: 'engagement', preferredUniverses: ['general'], ctaHint: 'parrainage' },

  // ─── Juin ───
  { month: 6, day: 5, label: "Journée mondiale de l'environnement", tags: ['energie', 'habitat', 'renovation'], relevanceDomains: ['energie', 'renovation'], priorityScore: 85, contentTypeHint: 'pedagogique', preferredUniverses: ['renovation', 'general'], ctaHint: 'eco_renovation' },
  { month: 6, day: 15, label: "Canicule — Conseils fraîcheur", tags: ['confort', 'urgence', 'habitat'], relevanceDomains: ['confort', 'urgence'], priorityScore: 90, contentTypeHint: 'prevention', preferredUniverses: ['plomberie', 'electricite'], ctaHint: 'installation_clim' },
  { month: 6, day: 21, label: "Été — Sécuriser avant vacances", tags: ['securite', 'serrurerie'], relevanceDomains: ['securite'], priorityScore: 85, contentTypeHint: 'prevention', preferredUniverses: ['serrurerie'], ctaHint: 'securisation_depart_vacances' },
  { month: 6, day: 25, label: "Journée des PME — Artisanat local", tags: ['engagement'], relevanceDomains: ['habitat'], priorityScore: 65, contentTypeHint: 'local_branding', preferredUniverses: ['general'], ctaHint: 'proximite_artisan' },

  // ─── Juillet ───
  { month: 7, day: 1, label: "Début vacances — Check-list départ", tags: ['securite', 'entretien'], relevanceDomains: ['securite', 'entretien'], priorityScore: 85, contentTypeHint: 'prevention', preferredUniverses: ['serrurerie', 'plomberie'], ctaHint: 'checklist_vacances' },
  { month: 7, day: 14, label: "Fête nationale", tags: ['engagement'], relevanceDomains: ['habitat'], priorityScore: 50, contentTypeHint: 'engagement', preferredUniverses: ['general'], ctaHint: 'voeux_fete_nationale' },
  { month: 7, day: 20, label: "Pic chaleur — Stores & volets roulants", tags: ['confort', 'habitat'], relevanceDomains: ['confort', 'habitat'], priorityScore: 85, contentTypeHint: 'pedagogique', preferredUniverses: ['volets'], ctaHint: 'installation_volets' },

  // ─── Août ───
  { month: 8, day: 1, label: "Urgences estivales — Plomberie & serrurerie", tags: ['urgence', 'plomberie', 'serrurerie'], relevanceDomains: ['urgence'], priorityScore: 90, contentTypeHint: 'prevention', preferredUniverses: ['plomberie', 'serrurerie'], ctaHint: 'numero_urgence' },
  { month: 8, day: 15, label: "Mi-août — Préparer la rentrée habitat", tags: ['entretien', 'habitat'], relevanceDomains: ['habitat', 'entretien'], priorityScore: 75, contentTypeHint: 'pedagogique', preferredUniverses: ['general'], ctaHint: 'bilan_rentree' },
  { month: 8, day: 25, label: "Fin été — Bilan conso énergétique", tags: ['energie'], relevanceDomains: ['energie'], priorityScore: 70, contentTypeHint: 'pedagogique', preferredUniverses: ['electricite'], ctaHint: 'bilan_energie_ete' },

  // ─── Septembre ───
  { month: 9, day: 1, label: "Rentrée — Remise en route chauffage", tags: ['entretien', 'energie', 'plomberie'], relevanceDomains: ['entretien', 'energie'], priorityScore: 90, contentTypeHint: 'prevention', preferredUniverses: ['plomberie'], ctaHint: 'revision_chauffage' },
  { month: 9, day: 15, label: "Semaine du développement durable", tags: ['energie', 'renovation', 'habitat'], relevanceDomains: ['energie', 'renovation'], priorityScore: 80, contentTypeHint: 'pedagogique', preferredUniverses: ['renovation', 'general'], ctaHint: 'renovation_energetique' },
  { month: 9, day: 21, label: "Journée de la paix — Sérénité chez soi", tags: ['confort', 'securite'], relevanceDomains: ['confort', 'securite'], priorityScore: 55, contentTypeHint: 'engagement', preferredUniverses: ['general'], ctaHint: 'securite_domicile' },

  // ─── Octobre ───
  { month: 10, day: 1, label: "Octobre — Anticiper l'hiver", tags: ['entretien', 'habitat', 'energie'], relevanceDomains: ['entretien', 'energie'], priorityScore: 90, contentTypeHint: 'prevention', preferredUniverses: ['plomberie', 'renovation'], ctaHint: 'preparation_hiver' },
  { month: 10, day: 8, label: "Journée du logement — Droit au confort", tags: ['habitat', 'confort'], relevanceDomains: ['habitat', 'confort'], priorityScore: 80, contentTypeHint: 'pedagogique', preferredUniverses: ['general', 'pmr'], ctaHint: 'droit_confort' },
  { month: 10, day: 13, label: "Journée de la prévention des catastrophes", tags: ['securite', 'urgence', 'habitat'], relevanceDomains: ['securite', 'urgence'], priorityScore: 85, contentTypeHint: 'prevention', preferredUniverses: ['plomberie', 'electricite'], ctaHint: 'prevention_degats_eaux' },
  { month: 10, day: 25, label: "Passage heure d'hiver — Éclairage & sécurité", tags: ['securite', 'electricite'], relevanceDomains: ['securite', 'energie'], priorityScore: 75, contentTypeHint: 'pedagogique', preferredUniverses: ['electricite'], ctaHint: 'eclairage_securite' },

  // ─── Novembre ───
  { month: 11, day: 1, label: "Début chauffage — Purge radiateurs", tags: ['entretien', 'plomberie', 'energie'], relevanceDomains: ['entretien', 'energie'], priorityScore: 90, contentTypeHint: 'prevention', preferredUniverses: ['plomberie'], ctaHint: 'purge_radiateurs' },
  { month: 11, day: 8, label: "Journée de la qualité — Nos engagements", tags: ['engagement'], relevanceDomains: ['habitat'], priorityScore: 65, contentTypeHint: 'local_branding', preferredUniverses: ['general'], ctaHint: 'charte_qualite' },
  { month: 11, day: 15, label: "Journée du recyclage — Chantiers propres", tags: ['renovation', 'habitat'], relevanceDomains: ['renovation'], priorityScore: 70, contentTypeHint: 'engagement', preferredUniverses: ['renovation', 'general'], ctaHint: 'chantier_propre' },
  { month: 11, day: 25, label: "Journée anti-gaspillage énergétique", tags: ['energie', 'habitat'], relevanceDomains: ['energie'], priorityScore: 85, contentTypeHint: 'pedagogique', preferredUniverses: ['electricite', 'plomberie'], ctaHint: 'economies_chauffage' },

  // ─── Décembre ───
  { month: 12, day: 1, label: "Hiver — Risques gel & canalisations", tags: ['urgence', 'eau', 'plomberie'], relevanceDomains: ['urgence', 'entretien'], priorityScore: 95, contentTypeHint: 'prevention', preferredUniverses: ['plomberie'], ctaHint: 'prevention_gel' },
  { month: 12, day: 10, label: "Sécurité électrique fêtes — Guirlandes & surcharges", tags: ['securite', 'electricite'], relevanceDomains: ['securite'], priorityScore: 80, contentTypeHint: 'prevention', preferredUniverses: ['electricite'], ctaHint: 'securite_electrique_noel' },
  { month: 12, day: 20, label: "Fêtes — Urgences plomberie & serrurerie", tags: ['urgence', 'plomberie', 'serrurerie'], relevanceDomains: ['urgence'], priorityScore: 85, contentTypeHint: 'prevention', preferredUniverses: ['plomberie', 'serrurerie'], ctaHint: 'numero_urgence_fetes' },
  { month: 12, day: 31, label: "Bilan de l'année — Merci à nos clients", tags: ['engagement'], relevanceDomains: ['habitat'], priorityScore: 70, contentTypeHint: 'engagement', preferredUniverses: ['general'], ctaHint: 'bilan_annuel' },
];

/**
 * Filtre les journées pertinentes pour un mois donné.
 * Retourne uniquement celles avec un score >= minScore.
 */
export function getAwarenessDaysForMonth(month: number, minScore = 60): AwarenessDay[] {
  return AWARENESS_DAYS
    .filter(d => d.month === month && d.priorityScore >= minScore)
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Score de pertinence pour une journée awareness.
 * Composantes binaires (0 ou max) :
 * - metier_direct (40) : tags contiennent un domaine métier core
 * - saison_coherente (20) : mois cohérent avec le tag
 * - potentiel_cta (20) : ctaHint non vide
 * - non_redondance (20) : pas de même tag dans les 21 jours précédents
 */
export function scoreAwarenessDay(
  day: AwarenessDay,
  recentTopicKeys: string[] = [],
): number {
  const CORE_DOMAINS = ['eau', 'energie', 'securite', 'habitat', 'entretien', 'renovation', 'urgence'];
  const metierDirect = day.tags.some(t => CORE_DOMAINS.includes(t)) ? 40 : 0;
  const saisonCoherente = day.relevanceDomains.length > 0 ? 20 : 0;
  const potentielCta = day.ctaHint ? 20 : 0;
  const nonRedondance = !recentTopicKeys.includes(day.label) ? 20 : 0;
  return metierDirect + saisonCoherente + potentielCta + nonRedondance;
}

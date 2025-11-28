// Configuration centralisée des textes d'aide pour les permissions
// Chaque scope a une description par niveau de permission (0-4)

export type PermissionLevel = 0 | 1 | 2 | 3 | 4;

export const PERMISSION_HELP_TEXTS: Record<string, Partial<Record<PermissionLevel, string>>> = {
  // ============ HELP ACADEMY ============
  apogee: {
    0: "Aucun accès au guide Apogée.",
    1: "Peut consulter le guide Apogée en lecture seule.",
    2: "Peut créer ou modifier des contenus dans le guide Apogée (articles, fiches…).",
    3: "Peut gérer tout le contenu du guide Apogée (publication, mise à jour, organisation).",
    4: "Peut administrer le module guide Apogée (structure, catégories, suppression globale).",
  },
  apporteurs: {
    0: "Aucun accès au guide Apporteurs.",
    1: "Peut consulter la documentation pour les apporteurs.",
    2: "Peut ajouter ou modifier des contenus liés aux apporteurs.",
    3: "Peut gérer et organiser l'ensemble du contenu du guide Apporteurs.",
    4: "Peut administrer le module (structure, catégories, nettoyage).",
  },
  helpconfort: {
    0: "Aucun accès au guide HelpConfort.",
    1: "Peut consulter le guide HelpConfort en lecture seule.",
    2: "Peut ajouter ou mettre à jour des contenus (dans son périmètre).",
    3: "Peut gérer tous les contenus du guide HelpConfort.",
    4: "Peut administrer le module (structure, suppression, ajustements globaux).",
  },
  documents: {
    0: "Aucun accès aux documents.",
    1: "Peut voir et télécharger les documents disponibles.",
    2: "Peut téléverser de nouveaux documents / mises à jour.",
    3: "Peut organiser les documents (dossiers, renommage, archivage).",
    4: "Peut administrer la base documentaire (suppression définitive, structure, règles).",
  },

  // ============ PILOTAGE AGENCE ============
  mes_indicateurs: {
    0: "Aucun accès aux indicateurs.",
    1: "Peut voir les indicateurs et graphiques de l'agence.",
    2: "Peut personnaliser ses vues / filtres d'indicateurs.",
    3: "Peut configurer et gérer les indicateurs pour l'agence (vues partagées).",
    4: "Peut administrer la configuration globale des KPI (sources, paramètres avancés).",
  },
  actions_a_mener: {
    0: "Aucun accès aux actions à mener.",
    1: "Peut voir les actions qui le concernent.",
    2: "Peut créer et modifier ses propres actions.",
    3: "Peut gérer les actions pour toute l'agence (créer, assigner, modifier).",
    4: "Peut administrer la configuration du module d'actions (types, règles automatiques).",
  },
  diffusion: {
    0: "Aucun accès au mode diffusion.",
    1: "Peut voir l'aperçu du mode diffusion.",
    2: "Peut ajuster ses préférences locales d'affichage.",
    3: "Peut gérer le contenu diffusé pour l'agence (slides, rotation, messages).",
    4: "Peut administrer la configuration globale de diffusion (templates, sources, règles).",
  },

  // ============ SUPPORT ============
  mes_demandes: {
    0: "Aucun accès au module Mes Demandes.",
    1: "Peut consulter ses demandes de support et les réponses.",
    2: "Peut créer des demandes, commenter et joindre des fichiers sur SES tickets.",
    3: "Peut intervenir sur les tickets du périmètre (réseau / agence).",
    4: "Peut administrer la configuration du module (catégories, SLA, règles).",
  },
  support_tickets: {
    0: "Aucun accès au module Support.",
    1: "Peut voir les tickets (selon périmètre).",
    2: "Peut créer et traiter les tickets qui lui sont assignés.",
    3: "Peut gérer tous les tickets (assigner, changer d'état, requalifier).",
    4: "Peut administrer le module support (catégories, files, niveaux, règles d'escalade).",
  },

  // ============ PILOTAGE FRANCHISEUR ============
  franchiseur_dashboard: {
    0: "Aucun accès au dashboard franchiseur.",
    1: "Peut consulter le dashboard réseau en lecture seule.",
    2: "Peut créer / ajuster ses vues personnelles.",
    3: "Peut gérer les vues partagées du dashboard réseau.",
    4: "Peut administrer les dashboards (sources, modèles, paramètres globaux).",
  },
  franchiseur_kpi: {
    0: "Aucun accès aux KPI réseau.",
    1: "Peut consulter les KPI réseau.",
    2: "Peut personnaliser ses tableaux et filtres personnels.",
    3: "Peut gérer les KPI et vues partagées au niveau réseau.",
    4: "Peut administrer la configuration KPI réseau (sources, indicateurs, structure).",
  },
  franchiseur_agencies: {
    0: "Aucun accès à la gestion des agences.",
    1: "Peut consulter la liste et les infos des agences.",
    2: "Peut modifier certaines informations opérationnelles des agences.",
    3: "Peut gérer les agences (rattachements, informations clé) sans en créer/supprimer.",
    4: "Peut créer/supprimer des agences, gérer structure et rattachements globaux.",
  },
  franchiseur_royalties: {
    0: "Aucun accès aux redevances.",
    1: "Peut consulter les redevances et leur historique.",
    2: "Peut ajouter des commentaires / pièces jointes aux redevances.",
    3: "Peut valider / corriger les redevances dans le cycle de gestion.",
    4: "Peut administrer barèmes et règles de calcul des redevances.",
  },

  // ============ ADMINISTRATION ============
  admin_users: {
    0: "Aucun accès à la gestion des utilisateurs.",
    1: "Peut consulter la liste des utilisateurs.",
    2: "Peut modifier certaines informations non sensibles (nom, agence).",
    3: "Peut gérer les groupes et rôles système des utilisateurs.",
    4: "Peut créer / supprimer des utilisateurs et gérer les accès globaux.",
  },
  admin_roles: {
    0: "Aucun accès à la gestion des rôles.",
    1: "Peut consulter les groupes et leurs permissions.",
    2: "Peut modifier des informations de groupe (libellé, description).",
    3: "Peut gérer les permissions des groupes (matrice de droits).",
    4: "Peut créer / supprimer des groupes, gérer les scopes et la structure globale.",
  },
  admin_backup: {
    0: "Aucun accès aux sauvegardes.",
    1: "Peut consulter la liste des sauvegardes.",
    2: "Peut lancer une sauvegarde manuelle.",
    3: "Peut restaurer une sauvegarde.",
    4: "Peut administrer la politique de sauvegarde (fréquence, rétention, purge).",
  },
  admin_settings: {
    0: "Aucun accès aux paramètres.",
    1: "Peut consulter les paramètres globaux.",
    2: "Peut modifier des paramètres non critiques (branding, textes).",
    3: "Peut modifier des paramètres agence / réseau / modules.",
    4: "Peut modifier les paramètres critiques (sécurité, intégrations, API, secrets).",
  },
};

/**
 * Récupère le texte d'aide pour un scope et niveau donnés
 * @param scopeSlug - Le slug du scope (ex: "apogee", "mes_indicateurs")
 * @param level - Le niveau de permission (0-4)
 * @returns Le texte d'aide spécifique ou un fallback générique
 */
export function getPermissionHelpText(scopeSlug: string, level: PermissionLevel): string {
  const scopeHelp = PERMISSION_HELP_TEXTS[scopeSlug];
  
  if (scopeHelp && scopeHelp[level] !== undefined) {
    return scopeHelp[level]!;
  }
  
  // Fallback générique si le scope n'est pas défini
  switch (level) {
    case 0:
      return "Aucun accès à ce module.";
    case 1:
      return "Peut consulter ce module en lecture seule.";
    case 2:
      return "Peut créer ou modifier des éléments dans ce module.";
    case 3:
      return "Peut gérer les éléments de ce module pour l'ensemble du périmètre.";
    case 4:
      return "Peut administrer ce module et ses paramètres.";
    default:
      return "";
  }
}

/**
 * Récupère le label du niveau de permission
 */
export function getPermissionLevelLabel(level: PermissionLevel): string {
  const labels: Record<PermissionLevel, string> = {
    0: "Aucun",
    1: "Lecture",
    2: "Écriture",
    3: "Gestion",
    4: "Admin",
  };
  return labels[level];
}

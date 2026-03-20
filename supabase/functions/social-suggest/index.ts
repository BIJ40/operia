/**
 * social-suggest — Edge Function pour générer des suggestions de posts social media.
 * V6 : Lead engine, localisation, scoring, urgency levels.
 * 
 * Conventions figées :
 * - Storage path : {agency_id}/{year}/{month}/{suggestion_id}/{filename}
 * - Univers normalisés : plomberie, electricite, serrurerie, vitrerie, menuiserie, renovation, volets, pmr, general
 * - Statuts : suggestion = validation éditoriale, variant = statut plateforme, calendar = exécution planning
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, getCorsHeaders } from '../_shared/cors.ts';
import { getUserContext, assertAgencyAccess } from '../_shared/auth.ts';
import { validateUUID } from '../_shared/validation.ts';
import { type HookEntry, type HookIntent, getFullHookLibrary, getSeasonFromMonth, getHooksForContext, buildHookLibraryPrompt } from '../_shared/hookLibrary.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// ─── Easter calculation (Meeus/Jones/Butcher algorithm) ───
function getEasterDate(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function addDays(m: number, d: number, offset: number): { month: number; day: number } {
  // Simple date offset using Date object
  const date = new Date(2026, m - 1, d + offset);
  return { month: date.getMonth() + 1, day: date.getDate() };
}

interface AwarenessDay {
  month: number;
  day: number;
  label: string;
  tags: string[];
  contentTypeHint: string;
  preferredUniverses: string[];
  ctaHint: string;
  /** 1=aucun lien métier (ignoré), 2=angle possible (optionnel), 3=lien direct métier */
  relevanceScore: 1 | 2 | 3;
  /** 1=inspiration/branding, 2=réflexion/amélioration, 3=urgence/besoin immédiat */
  intentScore: 1 | 2 | 3;
}

// ─── Build awareness days for a given year (dynamic Easter + fixed dates) ───
function buildAwarenessDays(year: number): AwarenessDay[] {
  const easter = getEasterDate(year);
  const easterMon = addDays(easter.month, easter.day, 1); // Lundi de Pâques
  const ascension = addDays(easter.month, easter.day, 39); // Ascension
  const pentecote = addDays(easter.month, easter.day, 50); // Lundi Pentecôte
  // Changement d'heure : dernier dimanche de mars / dernier dimanche d'octobre
  const lastSunMarch = 31 - new Date(year, 2, 31).getDay();
  const lastSunOct = 31 - new Date(year, 9, 31).getDay();

  return [
    // ════════════════ JANVIER ════════════════
    { month: 1, day: 1,  label: "🎉 Jour de l'An — bonnes résolutions habitat", tags: ["habitat","renovation","branding","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "devis_renovation", relevanceScore: 2, intentScore: 2 },
    { month: 1, day: 6,  label: "Épiphanie — et si on en profitait pour vérifier le chauffage ?", tags: ["entretien","plomberie","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["plomberie"], ctaHint: "entretien_chauffage", relevanceScore: 1, intentScore: 1 },
    { month: 1, day: 10, label: "Vague de froid — protéger ses canalisations du gel", tags: ["urgence","plomberie","hiver"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "urgence_gel", relevanceScore: 3, intentScore: 3 },
    { month: 1, day: 15, label: "⚠️ Prévention gel canalisations", tags: ["eau","urgence","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "urgence_gel", relevanceScore: 3, intentScore: 3 },
    { month: 1, day: 20, label: "Blue Monday — offrez-vous un intérieur qui fait du bien", tags: ["confort","renovation","lifestyle"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","electricite"], ctaHint: "ambiance_maison", relevanceScore: 1, intentScore: 1 },
    { month: 1, day: 24, label: "Soldes d'hiver — le bon moment pour rénover", tags: ["renovation","promo"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation"], ctaHint: "devis_renovation", relevanceScore: 2, intentScore: 2 },
    { month: 1, day: 27, label: "Vérification détecteurs de fumée", tags: ["securite","electricite"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_incendie", relevanceScore: 3, intentScore: 3 },

    // ════════════════ FÉVRIER ════════════════
    { month: 2, day: 2,  label: "🕯 Chandeleur — attention aux risques incendie en cuisine", tags: ["securite","electricite","fete"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_incendie", relevanceScore: 2, intentScore: 2 },
    { month: 2, day: 7,  label: "Journée sans téléphone — mais pas sans chauffage !", tags: ["confort","plomberie","decale"], contentTypeHint: "decale", preferredUniverses: ["plomberie"], ctaHint: "entretien_chauffage", relevanceScore: 1, intentScore: 1 },
    { month: 2, day: 10, label: "Journée mondiale de l'énergie — économies d'énergie", tags: ["energie","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","plomberie"], ctaHint: "audit_energetique", relevanceScore: 3, intentScore: 2 },
    { month: 2, day: 14, label: "💕 Saint-Valentin — créer une ambiance cocooning chez soi", tags: ["confort","habitat","lifestyle","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","electricite","general"], ctaHint: "ambiance_maison", relevanceScore: 1, intentScore: 1 },
    { month: 2, day: 20, label: "Fin d'hiver — bilan chauffage et préparation du printemps", tags: ["entretien","plomberie","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation"], ctaHint: "bilan_chauffage", relevanceScore: 3, intentScore: 2 },
    { month: 2, day: 25, label: "🎭 Carnaval — les déguisements de vos installations les plus insolites", tags: ["humour","engagement","decale"], contentTypeHint: "decale", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1 },

    // ════════════════ MARS ════════════════
    { month: 3, day: 3,  label: "Journée mondiale de la vie sauvage — protéger les oiseaux des vitrages", tags: ["vitrerie","environnement"], contentTypeHint: "pedagogique", preferredUniverses: ["vitrerie"], ctaHint: "remplacement_vitrage", relevanceScore: 2, intentScore: 2 },
    { month: 3, day: 8,  label: "👩 Journée des droits des femmes — nos techniciennes sur le terrain", tags: ["branding","engagement","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["general"], ctaHint: "recrutement", relevanceScore: 1, intentScore: 1 },
    { month: 3, day: 12, label: "Début du printemps — check-up plomberie & robinetterie", tags: ["entretien","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "entretien_printemps", relevanceScore: 3, intentScore: 2 },
    { month: 3, day: 17, label: "☘️ Saint-Patrick — la chance n'a rien à voir avec l'entretien", tags: ["humour","engagement","fete"], contentTypeHint: "decale", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1 },
    { month: 3, day: 20, label: "🌸 Équinoxe de printemps — préparez votre habitat", tags: ["habitat","renovation","entretien"], contentTypeHint: "prevention", preferredUniverses: ["renovation","plomberie","electricite"], ctaHint: "check_up_printemps", relevanceScore: 3, intentScore: 2 },
    { month: 3, day: 22, label: "💧 Journée mondiale de l'eau", tags: ["eau","plomberie","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["plomberie"], ctaHint: "diagnostic_fuite", relevanceScore: 3, intentScore: 3 },
    { month: 3, day: 25, label: "Semaine du développement durable — rénover éco-responsable", tags: ["energie","renovation","environnement"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation","electricite"], ctaHint: "renovation_ecologique", relevanceScore: 3, intentScore: 2 },
    { month: 3, day: lastSunMarch, label: "🕐 Changement d'heure (été) — reprogrammer volets & minuteries", tags: ["electricite","confort","volets"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","volets"], ctaHint: "programmateur_volets", relevanceScore: 3, intentScore: 2 },

    // ════════════════ AVRIL ════════════════
    { month: 4, day: 1,  label: "🐟 1er avril — les pannes les plus insolites de nos techniciens", tags: ["humour","engagement","branding","fete"], contentTypeHint: "decale", preferredUniverses: ["plomberie"], ctaHint: "engagement_communaute", relevanceScore: 2, intentScore: 1 },
    { month: 4, day: 7,  label: "🧹 Grand ménage de printemps — check-up complet maison", tags: ["entretien","habitat"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite","renovation"], ctaHint: "check_up_maison", relevanceScore: 3, intentScore: 2 },
    { month: 4, day: 11, label: "Journée mondiale Parkinson — adapter le logement PMR", tags: ["pmr","sante","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["pmr"], ctaHint: "adaptation_logement", relevanceScore: 3, intentScore: 2 },
    { month: 4, day: 15, label: "Préparer terrasse & extérieurs pour les beaux jours", tags: ["habitat","menuiserie","volets"], contentTypeHint: "pedagogique", preferredUniverses: ["menuiserie","volets","renovation"], ctaHint: "amenagement_exterieur", relevanceScore: 3, intentScore: 2 },
    { month: easter.month, day: easter.day, label: "🐣 Pâques — disponibilité urgence même les jours fériés", tags: ["urgence","branding","fete","paques"], contentTypeHint: "prevention", preferredUniverses: ["general","plomberie"], ctaHint: "dispo_jours_feries", relevanceScore: 2, intentScore: 2 },
    { month: easterMon.month, day: easterMon.day, label: "🐰 Lundi de Pâques — profitez du pont pour anticiper vos travaux", tags: ["renovation","habitat","weekend","fete","paques","pont"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation","menuiserie"], ctaHint: "anticipation_travaux", relevanceScore: 2, intentScore: 2 },
    { month: 4, day: 22, label: "🌍 Jour de la Terre — rénovation éco-responsable", tags: ["energie","renovation","environnement","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation"], ctaHint: "renovation_ecologique", relevanceScore: 3, intentScore: 2 },
    { month: 4, day: 28, label: "🔒 Journée sécurité au travail — sécurisez aussi votre maison", tags: ["securite","electricite","serrurerie","fete"], contentTypeHint: "prevention", preferredUniverses: ["electricite","serrurerie"], ctaHint: "diagnostic_securite", relevanceScore: 3, intentScore: 3 },

    // ════════════════ MAI ════════════════
    { month: 5, day: 1,  label: "🌷 Fête du travail — sécuriser sa maison pour le pont de mai", tags: ["securite","serrurerie","fete"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie"], ctaHint: "securisation_pont", relevanceScore: 3, intentScore: 3 },
    { month: 5, day: 4,  label: "Star Wars Day — que la force soit avec vos installations", tags: ["humour","engagement","decale"], contentTypeHint: "decale", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1 },
    { month: 5, day: 8,  label: "8 mai — pont = cambriolages : sécurisez vos accès", tags: ["securite","serrurerie","fete"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie"], ctaHint: "securisation_pont", relevanceScore: 3, intentScore: 3 },
    { month: 5, day: 10, label: "Entretien climatisation avant l'été", tags: ["entretien","confort"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite"], ctaHint: "entretien_clim", relevanceScore: 3, intentScore: 2 },
    { month: 5, day: 15, label: "🏠 Journée sans écran — redécouvrez votre maison (et ses défauts)", tags: ["habitat","renovation","decale"], contentTypeHint: "decale", preferredUniverses: ["renovation","general"], ctaHint: "devis_renovation", relevanceScore: 1, intentScore: 1 },
    { month: 5, day: 20, label: "Journée mondiale des abeilles — fenêtres avec moustiquaires", tags: ["vitrerie","environnement","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["vitrerie","menuiserie"], ctaHint: "moustiquaires", relevanceScore: 2, intentScore: 2 },
    { month: 5, day: 25, label: "Fête des mères — offrez du confort à la maison", tags: ["lifestyle","branding","confort","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["general","renovation"], ctaHint: "cadeau_confort", relevanceScore: 1, intentScore: 1 },
    { month: ascension.month, day: ascension.day, label: "🙏 Ascension — on reste disponible même les jours fériés", tags: ["branding","urgence","fete"], contentTypeHint: "prevention", preferredUniverses: ["general","plomberie","serrurerie"], ctaHint: "dispo_jours_feries", relevanceScore: 2, intentScore: 2 },
    { month: pentecote.month, day: pentecote.day, label: "Lundi de Pentecôte — dernier grand pont avant l'été", tags: ["securite","serrurerie","fete"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie","general"], ctaHint: "securisation_pont", relevanceScore: 2, intentScore: 2 },

    // ════════════════ JUIN ════════════════
    { month: 6, day: 1,  label: "Début météo d'été — préparer volets et stores", tags: ["confort","volets"], contentTypeHint: "prevention", preferredUniverses: ["volets"], ctaHint: "installation_volets", relevanceScore: 3, intentScore: 2 },
    { month: 6, day: 5,  label: "🌱 Journée de l'environnement — éco-gestes maison", tags: ["energie","habitat","environnement","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","plomberie"], ctaHint: "eco_gestes", relevanceScore: 3, intentScore: 2 },
    { month: 6, day: 10, label: "Semaine du vélo — mais qui sécurise votre garage ?", tags: ["serrurerie","securite","decale"], contentTypeHint: "decale", preferredUniverses: ["serrurerie","menuiserie"], ctaHint: "securisation_garage", relevanceScore: 1, intentScore: 1 },
    { month: 6, day: 15, label: "☀️ Premières chaleurs — fraîcheur & ventilation", tags: ["confort","urgence"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite","volets"], ctaHint: "installation_clim", relevanceScore: 3, intentScore: 3 },
    { month: 6, day: 15, label: "Fête des pères — un projet maison à deux ?", tags: ["lifestyle","branding","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["general","renovation","menuiserie"], ctaHint: "projet_maison", relevanceScore: 1, intentScore: 1 },
    { month: 6, day: 21, label: "🔒 Été = vacances : sécurisez avant de partir", tags: ["securite","serrurerie"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie"], ctaHint: "securisation_vacances", relevanceScore: 3, intentScore: 3 },
    { month: 6, day: 21, label: "☀️ Solstice d'été — protégez-vous de la chaleur", tags: ["confort","volets","habitat","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["volets","electricite"], ctaHint: "protection_chaleur", relevanceScore: 3, intentScore: 2 },
    { month: 6, day: 25, label: "🎵 Fête de la musique passée — vos volets tiennent le bruit ?", tags: ["volets","vitrerie","decale"], contentTypeHint: "decale", preferredUniverses: ["volets","vitrerie"], ctaHint: "isolation_phonique", relevanceScore: 2, intentScore: 2 },

    // ════════════════ JUILLET ════════════════
    { month: 7, day: 1,  label: "🏖 Départs en vacances — checklist sécurité maison", tags: ["securite","serrurerie","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie","plomberie"], ctaHint: "checklist_vacances", relevanceScore: 3, intentScore: 3 },
    { month: 7, day: 7,  label: "Canicule — les bons réflexes pour garder la fraîcheur", tags: ["confort","volets","electricite"], contentTypeHint: "prevention", preferredUniverses: ["volets","electricite"], ctaHint: "protection_chaleur", relevanceScore: 3, intentScore: 3 },
    { month: 7, day: 14, label: "🇫🇷 14 juillet — sécurité électrique pour les festivités", tags: ["securite","electricite","fete"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_electrique", relevanceScore: 2, intentScore: 2 },
    { month: 7, day: 20, label: "Stores & volets roulants contre la canicule", tags: ["confort","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["volets"], ctaHint: "installation_volets", relevanceScore: 3, intentScore: 2 },
    { month: 7, day: 25, label: "Vacances — comment couper l'eau en partant", tags: ["plomberie","prevention"], contentTypeHint: "pedagogique", preferredUniverses: ["plomberie"], ctaHint: "prevention_degat_eaux", relevanceScore: 3, intentScore: 2 },

    // ════════════════ AOÛT ════════════════
    { month: 8, day: 1,  label: "🚨 Urgences estivales — Help Confort reste ouvert", tags: ["urgence","plomberie","serrurerie","branding"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","serrurerie"], ctaHint: "numero_urgence", relevanceScore: 3, intentScore: 3 },
    { month: 8, day: 8,  label: "Journée mondiale du chat — protéger vos moustiquaires", tags: ["vitrerie","humour","decale","fete"], contentTypeHint: "decale", preferredUniverses: ["vitrerie"], ctaHint: "reparation_moustiquaire", relevanceScore: 1, intentScore: 1 },
    { month: 8, day: 15, label: "🌅 15 août — Assomption — pensez à vos projets de rentrée", tags: ["renovation","habitat","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "projet_rentree", relevanceScore: 2, intentScore: 2 },
    { month: 8, day: 20, label: "Fin des vacances — dégâts des eaux pendant l'absence ?", tags: ["urgence","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "diagnostic_retour", relevanceScore: 3, intentScore: 3 },
    { month: 8, day: 25, label: "📚 Rentrée approche — préparer la maison pour la famille", tags: ["entretien","habitat","famille"], contentTypeHint: "prevention", preferredUniverses: ["renovation","general","electricite"], ctaHint: "preparation_rentree", relevanceScore: 3, intentScore: 2 },

    // ════════════════ SEPTEMBRE ════════════════
    { month: 9, day: 1,  label: "📚 Rentrée — révision chauffage avant l'hiver", tags: ["entretien","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "revision_chauffage", relevanceScore: 3, intentScore: 2 },
    { month: 9, day: 7,  label: "Semaine de la mobilité — accessibilité du logement", tags: ["pmr","habitat","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["pmr"], ctaHint: "adaptation_logement", relevanceScore: 3, intentScore: 2 },
    { month: 9, day: 15, label: "⚡ Rentrée — vérifier tableau électrique & prises", tags: ["securite","electricite"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "diagnostic_electrique", relevanceScore: 3, intentScore: 3 },
    { month: 9, day: 20, label: "Journées du patrimoine — entretenir c'est préserver", tags: ["pedagogique","habitat","branding","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation","menuiserie"], ctaHint: "entretien_patrimoine", relevanceScore: 2, intentScore: 2 },
    { month: 9, day: 22, label: "🍂 Équinoxe d'automne — préparer sa maison pour l'hiver", tags: ["entretien","habitat","energie","fete"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation","volets"], ctaHint: "preparation_hiver", relevanceScore: 3, intentScore: 2 },
    { month: 9, day: 26, label: "Journée européenne des langues — Help Confort parle votre langue", tags: ["branding","proximite","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["general"], ctaHint: "branding_proximite", relevanceScore: 1, intentScore: 1 },

    // ════════════════ OCTOBRE ════════════════
    { month: 10, day: 1,  label: "🧥 Anticiper l'hiver — isolation & chauffage", tags: ["entretien","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation"], ctaHint: "preparation_hiver", relevanceScore: 3, intentScore: 2 },
    { month: 10, day: 4,  label: "Journée mondiale des animaux — sécuriser vos installations", tags: ["securite","humour","fete"], contentTypeHint: "decale", preferredUniverses: ["electricite","vitrerie"], ctaHint: "securisation_maison", relevanceScore: 1, intentScore: 1 },
    { month: 10, day: 10, label: "Journée de la santé mentale — un logement sain pour se sentir bien", tags: ["confort","habitat","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "renovation_confort", relevanceScore: 2, intentScore: 2 },
    { month: 10, day: 13, label: "Journée prévention catastrophes naturelles", tags: ["securite","urgence","fete"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite"], ctaHint: "prevention_degats_eaux", relevanceScore: 3, intentScore: 3 },
    { month: 10, day: 20, label: "Semaine du goût — un robinet qui fuit gâche le goût de l'eau", tags: ["plomberie","decale","fete"], contentTypeHint: "decale", preferredUniverses: ["plomberie"], ctaHint: "reparation_robinet", relevanceScore: 2, intentScore: 2 },
    { month: 10, day: lastSunOct, label: "🕐 Changement d'heure (hiver) — reprogrammer volets & minuteries", tags: ["electricite","volets","confort"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","volets"], ctaHint: "programmateur_volets", relevanceScore: 3, intentScore: 2 },
    { month: 10, day: 31, label: "🎃 Halloween — les pannes qui font (vraiment) peur", tags: ["humour","engagement","fete"], contentTypeHint: "decale", preferredUniverses: ["general","electricite"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1 },

    // ════════════════ NOVEMBRE ════════════════
    { month: 11, day: 1,  label: "🕯 Toussaint — purge radiateurs avant le grand froid", tags: ["entretien","plomberie","fete"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "purge_radiateurs", relevanceScore: 3, intentScore: 2 },
    { month: 11, day: 8,  label: "Semaine de la qualité de l'air — ventilation et aération", tags: ["sante","habitat","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","renovation"], ctaHint: "ventilation", relevanceScore: 3, intentScore: 2 },
    { month: 11, day: 11, label: "11 novembre — pont = vérifier serrures & accès", tags: ["securite","serrurerie","fete"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie"], ctaHint: "securisation_pont", relevanceScore: 3, intentScore: 3 },
    { month: 11, day: 15, label: "♿ Journée accessibilité — adaptation PMR du logement", tags: ["pmr","habitat","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["pmr"], ctaHint: "adaptation_logement", relevanceScore: 3, intentScore: 2 },
    { month: 11, day: 19, label: "Journée mondiale des toilettes — entretien WC et sanitaires", tags: ["plomberie","humour","fete"], contentTypeHint: "decale", preferredUniverses: ["plomberie"], ctaHint: "reparation_wc", relevanceScore: 3, intentScore: 2 },
    { month: 11, day: 24, label: "🛒 Black Friday — c'est le moment de planifier vos travaux", tags: ["renovation","habitat","promotion","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "devis_travaux", relevanceScore: 2, intentScore: 2 },
    { month: 11, day: 28, label: "Préparer les illuminations de Noël en toute sécurité", tags: ["securite","electricite","noel"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_electrique_noel", relevanceScore: 3, intentScore: 3 },

    // ════════════════ DÉCEMBRE ════════════════
    { month: 12, day: 1,  label: "❄️ Risques gel canalisations — protégez vos tuyaux", tags: ["urgence","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "prevention_gel", relevanceScore: 3, intentScore: 3 },
    { month: 12, day: 5,  label: "🎅 Saint-Nicolas — l'hiver s'installe, vérifiez le chauffage", tags: ["entretien","plomberie","fete"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "entretien_chauffage", relevanceScore: 2, intentScore: 2 },
    { month: 12, day: 10, label: "🎄 Sécurité électrique pour les illuminations de Noël", tags: ["securite","electricite","fete"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_electrique_noel", relevanceScore: 3, intentScore: 3 },
    { month: 12, day: 15, label: "Achats de Noël — et si le vrai cadeau c'était la rénovation ?", tags: ["renovation","lifestyle","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "devis_travaux", relevanceScore: 1, intentScore: 1 },
    { month: 12, day: 21, label: "Solstice d'hiver — vérifiez isolation & chauffage", tags: ["energie","entretien","plomberie","fete"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation"], ctaHint: "isolation_hiver", relevanceScore: 3, intentScore: 2 },
    { month: 12, day: 25, label: "🎅 Joyeux Noël — Help Confort à vos côtés toute l'année", tags: ["branding","engagement","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["general"], ctaHint: "branding_fetes", relevanceScore: 1, intentScore: 1 },
    { month: 12, day: 28, label: "Bilan de fin d'année — les pannes les plus fréquentes", tags: ["branding","pedagogique"], contentTypeHint: "pedagogique", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 2, intentScore: 2 },
    { month: 12, day: 31, label: "🥂 Réveillon — bilan & projets habitat pour la nouvelle année", tags: ["branding","habitat","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["general","renovation"], ctaHint: "projets_nouvelle_annee", relevanceScore: 1, intentScore: 1 },
  ];
}

// Pre-compute for current year (edge function context)
const AWARENESS_DAYS = buildAwarenessDays(new Date().getFullYear());

const NORMALIZED_UNIVERSES = ['plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie', 'renovation', 'volets', 'pmr', 'general'] as const;
const VALID_PLATFORMS = ['facebook', 'instagram', 'google_business', 'linkedin'] as const;
const VALID_TOPIC_TYPES = ['awareness_day', 'seasonal_tip', 'realisation', 'local_branding', 'educational'] as const;
const VALID_LEAD_TYPES = ['urgence', 'prevention', 'amelioration', 'preuve_sociale', 'saisonnier'] as const;
const VALID_TARGET_INTENTS = ['besoin_immediat', 'besoin_latent', 'curiosite', 'education'] as const;
const VALID_URGENCY_LEVELS = ['low', 'medium', 'high'] as const;

// ─── Post category rotation for fallback slots (score 1 events replaced) ───
const POST_CATEGORIES_ROTATION = [
  'urgence',        // fuite, panne, casse, sécurité
  'entretien',      // prévention, anticiper
  'amelioration',   // confort, esthétique, valorisation
  'saisonnalite',   // météo réelle, période
  'conseil',        // tips concrets
  'preuve',         // intervention rapide, expertise, local
] as const;

// ─── Blacklist: forbidden theme associations ───
const FORBIDDEN_THEME_ASSOCIATIONS = [
  'Pâques = travaux',
  'Noël = rénovation',
  'Carnaval = bricolage',
  'Saint-Valentin = plomberie',
  'Halloween = rénovation',
  'Épiphanie = chauffage',
  'Star Wars = installations',
  'Fête des mères = confort maison',
  'Fête des pères = projet maison',
  'Saint-Patrick = entretien',
];

// ─── Hook library imported from _shared/hookLibrary.ts ───
// (120+ seed hooks + pattern multiplicateur = 1000+ hooks)

// ─── Universe keyword inference ───
const UNIVERSE_KEYWORDS: Record<string, string[]> = {
  plomberie: ['plomberie', 'fuite', 'canalisation', 'robinet', 'chauffe-eau', 'ballon', 'wc', 'sanitaire', 'radiateur', 'chauffage'],
  electricite: ['électricité', 'electrique', 'prise', 'tableau', 'disjoncteur', 'éclairage', 'interrupteur'],
  serrurerie: ['serrurerie', 'serrure', 'porte', 'blindage', 'verrou', 'cylindre'],
  vitrerie: ['vitrerie', 'vitre', 'vitrage', 'fenêtre', 'double vitrage'],
  menuiserie: ['menuiserie', 'bois', 'parquet', 'placard'],
  renovation: ['rénovation', 'renovation', 'travaux', 'salle de bain', 'cuisine', 'carrelage', 'peinture'],
  volets: ['volet', 'store', 'volet roulant', 'motorisation'],
  pmr: ['pmr', 'accessibilité', 'handicap', 'douche italienne'],
};

function inferUniverse(title: string): string | null {
  const norm = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let best: string | null = null;
  let bestScore = 0;
  for (const [uni, kws] of Object.entries(UNIVERSE_KEYWORDS)) {
    let score = 0;
    for (const kw of kws) {
      if (norm.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) score++;
    }
    if (score > bestScore) { bestScore = score; best = uni; }
  }
  return best;
}

// ─── Post-AI validation ───
interface ValidatedSuggestion {
  suggestion_date: string;
  title: string;
  hook: string;
  content_angle: string | null;
  caption_base_fr: string;
  cta: string;
  hashtags: string[];
  topic_type: string;
  topic_key: string;
  visual_type: string;
  universe: string;
  realisation_id: string | null;
  storytelling_type: string | null;
  emotional_trigger: string | null;
  visual_strategy: string | null;
  visual_prompt: string | null;
  visual_composition: string | null;
  branding_guidelines: string | null;
  lead_score: number;
  lead_type: string | null;
  urgency_level: string;
  target_intent: string | null;
  platform_variants: Record<string, { caption: string; cta: string | null }>;
}

function validateAndNormalizeSuggestions(
  raw: any[],
  month: number,
  year: number,
  exploitableReals: { id: string }[],
  existingTopicKeys: Set<string>,
): ValidatedSuggestion[] {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const validRealisationIds = new Set(exploitableReals.map(r => r.id));
  const seenTopicKeys = new Set<string>();
  const result: ValidatedSuggestion[] = [];

  for (const s of raw) {
    if (!s || typeof s !== 'object') continue;

    // 1. Validate date
    let date = String(s.suggestion_date || '');
    if (!date.startsWith(monthKey)) {
      const day = Math.min(Math.max(parseInt(date.split('-')[2]) || 15, 1), daysInMonth);
      date = `${monthKey}-${String(day).padStart(2, '0')}`;
    }
    const dayNum = parseInt(date.split('-')[2]);
    if (dayNum < 1 || dayNum > daysInMonth) date = `${monthKey}-15`;

    // 2. topic_type
    const topicType = (VALID_TOPIC_TYPES as readonly string[]).includes(s.topic_type) ? s.topic_type : 'seasonal_tip';

    // 3. topic_key dedup
    const topicKey = String(s.topic_key || `${topicType}_${date}`);
    if (seenTopicKeys.has(topicKey) || existingTopicKeys.has(topicKey)) continue;
    seenTopicKeys.add(topicKey);

    // 4. universe — enforce from awareness day if matching
    let universe = (NORMALIZED_UNIVERSES as readonly string[]).includes(s.universe) ? s.universe : 'general';
    const actualDay = parseInt(date.split('-')[2]);
    const matchingAwareness = AWARENESS_DAYS.find(a => a.month === month && a.day === actualDay);
    if (matchingAwareness && matchingAwareness.preferredUniverses.length > 0) {
      const preferredUni = matchingAwareness.preferredUniverses[0];
      if ((NORMALIZED_UNIVERSES as readonly string[]).includes(preferredUni)) {
        universe = preferredUni; // Force the calendar event's preferred universe
      }
    }

    // 5. realisation_id
    let realisationId: string | null = null;
    if (topicType === 'realisation' && s.realisation_id && validRealisationIds.has(s.realisation_id)) {
      realisationId = s.realisation_id;
    }

    // 6. caption
    const captionBase = String(s.caption_base_fr || '').substring(0, 2000);
    if (captionBase.length < 10) continue;

    // 7. title
    const title = String(s.title || '').substring(0, 200);
    if (title.length < 3) continue;

    // 8. hashtags
    const hashtags = Array.isArray(s.hashtags)
      ? s.hashtags.filter((h: any) => typeof h === 'string' && h.length > 0).slice(0, 10)
      : [];

    // 9. platform variants
    const platformVariants: Record<string, { caption: string; cta: string | null }> = {};
    const rawVariants = s.platform_variants || {};
    for (const p of VALID_PLATFORMS) {
      const v = rawVariants[p];
      if (v && typeof v === 'object') {
        platformVariants[p] = {
          caption: String(v.caption || captionBase).substring(0, 2000),
          cta: v.cta ? String(v.cta).substring(0, 200) : null,
        };
      }
    }

    // 10. V5 fields
    const hook = String(s.hook || '').substring(0, 500) || title;
    const cta = String(s.cta || 'Contactez-nous').substring(0, 200);
    const storytellingType = s.storytelling_type ? String(s.storytelling_type).substring(0, 50) : null;
    const emotionalTrigger = s.emotional_trigger ? String(s.emotional_trigger).substring(0, 50) : null;
    const visualStrategy = s.visual_strategy ? String(s.visual_strategy).substring(0, 50) : null;
    const visualPrompt = s.visual_prompt ? String(s.visual_prompt).substring(0, 1000) : null;
    const visualComposition = s.visual_composition ? String(s.visual_composition).substring(0, 500) : null;
    const brandingGuidelines = s.branding_guidelines ? String(s.branding_guidelines).substring(0, 500) : null;

    // 11. V6 lead engine fields
    const leadScore = Math.min(100, Math.max(0, Number(s.lead_score) || 50));
    const leadType = (VALID_LEAD_TYPES as readonly string[]).includes(s.lead_type) ? s.lead_type : null;
    const urgencyLevel = (VALID_URGENCY_LEVELS as readonly string[]).includes(s.urgency_level) ? s.urgency_level : 'medium';
    const targetIntent = (VALID_TARGET_INTENTS as readonly string[]).includes(s.target_intent) ? s.target_intent : null;

    result.push({
      suggestion_date: date,
      title,
      hook,
      content_angle: s.content_angle ? String(s.content_angle).substring(0, 500) : null,
      caption_base_fr: captionBase,
      cta,
      hashtags,
      topic_type: topicType,
      topic_key: topicKey,
      visual_type: s.visual_type || 'photo',
      universe,
      realisation_id: realisationId,
      storytelling_type: storytellingType,
      emotional_trigger: emotionalTrigger,
      visual_strategy: visualStrategy,
      visual_prompt: visualPrompt,
      visual_composition: visualComposition,
      branding_guidelines: brandingGuidelines,
      lead_score: leadScore,
      lead_type: leadType,
      urgency_level: urgencyLevel,
      target_intent: targetIntent,
      platform_variants: platformVariants,
    });
  }

  // Anti-repetition: no 2 consecutive same universe
  for (let i = 1; i < result.length; i++) {
    if (result[i].universe === result[i - 1].universe && result[i].universe !== 'general') {
      for (let j = i + 1; j < result.length; j++) {
        if (result[j].universe !== result[i].universe) {
          [result[i], result[j]] = [result[j], result[i]];
          break;
        }
      }
    }
  }

  return result;
}

// ─── AI tool schema ───
const SUGGEST_TOOL = {
  type: 'function' as const,
  function: {
    name: 'generate_social_suggestions',
    description: 'Génère des suggestions de posts social media premium orientés conversion et leads pour le mois cible.',
    parameters: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              suggestion_date: { type: 'string', description: 'Date YYYY-MM-DD dans le mois cible' },
              title: { type: 'string', description: 'Titre court et accrocheur (max 200 car.)' },
              hook: { type: 'string', description: "Première ligne STOP-SCROLL : choc, curiosité, problème concret. Ex: \"Cette fuite coûtait 300€/mois sans que le client s'en rende compte.\"" },
              content_angle: { type: 'string', description: 'Angle éditorial en 1 phrase' },
              caption_base_fr: { type: 'string', description: 'Texte complet du post : hook + storytelling (situation → problème → intervention → résultat) + CTA. Publiable sans modification.' },
              cta: { type: 'string', description: "CTA court et GÉNÉRIQUE (jamais de nom de ville). Ex: \"Prendre RDV\", \"En savoir plus\", \"Demander un devis\", \"Nous contacter\"" },
              hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags (max 10)' },
              topic_type: { type: 'string', enum: ['awareness_day', 'seasonal_tip', 'realisation', 'local_branding', 'educational'] },
              topic_key: { type: 'string', description: 'Identifiant unique du sujet' },
              visual_type: { type: 'string', enum: ['photo', 'illustration', 'before_after', 'quote'] },
              universe: { type: 'string', enum: ['plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie', 'renovation', 'volets', 'pmr', 'general'] },
              realisation_id: { type: 'string', description: 'UUID de la réalisation liée ou null' },
              storytelling_type: { type: 'string', enum: ['situation_probleme_solution', 'avant_apres', 'temoignage_client', 'conseil_expert', 'prevention_urgence', 'proximite_locale'] },
              emotional_trigger: { type: 'string', enum: ['securite', 'economie', 'confort', 'tranquillite', 'urgence', 'confiance'] },
              visual_strategy: { type: 'string', enum: ['photo_realisation', 'illustration_generee', 'photo_stock_contextualisee', 'visuel_typo_only'] },
              visual_prompt: { type: 'string', description: "Prompt descriptif pour générer le visuel. Réaliste, précis, orienté habitat français. Ex: \"Modern French bathroom with water leak under sink, realistic lighting\"" },
              visual_composition: { type: 'string', description: "Placement : image, titre, branding. Ex: \"Image en fond, titre en haut, bandeau marque en bas\"" },
              branding_guidelines: { type: 'string', description: "Directives branding : couleur univers, style. Ex: \"Bleu plomberie #2D8BC9, bandeau HelpConfort en bas\"" },
              lead_score: { type: 'number', description: 'Score lead 0-100. >80=fort potentiel, 60-80=bon, <60=faible. Basé sur urgence, clarté besoin, force hook, qualité CTA.' },
              lead_type: { type: 'string', enum: ['urgence', 'prevention', 'amelioration', 'preuve_sociale', 'saisonnier'], description: 'Type de lead visé' },
              urgency_level: { type: 'string', enum: ['low', 'medium', 'high'], description: 'high=problème critique, medium=amélioration, low=conseil' },
              target_intent: { type: 'string', enum: ['besoin_immediat', 'besoin_latent', 'curiosite', 'education'], description: "Intention client ciblée" },
              platform_variants: {
                type: 'object',
                properties: {
                  facebook: { type: 'object', properties: { caption: { type: 'string' }, cta: { type: 'string' } }, required: ['caption'] },
                  instagram: { type: 'object', properties: { caption: { type: 'string' }, cta: { type: 'string' } }, required: ['caption'] },
                  google_business: { type: 'object', properties: { caption: { type: 'string' }, cta: { type: 'string' } }, required: ['caption'] },
                  linkedin: { type: 'object', properties: { caption: { type: 'string' }, cta: { type: 'string' } }, required: ['caption'] },
                },
              },
            },
            required: ['suggestion_date', 'title', 'hook', 'caption_base_fr', 'cta', 'topic_type', 'topic_key', 'universe', 'storytelling_type', 'emotional_trigger', 'visual_strategy', 'visual_prompt', 'lead_score', 'lead_type', 'urgency_level', 'target_intent'],
            additionalProperties: false,
          },
        },
      },
      required: ['suggestions'],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = getCorsHeaders(origin);

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authResult = await getUserContext(req);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { context, supabase: userSupabase } = authResult;

    const body = await req.json();
    const month = Number(body.month);
    const year = Number(body.year);
    const agencyId = body.agency_id ? validateUUID(body.agency_id, 'agency_id') : context.agencyId;
    const regenerateSingle = body.regenerate_single === true;
    const singleSuggestionId = body.suggestion_id || null;
    const userPromptParams = body.prompt || null;
    const targetDates: string[] = Array.isArray(body.target_dates) ? body.target_dates : [];

    const isTargetDatesMode = targetDates.length > 0 && !regenerateSingle;
    const rateLimitKey = regenerateSingle
      ? `social-suggest:single:${context.userId}:${singleSuggestionId || 'unknown'}`
      : isTargetDatesMode
        ? `social-suggest:dates:${context.userId}:${agencyId || 'unknown'}:${targetDates.join(',')}`
        : `social-suggest:month:${context.userId}:${agencyId || 'unknown'}:${year}-${String(month).padStart(2, '0')}`;
    const rlResult = await checkRateLimit(rateLimitKey, regenerateSingle || isTargetDatesMode
      ? { limit: 6, windowMs: 10 * 60_000 }
      : { limit: 2, windowMs: 10 * 60_000 });
    if (!rlResult.allowed) {
      return rateLimitResponse(rlResult.retryAfter!, corsHeaders);
    }


    if (!agencyId) {
      return new Response(JSON.stringify({ error: 'agency_id requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (month < 1 || month > 12 || year < 2020 || year > 2030) {
      return new Response(JSON.stringify({ error: 'month/year invalides' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessCheck = assertAgencyAccess(context, agencyId);
    if (!accessCheck.allowed) {
      return new Response(JSON.stringify({ error: accessCheck.error }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // ─── Load context data ───────────────────────────
    // ─── Filter awareness days by relevance ───
    const allMonthAwareness = AWARENESS_DAYS.filter(d => d.month === month);
    // Score 3 = direct link (always included), Score 2 = optional (included but marked optional), Score 1 = ignored (replaced by fallback)
    const monthAwareness = allMonthAwareness.filter(d => d.relevanceScore >= 2);
    const pertinentEvents = allMonthAwareness.filter(d => d.relevanceScore === 3);
    const optionalEvents = allMonthAwareness.filter(d => d.relevanceScore === 2);
    const ignoredEvents = allMonthAwareness.filter(d => d.relevanceScore === 1);
    
    // Build fallback rotation for ignored event slots
    const fallbackSlots = ignoredEvents.map((e, i) => ({
      day: e.day,
      category: POST_CATEGORIES_ROTATION[i % POST_CATEGORIES_ROTATION.length],
    }));
    
    console.log(`[social-suggest] Month ${month}: ${pertinentEvents.length} pertinent, ${optionalEvents.length} optional, ${ignoredEvents.length} ignored → ${fallbackSlots.length} fallback slots`);

    // Load agency info for localization
    const { data: agency } = await adminSupabase
      .from('apogee_agencies')
      .select('label, ville, code_postal')
      .eq('id', agencyId)
      .single();

    const agencyName = agency?.label || 'Help Confort';
    const agencyCity = agency?.ville || '';
    // Force "Landes & Pays Basque" — never use "Dax" alone
    const agencyZone = 'Landes & Pays Basque';

    // Realisations with media
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data: realisations } = await adminSupabase
      .from('realisations')
      .select('id, title, intervention_date')
      .eq('agency_id', agencyId)
      .gte('intervention_date', sixMonthsAgo.toISOString().split('T')[0])
      .order('intervention_date', { ascending: false })
      .limit(20);

    const realisationIds = (realisations || []).map(r => r.id);
    let realisationMedia: Record<string, { before: boolean; after: boolean; count: number }> = {};

    if (realisationIds.length > 0) {
      const { data: media } = await adminSupabase
        .from('realisation_media')
        .select('realisation_id, media_role')
        .in('realisation_id', realisationIds);

      for (const m of media || []) {
        const entry = realisationMedia[m.realisation_id] || { before: false, after: false, count: 0 };
        entry.count++;
        if (m.media_role === 'before') entry.before = true;
        if (m.media_role === 'after') entry.after = true;
        realisationMedia[m.realisation_id] = entry;
      }
    }

    const exploitableReals = (realisations || [])
      .filter(r => {
        const mp = realisationMedia[r.id];
        return mp && mp.count > 0;
      })
      .map(r => ({
        id: r.id,
        title: r.title,
        intervention_date: r.intervention_date,
        universe: inferUniverse(r.title),
        hasBeforeAfter: realisationMedia[r.id]?.before && realisationMedia[r.id]?.after,
      }));

    // 3. Existing suggestions for anti-duplication
    const { data: existingSuggestions } = await adminSupabase
      .from('social_content_suggestions')
      .select('id, topic_key, topic_type, status, realisation_id, suggestion_date, universe')
      .eq('agency_id', agencyId)
      .eq('month_key', monthKey);

    // Calendar protection
    const protectedSuggestionIds = new Set<string>();
    const { data: calendarEntries } = await adminSupabase
      .from('social_calendar_entries')
      .select('suggestion_id, status')
      .eq('agency_id', agencyId)
      .in('status', ['scheduled', 'published']);

    for (const ce of calendarEntries || []) {
      if (ce.suggestion_id) protectedSuggestionIds.add(ce.suggestion_id);
    }

    const existingTopicKeys = new Set(
      (existingSuggestions || [])
        .filter(s => s.status === 'approved' || protectedSuggestionIds.has(s.id))
        .map(s => s.topic_key)
        .filter(Boolean) as string[]
    );

    // ─── Cross-month 21-day gap detection ───────────────
    // Load last 21 days of previous month's suggestions to avoid near-duplicates
    const prevMonthDate = new Date(year, month - 2, 1); // month-1 in 0-based, then -1 more
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const daysInPrevMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
    const cutoffDay = daysInPrevMonth - 21; // only last 21 days of prev month

    const { data: prevMonthSuggestions } = await adminSupabase
      .from('social_content_suggestions')
      .select('topic_key, universe, suggestion_date')
      .eq('agency_id', agencyId)
      .eq('month_key', prevMonthKey)
      .in('status', ['draft', 'approved']);

    const recentPrevUniverses: { universe: string; date: string }[] = [];
    for (const s of prevMonthSuggestions || []) {
      const dayOfMonth = parseInt((s.suggestion_date || '').split('-')[2]);
      if (dayOfMonth >= cutoffDay && s.universe) {
        recentPrevUniverses.push({ universe: s.universe, date: s.suggestion_date });
      }
    }

    // Build a string for the AI prompt with recent themes to avoid
    const recentThemesWarning = recentPrevUniverses.length > 0
      ? `\n\nTHÈMES RÉCENTS DU MOIS PRÉCÉDENT (à espacer d'au moins 21 jours) :\n${recentPrevUniverses.map(r => `- ${r.date}: univers "${r.universe}"`).join('\n')}\nSi un univers apparaît ici, NE PAS le réutiliser dans les 21 premiers jours du mois cible.`
      : '';

    // ─── Regeneration logic ──────────────────────────
    let singleContext: any = null;
    if (regenerateSingle && singleSuggestionId) {
      if (protectedSuggestionIds.has(singleSuggestionId)) {
        return new Response(JSON.stringify({ error: 'Cette suggestion est liée à une publication planifiée ou publiée et ne peut pas être régénérée.' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const originalSuggestion = (existingSuggestions || []).find(s => s.id === singleSuggestionId);

      await adminSupabase
        .from('social_content_suggestions')
        .update({ status: 'archived' })
        .eq('id', singleSuggestionId)
        .eq('agency_id', agencyId)
        .in('status', ['draft', 'rejected']);

      await adminSupabase
        .from('social_post_variants')
        .update({ status: 'archived' })
        .eq('suggestion_id', singleSuggestionId)
        .eq('agency_id', agencyId);

      singleContext = originalSuggestion ? {
        original_date: originalSuggestion.suggestion_date,
        original_topic_type: originalSuggestion.topic_type,
        original_universe: originalSuggestion.universe,
        original_realisation_id: originalSuggestion.realisation_id,
      } : null;
    } else if (isTargetDatesMode) {
      // Archive only suggestions on the selected dates
      const toArchiveIds = (existingSuggestions || [])
        .filter(s => targetDates.includes(s.suggestion_date) && (s.status === 'draft' || s.status === 'rejected') && !protectedSuggestionIds.has(s.id))
        .map(s => s.id);

      if (toArchiveIds.length > 0) {
        await adminSupabase
          .from('social_content_suggestions')
          .update({ status: 'archived' })
          .in('id', toArchiveIds)
          .eq('agency_id', agencyId);

        await adminSupabase
          .from('social_post_variants')
          .update({ status: 'archived' })
          .in('suggestion_id', toArchiveIds)
          .eq('agency_id', agencyId);
      }
      console.log(`[social-suggest] Target dates mode: ${targetDates.length} dates, archived ${toArchiveIds.length} suggestions`);
    } else {
      const toArchiveIds = (existingSuggestions || [])
        .filter(s => (s.status === 'draft' || s.status === 'rejected') && !protectedSuggestionIds.has(s.id))
        .map(s => s.id);

      if (toArchiveIds.length > 0) {
        await adminSupabase
          .from('social_content_suggestions')
          .update({ status: 'archived' })
          .in('id', toArchiveIds)
          .eq('agency_id', agencyId);

        await adminSupabase
          .from('social_post_variants')
          .update({ status: 'archived' })
          .in('suggestion_id', toArchiveIds)
          .eq('agency_id', agencyId);
      }
    }

    const approvedCount = (existingSuggestions || []).filter(s => s.status === 'approved' || protectedSuggestionIds.has(s.id)).length;
    const targetPostCount = regenerateSingle ? 1 : isTargetDatesMode ? targetDates.length : Math.max(8, 20 - approvedCount);

    // ─── AI Generation ──────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Service IA non configuré' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build hook library for the current month's season (1000+ hooks)
    const currentSeason = getSeasonFromMonth(month);
    const hookLibraryPrompt = buildHookLibraryPrompt(month);
    const totalHooks = getFullHookLibrary().length;
    console.log(`[social-suggest] Hook library: ${totalHooks} hooks available, season: ${currentSeason}`);

    const systemPrompt = `Tu es un copywriter expert conversion locale pour HelpConfort (dépannage & rénovation habitat).

Tu produis des posts social media qui GÉNÈRENT DES ACTIONS (appels, devis, contacts).
Un post qui ne peut pas déclencher d'action est considéré comme MAUVAIS.

═══════════════════════════════════════════
FILTRE DE PERTINENCE (RÈGLE N°1)
═══════════════════════════════════════════
Pour chaque événement ou angle, pose-toi LA question :
"Y a-t-il un lien DIRECT, UTILE ou STRATÉGIQUE avec l'habitat, le dépannage ou la rénovation ?"

SI NON → ignore l'événement → génère un post métier classique performant à la place.
SI FAIBLEMENT → l'événement est OPTIONNEL. Utilise-le UNIQUEMENT si l'angle est naturel et crédible.
SI OUI → utilise-le comme PRÉTEXTE pour un vrai problème métier.

Un événement NE PEUT être utilisé QUE s'il :
- permet un angle crédible
- renforce le message métier
- ne paraît pas forcé

ASSOCIATIONS INTERDITES (BLACKLIST) :
${FORBIDDEN_THEME_ASSOCIATIONS.map(a => `- ${a}`).join('\n')}
Toute analogie faible, contenu forcé ou phrase marketing creuse = REJETÉ.

═══════════════════════════════════════════
6 CATÉGORIES DE POSTS AUTORISÉES
═══════════════════════════════════════════
Chaque post DOIT appartenir à UNE de ces catégories :

1. URGENCE / PROBLÈME — fuite, panne, casse, sécurité
2. ENTRETIEN / PRÉVENTION — éviter une panne, anticiper
3. AMÉLIORATION HABITAT — confort, esthétique, valorisation
4. SAISONNALITÉ RÉELLE — météo, période (printemps = humidité, été = clim, hiver = gel)
5. CONSEIL PRATIQUE — tips concrets, utiles, actionnables
6. PREUVE / RÉASSURANCE — intervention rapide, expertise, proximité locale

═══════════════════════════════════════════
PRESSION CONVERSION (OBLIGATOIRE)
═══════════════════════════════════════════
Chaque post DOIT contenir au moins UN de ces déclencheurs :

- PERTE D'ARGENT ("Cette fuite vous coûte X€/mois sans le savoir")
- INCONFORT ("Impossible de dormir avec ce bruit de tuyauterie")
- RISQUE / DANGER ("Ce tableau électrique pouvait prendre feu")
- GAIN IMMÉDIAT ("On règle ça en 1h, vous êtes tranquille")
- SIMPLICITÉ / RAPIDITÉ ("Un appel, un technicien, c'est réglé")

Si aucun de ces déclencheurs n'est présent → le post est INVALIDE.

Un post "correct mais non actionnable" est un MAUVAIS post.
"Votre robinet fuit depuis des semaines ?" est TOUJOURS meilleur qu'un "post Pâques" forcé.

═══════════════════════════════════════════
HOOK — LIBRAIRIE OBLIGATOIRE (CRITIQUE)
═══════════════════════════════════════════
Tu DOIS sélectionner chaque hook depuis la LIBRAIRIE DE HOOKS ci-dessous OU le générer via les PATTERNS AUTORISÉS.
INTERDICTION de générer des hooks aléatoires ou inventés hors de ces deux méthodes.

PROCESSUS DE SÉLECTION :
1. Identifier l'univers métier du post
2. Identifier la saison (${currentSeason})
3. Identifier l'intention prioritaire (urgence > argent > sécurité > prévention > saisonnier)
4. Filtrer les hooks compatibles dans la librairie
5. En sélectionner UN, ou générer via un pattern

PATTERNS AUTORISÉS (pour créer de nouveaux hooks) :
1. QUESTION : "Votre [élément] [problème] ?"
2. ALERTE : "Ça peut [conséquence]"
3. PERTE : "Vous perdez [ressource]"
4. ANTICIPATION : "Avant [moment], [action]"
5. RISQUE : "Et si [scénario] ?"

ÉLÉMENTS MÉTIER AUTORISÉS : robinet, canalisation, volet, serrure, porte, tableau électrique, installation, chauffe-eau, disjoncteur, fenêtre, parquet, carrelage

CONTRAINTES HOOK :
- Maximum 6 mots, phrase complète, lisible immédiatement
- Si trop long → simplifier automatiquement
- L'esprit du hook original DOIT être préservé

LIBRAIRIE DE HOOKS (${totalHooks} hooks, saison: ${currentSeason}) :
${hookLibraryPrompt}

═══════════════════════════════════════════
STRUCTURE OBLIGATOIRE (PUBLICITÉ, PAS CONTENU)
═══════════════════════════════════════════
Chaque post = une PUBLICITÉ, pas du contenu informatif.

HOOK (issu de la librairie ou d'un pattern, max 6 mots)
→ le problème brut, immédiat

SOUS-TEXTE (max 10 mots, phrase française PARFAITE)
→ le bénéfice clair, la conséquence ou le coût
→ DOIT être grammaticalement correct (un francophone natif ne doit pas tiquer)
→ INTERDIT : juxtaposition de mots sans verbe, phrases tronquées

CTA (3 à 5 mots)
→ l'action directe

Exemple :
HOOK : "FUITE SOUS L'ÉVIER ?"
SOUS-TEXTE : "Chaque jour perdu coûte 40 € de plus."
CTA : "Appelez, on intervient vite"

INTERDIT :
- texte long
- phrase creuse
- contenu générique
- événement forcé

═══════════════════════════════════════════
EXCEPTION — POSTS DÉCALÉS / HUMOUR
═══════════════════════════════════════════
Certains événements avec tag "decale" ou "humour" ET relevanceScore >= 2 peuvent être traités en mode humour.
L'humour vient du CROISEMENT entre le métier et l'événement.
Ces posts visent l'ENGAGEMENT → lead_score 40-60.
Mais si l'événement a relevanceScore 1 → ne PAS l'utiliser même en mode humour.

═══════════════════════════════════════════
VISUEL — PROBLÈME VISIBLE (CRITIQUE)
═══════════════════════════════════════════
Chaque visuel représente un PROBLÈME RÉEL ou une situation concrète.
ZOOM sur le problème, ambiance urgence/désagrément.
Exception posts décalés : visuels drôles et surréalistes liés au métier.

═══════════════════════════════════════════
BRANDING — DISCRET ET EFFICACE
═══════════════════════════════════════════
- Couleurs métier : plomberie=#2D8BC9, electricite=#F8A73C, serrurerie=#E22673, menuiserie=#EF8531, vitrerie=#90C14E, volets=#A23189, pmr=#3C64A2, renovation=#B79D84, general=#37474F
- Logo Help Confort : DISCRET, petit, en bas
- Style : moderne, épuré, professionnel

═══════════════════════════════════════════
LEAD ENGINE
═══════════════════════════════════════════
- lead_type : urgence, prevention, amelioration, preuve_sociale, saisonnier
- target_intent : besoin_immediat, besoin_latent, curiosite, education
- lead_score 0-100 : >80=problème concret+CTA fort, 60-80=bon angle, <60=trop informatif
- urgency_level : high=panne/fuite/sécurité, medium=confort, low=conseil

═══════════════════════════════════════════
RÈGLE ANTI-MYTHO (INTERDICTION ABSOLUE)
═══════════════════════════════════════════
Visuels générés par IA. JAMAIS laisser croire qu'une intervention réelle est montrée.
INTERDIT : "Notre agence de Dax a remplacé...", "Intervention réalisée chez un client..."
AUTORISÉ : "Votre volet ne remonte plus ?", "Ce type de fuite est fréquent dans les Landes"
TOUJOURS "Help Confort Landes & Pays Basque", JAMAIS "Help Confort Dax" seul.

LOCALISATION :
Zone : Landes & Pays Basque.
${agencyName ? `Agence : ${agencyName.replace(/Dax/gi, 'Landes & Pays Basque')}.` : ''}

PLATFORM VARIANTS :
- Facebook → storytelling + proximité + émotion
- Instagram → visuel choc + caption court + hashtags
- Google Business → problème + solution + zone géo
- LinkedIn → expertise + cas concret + crédibilité

ANTI-RÉPÉTITION (21 JOURS MINIMUM) :
- Jamais 2 posts du même univers à moins de 21 jours d'écart
- Varier les univers : alterner plomberie, electricite, serrurerie, volets, menuiserie, vitrerie, pmr, renovation
- Espacer les posts : ~1 post tous les 1-2 jours

═══════════════════════════════════════════
PRIORITÉ (DANS CET ORDRE)
═══════════════════════════════════════════
1. UTILITÉ pour le client
2. CRÉDIBILITÉ
3. LIEN MÉTIER
4. CONVERSION (appel, devis, contact)
5. Calendrier EN DERNIER

Le calendrier est un BONUS, pas une obligation.

═══════════════════════════════════════════
RAPPEL FINAL — PUBLICITÉ, PAS CONTENU
═══════════════════════════════════════════
Tu crées des PUBLICITÉS qui déclenchent des ACTIONS.
Chaque post ressemble à une pub : hook choc → bénéfice clair → CTA direct.
JAMAIS de contenu informatif, éducatif ou neutre.

VALIDATION FINALE :
Si le post ne peut pas déclencher un appel ou une demande de devis → il est INVALIDE → remplace-le.`;
    // Build user prompt customization from prompt params
    const toneMap: Record<string, string> = {
      professionnel: 'Ton professionnel, expert, crédible',
      humour: 'Ton humoristique, léger, décalé — tout en restant professionnel',
      bienveillant: 'Ton bienveillant, chaleureux, empathique',
      urgent: 'Ton alarmant, urgent — créer un sentiment de nécessité',
      inspirant: 'Ton inspirant, motivant, positif',
      decontracte: 'Ton décontracté, sympa, accessible',
      pedagogue: 'Ton pédagogique, didactique, explicatif',
      rassurant: 'Ton rassurant, de confiance, apaisant',
    };
    const lengthMap: Record<string, string> = {
      court: 'Caption COURT (2-3 lignes max, accroche percutante, impact immédiat)',
      moyen: 'Caption MOYEN (5-8 lignes, storytelling standard)',
      long: 'Caption LONG (10-15 lignes, storytelling développé, récit immersif)',
    };
    const audienceMap: Record<string, string> = {
      proprietaires: 'Cible : propriétaires occupants (entretien, valorisation patrimoine)',
      locataires: 'Cible : locataires (confort, urgences, bon réflexes)',
      syndics: 'Cible : syndics de copropriété (fiabilité, réactivité, contrats)',
      agences_immo: 'Cible : agences immobilières (partenariat, disponibilité, qualité)',
      tous: 'Cible : tous publics',
    };

    let promptCustomization = '';
    if (userPromptParams) {
      const parts: string[] = [];
      if (userPromptParams.tone && toneMap[userPromptParams.tone]) {
        parts.push(toneMap[userPromptParams.tone]);
      }
      if (userPromptParams.keywords) {
        parts.push(`Mots-clés à intégrer obligatoirement : ${userPromptParams.keywords}`);
      }
      if (userPromptParams.audience && audienceMap[userPromptParams.audience]) {
        parts.push(audienceMap[userPromptParams.audience]);
      }
      if (userPromptParams.length && lengthMap[userPromptParams.length]) {
        parts.push(lengthMap[userPromptParams.length]);
      }
      if (userPromptParams.freePrompt) {
        parts.push(`IDÉE CRÉATIVE DE L'UTILISATEUR (PRIORITÉ MAXIMALE — suivre cette direction) :\n"${userPromptParams.freePrompt}"\nAdapte le hook, le caption, le visuel et le ton selon cette idée. Le visual_prompt doit correspondre exactement à la scène décrite.`);
      }
      if (parts.length > 0) {
        promptCustomization = `\n\nDIRECTIVES UTILISATEUR (PRIORITÉ HAUTE) :\n${parts.map(p => `- ${p}`).join('\n')}`;
      }
    }

    let userPrompt: string;

    if (regenerateSingle && singleContext) {
      userPrompt = `Génère 1 suggestion de post pour le ${singleContext.original_date || `${year}-${String(month).padStart(2, '0')}-15`}.

CONTRAINTES :
- Date : ${singleContext.original_date || 'au choix dans le mois'}
- Type de contenu préféré : ${singleContext.original_topic_type || 'au choix'}
- Univers préféré : ${singleContext.original_universe || 'au choix'}
${singleContext.original_realisation_id ? `- Réalisation liée : ${singleContext.original_realisation_id}` : ''}
${promptCustomization}

ÉVÉNEMENTS PERTINENTS CE MOIS (utilise-les UNIQUEMENT si l'angle est naturel et crédible) :
${pertinentEvents.map(a => `- ${a.day}/${month}: ${a.label} | univers: ${a.preferredUniverses[0]} | LIEN DIRECT MÉTIER`).join('\n') || '(aucun)'}
${optionalEvents.length > 0 ? `\nÉVÉNEMENTS OPTIONNELS (à utiliser SEULEMENT si un angle crédible existe, sinon ignorer) :\n${optionalEvents.map(a => `- ${a.day}/${month}: ${a.label} | univers: ${a.preferredUniverses[0]} | OPTIONNEL`).join('\n')}` : ''}

RÉALISATIONS EXPLOITABLES :
${exploitableReals.length > 0 
  ? exploitableReals.map(r => `- "${r.title}" (ID: ${r.id}, univers: ${r.universe || 'inconnu'}, avant/après: ${r.hasBeforeAfter ? 'oui' : 'non'})`).join('\n')
  : '(aucune)'}

Propose un angle DIFFÉRENT du post précédent.
RAPPEL : le post doit contenir au moins UN déclencheur de conversion (perte d'argent, inconfort, risque, gain immédiat, simplicité).`;
    } else if (isTargetDatesMode) {
      const datesFormatted = targetDates.map(d => {
        const day = parseInt(d.split('-')[2]);
        // Check if there's an awareness event on this date
        const event = monthAwareness.find(a => a.day === day);
        return event 
          ? `- ${d}: événement "${event.label}" (univers: ${event.preferredUniverses[0]}, score: ${event.relevanceScore}) — utiliser SEULEMENT si pertinent`
          : `- ${d}: post métier libre — choisir un univers varié`;
      }).join('\n');

      userPrompt = `Génère EXACTEMENT ${targetDates.length} suggestion(s) de posts, UNE par date suivante :

${datesFormatted}
${promptCustomization}

RÉALISATIONS EXPLOITABLES :
${exploitableReals.length > 0 
  ? exploitableReals.map(r => `- "${r.title}" (ID: ${r.id}, univers: ${r.universe || 'inconnu'}, avant/après: ${r.hasBeforeAfter ? 'oui' : 'non'})`).join('\n')
  : '(aucune)'}

SUJETS DÉJÀ EXISTANTS (à ne pas dupliquer) :
${[...existingTopicKeys].join(', ') || '(aucun)'}

RÈGLES :
- UN post par date, pas plus, pas moins
- Chaque post doit être sur une date différente parmi celles listées
- La suggestion_date DOIT correspondre EXACTEMENT à une des dates demandées
- Varier les univers entre les posts
- Chaque post DOIT contenir un DÉCLENCHEUR de conversion
- Pas de contenu calendaire forcé`;
    } else {
      userPrompt = `Génère ${targetPostCount} suggestions de posts social media PERFORMANTS pour le mois ${month}/${year}.

═══════════════════════════════════════════
ÉVÉNEMENTS À LIEN DIRECT MÉTIER (prioritaires)
═══════════════════════════════════════════
Ces événements ont un lien DIRECT avec l'habitat/dépannage. Utilise-les comme PRÉTEXTE pour un vrai problème.
Le topic_type de ces posts est "awareness_day".
Respecte l'univers indiqué.

${pertinentEvents.map(a => `- ${a.day}/${month}: ${a.label} | UNIVERS: ${a.preferredUniverses[0]} | priorité: ${a.relevanceScore * a.intentScore}`).join('\n') || '(aucun événement pertinent ce mois)'}

═══════════════════════════════════════════
ÉVÉNEMENTS OPTIONNELS (score 2 — NE PAS FORCER)
═══════════════════════════════════════════
Ces événements PEUVENT être utilisés UNIQUEMENT si :
- l'angle est naturel et crédible
- le lien avec le métier n'est pas forcé
- le post serait meilleur AVEC l'événement que SANS

S'ils ne produisent pas un angle naturel → IGNORER et générer un post métier classique à la place.

${optionalEvents.map(a => `- ${a.day}/${month}: ${a.label} | univers: ${a.preferredUniverses[0]} | OPTIONNEL — ignorer si forcé`).join('\n') || '(aucun)'}

═══════════════════════════════════════════
SLOTS MÉTIER LIBRES (remplacent les événements sans lien)
═══════════════════════════════════════════
Pour ces dates, génère un post métier PERFORMANT de la catégorie indiquée :
${fallbackSlots.map(s => `- ${s.day}/${month}: POST MÉTIER catégorie "${s.category}" (pas d'événement calendaire)`).join('\n') || '(aucun)'}

Les posts restants (pour atteindre ${targetPostCount}) doivent compléter avec des problèmes métiers concrets.

═══════════════════════════════════════════
RÉPARTITION SUR ${targetPostCount} POSTS
═══════════════════════════════════════════
- ~25% URGENCE / PROBLÈME (leads directs, pannes, fuites)
- ~25% ENTRETIEN / PRÉVENTION (anticiper, éviter une panne)
- ~20% AMÉLIORATION HABITAT (confort, valorisation)
- ~15% SAISONNALITÉ RÉELLE (météo, période)
- ~10% CONSEIL PRATIQUE (tips utiles)
- ~5% PREUVE / RÉASSURANCE (expertise, rapidité, proximité)

═══════════════════════════════════════════
ANTI-REDONDANCE — GAP MINIMUM 21 JOURS
═══════════════════════════════════════════
Un même univers/thème ne doit PAS apparaître deux fois en moins de 21 jours.
${recentThemesWarning}

SUJETS DÉJÀ EXISTANTS (à ne pas dupliquer) :
${[...existingTopicKeys].join(', ') || '(aucun)'}

RÉALISATIONS EXPLOITABLES :
${exploitableReals.length > 0 
  ? exploitableReals.map(r => `- "${r.title}" (ID: ${r.id}, univers: ${r.universe || 'inconnu'}, avant/après: ${r.hasBeforeAfter ? 'oui' : 'non'})`).join('\n')
  : '(aucune)'}

═══════════════════════════════════════════
RAPPEL CRITIQUE — PRESSION CONVERSION
═══════════════════════════════════════════
- MINIMUM ${targetPostCount} posts, répartis sur tout le mois
- Chaque post DOIT contenir un DÉCLENCHEUR (perte d'argent, inconfort, risque, gain, simplicité)
- Un post sans déclencheur est INVALIDE — remplace-le par un post métier classique
- lead_score DOIT refléter le potentiel RÉEL de conversion
- Posts urgence (fuite, panne, sécurité) → lead_score > 80, urgency_level = high
- visual_prompt = scène RÉALISTE habitat français, JAMAIS un fond vide
- JAMAIS inventer de faux cas client — rester GÉNÉRAL et EXPERT
- Le topic_type "realisation" est INTERDIT sauf s'il y a de vraies photos (realisation_id valide)
- Espacer les posts de 1-2 jours, couvrir le mois entier

═══════════════════════════════════════════
CATÉGORIE : CONTENU PÉDAGOGIQUE (topic_type = "educational")
═══════════════════════════════════════════
Inclure 2-3 posts pédagogiques par mois. Objectif : rendre un sujet technique compréhensible en 30 secondes.
Visuels de type : schéma simple, comparaison, chiffre clé, process.
RÈGLES :
- UNE seule idée par visuel
- Pas de texte long, pas de graphique complexe, pas de jargon
- Hook basé sur un chiffre ou une prise de conscience ("80% des fuites sont évitables")
- Explication simple et directe (max 10 mots)
- CTA = action directe
INTERDICTION : contenu scolaire, explication longue, design type powerpoint
OBLIGATION : le post doit apporter une VALEUR IMMÉDIATE et rester actionnable`;

    }

    // ─── AI call with automatic fallback across models ───
    const FALLBACK_MODELS = [
      'google/gemini-3-flash-preview',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-pro',
      'openai/gpt-5-mini',
    ];

    const aiPayload = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [SUGGEST_TOOL],
      tool_choice: { type: 'function', function: { name: 'generate_social_suggestions' } },
      stream: false,
      temperature: 0.7,
    };

    let aiResponse: Response | null = null;
    let lastError = '';
    let lastStatus = 0;

    for (const model of FALLBACK_MODELS) {
      console.log(`[social-suggest] Trying model: ${model}`);
      try {
        const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...aiPayload, model }),
        });

        if (resp.ok) {
          aiResponse = resp;
          console.log(`[social-suggest] Success with model: ${model}`);
          break;
        }

        lastStatus = resp.status;
        lastError = await resp.text();
        console.warn(`[social-suggest] Model ${model} failed (${resp.status}): ${lastError.slice(0, 200)}`);

        // 402 = credits exhausted — no point trying other models
        if (resp.status === 402) {
          return new Response(JSON.stringify({ error: 'Crédits IA insuffisants.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // For 429 or 5xx, try next model
        if (resp.status === 429 || resp.status >= 500) {
          // Brief pause before trying next model
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        // Other errors (400, 403...) — unlikely to be model-specific, stop
        break;
      } catch (fetchErr) {
        console.error(`[social-suggest] Fetch error for ${model}:`, fetchErr);
        lastError = String(fetchErr);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
    }

    if (!aiResponse) {
      console.error('[social-suggest] All models failed. Last:', lastStatus, lastError.slice(0, 300));
      if (lastStatus === 429) {
        return new Response(JSON.stringify({ error: 'Tous les modèles IA sont saturés, réessayez dans quelques minutes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Service IA indisponible', details: lastStatus }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiText = await aiResponse.text();
    let aiData: any;
    try {
      aiData = JSON.parse(aiText);
    } catch {
      console.error('[social-suggest] AI returned non-JSON:', aiText.slice(0, 500));
      return new Response(JSON.stringify({ error: 'Réponse IA invalide (non-JSON), réessayez' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let rawSuggestions: any[];
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const args = typeof toolCall.function.arguments === 'string'
          ? toolCall.function.arguments
          : JSON.stringify(toolCall.function.arguments);
        const parsed = JSON.parse(args);
        rawSuggestions = parsed.suggestions;
      } else {
        const rawContent = aiData.choices?.[0]?.message?.content || '';
        if (!rawContent.trim()) {
          console.error('[social-suggest] AI returned empty content, no tool_calls. finish_reason:', aiData.choices?.[0]?.finish_reason);
          throw new Error('Empty AI response');
        }
        const jsonStr = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        rawSuggestions = Array.isArray(parsed) ? parsed : parsed.suggestions;
      }
      if (!Array.isArray(rawSuggestions)) throw new Error('Not an array');
    } catch (parseErr) {
      console.error('[social-suggest] Parse error:', parseErr);
      console.error('[social-suggest] AI response preview:', JSON.stringify(aiData).slice(0, 1000));
      return new Response(JSON.stringify({ error: 'Réponse IA invalide, réessayez' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validatedSuggestions = validateAndNormalizeSuggestions(
      rawSuggestions, month, year, exploitableReals, existingTopicKeys
    );

    if (validatedSuggestions.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucune suggestion valide générée, réessayez' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Persist to DB ───────────────────────────────
    const batchId = crypto.randomUUID();
    const persistedSuggestions: any[] = [];

    for (const s of validatedSuggestions) {
      let sourceType = 'ai_seasonal';
      if (s.topic_type === 'awareness_day') sourceType = 'ai_awareness';
      else if (s.topic_type === 'realisation') sourceType = 'ai_realisation';
      else if (s.topic_type === 'educational') sourceType = 'ai_educational';
      if (regenerateSingle) sourceType = 'regenerated';

      const aiPayload = {
        hook: s.hook,
        cta: s.cta,
        storytelling_type: s.storytelling_type,
        emotional_trigger: s.emotional_trigger,
        visual_strategy: s.visual_strategy,
        visual_prompt: s.visual_prompt,
        visual_composition: s.visual_composition,
        branding_guidelines: s.branding_guidelines,
        lead_score: s.lead_score,
        lead_type: s.lead_type,
        urgency_level: s.urgency_level,
        target_intent: s.target_intent,
        generation_version: 'v6',
      };

      const { data: inserted, error: insertErr } = await adminSupabase
        .from('social_content_suggestions')
        .insert({
          agency_id: agencyId,
          month_key: monthKey,
          suggestion_date: s.suggestion_date,
          title: s.title,
          content_angle: s.content_angle,
          caption_base_fr: s.caption_base_fr,
          hashtags: s.hashtags,
          platform_targets: Object.keys(s.platform_variants).length > 0 ? Object.keys(s.platform_variants) : ['facebook', 'instagram'],
          visual_type: s.visual_type,
          topic_type: s.topic_type,
          topic_key: s.topic_key,
          realisation_id: s.realisation_id,
          universe: s.universe,
          relevance_score: s.lead_score,
          status: 'draft',
          generation_batch_id: batchId,
          source_type: sourceType,
          ai_payload: aiPayload,
        })
        .select('id, title, suggestion_date, topic_type, universe, status')
        .single();

      if (insertErr) {
        console.error('[social-suggest] Insert error:', insertErr);
        continue;
      }

      // Insert platform variants
      const variantRows: any[] = [];
      for (const platform of VALID_PLATFORMS) {
        const v = s.platform_variants[platform];
        if (!v) continue;
        variantRows.push({
          suggestion_id: inserted.id,
          agency_id: agencyId,
          platform,
          caption_fr: v.caption,
          cta: v.cta,
          hashtags: s.hashtags,
          format: '1080x1080',
          recommended_dimensions: '1080x1080',
          status: 'draft',
        });
      }

      if (variantRows.length > 0) {
        const { error: varErr } = await adminSupabase
          .from('social_post_variants')
          .insert(variantRows);
        if (varErr) console.error('[social-suggest] Variant insert error:', varErr);
      }

      persistedSuggestions.push(inserted);
    }

    return new Response(JSON.stringify({
      success: true,
      batch_id: batchId,
      month_key: monthKey,
      generated_count: persistedSuggestions.length,
      suggestions: persistedSuggestions,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[social-suggest] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Erreur interne' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

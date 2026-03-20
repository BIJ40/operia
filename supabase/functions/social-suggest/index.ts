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
    { month: 1, day: 1,  label: "🎉 Jour de l'An — bonnes résolutions habitat", tags: ["habitat","renovation","branding","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "devis_renovation" },
    { month: 1, day: 6,  label: "Épiphanie — et si on en profitait pour vérifier le chauffage ?", tags: ["entretien","plomberie","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["plomberie"], ctaHint: "entretien_chauffage" },
    { month: 1, day: 10, label: "Vague de froid — protéger ses canalisations du gel", tags: ["urgence","plomberie","hiver"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "urgence_gel" },
    { month: 1, day: 15, label: "⚠️ Prévention gel canalisations", tags: ["eau","urgence","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "urgence_gel" },
    { month: 1, day: 20, label: "Blue Monday — offrez-vous un intérieur qui fait du bien", tags: ["confort","renovation","lifestyle"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","electricite"], ctaHint: "ambiance_maison" },
    { month: 1, day: 24, label: "Soldes d'hiver — le bon moment pour rénover", tags: ["renovation","promo"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation"], ctaHint: "devis_renovation" },
    { month: 1, day: 27, label: "Vérification détecteurs de fumée", tags: ["securite","electricite"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_incendie" },

    // ════════════════ FÉVRIER ════════════════
    { month: 2, day: 2,  label: "🕯 Chandeleur — attention aux risques incendie en cuisine", tags: ["securite","electricite","fete"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_incendie" },
    { month: 2, day: 7,  label: "Journée sans téléphone — mais pas sans chauffage !", tags: ["confort","plomberie","decale"], contentTypeHint: "decale", preferredUniverses: ["plomberie"], ctaHint: "entretien_chauffage" },
    { month: 2, day: 10, label: "Journée mondiale de l'énergie — économies d'énergie", tags: ["energie","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","plomberie"], ctaHint: "audit_energetique" },
    { month: 2, day: 14, label: "💕 Saint-Valentin — créer une ambiance cocooning chez soi", tags: ["confort","habitat","lifestyle","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","electricite","general"], ctaHint: "ambiance_maison" },
    { month: 2, day: 20, label: "Fin d'hiver — bilan chauffage et préparation du printemps", tags: ["entretien","plomberie","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation"], ctaHint: "bilan_chauffage" },
    { month: 2, day: 25, label: "🎭 Carnaval — les déguisements de vos installations les plus insolites", tags: ["humour","engagement","decale"], contentTypeHint: "decale", preferredUniverses: ["general"], ctaHint: "engagement_communaute" },

    // ════════════════ MARS ════════════════
    { month: 3, day: 3,  label: "Journée mondiale de la vie sauvage — protéger les oiseaux des vitrages", tags: ["vitrerie","environnement"], contentTypeHint: "pedagogique", preferredUniverses: ["vitrerie"], ctaHint: "remplacement_vitrage" },
    { month: 3, day: 8,  label: "👩 Journée des droits des femmes — nos techniciennes sur le terrain", tags: ["branding","engagement","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["general"], ctaHint: "recrutement" },
    { month: 3, day: 12, label: "Début du printemps — check-up plomberie & robinetterie", tags: ["entretien","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "entretien_printemps" },
    { month: 3, day: 17, label: "☘️ Saint-Patrick — la chance n'a rien à voir avec l'entretien", tags: ["humour","engagement","fete"], contentTypeHint: "decale", preferredUniverses: ["general"], ctaHint: "engagement_communaute" },
    { month: 3, day: 20, label: "🌸 Équinoxe de printemps — préparez votre habitat", tags: ["habitat","renovation","entretien"], contentTypeHint: "prevention", preferredUniverses: ["renovation","plomberie","electricite"], ctaHint: "check_up_printemps" },
    { month: 3, day: 22, label: "💧 Journée mondiale de l'eau", tags: ["eau","plomberie","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["plomberie"], ctaHint: "diagnostic_fuite" },
    { month: 3, day: 25, label: "Semaine du développement durable — rénover éco-responsable", tags: ["energie","renovation","environnement"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation","electricite"], ctaHint: "renovation_ecologique" },
    { month: 3, day: lastSunMarch, label: "🕐 Changement d'heure (été) — reprogrammer volets & minuteries", tags: ["electricite","confort","volets"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","volets"], ctaHint: "programmateur_volets" },

    // ════════════════ AVRIL ════════════════
    { month: 4, day: 1,  label: "🐟 1er avril — les pannes les plus insolites de nos techniciens", tags: ["humour","engagement","branding","fete"], contentTypeHint: "decale", preferredUniverses: ["general"], ctaHint: "engagement_communaute" },
    { month: 4, day: 7,  label: "🧹 Grand ménage de printemps — check-up complet maison", tags: ["entretien","habitat"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite","renovation"], ctaHint: "check_up_maison" },
    { month: 4, day: 11, label: "Journée mondiale Parkinson — adapter le logement PMR", tags: ["pmr","sante","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["pmr"], ctaHint: "adaptation_logement" },
    { month: 4, day: 15, label: "Préparer terrasse & extérieurs pour les beaux jours", tags: ["habitat","menuiserie","volets"], contentTypeHint: "pedagogique", preferredUniverses: ["menuiserie","volets","renovation"], ctaHint: "amenagement_exterieur" },
    { month: easter.month, day: easter.day, label: "🐣 Pâques — votre maison prête pour recevoir la famille", tags: ["confort","habitat","famille","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "maison_accueillante" },
    { month: easterMon.month, day: easterMon.day, label: "Lundi de Pâques — profitez du pont pour vos petits travaux", tags: ["renovation","habitat","weekend","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation","menuiserie"], ctaHint: "travaux_weekend" },
    { month: 4, day: 22, label: "🌍 Jour de la Terre — rénovation éco-responsable", tags: ["energie","renovation","environnement","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation"], ctaHint: "renovation_ecologique" },
    { month: 4, day: 28, label: "🔒 Journée sécurité au travail — sécurisez aussi votre maison", tags: ["securite","electricite","serrurerie","fete"], contentTypeHint: "prevention", preferredUniverses: ["electricite","serrurerie"], ctaHint: "diagnostic_securite" },

    // ════════════════ MAI ════════════════
    { month: 5, day: 1,  label: "🌷 Fête du travail — sécuriser sa maison pour le pont de mai", tags: ["securite","serrurerie","fete"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie"], ctaHint: "securisation_pont" },
    { month: 5, day: 4,  label: "Star Wars Day — que la force soit avec vos installations", tags: ["humour","engagement","decale"], contentTypeHint: "decale", preferredUniverses: ["general"], ctaHint: "engagement_communaute" },
    { month: 5, day: 8,  label: "8 mai — pont = cambriolages : sécurisez vos accès", tags: ["securite","serrurerie","fete"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie"], ctaHint: "securisation_pont" },
    { month: 5, day: 10, label: "Entretien climatisation avant l'été", tags: ["entretien","confort"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite"], ctaHint: "entretien_clim" },
    { month: 5, day: 15, label: "🏠 Journée sans écran — redécouvrez votre maison (et ses défauts)", tags: ["habitat","renovation","decale"], contentTypeHint: "decale", preferredUniverses: ["renovation","general"], ctaHint: "devis_renovation" },
    { month: 5, day: 20, label: "Journée mondiale des abeilles — fenêtres avec moustiquaires", tags: ["vitrerie","environnement","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["vitrerie","menuiserie"], ctaHint: "moustiquaires" },
    { month: 5, day: 25, label: "Fête des mères — offrez du confort à la maison", tags: ["lifestyle","branding","confort","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["general","renovation"], ctaHint: "cadeau_confort" },
    { month: ascension.month, day: ascension.day, label: "🙏 Ascension — on reste disponible même les jours fériés", tags: ["branding","urgence","fete"], contentTypeHint: "prevention", preferredUniverses: ["general","plomberie","serrurerie"], ctaHint: "dispo_jours_feries" },
    { month: pentecote.month, day: pentecote.day, label: "Lundi de Pentecôte — dernier grand pont avant l'été", tags: ["securite","serrurerie","fete"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie","general"], ctaHint: "securisation_pont" },

    // ════════════════ JUIN ════════════════
    { month: 6, day: 1,  label: "Début météo d'été — préparer volets et stores", tags: ["confort","volets"], contentTypeHint: "prevention", preferredUniverses: ["volets"], ctaHint: "installation_volets" },
    { month: 6, day: 5,  label: "🌱 Journée de l'environnement — éco-gestes maison", tags: ["energie","habitat","environnement","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","plomberie"], ctaHint: "eco_gestes" },
    { month: 6, day: 10, label: "Semaine du vélo — mais qui sécurise votre garage ?", tags: ["serrurerie","securite","decale"], contentTypeHint: "decale", preferredUniverses: ["serrurerie","menuiserie"], ctaHint: "securisation_garage" },
    { month: 6, day: 15, label: "☀️ Premières chaleurs — fraîcheur & ventilation", tags: ["confort","urgence"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite","volets"], ctaHint: "installation_clim" },
    { month: 6, day: 15, label: "Fête des pères — un projet maison à deux ?", tags: ["lifestyle","branding","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["general","renovation","menuiserie"], ctaHint: "projet_maison" },
    { month: 6, day: 21, label: "🔒 Été = vacances : sécurisez avant de partir", tags: ["securite","serrurerie"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie"], ctaHint: "securisation_vacances" },
    { month: 6, day: 21, label: "☀️ Solstice d'été — protégez-vous de la chaleur", tags: ["confort","volets","habitat","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["volets","electricite"], ctaHint: "protection_chaleur" },
    { month: 6, day: 25, label: "🎵 Fête de la musique passée — vos volets tiennent le bruit ?", tags: ["volets","vitrerie","decale"], contentTypeHint: "decale", preferredUniverses: ["volets","vitrerie"], ctaHint: "isolation_phonique" },

    // ════════════════ JUILLET ════════════════
    { month: 7, day: 1,  label: "🏖 Départs en vacances — checklist sécurité maison", tags: ["securite","serrurerie","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie","plomberie"], ctaHint: "checklist_vacances" },
    { month: 7, day: 7,  label: "Canicule — les bons réflexes pour garder la fraîcheur", tags: ["confort","volets","electricite"], contentTypeHint: "prevention", preferredUniverses: ["volets","electricite"], ctaHint: "protection_chaleur" },
    { month: 7, day: 14, label: "🇫🇷 14 juillet — sécurité électrique pour les festivités", tags: ["securite","electricite","fete"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_electrique" },
    { month: 7, day: 20, label: "Stores & volets roulants contre la canicule", tags: ["confort","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["volets"], ctaHint: "installation_volets" },
    { month: 7, day: 25, label: "Vacances — comment couper l'eau en partant", tags: ["plomberie","prevention"], contentTypeHint: "pedagogique", preferredUniverses: ["plomberie"], ctaHint: "prevention_degat_eaux" },

    // ════════════════ AOÛT ════════════════
    { month: 8, day: 1,  label: "🚨 Urgences estivales — Help Confort reste ouvert", tags: ["urgence","plomberie","serrurerie","branding"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","serrurerie"], ctaHint: "numero_urgence" },
    { month: 8, day: 8,  label: "Journée mondiale du chat — protéger vos moustiquaires", tags: ["vitrerie","humour","decale","fete"], contentTypeHint: "decale", preferredUniverses: ["vitrerie"], ctaHint: "reparation_moustiquaire" },
    { month: 8, day: 15, label: "🌅 15 août — Assomption — pensez à vos projets de rentrée", tags: ["renovation","habitat","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "projet_rentree" },
    { month: 8, day: 20, label: "Fin des vacances — dégâts des eaux pendant l'absence ?", tags: ["urgence","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "diagnostic_retour" },
    { month: 8, day: 25, label: "📚 Rentrée approche — préparer la maison pour la famille", tags: ["entretien","habitat","famille"], contentTypeHint: "prevention", preferredUniverses: ["renovation","general","electricite"], ctaHint: "preparation_rentree" },

    // ════════════════ SEPTEMBRE ════════════════
    { month: 9, day: 1,  label: "📚 Rentrée — révision chauffage avant l'hiver", tags: ["entretien","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "revision_chauffage" },
    { month: 9, day: 7,  label: "Semaine de la mobilité — accessibilité du logement", tags: ["pmr","habitat","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["pmr"], ctaHint: "adaptation_logement" },
    { month: 9, day: 15, label: "⚡ Rentrée — vérifier tableau électrique & prises", tags: ["securite","electricite"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "diagnostic_electrique" },
    { month: 9, day: 20, label: "Journées du patrimoine — entretenir c'est préserver", tags: ["pedagogique","habitat","branding","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation","menuiserie"], ctaHint: "entretien_patrimoine" },
    { month: 9, day: 22, label: "🍂 Équinoxe d'automne — préparer sa maison pour l'hiver", tags: ["entretien","habitat","energie","fete"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation","volets"], ctaHint: "preparation_hiver" },
    { month: 9, day: 26, label: "Journée européenne des langues — Help Confort parle votre langue", tags: ["branding","proximite","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["general"], ctaHint: "branding_proximite" },

    // ════════════════ OCTOBRE ════════════════
    { month: 10, day: 1,  label: "🧥 Anticiper l'hiver — isolation & chauffage", tags: ["entretien","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation"], ctaHint: "preparation_hiver" },
    { month: 10, day: 4,  label: "Journée mondiale des animaux — sécuriser vos installations", tags: ["securite","humour","fete"], contentTypeHint: "decale", preferredUniverses: ["electricite","vitrerie"], ctaHint: "securisation_maison" },
    { month: 10, day: 10, label: "Journée de la santé mentale — un logement sain pour se sentir bien", tags: ["confort","habitat","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "renovation_confort" },
    { month: 10, day: 13, label: "Journée prévention catastrophes naturelles", tags: ["securite","urgence","fete"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite"], ctaHint: "prevention_degats_eaux" },
    { month: 10, day: 20, label: "Semaine du goût — un robinet qui fuit gâche le goût de l'eau", tags: ["plomberie","decale","fete"], contentTypeHint: "decale", preferredUniverses: ["plomberie"], ctaHint: "reparation_robinet" },
    { month: 10, day: lastSunOct, label: "🕐 Changement d'heure (hiver) — reprogrammer volets & minuteries", tags: ["electricite","volets","confort"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","volets"], ctaHint: "programmateur_volets" },
    { month: 10, day: 31, label: "🎃 Halloween — les pannes qui font (vraiment) peur", tags: ["humour","engagement","fete"], contentTypeHint: "decale", preferredUniverses: ["general","electricite"], ctaHint: "engagement_communaute" },

    // ════════════════ NOVEMBRE ════════════════
    { month: 11, day: 1,  label: "🕯 Toussaint — purge radiateurs avant le grand froid", tags: ["entretien","plomberie","fete"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "purge_radiateurs" },
    { month: 11, day: 8,  label: "Semaine de la qualité de l'air — ventilation et aération", tags: ["sante","habitat","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","renovation"], ctaHint: "ventilation" },
    { month: 11, day: 11, label: "11 novembre — pont = vérifier serrures & accès", tags: ["securite","serrurerie","fete"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie"], ctaHint: "securisation_pont" },
    { month: 11, day: 15, label: "♿ Journée accessibilité — adaptation PMR du logement", tags: ["pmr","habitat","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["pmr"], ctaHint: "adaptation_logement" },
    { month: 11, day: 19, label: "Journée mondiale des toilettes — entretien WC et sanitaires", tags: ["plomberie","humour","fete"], contentTypeHint: "decale", preferredUniverses: ["plomberie"], ctaHint: "reparation_wc" },
    { month: 11, day: 24, label: "🛒 Black Friday — c'est le moment de planifier vos travaux", tags: ["renovation","habitat","promotion","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "devis_travaux" },
    { month: 11, day: 28, label: "Préparer les illuminations de Noël en toute sécurité", tags: ["securite","electricite","noel"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_electrique_noel" },

    // ════════════════ DÉCEMBRE ════════════════
    { month: 12, day: 1,  label: "❄️ Risques gel canalisations — protégez vos tuyaux", tags: ["urgence","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "prevention_gel" },
    { month: 12, day: 5,  label: "🎅 Saint-Nicolas — l'hiver s'installe, vérifiez le chauffage", tags: ["entretien","plomberie","fete"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "entretien_chauffage" },
    { month: 12, day: 10, label: "🎄 Sécurité électrique pour les illuminations de Noël", tags: ["securite","electricite","fete"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_electrique_noel" },
    { month: 12, day: 15, label: "Achats de Noël — et si le vrai cadeau c'était la rénovation ?", tags: ["renovation","lifestyle","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "devis_travaux" },
    { month: 12, day: 21, label: "Solstice d'hiver — vérifiez isolation & chauffage", tags: ["energie","entretien","plomberie","fete"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation"], ctaHint: "isolation_hiver" },
    { month: 12, day: 25, label: "🎅 Joyeux Noël — Help Confort à vos côtés toute l'année", tags: ["branding","engagement","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["general"], ctaHint: "branding_fetes" },
    { month: 12, day: 28, label: "Bilan de fin d'année — les pannes les plus fréquentes", tags: ["branding","pedagogique"], contentTypeHint: "pedagogique", preferredUniverses: ["general"], ctaHint: "engagement_communaute" },
    { month: 12, day: 31, label: "🥂 Réveillon — bilan & projets habitat pour la nouvelle année", tags: ["branding","habitat","fete"], contentTypeHint: "lifestyle", preferredUniverses: ["general","renovation"], ctaHint: "projets_nouvelle_annee" },
  ];
}

// Pre-compute for current year (edge function context)
const AWARENESS_DAYS = buildAwarenessDays(new Date().getFullYear());

const NORMALIZED_UNIVERSES = ['plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie', 'renovation', 'volets', 'pmr', 'general'] as const;
const VALID_PLATFORMS = ['facebook', 'instagram', 'google_business', 'linkedin'] as const;
const VALID_TOPIC_TYPES = ['awareness_day', 'seasonal_tip', 'realisation', 'local_branding'] as const;
const VALID_LEAD_TYPES = ['urgence', 'prevention', 'amelioration', 'preuve_sociale', 'saisonnier'] as const;
const VALID_TARGET_INTENTS = ['besoin_immediat', 'besoin_latent', 'curiosite', 'education'] as const;
const VALID_URGENCY_LEVELS = ['low', 'medium', 'high'] as const;

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
              topic_type: { type: 'string', enum: ['awareness_day', 'seasonal_tip', 'realisation', 'local_branding'] },
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

    const rlResult = await checkRateLimit(`social-suggest:${context.userId}`, { limit: 5, windowMs: 3600_000 });
    if (!rlResult.allowed) {
      return rateLimitResponse(rlResult.retryAfter!, corsHeaders);
    }

    const body = await req.json();
    const month = Number(body.month);
    const year = Number(body.year);
    const agencyId = body.agency_id ? validateUUID(body.agency_id, 'agency_id') : context.agencyId;
    const regenerateSingle = body.regenerate_single === true;
    const singleSuggestionId = body.suggestion_id || null;
    const userPromptParams = body.prompt || null;

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
    const monthAwareness = AWARENESS_DAYS.filter(d => d.month === month);

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
    const targetPostCount = regenerateSingle ? 1 : Math.max(8, 20 - approvedCount);

    // ─── AI Generation ──────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Service IA non configuré' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Tu es simultanément directeur éditorial, copywriter expert conversion locale, growth marketer et directeur artistique.
Tu travailles pour HelpConfort (dépannage & rénovation habitat).

Tu produis des posts social media PREMIUM orientés :
→ visibilité locale
→ engagement
→ génération de leads
Chaque post doit pouvoir générer une prise de contact.

═══════════════════════════════════════════
RÈGLE FONDAMENTALE — PROBLÈME CLIENT AU CENTRE
═══════════════════════════════════════════
Tu ne crées JAMAIS de contenu informatif neutre.
Tu mets TOUJOURS en scène un PROBLÈME CLIENT CONCRET.

Chaque post part d'une situation réelle vécue par un client :
- un volet bloqué, une fuite sous évier, un disjoncteur qui saute, une serrure cassée
- PAS une "journée thématique", PAS un "rappel saisonnier", PAS une info générique

Les journées du calendrier servent de PRÉTEXTE pour parler d'un VRAI problème.
Ex: "Changement d'heure" → "VOLET BLOQUÉ APRÈS LE CHANGEMENT D'HEURE ?"
Ex: "Journée de l'eau" → "CETTE FUITE INVISIBLE COÛTAIT 40€/MOIS"
Ex: "Pâques" → "PANNE DE CHAUFFE-EAU LA VEILLE D'UN REPAS DE FAMILLE ?"

═══════════════════════════════════════════
EXCEPTION — POSTS DÉCALÉS / HUMOUR (FÊTES & ÉVÉNEMENTS FUN)
═══════════════════════════════════════════
Certains événements calendaires ont le tag "decale" ou "humour".
Pour CES posts uniquement, tu DOIS abandonner le ton sérieux et créer un contenu DRÔLE, DÉCALÉ, VIRAL.

Le post doit être DIRECTEMENT LIÉ à l'événement et FAIRE RIRE.
L'humour vient du CROISEMENT entre le métier (plomberie, serrurerie, etc.) et l'événement.

EXEMPLES DE BONS POSTS DÉCALÉS :
- 🐟 1er avril → "DES POISSONS DANS VOS CANALISATIONS ?" + visual: un plombier qui essaie d'attraper des poissons sortant d'un robinet avec une épuisette, scène absurde et drôle
- 🎃 Halloween → "CE BRUIT DANS LES TUYAUX LA NUIT..." + visual: un robinet qui fuit avec une ombre effrayante, ambiance film d'horreur
- 🎭 Carnaval → "MÊME DÉGUISÉ, VOTRE PLOMBIER VOUS RECONNAÎT" + visual: un technicien en costume de carnaval avec sa caisse à outils
- Star Wars Day → "QUE LA FORCE SOIT AVEC VOTRE CHAUFFE-EAU" + visual: un technicien en pose Jedi devant un chauffe-eau qui fume

RÈGLES POUR LES POSTS DÉCALÉS :
- Le hook doit faire SOURIRE immédiatement
- Le visual_prompt doit décrire une scène ABSURDE, DRÔLE, SURRÉALISTE mais toujours liée au métier
- La caption reste courte, fun, et se termine par un CTA léger ("On est là même le 1er avril 😉")
- Le storytelling_type est "conseil_expert" mais le ton est humoristique
- L'univers métier doit être respecté (si indiqué par l'événement)
- Ces posts visent l'ENGAGEMENT et le PARTAGE, pas la conversion directe → lead_score 40-60

INTERDIT pour les posts NON décalés :
- Hooks informatifs ("C'est la journée de...", "Pensez à...", "Saviez-vous que...")
- Hooks trop longs (max 8 mots)
- Hooks sans tension ni émotion
- Contenus neutres qui "informent" sans créer de réaction

═══════════════════════════════════════════
HOOK — STOP SCROLL (CRITIQUE)
═══════════════════════════════════════════
Le hook est la PREMIÈRE LIGNE. Il doit :
1. Être COURT (4-8 mots MAX)
2. Poser un PROBLÈME ou une QUESTION directe
3. Créer du STRESS LÉGER ou de la CURIOSITÉ
4. Parler au client comme s'il vivait le problème MAINTENANT

BONS hooks :
- "IL NE REMONTE PLUS ?"
- "VOLET BLOQUÉ CE MATIN ?"
- "FUITE SOUS L'ÉVIER ?"
- "CETTE ODEUR DANS LA SALLE DE BAIN ?"
- "DISJONCTEUR QUI SAUTE ENCORE ?"
- "PORTE CLAQUÉE, CLÉS DEDANS ?"
- "CE TABLEAU ÉLECTRIQUE POUVAIT PRENDRE FEU"

MAUVAIS hooks (INTERDITS) :
- "Changement d'heure & volets" → trop long, pas émotionnel
- "C'est le moment de penser à..." → zéro tension
- "Journée mondiale de l'eau" → personne ne s'en soucie
- "Préparez votre maison pour..." → conseil générique

Le champ "hook" dans la réponse = CE texte court percutant.
Le "title" = version légèrement plus longue mais toujours orientée problème.

═══════════════════════════════════════════
SOUS-TEXTE / CAPTION
═══════════════════════════════════════════
Après le hook, la caption développe :
1. Le problème en 1 phrase ("Le changement d'heure dérègle souvent les programmateurs de volets roulants")
2. La conséquence ("Résultat : volet bloqué, store qui ne répond plus")
3. La solution Help Confort ("On règle ça en 1 intervention")
4. Le CTA naturel ("Appelez-nous avant que ça bloque complètement")

JAMAIS de paragraphe informatif sans lien avec un problème client.

═══════════════════════════════════════════
CTA (OBLIGATOIRE — ORIENTÉ ACTION)
═══════════════════════════════════════════
Court, direct, crée un sentiment de nécessité :
- "On règle ça en 1 intervention"
- "Appelez avant que ça empire"
- "Diagnostic gratuit, résultat immédiat"
- "Intervention rapide dans votre secteur"

INTERDIT : CTA mous ("N'hésitez pas à nous contacter", "Pour plus d'informations")

═══════════════════════════════════════════
VISUEL — PROBLÈME VISIBLE (CRITIQUE)
═══════════════════════════════════════════
Chaque visuel doit représenter un PROBLÈME RÉEL ou une situation concrète vécue par le client.
Les visuels neutres ou purement illustratifs sont INTERDITS.

BONS visuels (visual_prompt) :
- "Volet roulant bloqué à mi-hauteur sur une fenêtre française, lumière sombre de fin de journée, gros plan"
- "Fuite d'eau visible sous un évier de cuisine, gouttes sur le sol, ambiance urgence"
- "Tableau électrique ouvert avec câbles en désordre, traces de chaleur"
- "Serrure de porte d'entrée cassée, cylindre sorti, vue rapprochée"

EXCEPTION POUR POSTS DÉCALÉS — VISUELS HUMORISTIQUES :
Pour les posts tagués "decale" ou "humour", le visual_prompt DOIT être DRÔLE et SURRÉALISTE :
- "Un plombier en bleu de travail essayant d'attraper des poissons rouges qui jaillissent d'un robinet de cuisine avec une épuisette, eau partout, scène absurde et comique, éclairage lumineux"
- "Un technicien déguisé en fantôme essayant de réparer un radiateur dans une maison décorée Halloween, toiles d'araignée, ambiance fun"
- "Un électricien en costume de super-héros devant un tableau électrique qui fait des étincelles colorées comme un feu d'artifice"
Ces visuels doivent faire SOURIRE et être PARTAGÉS. Ils restent liés au métier mais dans un registre absurde/comique.

MAUVAIS visuels (INTERDITS sauf posts décalés) :
- "Maison propre avec volets" → zéro tension, banque d'image
- "Famille souriante dans son salon" → hors sujet
- "Main tenant une clé" → trop générique
- "Plombier qui répare" → pas le problème client

Composition :
- ZOOM sur le problème (pas la maison entière)
- Ambiance : lumière dramatique, impression d'urgence ou de désagrément
- Le spectateur doit penser "Ah oui, ça m'est arrivé" (ou rire si post décalé)

═══════════════════════════════════════════
BRANDING — DISCRET ET EFFICACE
═══════════════════════════════════════════
- Couleurs métier : plomberie=#2D8BC9, electricite=#F8A73C, serrurerie=#E22673, menuiserie=#EF8531, vitrerie=#90C14E, volets=#A23189, pmr=#3C64A2, renovation=#B79D84, general=#37474F
- Logo Help Confort : DISCRET, petit, en bas
- PAS de bandeau massif coloré qui écrase le visuel
- PAS de violet, PAS de couleurs hors charte
- Style : moderne, épuré, professionnel — jamais "template bas de gamme"

═══════════════════════════════════════════
LEAD ENGINE
═══════════════════════════════════════════
- lead_type : urgence, prevention, amelioration, preuve_sociale, saisonnier
- target_intent : besoin_immediat, besoin_latent, curiosite, education
- lead_score 0-100 : >80=problème concret+CTA fort, 60-80=bon angle, <60=trop informatif
- urgency_level : high=panne/fuite/sécurité, medium=confort, low=conseil

STORYTELLING : situation → problème → intervention → résultat/bénéfice
EMOTIONAL TRIGGER : securite, economie, confort, tranquillite, urgence, confiance

═══════════════════════════════════════════
RÈGLE ANTI-MYTHO (CRITIQUE — INTERDICTION ABSOLUE)
═══════════════════════════════════════════
Les visuels sont générés par IA, PAS des vraies photos d'interventions.
Tu ne dois JAMAIS laisser croire qu'une intervention réelle est montrée.

FORMULATIONS STRICTEMENT INTERDITES :
- "Notre agence de Dax a remplacé..."
- "Help Confort Dax" → TOUJOURS utiliser "Help Confort Landes & Pays Basque"
- "Chez Help Confort Dax" → TOUJOURS "Chez Help Confort Landes & Pays Basque"
- Ne JAMAIS mentionner "Dax" seul comme zone — toujours "Landes & Pays Basque"
- "Cet habitant de [ville] avait un problème de..."
- "Intervention réalisée chez un client..."
- "Avant/après d'un remplacement..."
- "Nous avons installé..."
- "Résultat de notre intervention..."
- Toute mention d'un cas client SPÉCIFIQUE présenté comme réel

FORMULATIONS AUTORISÉES :
- "Votre volet ne remonte plus ?" (problème générique)
- "Ce type de fuite est fréquent dans les maisons des Landes"
- "On intervient rapidement dans votre secteur"
- Questions directes au lecteur
- Conseils généraux basés sur l'expertise métier
- Statistiques génériques ("80% des pannes de volets surviennent en hiver")

Le ton est EXPERT et PROCHE, mais JAMAIS mensonger.
On parle de problèmes RÉELS que les gens vivent — sans inventer de faux cas clients.

RÉPARTITION :
- 40% PROBLÈMES CONCRETS (leads directs, urgences)
- 30% CONSEILS EXPERTS (toujours via un problème concret)
- 20% SAISONNIERS (anticipation, prévention)
- 10% CRÉATIF / BRANDING LOCAL (visibilité, proximité)

LOCALISATION :
${agencyZone ? `Zone : ${agencyZone}. Intégrer subtilement la localisation.` : "Adapter avec proximité locale."}
${agencyName ? `Agence : ${agencyName}.` : ''}

PLATFORM VARIANTS :
- Facebook → storytelling + proximité + émotion
- Instagram → visuel choc + caption court + hashtags
- Google Business → problème + solution + zone géo
- LinkedIn → expertise + cas concret + crédibilité

ANTI-RÉPÉTITION (CRITIQUE — 21 JOURS MINIMUM) :
- Jamais 2 posts du même univers métier à moins de 21 jours d'écart
- Jamais 2 posts identiques, jamais le même angle, jamais le même hook
- Si un post "volets" existe fin mars, PAS de post "volets" début avril
- Varier les univers : alterner plomberie, electricite, serrurerie, volets, menuiserie, vitrerie, pmr, renovation
- Espacer les posts régulièrement : ~1 post tous les 1-2 jours

PRIORITÉ CALENDAIRE (CRITIQUE) :
- Les jours fériés, fêtes nationales et événements calendaires DOIVENT TOUS avoir un post
- Chaque événement sert de PRÉTEXTE pour un vrai problème métier
- Le topic_type de ces posts est "awareness_day"
- Ces posts calendaires forment la colonne vertébrale du planning (~50% des posts)

═══════════════════════════════════════════
RAPPEL FINAL
═══════════════════════════════════════════
TU NE CRÉES PAS DU CONTENU. TU CRÉES DES DÉCLENCHEURS D'ACTION.
Chaque post doit faire penser au lecteur : "Tiens, j'ai ce problème chez moi — je les appelle."`;

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

JOURNÉES THÉMATIQUES DU MOIS :
${monthAwareness.map(a => `- ${a.day}/${month}: ${a.label}`).join('\n')}

RÉALISATIONS EXPLOITABLES :
${exploitableReals.length > 0 
  ? exploitableReals.map(r => `- "${r.title}" (ID: ${r.id}, univers: ${r.universe || 'inconnu'}, avant/après: ${r.hasBeforeAfter ? 'oui' : 'non'})`).join('\n')
  : '(aucune)'}

Propose un angle DIFFÉRENT du post précédent, tout en gardant le même contexte thématique.
IMPORTANT : lead_score doit refléter le potentiel réel de conversion client.`;
    } else {
      userPrompt = `Génère ${targetPostCount} suggestions de posts social media PREMIUM pour le mois ${month}/${year}.

═══════════════════════════════════════════
PRIORITÉ N°1 — CALENDRIER & ÉVÉNEMENTS
═══════════════════════════════════════════
CHAQUE journée thématique ci-dessous DOIT générer un post.
Les jours fériés, fêtes et événements calendaires sont la COLONNE VERTÉBRALE du planning éditorial.
Ils servent de PRÉTEXTE pour parler d'un VRAI problème métier (jamais un post informatif neutre).

RÈGLE CRITIQUE — UNIVERS OBLIGATOIRE :
Quand une journée thématique indique un "univers" préféré → tu DOIS utiliser CET univers.
L'univers détermine le badge, la couleur et le picto du visuel final.
Si l'événement a un univers spécifique (plomberie, electricite, serrurerie, volets...), le post DOIT être dans cet univers.
Si l'événement est "general" → utilise "general".

RÈGLE CRITIQUE — COHÉRENCE THÈME / CONTENU :
Le hook, la caption, le visual_prompt et le CTA doivent être EN RAPPORT DIRECT avec l'événement calendaire.
Exemples :
- 1er avril → humour, blagues, pannes insolites, poisson d'avril (PAS un sujet sérieux sans rapport)
- Pâques → famille, recevoir à la maison, préparation (PAS un sujet technique déconnecté)
- Journée de l'eau → fuites, économies d'eau (PAS un problème électrique)
- Halloween → pannes effrayantes, ambiance sombre
Le visual_prompt DOIT illustrer l'ambiance de l'événement, pas un sujet métier générique.

JOURNÉES THÉMATIQUES DU MOIS (TOUTES doivent être couvertes) :
${monthAwareness.map(a => `- ${a.day}/${month}: ${a.label} | UNIVERS OBLIGATOIRE: ${a.preferredUniverses[0]} | tags: ${a.tags.join(', ')}`).join('\n')}

Les posts restants (pour atteindre ${targetPostCount}) doivent compléter avec des problèmes métiers concrets espacés régulièrement dans le mois.

═══════════════════════════════════════════
RÉPARTITION SUR ${targetPostCount} POSTS
═══════════════════════════════════════════
- ~50% CALENDAIRE (jours fériés, fêtes, événements → prétexte problème métier)
- ~25% PROBLÈMES CONCRETS (leads directs, urgences habitat)
- ~15% CONSEILS EXPERTS (valeur ajoutée, toujours via un problème)
- ~10% CRÉATIF / BRANDING LOCAL (visibilité, proximité)

═══════════════════════════════════════════
ANTI-REDONDANCE — GAP MINIMUM 21 JOURS
═══════════════════════════════════════════
Un même univers/thème ne doit PAS apparaître deux fois en moins de 21 jours.
Cela inclut le mois précédent : si un post "volets" existe le 28 du mois dernier,
NE PAS faire de post "volets" avant le 18 du mois cible.
${recentThemesWarning}

SUJETS DÉJÀ EXISTANTS (à ne pas dupliquer) :
${[...existingTopicKeys].join(', ') || '(aucun)'}

RÉALISATIONS EXPLOITABLES :
${exploitableReals.length > 0 
  ? exploitableReals.map(r => `- "${r.title}" (ID: ${r.id}, univers: ${r.universe || 'inconnu'}, avant/après: ${r.hasBeforeAfter ? 'oui' : 'non'})`).join('\n')
  : '(aucune)'}

RAPPEL CRITIQUE :
- MINIMUM ${targetPostCount} posts, répartis sur tout le mois (pas de clusters)
- Chaque post DOIT avoir un hook stop-scroll, un CTA business, un visual_prompt exploitable
- lead_score DOIT refléter le potentiel réel de conversion
- Posts urgence (fuite, panne, sécurité) → lead_score > 80, urgency_level = high
- visual_prompt = scène RÉALISTE habitat français, JAMAIS un fond vide
- JAMAIS inventer de faux cas client ou fausse intervention — rester GÉNÉRAL et EXPERT
- Le topic_type "realisation" est INTERDIT sauf s'il y a de vraies photos (realisation_id valide)
- Espacer les posts de 1-2 jours entre eux, couvrir le mois entier du 1er au dernier jour`;

    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [SUGGEST_TOOL],
        tool_choice: { type: 'function', function: { name: 'generate_social_suggestions' } },
        stream: false,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[social-suggest] AI error:', aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Trop de requêtes, réessayez dans quelques minutes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits IA insuffisants.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Erreur du service IA', details: aiResponse.status }), {
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

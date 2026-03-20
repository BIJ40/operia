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
  /** 1=JAMAIS de métier forcé, 2=angle possible (optionnel), 3=lien direct métier */
  relevanceScore: 1 | 2 | 3;
  /** 1=inspiration/branding, 2=réflexion/amélioration, 3=urgence/besoin immédiat */
  intentScore: 1 | 2 | 3;
  /** Calendar-first angle — determines the editorial approach */
  calendarAngle?: 'interne' | 'image_marque' | 'leger' | 'creatif' | 'disponibilite' | 'metier' | 'prevention' | 'preuve' | 'commercial' | 'emotionnel';
  /** Human-readable usage hint for the AI prompt */
  useHint?: string;
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
    { month: 1, day: 1,  label: "🎉 Nouvel An", tags: ["branding","fete"], contentTypeHint: "image_marque", preferredUniverses: ["general"], ctaHint: "voeux", relevanceScore: 1, intentScore: 1, calendarAngle: 'image_marque' as const, useHint: "voeux, engagement qualité" },
    { month: 1, day: 6,  label: "Épiphanie", tags: ["fete"], contentTypeHint: "leger", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1, calendarAngle: 'leger' as const, useHint: "clin d'œil convivial" },
    { month: 1, day: 10, label: "Vague de froid — protéger ses canalisations du gel", tags: ["urgence","plomberie","hiver"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "urgence_gel", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "gel, canalisations, urgence plomberie" },
    { month: 1, day: 15, label: "⚠️ Prévention gel canalisations", tags: ["eau","urgence","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "urgence_gel", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "prévention gel tuyaux" },
    { month: 1, day: 20, label: "Blue Monday", tags: ["lifestyle"], contentTypeHint: "leger", preferredUniverses: ["general"], ctaHint: "ambiance_maison", relevanceScore: 1, intentScore: 1, calendarAngle: 'leger' as const, useHint: "clin d'œil léger" },
    { month: 1, day: 24, label: "Soldes d'hiver", tags: ["renovation","promo"], contentTypeHint: "commercial", preferredUniverses: ["renovation"], ctaHint: "devis_renovation", relevanceScore: 2, intentScore: 2, calendarAngle: 'commercial' as const, useHint: "offre ciblée rénovation" },
    { month: 1, day: 27, label: "Vérification détecteurs de fumée", tags: ["securite","electricite"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_incendie", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "sécurité incendie" },

    // ════════════════ FÉVRIER ════════════════
    { month: 2, day: 2,  label: "🕯 Chandeleur", tags: ["fete"], contentTypeHint: "leger", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1, calendarAngle: 'leger' as const, useHint: "clin d'œil convivial" },
    { month: 2, day: 10, label: "Journée mondiale de l'énergie", tags: ["energie","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","plomberie"], ctaHint: "audit_energetique", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "économies d'énergie, audit" },
    { month: 2, day: 14, label: "💕 Saint-Valentin", tags: ["fete","lifestyle"], contentTypeHint: "leger", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1, calendarAngle: 'leger' as const, useHint: "confort maison, bien-être" },
    { month: 2, day: 20, label: "Fin d'hiver — bilan chauffage", tags: ["entretien","plomberie","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation"], ctaHint: "bilan_chauffage", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "bilan chauffage, préparation printemps" },
    { month: 2, day: 25, label: "🎭 Carnaval", tags: ["humour","fete"], contentTypeHint: "leger", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1, calendarAngle: 'creatif' as const, useHint: "post décalé assumé" },

    // ════════════════ MARS ════════════════
    { month: 3, day: 8,  label: "👩 Journée des droits des femmes", tags: ["branding","engagement","fete"], contentTypeHint: "interne", preferredUniverses: ["general"], ctaHint: "mise_en_avant_equipe", relevanceScore: 2, intentScore: 1, calendarAngle: 'interne' as const, useHint: "valorisation collaboratrices" },
    { month: 3, day: 12, label: "Début du printemps — check-up plomberie", tags: ["entretien","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "entretien_printemps", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "entretien printemps" },
    { month: 3, day: 15, label: "Journée des consommateurs", tags: ["transparence","qualite"], contentTypeHint: "preuve", preferredUniverses: ["general"], ctaHint: "devis_transparent", relevanceScore: 2, intentScore: 2, calendarAngle: 'preuve' as const, useHint: "transparence, devis clair" },
    { month: 3, day: 20, label: "🌸 Équinoxe de printemps", tags: ["habitat","renovation","entretien"], contentTypeHint: "prevention", preferredUniverses: ["renovation","plomberie","electricite"], ctaHint: "check_up_printemps", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "préparer habitat" },
    { month: 3, day: 22, label: "💧 Journée mondiale de l'eau", tags: ["eau","plomberie","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["plomberie"], ctaHint: "diagnostic_fuite", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "fuite, consommation" },
    { month: 3, day: 25, label: "Semaine du développement durable", tags: ["energie","renovation","environnement"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation","electricite"], ctaHint: "renovation_ecologique", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "rénovation éco-responsable" },
    { month: 3, day: lastSunMarch, label: "🕐 Changement d'heure (été)", tags: ["electricite","volets"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","volets"], ctaHint: "programmateur_volets", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "reprogrammer volets & minuteries" },

    // ════════════════ AVRIL ════════════════
    { month: 4, day: 1,  label: "🐟 Poisson d'avril", tags: ["humour","branding","fete"], contentTypeHint: "creatif", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1, calendarAngle: 'creatif' as const, useHint: "post décalé assumé" },
    { month: 4, day: 7,  label: "Journée de la santé", tags: ["sante","securite"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite","renovation"], ctaHint: "check_up_maison", relevanceScore: 2, intentScore: 2, calendarAngle: 'prevention' as const, useHint: "sécurité logement" },
    { month: 4, day: 11, label: "Journée mondiale Parkinson — adapter le logement PMR", tags: ["pmr","sante","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["pmr"], ctaHint: "adaptation_logement", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "adaptation logement PMR" },
    { month: 4, day: 15, label: "Préparer terrasse & extérieurs", tags: ["habitat","menuiserie","volets"], contentTypeHint: "pedagogique", preferredUniverses: ["menuiserie","volets","renovation"], ctaHint: "amenagement_exterieur", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "aménagement extérieur" },
    { month: easter.month, day: easter.day, label: "🐣 Pâques", tags: ["branding","fete"], contentTypeHint: "disponibilite", preferredUniverses: ["general"], ctaHint: "dispo_jours_feries", relevanceScore: 1, intentScore: 1, calendarAngle: 'disponibilite' as const, useHint: "on reste disponible même les jours fériés" },
    { month: easterMon.month, day: easterMon.day, label: "🐰 Lundi de Pâques", tags: ["fete"], contentTypeHint: "leger", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1, calendarAngle: 'leger' as const, useHint: "week-end prolongé" },
    { month: 4, day: 22, label: "🌍 Jour de la Terre", tags: ["energie","environnement","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation"], ctaHint: "renovation_ecologique", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "rénovation éco-responsable" },
    { month: 4, day: 28, label: "🔒 Journée sécurité au travail", tags: ["securite","electricite","serrurerie","fete"], contentTypeHint: "prevention", preferredUniverses: ["electricite","serrurerie"], ctaHint: "diagnostic_securite", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "sécurité maison et chantier" },

    // ════════════════ MAI ════════════════
    { month: 5, day: 1,  label: "🌷 Fête du travail", tags: ["branding","equipe","fete"], contentTypeHint: "interne", preferredUniverses: ["general"], ctaHint: "engagement_equipe", relevanceScore: 1, intentScore: 1, calendarAngle: 'interne' as const, useHint: "équipe, terrain, hommage techniciens" },
    { month: 5, day: 8,  label: "Victoire 1945", tags: ["branding","fete"], contentTypeHint: "image_marque", preferredUniverses: ["general"], ctaHint: "image_marque", relevanceScore: 1, intentScore: 1, calendarAngle: 'image_marque' as const, useHint: "respect, présence locale" },
    { month: 5, day: 10, label: "Entretien climatisation avant l'été", tags: ["entretien","confort"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite"], ctaHint: "entretien_clim", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "climatisation, entretien" },
    { month: 5, day: 20, label: "Journée mondiale des abeilles", tags: ["vitrerie","environnement","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["vitrerie","menuiserie"], ctaHint: "moustiquaires", relevanceScore: 2, intentScore: 2, calendarAngle: 'metier' as const, useHint: "moustiquaires, fenêtres" },
    { month: 5, day: 25, label: "Fête des mères", tags: ["lifestyle","fete"], contentTypeHint: "leger", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1, calendarAngle: 'leger' as const, useHint: "confort maison" },
    { month: ascension.month, day: ascension.day, label: "🙏 Ascension", tags: ["branding","fete"], contentTypeHint: "disponibilite", preferredUniverses: ["general"], ctaHint: "dispo_jours_feries", relevanceScore: 1, intentScore: 1, calendarAngle: 'disponibilite' as const, useHint: "on reste disponible" },
    { month: pentecote.month, day: pentecote.day, label: "Lundi de Pentecôte", tags: ["branding","fete"], contentTypeHint: "disponibilite", preferredUniverses: ["general"], ctaHint: "dispo_jours_feries", relevanceScore: 1, intentScore: 1, calendarAngle: 'disponibilite' as const, useHint: "service maintenu" },

    // ════════════════ JUIN ════════════════
    { month: 6, day: 1,  label: "Début d'été — préparer volets et stores", tags: ["confort","volets"], contentTypeHint: "prevention", preferredUniverses: ["volets"], ctaHint: "installation_volets", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "volets, stores, protection solaire" },
    { month: 6, day: 5,  label: "🌱 Journée de l'environnement", tags: ["energie","environnement","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","plomberie"], ctaHint: "eco_gestes", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "éco-gestes maison" },
    { month: 6, day: 15, label: "☀️ Premières chaleurs", tags: ["confort","urgence"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite","volets"], ctaHint: "installation_clim", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "fraîcheur, ventilation" },
    { month: 6, day: 15, label: "Fête des pères", tags: ["lifestyle","fete"], contentTypeHint: "leger", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1, calendarAngle: 'leger' as const, useHint: "présence locale" },
    { month: 6, day: 21, label: "🎶 Fête de la musique", tags: ["fete","lifestyle"], contentTypeHint: "leger", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1, calendarAngle: 'leger' as const, useHint: "présence locale" },
    { month: 6, day: 21, label: "☀️ Solstice d'été", tags: ["confort","volets","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["volets","electricite"], ctaHint: "protection_chaleur", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "protection chaleur" },
    { month: 6, day: 25, label: "🔒 Été = vacances : sécurisez", tags: ["securite","serrurerie"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie"], ctaHint: "securisation_vacances", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "sécurisation vacances" },

    // ════════════════ JUILLET ════════════════
    { month: 7, day: 1,  label: "🏖 Départs en vacances — checklist sécurité", tags: ["securite","serrurerie","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie","plomberie"], ctaHint: "checklist_vacances", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "checklist sécurité maison" },
    { month: 7, day: 7,  label: "Canicule — garder la fraîcheur", tags: ["confort","volets","electricite"], contentTypeHint: "prevention", preferredUniverses: ["volets","electricite"], ctaHint: "protection_chaleur", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "canicule, fraîcheur" },
    { month: 7, day: 14, label: "🇫🇷 14 juillet — Fête nationale", tags: ["branding","fete"], contentTypeHint: "image_marque", preferredUniverses: ["general"], ctaHint: "image_marque", relevanceScore: 1, intentScore: 1, calendarAngle: 'image_marque' as const, useHint: "proximité locale" },
    { month: 7, day: 20, label: "Stores & volets contre la canicule", tags: ["confort","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["volets"], ctaHint: "installation_volets", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "volets, isolation thermique" },
    { month: 7, day: 25, label: "Vacances — couper l'eau en partant", tags: ["plomberie","prevention"], contentTypeHint: "pedagogique", preferredUniverses: ["plomberie"], ctaHint: "prevention_degat_eaux", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "dégât des eaux, prévention" },

    // ════════════════ AOÛT ════════════════
    { month: 8, day: 1,  label: "🚨 Urgences estivales — Help Confort reste ouvert", tags: ["urgence","branding"], contentTypeHint: "disponibilite", preferredUniverses: ["general"], ctaHint: "numero_urgence", relevanceScore: 2, intentScore: 3, calendarAngle: 'disponibilite' as const, useHint: "fermeture maison, sécurité vacances" },
    { month: 8, day: 15, label: "🌅 15 août", tags: ["branding","fete"], contentTypeHint: "interne", preferredUniverses: ["general"], ctaHint: "voeux", relevanceScore: 1, intentScore: 1, calendarAngle: 'interne' as const, useHint: "message équipe" },
    { month: 8, day: 20, label: "Fin des vacances — dégâts des eaux ?", tags: ["urgence","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "diagnostic_retour", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "dégâts pendant l'absence" },
    { month: 8, day: 25, label: "📚 Rentrée approche", tags: ["entretien","habitat"], contentTypeHint: "prevention", preferredUniverses: ["renovation","general","electricite"], ctaHint: "preparation_rentree", relevanceScore: 2, intentScore: 2, calendarAngle: 'prevention' as const, useHint: "check logement rentrée" },

    // ════════════════ SEPTEMBRE ════════════════
    { month: 9, day: 1,  label: "📚 Rentrée — révision chauffage", tags: ["entretien","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "revision_chauffage", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "révision chauffage avant hiver" },
    { month: 9, day: 7,  label: "Semaine de la mobilité — accessibilité", tags: ["pmr","habitat","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["pmr"], ctaHint: "adaptation_logement", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "accessibilité logement" },
    { month: 9, day: 15, label: "⚡ Vérifier tableau électrique", tags: ["securite","electricite"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "diagnostic_electrique", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "diagnostic électrique" },
    { month: 9, day: 20, label: "Journées du patrimoine", tags: ["pedagogique","habitat","fete"], contentTypeHint: "image_marque", preferredUniverses: ["renovation","menuiserie"], ctaHint: "entretien_patrimoine", relevanceScore: 2, intentScore: 2, calendarAngle: 'image_marque' as const, useHint: "entretenir c'est préserver" },
    { month: 9, day: 22, label: "🍂 Équinoxe d'automne", tags: ["entretien","habitat","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation","volets"], ctaHint: "preparation_hiver", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "préparer maison pour l'hiver" },

    // ════════════════ OCTOBRE ════════════════
    { month: 10, day: 1,  label: "🧥 Anticiper l'hiver — isolation", tags: ["entretien","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation"], ctaHint: "preparation_hiver", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "isolation, chauffage" },
    { month: 10, day: 1,  label: "Journée des personnes âgées", tags: ["pmr","fete"], contentTypeHint: "interne", preferredUniverses: ["pmr"], ctaHint: "adaptation_logement", relevanceScore: 2, intentScore: 2, calendarAngle: 'interne' as const, useHint: "accessibilité PMR" },
    { month: 10, day: 13, label: "Journée prévention catastrophes naturelles", tags: ["securite","urgence","fete"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite"], ctaHint: "prevention_degats_eaux", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "prévention dégâts" },
    { month: 10, day: lastSunOct, label: "🕐 Changement d'heure (hiver)", tags: ["electricite","volets"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","volets"], ctaHint: "programmateur_volets", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "reprogrammer volets & minuteries" },
    { month: 10, day: 31, label: "🎃 Halloween", tags: ["humour","fete"], contentTypeHint: "creatif", preferredUniverses: ["general"], ctaHint: "engagement_communaute", relevanceScore: 1, intentScore: 1, calendarAngle: 'creatif' as const, useHint: "post fun assumé" },

    // ════════════════ NOVEMBRE ════════════════
    { month: 11, day: 1,  label: "🕯 Toussaint — purge radiateurs", tags: ["entretien","plomberie","fete"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "purge_radiateurs", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "purge radiateurs avant le froid" },
    { month: 11, day: 8,  label: "Semaine qualité de l'air", tags: ["sante","habitat","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","renovation"], ctaHint: "ventilation", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "ventilation, aération" },
    { month: 11, day: 11, label: "11 novembre — Armistice", tags: ["branding","fete"], contentTypeHint: "image_marque", preferredUniverses: ["general"], ctaHint: "image_marque", relevanceScore: 1, intentScore: 1, calendarAngle: 'image_marque' as const, useHint: "respect, présence" },
    { month: 11, day: 15, label: "♿ Journée accessibilité", tags: ["pmr","habitat","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["pmr"], ctaHint: "adaptation_logement", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "adaptation PMR logement" },
    { month: 11, day: 19, label: "Journée mondiale des toilettes", tags: ["plomberie","fete"], contentTypeHint: "pedagogique", preferredUniverses: ["plomberie"], ctaHint: "reparation_wc", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "entretien WC et sanitaires" },
    { month: 11, day: 25, label: "Black Friday", tags: ["promo","commercial"], contentTypeHint: "commercial", preferredUniverses: ["general"], ctaHint: "offre_speciale", relevanceScore: 2, intentScore: 2, calendarAngle: 'commercial' as const, useHint: "offre ciblée" },
    { month: 11, day: 28, label: "Illuminations de Noël — sécurité électrique", tags: ["securite","electricite","noel"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_electrique_noel", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "sécurité électrique Noël" },

    // ════════════════ DÉCEMBRE ════════════════
    { month: 12, day: 1,  label: "❄️ Risques gel canalisations", tags: ["urgence","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "prevention_gel", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "protéger tuyaux du gel" },
    { month: 12, day: 10, label: "🎄 Sécurité électrique Noël", tags: ["securite","electricite","fete"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_electrique_noel", relevanceScore: 3, intentScore: 3, calendarAngle: 'metier' as const, useHint: "sécurité électrique fêtes" },
    { month: 12, day: 21, label: "Solstice d'hiver — isolation & chauffage", tags: ["energie","entretien","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation"], ctaHint: "isolation_hiver", relevanceScore: 3, intentScore: 2, calendarAngle: 'metier' as const, useHint: "isolation, chauffage" },
    { month: 12, day: 25, label: "🎅 Joyeux Noël", tags: ["branding","fete"], contentTypeHint: "emotionnel", preferredUniverses: ["general"], ctaHint: "voeux", relevanceScore: 1, intentScore: 1, calendarAngle: 'emotionnel' as const, useHint: "famille, confort, voeux" },
    { month: 12, day: 31, label: "🥂 Saint-Sylvestre", tags: ["branding","fete"], contentTypeHint: "image_marque", preferredUniverses: ["general"], ctaHint: "voeux", relevanceScore: 1, intentScore: 1, calendarAngle: 'image_marque' as const, useHint: "bilan, projection" },
  ];
}

// Pre-compute for current year (edge function context)
const AWARENESS_DAYS = buildAwarenessDays(new Date().getFullYear());

const NORMALIZED_UNIVERSES = ['plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie', 'renovation', 'volets', 'pmr', 'general'] as const;
const VALID_PLATFORMS = ['facebook', 'instagram', 'google_business', 'linkedin'] as const;
const VALID_TOPIC_TYPES = ['urgence', 'prevention', 'amelioration', 'conseil', 'preuve', 'saisonnier', 'contre_exemple', 'pedagogique', 'prospection', 'calendar'] as const;
const VALID_LEAD_TYPES = ['urgence', 'prevention', 'amelioration', 'preuve_sociale', 'saisonnier'] as const;
const VALID_TARGET_INTENTS = ['besoin_immediat', 'besoin_latent', 'curiosite', 'education'] as const;
const VALID_URGENCY_LEVELS = ['low', 'medium', 'high'] as const;

// ─── Editorial Calendar 2026 (365 days, curated) ───
// Format: [month, day, topic_type, universe, theme]
type CalendarEntry = [number, number, string, string, string];
const EDITORIAL_CALENDAR_2026: CalendarEntry[] = [
  // ════ JANVIER ════
  [1,1,"calendar","general","Vœux de nouvelle année et engagement qualité"],
  [1,2,"urgence","plomberie","Fuite après période de gel"],
  [1,3,"prevention","electricite","Vérifier le tableau après les fêtes"],
  [1,4,"amelioration","volets","Mieux isoler avec des volets bien réglés"],
  [1,5,"conseil","serrurerie","Vérifier fermetures après absence"],
  [1,6,"calendar","general","Épiphanie, confort à la maison en hiver"],
  [1,7,"preuve","renovation","Avant/après rafraîchissement intérieur"],
  [1,8,"contre_exemple","vitrerie","Vitrage mal posé, ce qu'on corrige"],
  [1,9,"pedagogique","pmr","Sécuriser un accès au quotidien"],
  [1,10,"prospection","general","Présentation équipe terrain"],
  [1,11,"urgence","menuiserie","Porte qui frotte ou bloque"],
  [1,12,"prevention","plomberie","Prévenir les dégâts invisibles"],
  [1,13,"amelioration","electricite","Moderniser l'éclairage"],
  [1,14,"conseil","volets","Entretien simple pour éviter la panne"],
  [1,15,"preuve","serrurerie","Remplacement de serrure propre et rapide"],
  [1,16,"saisonnier","renovation","Isolation et confort d'hiver"],
  [1,17,"contre_exemple","electricite","Installation dangereuse à éviter"],
  [1,18,"pedagogique","plomberie","Comprendre la pression d'eau"],
  [1,19,"prospection","general","Zone d'intervention et proximité locale"],
  [1,20,"prospection","general","Devis rapide, sans surprise"],
  [1,21,"urgence","vitrerie","Vitre cassée, réaction rapide"],
  [1,22,"prevention","menuiserie","Entretenir portes et ouvrants"],
  [1,23,"amelioration","pmr","Adapter un logement simplement"],
  [1,24,"conseil","renovation","Bien préparer une remise en peinture"],
  [1,25,"preuve","electricite","Mise en sécurité réussie"],
  [1,26,"saisonnier","plomberie","Gel des canalisations, les bons réflexes"],
  [1,27,"contre_exemple","volets","Volet mal réglé, usure accélérée"],
  [1,28,"pedagogique","serrurerie","Les différences entre serrures"],
  [1,29,"prospection","general","Comment on gagne du temps sur le terrain"],
  [1,30,"prospection","general","Intervention rapide dans votre secteur"],
  [1,31,"urgence","renovation","Réagir après un dégât des eaux"],
  // ════ FÉVRIER ════
  [2,1,"calendar","general","Début de mois, maison prête pour l'hiver finissant"],
  [2,2,"conseil","plomberie","Repérer une petite fuite avant qu'elle coûte"],
  [2,3,"preuve","volets","Déblocage propre sans changer tout le système"],
  [2,4,"prospection","general","Coulisses d'une journée d'intervention"],
  [2,5,"urgence","serrurerie","Clé cassée ou porte bloquée"],
  [2,6,"pedagogique","electricite","Pourquoi un disjoncteur saute"],
  [2,7,"contre_exemple","renovation","Peinture mal préparée, résultat décevant"],
  [2,8,"prospection","general","Pourquoi faire intervenir un pro local"],
  [2,9,"prevention","vitrerie","Vérifier joints et étanchéité"],
  [2,10,"amelioration","menuiserie","Gagner en confort avec de bons réglages"],
  [2,11,"preuve","pmr","Petit aménagement, grand confort"],
  [2,12,"saisonnier","general","L'humidité d'hiver, ne pas la laisser s'installer"],
  [2,13,"calendar","general","Saint-Valentin, mieux vivre chez soi"],
  [2,14,"calendar","general","Maison confortable, esprit tranquille"],
  [2,15,"urgence","plomberie","Siphon, évacuation, fuite soudaine"],
  [2,16,"prospection","general","Nos zones d'intervention en pratique"],
  [2,17,"conseil","electricite","Éviter les surcharges inutiles"],
  [2,18,"preuve","renovation","Réparation discrète et propre"],
  [2,19,"contre_exemple","serrurerie","Serrure mal posée, sécurité réduite"],
  [2,20,"pedagogique","volets","Moteur, lames, réglages : comprendre simplement"],
  [2,21,"prospection","general","Un devis clair change tout"],
  [2,22,"prevention","pmr","Anticiper l'accessibilité utile"],
  [2,23,"amelioration","vitrerie","Lumière et confort avec un vitrage adapté"],
  [2,24,"prospection","general","L'efficacité, c'est aussi l'organisation"],
  [2,25,"urgence","menuiserie","Fenêtre qui ferme mal, agir vite"],
  [2,26,"saisonnier","plomberie","Fin d'hiver : check utile des installations"],
  [2,27,"preuve","electricite","Intervention nette, diagnostic précis"],
  [2,28,"calendar","general","Fin de mois, bilan prévention maison"],
  // ════ MARS ════
  [3,1,"saisonnier","renovation","Préparer le printemps côté habitat"],
  [3,2,"urgence","vitrerie","Impact ou fissure, ne pas attendre"],
  [3,3,"prospection","general","Qui intervient chez vous"],
  [3,4,"conseil","serrurerie","Les bons réflexes avant remplacement"],
  [3,5,"preuve","plomberie","Réparation rapide, sans dégâts supplémentaires"],
  [3,6,"contre_exemple","electricite","Bricolage électrique risqué"],
  [3,7,"pedagogique","general","Ce qu'un diagnostic évite réellement"],
  [3,8,"calendar","general","Mise en avant des femmes de l'équipe"],
  [3,9,"prospection","general","Service local, délais maîtrisés"],
  [3,10,"prevention","volets","Entretenir avant les beaux jours"],
  [3,11,"amelioration","pmr","Confort quotidien par petits aménagements"],
  [3,12,"prospection","general","Notre rayon d'action expliqué simplement"],
  [3,13,"urgence","menuiserie","Porte d'entrée qui ne ferme plus correctement"],
  [3,14,"preuve","renovation","Reprise propre d'une finition ratée"],
  [3,15,"calendar","general","Journée des consommateurs : devis clair et suivi"],
  [3,16,"conseil","plomberie","Petits signes d'alerte à repérer"],
  [3,17,"calendar","general","Saint-Patrick : mieux vaut du vert que des dégâts"],
  [3,18,"contre_exemple","vitrerie","Jointage bâclé, problème garanti"],
  [3,19,"pedagogique","electricite","Comprendre une mise en sécurité"],
  [3,20,"saisonnier","general","Printemps : le bon moment pour vérifier"],
  [3,21,"prospection","general","Planifier avant le rush saisonnier"],
  [3,22,"calendar","plomberie","Journée mondiale de l'eau : fuites et consommation"],
  [3,23,"prevention","serrurerie","Anticiper avant la panne de serrure"],
  [3,24,"amelioration","electricite","Moderniser pour plus de confort"],
  [3,25,"prospection","general","Une intervention efficace, comment ça se joue"],
  [3,26,"urgence","volets","Volet bloqué au mauvais moment"],
  [3,27,"preuve","pmr","Solution simple, vrai confort"],
  [3,28,"contre_exemple","renovation","Sol mal posé, résultat à reprendre"],
  [3,29,"pedagogique","menuiserie","Pourquoi un réglage change tout"],
  [3,30,"conseil","vitrerie","Quand remplacer au lieu de laisser durer"],
  [3,31,"prospection","general","Demander un avis pro avant d'agir"],
  // ════ AVRIL ════
  [4,1,"calendar","general","Poisson d'avril, post créatif assumé"],
  [4,2,"urgence","electricite","Coupure inexpliquée, on sécurise"],
  [4,3,"prospection","general","Une journée type Help Confort"],
  [4,4,"preuve","serrurerie","Dépannage propre sans surpromesse"],
  [4,5,"saisonnier","renovation","Remise en état de printemps"],
  [4,6,"calendar","general","Lundi de Pâques, maison et confort du week-end"],
  [4,7,"calendar","general","Journée santé : sécurité et confort chez soi"],
  [4,8,"conseil","volets","Entretien avant les chaleurs"],
  [4,9,"contre_exemple","plomberie","Raccord bricolé, fuite assurée"],
  [4,10,"pedagogique","vitrerie","Le rôle réel d'un bon vitrage"],
  [4,11,"prospection","general","Pourquoi agir avant la haute saison"],
  [4,12,"prevention","menuiserie","Vérifier ouvrants et fermetures"],
  [4,13,"amelioration","pmr","Rendre le quotidien plus simple"],
  [4,14,"prospection","general","La réactivité, côté organisation"],
  [4,15,"urgence","renovation","Après infiltration, ne laissez pas traîner"],
  [4,16,"preuve","electricite","Reprise nette d'une anomalie"],
  [4,17,"conseil","plomberie","Ce qu'une petite fuite annonce parfois"],
  [4,18,"contre_exemple","volets","Mauvais réglage, usure accélérée"],
  [4,19,"pedagogique","serrurerie","Choisir une serrure adaptée"],
  [4,20,"saisonnier","general","Le printemps, meilleur moment pour anticiper"],
  [4,21,"prospection","general","Un devis simple, une décision plus claire"],
  [4,22,"calendar","general","Journée de la Terre : réparer plutôt que subir"],
  [4,23,"prevention","electricite","Vérifier prises et sécurité"],
  [4,24,"amelioration","vitrerie","Lumière et confort dans l'habitat"],
  [4,25,"prospection","general","Notre terrain d'action dans les Landes"],
  [4,26,"urgence","serrurerie","Porte claquée, réaction utile"],
  [4,27,"preuve","renovation","Réparer proprement un support abîmé"],
  [4,28,"contre_exemple","menuiserie","Pose approximative, mauvais résultat"],
  [4,29,"pedagogique","plomberie","D'où vient vraiment une fuite"],
  [4,30,"conseil","general","Ce qu'il vaut mieux traiter avant mai"],
  // ════ MAI ════
  [5,1,"calendar","general","Fête du Travail, hommage à l'équipe terrain"],
  [5,2,"prospection","general","Nos métiers, notre exigence"],
  [5,3,"prospection","general","Intervention locale, efficacité concrète"],
  [5,4,"calendar","general","Journée créative décalée, visuel assumé"],
  [5,5,"urgence","plomberie","Fuite extérieure ou intérieure, agir vite"],
  [5,6,"preuve","volets","Déblocage sans changer inutilement"],
  [5,7,"conseil","serrurerie","Quand faut-il remplacer ?"],
  [5,8,"calendar","general","Message de respect et présence locale"],
  [5,9,"pedagogique","electricite","Ce que protège un tableau"],
  [5,10,"contre_exemple","renovation","Peinture faite trop vite, résultat raté"],
  [5,11,"prevention","menuiserie","Vérifier avant la pleine saison"],
  [5,12,"amelioration","pmr","Aménager sans gros travaux"],
  [5,13,"prospection","general","Une intervention bien préparée"],
  [5,14,"calendar","general","Ascension : présence, confort, proximité"],
  [5,15,"prospection","general","Pourquoi anticiper ses demandes"],
  [5,16,"urgence","vitrerie","Bris de glace, sécuriser vite"],
  [5,17,"preuve","plomberie","Réparation nette et durable"],
  [5,18,"conseil","volets","Prévenir les blocages d'été"],
  [5,19,"pedagogique","serrurerie","Serrure standard vs renforcée"],
  [5,20,"contre_exemple","electricite","Rallonges, surcharges et danger"],
  [5,21,"prevention","renovation","Préparer un rafraîchissement malin"],
  [5,22,"amelioration","vitrerie","Gagner en confort visuel et thermique"],
  [5,23,"prospection","general","Notre zone d'intervention au quotidien"],
  [5,24,"calendar","general","Message léger de week-end prolongé"],
  [5,25,"calendar","general","Lundi de Pentecôte, présence et service"],
  [5,26,"urgence","menuiserie","Ouvrant bloqué, agir avant aggravation"],
  [5,27,"preuve","pmr","Un aménagement qui change tout"],
  [5,28,"conseil","plomberie","Signes faibles à ne pas ignorer"],
  [5,29,"prospection","general","Demander un pro évite des reprises"],
  [5,30,"pedagogique","general","Pourquoi un bon diagnostic fait gagner du temps"],
  [5,31,"calendar","general","Fête des mères, le confort du foyer d'abord"],
  // ════ JUIN ════
  [6,1,"saisonnier","general","Juin : préparer l'été côté habitat"],
  [6,2,"urgence","electricite","Panne soudaine avant l'été"],
  [6,3,"preuve","renovation","Reprise propre d'un mur dégradé"],
  [6,4,"prospection","general","Comment on limite les délais"],
  [6,5,"calendar","general","Journée environnement : réparer intelligemment"],
  [6,6,"conseil","volets","Bien régler avant les grosses chaleurs"],
  [6,7,"contre_exemple","plomberie","Silicone posé à la va-vite, dégâts ensuite"],
  [6,8,"pedagogique","vitrerie","Pourquoi l'étanchéité compte vraiment"],
  [6,9,"prospection","general","Prendre de l'avance avant juillet"],
  [6,10,"prevention","serrurerie","Vérifier accès et fermetures"],
  [6,11,"amelioration","menuiserie","Plus de confort avec de bons réglages"],
  [6,12,"prospection","general","Une équipe locale, des interventions concrètes"],
  [6,13,"urgence","plomberie","Évacuation bouchée ou lente"],
  [6,14,"preuve","electricite","Mise en sécurité propre et lisible"],
  [6,15,"conseil","renovation","Préparer petits travaux d'été"],
  [6,16,"pedagogique","pmr","Simplifier les déplacements chez soi"],
  [6,17,"contre_exemple","volets","Moteur forcé, panne amplifiée"],
  [6,18,"prevention","vitrerie","Entretenir avant dégradation"],
  [6,19,"amelioration","plomberie","Remplacer un équipement vieillissant"],
  [6,20,"prospection","general","Un devis clair avant de se lancer"],
  [6,21,"calendar","general","Fête de la musique, ambiance maison et confort"],
  [6,22,"prospection","general","Le terrain, notre vraie base"],
  [6,23,"urgence","serrurerie","Serrure capricieuse, ne pas attendre"],
  [6,24,"preuve","volets","Réglage qui prolonge la durée de vie"],
  [6,25,"conseil","electricite","Chaleur et installation : vigilance"],
  [6,26,"pedagogique","renovation","Ce qui fait une finition durable"],
  [6,27,"contre_exemple","menuiserie","Porte posée de travers"],
  [6,28,"prevention","pmr","Prévoir avant d'être contraint"],
  [6,29,"amelioration","vitrerie","Mieux vivre la lumière d'été"],
  [6,30,"prospection","general","Avant les vacances, vérifiez l'essentiel"],
  // ════ JUILLET ════
  [7,1,"saisonnier","general","Départ de l'été, maison prête ?"],
  [7,2,"urgence","vitrerie","Bris de glace en pleine saison"],
  [7,3,"preuve","serrurerie","Intervention rapide, accès rétabli"],
  [7,4,"prospection","general","Comment on couvre le secteur en été"],
  [7,5,"conseil","plomberie","Surveiller les consommations anormales"],
  [7,6,"contre_exemple","electricite","Installation de fortune, danger réel"],
  [7,7,"pedagogique","volets","Pourquoi les volets souffrent en été"],
  [7,8,"prospection","general","Faire intervenir un pro avant le départ"],
  [7,9,"prevention","menuiserie","Vérifier fermetures et accès"],
  [7,10,"amelioration","renovation","Redonner un coup de frais utile"],
  [7,11,"prospection","general","Nos délais quand tout le monde part"],
  [7,12,"urgence","plomberie","Fuite visible, réaction immédiate"],
  [7,13,"preuve","pmr","Aménagement simple, quotidien facilité"],
  [7,14,"calendar","general","Fête nationale, présence locale et service"],
  [7,15,"conseil","serrurerie","Bien sécuriser avant une absence"],
  [7,16,"pedagogique","electricite","Coupure, surcharge, protection : simple"],
  [7,17,"contre_exemple","renovation","Sol mal posé, conséquences visibles"],
  [7,18,"prospection","general","Demandez conseil avant d'improviser"],
  [7,19,"prevention","vitrerie","Étanchéité et chaleur"],
  [7,20,"amelioration","volets","Gagner en confort d'été"],
  [7,21,"prospection","general","Le terrain ne s'arrête pas en juillet"],
  [7,22,"urgence","electricite","Panne gênante en période chaude"],
  [7,23,"preuve","plomberie","Réparation nette, sans reprise inutile"],
  [7,24,"conseil","menuiserie","Quand agir avant déformation"],
  [7,25,"pedagogique","serrurerie","Ce qui protège vraiment un accès"],
  [7,26,"contre_exemple","vitrerie","Vitrage approximatif, problème garanti"],
  [7,27,"prospection","general","Un pro local fait gagner du temps"],
  [7,28,"prevention","pmr","Sécuriser sans attendre le besoin urgent"],
  [7,29,"amelioration","electricite","Moderniser le confort du quotidien"],
  [7,30,"prospection","general","Notre efficacité, vue de l'intérieur"],
  [7,31,"calendar","general","Fin juillet, check avant août"],
  // ════ AOÛT ════
  [8,1,"saisonnier","general","Vacances : la maison doit rester fiable"],
  [8,2,"conseil","serrurerie","Sécuriser avant de partir"],
  [8,3,"preuve","volets","Réglage utile avant surchauffe"],
  [8,4,"prospection","general","Continuité de service en août"],
  [8,5,"urgence","plomberie","Fuite pendant une absence, agir vite"],
  [8,6,"pedagogique","vitrerie","Vitrage et confort d'été"],
  [8,7,"contre_exemple","menuiserie","Fermeture négligée, problème assuré"],
  [8,8,"prospection","general","Un check utile avant départ"],
  [8,9,"prevention","electricite","Vérifier les points sensibles"],
  [8,10,"amelioration","renovation","Entretenir plutôt que subir"],
  [8,11,"prospection","general","Organisation estivale, service maintenu"],
  [8,12,"urgence","serrurerie","Accès bloqué au mauvais moment"],
  [8,13,"preuve","plomberie","Petite fuite, grand soulagement"],
  [8,14,"conseil","volets","Préserver les mécanismes malgré la chaleur"],
  [8,15,"calendar","general","Assomption : présence, proximité, service"],
  [8,16,"pedagogique","electricite","Ce qui met une installation en difficulté"],
  [8,17,"contre_exemple","plomberie","Raccord bricolé = dégâts évitables"],
  [8,18,"prospection","general","Intervention utile avant la rentrée"],
  [8,19,"prevention","pmr","Anticiper le confort d'usage"],
  [8,20,"amelioration","menuiserie","Ajuster pour durer"],
  [8,21,"prospection","general","Notre secteur, vos besoins, notre réponse"],
  [8,22,"urgence","vitrerie","Sécuriser un bris rapidement"],
  [8,23,"preuve","renovation","Reprise propre d'un support abîmé"],
  [8,24,"conseil","electricite","Mieux comprendre avant d'agir"],
  [8,25,"pedagogique","serrurerie","Une serrure n'offre pas toutes la même protection"],
  [8,26,"contre_exemple","volets","Mauvaise pose, panne accélérée"],
  [8,27,"prospection","general","Devis clair avant septembre"],
  [8,28,"prevention","plomberie","Fin d'été, faites le point"],
  [8,29,"amelioration","vitrerie","Plus de confort lumineux"],
  [8,30,"prospection","general","Retour d'expérience terrain"],
  [8,31,"calendar","general","Veille de rentrée, maison prête ?"],
  // ════ SEPTEMBRE ════
  [9,1,"calendar","general","Rentrée : repartir sur de bonnes bases"],
  [9,2,"prevention","electricite","Vérifier l'installation avant reprise du rythme"],
  [9,3,"preuve","serrurerie","Remise en état rapide et nette"],
  [9,4,"prospection","general","L'efficacité se prépare"],
  [9,5,"conseil","plomberie","Un contrôle utile après l'été"],
  [9,6,"contre_exemple","renovation","Finitions bâclées, reprises inévitables"],
  [9,7,"pedagogique","volets","Pourquoi l'entretien évite les blocages"],
  [9,8,"prospection","general","Le bon moment pour planifier"],
  [9,9,"urgence","menuiserie","Ouvrant qui force, agir avant casse"],
  [9,10,"amelioration","pmr","Confort et autonomie à domicile"],
  [9,11,"prospection","general","Notre zone d'intervention, concrètement"],
  [9,12,"prevention","vitrerie","Étanchéité et confort de saison"],
  [9,13,"preuve","plomberie","Réparation propre, problème stoppé"],
  [9,14,"conseil","serrurerie","Quand remplacer plutôt que subir"],
  [9,15,"pedagogique","electricite","À quoi sert réellement une mise en sécurité"],
  [9,16,"contre_exemple","menuiserie","Réglage oublié, gêne au quotidien"],
  [9,17,"prospection","general","Un avis pro avant les gros frais"],
  [9,18,"urgence","volets","Volet bloqué, confort et sécurité touchés"],
  [9,19,"amelioration","renovation","Rénover malin, sans excès"],
  [9,20,"prospection","general","Ce qui fait gagner du temps à nos clients"],
  [9,21,"saisonnier","general","Automne qui arrive : anticiper"],
  [9,22,"calendar","general","Changement de saison, check habitat"],
  [9,23,"prevention","pmr","Sécuriser les usages quotidiens"],
  [9,24,"preuve","vitrerie","Intervention discrète, résultat visible"],
  [9,25,"conseil","electricite","Éviter les mauvaises surprises"],
  [9,26,"pedagogique","plomberie","D'où viennent certaines surconsommations"],
  [9,27,"contre_exemple","serrurerie","Pose légère, sécurité limitée"],
  [9,28,"prospection","general","Avant l'automne, mieux vaut agir"],
  [9,29,"urgence","renovation","Infiltration : ne laissez pas durer"],
  [9,30,"prospection","general","Fin de mois, bilan terrain"],
  // ════ OCTOBRE ════
  [10,1,"calendar","pmr","Accessibilité et confort du quotidien"],
  [10,2,"conseil","menuiserie","Vérifier avant humidité et froid"],
  [10,3,"preuve","electricite","Mise en ordre et sécurité retrouvée"],
  [10,4,"prospection","general","Les interventions qui changent le quotidien"],
  [10,5,"urgence","plomberie","Fuite masquée, dégâts possibles"],
  [10,6,"pedagogique","vitrerie","Condensation, vitrage, confort"],
  [10,7,"contre_exemple","renovation","Sol mal préparé, résultat fragile"],
  [10,8,"prospection","general","Faire vérifier avant l'hiver"],
  [10,9,"prevention","serrurerie","Sécuriser accès et fermetures"],
  [10,10,"amelioration","volets","Préparer la saison froide"],
  [10,11,"prospection","general","Notre secteur, votre proximité"],
  [10,12,"preuve","plomberie","Réparer vite sans masquer le problème"],
  [10,13,"conseil","electricite","Quand un signe n'est pas normal"],
  [10,14,"pedagogique","menuiserie","Ce qu'un bon réglage change réellement"],
  [10,15,"contre_exemple","vitrerie","Étanchéité mal traitée, souci garanti"],
  [10,16,"prospection","general","Un professionnel évite des reprises"],
  [10,17,"urgence","serrurerie","Accès bloqué, solution rapide"],
  [10,18,"amelioration","pmr","Mieux vivre chez soi, simplement"],
  [10,19,"prospection","general","Notre organisation sur le terrain"],
  [10,20,"saisonnier","general","L'hiver se prépare maintenant"],
  [10,21,"prevention","renovation","Anticiper avant humidité et froid"],
  [10,22,"preuve","volets","Réglage propre, résultat durable"],
  [10,23,"conseil","plomberie","Les signes d'une faiblesse à traiter"],
  [10,24,"pedagogique","serrurerie","Ce qui compte vraiment pour sécuriser"],
  [10,25,"calendar","volets","Changement d'heure : volets et automatismes"],
  [10,26,"contre_exemple","electricite","Multiprises et surcharge, vrai risque"],
  [10,27,"prospection","general","Avant le rush d'hiver, planifiez"],
  [10,28,"urgence","vitrerie","Sécuriser sans attendre"],
  [10,29,"prospection","general","Coulisses d'une intervention rapide"],
  [10,30,"calendar","general","Halloween, créatif assumé et léger"],
  [10,31,"calendar","general","Message de saison, confort et sécurité"],
  // ════ NOVEMBRE ════
  [11,1,"calendar","general","Toussaint, présence locale et service"],
  [11,2,"prevention","plomberie","Vérifier avant les vrais froids"],
  [11,3,"preuve","renovation","Reprise soignée d'un support dégradé"],
  [11,4,"prospection","general","Réactivité : ce qui se joue avant le chantier"],
  [11,5,"conseil","volets","Préserver le fonctionnement en hiver"],
  [11,6,"pedagogique","electricite","Ce qui provoque certaines pannes"],
  [11,7,"contre_exemple","serrurerie","Sécurité mal traitée, faux sentiment de protection"],
  [11,8,"prospection","general","Agir maintenant plutôt qu'en urgence"],
  [11,9,"urgence","menuiserie","Porte ou fenêtre qui ne tient plus"],
  [11,10,"amelioration","pmr","Adapter sans alourdir les travaux"],
  [11,11,"calendar","general","Armistice, message de respect et présence"],
  [11,12,"prospection","general","Ce qui fait notre efficacité au quotidien"],
  [11,13,"prevention","vitrerie","Étanchéité, confort et saison froide"],
  [11,14,"preuve","plomberie","Réparation nette, fuite stoppée"],
  [11,15,"conseil","electricite","Petits signes, vrais risques"],
  [11,16,"pedagogique","renovation","Comprendre une bonne remise en état"],
  [11,17,"contre_exemple","volets","Pose approximative, panne accélérée"],
  [11,18,"prospection","general","Un avis pro avant de dépenser"],
  [11,19,"urgence","serrurerie","Serrure usée, blocage imminent"],
  [11,20,"amelioration","vitrerie","Plus de confort intérieur"],
  [11,21,"prospection","general","Nos zones d'intervention, votre secteur"],
  [11,22,"saisonnier","general","Préparer l'hiver sans stress"],
  [11,23,"prevention","pmr","Sécuriser avant d'être obligé"],
  [11,24,"preuve","electricite","Mise en sécurité réussie"],
  [11,25,"conseil","plomberie","Quand une consommation doit alerter"],
  [11,26,"pedagogique","serrurerie","Renforcer un accès, ce que ça change"],
  [11,27,"calendar","general","Black Friday : mieux vaut bien faire que refaire"],
  [11,28,"prospection","general","Diagnostic rapide, décision plus simple"],
  [11,29,"urgence","renovation","Après infiltration, agir sans attendre"],
  [11,30,"prospection","general","Fin novembre, bilan terrain et réactivité"],
  // ════ DÉCEMBRE ════
  [12,1,"saisonnier","general","Décembre : sécuriser et anticiper"],
  [12,2,"conseil","serrurerie","Penser aux accès avant les fêtes"],
  [12,3,"preuve","electricite","Intervention propre avant l'hiver"],
  [12,4,"prospection","general","Organisation de fin d'année"],
  [12,5,"urgence","plomberie","Fuite ou gel, agir vite"],
  [12,6,"pedagogique","vitrerie","Le vitrage face au froid"],
  [12,7,"contre_exemple","renovation","Finition de dernière minute, mauvais pari"],
  [12,8,"prospection","general","Faire vérifier avant les congés"],
  [12,9,"prevention","volets","Préserver les mécanismes en saison froide"],
  [12,10,"amelioration","pmr","Plus de confort pendant les fêtes"],
  [12,11,"prospection","general","Être présent quand il faut"],
  [12,12,"preuve","plomberie","Réparer vite, réparer bien"],
  [12,13,"conseil","electricite","Ce qu'il faut surveiller en hiver"],
  [12,14,"pedagogique","menuiserie","Pourquoi un ouvrant fatigue"],
  [12,15,"contre_exemple","serrurerie","Sécurité vite faite, mauvais résultat"],
  [12,16,"prospection","general","Avant les congés, mieux vaut agir"],
  [12,17,"urgence","vitrerie","Sécuriser un bris sans attendre"],
  [12,18,"amelioration","renovation","Remettre en état avant de recevoir"],
  [12,19,"prospection","general","Nos équipes, votre tranquillité"],
  [12,20,"calendar","general","Préparer sereinement les fêtes"],
  [12,21,"calendar","general","Entrée dans l'hiver, vigilance utile"],
  [12,22,"prevention","plomberie","Protéger avant le gel"],
  [12,23,"preuve","volets","Réglage utile avant fermeture prolongée"],
  [12,24,"calendar","general","Veille de Noël, confort et sérénité"],
  [12,25,"calendar","general","Noël, message chaleureux et présence"],
  [12,26,"prospection","general","Même en période creuse, on reste mobilisés"],
  [12,27,"conseil","serrurerie","Vérifier après les déplacements et visites"],
  [12,28,"pedagogique","electricite","Pourquoi un simple contrôle aide vraiment"],
  [12,29,"contre_exemple","plomberie","Une petite fuite ignorée tout l'hiver"],
  [12,30,"prospection","general","Bien démarrer l'année sans problème latent"],
  [12,31,"calendar","general","Bilan, remerciements, cap sur 2027"],
];

// ─── Lookup editorial calendar for a given month ───
interface DaySchedule { day: number; category: string; universe: string; theme: string; isCalendar: boolean }

function buildEditorialSchedule(month: number, _year: number): DaySchedule[] {
  const entries = EDITORIAL_CALENDAR_2026.filter(e => e[0] === month);
  return entries.map(([_m, day, category, universe, theme]) => ({
    day,
    category,
    universe,
    theme,
    isCalendar: category === 'calendar',
  }));
}

// Keep shuffleArray for other uses
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Legacy fallback — only used if editorial calendar has no entry for a day
const WEEKLY_CATEGORIES = ['urgence', 'prevention', 'amelioration', 'conseil', 'preuve', 'contre_exemple', 'pedagogique', 'prospection'] as const;

function buildWeeklySchedule(daysInMonth: number, year: number, month: number): DaySchedule[] {
  // Primary: use editorial calendar
  const editorial = buildEditorialSchedule(month, year);
  if (editorial.length >= daysInMonth) return editorial;
  
  // Fallback: fill missing days with random categories
  const coveredDays = new Set(editorial.map(e => e.day));
  let weekPool: string[] = [];
  const result = [...editorial];
  
  for (let d = 1; d <= daysInMonth; d++) {
    if (coveredDays.has(d)) continue;
    if (weekPool.length === 0) {
      weekPool = shuffleArray([...WEEKLY_CATEGORIES]);
    }
    result.push({ day: d, category: weekPool.shift()!, universe: 'general', theme: '', isCalendar: false });
  }
  return result.sort((a, b) => a.day - b.day);
}

// ─── Universe rotation rules ───
const UNIVERSE_RULES = {
  minGapDays: 3,
  maxPerWeek: 2,
  maxPerMonth: 4, // Reduced from 6 to force more diversity
};

// ─── Format distribution ───
const FORMAT_DISTRIBUTION = {
  punchline: 20, // hook seul
  court: 30,     // hook + CTA
  moyen: 40,     // hook + 1 phrase + CTA
  long: 10,      // hook + 2 phrases + CTA
};

// ─── Fatigue score (anti-repetition perçue) ───
function computeFatigueScore(
  current: { universe: string; topic_type: string; hook: string },
  recent: { universe: string; topic_type: string; hook: string }[],
): number {
  let score = 0;
  const last3 = recent.slice(-3);
  
  // Same universe in last 2 posts
  if (last3.length > 0 && last3[last3.length - 1].universe === current.universe) score += 2;
  if (last3.length > 1 && last3[last3.length - 2].universe === current.universe) score += 1;
  
  // Same intent/category in last post
  if (last3.length > 0 && last3[last3.length - 1].topic_type === current.topic_type) score += 2;
  
  // Similar hook pattern (first 3 words match)
  const currentStart = current.hook.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
  for (const r of last3) {
    const rStart = r.hook.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
    if (currentStart === rStart) score += 3;
  }
  
  return score;
}

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
  weeklySchedule?: DaySchedule[],
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

    // 2. topic_type and universe — EDITORIAL CALENDAR FIRST
    let topicType = (VALID_TOPIC_TYPES as readonly string[]).includes(s.topic_type) ? s.topic_type : 'conseil';
    const actualDay = parseInt(date.split('-')[2]);
    
    // Look up editorial calendar for this day
    const editorialEntry = weeklySchedule?.find(ws => ws.day === actualDay);
    
    if (editorialEntry) {
      // Editorial calendar overrides both topic_type and universe
      if ((VALID_TOPIC_TYPES as readonly string[]).includes(editorialEntry.category)) {
        topicType = editorialEntry.category;
      }
    }

    // 3. topic_key dedup
    const topicKey = String(s.topic_key || `${topicType}_${date}`);
    if (seenTopicKeys.has(topicKey) || existingTopicKeys.has(topicKey)) continue;
    seenTopicKeys.add(topicKey);

    // 4. universe — editorial calendar is the source of truth
    let universe = (NORMALIZED_UNIVERSES as readonly string[]).includes(s.universe) ? s.universe : 'general';
    if (editorialEntry && editorialEntry.universe && (NORMALIZED_UNIVERSES as readonly string[]).includes(editorialEntry.universe)) {
      universe = editorialEntry.universe;
    }
    // Force general for prospection (always)
    if (topicType === 'prospection') {
      universe = 'general';
    }

    // 5. realisation_id — OBLIGATOIRE pour "preuve", on force une réalisation réelle
    let realisationId: string | null = null;
    if ((topicType === 'realisation' || topicType === 'preuve') && s.realisation_id && validRealisationIds.has(s.realisation_id)) {
      realisationId = s.realisation_id;
    }
    // If preuve but no valid realisation → reject this suggestion
    if (topicType === 'preuve' && !realisationId) {
      console.warn(`[validateSuggestions] Preuve post "${s.topic_key}" rejected: no valid realisation_id`);
      continue; // skip this suggestion entirely
    }

    // 6. caption — strip structural labels (HOOK:, CTA:, etc.)
    let captionBase = String(s.caption_base_fr || '').substring(0, 2000);
    captionBase = captionBase
      .replace(/^HOOK\s*[:：]\s*/gim, '')
      .replace(/\nHOOK\s*[:：]\s*/gim, '\n')
      .replace(/\nSOUS[- ]?TEXTE\s*[:：]\s*/gim, '\n')
      .replace(/\nCTA\s*[:：]\s*/gim, '\n')
      .replace(/\nACCROCHE\s*[:：]\s*/gim, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (captionBase.length < 10) continue;

    // 7. title
    const title = String(s.title || '').substring(0, 200);
    if (title.length < 3) continue;

    // 8. hashtags — normalize: ensure single # prefix, no ##
    const hashtags = Array.isArray(s.hashtags)
      ? s.hashtags
          .filter((h: any) => typeof h === 'string' && h.length > 0)
          .map((h: string) => {
            const clean = h.replace(/^#+/, '');
            return clean ? `#${clean}` : '';
          })
          .filter((h: string) => h.length > 1)
          .slice(0, 10)
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

  // ─── Anti-fatigue: universe gap enforcement ───
  // Rule 1: no 2 consecutive same universe
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

  // Rule 2: fatigue score — reject and swap posts with high fatigue
  const finalResult: ValidatedSuggestion[] = [];
  for (const post of result) {
    const recent = finalResult.slice(-3).map(p => ({
      universe: p.universe,
      topic_type: p.topic_type,
      hook: p.hook,
    }));
    const fatigue = computeFatigueScore(
      { universe: post.universe, topic_type: post.topic_type, hook: post.hook },
      recent,
    );
    if (fatigue > 3) {
      // Try to find a better candidate later in the array
      const betterIdx = result.indexOf(post) + 1;
      let swapped = false;
      for (let k = betterIdx; k < result.length; k++) {
        const candidate = result[k];
        const candFatigue = computeFatigueScore(
          { universe: candidate.universe, topic_type: candidate.topic_type, hook: candidate.hook },
          recent,
        );
        if (candFatigue <= 3 && !finalResult.includes(candidate)) {
          finalResult.push(candidate);
          swapped = true;
          break;
        }
      }
      if (!swapped) finalResult.push(post); // no better option, keep it
    } else {
      finalResult.push(post);
    }
  }

  // Rule 3: max per month universe enforcement — ACTIVELY redistribute excess
  const universeCounts: Record<string, number> = {};
  for (const p of finalResult) {
    universeCounts[p.universe] = (universeCounts[p.universe] || 0) + 1;
  }

  // Find universes that are under-represented for redistribution
  const allSpecificUniverses = ['plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie', 'renovation', 'volets', 'pmr'];
  const underUsed = allSpecificUniverses.filter(u => (universeCounts[u] || 0) < 2);

  for (let i = 0; i < finalResult.length; i++) {
    const p = finalResult[i];
    if (p.universe === 'general') continue; // general is always OK
    const count = universeCounts[p.universe] || 0;
    if (count > UNIVERSE_RULES.maxPerMonth) {
      // Find an under-used universe to reassign
      if (underUsed.length > 0) {
        const newUni = underUsed.shift()!;
        console.log(`[social-suggest] Redistributing "${p.universe}" → "${newUni}" (was ${count}x, max ${UNIVERSE_RULES.maxPerMonth})`);
        universeCounts[p.universe]--;
        universeCounts[newUni] = (universeCounts[newUni] || 0) + 1;
        finalResult[i] = { ...p, universe: newUni };
      } else {
        // Fallback to general
        console.log(`[social-suggest] Redistributing "${p.universe}" → "general" (was ${count}x, max ${UNIVERSE_RULES.maxPerMonth})`);
        universeCounts[p.universe]--;
        universeCounts['general'] = (universeCounts['general'] || 0) + 1;
        finalResult[i] = { ...p, universe: 'general' };
      }
    }
  }

  return finalResult;
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
              caption_base_fr: { type: 'string', description: "Texte NATUREL prêt à publier sur les réseaux sociaux. INTERDIT d'écrire 'HOOK :', 'CTA :', 'SOUS-TEXTE :' ou tout label structurel. Le texte doit être fluide, comme un vrai post Facebook/Instagram. Exemple : 'Votre robinet fuit depuis des semaines ? Chaque jour, c est 40€ de plus sur votre facture. Appelez-nous, on intervient en 1h.'" },
              cta: { type: 'string', description: "CTA court et GÉNÉRIQUE (jamais de nom de ville). Ex: \"Prendre RDV\", \"En savoir plus\", \"Demander un devis\", \"Nous contacter\"" },
              hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags (max 10). Chaque hashtag DOIT commencer par UN SEUL # (jamais ##). Ex: ["#plomberie", "#chauffage", "#depannage"]' },
              topic_type: { type: 'string', enum: ['urgence', 'prevention', 'amelioration', 'conseil', 'preuve', 'saisonnier', 'contre_exemple', 'pedagogique', 'prospection', 'calendar'] },
              topic_key: { type: 'string', description: 'Identifiant unique du sujet' },
              visual_type: { type: 'string', enum: ['photo', 'illustration', 'before_after', 'quote'] },
              universe: { type: 'string', enum: ['plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie', 'renovation', 'volets', 'pmr', 'general'] },
              realisation_id: { type: 'string', description: 'UUID de la réalisation liée ou null' },
              storytelling_type: { type: 'string', enum: ['situation_probleme_solution', 'avant_apres', 'temoignage_client', 'conseil_technicien', 'prevention_urgence', 'proximite_locale'] },
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
    // ─── Filter awareness days by relevance (CALENDAR_STRATEGY) ───
    const allMonthAwareness = AWARENESS_DAYS.filter(d => d.month === month);
    // relevance 3 = lien métier direct (contenu technique)
    // relevance 2 = angle possible (optionnel, soft business)
    // relevance 1 = JAMAIS de métier → topic_type=calendar, angle humain/image/léger
    const pertinentEvents = allMonthAwareness.filter(d => d.relevanceScore === 3);
    const optionalEvents = allMonthAwareness.filter(d => d.relevanceScore === 2);
    const calendarOnlyEvents = allMonthAwareness.filter(d => d.relevanceScore === 1);
    
    // ANGLE MAPPING for calendar-only events
    const ANGLE_DESCRIPTIONS: Record<string, string> = {
      interne: 'ANGLE INTERNE — équipe, terrain, coulisses, valorisation collaborateurs',
      image_marque: 'ANGLE IMAGE DE MARQUE — crédibilité, présence locale, sérieux, proximité',
      leger: 'ANGLE LÉGER — clin d\'œil, message simple, présence de marque sans vente',
      creatif: 'ANGLE CRÉATIF — post décalé/fun assumé, humour, visuel original',
      disponibilite: 'ANGLE DISPONIBILITÉ — "on reste disponibles", service 7j/7',
      emotionnel: 'ANGLE ÉMOTIONNEL — famille, confort, chaleur humaine',
      commercial: 'ANGLE COMMERCIAL — offre ciblée, promo (uniquement si pertinent)',
      prevention: 'ANGLE PRÉVENTION — check logement, sécurité (soft, pas technique)',
      preuve: 'ANGLE PREUVE — transparence, qualité, confiance',
      metier: 'ANGLE MÉTIER — contenu technique direct',
    };
    
    console.log(`[social-suggest] Month ${month}: ${pertinentEvents.length} métier direct, ${optionalEvents.length} optionnel, ${calendarOnlyEvents.length} calendaire pur (topic_type=calendar)`);

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

    // ─── Cross-month universe gap detection (3 days) ───
    const prevMonthDate = new Date(year, month - 2, 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const daysInPrevMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
    const cutoffDay = daysInPrevMonth - 3; // only last 3 days of prev month (universe gap = 3 days)

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

    const recentThemesWarning = recentPrevUniverses.length > 0
      ? `\n\nTHÈMES RÉCENTS DU MOIS PRÉCÉDENT (gap minimum 3 jours) :\n${recentPrevUniverses.map(r => `- ${r.date}: univers "${r.universe}"`).join('\n')}\nSi un univers apparaît ici, NE PAS le réutiliser dans les 3 premiers jours du mois cible.`
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
    const daysInMonth = new Date(year, month, 0).getDate();
    const targetPostCount = regenerateSingle ? 1 : isTargetDatesMode ? targetDates.length : daysInMonth;
    
    // Build weekly schedule for full month generation
    const weeklySchedule = buildWeeklySchedule(daysInMonth, year, month);

    // ─── AI Generation (OpenAI + Claude fallback) ──────────────────────────────
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY non configurée' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build hook library for the current month's season (1000+ hooks)
    const currentSeason = getSeasonFromMonth(month);
    const hookLibraryPrompt = buildHookLibraryPrompt(month);
    const totalHooks = getFullHookLibrary().length;
    console.log(`[social-suggest] Hook library: ${totalHooks} hooks available, season: ${currentSeason}`);

    const systemPrompt = `Tu es un copywriter spécialisé en conversion locale pour HelpConfort (dépannage & rénovation habitat).

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
8 CATÉGORIES DE POSTS (topic_type)
═══════════════════════════════════════════
Chaque post DOIT avoir un topic_type parmi :

1. "urgence" — fuite, panne, casse, sécurité (~6 posts/mois)
2. "prevention" — éviter une panne, anticiper (~4 posts)
3. "amelioration" — confort, esthétique, valorisation (~4 posts)
4. "conseil" — tips concrets, utiles, actionnables (~3 posts)
5. "preuve" — OBLIGATOIREMENT basé sur une VRAIE réalisation (réalisation_id requis). Intervention rapide, savoir-faire technicien, avant/après RÉEL, témoignage. INTERDIT de générer du contenu inventé pour cette catégorie. (~3 posts, uniquement si des réalisations existent)
6. "saisonnier" — météo réelle, période (~3 posts)
7. "contre_exemple" — erreur fréquente, "ce qu'il ne faut pas faire", contraste technicien vs bricoleur (~3 posts)
8. "pedagogique" — schéma, chiffre clé, "le saviez-vous ?", valeur immédiate (~3 posts)
9. "prospection" — CONTENU COMMERCIAL & MARQUE, PAS du terrain (~4 posts/mois, ~1/semaine)

═══════════════════════════════════════════
CATÉGORIE "PROSPECTION" — DÉTAIL OBLIGATOIRE
═══════════════════════════════════════════
Cette catégorie est DIFFÉRENTE de toutes les autres. Elle ne parle PAS de problème métier.
Elle présente L'ENTREPRISE, L'ÉQUIPE, LA ZONE et LES MÉTIERS sous un angle HUMAIN et COMMERCIAL.

SOUS-TYPES OBLIGATOIRES (varier chaque semaine, ne JAMAIS répéter le même sous-type 2 semaines de suite) :

a) ZONE D'INTERVENTION — "On intervient dans tout le Sud-Landes et Pays Basque"
   Exemples : carte mentale des villes couvertes, "De Capbreton à Mont-de-Marsan, on est là", distances d'intervention
   visual_prompt : carte stylisée du sud-ouest avec points d'intervention, ou paysage landais avec véhicule HC

b) PANORAMA MÉTIERS — Présenter L'ENSEMBLE des métiers en un seul post
   Exemples : "8 métiers, 1 seul interlocuteur", "Plomberie, électricité, serrurerie... on fait tout"
   visual_prompt : mosaïque de scènes métier ou infographie colorée avec icônes métier

c) PARTENAIRES & PRESCRIPTEURS — Cibler les apporteurs d'affaires
   Exemples : "Assurances, syndics, agences immo : ils nous font confiance", "Vous gérez des biens ? On est votre bras droit"
   visual_prompt : poignée de main professionnelle, bureaux, ambiance corporate

d) PRÉSENTATION ÉQUIPE — Coulisses humaines de l'entreprise
   Exemples : "Notre équipe de techniciens intervient 7j/7", "Derrière chaque intervention, une équipe formée et engagée"
   Sous-angles : nombre de techniciens, formations, esprit d'équipe, journée type d'un technicien, valeurs humaines
   visual_prompt : équipe en tenue de travail devant véhicules, atelier, réunion d'équipe, technicien souriant

e) ENGAGEMENT & VALEURS — Ce qui différencie Help Confort
   Exemples : "Réactivité, propreté, suivi : nos 3 engagements", "Pourquoi nos clients nous rappellent"
   Sous-angles : certifications, charte qualité, garantie satisfaction, suivi client, propreté chantier
   visual_prompt : check-list qualité, véhicule propre et équipé, technicien avec EPI

f) COMMERCIAL CRÉATIF — Surprendre et humaniser
   Exemples : chiffre clé ("2847 interventions cette année"), coulisses, véhicules de la flotte, anecdotes terrain
   visual_prompt : chiffres en grand sur fond coloré, véhicule HC en action, coulisses atelier

RÈGLES PROSPECTION :
- universe = "general" (TOUJOURS, pas de métier spécifique)
- storytelling_type = "proximite_locale" ou "temoignage_client"
- lead_type = "preuve_sociale"
- Le CTA peut être "Découvrir nos services", "Devenir partenaire", "Nous contacter", "Rejoindre l'équipe"
- Ces posts sont DIFFÉRENTS visuellement : plus corporate, plus chaleureux, plus marque
- Le hook peut être plus doux (pas besoin de "choc") : question ouverte, chiffre impressionnant, affirmation de valeur
- La PRESSION CONVERSION est ALLÉGÉE pour cette catégorie : l'objectif est la NOTORIÉTÉ et la CONFIANCE, pas l'action immédiate

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
- LinkedIn → savoir-faire technicien + cas concret + crédibilité

ANTI-RÉPÉTITION & ANTI-FATIGUE (CRITIQUE — MODE DAILY CONTENT) :
- Pas 2 posts consécutifs même univers
- Pas 2 posts consécutifs même catégorie (topic_type)
- Même univers (hors general) : gap minimum 3 jours, max 2 par semaine, MAX 4 PAR MOIS
- Variation obligatoire du ton : alterner question, affirmation, alerte, conseil, chiffre
- Si un post ressemble trop au précédent → REJETER ET REFAIRE
- Varier les univers : alterner plomberie, electricite, serrurerie, volets, menuiserie, vitrerie, pmr, renovation
- MINIMUM 4 posts "prospection" par mois (1 par semaine), répartis sur les sous-types : zone, métiers, équipe, partenaires, valeurs, créatif
- 1 post par jour, couvrir le mois entier

FORMAT DES POSTS (variation obligatoire) :
- 20% PUNCHLINE : hook seul (pas de sous-texte, pas de CTA dans le visuel)
- 30% COURT : hook + CTA (pas de sous-texte)
- 40% MOYEN : hook + 1 phrase sous-texte + CTA
- 10% LONG : hook + 2 phrases sous-texte + CTA

═══════════════════════════════════════════
STRATÉGIE CALENDAIRE (CRITIQUE)
═══════════════════════════════════════════
Les journées spéciales sont traitées selon leur NIVEAU DE PERTINENCE MÉTIER :

- relevance 3 → contenu métier DIRECT. Le thème calendaire EST le sujet métier (ex: Journée de l'eau → plomberie).
- relevance 2 → angle utile OU prévention. L'événement sert de PRÉTEXTE à un angle métier soft.
- relevance 1 → topic_type = "calendar". AUCUN contenu métier forcé. Post HUMAIN, IMAGE DE MARQUE ou LÉGER uniquement.

INTERDICTION ABSOLUE pour relevance 1 :
- forcer un lien métier
- transformer une fête en post commercial
- ajouter un conseil technique hors contexte
- mentionner travaux, rénovation, dépannage

MAPPING ANGLE → CONTENU (pour les jours calendaires relevance 1) :
- interne → équipe, terrain, coulisses, valorisation
- image_marque → crédibilité, présence locale, sérieux
- leger → clin d'œil, message simple, présence de marque
- creatif → visuel fun/décalé assumé
- disponibilite → "même les jours fériés, on est là"
- emotionnel → famille, confort, chaleur humaine

PRIORITÉ GLOBALE :
1. Si jour calendaire relevance 1 → calendrier IMPOSE le sujet
2. Si jour calendaire relevance 2 → angle métier soft possible
3. Si jour calendaire relevance 3 → contenu métier direct
4. Sinon → post métier classique selon la rotation

═══════════════════════════════════════════
RAPPEL FINAL — RESPECT DES CATÉGORIES
═══════════════════════════════════════════
Tu crées des PUBLICITÉS qui déclenchent des ACTIONS.
Pour "urgence", "prevention", "amelioration" : hook choc → bénéfice clair → CTA direct.
Pour "pedagogique" : contenu UTILE + valeur immédiate → CTA doux.
Pour "conseil" : tip pratique + actionnable → CTA.
Pour "contre_exemple" : erreur fréquente + contraste pro → CTA.
Pour "prospection" : PAS de problème technique. Présente l'ÉQUIPE, la ZONE, les MÉTIERS, les VALEURS, les PARTENAIRES. Ton chaleureux et corporate. → CTA découverte/contact. VARIE les sous-types chaque semaine (zone, équipe, métiers, valeurs, partenaires, créatif).
Pour "preuve" : OBLIGATOIREMENT lié à une VRAIE réalisation (realisation_id REQUIS). Utilise les photos réelles avant/après. visual_type DOIT être "before_after" si avant/après dispo, sinon "photo". INTERDIT de générer du contenu inventé pour cette catégorie. Le hook doit mettre en avant le résultat concret. → CTA confiance.
Pour "calendar" : JAMAIS de contenu métier. Post adapté à la date : équipe (interne), présence locale (image_marque), clin d'œil (léger), fun (créatif), disponibilité, émotion. Le ton est CHALEUREUX et HUMAIN. Le CTA est doux ("Bonne fête !", "On pense à vous", "Notre équipe vous souhaite..."). universe = "general". La pression conversion est NULLE pour cette catégorie.
Pour "saisonnier" : lien météo/période réelle → CTA anticipation.

CHAQUE catégorie a sa PROPRE tonalité. Ne PAS tout transformer en "urgence métier".
Le topic_type assigné à chaque jour est OBLIGATOIRE — ne jamais le remplacer par un autre.
Si un jour a un événement calendaire relevance 1, le topic_type DOIT être "calendar", pas autre chose.

VOCABULAIRE INTERDIT :
- Ne jamais utiliser le mot "expert" ou "expertise". Préférer "technicien", "technicien qualifié", "professionnel", "spécialiste".

VALIDATION FINALE :
Si le topic_type du post ne correspond pas à la catégorie assignée au jour → il est INVALIDE → remplace-le.`;
    // Build user prompt customization from prompt params
    const toneMap: Record<string, string> = {
      professionnel: 'Ton professionnel, technicien, crédible',
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

ÉVÉNEMENTS OBLIGATOIRES CE MOIS — Le post de CE JOUR PRÉCIS DOIT parler de cet événement. L'événement est le THÈME PRINCIPAL du post, pas un simple prétexte :
${pertinentEvents.map(a => `- ⚠️ ${a.day}/${month}: "${a.label}" → Le post du ${a.day} DOIT être sur ce thème. Univers: ${a.preferredUniverses[0]}`).join('\n') || '(aucun)'}
${optionalEvents.length > 0 ? `\nÉVÉNEMENTS OPTIONNELS (à utiliser SEULEMENT si un angle crédible existe, sinon ignorer) :\n${optionalEvents.map(a => `- ${a.day}/${month}: ${a.label} | univers: ${a.preferredUniverses[0]} | OPTIONNEL`).join('\n')}` : ''}

RÉALISATIONS EXPLOITABLES :
${exploitableReals.length > 0 
  ? exploitableReals.map(r => `- "${r.title}" (ID: ${r.id}, univers: ${r.universe || 'inconnu'}, avant/après: ${r.hasBeforeAfter ? 'oui' : 'non'})`).join('\n')
  : '(aucune)'}

Propose un angle DIFFÉRENT du post précédent.
RAPPEL : le post doit contenir au moins UN déclencheur de conversion (perte d'argent, inconfort, risque, gain immédiat, simplicité).`;
    } else if (isTargetDatesMode) {
      // Look up the weekly schedule to know what category each target date should have
      const datesFormatted = targetDates.map(d => {
        const day = parseInt(d.split('-')[2]);
        const event = monthAwareness.find(a => a.day === day);
        const scheduledCategory = weeklySchedule.find(s => s.day === day)?.category || 'conseil';
        
        const CATEGORY_DESCRIPTIONS: Record<string, string> = {
          urgence: 'URGENCE — fuite, panne, casse, sécurité. Universe métier obligatoire.',
          prevention: 'PRÉVENTION — anticiper un problème, entretien préventif.',
          amelioration: 'AMÉLIORATION — confort, esthétique, valorisation habitat.',
          conseil: 'CONSEIL PRATIQUE — tip utile, actionnable, court.',
          preuve: 'PREUVE — témoignage, avant/après, process d\'intervention, savoir-faire.',
          saisonnier: 'SAISONNIER — lié à la météo réelle ou à la période.',
          contre_exemple: 'CONTRE-EXEMPLE — erreur fréquente, "ce qu\'il ne faut pas faire".',
          pedagogique: 'PÉDAGOGIQUE — "le saviez-vous ?", chiffre clé, schéma simple.',
          prospection: 'PROSPECTION & MARQUE — zone d\'intervention, panorama métiers, partenaires, commercial créatif. Universe = general.',
        };
        
        const categoryDesc = CATEGORY_DESCRIPTIONS[scheduledCategory] || scheduledCategory;
        
        if (event) {
          return `- ${d}: CATÉGORIE OBLIGATOIRE = "${scheduledCategory}" (${categoryDesc}) | événement: "${event.label}" (utiliser SEULEMENT si pertinent)`;
        }
        return `- ${d}: CATÉGORIE OBLIGATOIRE = "${scheduledCategory}" (${categoryDesc})`;
      }).join('\n');

      userPrompt = `Génère EXACTEMENT ${targetDates.length} suggestion(s) de posts, UNE par date suivante :

${datesFormatted}
${promptCustomization}

RÈGLE CRITIQUE : le topic_type de chaque post DOIT correspondre EXACTEMENT à la catégorie indiquée pour ce jour.
Si la catégorie est "pedagogique" → le post DOIT être pédagogique (chiffre clé, "le saviez-vous ?").
Si la catégorie est "prospection" → le post DOIT présenter l'entreprise (zone, métiers, partenaires).
Si la catégorie est "contre_exemple" → le post DOIT montrer une erreur fréquente.
NE PAS remplacer par de l'urgence ou du métier terrain si ce n'est pas la catégorie assignée.

RÉALISATIONS EXPLOITABLES :
${exploitableReals.length > 0 
  ? exploitableReals.map(r => `- "${r.title}" (ID: ${r.id}, univers: ${r.universe || 'inconnu'}, avant/après: ${r.hasBeforeAfter ? 'oui' : 'non'})`).join('\n')
  : '(aucune)'}

SUJETS DÉJÀ EXISTANTS (à ne pas dupliquer) :
${[...existingTopicKeys].join(', ') || '(aucun)'}

RÈGLES :
- UN post par date, pas plus, pas moins
- La suggestion_date DOIT correspondre EXACTEMENT à une des dates demandées
- Varier les univers entre les posts (pas 2 fois le même univers)
- Chaque post DOIT contenir un DÉCLENCHEUR de conversion
- Pas de contenu calendaire forcé`;
    } else {
      // Build schedule from editorial calendar — each day has exact topic_type, universe, and theme
      const scheduleLines = weeklySchedule.map(s => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`;
        
        if (s.isCalendar) {
          return `- ${dateStr}: ⚠️ CALENDAIRE → topic_type="calendar" | universe="${s.universe}" | THÈME: "${s.theme}" | AUCUN contenu métier forcé, post humain/image/léger`;
        }
        if (s.category === 'prospection') {
          return `- ${dateStr}: topic_type="prospection" | universe="general" | THÈME: "${s.theme}"`;
        }
        return `- ${dateStr}: topic_type="${s.category}" | universe="${s.universe}" | THÈME: "${s.theme}"`;
      }).join('\n');

      userPrompt = `Génère EXACTEMENT ${targetPostCount} suggestions de posts (1 PAR JOUR) pour le mois ${month}/${year}.

═══════════════════════════════════════════
PLANNING ÉDITORIAL QUOTIDIEN (CALENDRIER CURÉ — OBLIGATOIRE)
═══════════════════════════════════════════
Chaque jour a un topic_type, un univers et un thème PRÉ-ASSIGNÉS.
Tu DOIS respecter ces 3 éléments pour chaque jour. Le thème est une DIRECTION ÉDITORIALE, pas un titre à copier.

${scheduleLines}

═══════════════════════════════════════════
RÈGLES DU CALENDRIER ÉDITORIAL
═══════════════════════════════════════════
- Le topic_type de chaque jour est OBLIGATOIRE — ne jamais le remplacer
- L'univers de chaque jour est OBLIGATOIRE — ne jamais le changer
- Le thème indique la DIRECTION du post — génère un contenu original qui respecte cette direction
- Les jours "CALENDAIRE" → post HUMAIN, pas technique. Hook chaleureux, CTA doux.
- Les jours "prospection" → présentation entreprise/équipe/zone. Pas de problème technique.
- Tous les autres jours → post métier avec DÉCLENCHEUR de conversion

SUJETS DÉJÀ EXISTANTS (à ne pas dupliquer) :
${[...existingTopicKeys].join(', ') || '(aucun)'}

RÉALISATIONS EXPLOITABLES :
${exploitableReals.length > 0 
  ? exploitableReals.map(r => `- "${r.title}" (ID: ${r.id}, univers: ${r.universe || 'inconnu'}, avant/après: ${r.hasBeforeAfter ? 'oui' : 'non'})`).join('\n')
  : '(aucune)'}
${recentThemesWarning}

═══════════════════════════════════════════
FORMAT DES POSTS (VARIATION OBLIGATOIRE)
═══════════════════════════════════════════
Répartir les ${targetPostCount} posts selon :
- ~20% PUNCHLINE : hook seul
- ~30% COURT : hook + CTA direct
- ~40% MOYEN : hook + 1 phrase de bénéfice + CTA
- ~10% LONG : hook + 2 phrases + CTA

═══════════════════════════════════════════
RAPPEL CRITIQUE
═══════════════════════════════════════════
- EXACTEMENT ${targetPostCount} posts, UN par jour du mois
- Posts métier DOIVENT contenir un DÉCLENCHEUR (perte d'argent, inconfort, risque, gain, simplicité)
- Posts "calendar" n'ont PAS besoin de déclencheur commercial — leur objectif est la PRÉSENCE et l'IMAGE
- lead_score : posts calendar = 10-30, posts métier = 50-100
- visual_prompt = scène RÉALISTE pour métier, scène HUMAINE/FESTIVE pour calendar
- JAMAIS inventer de faux cas client
- topic_type et universe DOIVENT correspondre EXACTEMENT au planning ci-dessus`;

    }

    // ─── AI call with OpenAI (principal) + Claude (fallback) ───
    const { callAiWithFallback } = await import('../_shared/aiClient.ts');

    const aiPayload = {
      messages: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt },
      ],
      tools: [SUGGEST_TOOL],
      tool_choice: { type: 'function', function: { name: 'generate_social_suggestions' } },
      stream: false,
      temperature: 0.7,
      model: 'gpt-4o',
    };

    const aiResult = await callAiWithFallback(aiPayload);

    if (!aiResult.ok) {
      console.error('[social-suggest] AI failed:', aiResult.status, aiResult.error.slice(0, 300));
      if (aiResult.status === 429) {
        return new Response(JSON.stringify({ error: 'Service IA saturé, réessayez dans quelques minutes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Service IA indisponible', details: aiResult.status }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[social-suggest] AI success via ${aiResult.provider}`);

    const aiData = aiResult.data;

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
      rawSuggestions, month, year, exploitableReals, existingTopicKeys, weeklySchedule
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
      let sourceType = regenerateSingle ? 'regenerated' : 'ai_daily';

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

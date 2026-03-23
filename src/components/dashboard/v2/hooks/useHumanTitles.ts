/**
 * useHumanTitles - Hook pour rotation de titres conversationnels
 * 
 * Transforme les titres administratifs froids en titres humains et engageants
 * avec rotation aléatoire par session
 */

import { useMemo } from 'react';

export type TitleKey = 
  | 'kpis'
  | 'top_techniciens'
  | 'ca_univers'
  | 'ca_apporteurs'
  | 'taux_sav'
  | 'tickets'
  | 'panier_moyen'
  | 'productivite'
  | 'map'
  | 'recouvrement'
  | 'actions_a_mener';

interface TitleVariant {
  title: string;
  subtitle?: string;
}

const TITLE_VARIANTS: Record<TitleKey, TitleVariant[]> = {
  kpis: [
    { title: "Le pouls de l'agence", subtitle: "Vos indicateurs clés en temps réel" },
    { title: "Comment ça tourne", subtitle: "Un coup d'œil sur votre activité" },
    { title: "En un coup d'œil", subtitle: "L'essentiel de votre performance" },
    { title: "Votre tableau de bord", subtitle: "Les chiffres qui comptent" },
  ],
  top_techniciens: [
    { title: "Qui fait la différence", subtitle: "Les étoiles de la période" },
    { title: "Le podium du mois", subtitle: "Vos meilleurs techniciens" },
    { title: "Les champions", subtitle: "Top contributeurs CA" },
    { title: "Ceux qui performent", subtitle: "Le trio gagnant" },
  ],
  ca_univers: [
    { title: "Ce qui fait tourner", subtitle: "Répartition par métier" },
    { title: "Où se fait le CA", subtitle: "Vos univers performants" },
    { title: "Les métiers porteurs", subtitle: "Contribution par activité" },
    { title: "La répartition", subtitle: "CA par domaine d'expertise" },
  ],
  ca_apporteurs: [
    { title: "D'où vient le travail", subtitle: "Vos sources de CA" },
    { title: "Nos prescripteurs", subtitle: "Top apporteurs d'affaires" },
    { title: "Les partenaires clés", subtitle: "Qui nous fait confiance" },
    { title: "Sources d'activité", subtitle: "Répartition des entrées" },
  ],
  taux_sav: [
    { title: "À surveiller", subtitle: "Taux de retour chantier" },
    { title: "Point de vigilance", subtitle: "Qualité et retours" },
    { title: "Le SAV en bref", subtitle: "Indicateur qualité" },
    { title: "Attention requise", subtitle: "Suivi des reprises" },
  ],
  tickets: [
    { title: "À ne pas oublier", subtitle: "Vos demandes récentes" },
    { title: "Ce qui attend", subtitle: "Tickets en cours" },
    { title: "Demandes actives", subtitle: "Votre fil de suivi" },
    { title: "En attente", subtitle: "Les sujets ouverts" },
  ],
  panier_moyen: [
    { title: "Panier moyen", subtitle: "Valeur moyenne par dossier" },
    { title: "Ticket moyen", subtitle: "CA par intervention" },
    { title: "Valeur moyenne", subtitle: "Prix moyen facturé" },
  ],
  productivite: [
    { title: "Productivité", subtitle: "Efficacité de l'équipe" },
    { title: "Rendement équipe", subtitle: "Performance globale" },
    { title: "Charge de travail", subtitle: "Répartition de l'activité" },
  ],
  map: [
    { title: "Sur le terrain aujourd'hui", subtitle: "Vos RDV du jour en temps réel" },
    { title: "Où ça se passe aujourd'hui", subtitle: "Localisation des interventions du jour" },
    { title: "La carte du jour", subtitle: "Vos techniciens en action maintenant" },
    { title: "Aujourd'hui sur le terrain", subtitle: "Vue géographique des RDV" },
  ],
  recouvrement: [
    { title: "À encaisser", subtitle: "Factures en attente de règlement" },
    { title: "Paiements attendus", subtitle: "Suivi du recouvrement" },
    { title: "Relances", subtitle: "Factures à surveiller" },
  ],
};

// Cache des indices par session pour éviter le re-render random
const sessionCache = new Map<TitleKey, number>();

function getRandomIndex(key: TitleKey, max: number): number {
  if (!sessionCache.has(key)) {
    sessionCache.set(key, Math.floor(Math.random() * max));
  }
  return sessionCache.get(key)!;
}

export function useHumanTitle(key: TitleKey): TitleVariant {
  return useMemo(() => {
    const variants = TITLE_VARIANTS[key];
    if (!variants || variants.length === 0) {
      return { title: key, subtitle: undefined };
    }
    const index = getRandomIndex(key, variants.length);
    return variants[index];
  }, [key]);
}

export function useHumanTitles(keys: TitleKey[]): Record<TitleKey, TitleVariant> {
  return useMemo(() => {
    const result: Partial<Record<TitleKey, TitleVariant>> = {};
    for (const key of keys) {
      const variants = TITLE_VARIANTS[key];
      if (variants && variants.length > 0) {
        const index = getRandomIndex(key, variants.length);
        result[key] = variants[index];
      } else {
        result[key] = { title: key };
      }
    }
    return result as Record<TitleKey, TitleVariant>;
  }, [keys]);
}

export default useHumanTitle;

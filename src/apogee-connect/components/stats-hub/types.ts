/**
 * Types pour le Stats Hub unifié
 */

export type TabId = 'general' | 'apporteurs' | 'techniciens' | 'univers' | 'sav' | 'previsionnel' | 'financier' | 'tresorerie';

export interface TabConfig {
  id: TabId;
  label: string;
  icon: string;
  color: string;
}

export const TABS_CONFIG: TabConfig[] = [
  { id: 'general', label: 'Général', icon: 'LayoutDashboard', color: 'primary' },
  { id: 'apporteurs', label: 'Apporteurs', icon: 'Building2', color: 'blue' },
  { id: 'techniciens', label: 'Techniciens', icon: 'Users', color: 'green' },
  { id: 'univers', label: 'Univers', icon: 'Layers', color: 'purple' },
  { id: 'sav', label: 'SAV', icon: 'AlertTriangle', color: 'orange' },
  { id: 'previsionnel', label: 'Prévisionnel', icon: 'Calendar', color: 'cyan' },
  { id: 'financier', label: 'Recouvrement', icon: 'Wallet', color: 'emerald' },
  { id: 'tresorerie', label: 'Trésorerie', icon: 'Landmark', color: 'teal' },
];

export type MiniGraphType = 'sparkline' | 'gauge' | 'bar' | 'none';

export interface StatItem {
  id: string;
  tab: TabId;
  title: string;
  subtitle?: string;
  icon?: string;
  color?: string;
  miniGraphType: MiniGraphType;
  order: number;
  isWidget?: boolean;
  modalContentId?: string;
}

// Index centralisé de toutes les stats (42 KPIs + widgets)
export const STATS_INDEX: StatItem[] = [
  // === GÉNÉRAL (16 KPIs + 1 Widget) ===
  { id: 'dossiers_recus', tab: 'general', title: 'Dossiers reçus', subtitle: 'ce mois', miniGraphType: 'sparkline', order: 1 },
  { id: 'dossiers_moyenne', tab: 'general', title: 'Moyenne/jour', subtitle: 'dossiers', miniGraphType: 'bar', order: 2 },
  { id: 'devis_emis', tab: 'general', title: 'Devis émis', subtitle: 'ce mois', miniGraphType: 'sparkline', order: 3 },
  { id: 'devis_moyenne', tab: 'general', title: 'Moyenne/jour', subtitle: 'devis', miniGraphType: 'bar', order: 4 },
  { id: 'ca_mensuel', tab: 'general', title: 'CA Mensuel', subtitle: 'HT', miniGraphType: 'sparkline', order: 5 },
  { id: 'ca_ytd', tab: 'general', title: 'CA YTD', subtitle: 'depuis janvier', miniGraphType: 'sparkline', order: 6 },
  { id: 'ca_moyen_jour', tab: 'general', title: 'CA Moyen/jour', subtitle: 'ce mois', miniGraphType: 'bar', order: 7 },
  { id: 'ca_moyen_technicien', tab: 'general', title: 'CA/Technicien', subtitle: 'moyenne', miniGraphType: 'bar', order: 8 },
  { id: 'encours_global', tab: 'general', title: 'Encours Global', subtitle: 'TTC', miniGraphType: 'gauge', order: 9 },
  { id: 'taux_sav', tab: 'general', title: 'Taux SAV', subtitle: 'YTD', miniGraphType: 'gauge', order: 10 },
  { id: 'panier_moyen', tab: 'general', title: 'Panier Moyen', subtitle: 'HT', miniGraphType: 'sparkline', order: 11 },
  { id: 'taux_transfo_nombre', tab: 'general', title: 'Taux Transfo', subtitle: 'en nombre', miniGraphType: 'gauge', order: 12 },
  { id: 'taux_transfo_montant', tab: 'general', title: 'Taux Transfo', subtitle: 'en montant', miniGraphType: 'gauge', order: 13 },
  { id: 'delai_premier_devis', tab: 'general', title: 'Délai 1er Devis', subtitle: 'jours', miniGraphType: 'bar', order: 14 },
  { id: 'delai_facturation', tab: 'general', title: 'Délai Facturation', subtitle: 'jours', miniGraphType: 'bar', order: 15 },
  { id: 'delai_encaissement', tab: 'general', title: 'Délai Encaissement', subtitle: 'jours', miniGraphType: 'bar', order: 16 },
  { id: 'widget_ca_mensuel', tab: 'general', title: 'Évolution CA Mensuel', miniGraphType: 'none', order: 17, isWidget: true, modalContentId: 'ca_evolution' },

  // === APPORTEURS (10 KPIs + 7 Widgets) ===
  { id: 'apporteurs_du_global', tab: 'apporteurs', title: 'Dû Global TTC', subtitle: 'apporteurs', miniGraphType: 'sparkline', order: 1 },
  { id: 'apporteurs_nb_factures', tab: 'apporteurs', title: 'Factures', subtitle: 'en cours', miniGraphType: 'bar', order: 2 },
  { id: 'apporteurs_ca_total', tab: 'apporteurs', title: 'CA Total', subtitle: 'apporteurs', miniGraphType: 'sparkline', order: 3 },
  { id: 'apporteurs_dossiers', tab: 'apporteurs', title: 'Dossiers', subtitle: 'confiés', miniGraphType: 'sparkline', order: 4 },
  { id: 'apporteurs_taux_transfo', tab: 'apporteurs', title: 'Taux Transfo', subtitle: 'apporteurs', miniGraphType: 'gauge', order: 5 },
  { id: 'apporteurs_panier_moyen', tab: 'apporteurs', title: 'Panier Moyen', subtitle: 'apporteurs', miniGraphType: 'bar', order: 6 },
  { id: 'apporteurs_nb_actifs', tab: 'apporteurs', title: 'Apporteurs Actifs', subtitle: 'ce mois', miniGraphType: 'bar', order: 7 },
  { id: 'apporteurs_part_ca', tab: 'apporteurs', title: 'Part du CA', subtitle: 'apporteurs', miniGraphType: 'gauge', order: 8 },
  { id: 'apporteurs_top_ca', tab: 'apporteurs', title: 'Top CA', subtitle: '#1', miniGraphType: 'none', order: 9 },
  { id: 'apporteurs_top_encours', tab: 'apporteurs', title: 'Top Encours', subtitle: '#1', miniGraphType: 'none', order: 10 },
  { id: 'widget_top_apporteurs', tab: 'apporteurs', title: 'Top 5 Apporteurs CA', miniGraphType: 'none', order: 11, isWidget: true, modalContentId: 'top_apporteurs' },
  { id: 'widget_flop_apporteurs', tab: 'apporteurs', title: 'Flop 5 Apporteurs', miniGraphType: 'none', order: 12, isWidget: true, modalContentId: 'flop_apporteurs' },
  { id: 'widget_top_encours', tab: 'apporteurs', title: 'Top 5 Encours', miniGraphType: 'none', order: 13, isWidget: true, modalContentId: 'top_encours' },
  { id: 'widget_segmentation', tab: 'apporteurs', title: 'Segmentation', miniGraphType: 'none', order: 14, isWidget: true, modalContentId: 'segmentation' },
  { id: 'widget_types', tab: 'apporteurs', title: 'Types Apporteurs', miniGraphType: 'none', order: 15, isWidget: true, modalContentId: 'types_apporteurs' },
  { id: 'widget_fidelite', tab: 'apporteurs', title: 'Fidélité', miniGraphType: 'none', order: 16, isWidget: true, modalContentId: 'fidelite' },
  { id: 'widget_evolution_apporteurs', tab: 'apporteurs', title: 'Évolution CA Apporteurs', miniGraphType: 'none', order: 17, isWidget: true, modalContentId: 'evolution_apporteurs' },

  // === TECHNICIENS (4 KPIs + 3 Widgets) ===
  { id: 'tech_nb_actifs', tab: 'techniciens', title: 'Techniciens', subtitle: 'actifs', miniGraphType: 'bar', order: 1 },
  { id: 'tech_ca_total', tab: 'techniciens', title: 'CA Total', subtitle: 'techniciens', miniGraphType: 'sparkline', order: 2 },
  { id: 'tech_heures_total', tab: 'techniciens', title: 'Heures', subtitle: 'productives', miniGraphType: 'bar', order: 3 },
  { id: 'tech_ca_heure', tab: 'techniciens', title: 'CA/Heure', subtitle: 'moyenne', miniGraphType: 'bar', order: 4 },
  { id: 'widget_top_tech', tab: 'techniciens', title: 'Top 5 Techniciens', miniGraphType: 'none', order: 5, isWidget: true, modalContentId: 'top_techniciens' },
  { id: 'widget_heatmap', tab: 'techniciens', title: 'Heatmap Mensuelle', miniGraphType: 'none', order: 6, isWidget: true, modalContentId: 'heatmap' },
  { id: 'widget_ca_mensuel_tech', tab: 'techniciens', title: 'CA Mensuel/Tech', miniGraphType: 'none', order: 7, isWidget: true, modalContentId: 'ca_mensuel_tech' },

  // === UNIVERS (8 KPIs + 4 Widgets) ===
  { id: 'univers_plomberie', tab: 'univers', title: 'Plomberie', subtitle: 'CA', miniGraphType: 'sparkline', order: 1 },
  { id: 'univers_electricite', tab: 'univers', title: 'Électricité', subtitle: 'CA', miniGraphType: 'sparkline', order: 2 },
  { id: 'univers_serrurerie', tab: 'univers', title: 'Serrurerie', subtitle: 'CA', miniGraphType: 'sparkline', order: 3 },
  { id: 'univers_vitrerie', tab: 'univers', title: 'Vitrerie', subtitle: 'CA', miniGraphType: 'sparkline', order: 4 },
  { id: 'univers_multiservices', tab: 'univers', title: 'Multiservices', subtitle: 'CA', miniGraphType: 'sparkline', order: 5 },
  { id: 'univers_renovation', tab: 'univers', title: 'Rénovation', subtitle: 'CA', miniGraphType: 'sparkline', order: 6 },
  { id: 'univers_autres', tab: 'univers', title: 'Autres', subtitle: 'CA', miniGraphType: 'sparkline', order: 7 },
  { id: 'univers_non_classe', tab: 'univers', title: 'Non classé', subtitle: 'CA', miniGraphType: 'sparkline', order: 8 },
  { id: 'widget_repartition_univers', tab: 'univers', title: 'Répartition CA', miniGraphType: 'none', order: 9, isWidget: true, modalContentId: 'repartition_univers' },
  { id: 'widget_evolution_univers', tab: 'univers', title: 'Évolution Univers', miniGraphType: 'none', order: 10, isWidget: true, modalContentId: 'evolution_univers' },
  { id: 'widget_dossiers_univers', tab: 'univers', title: 'Dossiers/Univers', miniGraphType: 'none', order: 11, isWidget: true, modalContentId: 'dossiers_univers' },
  { id: 'widget_matrix_univers', tab: 'univers', title: 'Matrice Univers×Apporteur', miniGraphType: 'none', order: 12, isWidget: true, modalContentId: 'matrix_univers' },

  // === SAV (4 KPIs + 4 Widgets) ===
  { id: 'sav_taux_global', tab: 'sav', title: 'Taux SAV', subtitle: 'YTD', miniGraphType: 'gauge', order: 1 },
  { id: 'sav_nb_dossiers', tab: 'sav', title: 'Dossiers SAV', subtitle: 'ce mois', miniGraphType: 'sparkline', order: 2 },
  { id: 'sav_cout_moyen', tab: 'sav', title: 'Coût Moyen', subtitle: 'estimé', miniGraphType: 'bar', order: 3 },
  { id: 'sav_ca_impacte', tab: 'sav', title: 'CA Impacté', subtitle: 'total', miniGraphType: 'sparkline', order: 4 },
  { id: 'widget_sav_univers', tab: 'sav', title: 'SAV par Univers', miniGraphType: 'none', order: 5, isWidget: true, modalContentId: 'sav_univers' },
  { id: 'widget_sav_type', tab: 'sav', title: 'SAV par Type', miniGraphType: 'none', order: 6, isWidget: true, modalContentId: 'sav_type' },
  { id: 'widget_sav_evolution', tab: 'sav', title: 'Évolution SAV', miniGraphType: 'none', order: 7, isWidget: true, modalContentId: 'sav_evolution' },
  { id: 'widget_sav_liste', tab: 'sav', title: 'Liste Dossiers SAV', miniGraphType: 'none', order: 8, isWidget: true, modalContentId: 'sav_liste' },

  // === PRÉVISIONNEL (4 KPIs + 2 Widgets) ===
{ id: 'prev_heures_tech', tab: 'previsionnel', title: 'Heures Homme', subtitle: 'à planifier', miniGraphType: 'bar', order: 1 },
  { id: 'prev_heures_rdv', tab: 'previsionnel', title: 'Durée totale inter', subtitle: 'à programmer', miniGraphType: 'bar', order: 2 },
  { id: 'prev_nb_dossiers', tab: 'previsionnel', title: 'Dossiers', subtitle: 'en attente', miniGraphType: 'bar', order: 3 },
  { id: 'prev_nb_univers', tab: 'previsionnel', title: 'Univers', subtitle: 'concernés', miniGraphType: 'bar', order: 4 },
  { id: 'widget_charge_univers', tab: 'previsionnel', title: 'Charge par Univers', miniGraphType: 'none', order: 5, isWidget: true, modalContentId: 'charge_univers' },
  { id: 'widget_dossiers_liste', tab: 'previsionnel', title: 'Liste des Dossiers', miniGraphType: 'none', order: 6, isWidget: true, modalContentId: 'dossiers_liste' },
];

// Helper pour obtenir toutes les stats d'un onglet
export function getStatsForTab(tabId: TabId): StatItem[] {
  return STATS_INDEX.filter(s => s.tab === tabId).sort((a, b) => a.order - b.order);
}

// Helper pour obtenir l'index global d'une stat (pour navigation)
export function getGlobalStatIndex(statId: string): number {
  return STATS_INDEX.findIndex(s => s.id === statId);
}

// Helper pour obtenir la stat suivante/précédente
export function getNextStat(currentId: string): StatItem | null {
  const idx = getGlobalStatIndex(currentId);
  if (idx < 0 || idx >= STATS_INDEX.length - 1) return null;
  return STATS_INDEX[idx + 1];
}

export function getPrevStat(currentId: string): StatItem | null {
  const idx = getGlobalStatIndex(currentId);
  if (idx <= 0) return null;
  return STATS_INDEX[idx - 1];
}

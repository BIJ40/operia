/**
 * financialLineItems.ts — Complete P&L line items configuration
 * Maps the Excel "Compte de Résultats" template to data sources and UI structure.
 *
 * source_type:
 *   'manual_monthly' → entered/synced each month (editable)
 *   'manual_fixed'   → entered once per year, applied monthly (charge table)
 *   'manual_variable' → entered monthly (charge table)
 *   'calculated'     → computed from other fields (read-only)
 */

export type SourceType = 'manual_monthly' | 'manual_fixed' | 'manual_variable' | 'calculated';

export interface LineItem {
  key: string;
  label: string;
  source_type: SourceType;
  /** For charges stored in agency_financial_charges, the charge_type prefix */
  charge_key?: string;
  /** For monthly data stored in agency_financial_months, the column name */
  month_field?: string;
  /** Indentation level in P&L display */
  indent?: number;
  /** Is this a subtotal/total row? */
  isSubtotal?: boolean;
  /** Is this a percentage row? */
  isPercent?: boolean;
  /** Bold styling */
  bold?: boolean;
  /** Negative display (deduction) */
  negative?: boolean;
  /** Auto-populated from another source — still editable */
  autoSource?: 'statia' | 'collaborators' | string;
  /** Display-only row (not editable, no stored field) */
  displayOnly?: boolean;
}

export interface PLSection {
  key: string;
  title: string;
  items: LineItem[];
  /** Color accent for the section header */
  color?: string;
}

// ─── SECTIONS ───────────────────────────────────────────────

export const PL_SECTIONS: PLSection[] = [
  // ════════════ ACTIVITÉ ════════════
  {
    key: 'activite',
    title: 'ACTIVITÉ',
    items: [
      { key: 'nb_factures', label: 'Nombre de factures', source_type: 'manual_monthly', month_field: 'nb_factures', autoSource: 'statia' },
      { key: 'nb_interventions', label: "Nombre d'interventions", source_type: 'manual_monthly', month_field: 'nb_interventions', autoSource: 'statia' },
      { key: 'nb_salaries', label: 'Nombre de salariés', source_type: 'manual_monthly', month_field: 'nb_salaries', autoSource: 'collaborators' },
      { key: 'heures_facturees', label: "Nombre d'heures facturées", source_type: 'manual_monthly', month_field: 'heures_facturees', autoSource: 'statia' },
      { key: 'nb_heures_payees_productifs', label: "Nombre d'heures payées productifs", source_type: 'manual_monthly', month_field: 'nb_heures_payees_productifs', autoSource: 'collaborators' },
      { key: 'nb_heures_payees_improductifs', label: "Nombre d'heures payées improductifs", source_type: 'manual_monthly', month_field: 'nb_heures_payees_improductifs', autoSource: 'collaborators' },
      { key: 'panier_moyen', label: 'Panier moyen', source_type: 'calculated', autoSource: 'statia', displayOnly: true },
      { key: 'ca_par_heure', label: 'CA / heure', source_type: 'calculated', autoSource: 'statia', displayOnly: true },
    ],
  },

  // ════════════ CA HT ════════════
  {
    key: 'ca',
    title: 'CHIFFRE D\'AFFAIRES',
    items: [
      { key: 'ca_total', label: 'CA HT', source_type: 'manual_monthly', month_field: 'ca_total', bold: true, autoSource: 'statia' },
      { key: 'ca_plomberie', label: 'CA HT Plomberie', source_type: 'manual_monthly', indent: 1, autoSource: 'statia' },
      { key: 'ca_electricite', label: 'CA HT Électricité', source_type: 'manual_monthly', indent: 1, autoSource: 'statia' },
      { key: 'ca_menuiserie', label: 'CA HT Menuiserie', source_type: 'manual_monthly', indent: 1, autoSource: 'statia' },
      { key: 'ca_serrurerie', label: 'CA HT Serrurerie', source_type: 'manual_monthly', indent: 1, autoSource: 'statia' },
      { key: 'ca_vitrerie', label: 'CA HT Vitrerie', source_type: 'manual_monthly', indent: 1, autoSource: 'statia' },
      { key: 'ca_volets', label: 'CA HT Volets roulants', source_type: 'manual_monthly', indent: 1, autoSource: 'statia' },
      { key: 'ca_autres', label: 'CA HT Autres', source_type: 'manual_monthly', indent: 1, autoSource: 'statia' },
    ],
  },

  // ════════════ MASSE SALARIALE PRODUCTIFS ════════════
  {
    key: 'masse_salariale',
    title: 'MASSE SALARIALE PRODUCTIFS',
    items: [
      { key: 'masse_salariale_productifs', label: 'MASSE SALARIALE PRODUCTIFS', source_type: 'calculated', bold: true, isSubtotal: true },
      { key: 'salaires_brut_intervenants', label: 'Salaires brut intervenants', source_type: 'manual_monthly', month_field: 'salaires_brut_intervenants', indent: 1 },
      { key: 'charges_patronales_intervenants', label: 'Charges patronales intervenants', source_type: 'manual_monthly', month_field: 'charges_patronales_intervenants', indent: 1 },
      { key: 'frais_personnel_intervenants', label: 'Frais de personnel intervenants', source_type: 'manual_monthly', month_field: 'frais_personnel_intervenants', indent: 1 },
      { key: 'aides_emploi', label: "Aides à l'emploi", source_type: 'manual_monthly', month_field: 'aides_emploi', indent: 1, negative: true },
      { key: 'sous_traitance', label: 'Intérim / sous-traitance', source_type: 'manual_monthly', month_field: 'sous_traitance', indent: 1 },
    ],
  },

  // ════════════ ACHATS + MARGES ════════════
  {
    key: 'achats_marges',
    title: 'ACHATS & MARGES',
    items: [
      { key: 'achats', label: 'ACHATS DE MARCHANDISES', source_type: 'manual_monthly', month_field: 'achats', bold: true },
      { key: 'marge_sur_achats', label: 'MARGE SUR ACHATS', source_type: 'calculated', bold: true, isSubtotal: true },
      { key: 'taux_marge_achats', label: 'TAUX DE MARGE SUR ACHATS', source_type: 'calculated', isPercent: true },
      { key: 'marge_brute', label: 'MARGE BRUTE ACHATS+MO', source_type: 'calculated', bold: true, isSubtotal: true },
      { key: 'taux_marge_brute', label: 'TAUX DE MARGE BRUTE ACHATS+MO', source_type: 'calculated', isPercent: true },
    ],
  },

  // ════════════ IMPRODUCTIFS ════════════
  {
    key: 'improductifs',
    title: 'IMPRODUCTIFS',
    items: [
      { key: 'salaires_brut_improductifs', label: 'Salaires brut improductifs', source_type: 'manual_monthly', month_field: 'salaires_brut_improductifs', indent: 1 },
      { key: 'charges_patronales_improductifs', label: 'Charges patronales improductifs', source_type: 'manual_monthly', month_field: 'charges_patronales_improductifs', indent: 1 },
      { key: 'frais_personnel_improductifs', label: 'Frais de personnel improductifs', source_type: 'manual_monthly', month_field: 'frais_personnel_improductifs', indent: 1 },
      { key: 'salaires_brut_franchise', label: 'Salaires brut franchisé', source_type: 'manual_monthly', month_field: 'salaires_brut_franchise', indent: 1 },
      { key: 'charges_patronales_franchise', label: 'Charges patronales franchisé', source_type: 'manual_monthly', month_field: 'charges_patronales_franchise', indent: 1 },
      { key: 'frais_franchise', label: 'Frais franchisé', source_type: 'manual_monthly', month_field: 'frais_franchise', indent: 1 },
      { key: 'total_improductifs', label: 'TOTAL IMPRODUCTIFS', source_type: 'calculated', bold: true, isSubtotal: true },
    ],
  },

  // ════════════ CHARGES AGENCE ════════════
  {
    key: 'charges_agence',
    title: 'CHARGES AGENCE',
    items: [
      { key: 'agence_electricite', label: 'Électricité', source_type: 'manual_variable', charge_key: 'agence_electricite', indent: 1 },
      { key: 'agence_eau', label: 'Eau', source_type: 'manual_variable', charge_key: 'agence_eau', indent: 1 },
      { key: 'agence_assurance_locaux', label: 'Assurance des locaux', source_type: 'manual_fixed', charge_key: 'agence_assurance_locaux', indent: 1 },
      { key: 'agence_location_1', label: 'Location immobilière local 1', source_type: 'manual_fixed', charge_key: 'agence_location_1', indent: 1 },
      { key: 'agence_charges_locatives_1', label: 'Charges locatives 1', source_type: 'manual_variable', charge_key: 'agence_charges_locatives_1', indent: 1 },
      { key: 'agence_location_2', label: 'Location immobilière local 2', source_type: 'manual_fixed', charge_key: 'agence_location_2', indent: 1 },
      { key: 'agence_charges_locatives_2', label: 'Charges locatives 2', source_type: 'manual_variable', charge_key: 'agence_charges_locatives_2', indent: 1 },
      { key: 'agence_location_3', label: 'Location immobilière local 3', source_type: 'manual_fixed', charge_key: 'agence_location_3', indent: 1 },
      { key: 'agence_charges_locatives_3', label: 'Charges locatives 3', source_type: 'manual_variable', charge_key: 'agence_charges_locatives_3', indent: 1 },
      { key: 'total_charges_agence', label: 'Total charges agences', source_type: 'calculated', bold: true, isSubtotal: true },
    ],
  },

  // ════════════ LOCATIONS ════════════
  {
    key: 'locations',
    title: 'LOCATIONS',
    items: [
      { key: 'location_vehicules', label: 'Locations véhicules', source_type: 'manual_fixed', charge_key: 'location_vehicules', indent: 1 },
      { key: 'location_materiels', label: 'Locations matériels', source_type: 'manual_variable', charge_key: 'location_materiels', indent: 1 },
      { key: 'total_locations', label: 'Total location', source_type: 'calculated', bold: true, isSubtotal: true },
    ],
  },

  // ════════════ CHARGES EXTERNES ════════════
  {
    key: 'charges_externes',
    title: 'CHARGES EXTERNES',
    items: [
      { key: 'externe_entretien_vehicules', label: 'Entretien véhicules/matériels', source_type: 'manual_variable', charge_key: 'externe_entretien_vehicules', indent: 1 },
      { key: 'externe_telephone_fixe', label: 'Téléphone fixe/fax', source_type: 'manual_fixed', charge_key: 'externe_telephone_fixe', indent: 1 },
      { key: 'externe_internet', label: 'Internet', source_type: 'manual_fixed', charge_key: 'externe_internet', indent: 1 },
      { key: 'externe_telephone_portable', label: 'Téléphone portable', source_type: 'manual_fixed', charge_key: 'externe_telephone_portable', indent: 1 },
      { key: 'externe_assurances_rc', label: 'Assurances RC', source_type: 'manual_fixed', charge_key: 'externe_assurances_rc', indent: 1 },
      { key: 'externe_assurance_decennale', label: 'Assurance décennale', source_type: 'manual_fixed', charge_key: 'externe_assurance_decennale', indent: 1 },
      { key: 'externe_assurances_vehicules', label: 'Assurances véhicules', source_type: 'manual_fixed', charge_key: 'externe_assurances_vehicules', indent: 1 },
      { key: 'externe_autres_assurances', label: 'Autres assurances', source_type: 'manual_variable', charge_key: 'externe_autres_assurances', indent: 1 },
      { key: 'externe_honoraires_comptables', label: 'Honoraires comptables', source_type: 'manual_fixed', charge_key: 'externe_honoraires_comptables', indent: 1 },
      { key: 'externe_honoraires_payes', label: 'Honoraires payés', source_type: 'manual_variable', charge_key: 'externe_honoraires_payes', indent: 1 },
      { key: 'externe_logiciel_exploitation', label: "Logiciel d'exploitation", source_type: 'manual_fixed', charge_key: 'externe_logiciel_exploitation', indent: 1 },
      { key: 'externe_autres_logiciels', label: 'Autres logiciels', source_type: 'manual_fixed', charge_key: 'externe_autres_logiciels', indent: 1 },
      { key: 'externe_redevances_hc_assistance', label: 'Redevances HC assistance', source_type: 'manual_variable', charge_key: 'externe_redevances_hc_assistance', indent: 1 },
      { key: 'externe_redevances_hc_fcn', label: 'Redevances HC FCN', source_type: 'manual_variable', charge_key: 'externe_redevances_hc_fcn', indent: 1 },
      { key: 'externe_frais_seminaire', label: 'Frais séminaire', source_type: 'manual_variable', charge_key: 'externe_frais_seminaire', indent: 1 },
      { key: 'externe_deplacements', label: 'Déplacements', source_type: 'manual_variable', charge_key: 'externe_deplacements', indent: 1 },
      { key: 'externe_missions_receptions', label: 'Missions/réceptions', source_type: 'manual_variable', charge_key: 'externe_missions_receptions', indent: 1 },
      { key: 'externe_carburant', label: 'Carburant véhicules', source_type: 'manual_variable', charge_key: 'externe_carburant', indent: 1 },
      { key: 'externe_geolocalisation', label: 'Géolocalisation', source_type: 'manual_fixed', charge_key: 'externe_geolocalisation', indent: 1 },
      { key: 'externe_fournitures', label: 'Fournitures administratives', source_type: 'manual_variable', charge_key: 'externe_fournitures', indent: 1 },
      { key: 'externe_publicites', label: 'Publicités / impressions', source_type: 'manual_variable', charge_key: 'externe_publicites', indent: 1 },
      { key: 'externe_frais_distribution', label: 'Frais de distribution', source_type: 'manual_variable', charge_key: 'externe_frais_distribution', indent: 1 },
      { key: 'externe_annonces', label: 'Annonces/affichages/contacts', source_type: 'manual_variable', charge_key: 'externe_annonces', indent: 1 },
      { key: 'externe_pages_jaunes', label: 'Pages jaunes', source_type: 'manual_fixed', charge_key: 'externe_pages_jaunes', indent: 1 },
      { key: 'externe_commissions_apporteur', label: "Commissions apporteur d'affaires", source_type: 'manual_variable', charge_key: 'externe_commissions_apporteur', indent: 1 },
      { key: 'externe_autres_communication', label: 'Autres frais de communication', source_type: 'manual_variable', charge_key: 'externe_autres_communication', indent: 1 },
      { key: 'externe_outillages', label: 'Achats petits outillages/matériels', source_type: 'manual_variable', charge_key: 'externe_outillages', indent: 1 },
      { key: 'externe_vetements', label: 'Vêtements de travail', source_type: 'manual_variable', charge_key: 'externe_vetements', indent: 1 },
      { key: 'externe_cadeaux_clients', label: 'Cadeaux clients', source_type: 'manual_variable', charge_key: 'externe_cadeaux_clients', indent: 1 },
      { key: 'externe_cadeaux_salaries', label: 'Cadeaux salariés', source_type: 'manual_variable', charge_key: 'externe_cadeaux_salaries', indent: 1 },
      { key: 'externe_mutuelle', label: 'Mutuelle franchisé/Madelin', source_type: 'manual_fixed', charge_key: 'externe_mutuelle', indent: 1 },
      { key: 'externe_formation', label: 'Coûts de formation', source_type: 'manual_variable', charge_key: 'externe_formation', indent: 1 },
      { key: 'externe_frais_postaux', label: 'Frais postaux', source_type: 'manual_variable', charge_key: 'externe_frais_postaux', indent: 1 },
      { key: 'externe_frais_bancaires', label: 'Frais bancaires', source_type: 'manual_fixed', charge_key: 'externe_frais_bancaires', indent: 1 },
      { key: 'externe_autres_frais', label: 'Autres frais généraux', source_type: 'manual_variable', charge_key: 'externe_autres_frais', indent: 1 },
      { key: 'total_charges_externes', label: 'Total charges externes', source_type: 'calculated', bold: true, isSubtotal: true },
    ],
  },

  // ════════════ AUTRES CHARGES ════════════
  {
    key: 'autres',
    title: 'AUTRES CHARGES',
    items: [
      { key: 'autre_cfe', label: 'CFE', source_type: 'manual_fixed', charge_key: 'autre_cfe', indent: 1 },
      { key: 'autre_interets_emprunts', label: 'Intérêts sur emprunts', source_type: 'manual_fixed', charge_key: 'autre_interets_emprunts', indent: 1 },
      { key: 'autre_assurances_emprunts', label: 'Assurances sur emprunts', source_type: 'manual_fixed', charge_key: 'autre_assurances_emprunts', indent: 1 },
      { key: 'autre_medecine_travail', label: 'Médecine du travail', source_type: 'manual_variable', charge_key: 'autre_medecine_travail', indent: 1 },
      { key: 'autre_amortissements', label: 'Amortissements', source_type: 'manual_fixed', charge_key: 'autre_amortissements', indent: 1 },
      { key: 'autre_taxes', label: 'Autres taxes (amendes, TVS…)', source_type: 'manual_variable', charge_key: 'autre_taxes', indent: 1 },
      { key: 'total_autres', label: 'Total', source_type: 'calculated', bold: true, isSubtotal: true },
    ],
  },

  // ════════════ RÉSULTAT ════════════
  {
    key: 'resultat',
    title: 'RÉSULTAT',
    items: [
      { key: 'total_charges_hors_ms', label: 'TOTAL CHARGES HORS MS PRODUCTIFS', source_type: 'calculated', bold: true, isSubtotal: true },
      { key: 'total_charges', label: 'TOTAL DES CHARGES', source_type: 'calculated', bold: true, isSubtotal: true },
      { key: 'ca_ht_reprise', label: 'CA HT', source_type: 'calculated', bold: true },
      { key: 'total_produits', label: 'TOTAL PRODUITS', source_type: 'calculated', bold: true },
      { key: 'resultat_avant_is', label: 'RÉSULTATS AVANT IS', source_type: 'calculated', bold: true, isSubtotal: true },
    ],
  },
];

/**
 * Get all charge keys that are "fixed" (entered once per year)
 */
export function getFixedChargeKeys(): string[] {
  return PL_SECTIONS
    .flatMap(s => s.items)
    .filter(i => i.source_type === 'manual_fixed' && i.charge_key)
    .map(i => i.charge_key!);
}

/**
 * Get all charge keys that are "variable" (entered monthly)
 */
export function getVariableChargeKeys(): string[] {
  return PL_SECTIONS
    .flatMap(s => s.items)
    .filter(i => i.source_type === 'manual_variable' && i.charge_key)
    .map(i => i.charge_key!);
}

/**
 * Get all monthly fields (stored in agency_financial_months)
 */
export function getMonthlyFields(): string[] {
  return PL_SECTIONS
    .flatMap(s => s.items)
    .filter(i => i.source_type === 'manual_monthly' && i.month_field)
    .map(i => i.month_field!);
}

/**
 * Find a line item config by key
 */
export function findLineItem(key: string): LineItem | undefined {
  for (const section of PL_SECTIONS) {
    const item = section.items.find(i => i.key === key);
    if (item) return item;
  }
  return undefined;
}

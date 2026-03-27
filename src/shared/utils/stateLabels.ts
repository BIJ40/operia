/**
 * Mapping centralisé des codes d'état API → labels français lisibles.
 * Utilisé partout où un state brut (dossier, devis, facture, intervention…) est affiché en UX.
 */

const STATE_LABELS: Record<string, string> = {
  // --- Dossiers ---
  new: 'Nouveau',
  devis_a_faire: 'Devis à rédiger',
  devis_sent: 'Devis envoyé',
  devis_to_order: 'À commander',
  wait_fourn: 'En attente fournisseur',
  to_planify_tvx: 'À planifier travaux',
  planified_tvx: 'Planifié travaux',
  planifie_rt: 'Planifié RT',
  rt_fait: 'Retour technicien réalisé',
  to_be_invoiced: 'À facturer',
  invoiced: 'Facturé',
  invoice: 'Facturé',
  done: 'Réalisé',
  canceled: 'Annulé',
  stand_by: 'En attente',

  // --- Devis ---
  accepted: 'Accepté',
  order: 'Validé (commande)',
  refused: 'Refusé',
  draft: 'Brouillon',
  sent: 'Envoyé',

  // --- Interventions ---
  planned: 'Planifié',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',

  // --- Factures ---
  paid: 'Payé',
  unpaid: 'Impayé',
  partial: 'Partiellement payé',
  pending: 'En attente',

  // --- Générique ---
  active: 'Actif',
  inactive: 'Inactif',
  closed: 'Clôturé',
  open: 'Ouvert',
  archived: 'Archivé',
};

/**
 * Retourne le label français d'un état API brut.
 * Insensible à la casse et aux espaces.
 * Retourne le state brut si aucun mapping n'est trouvé.
 */
export function stateLabel(state: string | null | undefined): string {
  if (!state) return '—';
  const key = state.trim().toLowerCase();
  return STATE_LABELS[key] || state;
}

export { STATE_LABELS };

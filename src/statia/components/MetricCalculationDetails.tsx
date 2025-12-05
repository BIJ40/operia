/**
 * StatIA - Détails du calcul d'une métrique
 * Affiche endpoint, clés, opérations en français
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Key, Calculator, Filter, ArrowRight, Layers, Hash } from 'lucide-react';
import { StatDefinition, DataSource, AggregationType } from '../definitions/types';

// Traductions des sources de données (endpoints)
const SOURCE_LABELS: Record<DataSource, { label: string; endpoint: string; description: string }> = {
  factures: {
    label: 'Factures',
    endpoint: 'apiGetFactures',
    description: 'Liste des factures émises par l\'agence'
  },
  devis: {
    label: 'Devis',
    endpoint: 'apiGetDevis',
    description: 'Liste des devis créés par l\'agence'
  },
  interventions: {
    label: 'Interventions',
    endpoint: 'apiGetInterventions',
    description: 'Liste des interventions planifiées et réalisées'
  },
  projects: {
    label: 'Dossiers',
    endpoint: 'apiGetProjects',
    description: 'Liste des dossiers/projets de l\'agence'
  },
  users: {
    label: 'Utilisateurs',
    endpoint: 'apiGetUsers',
    description: 'Liste des utilisateurs (techniciens, etc.)'
  },
  clients: {
    label: 'Clients',
    endpoint: 'apiGetClients',
    description: 'Liste des clients et apporteurs'
  },
};

// Traductions des types d'agrégation
const AGGREGATION_LABELS: Record<AggregationType, { label: string; description: string }> = {
  sum: {
    label: 'Somme',
    description: 'Additionne toutes les valeurs trouvées'
  },
  count: {
    label: 'Comptage',
    description: 'Compte le nombre d\'éléments'
  },
  avg: {
    label: 'Moyenne',
    description: 'Calcule la moyenne des valeurs'
  },
  min: {
    label: 'Minimum',
    description: 'Retourne la plus petite valeur'
  },
  max: {
    label: 'Maximum',
    description: 'Retourne la plus grande valeur'
  },
  median: {
    label: 'Médiane',
    description: 'Retourne la valeur médiane'
  },
  ratio: {
    label: 'Ratio',
    description: 'Calcule un rapport entre deux valeurs'
  },
};

// Descriptions détaillées des calculs par ID de métrique
const METRIC_CALCULATION_DETAILS: Record<string, {
  fields: { key: string; label: string; description: string }[];
  formula: string;
  filters: string[];
  notes?: string;
}> = {
  // CA
  ca_global_ht: {
    fields: [
      { key: 'data.totalHT', label: 'Montant HT', description: 'Montant hors taxes de la facture' },
      { key: 'typeFacture', label: 'Type facture', description: 'Facture ou Avoir' },
      { key: 'dateReelle / date', label: 'Date', description: 'Date réelle prioritaire, sinon date' },
      { key: 'state / paymentStatus', label: 'État', description: 'Statut de la facture' },
    ],
    formula: 'Σ(factures.totalHT) - Σ(avoirs.totalHT)',
    filters: [
      'État inclus: sent, paid, partially_paid, overdue',
      'États exclus: draft, cancelled, pro-forma',
      'Avoirs: traités comme montants négatifs',
    ],
    notes: 'Les avoirs réduisent le CA (ils ne sont pas exclus)'
  },
  ca_par_mois: {
    fields: [
      { key: 'data.totalHT', label: 'Montant HT', description: 'Montant hors taxes' },
      { key: 'dateReelle / date', label: 'Date', description: 'Date de la facture' },
    ],
    formula: 'Pour chaque mois: Σ(factures.totalHT) - Σ(avoirs.totalHT)',
    filters: [
      'Groupé par mois (YYYY-MM)',
      'Même règles d\'état que CA global',
    ],
  },
  ca_mensuel: {
    fields: [
      { key: 'data.totalHT', label: 'Montant HT', description: 'Montant hors taxes' },
      { key: 'dateReelle / date', label: 'Date', description: 'Date de la facture' },
    ],
    formula: 'Pour chaque mois: Σ(factures.totalHT) - Σ(avoirs.totalHT)',
    filters: [
      'Groupé par mois (YYYY-MM)',
      'Même règles d\'état que CA global',
    ],
  },
  ca_moyen_par_jour: {
    fields: [
      { key: 'data.totalHT', label: 'Montant HT', description: 'Montant hors taxes' },
      { key: 'nbJours', label: 'Nb jours', description: 'Nombre de jours dans la période' },
    ],
    formula: 'CA Global HT ÷ Nombre de jours de la période',
    filters: [
      'Période = date début à aujourd\'hui (ou date fin si passée)',
    ],
  },
  du_client: {
    fields: [
      { key: 'data.calcReglementsReste', label: 'Reste à payer', description: 'Montant restant à encaisser' },
    ],
    formula: 'Σ(factures.calcReglementsReste) où reste > 0',
    filters: [
      'Uniquement les factures avec un reste positif',
    ],
  },
  panier_moyen: {
    fields: [
      { key: 'data.totalHT', label: 'Montant HT', description: 'Montant hors taxes' },
    ],
    formula: 'Σ(factures.totalHT hors avoirs) ÷ Nombre de factures',
    filters: [
      'Avoirs exclus du calcul',
      'Uniquement les factures valides',
    ],
  },
  
  // Devis
  nb_devis: {
    fields: [
      { key: 'id', label: 'ID devis', description: 'Identifiant unique du devis' },
      { key: 'date', label: 'Date', description: 'Date de création du devis' },
    ],
    formula: 'COUNT(devis)',
    filters: [
      'Tous les devis de la période',
    ],
  },
  taux_transformation_devis: {
    fields: [
      { key: 'state', label: 'État', description: 'Statut du devis (validated, signed, order, accepted)' },
      { key: 'linkedInvoiceId', label: 'Facture liée', description: 'ID de la facture associée' },
    ],
    formula: 'COUNT(devis facturés) ÷ COUNT(devis émis) × 100',
    filters: [
      'Devis facturé = state validé OU facture liée existe',
      'États validés: validated, signed, order, accepted',
    ],
  },
  taux_transformation_montant: {
    fields: [
      { key: 'data.totalHT', label: 'Montant HT devis', description: 'Montant du devis' },
      { key: 'state', label: 'État', description: 'Statut du devis' },
    ],
    formula: 'Σ(devis facturés.totalHT) ÷ Σ(devis émis.totalHT) × 100',
    filters: [
      'Taux de transformation en valeur (pas en nombre)',
    ],
  },
  
  // Techniciens
  ca_par_technicien: {
    fields: [
      { key: 'intervention.userId', label: 'Technicien', description: 'ID du technicien assigné' },
      { key: 'visites[].usersIds', label: 'Techniciens visites', description: 'IDs des techniciens présents' },
      { key: 'intervention.type2', label: 'Type intervention', description: 'Type (depannage, travaux, RT...)' },
    ],
    formula: 'Pour chaque technicien: Σ(CA des factures) réparti au prorata du temps',
    filters: [
      'Types productifs: depannage, travaux, "recherche de fuite"',
      'Types exclus: RT, TH, SAV, diagnostic',
      'RT ne génère JAMAIS de CA technicien',
    ],
    notes: 'Attribution proportionnelle via getInterventionsCreneaux'
  },
  nb_interventions_par_technicien: {
    fields: [
      { key: 'intervention.userId', label: 'Technicien', description: 'ID du technicien' },
      { key: 'state', label: 'État', description: 'Statut de l\'intervention' },
    ],
    formula: 'Pour chaque technicien: COUNT(interventions)',
    filters: [
      'États valides: validated, done, finished',
      'États exclus: draft, canceled, refused',
    ],
  },
  ca_moyen_par_tech: {
    fields: [
      { key: 'ca_par_technicien', label: 'CA par tech', description: 'CA calculé par technicien' },
    ],
    formula: 'Σ(CA par technicien) ÷ Nombre de techniciens actifs',
    filters: [
      'Techniciens actifs = ceux avec au moins 1 intervention',
    ],
  },
  
  // Univers
  ca_par_univers: {
    fields: [
      { key: 'project.data.universes', label: 'Univers', description: 'Liste des univers du dossier' },
      { key: 'facture.projectId', label: 'Dossier lié', description: 'ID du dossier de la facture' },
    ],
    formula: 'Pour chaque univers: Σ(CA des factures du dossier)',
    filters: [
      'Multi-univers: CA réparti au prorata des lignes',
      'Sans univers: classé "Non classé"',
    ],
  },
  
  // Apporteurs
  ca_par_apporteur: {
    fields: [
      { key: 'project.data.commanditaireId', label: 'Apporteur', description: 'ID du commanditaire/apporteur' },
      { key: 'facture.projectId', label: 'Dossier lié', description: 'ID du dossier' },
    ],
    formula: 'Pour chaque apporteur: Σ(CA des factures du dossier)',
    filters: [
      'Sans apporteur: classé "Direct"',
      'Jointure: factures → projects → clients',
    ],
  },
  
  // SAV
  taux_sav: {
    fields: [
      { key: 'project.linkedDossierId', label: 'Dossier lié', description: 'ID du dossier parent (SAV)' },
    ],
    formula: 'COUNT(dossiers SAV) ÷ COUNT(dossiers total) × 100',
    filters: [
      'SAV = dossier enfant/lié du dossier parent',
      'Impact CA: 0€ (reprise gratuite)',
    ],
  },
  nb_sav: {
    fields: [
      { key: 'project.linkedDossierId', label: 'Dossier lié', description: 'Identifie un SAV' },
    ],
    formula: 'COUNT(dossiers avec linkedDossierId)',
    filters: [
      'SAV identifié par la présence d\'un dossier parent',
    ],
  },
  
  // Dossiers
  nb_dossiers: {
    fields: [
      { key: 'id', label: 'ID dossier', description: 'Identifiant unique' },
      { key: 'date / created_at', label: 'Date création', description: 'Date d\'ouverture du dossier' },
    ],
    formula: 'COUNT(dossiers)',
    filters: [
      'Tous les dossiers de la période',
    ],
  },
  delai_premier_devis: {
    fields: [
      { key: 'project.date', label: 'Date dossier', description: 'Date création du dossier' },
      { key: 'history[].labelKind', label: 'Historique', description: 'Transitions de workflow' },
    ],
    formula: 'Moyenne(date "Devis envoyé" - date création)',
    filters: [
      'Recherche kind=2 et labelKind contenant " => Devis envoyé"',
      'Délais > 60 jours exclus',
    ],
  },
  
  // Recouvrement
  recouvrement_total: {
    fields: [
      { key: 'data.calcReglementsReste', label: 'Reste à payer', description: 'Montant restant' },
      { key: 'payments[]', label: 'Paiements', description: 'Liste des règlements reçus' },
    ],
    formula: 'Σ(factures.totalTTC) - Σ(paiements reçus)',
    filters: [
      'Inclut toutes les factures non soldées',
    ],
  },
};

interface MetricCalculationDetailsProps {
  definition: StatDefinition;
}

export function MetricCalculationDetails({ definition }: MetricCalculationDetailsProps) {
  const sources = Array.isArray(definition.source) ? definition.source : [definition.source];
  const aggregation = AGGREGATION_LABELS[definition.aggregation];
  const details = METRIC_CALCULATION_DETAILS[definition.id];
  
  return (
    <div className="space-y-4 text-sm">
      {/* Sources de données */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-muted-foreground font-medium">
          <Database className="h-4 w-4" />
          <span>Source(s) de données</span>
        </div>
        <div className="space-y-2 pl-6">
          {sources.map(source => {
            const info = SOURCE_LABELS[source];
            return (
              <div key={source} className="flex items-start gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {info.endpoint}
                </Badge>
                <span className="text-muted-foreground">
                  → {info.label}: {info.description}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Champs utilisés */}
      {details?.fields && details.fields.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-muted-foreground font-medium">
            <Key className="h-4 w-4" />
            <span>Champs utilisés</span>
          </div>
          <div className="space-y-1 pl-6">
            {details.fields.map((field, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Badge variant="secondary" className="font-mono text-xs shrink-0">
                  {field.key}
                </Badge>
                <span className="text-muted-foreground">
                  {field.label} - {field.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Opération */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-muted-foreground font-medium">
          <Calculator className="h-4 w-4" />
          <span>Opération</span>
        </div>
        <div className="pl-6 space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary">
              {aggregation.label}
            </Badge>
            <span className="text-muted-foreground">{aggregation.description}</span>
          </div>
          
          {details?.formula && (
            <div className="p-3 bg-muted rounded-lg font-mono text-xs">
              <span className="text-primary font-semibold">Formule:</span>{' '}
              {details.formula}
            </div>
          )}
        </div>
      </div>
      
      {/* Dimensions */}
      {definition.dimensions && definition.dimensions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-muted-foreground font-medium">
            <Layers className="h-4 w-4" />
            <span>Dimensions (groupBy)</span>
          </div>
          <div className="pl-6 flex flex-wrap gap-1">
            {definition.dimensions.map(dim => (
              <Badge key={dim} variant="outline">
                {dim}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Filtres et règles */}
      {details?.filters && details.filters.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-muted-foreground font-medium">
            <Filter className="h-4 w-4" />
            <span>Filtres et règles métier</span>
          </div>
          <ul className="pl-6 space-y-1 list-disc list-inside text-muted-foreground">
            {details.filters.map((filter, idx) => (
              <li key={idx}>{filter}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Notes supplémentaires */}
      {details?.notes && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <span className="font-medium text-amber-700 dark:text-amber-400">Note:</span>{' '}
          <span className="text-amber-600 dark:text-amber-300">{details.notes}</span>
        </div>
      )}
      
      {/* Unité */}
      {definition.unit && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Hash className="h-4 w-4" />
          <span>Unité de résultat:</span>
          <Badge variant="secondary">{definition.unit}</Badge>
        </div>
      )}
    </div>
  );
}

export default MetricCalculationDetails;

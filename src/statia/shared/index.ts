/**
 * StatIA Shared - Fonctions de calcul partagées (Single Source of Truth)
 */

export { 
  calculateDelaiPremierDevis,
  type DelaiPremierDevisResult,
  type DelaiPremierDevisOptions 
} from './delaiPremierDevis';

export {
  calculateDelaiPaiementDossier,
  type DelaiPaiementDossierResult,
  type DelaiPaiementDossierOptions
} from './delaiPaiementDossier';

// P0: Helper facture pour calcul CA unifié
export {
  extractFactureMeta,
  isFactureIncludedForStat,
  calculateCAFromFactures,
  verifyCACohérence,
  isAvoirType,
  type FactureMeta,
} from './factureMeta';

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

export {
  calculateDelaiPaiementApporteur,
  type DelaiPaiementApporteurResult,
  type DelaiPaiementApporteurOptions,
  type ApporteurDelaiStats
} from './delaiPaiementApporteur';

// P0: Helper facture pour calcul CA unifié
export {
  extractFactureMeta,
  isFactureIncludedForStat,
  calculateCAFromFactures,
  verifyCACohérence,
  isAvoirType,
  type FactureMeta,
} from './factureMeta';

// Charge travaux à venir
export {
  computeChargeTravauxAvenirParUnivers,
  type ChargeTravauxResult,
  type ChargeTravauxProjet,
  type ChargeTravauxUniversStats,
  type ChargeParEtatStats
} from './chargeTravauxEngine';

// Rentabilité dossier
export {
  computeProjectProfitability,
} from './projectProfitabilityEngine';

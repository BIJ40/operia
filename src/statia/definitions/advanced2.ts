/**
 * StatIA Definitions - Pack 2 Advanced Metrics (barrel re-export)
 * 
 * Split en 7 sous-modules par domaine :
 * - advanced2-clients.ts    (Clients & Fidélité)
 * - advanced2-devis.ts      (Devis / Commercial)
 * - advanced2-factures.ts   (Factures / Cash-flow)
 * - advanced2-interventions.ts (Interventions / Productivité)
 * - advanced2-sav.ts        (SAV / Qualité)
 * - advanced2-univers.ts    (Univers / Mix Produit)
 * - advanced2-reseau.ts     (Réseau / Multi-agences)
 */

import { StatDefinition } from './types';
import { advanced2ClientsDefinitions } from './advanced2-clients';
import { advanced2DevisDefinitions } from './advanced2-devis';
import { advanced2FacturesDefinitions } from './advanced2-factures';
import { advanced2InterventionsDefinitions } from './advanced2-interventions';
import { advanced2SavDefinitions } from './advanced2-sav';
import { advanced2UniversDefinitions } from './advanced2-univers';
import { advanced2ReseauDefinitions } from './advanced2-reseau';

export const advancedDefinitions2: Record<string, StatDefinition> = {
  ...advanced2ClientsDefinitions,
  ...advanced2DevisDefinitions,
  ...advanced2FacturesDefinitions,
  ...advanced2InterventionsDefinitions,
  ...advanced2SavDefinitions,
  ...advanced2UniversDefinitions,
  ...advanced2ReseauDefinitions,
};

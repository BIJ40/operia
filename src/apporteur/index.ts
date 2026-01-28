/**
 * Apporteur Module Exports
 */

// Components
export { ApporteurLayout } from './components/ApporteurLayout';
export { ApporteurLoginDialog } from './components/ApporteurLoginDialog';

// Shared components (relocated from admin)
export { ApporteurCreateDialog } from '@/components/shared/apporteurs/ApporteurCreateDialog';
export { ApporteurUserCreateDialog } from '@/components/shared/apporteurs/ApporteurUserCreateDialog';
export { ApogeeCommanditaireSelector } from '@/components/shared/apporteurs/ApogeeCommanditaireSelector';

// Pages
export { default as ApporteurDashboard } from './pages/ApporteurDashboard';
export { default as ApporteurDossiers } from './pages/ApporteurDossiers';
export { default as ApporteurDemandes } from './pages/ApporteurDemandes';
export { default as ApporteurNouvelleDemande } from './pages/ApporteurNouvelleDemande';

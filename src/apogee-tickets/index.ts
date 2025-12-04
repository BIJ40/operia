/**
 * Module Gestion de Projet - Index
 */

// Types
export * from './types';

// Hooks
export { useApogeeTickets, useApogeeTicket, useIncompleteTickets } from './hooks/useApogeeTickets';
export { useApogeeImport, parseXlsxFile, type SheetDebugInfo } from './hooks/useApogeeImport';

// Components
export { TicketKanban } from './components/TicketKanban';
export { TicketFilters } from './components/TicketFilters';
export { TicketDetailDrawer } from './components/TicketDetailDrawer';
export { CreateTicketDialog } from './components/CreateTicketDialog';

// Pages
export { default as ApogeeTicketsKanban } from './pages/ApogeeTicketsKanban';
export { default as ApogeeTicketsList } from './pages/ApogeeTicketsList';
export { default as ApogeeTicketsImport } from './pages/ApogeeTicketsImport';
export { default as ApogeeTicketsIncomplete } from './pages/ApogeeTicketsIncomplete';
export { default as ApogeeTicketsClassify } from './pages/ApogeeTicketsClassify';
export { default as ApogeeTicketsReview } from './pages/ApogeeTicketsReview';
export { default as ApogeeTicketsAdmin } from './pages/ApogeeTicketsAdmin';
export { default as ApogeeTicketsImportBugs } from './pages/ApogeeTicketsImportBugs';
export { default as ApogeeTicketsImportEvaluated } from './pages/ApogeeTicketsImportEvaluated';
export { default as ApogeeTicketsImportPriorities } from './pages/ApogeeTicketsImportPriorities';
export { default as ApogeeTicketsImportV1 } from './pages/ApogeeTicketsImportV1';
export { default as ApogeeTicketsImportDysfonctionnements } from './pages/ApogeeTicketsImportDysfonctionnements';

/**
 * Module Ticketing Apogée - Index
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
export { default as ApogeeTicketsImport } from './pages/ApogeeTicketsImport';
export { default as ApogeeTicketsIncomplete } from './pages/ApogeeTicketsIncomplete';

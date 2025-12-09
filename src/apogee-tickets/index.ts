/**
 * Module Gestion de Projet - Index
 */

// Types
export * from './types';

// Hooks
export { useApogeeTickets, useApogeeTicket, useIncompleteTickets } from './hooks/useApogeeTickets';

// Components
export { TicketKanban } from './components/TicketKanban';
export { TicketFilters } from './components/TicketFilters';
export { TicketDetailDrawer } from './components/TicketDetailDrawer';
export { CreateTicketDialog } from './components/CreateTicketDialog';

// Pages
export { default as ApogeeTicketsKanban } from './pages/ApogeeTicketsKanban';
export { default as ApogeeTicketsList } from './pages/ApogeeTicketsList';
export { default as ApogeeTicketsIncomplete } from './pages/ApogeeTicketsIncomplete';
export { default as ApogeeTicketsReview } from './pages/ApogeeTicketsReview';
export { default as ApogeeTicketsAdmin } from './pages/ApogeeTicketsAdmin';

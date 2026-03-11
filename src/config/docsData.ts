import { 
  BookOpen, 
  Users, 
  Headset, 
  BarChart3, 
  FolderKanban, 
  Building2, 
  Car, 
  Wrench,
  Shield,
  Database,
  Zap,
  Bot
} from 'lucide-react';

export interface ModuleDoc {
  id: string;
  name: string;
  description: string;
  routes: string[];
  permissions: string;
  icon: string;
  tables: string[];
  edgeFunctions: string[];
}

export interface EdgeFunctionDoc {
  name: string;
  category: string;
  description: string;
  rateLimit: string;
  authentication: boolean;
  dependencies: string[];
}

export interface TableDoc {
  name: string;
  category: string;
  description: string;
  rowCount?: string;
  rlsEnabled: boolean;
}

export const MODULES_DOCS: ModuleDoc[] = [
  {
    id: 'guides',
    name: 'Guides (ex-Help Academy)',
    description: 'Centre de formation et documentation HelpConfort & Apogée',
    routes: ['/academy', '/academy/helpconfort', '/academy/apogee'],
    permissions: 'N0+ (base_user)',
    icon: 'BookOpen',
    tables: ['blocks', 'categories', 'documents', 'favorites'],
    edgeFunctions: ['chat-guide', 'search-embeddings'],
  },
  {
    id: 'support',
    name: 'Support',
    description: 'Système de support intégré via Gestion de Projet',
    routes: ['/support', '/support/mes-demandes'],
    permissions: 'N0+ (création)',
    icon: 'Headset',
    tables: ['apogee_tickets', 'apogee_ticket_support_exchanges'],
    edgeFunctions: ['qualify-ticket'],
  },
  {
    id: 'pilotage_agence',
    name: 'Pilotage Agence',
    description: 'Tableaux de bord et statistiques métier (StatIA)',
    routes: ['/agency', '/agency/indicateurs/*', '/diffusion'],
    permissions: 'N1+ (franchisee_user)',
    icon: 'BarChart3',
    tables: ['apogee_agencies'],
    edgeFunctions: ['proxy-apogee', 'get-kpis', 'unified-search'],
  },
  {
    id: 'apogee_tickets',
    name: 'Gestion de Projet',
    description: 'Suivi du développement Apogée (Kanban)',
    routes: ['/projects', '/projects/kanban', '/projects/list'],
    permissions: 'N0+ avec module activé',
    icon: 'FolderKanban',
    tables: ['apogee_tickets', 'apogee_ticket_comments', 'apogee_ticket_history'],
    edgeFunctions: [],
  },
  {
    id: 'reseau_franchiseur',
    name: 'Réseau Franchiseur',
    description: 'Supervision multi-agences pour le siège',
    routes: ['/hc-reseau', '/hc-reseau/agences', '/hc-reseau/tableaux'],
    permissions: 'N3+ (franchisor_user)',
    icon: 'Building2',
    tables: ['apogee_agencies', 'animator_visits', 'franchiseur_roles'],
    edgeFunctions: ['network-kpis', 'proxy-apogee'],
  },
  {
    id: 'rh',
    name: 'Ressources Humaines',
    description: 'Gestion des collaborateurs, contrats, documents RH (back-office N2+)',
    routes: ['/rh/suivi', '/rh/plannings', '/rh/reunions'],
    permissions: 'N2+ (franchisee_admin)',
    icon: 'Users',
    tables: ['collaborators', 'collaborator_documents', 'employment_contracts'],
    edgeFunctions: [],
  },
  {
    id: 'parc',
    name: 'Parc & Équipements',
    description: 'Gestion de flotte véhicules et équipements EPI',
    routes: ['/agency/parc', '/agency/equipements'],
    permissions: 'N2+ avec module activé',
    icon: 'Car',
    tables: ['fleet_vehicles', 'maintenance_events', 'maintenance_alerts'],
    edgeFunctions: ['maintenance-alerts-scan'],
  },
  {
    id: 'admin_plateforme',
    name: 'Administration',
    description: 'Gestion de la plateforme HC Services',
    routes: ['/admin', '/admin/utilisateurs', '/admin/agences'],
    permissions: 'N5+ (platform_admin)',
    icon: 'Shield',
    tables: ['profiles', 'apogee_agencies'],
    edgeFunctions: [],
  },
];

export const EDGE_FUNCTIONS_DOCS: EdgeFunctionDoc[] = [
  // Proxy & Data
  { name: 'proxy-apogee', category: 'Proxy', description: 'Passerelle sécurisée vers l\'API Apogée', rateLimit: '30/min (120 franchiseur)', authentication: true, dependencies: ['APOGEE_API_KEY'] },
  
  // AI & RAG
  { name: 'chat-guide', category: 'IA', description: 'Chat conversationnel Helpi avec streaming', rateLimit: '30/min', authentication: true, dependencies: ['OPENAI_API_KEY'] },
  { name: 'search-embeddings', category: 'IA', description: 'Recherche sémantique dans la base RAG', rateLimit: '30/min', authentication: true, dependencies: ['OPENAI_API_KEY'] },
  { name: 'unified-search', category: 'IA', description: 'Recherche unifiée StatIA + documentation', rateLimit: '20/min', authentication: true, dependencies: ['OPENAI_API_KEY'] },
  { name: 'helpi-search', category: 'IA', description: 'Recherche Helpi avec scoring pertinence', rateLimit: '30/min', authentication: true, dependencies: ['OPENAI_API_KEY'] },
  { name: 'helpi-index', category: 'IA', description: 'Indexation batch des contenus RAG', rateLimit: '5/10min', authentication: true, dependencies: ['OPENAI_API_KEY'] },
  
  { name: 'faq-search', category: 'IA', description: 'Recherche sémantique FAQ', rateLimit: '30/min', authentication: true, dependencies: ['LOVABLE_API_KEY'] },
  
  // Notifications
  { name: 'test-sms', category: 'Notifications', description: 'Test connectivité AllMySMS', rateLimit: '5/min', authentication: true, dependencies: ['ALLMYSMS_API_KEY'] },
  
  // KPIs
  { name: 'get-kpis', category: 'KPIs', description: 'Calcul KPIs agence', rateLimit: '20/min', authentication: true, dependencies: [] },
  { name: 'network-kpis', category: 'KPIs', description: 'KPIs réseau multi-agences', rateLimit: '20/min', authentication: true, dependencies: [] },
  
  // Maintenance
  { name: 'maintenance-alerts-scan', category: 'Cron', description: 'Scan quotidien alertes maintenance', rateLimit: 'Cron', authentication: false, dependencies: [] },
  
  // RAG Indexation
  { name: 'regenerate-apogee-rag', category: 'RAG', description: 'Régénération base RAG Apogée', rateLimit: '5/10min', authentication: true, dependencies: ['OPENAI_API_KEY'] },
  { name: 'regenerate-helpconfort-rag', category: 'RAG', description: 'Régénération base RAG HelpConfort', rateLimit: '5/10min', authentication: true, dependencies: ['OPENAI_API_KEY'] },
  { name: 'index-document', category: 'RAG', description: 'Indexation document individuel', rateLimit: '5/10min', authentication: true, dependencies: ['OPENAI_API_KEY'] },
  
  // GDPR
  { name: 'export-my-data', category: 'GDPR', description: 'Export données personnelles (Art. 20)', rateLimit: '1/jour', authentication: true, dependencies: [] },
];

export const TABLE_CATEGORIES = [
  { id: 'auth', name: 'Authentification & Profils', tables: ['profiles', 'franchiseur_roles', 'agency_rh_roles'] },
  { id: 'agencies', name: 'Agences', tables: ['apogee_agencies', 'agency_commercial_profile', 'agency_stamps', 'agency_royalty_config'] },
  { id: 'academy', name: 'Help Academy', tables: ['blocks', 'categories', 'documents', 'favorites', 'apporteur_blocks'] },
  { id: 'rag', name: 'RAG & IA', tables: ['guide_chunks', 'chatbot_queries', 'faq_items', 'faq_categories', 'ai_search_cache'] },
  { id: 'support', name: 'Support (Legacy)', tables: [] },
  { id: 'apogee_tickets', name: 'Gestion Projet', tables: ['apogee_tickets', 'apogee_ticket_comments', 'apogee_ticket_history', 'apogee_ticket_statuses'] },
  { id: 'rh', name: 'Ressources Humaines', tables: ['collaborators', 'collaborator_documents', 'employment_contracts', 'document_requests', 'leave_requests'] },
  { id: 'parc', name: 'Parc & Maintenance', tables: ['fleet_vehicles', 'maintenance_events', 'maintenance_alerts'] },
  
  { id: 'notifications', name: 'Notifications', tables: ['priority_announcements', 'announcement_reads', 'rh_notifications'] },
  { id: 'network', name: 'Réseau Franchiseur', tables: ['animator_visits', 'franchiseur_agency_assignments', 'expense_requests'] },
  { id: 'system', name: 'Système', tables: ['app_notification_settings', 'formation_content'] },
];

export const SYSTEM_STATS = {
  totalTables: 104,
  totalEdgeFunctions: 41,
  totalModules: 10,
  totalRlsPolicies: 150,
  totalDatabaseFunctions: 45,
};

export const STATIA_METRICS_COUNT = {
  total: 80,
  categories: [
    { name: 'CA', count: 15 },
    { name: 'Univers', count: 8 },
    { name: 'Apporteurs', count: 10 },
    { name: 'Techniciens', count: 12 },
    { name: 'SAV', count: 6 },
    { name: 'Devis', count: 8 },
    { name: 'Délais', count: 5 },
    { name: 'Interventions', count: 8 },
    { name: 'Dossiers', count: 8 },
  ],
};

export const SECURITY_FEATURES = [
  { name: 'JWT Verification', description: 'Toutes les Edge Functions nécessitent un JWT valide', status: 'active' },
  { name: 'CORS Hardening', description: 'Origines autorisées strictement limitées', status: 'active' },
  { name: 'Rate Limiting', description: 'Limites de requêtes par utilisateur/fonction', status: 'active' },
  { name: 'RLS Policies', description: '150+ politiques de sécurité sur toutes les tables', status: 'active' },
  { name: 'Agency Isolation', description: 'Isolation des données par agence', status: 'active' },
  { name: 'Sentry Monitoring', description: 'Surveillance des erreurs frontend et backend', status: 'active' },
];

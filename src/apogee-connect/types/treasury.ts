/**
 * Types pour le module Trésorerie
 */

// ── Statuts ──
export type BankConnectionStatus = 
  | 'pending' 
  | 'connecting' 
  | 'active' 
  | 'syncing' 
  | 'requires_reauth' 
  | 'expired' 
  | 'error' 
  | 'disconnected';

export type BankConfigStatus = 'not_configured' | 'partial' | 'ready' | 'error';

export type AccountType = 'checking' | 'savings' | 'card' | 'loan' | 'other';

export type AccountSyncStatus = 'pending' | 'synced' | 'error' | 'stale';

export type TransactionType = 'debit' | 'credit' | 'other';

export type ReconciliationStatus = 'unmatched' | 'suggested' | 'matched' | 'manual_match' | 'ignored';

export type SyncType = 'full' | 'incremental' | 'accounts_only' | 'transactions_only';

export type SyncLogStatus = 'started' | 'success' | 'partial' | 'error';

// ── Modèles ──
export interface BankProviderConfig {
  id: string;
  agency_id: string;
  provider: string;
  environment: 'sandbox' | 'production';
  is_enabled: boolean;
  is_ready: boolean;
  config_status: BankConfigStatus;
  has_client_id: boolean;
  has_secret_key: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BankConnection {
  id: string;
  agency_id: string;
  user_id: string;
  provider: string;
  external_connection_id: string | null;
  external_user_id: string | null;
  external_item_id: string | null;
  redirect_session_id: string | null;
  provider_status: string | null;
  provider_last_payload: Record<string, unknown> | null;
  display_name: string;
  status: BankConnectionStatus;
  consent_expires_at: string | null;
  last_sync_at: string | null;
  last_success_sync_at: string | null;
  last_error_at: string | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  bank_connection_id: string;
  external_account_id: string | null;
  bank_name: string;
  account_label: string;
  iban_masked: string | null;
  currency: string;
  account_type: AccountType;
  balance: number;
  available_balance: number | null;
  instant_balance: number | null;
  balance_updated_at: string | null;
  sync_status: AccountSyncStatus;
  provider_account_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  external_transaction_id: string | null;
  booking_date: string;
  value_date: string | null;
  label: string;
  raw_label: string | null;
  amount: number;
  currency: string;
  transaction_type: TransactionType;
  provider_category: string | null;
  internal_category: string | null;
  reconciliation_status: ReconciliationStatus;
  reconciliation_confidence: number | null;
  matched_invoice_id: string | null;
  matched_facture_id: string | null;
  matched_project_id: string | null;
  pointed_at: string | null;
  raw_payload: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BankSyncLog {
  id: string;
  bank_connection_id: string;
  sync_type: SyncType;
  status: SyncLogStatus;
  started_at: string;
  finished_at: string | null;
  items_received: number;
  items_created: number;
  items_updated: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

// ── KPIs agrégés ──
export interface TreasuryOverview {
  consolidatedBalance: number;
  connectedAccountsCount: number;
  connectedBanksCount: number;
  lastSyncAt: string | null;
  recentCredits: number;
  recentDebits: number;
  unmatchedTransactionsCount: number;
  errorAccountsCount: number;
}

// ── Labels / badges ──
export const CONNECTION_STATUS_LABELS: Record<BankConnectionStatus, string> = {
  pending: 'En attente',
  connecting: 'Connexion...',
  active: 'Active',
  syncing: 'Synchronisation...',
  requires_reauth: 'Réauthentification',
  expired: 'Expirée',
  error: 'Erreur',
  disconnected: 'Déconnectée',
};

export const CONNECTION_STATUS_COLORS: Record<BankConnectionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  connecting: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  syncing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  requires_reauth: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  disconnected: 'bg-muted text-muted-foreground',
};

export const RECONCILIATION_LABELS: Record<ReconciliationStatus, string> = {
  unmatched: 'Non rapproché',
  suggested: 'Suggestion',
  matched: 'Rapproché',
  manual_match: 'Manuel',
  ignored: 'Ignoré',
};

export const RECONCILIATION_COLORS: Record<ReconciliationStatus, string> = {
  unmatched: 'bg-muted text-muted-foreground',
  suggested: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  matched: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  manual_match: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ignored: 'bg-muted text-muted-foreground/60',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Courant',
  savings: 'Épargne',
  card: 'Carte',
  loan: 'Prêt',
  other: 'Autre',
};

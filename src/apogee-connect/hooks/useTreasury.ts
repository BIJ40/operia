/**
 * Hooks Trésorerie — TanStack Query hooks for treasury module
 * 
 * Note: The bank_* tables are new and not yet in the generated Supabase types.
 * We use type assertions to work with the Supabase client until types are regenerated.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  BankProviderConfig,
  BankConnection,
  BankAccount,
  BankTransaction,
  BankSyncLog,
  TreasuryOverview,
} from '../types/treasury';

// Typed helper to query tables not yet in generated types
const fromTable = (table: string) => (supabase as any).from(table);

// ── Query keys ──
export const TREASURY_KEYS = {
  all: ['treasury'] as const,
  config: ['treasury', 'config'] as const,
  connections: ['treasury', 'connections'] as const,
  accounts: ['treasury', 'accounts'] as const,
  transactions: (filters?: Record<string, unknown>) => ['treasury', 'transactions', filters] as const,
  syncLogs: ['treasury', 'sync-logs'] as const,
  overview: ['treasury', 'overview'] as const,
};

// ── useBankConfigStatus ──
export function useBankConfigStatus() {
  return useQuery({
    queryKey: TREASURY_KEYS.config,
    queryFn: async (): Promise<BankProviderConfig | null> => {
      const { data, error } = await fromTable('bank_provider_configs')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as BankProviderConfig | null;
    },
  });
}

// ── useBankConnections ──
export function useBankConnections() {
  return useQuery({
    queryKey: TREASURY_KEYS.connections,
    queryFn: async (): Promise<BankConnection[]> => {
      const { data, error } = await fromTable('bank_connections')
        .select('*')
        .neq('status', 'disconnected')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BankConnection[];
    },
  });
}

// ── useBankAccounts ──
export function useBankAccounts() {
  return useQuery({
    queryKey: TREASURY_KEYS.accounts,
    queryFn: async (): Promise<BankAccount[]> => {
      const { data, error } = await fromTable('bank_accounts')
        .select('*')
        .order('bank_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BankAccount[];
    },
  });
}

// ── useBankTransactions ──
export interface TransactionFilters {
  accountId?: string;
  type?: 'debit' | 'credit';
  reconciliation?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export function useBankTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: TREASURY_KEYS.transactions(filters as unknown as Record<string, unknown>),
    queryFn: async (): Promise<{ data: BankTransaction[]; count: number }> => {
      const pageSize = filters.pageSize ?? 50;
      const page = filters.page ?? 0;

      let query = fromTable('bank_transactions')
        .select('*', { count: 'exact' })
        .order('booking_date', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.accountId) query = query.eq('bank_account_id', filters.accountId);
      if (filters.type) query = query.eq('transaction_type', filters.type);
      if (filters.reconciliation) query = query.eq('reconciliation_status', filters.reconciliation);
      if (filters.dateFrom) query = query.gte('booking_date', filters.dateFrom);
      if (filters.dateTo) query = query.lte('booking_date', filters.dateTo);
      if (filters.search) query = query.ilike('label', `%${filters.search}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data ?? []) as BankTransaction[], count: count ?? 0 };
    },
  });
}

// ── useTreasuryOverview ──
export function useTreasuryOverview() {
  const { data: connections, isLoading: loadingConn } = useBankConnections();
  const { data: accounts, isLoading: loadingAcct } = useBankAccounts();

  const overview: TreasuryOverview | null = (!loadingConn && !loadingAcct && connections && accounts) ? {
    consolidatedBalance: accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0),
    connectedAccountsCount: accounts.length,
    connectedBanksCount: new Set(accounts.map(a => a.bank_name).filter(Boolean)).size,
    lastSyncAt: connections
      .map(c => c.last_sync_at)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null,
    recentCredits: 0,
    recentDebits: 0,
    unmatchedTransactionsCount: 0,
    errorAccountsCount: accounts.filter(a => a.sync_status === 'error').length,
  } : null;

  return {
    data: overview,
    isLoading: loadingConn || loadingAcct,
  };
}

// ── useBankSyncLogs ──
export function useBankSyncLogs(connectionId?: string) {
  return useQuery({
    queryKey: [...TREASURY_KEYS.syncLogs, connectionId],
    queryFn: async (): Promise<BankSyncLog[]> => {
      let query = fromTable('bank_sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      if (connectionId) query = query.eq('bank_connection_id', connectionId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as BankSyncLog[];
    },
    enabled: !!connectionId,
  });
}

// ── Mutations ──
export function useCreateBankConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { displayName: string; provider?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data: profile } = await (supabase as any).from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .single();
      if (!profile?.agency_id) throw new Error('Agence non trouvée');

      const { data, error } = await fromTable('bank_connections')
        .insert({
          agency_id: profile.agency_id,
          user_id: user.id,
          display_name: params.displayName,
          provider: params.provider ?? 'bridge',
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TREASURY_KEYS.connections });
      qc.invalidateQueries({ queryKey: TREASURY_KEYS.overview });
    },
  });
}

export function useDisconnectBankConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await fromTable('bank_connections')
        .update({ status: 'disconnected' })
        .eq('id', connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TREASURY_KEYS.all });
    },
  });
}

export function useSyncBankConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await fromTable('bank_connections')
        .update({ status: 'syncing', last_sync_at: new Date().toISOString() })
        .eq('id', connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TREASURY_KEYS.connections });
    },
  });
}

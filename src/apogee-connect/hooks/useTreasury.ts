/**
 * Hooks Trésorerie — TanStack Query hooks for treasury module
 * 
 * All mutations go through the treasury-connection edge function.
 * Bridge callback handled via treasury-bridge-callback edge function.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeInvoke } from '@/lib/safeQuery';
import type {
  BankProviderConfig,
  BankConnection,
  BankAccount,
  BankTransaction,
  BankSyncLog,
  TreasuryOverview,
} from '../types/treasury';

// Typed helper — tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const hasRealData = !loadingConn && !loadingAcct && connections && accounts && connections.length > 0;

  const overview: TreasuryOverview | null = hasRealData ? {
    consolidatedBalance: accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0),
    connectedAccountsCount: accounts.length,
    connectedBanksCount: new Set(accounts.map(a => a.bank_name).filter(Boolean)).size,
    lastSyncAt: connections
      .map(c => c.last_success_sync_at)
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

// ═══════════════════════════════════════════════════════════
// Mutations — all via edge functions
// ═══════════════════════════════════════════════════════════

interface CreateConnectionResult {
  connectionId: string;
  bridgeConnectUrl?: string;
  bridgeSessionId?: string;
}

export function useCreateBankConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { displayName: string; provider?: string }): Promise<CreateConnectionResult> => {
      const result = await safeInvoke<{ data: CreateConnectionResult }>(
        supabase.functions.invoke('treasury-connection', {
          body: {
            action: 'create',
            displayName: params.displayName,
            provider: params.provider ?? 'bridge',
            callbackUrl: `${window.location.origin}/?tab=pilotage.tresorerie&bridge_callback=1`,
          },
        }),
        'TREASURY_CREATE_CONNECTION'
      );
      if (!result.success) throw new Error(result.error?.message ?? 'Erreur');
      // The edge function wraps in { success: true, data: {...} }
      const responseData = result.data as unknown as { data?: CreateConnectionResult } & CreateConnectionResult;
      return responseData.data ?? responseData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TREASURY_KEYS.connections });
      qc.invalidateQueries({ queryKey: TREASURY_KEYS.overview });
    },
  });
}

/**
 * Process Bridge callback after user returns from Bridge Connect.
 */
export function useProcessBridgeCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      connectionId: string;
      success?: boolean;
      item_id?: string;
      step?: string;
      source?: string;
      context?: string;
      user_uuid?: string;
    }) => {
      const result = await safeInvoke(
        supabase.functions.invoke('treasury-bridge-callback', {
          body: params,
        }),
        'TREASURY_BRIDGE_CALLBACK'
      );
      if (!result.success) throw new Error(result.error?.message ?? 'Erreur callback');
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TREASURY_KEYS.all });
    },
  });
}

export function useDisconnectBankConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const result = await safeInvoke(
        supabase.functions.invoke('treasury-connection', {
          body: { action: 'disconnect', connectionId },
        }),
        'TREASURY_DISCONNECT'
      );
      if (!result.success) throw new Error(result.error?.message ?? 'Erreur');
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
      const result = await safeInvoke(
        supabase.functions.invoke('treasury-connection', {
          body: { action: 'sync', connectionId },
        }),
        'TREASURY_SYNC'
      );
      if (!result.success) throw new Error(result.error?.message ?? 'Erreur');
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TREASURY_KEYS.all });
    },
  });
}

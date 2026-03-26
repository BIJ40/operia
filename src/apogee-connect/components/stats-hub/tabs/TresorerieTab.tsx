/**
 * TresorerieTab — Cockpit Trésorerie premium
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Landmark } from 'lucide-react';
import {
  useTreasuryOverview,
  useBankConfigStatus,
  useBankConnections,
  useBankAccounts,
  useBankTransactions,
  useSyncBankConnection,
  useDisconnectBankConnection,
  type TransactionFilters,
} from '@/apogee-connect/hooks/useTreasury';
import { TreasuryHeroCards } from '../tresorerie/TreasuryHeroCards';
import { BankConfigCard } from '../tresorerie/BankConfigCard';
import { BankConnectionsPanel } from '../tresorerie/BankConnectionsPanel';
import { BankAccountsPanel } from '../tresorerie/BankAccountsPanel';
import { BankTransactionsTable } from '../tresorerie/BankTransactionsTable';
import { TreasuryEmptyState } from '../tresorerie/TreasuryEmptyState';
import { BankConnectionSheet } from '../tresorerie/BankConnectionSheet';

export function TresorerieTab() {
  const { data: overview, isLoading: loadingOverview } = useTreasuryOverview();
  const { data: config, isLoading: loadingConfig } = useBankConfigStatus();
  const { data: connections = [], isLoading: loadingConns } = useBankConnections();
  const { data: accounts = [], isLoading: loadingAccounts } = useBankAccounts();

  // Transaction filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [reconciliationFilter, setReconciliationFilter] = useState('all');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const txFilters: TransactionFilters = {
    search: search || undefined,
    type: typeFilter !== 'all' ? (typeFilter as 'debit' | 'credit') : undefined,
    reconciliation: reconciliationFilter !== 'all' ? reconciliationFilter : undefined,
    page,
    pageSize,
  };

  const { data: txResult, isLoading: loadingTx } = useBankTransactions(txFilters);
  const syncMutation = useSyncBankConnection();
  const disconnectMutation = useDisconnectBankConnection();

  const [showConnectSheet, setShowConnectSheet] = useState(false);

  const handleSync = useCallback((id: string) => syncMutation.mutate(id), [syncMutation]);
  const handleDisconnect = useCallback((id: string) => disconnectMutation.mutate(id), [disconnectMutation]);

  const hasConnections = connections.length > 0;
  const hasRealBankData = accounts.length > 0;
  const isLoading = loadingOverview || loadingConfig || loadingConns || loadingAccounts;

  return (
    <motion.div
      className="space-y-6 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* BLOC 1 — Hero KPI */}
      <section>
        <TreasuryHeroCards
          overview={overview}
          isLoading={isLoading}
          hasConnections={hasConnections}
        />
      </section>

      {/* Show empty state if no connections, with config visible */}
      {!isLoading && !hasConnections && (
        <TreasuryEmptyState onConnect={() => setShowConnectSheet(true)} />
      )}

      {/* BLOC 2 + 3 — Config + Connexions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BankConfigCard config={config ?? null} isLoading={loadingConfig} />
        <BankConnectionsPanel
          connections={connections}
          isLoading={loadingConns}
          onSync={handleSync}
          onDisconnect={handleDisconnect}
          isSyncing={syncMutation.isPending}
        />
      </div>

      {/* BLOC 4 — Comptes */}
      {hasConnections && (
        <section>
          <BankAccountsPanel accounts={accounts} isLoading={loadingAccounts} />
        </section>
      )}

      {/* BLOC 5 — Transactions */}
      {hasConnections && (
        <section>
          <BankTransactionsTable
            transactions={txResult?.data ?? []}
            count={txResult?.count ?? 0}
            isLoading={loadingTx}
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            typeFilter={typeFilter}
            onTypeFilterChange={(v) => { setTypeFilter(v); setPage(0); }}
            reconciliationFilter={reconciliationFilter}
            onReconciliationFilterChange={(v) => { setReconciliationFilter(v); setPage(0); }}
            page={page}
            onPageChange={setPage}
            pageSize={pageSize}
          />
        </section>
      )}

      {/* Connection sheet */}
      <BankConnectionSheet open={showConnectSheet} onOpenChange={setShowConnectSheet} />
    </motion.div>
  );
}

/**
 * Bank Provider Adapter — Interface abstraite pour brancher un provider bancaire
 * 
 * Cette interface définit le contrat que tout provider (Bridge, Plaid, etc.)
 * devra implémenter. Pour l'instant, une implémentation mock est fournie.
 */

import type { BankAccount, BankTransaction, BankConnection } from '../types/treasury';

export interface BankProviderConfig {
  provider: string;
  environment: 'sandbox' | 'production';
  clientId?: string;
  // secretKey is NEVER passed to the frontend
}

export interface InitConnectionResult {
  redirectUrl: string;
  externalConnectionId: string;
}

export interface SyncResult {
  accounts: Partial<BankAccount>[];
  transactions: Partial<BankTransaction>[];
  success: boolean;
  error?: string;
}

/**
 * Interface du provider bancaire
 * Chaque provider (Bridge, Plaid, etc.) implémente cette interface
 */
export interface IBankProvider {
  /** Vérifier la validité de la configuration */
  checkConfig(): Promise<{ valid: boolean; message?: string }>;

  /** Initier une connexion bancaire (redirige vers le provider) */
  initConnection(userId: string, agencyId: string): Promise<InitConnectionResult>;

  /** Récupérer les comptes d'une connexion */
  fetchAccounts(connection: BankConnection): Promise<Partial<BankAccount>[]>;

  /** Récupérer les transactions d'un compte */
  fetchTransactions(accountId: string, from?: Date, to?: Date): Promise<Partial<BankTransaction>[]>;

  /** Resynchroniser une connexion */
  resync(connection: BankConnection): Promise<SyncResult>;

  /** Gérer les erreurs provider */
  handleError(error: unknown): { code: string; message: string };
}

/**
 * Mock provider — utilisé tant qu'aucun provider réel n'est branché
 */
export class MockBankProvider implements IBankProvider {
  async checkConfig() {
    return { valid: false, message: 'Aucun provider bancaire configuré. Connectez Bridge ou un autre provider.' };
  }

  async initConnection(_userId: string, _agencyId: string): Promise<InitConnectionResult> {
    return {
      redirectUrl: '#',
      externalConnectionId: 'mock-' + Date.now(),
    };
  }

  async fetchAccounts(_connection: BankConnection): Promise<Partial<BankAccount>[]> {
    return [];
  }

  async fetchTransactions(_accountId: string): Promise<Partial<BankTransaction>[]> {
    return [];
  }

  async resync(_connection: BankConnection): Promise<SyncResult> {
    return { accounts: [], transactions: [], success: true };
  }

  handleError(error: unknown) {
    return {
      code: 'MOCK_ERROR',
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/** Singleton du provider actif */
let activeProvider: IBankProvider = new MockBankProvider();

export function getBankProvider(): IBankProvider {
  return activeProvider;
}

export function setBankProvider(provider: IBankProvider) {
  activeProvider = provider;
}

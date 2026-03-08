/**
 * Utilitaire de logs centralisé
 * 
 * PONT vers le logger structuré (src/lib/observability/index.ts).
 * L'API publique est inchangée : logDebug, logInfo, logWarn, logError + catégories.
 * En interne, chaque appel délègue à createLogger pour bénéficier du format structuré
 * et de l'intégration Sentry contextuelle.
 */

import { createLogger } from './observability';

const isDev = import.meta.env.DEV;
const debugEnabled = import.meta.env.VITE_DEBUG_LOGS === 'true';
const canDebug = isDev || debugEnabled;

// Logger par défaut pour les appels non catégorisés
const defaultLogger = createLogger({ module: 'app' });

/**
 * Log de debug - n'apparaît qu'en développement ou si VITE_DEBUG_LOGS=true
 */
export const logDebug = (...args: unknown[]): void => {
  if (canDebug) {
    defaultLogger.debug(argsToMessage(args), argsToData(args));
  }
};

/**
 * Log d'information - n'apparaît qu'en développement
 */
export const logInfo = (...args: unknown[]): void => {
  if (canDebug) {
    defaultLogger.info(argsToMessage(args), argsToData(args));
  }
};

/**
 * Log d'avertissement - n'apparaît qu'en développement
 */
export const logWarn = (...args: unknown[]): void => {
  if (canDebug) {
    defaultLogger.warn(argsToMessage(args), argsToData(args));
  }
};

/**
 * Log d'erreur - toujours actif (même en production)
 * Envoie automatiquement à Sentry via createLogger
 */
export const logError = (...args: unknown[]): void => {
  const errorObj = args.find((a) => a instanceof Error) as Error | undefined;
  defaultLogger.error(argsToMessage(args), errorObj ?? argsToData(args));
};

// ============================================================================
// Helpers — convertissent les args variadic en message + data structuré
// ============================================================================

function argsToMessage(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) return a.message;
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch { return String(a); }
    })
    .join(' ');
}

function argsToData(args: unknown[]): unknown | undefined {
  const nonStrings = args.filter((a) => typeof a !== 'string' && !(a instanceof Error));
  if (nonStrings.length === 0) return undefined;
  if (nonStrings.length === 1) return nonStrings[0];
  return nonStrings;
}

// ============================================================================
// Catégories — même API publique, délèguent vers des loggers scopés
// ============================================================================

function makeScopedLogger(module: string) {
  const logger = createLogger({ module });
  return {
    debug: (...args: unknown[]) => { if (canDebug) logger.debug(argsToMessage(args), argsToData(args)); },
    info: (...args: unknown[]) => { if (canDebug) logger.info(argsToMessage(args), argsToData(args)); },
    warn: (...args: unknown[]) => { if (canDebug) logger.warn(argsToMessage(args), argsToData(args)); },
    error: (...args: unknown[]) => {
      const err = args.find((a) => a instanceof Error) as Error | undefined;
      logger.error(argsToMessage(args), err ?? argsToData(args));
    },
  };
}

/** Log Apogée API */
export const logApogee = makeScopedLogger('APOGEE');

/** Log Auth */
export const logAuth = makeScopedLogger('AUTH');

/** Log Permissions */
export const logPermissions = {
  debug: (...args: unknown[]) => { if (canDebug) makeScopedLogger('PERMISSIONS').debug(...args); },
  warn: (...args: unknown[]) => { if (canDebug) makeScopedLogger('PERMISSIONS').warn(...args); },
};

/** Log Cache */
export const logCache = makeScopedLogger('CACHE');

/** Log Connection */
export const logConnection = makeScopedLogger('CONNECTION');

/** Log Network/Franchiseur */
export const logNetwork = makeScopedLogger('NETWORK');

/** Log Editor */
export const logEditor = makeScopedLogger('EDITOR');

/**
 * Vérifie si on est en mode développement
 */
export const isDevMode = (): boolean => canDebug;

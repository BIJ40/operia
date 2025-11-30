/**
 * Utilitaire de logs centralisé
 * 
 * En production, seuls les logs d'erreur sont affichés.
 * En développement (ou avec VITE_DEBUG_LOGS=true), tous les logs sont actifs.
 * 
 * Les erreurs (logError) sont automatiquement envoyées à Sentry si VITE_SENTRY_DSN est défini.
 */

import * as Sentry from "@sentry/react";

const isDev = import.meta.env.DEV;
const debugEnabled = import.meta.env.VITE_DEBUG_LOGS === 'true';
const canDebug = isDev || debugEnabled;

// Sentry n'envoie que si le DSN est configuré (évite le bruit en dev)
const IS_SENTRY_ENABLED = !!import.meta.env.VITE_SENTRY_DSN;

/**
 * Log de debug - n'apparaît qu'en développement ou si VITE_DEBUG_LOGS=true
 * Utiliser pour les informations de diagnostic détaillées
 */
export const logDebug = (...args: unknown[]): void => {
  if (canDebug) {
    console.log('[DEBUG]', ...args);
  }
};

/**
 * Log d'information - n'apparaît qu'en développement
 * Utiliser pour les événements importants normaux
 */
export const logInfo = (...args: unknown[]): void => {
  if (canDebug) {
    console.info('[INFO]', ...args);
  }
};

/**
 * Log d'avertissement - n'apparaît qu'en développement
 * Utiliser pour les situations anormales mais non bloquantes
 */
export const logWarn = (...args: unknown[]): void => {
  if (canDebug) {
    console.warn('[WARN]', ...args);
  }
};

/**
 * Log d'erreur - toujours actif (même en production)
 * Utiliser pour les erreurs et exceptions critiques
 * Envoie automatiquement à Sentry si VITE_SENTRY_DSN est défini
 */
export const logError = (...args: unknown[]): void => {
  console.error('[ERROR]', ...args);

  if (!IS_SENTRY_ENABLED) return;

  try {
    const message = args
      .map((a) => {
        if (a instanceof Error) return a.message;
        if (typeof a === 'string') return a;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(' ');

    const errorObj = args.find((a) => a instanceof Error) as Error | undefined;

    if (errorObj) {
      Sentry.captureException(errorObj, {
        tags: { logger: 'app' },
        extra: { rawArgs: args },
      });
    } else {
      Sentry.captureMessage(message || 'logError without message', {
        level: 'error',
        tags: { logger: 'app' },
        extra: { rawArgs: args },
      });
    }
  } catch {
    // Ne jamais casser l'app si Sentry plante
  }
};

/**
 * Log de dépréciation - n'apparaît qu'une seule fois par message, uniquement en dev
 * Utiliser pour marquer les fonctions/méthodes obsolètes
 */
const deprecationWarnings = new Set<string>();
export const logDeprecation = (message: string): void => {
  if (canDebug && !deprecationWarnings.has(message)) {
    console.warn('[DEPRECATED]', message);
    deprecationWarnings.add(message);
  }
};

/**
 * Log Apogée API - catégorisé pour faciliter le filtrage
 */
export const logApogee = {
  debug: (...args: unknown[]) => logDebug('[APOGEE]', ...args),
  info: (...args: unknown[]) => logInfo('[APOGEE]', ...args),
  warn: (...args: unknown[]) => logWarn('[APOGEE]', ...args),
  error: (...args: unknown[]) => logError('[APOGEE]', ...args),
};

/**
 * Log Auth - catégorisé pour faciliter le filtrage
 */
export const logAuth = {
  debug: (...args: unknown[]) => logDebug('[AUTH]', ...args),
  info: (...args: unknown[]) => logInfo('[AUTH]', ...args),
  warn: (...args: unknown[]) => logWarn('[AUTH]', ...args),
  error: (...args: unknown[]) => logError('[AUTH]', ...args),
};

/**
 * Log Permissions - catégorisé pour faciliter le filtrage
 */
export const logPermissions = {
  debug: (...args: unknown[]) => logDebug('[PERMISSIONS]', ...args),
  warn: (...args: unknown[]) => logWarn('[PERMISSIONS]', ...args),
};

/**
 * Log Cache - catégorisé pour faciliter le filtrage
 */
export const logCache = {
  debug: (...args: unknown[]) => logDebug('[CACHE]', ...args),
  info: (...args: unknown[]) => logInfo('[CACHE]', ...args),
  warn: (...args: unknown[]) => logWarn('[CACHE]', ...args),
  error: (...args: unknown[]) => logError('[CACHE]', ...args),
};

/**
 * Log Connection - catégorisé pour le logging de connexion
 */
export const logConnection = {
  debug: (...args: unknown[]) => logDebug('[CONNECTION]', ...args),
  info: (...args: unknown[]) => logInfo('[CONNECTION]', ...args),
  warn: (...args: unknown[]) => logWarn('[CONNECTION]', ...args),
  error: (...args: unknown[]) => logError('[CONNECTION]', ...args),
};

/**
 * Log Network/Franchiseur - catégorisé pour les opérations multi-agences
 */
export const logNetwork = {
  debug: (...args: unknown[]) => logDebug('[NETWORK]', ...args),
  info: (...args: unknown[]) => logInfo('[NETWORK]', ...args),
  warn: (...args: unknown[]) => logWarn('[NETWORK]', ...args),
  error: (...args: unknown[]) => logError('[NETWORK]', ...args),
};

/**
 * Log Editor - catégorisé pour les opérations d'édition de contenu
 */
export const logEditor = {
  debug: (...args: unknown[]) => logDebug('[EDITOR]', ...args),
  info: (...args: unknown[]) => logInfo('[EDITOR]', ...args),
  warn: (...args: unknown[]) => logWarn('[EDITOR]', ...args),
  error: (...args: unknown[]) => logError('[EDITOR]', ...args),
};

/**
 * Vérifie si on est en mode développement
 */
export const isDevMode = (): boolean => canDebug;

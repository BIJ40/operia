/**
 * Utilitaire de logs centralisé
 * 
 * Niveaux de logs :
 * - logDebug : Actif uniquement en DEV ou si VITE_DEBUG_LOGS=true
 * - logInfo  : Toujours actif
 * - logWarn  : Toujours actif
 * - logError : Toujours actif
 * 
 * Pour activer les logs détaillés en production :
 * Ajouter VITE_DEBUG_LOGS=true dans les variables d'environnement
 */

const isDev = import.meta.env.DEV;
const debugEnabled = import.meta.env.VITE_DEBUG_LOGS === 'true';
const canDebug = isDev || debugEnabled;

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
 * Log d'information - toujours actif
 * Utiliser pour les événements importants normaux
 */
export const logInfo = (...args: unknown[]): void => {
  console.info('[INFO]', ...args);
};

/**
 * Log d'avertissement - toujours actif
 * Utiliser pour les situations anormales mais non bloquantes
 */
export const logWarn = (...args: unknown[]): void => {
  console.warn('[WARN]', ...args);
};

/**
 * Log d'erreur - toujours actif
 * Utiliser pour les erreurs et exceptions
 */
export const logError = (...args: unknown[]): void => {
  console.error('[ERROR]', ...args);
};

/**
 * Log de dépréciation - toujours actif en dev, une seule fois en prod
 * Utiliser pour marquer les fonctions/méthodes obsolètes
 */
const deprecationWarnings = new Set<string>();
export const logDeprecation = (message: string): void => {
  if (canDebug || !deprecationWarnings.has(message)) {
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

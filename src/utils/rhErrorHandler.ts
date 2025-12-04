/**
 * Gestion d'erreurs uniformisée pour le module RH
 * RH-P1-03: Standardized error handling
 */

import { toast } from 'sonner';
import { logError } from '@/lib/logger';

export type RHErrorCode = 
  | 'UPLOAD_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'DELETE_FAILED'
  | 'UPDATE_FAILED'
  | 'CREATE_FAILED'
  | 'FETCH_FAILED'
  | 'VALIDATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'LOCK_FAILED'
  | 'ANALYSIS_FAILED'
  | 'UNKNOWN';

interface RHErrorDetails {
  code: RHErrorCode;
  message: string;
  userMessage: string;
  context?: Record<string, unknown>;
}

const ERROR_MESSAGES: Record<RHErrorCode, string> = {
  UPLOAD_FAILED: 'Échec de l\'upload du fichier',
  DOWNLOAD_FAILED: 'Échec du téléchargement',
  DELETE_FAILED: 'Échec de la suppression',
  UPDATE_FAILED: 'Échec de la mise à jour',
  CREATE_FAILED: 'Échec de la création',
  FETCH_FAILED: 'Échec du chargement des données',
  VALIDATION_FAILED: 'Données invalides',
  PERMISSION_DENIED: 'Accès non autorisé',
  NOT_FOUND: 'Ressource introuvable',
  LOCK_FAILED: 'Impossible de verrouiller la ressource',
  ANALYSIS_FAILED: 'Échec de l\'analyse',
  UNKNOWN: 'Une erreur inattendue s\'est produite',
};

/**
 * Parse Supabase error to determine error code
 */
function parseSupabaseError(error: unknown): RHErrorCode {
  if (!error) return 'UNKNOWN';
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes('permission') || lowerMessage.includes('policy') || lowerMessage.includes('rls')) {
    return 'PERMISSION_DENIED';
  }
  if (lowerMessage.includes('not found') || lowerMessage.includes('no rows')) {
    return 'NOT_FOUND';
  }
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
    return 'VALIDATION_FAILED';
  }
  if (lowerMessage.includes('upload')) {
    return 'UPLOAD_FAILED';
  }
  if (lowerMessage.includes('lock') || lowerMessage.includes('verrouill')) {
    return 'LOCK_FAILED';
  }
  
  return 'UNKNOWN';
}

/**
 * Create standardized RH error details
 */
export function createRHError(
  code: RHErrorCode,
  originalError?: unknown,
  context?: Record<string, unknown>
): RHErrorDetails {
  const message = originalError instanceof Error 
    ? originalError.message 
    : originalError 
      ? String(originalError)
      : ERROR_MESSAGES[code];
      
  return {
    code,
    message,
    userMessage: ERROR_MESSAGES[code],
    context,
  };
}

/**
 * Handle RH error with logging and user notification
 */
export function handleRHError(
  error: unknown,
  fallbackCode: RHErrorCode = 'UNKNOWN',
  context?: Record<string, unknown>,
  options?: {
    showToast?: boolean;
    toastDuration?: number;
  }
): RHErrorDetails {
  const code = parseSupabaseError(error) !== 'UNKNOWN' 
    ? parseSupabaseError(error) 
    : fallbackCode;
    
  const errorDetails = createRHError(code, error, context);
  
  // Log to Sentry/console
  logError(errorDetails.message, 'rh-module', {
    code: errorDetails.code,
    ...errorDetails.context,
  });
  
  // Show toast notification if enabled (default: true)
  if (options?.showToast !== false) {
    toast.error(errorDetails.userMessage, {
      description: errorDetails.code !== 'UNKNOWN' ? undefined : 'Veuillez réessayer',
      duration: options?.toastDuration ?? 4000,
    });
  }
  
  return errorDetails;
}

/**
 * Wrap async function with standardized error handling
 */
export function withRHErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  fallbackCode: RHErrorCode,
  context?: Record<string, unknown>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleRHError(error, fallbackCode, context);
      throw error;
    }
  };
}

/**
 * Success toast helper for consistency
 */
export function showRHSuccess(message: string, description?: string) {
  toast.success(message, { description });
}

/**
 * Warning toast helper for consistency
 */
export function showRHWarning(message: string, description?: string) {
  toast.warning(message, { description });
}

/**
 * Info toast helper for consistency
 */
export function showRHInfo(message: string, description?: string) {
  toast.info(message, { description });
}

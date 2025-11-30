/**
 * SafeQuery - Wrapper sécurisé pour les requêtes Supabase
 * Génère un correlationId et log les erreurs automatiquement
 */

import { logError } from "@/lib/logger";
import type { PostgrestBuilder, PostgrestFilterBuilder, PostgrestQueryBuilder } from '@supabase/postgrest-js';

export interface SafeQueryResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    correlationId: string;
    message: string;
    detail?: unknown;
  };
}

type SupabaseQueryLike = 
  | PromiseLike<{ data: any; error: any }>
  | { then: (onfulfilled: (value: { data: any; error: any }) => any) => any };

export async function safeQuery<T>(
  queryOrPromise: SupabaseQueryLike,
  code: string
): Promise<SafeQueryResult<T>> {
  try {
    const { data, error } = await Promise.resolve(queryOrPromise);
    
    if (error) {
      const correlationId = crypto.randomUUID();
      logError(`[${code}] Supabase error`, { error, correlationId });
      
      return {
        success: false,
        error: { 
          code, 
          correlationId, 
          message: error.message || "Erreur Supabase",
          detail: error
        }
      };
    }
    
    return { success: true, data: data as T };
  } catch (err) {
    const correlationId = crypto.randomUUID();
    logError(`[${code}] Unexpected error`, { error: err, correlationId });
    
    return { 
      success: false, 
      error: { 
        code, 
        correlationId, 
        message: "Erreur inattendue",
        detail: err
      } 
    };
  }
}

/**
 * Version pour les mutations (insert, update, delete)
 */
export async function safeMutation<T>(
  queryOrPromise: SupabaseQueryLike,
  code: string
): Promise<SafeQueryResult<T>> {
  return safeQuery<T>(queryOrPromise, code);
}

/**
 * Version pour les appels d'Edge Functions
 */
export async function safeInvoke<T>(
  promise: Promise<{ data: T | null; error: any }>,
  code: string
): Promise<SafeQueryResult<T>> {
  try {
    const { data, error } = await promise;
    
    if (error) {
      const correlationId = crypto.randomUUID();
      logError(`[${code}] Edge function error`, { error, correlationId });
      
      return {
        success: false,
        error: { 
          code, 
          correlationId, 
          message: error.message || "Erreur Edge Function",
          detail: error
        }
      };
    }

    // Check if the response itself contains an error structure
    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      const apiError = (data as any).error;
      return {
        success: false,
        error: {
          code: apiError?.code || code,
          correlationId: apiError?.correlationId || crypto.randomUUID(),
          message: apiError?.message || "Erreur API",
          detail: apiError?.detail
        }
      };
    }
    
    return { success: true, data: data as T };
  } catch (err) {
    const correlationId = crypto.randomUUID();
    logError(`[${code}] Unexpected invoke error`, { error: err, correlationId });
    
    return { 
      success: false, 
      error: { 
        code, 
        correlationId, 
        message: "Erreur inattendue",
        detail: err
      } 
    };
  }
}

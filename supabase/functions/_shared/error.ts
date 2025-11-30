/**
 * Helper unifié pour les réponses d'erreur des Edge Functions
 * Génère un correlationId et formate la réponse de manière standardisée
 */

export interface ErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
    correlationId: string;
    detail?: unknown;
  };
}

export function errorResponse(
  code: string, 
  message: string, 
  detail?: unknown,
  status: number = 500
): Response {
  const correlationId = crypto.randomUUID();
  
  const body: ErrorResponseBody = {
    success: false,
    error: {
      code,
      message,
      correlationId,
      detail: detail || null,
    },
  };

  console.error(`[ERROR] ${code} - ${message}`, { correlationId, detail });

  // Default CORS headers for error responses (allow all origins for errors)
  const defaultCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  return new Response(
    JSON.stringify(body),
    { 
      status, 
      headers: { 
        "Content-Type": "application/json",
        ...defaultCorsHeaders 
      } 
    }
  );
}

export function validationError(message: string, detail?: unknown): Response {
  return errorResponse("VALIDATION_ERROR", message, detail, 400);
}

export function authError(message: string = "Non autorisé"): Response {
  return errorResponse("AUTH_ERROR", message, null, 401);
}

export function forbiddenError(message: string = "Accès interdit"): Response {
  return errorResponse("FORBIDDEN_ERROR", message, null, 403);
}

export function notFoundError(message: string = "Ressource non trouvée"): Response {
  return errorResponse("NOT_FOUND_ERROR", message, null, 404);
}

export function internalError(code: string, detail?: unknown): Response {
  return errorResponse(code, "Une erreur interne est survenue", detail, 500);
}

/**
 * Helper pour les réponses de succès standardisées
 */
export interface SuccessResponseBody<T = unknown> {
  success: true;
  data: T;
}

export function successResponse<T>(data: T, status: number = 200): Response {
  const body: SuccessResponseBody<T> = {
    success: true,
    data,
  };

  const defaultCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  return new Response(
    JSON.stringify(body),
    { 
      status, 
      headers: { 
        "Content-Type": "application/json",
        ...defaultCorsHeaders 
      } 
    }
  );
}

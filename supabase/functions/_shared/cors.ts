// Centralized CORS configuration for all edge functions
// Strict mode: origin null (server-to-server) is rejected

const ENV_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',').filter(Boolean) ?? [];

const ALLOWED_ORIGINS = [
  ...ENV_ORIGINS,
  'https://helpconfort.services',
  'https://www.helpconfort.services',
  'https://operia.vision',
  'https://www.operia.vision',
  'https://suivi.helpconfort.services',
  'http://localhost:5173',
  'http://localhost:8080',
];

const ALLOWED_PATTERNS = [
  /^https:\/\/.*\.lovableproject\.com$/,
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/id-preview--[a-z0-9-]+\.lovable\.app$/,
];

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false; // Strict: reject null origin (non-browser calls)

  if (ALLOWED_ORIGINS.includes(origin)) return true;

  return ALLOWED_PATTERNS.some((pattern) => pattern.test(origin));
}

export function getCorsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-apporteur-token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function withCors(request: Request, response: Response): Response {
  const origin = request.headers.get('origin') ?? '';

  if (isOriginAllowed(origin)) {
    const corsHeaders = getCorsHeaders(origin);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

export function handleCorsPreflightOrReject(req: Request): Response | null {
  const origin = req.headers.get('origin');
  
  if (req.method === 'OPTIONS') {
    if (!isOriginAllowed(origin)) {
      return new Response('Forbidden', { status: 403 });
    }
    return new Response('OK', {
      status: 200,
      headers: getCorsHeaders(origin!),
    });
  }

  // For non-OPTIONS requests, check origin (browsers will send it)
  // Allow null origin for server-to-server calls that have valid JWT
  if (origin && !isOriginAllowed(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  return null; // Continue with request handling
}

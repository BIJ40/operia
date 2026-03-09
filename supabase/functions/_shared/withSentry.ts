/**
 * withSentry — Wrapper pour Edge Functions
 * 
 * Enveloppe automatiquement le handler avec:
 * - Capture d'exceptions vers Sentry
 * - Logging structuré
 * - CORS headers
 * - Timing
 */

import { captureEdgeException } from './sentry.ts';
import { isOriginAllowed, getCorsHeaders as getSharedCorsHeaders } from './cors.ts';

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  if (isOriginAllowed(origin)) {
    return {
      ...getSharedCorsHeaders(origin),
      'Vary': 'Origin',
    };
  }
  // Fallback for non-browser / server-to-server calls
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Vary': 'Origin',
  };
}

interface WithSentryOptions {
  functionName: string;
}

type EdgeHandler = (req: Request) => Promise<Response>;

/**
 * Wraps an edge function handler with error catching and Sentry reporting.
 * 
 * @example
 * ```ts
 * import { withSentry } from '../_shared/withSentry.ts';
 * 
 * Deno.serve(withSentry({ functionName: 'my-function' }, async (req) => {
 *   // your handler logic
 *   return new Response(JSON.stringify({ ok: true }), { status: 200 });
 * }));
 * ```
 */
export function withSentry(
  options: WithSentryOptions,
  handler: EdgeHandler
): EdgeHandler {
  return async (req: Request): Promise<Response> => {
    const corsHeaders = getCorsHeaders(req);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const start = performance.now();

    try {
      const response = await handler(req);

      // Add CORS headers to the response
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      const elapsed = Math.round(performance.now() - start);

      console.error(
        `[${options.functionName}] Unhandled error after ${elapsed}ms:`,
        error
      );

      // Report to Sentry (fire-and-forget)
      captureEdgeException(error, {
        function: options.functionName,
      }).catch(() => {
        // Ignore Sentry failures
      });

      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          function: options.functionName,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

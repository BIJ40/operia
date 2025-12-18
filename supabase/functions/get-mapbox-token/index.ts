/**
 * GET-MAPBOX-TOKEN - Retourne le token Mapbox public
 * 
 * Endpoint public (pas d'auth requise) pour récupérer le token Mapbox
 * qui est stocké dans les secrets Supabase.
 */

import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // CORS preflight
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const token = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    
    if (!token) {
      console.error('[GET-MAPBOX-TOKEN] MAPBOX_ACCESS_TOKEN not configured');
      return withCors(req, new Response(
        JSON.stringify({ error: 'Mapbox token not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }
    
    return withCors(req, new Response(
      JSON.stringify({ token }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
    
  } catch (error) {
    console.error('[GET-MAPBOX-TOKEN] Exception:', error);
    return withCors(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});

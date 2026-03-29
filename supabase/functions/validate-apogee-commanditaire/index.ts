/**
 * VALIDATE APOGEE COMMANDITAIRE
 * 
 * Valide un apogee_client_id en comptant les projets associés.
 * Retourne le nombre de dossiers où project.data.commanditaireId == apogee_client_id.
 * 
 * Sécurité:
 * - JWT obligatoire
 * - N2+ requis
 * - Scoped par agence
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

interface ValidateRequest {
  apogee_client_id: number;
}

interface ValidateResponse {
  success: boolean;
  data?: {
    projects_count: number;
    commanditaire_name?: string;
  };
  error?: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    // 1. Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 2. Vérifier N2+ via RPC
    const { data: hasRole } = await supabase.rpc('has_min_global_role', {
      _user_id: user.id,
      _min_level: 2, // franchisee_admin+
    });

    if (!hasRole) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Accès refusé (N2+ requis)' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 3. Récupérer l'agence de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single();

    // Resolve agency slug from agency_id
    let agencySlug: string | null = null;
    if (profile?.agency_id) {
      const { data: agRow } = await supabase.from('apogee_agencies').select('slug').eq('id', profile.agency_id).eq('is_active', true).maybeSingle();
      agencySlug = agRow?.slug ?? null;
    }

    if (profileError || !agencySlug) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Agence non configurée' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 4. Parser la requête
    const body: ValidateRequest = await req.json();
    const { apogee_client_id } = body;

    if (!apogee_client_id || typeof apogee_client_id !== 'number') {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'apogee_client_id requis (number)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 5. Appeler l'API Apogée directement
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Configuration serveur manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 5a. Récupérer les projets
    const projectsUrl = `https://${agencySlug}.hc-apogee.fr/api/apiGetProjects`;
    const projectsResponse = await fetch(projectsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey }),
    });

    if (!projectsResponse.ok) {
      console.error(`[VALIDATE-COMMANDITAIRE] API projects error: ${projectsResponse.status}`);
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Erreur API Apogée (projects)' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const projects = await projectsResponse.json();

    // 6. Compter les projets avec ce commanditaireId
    let projectsCount = 0;
    
    for (const project of projects) {
      // Le commanditaireId peut être dans project.data.commanditaireId ou project.commanditaireId
      const commanditaireId = project.data?.commanditaireId ?? project.commanditaireId;
      if (commanditaireId === apogee_client_id) {
        projectsCount++;
      }
    }

    // 7. Optionnel: récupérer le nom du commanditaire
    let commanditaireName: string | undefined;
    try {
      const clientsUrl = `https://${profile.agence}.hc-apogee.fr/api/apiGetClients`;
      const clientsResponse = await fetch(clientsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      });

      if (clientsResponse.ok) {
        const clients = await clientsResponse.json();
        const client = clients.find((c: Record<string, unknown>) => c.id === apogee_client_id);
        if (client) {
          commanditaireName = client.raisonSociale || `${client.nom || ''} ${client.prenom || ''}`.trim();
        }
      }
    } catch (e) {
      // Ignorer l'erreur, le nom est optionnel
      console.warn('[VALIDATE-COMMANDITAIRE] Could not fetch client name:', e);
    }

    console.log(`[VALIDATE-COMMANDITAIRE] Found ${projectsCount} projects for commanditaire ${apogee_client_id}`);

    const response: ValidateResponse = {
      success: true,
      data: {
        projects_count: projectsCount,
        commanditaire_name: commanditaireName,
      },
    };

    return withCors(req, new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[VALIDATE-COMMANDITAIRE] Exception:', error instanceof Error ? error.message : error);
    
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: 'Erreur interne' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});

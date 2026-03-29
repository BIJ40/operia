/**
 * SEARCH APOGEE COMMANDITAIRES
 * 
 * Recherche les commanditaires Apogée pour liaison avec un apporteur.
 * Passe par le proxy interne pour récupérer les clients et filtre les commanditaires.
 * 
 * Sécurité:
 * - JWT obligatoire
 * - N2+ requis
 * - Scoped par agence
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

interface SearchRequest {
  query: string;
}

interface CommanditaireResult {
  id: number;
  name: string;
  type: string;
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
    const body: SearchRequest = await req.json();
    const { query } = body;

    if (!query || query.trim().length < 2) {
      return withCors(req, new Response(
        JSON.stringify({ success: true, data: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const searchQuery = query.toLowerCase().trim();

    // 5. Appeler l'API Apogée directement (pas via proxy pour éviter le masquage)
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      console.error('[SEARCH-COMMANDITAIRES] APOGEE_API_KEY not configured');
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Configuration serveur manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const baseUrl = `https://${agencySlug}.hc-apogee.fr/api`;
    console.log(`[SEARCH-COMMANDITAIRES] Using base URL: ${baseUrl}`);

    // 5a. D'abord récupérer les projets pour identifier les commanditaireIds utilisés
    const usedCommanditaireIds = new Set<number>();
    
    try {
      const projectsResponse = await fetch(`${baseUrl}/apiGetProjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      });

      if (projectsResponse.ok) {
        const projects = await projectsResponse.json();
        console.log(`[SEARCH-COMMANDITAIRES] Fetched ${Array.isArray(projects) ? projects.length : 0} projects`);
        
        if (Array.isArray(projects)) {
          for (const project of projects) {
            const cmdId = project?.data?.commanditaireId;
            if (cmdId && typeof cmdId === 'number') {
              usedCommanditaireIds.add(cmdId);
            }
          }
        }
        console.log(`[SEARCH-COMMANDITAIRES] Found ${usedCommanditaireIds.size} unique commanditaire IDs in projects`);
      } else {
        console.warn(`[SEARCH-COMMANDITAIRES] Projects API returned ${projectsResponse.status}`);
      }
    } catch (err) {
      console.warn('[SEARCH-COMMANDITAIRES] Failed to fetch projects:', err);
    }

    // 5b. Récupérer les clients
    const clientsResponse = await fetch(`${baseUrl}/apiGetClients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey }),
    });

    if (!clientsResponse.ok) {
      console.error(`[SEARCH-COMMANDITAIRES] Clients API error: ${clientsResponse.status}`);
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Erreur API Apogée' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const clients = await clientsResponse.json();
    console.log(`[SEARCH-COMMANDITAIRES] Fetched ${Array.isArray(clients) ? clients.length : 0} clients`);

    // 6. Filtrer les commanditaires
    // Un commanditaire est identifié par:
    // - isCommanditaire === true (si le champ existe)
    // - OU type dans les types commanditaires connus
    // - OU (FALLBACK) l'ID est utilisé comme commanditaireId dans un projet
    const commanditaireTypes = [
      'assurance', 'assureur', 
      'agence', 'agence_immo', 'agence immobiliere', 'agence immobilière',
      'syndic', 'copropriete', 'copropriété',
      'courtier',
      'bailleur', 'bailleur social',
      'gestionnaire',
      'notaire',
      'expert'
    ];

    const isCommanditaire = (client: Record<string, unknown>): boolean => {
      const clientId = Number(client.id);
      
      // FALLBACK ROBUSTE: Si ce client est utilisé comme commanditaire dans un projet
      if (usedCommanditaireIds.has(clientId)) {
        return true;
      }
      
      // Flag explicite
      if (client.isCommanditaire === true || client.is_commanditaire === true) {
        return true;
      }
      
      // Type client
      const type = String(client.type || '').toLowerCase();
      const typeClient = String(client.typeClient || '').toLowerCase();
      
      // Vérifier si le type correspond
      if (commanditaireTypes.some(ct => type.includes(ct) || typeClient.includes(ct))) {
        return true;
      }
      
      // Si raisonSociale existe et non vide, c'est probablement un pro
      const raisonSociale = String(client.raisonSociale || '').trim();
      if (raisonSociale.length > 2) {
        // Exclure si c'est clairement un particulier avec prénom
        if (!client.prenom || String(client.prenom).trim().length === 0) {
          return true;
        }
      }
      
      return false;
    };

    // 7. Filtrer et rechercher
    const results: CommanditaireResult[] = [];
    
    if (Array.isArray(clients)) {
      for (const client of clients) {
        if (!isCommanditaire(client)) continue;
        
        const id = Number(client.id);
        const name = client.raisonSociale || client.name || `${client.nom || ''} ${client.prenom || ''}`.trim();
        const type = String(client.type || client.typeClient || 'autre');
        
        if (!name || name.length < 2) continue;
        
        // Recherche sur nom ou ID
        const nameMatch = name.toLowerCase().includes(searchQuery);
        const idMatch = String(id).includes(searchQuery);
        
        if (nameMatch || idMatch) {
          results.push({ id, name, type });
        }
        
        // Limiter à 25 résultats
        if (results.length >= 25) break;
      }
    }

    // Trier par nom
    results.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    console.log(`[SEARCH-COMMANDITAIRES] Found ${results.length} commanditaires for query "${query}"`);

    return withCors(req, new Response(
      JSON.stringify({ success: true, data: results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[SEARCH-COMMANDITAIRES] Exception:', error instanceof Error ? error.message : error);
    
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: 'Erreur interne' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
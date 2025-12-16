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
      .select('agence, agency_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.agence) {
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
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Configuration serveur manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const apiUrl = `https://${profile.agence}.hc-apogee.fr/api/apiGetClients`;
    
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey }),
    });

    if (!apiResponse.ok) {
      console.error(`[SEARCH-COMMANDITAIRES] API error: ${apiResponse.status}`);
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Erreur API Apogée' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const clients = await apiResponse.json();

    // 6. Filtrer les commanditaires
    // Un commanditaire est identifié par:
    // - isCommanditaire === true (si le champ existe)
    // - OU type dans ['assurance', 'agence_immo', 'syndic', 'courtier', 'bailleur', 'gestionnaire']
    // - OU typeClient indiquant un apporteur professionnel
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
      // Flag explicite
      if (client.isCommanditaire === true) return true;
      
      // Type client
      const type = String(client.type || '').toLowerCase();
      const typeClient = String(client.typeClient || '').toLowerCase();
      const raisonSociale = String(client.raisonSociale || '').toLowerCase();
      
      // Vérifier si le type correspond
      if (commanditaireTypes.some(ct => type.includes(ct) || typeClient.includes(ct))) {
        return true;
      }
      
      // Exclure les particuliers (prénom + nom sans raison sociale)
      if (!client.raisonSociale && client.nom && client.prenom) {
        return false;
      }
      
      // Si raisonSociale existe, c'est probablement un pro
      if (raisonSociale && raisonSociale.length > 2) {
        return true;
      }
      
      return false;
    };

    // 7. Filtrer et rechercher
    const results: CommanditaireResult[] = [];
    
    for (const client of clients) {
      if (!isCommanditaire(client)) continue;
      
      const id = Number(client.id);
      const name = client.raisonSociale || `${client.nom || ''} ${client.prenom || ''}`.trim();
      const type = String(client.type || client.typeClient || 'autre');
      
      // Recherche sur nom ou ID
      const nameMatch = name.toLowerCase().includes(searchQuery);
      const idMatch = String(id).includes(searchQuery);
      
      if (nameMatch || idMatch) {
        results.push({ id, name, type });
      }
      
      // Limiter à 25 résultats
      if (results.length >= 25) break;
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

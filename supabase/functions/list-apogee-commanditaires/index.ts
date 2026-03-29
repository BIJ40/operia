/**
 * LIST APOGEE COMMANDITAIRES
 * 
 * Liste TOUS les commanditaires Apogée (pas de recherche, liste complète).
 * Utilisé pour afficher une liste filtrable côté client.
 * 
 * Sécurité:
 * - JWT obligatoire
 * - N2+ requis
 * - Scoped par agence
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

interface CommanditaireResult {
  id: number;
  name: string;
  type: string;
  email: string | null;
  tel: string | null;
  adresse: string | null;
  ville: string | null;
  contacts: Array<{
    nom: string;
    prenom: string;
    email: string | null;
    tel: string | null;
    fonction: string | null;
  }>;
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

    // 2. Vérifier N2+ OU module prospection
    const { data: hasRole } = await supabase.rpc('has_min_global_role', {
      _user_id: user.id,
      _min_level: 2,
    });

    const { data: hasProspection } = await supabase.rpc('has_module_v2', {
      _user_id: user.id,
      _module_key: 'prospection',
    });

    if (!hasRole && !hasProspection) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Accès refusé (N2+ ou module prospection requis)' }),
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

    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      console.error('[LIST-COMMANDITAIRES] APOGEE_API_KEY not configured');
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Configuration serveur manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const baseUrl = `https://${agencySlug}.hc-apogee.fr/api`;
    console.log(`[LIST-COMMANDITAIRES] Using base URL: ${baseUrl}`);

    // 4. Récupérer les projets pour identifier les commanditaireIds utilisés
    const usedCommanditaireIds = new Set<number>();
    
    try {
      const projectsResponse = await fetch(`${baseUrl}/apiGetProjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      });

      if (projectsResponse.ok) {
        const projects = await projectsResponse.json();
        if (Array.isArray(projects)) {
          for (const project of projects) {
            const cmdId = project?.data?.commanditaireId;
            if (cmdId && typeof cmdId === 'number') {
              usedCommanditaireIds.add(cmdId);
            }
          }
        }
        console.log(`[LIST-COMMANDITAIRES] Found ${usedCommanditaireIds.size} unique commanditaire IDs in projects`);
      }
    } catch (err) {
      console.warn('[LIST-COMMANDITAIRES] Failed to fetch projects:', err);
    }

    // 5. Récupérer les clients
    const clientsResponse = await fetch(`${baseUrl}/apiGetClients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey }),
    });

    if (!clientsResponse.ok) {
      console.error(`[LIST-COMMANDITAIRES] Clients API error: ${clientsResponse.status}`);
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Erreur API Apogée' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const clients = await clientsResponse.json();
    console.log(`[LIST-COMMANDITAIRES] Fetched ${Array.isArray(clients) ? clients.length : 0} clients`);

    // 6. Récupérer les apporteurs déjà créés dans notre base
    const { data: existingApporteurs } = await supabase
      .from('apporteurs')
      .select('apogee_client_id')
      .eq('agency_id', profile.agency_id)
      .not('apogee_client_id', 'is', null);

    const existingIds = new Set(
      (existingApporteurs || []).map(a => a.apogee_client_id).filter(Boolean)
    );

    // 7. Filtrer les commanditaires
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
      
      // 1. Client used as commanditaire in at least one project
      if (usedCommanditaireIds.has(clientId)) return true;
      
      // 2. Explicit flag from Apogée
      if (client.isCommanditaire === true || client.is_commanditaire === true) return true;
      
      // 3. Type matches known apporteur/commanditaire types
      const type = String(client.type || '').toLowerCase();
      const typeClient = String(client.typeClient || '').toLowerCase();
      
      if (commanditaireTypes.some(ct => type.includes(ct) || typeClient.includes(ct))) return true;
      
      return false;
    };

    // 8. Construire la liste
    const results: CommanditaireResult[] = [];
    
    if (Array.isArray(clients)) {
      for (const client of clients) {
        if (!isCommanditaire(client)) continue;
        
        const id = Number(client.id);
        const name = client.raisonSociale || client.name || `${client.nom || ''} ${client.prenom || ''}`.trim();
        const type = String(client.type || client.typeClient || 'autre');
        
        if (!name || name.length < 2) continue;

        // Extraire les contacts du client si disponibles
        const contacts: CommanditaireResult['contacts'] = [];
        
        // L'API Apogée peut avoir les contacts dans différents formats
        if (client.contacts && Array.isArray(client.contacts)) {
          for (const contact of client.contacts) {
            contacts.push({
              nom: contact.nom || contact.name || '',
              prenom: contact.prenom || contact.firstName || '',
              email: contact.email || contact.mail || null,
              tel: contact.tel || contact.phone || contact.mobile || null,
              fonction: contact.fonction || contact.role || null,
            });
          }
        }

        // Ajouter le client lui-même comme contact si il a des infos
        if ((client.email || client.tel) && client.nom) {
          const alreadyExists = contacts.some(c => 
            c.email === client.email || c.nom === client.nom
          );
          if (!alreadyExists) {
            contacts.push({
              nom: client.nom || '',
              prenom: client.prenom || '',
              email: client.email || null,
              tel: client.tel || client.tel2 || null,
              fonction: 'Contact principal',
            });
          }
        }
        
        results.push({
          id,
          name,
          type: normalizeType(type),
          email: client.email || null,
          tel: client.tel || null,
          adresse: client.adresse || null,
          ville: client.ville || null,
          contacts,
        });
      }
    }

    // Trier par nom
    results.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    // Marquer ceux qui sont déjà liés
    const resultsWithStatus = results.map(r => ({
      ...r,
      alreadyLinked: existingIds.has(r.id),
    }));

    console.log(`[LIST-COMMANDITAIRES] Found ${results.length} commanditaires (${existingIds.size} already linked)`);

    return withCors(req, new Response(
      JSON.stringify({ success: true, data: resultsWithStatus }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[LIST-COMMANDITAIRES] Exception:', error instanceof Error ? error.message : error);
    
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: 'Erreur interne' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});

function normalizeType(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes('assur')) return 'assurance';
  if (lower.includes('syndic')) return 'syndic';
  if (lower.includes('bailleur')) return 'bailleur';
  if (lower.includes('courtier')) return 'courtier';
  if (lower.includes('agence') || lower.includes('immo')) return 'agence_immo';
  if (lower.includes('gestionnaire')) return 'gestionnaire';
  if (lower.includes('notaire')) return 'notaire';
  if (lower.includes('expert')) return 'expert';
  return 'autre';
}

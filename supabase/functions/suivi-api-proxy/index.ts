import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APOGEE_API_KEY = Deno.env.get('APOGEE_API_KEY');

// Rate limiting constants
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface RequestBody {
  agencySlug?: string;
  refDossier: string;
  codePostal: string;
  hash: string;
  verifyOnly?: boolean;
}

async function fetchFromApogee(apiSubdomain: string, endpoint: string): Promise<any> {
  return fetchFromApogeeWithData(apiSubdomain, endpoint, {});
}

async function fetchFromApogeeWithData(apiSubdomain: string, endpoint: string, additionalData: Record<string, any>): Promise<any> {
  const url = `https://${apiSubdomain}.hc-apogee.fr/api/${endpoint}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ API_KEY: APOGEE_API_KEY, ...additionalData }),
  });

  if (!response.ok) {
    console.error(`Apogee API error for ${endpoint}:`, response.status, response.statusText);
    return [];
  }

  const text = await response.text();
  if (!text || text.trim() === '') {
    console.log(`Apogee API returned empty response for ${endpoint}`);
    return [];
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`Apogee API JSON parse error for ${endpoint}:`, e);
    return [];
  }
}

// Rate limiting functions
async function checkRateLimit(supabase: any, ipAddress: string, refDossier: string): Promise<{ allowed: boolean; remainingAttempts: number }> {
  const cutoffTime = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('rate_limit_attempts')
    .select('id')
    .eq('ip_address', ipAddress)
    .eq('ref_dossier', refDossier)
    .eq('success', false)
    .gte('attempted_at', cutoffTime);

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const failedAttempts = data?.length || 0;
  const allowed = failedAttempts < MAX_ATTEMPTS;
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - failedAttempts);

  return { allowed, remainingAttempts };
}

async function recordAttempt(supabase: any, ipAddress: string, refDossier: string, success: boolean): Promise<void> {
  await supabase
    .from('rate_limit_attempts')
    .insert({
      ip_address: ipAddress,
      ref_dossier: refDossier,
      success,
    });
}

// ============= DATA SANITIZATION FUNCTIONS =============
function sanitizeProject(project: any, clients?: any[]) {
  if (!project) return null;
  
  // Resolve apporteur name server-side
  const apporteurId = project.apporteurId || project.data?.apporteurId || project.data?.commanditaireId;
  let resolvedCommanditaireLabel = project.commanditaireLabel || project.data?.commanditaire;
  
  if (!resolvedCommanditaireLabel && apporteurId && Array.isArray(clients)) {
    const apporteur = clients.find((c: any) => c.id === apporteurId);
    if (apporteur) {
      resolvedCommanditaireLabel = apporteur.raisonSociale || apporteur.name || apporteur.nom || 
        [apporteur.prenom, apporteur.nom].filter(Boolean).join(' ');
    }
  }
  
  return {
    id: project.id,
    ref: project.ref,
    label: project.label,
    state: project.state,
    date: project.date,
    commanditaireLabel: resolvedCommanditaireLabel || null,
    sumFranchisePaid: project.sumFranchisePaid,
    apporteurId: apporteurId || null,
    data: {
      financier: project.data?.financier,
      universes: project.data?.universes,
      sinistre: project.data?.sinistre,
      history: project.data?.history,
      commanditaireId: project.data?.commanditaireId,
      commanditaire: project.data?.commanditaire,
      apporteurId: project.data?.apporteurId,
      vosrefs: project.data?.vosrefs,
    },
  };
}

function sanitizeClient(client: any) {
  if (!client) return null;
  return {
    civilite: client.civilite,
    prenom: client.prenom,
    nom: client.nom,
    adresse: client.adresse,
    ville: client.ville,
    email: client.email,
    tel: client.tel,
    tel2: client.data?.tel2,
    data: {
      tel2: client.data?.tel2,
      tel3: client.data?.tel3,
    },
  };
}

function sanitizeIntervention(intervention: any) {
  if (!intervention) return null;
  
  const visites = (intervention.data?.visites || []).map((v: any) => ({
    date: v.date,
    duree: v.duree,
    state: v.state,
    usersIds: v.usersIds,
    endDate: v.endDate,
  }));
  
  return {
    id: intervention.id,
    projectId: intervention.projectId,
    date: intervention.date,
    duree: intervention.duree,
    state: intervention.state,
    ref: intervention.ref,
    data: {
      visites,
      type2: intervention.data?.type2,
      universes: intervention.data?.universes,
    },
  };
}

function sanitizeCreneau(creneau: any) {
  if (!creneau) return null;
  return {
    id: creneau.id,
    interventionId: creneau.interventionId,
    horaire: creneau.horaire,
    heureDebut: creneau.heureDebut,
    heureFin: creneau.heureFin,
    duree: creneau.duree,
  };
}

function sanitizeUser(user: any) {
  if (!user) return null;
  
  let prenom = '';
  let nom = '';
  
  if (user.label) {
    const parts = user.label.trim().split(/\s+/);
    if (parts.length > 0) {
      nom = parts[0];
      prenom = parts.slice(1).join(' ');
    }
  }
  
  if (!prenom) {
    prenom = user.prenom || user.firstname || user.firstName || user.first_name || '';
  }
  if (!nom) {
    nom = user.nom || user.lastname || user.lastName || user.last_name || '';
  }
  
  console.log(`API Proxy: sanitizeUser id=${user.id}, label="${user.label}", extracted prenom="${prenom}", nom="${nom}"`);
  
  return {
    id: user.id,
    prenom: prenom,
    nom: nom,
    firstname: prenom,
  };
}

function sanitizeDevis(devis: any) {
  if (!devis) return null;
  
  return {
    id: devis.id,
    projectId: devis.projectId,
    reference: devis.reference,
    title: devis.title,
    state: devis.state,
    dateReelle: devis.dateReelle,
    dateValidite: devis.dateValidite,
    userId: devis.userId,
    items: devis.items,
    data: {
      totalHT: devis.data?.totalHT,
      totalTTC: devis.data?.totalTTC,
      totalTVA: devis.data?.totalTVA,
      financier: devis.data?.financier,
      dateDebutTravaux: devis.data?.dateDebutTravaux,
      dateFinTravaux: devis.data?.dateFinTravaux,
    },
  };
}

function sanitizeFacture(facture: any) {
  if (!facture) return null;
  return {
    id: facture.id,
    devisId: facture.devisId,
    projectId: facture.projectId,
    reference: facture.reference,
    dateReelle: facture.dateReelle,
    state: facture.state,
    data: {
      totalTTC: facture.data?.totalTTC,
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agencySlug, refDossier, codePostal, hash, verifyOnly }: RequestBody = await req.json();

    if (!refDossier) {
      return new Response(
        JSON.stringify({ error: 'Référence dossier requise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!codePostal) {
      return new Response(
        JSON.stringify({ error: 'Code postal requis', requiresVerification: true }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client IP for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('cf-connecting-ip') || 
                      'unknown';

    // Check rate limit
    const { allowed, remainingAttempts } = await checkRateLimit(supabase, ipAddress, refDossier);
    
    if (!allowed) {
      console.log(`Rate limit exceeded for IP ${ipAddress} on dossier ${refDossier}`);
      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Réessayez dans 15 minutes.", rateLimited: true }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`API Proxy: Verifying access for refDossier=${refDossier}, agencySlug=${agencySlug || 'dax'}, hasHash=${!!hash}`);

    let apiSubdomain = 'dax';
    
    if (agencySlug) {
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .select('api_subdomain')
        .eq('slug', agencySlug)
        .eq('is_active', true)
        .single();

      if (agencyError) {
        console.error('Error fetching agency:', agencyError);
      } else if (agency) {
        apiSubdomain = agency.api_subdomain;
      }
    }

    console.log(`API Proxy: Using API subdomain: ${apiSubdomain}`);

    const genericAccessError = { 
      error: 'Accès refusé', 
      message: 'Vérification impossible. Veuillez vérifier votre code postal.',
      accessDenied: true 
    };

    let projectData: any = null;
    let projectClient: any = null;
    let allClients: any[] = [];

    if (!hash) {
      return new Response(
        JSON.stringify({ error: 'Hash de sécurité requis', accessDenied: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`API Proxy: Using secure endpoint with hash`);
    
    const response = await fetchFromApogeeWithData(apiSubdomain, 'apiGetProjectByHashZipCode', {
      ref: refDossier,
      hash: hash,
      zipCode: codePostal.trim()
    });

    if (!response || (Array.isArray(response) && response.length === 0) || response.error) {
      await recordAttempt(supabase, ipAddress, refDossier, false);
      console.log(`API Proxy: Hash verification failed - Apogée returned no data`);
      return new Response(
        JSON.stringify(genericAccessError),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    projectData = Array.isArray(response) ? response[0] : response;
    projectClient = projectData?.client;
    
    // Fetch clients list for apporteur name resolution if needed
    const apporteurId = projectData?.apporteurId || projectData?.data?.apporteurId || projectData?.data?.commanditaireId;
    if (apporteurId && !projectData?.commanditaireLabel && !projectData?.data?.commanditaire) {
      const clients = await fetchFromApogee(apiSubdomain, 'apiGetClients');
      allClients = Array.isArray(clients) ? clients : [];
    }
    
    await recordAttempt(supabase, ipAddress, refDossier, true);
    console.log(`API Proxy: Hash verification successful for project ID=${projectData?.id}`);

    if (verifyOnly) {
      return new Response(
        JSON.stringify({ verified: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [devis, usersFromApi, factures, interventions, creneaux] = await Promise.all([
      fetchFromApogee(apiSubdomain, 'apiGetDevis'),
      fetchFromApogee(apiSubdomain, 'apiGetUsers'),
      fetchFromApogee(apiSubdomain, 'apiGetFactures'),
      fetchFromApogee(apiSubdomain, 'apiGetInterventions'),
      fetchFromApogee(apiSubdomain, 'getInterventionsCreneaux'),
    ]);

    const allUsers = Array.isArray(projectData?.users) && projectData.users.length > 0
      ? projectData.users
      : (Array.isArray(usersFromApi) ? usersFromApi : []);

    const projectDevis = Array.isArray(devis)
      ? devis.filter((d: any) => d.projectId === projectData.id)
      : [];

    const projectInterventions = Array.isArray(interventions)
      ? interventions.filter((i: any) => i.projectId === projectData.id)
      : [];

    const interventionIds = projectInterventions.map((i: any) => i.id);
    
    const projectCreneaux = Array.isArray(creneaux)
      ? creneaux.filter((c: any) => interventionIds.includes(c.interventionId))
      : [];

    const technicianIds: number[] = [];
    projectInterventions.forEach((i: any) => {
      const visites = i.data?.visites || [];
      visites.forEach((v: any) => {
        if (v.usersIds) {
          v.usersIds.forEach((id: number) => {
            if (!technicianIds.includes(id)) {
              technicianIds.push(id);
            }
          });
        }
      });
    });
    
    console.log(`API Proxy: Found ${technicianIds.length} technician IDs: ${technicianIds.join(',')}`);
    console.log(`API Proxy: Total users from API: ${Array.isArray(allUsers) ? allUsers.length : 0}`);
    
    const projectUsers = Array.isArray(allUsers)
      ? allUsers.filter((u: any) => technicianIds.includes(u.id))
      : [];
    
    console.log(`API Proxy: Filtered users for project: ${projectUsers.length}`);

    const devisIds = projectDevis.map((d: any) => d.id);
    const projectFactures = Array.isArray(factures)
      ? factures.filter((f: any) => devisIds.includes(f.devisId) || f.projectId === projectData.id)
      : [];

    const responseData = {
      project: sanitizeProject(projectData, allClients),
      client: sanitizeClient(projectClient),
      devis: projectDevis.map(sanitizeDevis).filter(Boolean),
      users: projectUsers.map(sanitizeUser).filter(Boolean),
      factures: projectFactures.map(sanitizeFacture).filter(Boolean),
      interventions: projectInterventions.map(sanitizeIntervention).filter(Boolean),
      creneaux: projectCreneaux.map(sanitizeCreneau).filter(Boolean),
    };

    console.log(`API Proxy: Returning data - ${projectInterventions.length} interventions, ${projectDevis.length} devis`);

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Proxy error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

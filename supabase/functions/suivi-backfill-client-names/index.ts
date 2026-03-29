import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APOGEE_API_KEY = Deno.env.get('APOGEE_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all records missing client_name from both tables
  const { data: payments } = await supabase
    .from('payments_clients_suivi')
    .select('id, ref_dossier, agency_slug')
    .is('client_name', null);

  const { data: smsLogs } = await supabase
    .from('sms_sent_log')
    .select('id, ref_dossier, agency_slug')
    .is('client_name', null);

  // Get agency api_subdomains
  const { data: agencies } = await supabase
    .from('agency_suivi_settings')
    .select('slug, api_subdomain');

  const agencyMap = new Map(agencies?.map(a => [a.slug, a.api_subdomain]) ?? []);

  // Cache resolved names by ref_dossier+agency
  const nameCache = new Map<string, string | null>();

  // Cache clients list per agency
  const clientsCache = new Map<string, any[]>();

  async function getClients(agencySlug: string): Promise<any[]> {
    if (clientsCache.has(agencySlug)) return clientsCache.get(agencySlug)!;
    const subdomain = agencyMap.get(agencySlug);
    if (!subdomain || !APOGEE_API_KEY) return [];
    try {
      const resp = await fetch(`https://${subdomain}.hc-apogee.fr/api/apiGetClients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: APOGEE_API_KEY }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const clients = Array.isArray(data) ? data : [];
        clientsCache.set(agencySlug, clients);
        return clients;
      }
    } catch (e) {
      console.warn(`Failed to fetch clients for ${agencySlug}:`, e);
    }
    return [];
  }

  async function resolveClientName(refDossier: string, agencySlug: string): Promise<string | null> {
    const cacheKey = `${agencySlug}:${refDossier}`;
    if (nameCache.has(cacheKey)) return nameCache.get(cacheKey)!;

    const subdomain = agencyMap.get(agencySlug);
    if (!subdomain || !APOGEE_API_KEY) {
      nameCache.set(cacheKey, null);
      return null;
    }

    try {
      const resp = await fetch(`https://${subdomain}.hc-apogee.fr/api/apiGetProjectByRef`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: APOGEE_API_KEY, ref: refDossier }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const projectData = Array.isArray(data) ? data[0] : data;
        const clientId = projectData?.clientId;
        if (clientId) {
          const clients = await getClients(agencySlug);
          const client = clients.find((c: any) => c.id === clientId);
          if (client) {
            const name = [client.prenom, client.nom].filter(Boolean).join(' ') || null;
            console.log(`Resolved ${refDossier} -> ${name}`);
            nameCache.set(cacheKey, name);
            return name;
          }
        }
      } else {
        console.warn(`API ${resp.status} for ${refDossier}`);
      }
    } catch (e) {
      console.warn(`Failed for ${refDossier}:`, e);
    }
    nameCache.set(cacheKey, null);
    return null;
  }

  let updated = { payments: 0, sms: 0 };

  // Backfill payments
  for (const p of (payments ?? [])) {
    const name = await resolveClientName(p.ref_dossier, p.agency_slug);
    if (name) {
      await supabase.from('payments_clients_suivi').update({ client_name: name }).eq('id', p.id);
      updated.payments++;
    }
  }

  // Backfill sms_sent_log
  for (const s of (smsLogs ?? [])) {
    const name = await resolveClientName(s.ref_dossier, s.agency_slug);
    if (name) {
      await supabase.from('sms_sent_log').update({ client_name: name }).eq('id', s.id);
      updated.sms++;
    }
  }

  return new Response(
    JSON.stringify({ success: true, updated, cached: nameCache.size }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});

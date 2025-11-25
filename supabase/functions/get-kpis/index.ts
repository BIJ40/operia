import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApogeeAgency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
}

interface KpiRequest {
  period?: 'month' | 'year';
}

interface KpiResponse {
  agency: {
    slug: string;
    label: string;
  };
  period: {
    type: string;
    start: string;
    end: string;
  };
  kpis: {
    ca_month: number;
    ca_year: number;
    invoices_count_month: number;
    interventions_count_month: number;
  };
}

async function callApogeeApi(
  agenceSlug: string, 
  apiKey: string, 
  endpoint: string, 
  additionalData: Record<string, any> = {}
): Promise<any> {
  // Construct URL with agency slug: https://{agence}.hc-apogee.fr/api/{endpoint}
  const baseUrl = `https://${agenceSlug}.hc-apogee.fr/api`;
  const fullUrl = `${baseUrl}/${endpoint}`;
  
  console.log(`[get-kpis] Calling Apogée API: ${fullUrl}`);
  
  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        API_KEY: apiKey,
        ...additionalData,
      }),
    });

    if (!response.ok) {
      throw new Error(`Apogée API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[get-kpis] API response received`);
    return data;
  } catch (error) {
    console.error(`[get-kpis] Error calling Apogée API:`, error);
    throw error;
  }
}

function getPeriodDates(periodType: 'month' | 'year'): { start: string; end: string } {
  const now = new Date();
  
  if (periodType === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  } else {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-kpis] Request from user: ${user.id}`);

    // Get user's profile to find their agency
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agence')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.agence) {
      return new Response(
        JSON.stringify({ error: 'User agency not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-kpis] User agency: ${profile.agence}`);

    // Get agency configuration (optional - for validation/label)
    const { data: agency } = await supabase
      .from('apogee_agencies')
      .select('slug, label, is_active')
      .eq('slug', profile.agence)
      .eq('is_active', true)
      .maybeSingle();

    // Use agency slug from profile (agency table is optional for validation)
    const agenceSlug = profile.agence;
    const agenceLabel = agency?.label || profile.agence.toUpperCase();

    console.log(`[get-kpis] Agency: ${agenceLabel} (${agenceSlug})`);

    // Get shared API key from environment
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: KpiRequest = req.method === 'POST' ? await req.json() : {};
    const periodType = body.period || 'month';
    const periodDates = getPeriodDates(periodType);

    // Call Apogée API endpoints to get real data
    console.log(`[get-kpis] Fetching factures for agency ${agenceSlug}`);
    const facturesResponse = await callApogeeApi(agenceSlug, apiKey, 'apiGetFactures', {});
    const factures = Array.isArray(facturesResponse) ? facturesResponse : facturesResponse?.data || [];
    
    console.log(`[get-kpis] Fetching interventions for agency ${agenceSlug}`);
    const interventionsResponse = await callApogeeApi(agenceSlug, apiKey, 'apiGetInterventions', {});
    const interventions = Array.isArray(interventionsResponse) ? interventionsResponse : interventionsResponse?.data || [];

    console.log(`[get-kpis] Received ${factures.length} factures and ${interventions.length} interventions`);

    // Calculate KPIs from raw data
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let caMonth = 0;
    let caYear = 0;
    let invoicesCountMonth = 0;

    // Process factures
    for (const facture of factures) {
      if (!facture.date) continue;
      
      const factureDate = new Date(facture.date);
      const amount = parseFloat(facture.totalHT || facture.totalTTC || 0);
      
      // Exclure les avoirs
      if (facture.type === 'avoir') continue;
      
      // CA année
      if (factureDate.getFullYear() === currentYear) {
        caYear += amount;
      }
      
      // CA mois + comptage factures
      if (factureDate.getFullYear() === currentYear && factureDate.getMonth() === currentMonth) {
        caMonth += amount;
        invoicesCountMonth++;
      }
    }

    // Count interventions du mois
    let interventionsCountMonth = 0;
    for (const intervention of interventions) {
      if (!intervention.date) continue;
      
      const intDate = new Date(intervention.date);
      if (intDate.getFullYear() === currentYear && intDate.getMonth() === currentMonth) {
        interventionsCountMonth++;
      }
    }

    console.log(`[get-kpis] Calculated KPIs - CA mois: ${caMonth}, CA année: ${caYear}, Factures: ${invoicesCountMonth}, Interventions: ${interventionsCountMonth}`);

    // Build response
    const response: KpiResponse = {
      agency: {
        slug: agenceSlug,
        label: agenceLabel,
      },
      period: {
        type: periodType,
        start: periodDates.start,
        end: periodDates.end,
      },
      kpis: {
        ca_month: Math.round(caMonth * 100) / 100,
        ca_year: Math.round(caYear * 100) / 100,
        invoices_count_month: invoicesCountMonth,
        interventions_count_month: interventionsCountMonth,
      },
    };

    console.log(`[get-kpis] Success for agency ${agenceSlug}`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[get-kpis] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

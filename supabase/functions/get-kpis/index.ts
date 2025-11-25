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

    // Call Apogée API with real implementation
    // TODO: Replace 'kpis' with actual Apogée endpoint name
    // TODO: Adjust additionalData filters based on actual Apogée API requirements
    // Common endpoints might be: 'interventions', 'factures', 'devis', 'stats', etc.
    const kpiData = await callApogeeApi(
      agenceSlug, 
      apiKey, 
      'kpis', // Replace with actual endpoint
      {
        period: periodType,
        start_date: periodDates.start,
        end_date: periodDates.end,
      }
    );

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
        // Map Apogée API response to our KPI structure
        // TODO: Adjust field names based on actual Apogée API response structure
        // Example: if API returns { chiffre_affaire_mois: 12345 }, map it to ca_month
        ca_month: kpiData.ca_month || kpiData.chiffre_affaire_mois || 0,
        ca_year: kpiData.ca_year || kpiData.chiffre_affaire_annee || 0,
        invoices_count_month: kpiData.invoices_count_month || kpiData.nb_factures_mois || 0,
        interventions_count_month: kpiData.interventions_count_month || kpiData.nb_interventions_mois || 0,
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

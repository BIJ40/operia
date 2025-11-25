import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApogeeAgency {
  id: string;
  slug: string;
  label: string;
  api_base_url: string;
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

async function callApogeeApi(baseUrl: string, apiKey: string | null, endpoint: string): Promise<any> {
  // TODO: Implement actual Apogée API call
  // For now, return mock data
  console.log(`[get-kpis] Would call: ${baseUrl}${endpoint} with key: ${apiKey ? 'present' : 'none'}`);
  
  // Mock data for development
  return {
    ca_month: 12345.67,
    ca_year: 234567.89,
    invoices_count_month: 40,
    interventions_count_month: 85,
  };
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

    // Get agency configuration
    const { data: agency, error: agencyError } = await supabase
      .from('apogee_agencies')
      .select('*')
      .eq('slug', profile.agence)
      .eq('is_active', true)
      .single();

    if (agencyError || !agency) {
      return new Response(
        JSON.stringify({ error: 'Agency not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-kpis] Agency found: ${agency.label}`);

    // Optionally get API credentials (admin-only access via service role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: credentials } = await supabaseAdmin
      .from('apogee_api_credentials')
      .select('api_key')
      .eq('agency_id', agency.id)
      .single();

    const apiKey = credentials?.api_key || Deno.env.get('APOGEE_API_KEY') || null;

    // Parse request body
    const body: KpiRequest = req.method === 'POST' ? await req.json() : {};
    const periodType = body.period || 'month';
    const periodDates = getPeriodDates(periodType);

    // Call Apogée API (stubbed for now)
    const kpiData = await callApogeeApi(agency.api_base_url, apiKey, '/kpis');

    // Build response
    const response: KpiResponse = {
      agency: {
        slug: agency.slug,
        label: agency.label,
      },
      period: {
        type: periodType,
        start: periodDates.start,
        end: periodDates.end,
      },
      kpis: kpiData,
    };

    console.log(`[get-kpis] Success for agency ${agency.slug}`);

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

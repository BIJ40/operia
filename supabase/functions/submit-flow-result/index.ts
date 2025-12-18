/**
 * Edge function: submit-flow-result
 * Receives flow submissions from technician PWA and stores them
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitFlowRequest {
  rdv_id: string;
  flow_id: string;
  flow_version: number;
  answers: Record<string, unknown>;
  completed_at: string;
  client_operation_id: string;
  agency_id?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with user's JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[submit-flow-result] User: ${user.id}, Method: ${req.method}`);

    // Parse request body
    const body: SubmitFlowRequest = await req.json();

    // Validate required fields
    if (!body.rdv_id || !body.flow_id || !body.client_operation_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: rdv_id, flow_id, client_operation_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[submit-flow-result] Processing submission for RDV: ${body.rdv_id}, Flow: ${body.flow_id}`);

    // Check for idempotent operation - return success if already exists
    const { data: existing } = await supabase
      .from('flow_submissions')
      .select('id')
      .eq('client_operation_id', body.client_operation_id)
      .single();

    if (existing) {
      console.log(`[submit-flow-result] Idempotent: submission already exists with client_operation_id: ${body.client_operation_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Submission already processed',
          submission_id: existing.id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's agency_id from profile if not provided
    let agencyId = body.agency_id;
    if (!agencyId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .single();
      
      agencyId = profile?.agency_id;
    }

    // Insert submission
    const { data: submission, error: insertError } = await supabase
      .from('flow_submissions')
      .insert({
        rdv_id: body.rdv_id,
        flow_id: body.flow_id,
        flow_version: body.flow_version || 1,
        result_json: body.answers || {},
        client_operation_id: body.client_operation_id,
        submitted_at: body.completed_at || new Date().toISOString(),
        submitted_by: user.id,
        agency_id: agencyId,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[submit-flow-result] Insert error:', insertError);
      
      // Handle unique constraint violation (duplicate client_operation_id)
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Submission already processed (concurrent)' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to save submission', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[submit-flow-result] Success: Created submission ${submission.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        submission_id: submission.id,
        message: 'Flow submission saved successfully'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[submit-flow-result] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

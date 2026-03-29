/**
 * invite-apporteur-user - Invitation d'utilisateurs apporteur
 * Phase 3 : Création user auth + liaison apporteur_users + email invitation
 * 
 * Service role uniquement - vérifie que l'appelant est N2+ et que l'apporteur appartient à son agency
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  agency_id: string;
  apporteur_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'reader' | 'manager';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: InviteRequest = await req.json();
    const { agency_id, apporteur_id, email, first_name, last_name, role } = body;

    // Validate required fields
    if (!agency_id || !apporteur_id || !email || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: agency_id, apporteur_id, email, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    if (!['reader', 'manager'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be reader or manager' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user client to verify caller permissions
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get caller user
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get caller profile to check role and agency
    const { data: callerProfile, error: profileError } = await userClient
      .from('profiles')
      .select('global_role, agency_id')
      .eq('id', caller.id)
      .single();

    if (profileError || !callerProfile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to get caller profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check caller has N2+ role
    const roleLevel = getRoleLevel(callerProfile.global_role);
    if (roleLevel < 2) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Requires N2+ role.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for admin operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify apporteur belongs to caller's agency
    const { data: apporteur, error: apporteurError } = await serviceClient
      .from('apporteurs')
      .select('id, agency_id, is_active')
      .eq('id', apporteur_id)
      .single();

    if (apporteurError || !apporteur) {
      console.error('Apporteur error:', apporteurError);
      return new Response(
        JSON.stringify({ error: 'Apporteur not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify agency match (N4+ can manage any agency)
    if (roleLevel < 4 && apporteur.agency_id !== agency_id) {
      return new Response(
        JSON.stringify({ error: 'Apporteur does not belong to your agency' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;
    let actionLink: string | null = null;
    let isNewUser = false;

    if (existingUser) {
      // User exists - reuse
      userId = existingUser.id;
      console.log('Existing user found:', userId);

      // Generate a recovery link for existing user to set/reset password for apporteur portal
      const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
        type: 'recovery',
        email: email.toLowerCase(),
      });

      if (!linkError && linkData?.properties?.action_link) {
        actionLink = linkData.properties.action_link;
        console.log('Recovery link generated for existing user');
      } else {
        console.warn('Could not generate recovery link:', linkError);
      }
    } else {
      // Create new user with random password (they will reset it)
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
        email: email.toLowerCase(),
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: first_name || '',
          last_name: last_name || '',
          is_apporteur: true,
        },
      });

      if (createError || !newUser.user) {
        console.error('Create user error:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user: ' + (createError?.message || 'Unknown error') }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log('New user created:', userId);

      // Generate password reset link for the user
      const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
        type: 'recovery',
        email: email.toLowerCase(),
      });

      if (!linkError && linkData?.properties?.action_link) {
        actionLink = linkData.properties.action_link;
        console.log('Recovery link generated');
      } else {
        console.warn('Could not generate recovery link:', linkError);
      }
    }

    // Check if apporteur_users entry exists
    const { data: existingApporteurUser } = await serviceClient
      .from('apporteur_users')
      .select('id, is_active')
      .eq('apporteur_id', apporteur_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingApporteurUser) {
      // Update existing entry - reactivate if needed
      const { error: updateError } = await serviceClient
        .from('apporteur_users')
        .update({
          email: email.toLowerCase(),
          first_name,
          last_name,
          role,
          is_active: true,
          invited_at: new Date().toISOString(),
          invited_by: caller.id,
        })
        .eq('id', existingApporteurUser.id);

      if (updateError) {
        console.error('Update apporteur_users error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update user link' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Apporteur user updated:', existingApporteurUser.id);
    } else {
      // Create new apporteur_users entry
      const { error: insertError } = await serviceClient
        .from('apporteur_users')
        .insert({
          apporteur_id,
          agency_id,
          user_id: userId,
          email: email.toLowerCase(),
          first_name,
          last_name,
          role,
          is_active: true,
          invited_at: new Date().toISOString(),
          invited_by: caller.id,
        });

      if (insertError) {
        console.error('Insert apporteur_users error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user link: ' + insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Apporteur user created');
    }

    // Return success
    const response: Record<string, any> = {
      success: true,
      user_id: userId,
      is_new_user: isNewUser,
    };

    // Include action_link in dev/test mode for debugging
    if (actionLink) {
      response.action_link = actionLink;
      response.note = 'User should use this link to set their password';
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Get numeric level for a global role
 */
function getRoleLevel(role: string | null): number {
  const levels: Record<string, number> = {
    'base_user': 0,
    'franchisee_user': 1,
    'franchisee_admin': 2,
    'franchisor_user': 3,
    'franchisor_admin': 4,
    'platform_admin': 5,
    'superadmin': 6,
  };
  return levels[role || ''] ?? 0;
}

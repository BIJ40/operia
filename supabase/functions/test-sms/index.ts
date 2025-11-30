import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

// AllMySMS API configuration
const ALLMYSMS_API_URL = "https://api.allmysms.com/http/9.0/sendSms";
const ALLMYSMS_LOGIN = Deno.env.get('ALLMYSMS_LOGIN');
const ALLMYSMS_API_KEY = Deno.env.get('ALLMYSMS_API_KEY');

interface TestSmsRequest {
  phoneNumber?: string; // Optional: test with specific number, otherwise uses configured support phones
  simulate?: boolean;   // If true, only checks API connectivity without sending
}

serve(async (req) => {
  // Handle CORS preflight or reject unauthorized origins
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    // Security: Verify the user is authenticated and is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return withCors(req, new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Check if user is admin (only admins can test SMS)
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    if (!profile || !['platform_admin', 'superadmin'].includes(profile.global_role)) {
      return withCors(req, new Response(
        JSON.stringify({ error: 'Accès réservé aux administrateurs' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { phoneNumber, simulate = false }: TestSmsRequest = await req.json().catch(() => ({}));

    console.log('[TEST-SMS] Starting test...', { simulate, phoneNumber: phoneNumber ? '***' : 'default' });

    // Check if AllMySMS is configured
    if (!ALLMYSMS_LOGIN || !ALLMYSMS_API_KEY) {
      return withCors(req, new Response(
        JSON.stringify({ 
          success: false, 
          error: 'AllMySMS non configuré',
          details: {
            hasLogin: !!ALLMYSMS_LOGIN,
            hasApiKey: !!ALLMYSMS_API_KEY,
          }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Step 1: Test API connectivity with getInfo
    console.log('[TEST-SMS] Testing API connectivity with getInfo...');
    const infoParams = new URLSearchParams({
      login: ALLMYSMS_LOGIN,
      apiKey: ALLMYSMS_API_KEY,
      returnformat: 'json'
    });

    const infoResponse = await fetch(`https://api.allmysms.com/http/9.0/getInfo?${infoParams.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const infoText = await infoResponse.text();
    console.log('[TEST-SMS] getInfo response:', infoText);

    let infoResult;
    try {
      infoResult = JSON.parse(infoText);
    } catch {
      infoResult = { raw: infoText };
    }

    // If simulate mode, stop here
    if (simulate) {
      return withCors(req, new Response(
        JSON.stringify({ 
          success: true, 
          mode: 'simulation',
          apiConnectivity: infoResponse.ok,
          apiStatus: infoResponse.status,
          accountInfo: infoResult,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Step 2: Actually send a test SMS
    const testPhone = phoneNumber || Deno.env.get('ALLMYSMS_SUPPORT_PHONES')?.split(',')[0]?.trim();
    
    if (!testPhone) {
      return withCors(req, new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Aucun numéro de téléphone configuré pour le test',
          apiConnectivity: infoResponse.ok,
          accountInfo: infoResult,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    console.log('[TEST-SMS] Sending test SMS to:', testPhone.substring(0, 4) + '***');

    const testMessage = `[TEST] Helpogée SMS - ${new Date().toLocaleString('fr-FR')} - Ce message confirme que l'API AllMySMS fonctionne correctement.`;

    // AllMySMS sendSms API format
    const smsData = {
      DATA: {
        MESSAGE: testMessage,
        TPOA: "Helpogee",
        SMS: [{
          MOBILEPHONE: testPhone
        }]
      }
    };

    const smsParams = new URLSearchParams({
      login: ALLMYSMS_LOGIN,
      apiKey: ALLMYSMS_API_KEY,
      smsData: JSON.stringify(smsData),
      returnformat: 'json'
    });

    const smsResponse = await fetch(`${ALLMYSMS_API_URL}?${smsParams.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const smsText = await smsResponse.text();
    console.log('[TEST-SMS] sendSms response:', smsText);

    let smsResult;
    try {
      smsResult = JSON.parse(smsText);
    } catch {
      smsResult = { raw: smsText };
    }

    return withCors(req, new Response(
      JSON.stringify({ 
        success: smsResponse.ok,
        mode: 'send',
        apiConnectivity: infoResponse.ok,
        accountInfo: infoResult,
        smsStatus: smsResponse.status,
        smsResult: smsResult,
        sentTo: testPhone.substring(0, 4) + '***',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[TEST-SMS] Error:', error);
    return withCors(req, new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});

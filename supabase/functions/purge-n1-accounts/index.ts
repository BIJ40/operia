import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hardcoded list of N1 accounts to purge — one-time use
const N1_IDS_TO_PURGE = [
  '0f9df9fe-36c0-47b2-af60-6430da50680c', // Test N1
  '9c737e99-0fac-4bfa-b062-d4e95456df8f', // GEORGES ALADAME
  '73261863-c985-4af8-9e22-a167f910507e', // Sebastien Caron
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const results: Record<string, string> = {}

    for (const userId of N1_IDS_TO_PURGE) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) {
        console.error(`Failed to delete ${userId}:`, error.message)
        results[userId] = `ERROR: ${error.message}`
      } else {
        console.log(`Deleted auth user: ${userId}`)
        results[userId] = 'DELETED'
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

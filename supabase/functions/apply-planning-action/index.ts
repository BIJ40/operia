import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader ?? '' } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return withCors(req, new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
    }

    const { type, id, action } = await req.json();
    // type: 'suggestion' | 'move'
    // action: 'apply' | 'dismiss'
    if (!type || !id || !action) {
      return withCors(req, new Response(JSON.stringify({ error: 'type, id and action required' }), { status: 400 }));
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const newStatus = action === 'apply' ? 'applied' : 'dismissed';

    if (type === 'suggestion') {
      const { error } = await supabase
        .from('planning_suggestions')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
    } else if (type === 'move') {
      // For moves, we don't have individual status — update the whole record
      // In V2, moves could be split into individual rows
      const { error } = await supabase
        .from('planning_moves')
        .update({ moves_json: { applied_action: action, applied_by: user.id, applied_at: new Date().toISOString() } })
        .eq('id', id);
      if (error) throw error;
    }

    return withCors(req, new Response(JSON.stringify({
      success: true,
      type,
      id,
      action,
      new_status: newStatus,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch (err) {
    console.error('apply-planning-action error:', err);
    return withCors(req, new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500 }));
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metric_id, params } = await req.json();
    
    if (!metric_id) {
      return new Response(
        JSON.stringify({ error: 'metric_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Charger la définition de la métrique
    const { data: metric, error: metricError } = await supabase
      .from('metrics_definitions')
      .select('*')
      .eq('id', metric_id)
      .single();

    if (metricError || !metric) {
      return new Response(
        JSON.stringify({ code: 'NOT_FOUND', message: `Métrique ${metric_id} non trouvée` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pour l'instant, retourner une valeur placeholder
    // L'implémentation complète nécessite les appels API Apogée côté serveur
    const result = {
      value: 0,
      metadata: {
        computed_at: new Date().toISOString(),
        cache_hit: false,
        compute_time_ms: 0,
        data_points: 0,
        note: 'Edge compute - implémentation en cours'
      }
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur compute-metric:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ code: 'COMPUTE_ERROR', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
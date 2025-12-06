/**
 * FAQ Search Edge Function
 * Uses Lovable AI to semantically search FAQs
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, context_type } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all FAQs (optionally filtered by context)
    let faqQuery = supabase
      .from('faq_items')
      .select('*, category:faq_categories(id, label)')
      .order('display_order');

    if (context_type) {
      faqQuery = faqQuery.eq('context_type', context_type);
    }

    const { data: faqs, error: fetchError } = await faqQuery;

    if (fetchError) {
      throw fetchError;
    }

    if (!faqs || faqs.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build FAQ list for AI
    const faqList = faqs.map((faq, index) => ({
      index,
      id: faq.id,
      question: faq.question,
      answer: faq.answer.substring(0, 200),
      context: faq.context_type,
      category: faq.category?.label || 'Sans catégorie',
    }));

    // Call Lovable AI for semantic matching
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant qui recherche les FAQ les plus pertinentes pour une requête utilisateur.
Tu reçois une liste de FAQ avec leur index, question et réponse.
Tu dois retourner les indices des FAQ les plus pertinentes, triées par pertinence décroissante.
Réponds UNIQUEMENT avec un JSON valide au format: {"indices": [0, 3, 7]}
Maximum 10 résultats. Retourne un tableau vide si aucune FAQ n'est pertinente.`
          },
          {
            role: 'user',
            content: `Requête de recherche: "${query}"

Liste des FAQ disponibles:
${JSON.stringify(faqList, null, 2)}

Retourne les indices des FAQ pertinentes au format JSON.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      // Fallback to simple text search
      const lowerQuery = query.toLowerCase();
      const fallbackResults = faqs
        .filter(faq => 
          faq.question.toLowerCase().includes(lowerQuery) ||
          faq.answer.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 10);

      return new Response(
        JSON.stringify({ results: fallbackResults, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse AI response
    let indices: number[] = [];
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*"indices"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        indices = parsed.indices || [];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Fallback to simple search
      const lowerQuery = query.toLowerCase();
      const fallbackResults = faqs
        .filter(faq => 
          faq.question.toLowerCase().includes(lowerQuery) ||
          faq.answer.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 10);

      return new Response(
        JSON.stringify({ results: fallbackResults, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map indices back to FAQs
    const results = indices
      .filter(idx => idx >= 0 && idx < faqs.length)
      .map(idx => faqs[idx]);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('FAQ Search error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

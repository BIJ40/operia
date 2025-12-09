/**
 * Edge function pour reformuler un ticket support en Q/R FAQ via l'IA
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, messages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Construire le contexte de la conversation
    const conversationContext = messages
      ?.map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Utilisateur' : 'Support'}: ${m.content}`)
      .join('\n') || '';

    const systemPrompt = `Tu es un expert en rédaction de FAQ pour un logiciel de gestion HelpConfort.
À partir d'un ticket support résolu, tu dois extraire et reformuler:
1. Une QUESTION claire et concise (ce que l'utilisateur voulait savoir/résoudre)
2. Une RÉPONSE complète et professionnelle (la solution apportée)

Règles:
- La question doit être formulée de manière générique (pas de référence à un utilisateur spécifique)
- La réponse doit être claire, structurée et réutilisable
- Utilise un ton professionnel mais accessible
- Si la conversation contient plusieurs problèmes, concentre-toi sur le problème principal
- Réponds UNIQUEMENT en JSON valide avec les clés "question" et "answer"`;

    const userPrompt = `Sujet du ticket: ${subject || 'Non spécifié'}

Conversation:
${conversationContext || 'Aucune conversation disponible'}

Reformule ce ticket en une paire question/réponse FAQ.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parser le JSON de la réponse
    let result = { question: '', answer: '' };
    try {
      // Nettoyer le contenu (enlever les backticks markdown si présents)
      const cleanContent = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Fallback: utiliser le sujet comme question
      result = {
        question: subject || 'Question non définie',
        answer: content || 'Réponse non générée',
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in reformulate-ticket-faq:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

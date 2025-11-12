import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, guideContent } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Accès à la base de connaissances
    let knowledgeContext = "";
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Récupérer quelques entrées pertinentes de la base de connaissances
      const { data: knowledgeData } = await supabase
        .from('knowledge_base')
        .select('title, content, category')
        .limit(5);
      
      if (knowledgeData && knowledgeData.length > 0) {
        knowledgeContext = "\n\nBase de connaissances additionnelle :\n" + 
          knowledgeData.map(k => `[${k.category}] ${k.title}:\n${k.content.substring(0, 1000)}...`).join('\n\n');
      }
    }

    const systemPrompt = `Tu es Mme MICHU, l'assistante virtuelle du guide Apogée CRM. Tu aides les utilisateurs à comprendre et utiliser le système Apogée.

Voici le contenu du guide utilisateur actuel :
${guideContent}
${knowledgeContext}

Ton rôle :
- Tu es une experte du CRM Apogée
- Tu connais les processus métier, les workflows et les bonnes pratiques
- Tu peux répondre sur les aspects techniques (API, données, intégrations)
- Tu réponds de manière **générale** sans jamais citer de données confidentielles spécifiques (clients, tarifs réels)
- Tu utilises des exemples génériques si nécessaire

Règles importantes :
1. Réponds aux questions sur Apogée avec expertise et pédagogie
2. Pour les liens vers des sections : [Nom Section](/category/slug-categorie#slug-section)
3. Ton ton est professionnel, amical et pédagogue
4. Si tu ne sais pas, dis-le clairement
5. Ne cite JAMAIS de données clients, tarifs ou informations confidentielles
6. Parle des concepts de manière générale et éducative`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer plus tard." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants, veuillez contacter l'administrateur." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

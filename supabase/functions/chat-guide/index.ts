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

    // Accès à la base de connaissances - VERSION ULTRA LÉGÈRE
    let knowledgeContext = "";
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Extraire les mots-clés de la dernière question
      const lastMessage = messages[messages.length - 1]?.content || "";
      const keywords = lastMessage
        .toLowerCase()
        .split(/\s+/)
        .filter((word: string) => word.length > 3)
        .slice(0, 3); // Seulement 3 mots-clés
      
      console.log("Recherche mots-clés:", keywords);
      
      if (keywords.length > 0) {
        // Chercher UN SEUL document avec le premier mot-clé
        const { data: doc } = await supabase
          .from('knowledge_base')
          .select('title, content, category')
          .ilike('content', `%${keywords[0]}%`)
          .limit(1)
          .single();
        
        if (doc) {
          // Extraire seulement 800 caractères autour du mot-clé
          const contentLower = doc.content.toLowerCase();
          const keywordIndex = contentLower.indexOf(keywords[0]);
          
          let excerpt = "";
          if (keywordIndex !== -1) {
            const start = Math.max(0, keywordIndex - 400);
            const end = Math.min(doc.content.length, keywordIndex + 400);
            excerpt = doc.content.substring(start, end);
          } else {
            excerpt = doc.content.substring(0, 800);
          }
          
          knowledgeContext = `\n\nDocument pertinent [${doc.category}] ${doc.title}:\n${excerpt}`;
          console.log("Document trouvé:", doc.title);
        } else {
          console.log("Aucun document trouvé");
        }
      }
    }

    const systemPrompt = `Tu es Mme MICHU, l'assistante virtuelle du guide Apogée CRM.

Guide principal (résumé):
${guideContent.substring(0, 3000)}
${knowledgeContext}

Rôle:
- Experte CRM Apogée
- Utilise les infos ci-dessus pour répondre
- Si l'info n'est pas dans le contexte, dis-le

Règles:
1. Réponds avec les infos fournies
2. Sois concise et précise
3. Si tu ne sais pas, dis-le clairement`;

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

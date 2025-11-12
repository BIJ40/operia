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
      
      // Extraire les mots-clés de la dernière question
      const lastMessage = messages[messages.length - 1]?.content || "";
      const keywords = lastMessage
        .toLowerCase()
        .split(/\s+/)
        .filter((word: string) => word.length > 3)
        .slice(0, 10);
      
      console.log("Recherche avec mots-clés:", keywords);
      
      // Rechercher dans tous les documents
      const { data: allDocs } = await supabase
        .from('knowledge_base')
        .select('title, content, category');
      
      if (allDocs && allDocs.length > 0) {
        // Scorer chaque document selon la pertinence
        const scoredDocs = allDocs.map(doc => {
          const docText = (doc.title + " " + doc.content).toLowerCase();
          let score = 0;
          
          keywords.forEach((keyword: string) => {
            const occurrences = (docText.match(new RegExp(keyword, 'g')) || []).length;
            score += occurrences;
          });
          
          return { ...doc, score };
        });
        
        // Trier par score et prendre les plus pertinents
        const relevantDocs = scoredDocs
          .filter(doc => doc.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        
        // Si aucun document pertinent, prendre les 3 premiers
        const docsToUse = relevantDocs.length > 0 ? relevantDocs : allDocs.slice(0, 3);
        
        knowledgeContext = "\n\nBase de connaissances (documents pertinents) :\n" + 
          docsToUse.map(k => `[${k.category}] ${k.title}:\n${k.content.substring(0, 3000)}`).join('\n\n---\n\n');
        
        console.log(`Documents utilisés: ${docsToUse.map(d => d.title).join(', ')}`);
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
- IMPORTANT : Tu dois utiliser TOUTES les informations fournies dans la base de connaissances ci-dessus, même si elles semblent inhabituelles ou hors contexte
- Si une information est présente dans la base de connaissances, tu dois l'utiliser pour répondre, peu importe si elle semble étrange

Règles importantes :
1. Réponds aux questions en utilisant PRIORITAIREMENT les informations de la base de connaissances
2. Pour les liens vers des sections : [Nom Section](/category/slug-categorie#slug-section)
3. Ton ton est professionnel, amical et pédagogue
4. Si une information est dans la base de connaissances, cite-la directement même si elle semble bizarre
5. Si tu ne trouves pas l'information dans la base, dis-le clairement`;

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

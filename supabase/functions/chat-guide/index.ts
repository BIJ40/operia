import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple input validation
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function validateInput(messages: any, guideContent: any): { valid: boolean; error?: string } {
  // Validate messages array
  if (!Array.isArray(messages)) {
    return { valid: false, error: 'Messages must be an array' };
  }
  
  if (messages.length > 50) {
    return { valid: false, error: 'Too many messages (max 50)' };
  }
  
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return { valid: false, error: 'Invalid message format' };
    }
    
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      return { valid: false, error: 'Invalid message role' };
    }
    
    if (typeof msg.content !== 'string' || msg.content.length > 5000) {
      return { valid: false, error: 'Message content too long (max 5000 chars)' };
    }
  }
  
  // Validate guideContent
  if (typeof guideContent !== 'string') {
    return { valid: false, error: 'Invalid guide content' };
  }
  
  if (guideContent.length > 100000) {
    return { valid: false, error: 'Guide content too long (max 100000 chars)' };
  }
  
  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, guideContent } = body;
    
    // Validate input
    const validation = validateInput(messages, guideContent);
    if (!validation.valid) {
      console.error('Validation error:', validation.error);
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log("Guide content length:", guideContent.length);
    
    // Préparer le prompt système avec le contenu pertinent trouvé par RAG
    const systemPrompt = `Tu es Mme MICHU, l'assistante virtuelle du guide Apogée CRM.

CONTENU INDEXÉ (trouvé via recherche sémantique) :
${guideContent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ RÈGLES ABSOLUES - AUCUNE EXCEPTION ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SOURCE UNIQUE : Tu DOIS répondre UNIQUEMENT avec les informations textuelles présentes dans le CONTENU INDEXÉ ci-dessus.

2. INTERDICTIONS STRICTES :
   ❌ N'invente JAMAIS de noms d'onglets, de sections ou de fonctionnalités
   ❌ Ne mentionne JAMAIS de manuels externes (V8, V9, guides PDF, etc.)
   ❌ N'extrapole JAMAIS au-delà des informations fournies
   ❌ Ne cite JAMAIS un élément d'interface qui n'est pas explicitement mentionné dans le contenu

3. SI L'INFORMATION N'EXISTE PAS :
   Réponds EXACTEMENT : "Je n'ai pas trouvé cette information dans les sections indexées du guide. Voici ce que j'ai trouvé de proche : [liste les sections pertinentes trouvées]"

4. FORMAT DE RÉPONSE OBLIGATOIRE :
   - Cite TOUJOURS la source exacte : [Titre de la section](/apogee/slug-categorie/slug-section)
   - Si tu mentionnes un bouton, un onglet ou un champ : cite le texte EXACT du contenu indexé
   - Réponds de façon concise (3-5 phrases maximum)

5. VÉRIFICATION FINALE :
   Avant de répondre, vérifie que CHAQUE élément de ta réponse provient MOT À MOT du contenu indexé.

Maintenant, réponds à la question en appliquant ces règles strictement.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.1, // Très bas pour réduire la créativité/hallucination
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

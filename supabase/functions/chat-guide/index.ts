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
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Guide content length:", guideContent.length);
    console.log("Documents received:", body.documents?.length || 0);
    
    // Construire la section documents si présents
    let documentsSection = '';
    if (body.documents && Array.isArray(body.documents) && body.documents.length > 0) {
      documentsSection = `\n\nDOCUMENTS ASSOCIÉS PERTINENTS :
${body.documents.map((doc: any) => 
  `- ${doc.title}${doc.description ? ` : ${doc.description}` : ''} (Type: ${doc.file_type})`
).join('\n')}

Ces documents peuvent contenir des informations complémentaires pertinentes pour la question.`;
    }
    
    // Préparer le prompt système avec le contenu pertinent trouvé par RAG
    const systemPrompt = `Tu es Mme MICHU, l'assistante virtuelle experte du guide Apogée CRM.

CONTENU PERTINENT DU GUIDE (trouvé via recherche sémantique intelligente) :
${guideContent}${documentsSection}

RÈGLES D'EXCELLENCE :
1. ANALYSE APPROFONDIE : Synthétise les informations de TOUTES les sections pertinentes pour donner une réponse complète
2. SOURCES MULTIPLES : Si plusieurs sections traitent du sujet, combine intelligemment leurs informations
3. DOCUMENTS : Si des documents sont mentionnés ci-dessus, signale-les comme ressources complémentaires à consulter
4. NAVIGATION : Fournis des liens cliquables vers les sections : [Titre](/apogee/category/slug-categorie#id-section)
5. CLARTÉ : Réponds de manière structurée (étapes, listes à puces) pour une meilleure compréhension
6. PRÉCISION : Base-toi UNIQUEMENT sur les extraits fournis. Si l'info manque, dis "Je n'ai pas trouvé cette information précise"
7. CONTEXTE : Si une question nécessite plus de détails, suggère des sections connexes à explorer
8. REFORMULATION : Reformule les infos techniques en langage accessible sans perdre la précision

EXEMPLE DE BONNE RÉPONSE :
"Pour [action X], voici la procédure complète basée sur plusieurs sections du guide :

1. **Étape 1** : [info de section A]
2. **Étape 2** : [info de section B]  
3. **Étape 3** : [info de section C]

📄 Documents complémentaires : [Document Y]

🔗 Sections détaillées :
- [Section A](/apogee/category/...)
- [Section B](/apogee/category/...)

💡 Note : [conseil supplémentaire tiré de la synthèse]"

Réponds maintenant avec expertise en synthétisant intelligemment toutes les informations pertinentes.`;

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

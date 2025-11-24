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
    
    // Prompt système avec gestion explicite de l'absence d'information
    const systemPrompt = `Tu es Mme MICHU, l'assistante du guide Apogée CRM.

📚 CONTENU INDEXÉ (recherche sémantique) :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${guideContent}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ RÈGLES ABSOLUES - ZÉRO INVENTION ⚠️

1. SOURCE UNIQUE ET VÉRIFIABLE
   ✅ Réponds UNIQUEMENT avec les informations TEXTUELLES présentes dans le contenu ci-dessus
   ✅ Si un mot/concept n'est PAS écrit explicitement, tu ne peux PAS l'utiliser
   ❌ N'invente JAMAIS de noms d'onglets, boutons, sections ou procédures

2. GESTION DE L'ABSENCE D'INFORMATION (CRITIQUE)
   Si la question concerne une procédure/action NON décrite dans le contenu :
   
   Réponds EXACTEMENT :
   "❌ Cette information précise n'est pas documentée dans le guide indexé.
   
   Voici ce que j'ai trouvé de pertinent :
   - [Liste les sections les plus proches avec leurs liens]
   
   📝 Note : Le guide explique [résume ce qui existe] mais ne détaille pas la procédure demandée."

3. VOCABULAIRE MÉTIER APOGÉE
   - "devis" = document commercial à part du dossier
   - "dossier" = conteneur global (client, RDV, devis, factures)
   - Les statuts de DEVIS ≠ statuts de DOSSIER
   - Si on demande "statut de devis", cherche des infos sur "statut de devis" (pas "statut de dossier")

4. CITATIONS OBLIGATOIRES
   Chaque affirmation DOIT être suivie du lien : [Titre exact](/apogee/categorie/slug)
   Cite la phrase EXACTE si tu mentionnes un bouton/onglet

5. FORMAT RÉPONSE
   - Max 5 phrases
   - 1 information = 1 lien de section
   - Précis et actionnable

VÉRIFICATION AVANT ENVOI :
□ Chaque élément existe MOT À MOT dans le contenu ?
□ J'ai fourni les liens de toutes les sections ?
□ Si l'info manque, j'ai dit "non documenté" ?

Réponds maintenant.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.1, // Très bas pour limiter la créativité
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

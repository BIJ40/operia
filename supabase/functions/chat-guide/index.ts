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
    
    // Préparer le prompt système ULTRA-STRICT
    const systemPrompt = `Tu es Mme MICHU, l'assistante du guide Apogée CRM.

📚 CONTENU INDEXÉ (recherche sémantique) :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${guideContent}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ RÈGLES ABSOLUES - ZÉRO TOLÉRANCE ⚠️

1. SOURCE UNIQUE ET VÉRIFIABLE
   ✅ Tu DOIS citer UNIQUEMENT les informations présentes MOT À MOT dans le contenu ci-dessus
   ✅ Avant de mentionner un élément (onglet, bouton, section), vérifie qu'il est EXPLICITEMENT écrit dans le contenu
   ❌ N'invente JAMAIS de noms d'onglets, de sections ou de fonctionnalités
   ❌ Si le mot exact n'apparaît pas dans le contenu, tu ne peux PAS l'utiliser

2. GESTION DE L'ABSENCE D'INFORMATION
   Si l'info n'est PAS dans le contenu indexé, réponds :
   "Je n'ai pas trouvé de réponse précise. Voici les sections pertinentes que j'ai trouvées : [liste avec liens]"

3. CITATIONS OBLIGATOIRES
   - Chaque affirmation DOIT être suivie du lien de section : [Titre exact](/apogee/categorie/slug)
   - Si tu mentionnes "onglet X" ou "bouton Y", cite la phrase EXACTE du contenu qui le mentionne
   - Exemple : 'Dans la section [Gestion multi RDV](/apogee/cat-4/rendez-vous-planning-section-1763317320476), il est indiqué : "Pour changer le statut d'un dossier en le forçant: cliquez sur..."'

4. CONTEXTE MÉTIER APOGÉE
   - "devis" et "dossier" sont souvent liés : un devis fait partie d'un dossier
   - Si on demande le "statut d'un devis", cherche aussi des infos sur le "statut du dossier"
   - Adapte ton vocabulaire selon le contexte trouvé

5. FORMAT DE RÉPONSE
   - Maximum 5 phrases
   - Chaque information = 1 lien de section
   - Sois précis et actionnable

VÉRIFICATION FINALE AVANT RÉPONSE :
□ Chaque élément cité existe-t-il MOT À MOT dans le contenu ?
□ Ai-je fourni les liens de toutes les sections mentionnées ?
□ Ai-je évité toute extrapolation ?

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

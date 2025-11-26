import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function validateInput(messages: any, guideContent: any): { valid: boolean; error?: string } {
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
  
  if (typeof guideContent !== 'string') {
    return { valid: false, error: 'Invalid guide content' };
  }
  
  if (guideContent.length > 100000) {
    return { valid: false, error: 'Guide content too long (max 100000 chars)' };
  }
  
  return { valid: true };
}

// Détecte si la réponse indique une information manquante
function isIncompleteAnswer(answer: string): boolean {
  const incompleteMarkers = [
    "n'est pas documentée",
    "je n'ai pas trouvé",
    "information précise n'est pas",
    "pas dans le guide",
    "non documenté",
    "cette information manque"
  ];
  
  const lowerAnswer = answer.toLowerCase();
  return incompleteMarkers.some(marker => lowerAnswer.includes(marker));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, guideContent, userId, userName, similarityScores } = body;
    
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Guide content length:", guideContent.length);
    
    // Récupérer la dernière question utilisateur
    const userQuestion = messages[messages.length - 1]?.content || '';

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
   "❌ Désolé ${userName || ''}, le guide ne semble pas donner cette information. Je remonte immédiatement la demande afin qu'une clarification soit apportée sur le sujet. De plus, je fais en sorte que tu sois recontacté à ce sujet.
   
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
□ Si l'info manque, j'ai dit "non documenté" avec le message personnalisé ?

Réponds maintenant.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.1,
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

    // Stream la réponse et accumule le contenu
    let fullAnswer = '';
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  if (content) {
                    fullAnswer += content;
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
          
          // Enregistrer la question/réponse dans la base
          const isIncomplete = isIncompleteAnswer(fullAnswer);
          
          await supabase.from('chatbot_queries').insert({
            user_id: userId || null,
            question: userQuestion,
            answer: fullAnswer,
            is_incomplete: isIncomplete,
            context_found: guideContent.substring(0, 5000), // Limite à 5000 chars
            similarity_scores: similarityScores || null,
            status: isIncomplete ? 'pending' : 'resolved'
          });
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
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

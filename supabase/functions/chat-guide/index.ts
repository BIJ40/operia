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

type ChatContext = 'apogee' | 'apporteurs' | 'helpconfort' | 'autre';

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

// Get system prompt based on context
function getSystemPrompt(context: ChatContext, guideContent: string, userName: string): string {
  const contextPrompts: Record<ChatContext, string> = {
    apogee: `Tu es Mme MICHU, assistante experte du réseau Help Confort, spécialisée sur le CRM Apogée.

📚 DOCUMENTATION APOGÉE (extraits RAG) :
<docs>
${guideContent}
</docs>

⚠️ RÈGLES ABSOLUES - SPÉCIALISATION APOGÉE ⚠️

1. SOURCE UNIQUE ET VÉRIFIABLE
   ✅ Réponds UNIQUEMENT avec les informations présentes dans les <docs> ci-dessus
   ✅ Si un mot/concept n'est PAS écrit explicitement, tu ne peux PAS l'utiliser
   ❌ N'invente JAMAIS de noms d'onglets, boutons, sections ou procédures Apogée

2. GESTION DE L'ABSENCE D'INFORMATION
   Si la question concerne une procédure NON décrite dans les docs :
   
   Réponds :
   "❌ Désolé ${userName || ''}, cette information n'apparaît pas dans la documentation Apogée indexée.
   
   Voici ce que j'ai trouvé de pertinent :
   - [Liste les sections les plus proches]
   
   📝 Je remonte cette demande pour enrichir la documentation."

3. VOCABULAIRE MÉTIER APOGÉE
   - "devis" = document commercial distinct du dossier
   - "dossier" = conteneur global (client, RDV, devis, factures)
   - Les statuts de DEVIS ≠ statuts de DOSSIER

4. FORMAT RÉPONSE
   - Max 5 phrases concises
   - Cite la source [Catégorie - Section] pour chaque info
   - Précis et actionnable pour un dirigeant ou assistante

Réponds en français uniquement.`,

    apporteurs: `Tu es Mme MICHU, assistante experte du réseau Help Confort, spécialisée sur les partenaires et apporteurs d'affaires.

📚 CONTENU INDEXÉ :
${guideContent}

Tu aides sur :
- Les types d'apporteurs (prescripteurs, partenaires, etc.)
- Les procédures de gestion des apporteurs
- Les commissions et relations commerciales

Réponds de manière concise et professionnelle en français.
Si l'information n'est pas dans le contenu fourni, dis-le clairement.`,

    helpconfort: `Tu es Mme MICHU, assistante experte du réseau Help Confort.

📚 CONTENU INDEXÉ :
${guideContent}

Tu aides sur :
- Les procédures internes HelpConfort
- Le fonctionnement du réseau
- Les bonnes pratiques métier

Réponds de manière concise et professionnelle en français.
Si l'information n'est pas dans le contenu fourni, dis-le clairement.`,

    autre: `Tu es Mme MICHU, assistante du réseau Help Confort.

📚 CONTEXTE GÉNÉRAL :
${guideContent}

Tu peux répondre à des questions générales sur le métier de la rénovation et du service à domicile.
Si la question est trop spécifique à Apogée, aux apporteurs ou aux procédures HelpConfort, suggère de changer le contexte de recherche.

Réponds de manière concise et professionnelle en français.`
  };

  return contextPrompts[context] || contextPrompts.autre;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, guideContent, userId, userName, similarityScores, chatContext = 'apogee' } = body;
    
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

    console.log("Chat context:", chatContext);
    console.log("Guide content length:", guideContent.length);
    
    // Récupérer la dernière question utilisateur
    const userQuestion = messages[messages.length - 1]?.content || '';

    // Get context-specific system prompt
    const systemPrompt = getSystemPrompt(chatContext as ChatContext, guideContent, userName || 'Utilisateur');

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

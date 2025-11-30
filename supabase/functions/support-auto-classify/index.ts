/**
 * Edge function P3#2 - Auto-classification IA des tickets support
 * Utilise Lovable AI Gateway + RAG pour classification intelligente
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `Tu es l'assistant de classification des tickets support Help Confort.

TA MISSION : Analyser un ticket support et produire une classification structurée.

CATÉGORIES DISPONIBLES :
- bug : erreur technique, dysfonctionnement, crash, message d'erreur
- question : demande d'information, comment faire, aide utilisation
- blocage : situation bloquante empêchant de travailler
- facturation : factures, devis, paiements, prix, avoir
- planning : rendez-vous, interventions, agenda, créneaux
- droits : accès, permissions, mot de passe, connexion
- apporteurs : partenaires, PMT, Domus, commissions
- amelioration : suggestion, idée, nouvelle fonctionnalité
- autre : si aucune catégorie ne correspond

PRIORITÉS :
- bloquant : production arrêtée, impossible de travailler
- urgent : impact fort, nécessite action rapide
- important : impact modéré, peut attendre quelques heures
- normal : demande standard, délai normal acceptable

DÉTECTION INCOMPLÉTUDE - le ticket est incomplet si :
- Description vague type "ça marche pas", "aide", "urgent"
- Moins de 20 caractères de description
- Pas de contexte (numéro dossier, étapes, capture)
- Phrase unique sans détail

TAGS POSSIBLES (plusieurs) :
planning, facturation, bug, apogee, metier, apporteur, devis, dossier, technicien, intervention, sav, compta, droits, mobile

Analyse UNIQUEMENT le contenu fourni. Ne fais pas de suppositions.`;

const FUNCTION_SCHEMA = {
  type: "function",
  function: {
    name: "classify_support_ticket",
    description: "Classifie un ticket support avec catégorie, priorité et tags",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["bug", "question", "blocage", "facturation", "planning", "droits", "apporteurs", "amelioration", "autre"],
          description: "Catégorie principale du ticket"
        },
        priority: {
          type: "string",
          enum: ["bloquant", "urgent", "important", "normal"],
          description: "Niveau de priorité suggéré"
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Score de confiance de la classification (0-1)"
        },
        is_incomplete: {
          type: "boolean",
          description: "True si le ticket manque d'informations essentielles"
        },
        incomplete_reasons: {
          type: "array",
          items: { type: "string" },
          description: "Raisons pour lesquelles le ticket est incomplet"
        },
        tags: {
          type: "array",
          items: {
            type: "string",
            enum: ["planning", "facturation", "bug", "apogee", "metier", "apporteur", "devis", "dossier", "technicien", "intervention", "sav", "compta", "droits", "mobile"]
          },
          description: "Tags de classification"
        },
        suggested_response_hint: {
          type: "string",
          description: "Indice pour la réponse (mots clés pour recherche FAQ/RAG)"
        }
      },
      required: ["category", "priority", "confidence", "is_incomplete", "incomplete_reasons", "tags"],
      additionalProperties: false
    }
  }
};

serve(async (req) => {
  // Handle CORS preflight or reject unauthorized origins
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { ticket_id, subject, content, apply_result = true } = await req.json();

    let ticketData: any = null;
    let ticketSubject = subject;
    let ticketContent = content;

    // Si ticket_id fourni, récupérer le ticket
    if (ticket_id) {
      const { data: ticket, error: fetchError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticket_id)
        .single();

      if (fetchError || !ticket) {
        return withCors(req, new Response(
          JSON.stringify({ error: "Ticket non trouvé" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        ));
      }

      ticketData = ticket;
      ticketSubject = ticket.subject;

      // Extraire le contenu de la conversation
      if (ticket.chatbot_conversation && Array.isArray(ticket.chatbot_conversation)) {
        ticketContent = ticket.chatbot_conversation
          .filter((m: any) => m.role === 'user')
          .map((m: any) => m.content)
          .join('\n');
      }
    }

    if (!ticketSubject) {
      return withCors(req, new Response(
        JSON.stringify({ error: "subject ou ticket_id requis" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Construire le prompt utilisateur
    const userPrompt = `Classifie ce ticket support :

SUJET: ${ticketSubject}
CONTENU: ${ticketContent || "(vide)"}
SERVICE: ${ticketData?.service || "non spécifié"}

Analyse et retourne la classification via la fonction classify_support_ticket.`;

    console.log("[support-auto-classify] Classifying ticket:", ticketSubject.substring(0, 50));

    // Appel IA
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        tools: [FUNCTION_SCHEMA],
        tool_choice: { type: "function", function: { name: "classify_support_ticket" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return withCors(req, new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        ));
      }
      if (aiResponse.status === 402) {
        return withCors(req, new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        ));
      }
      const errorText = await aiResponse.text();
      console.error("[support-auto-classify] AI error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "classify_support_ticket") {
      throw new Error("No valid tool call returned from AI");
    }

    const classification = JSON.parse(toolCall.function.arguments);

    console.log("[support-auto-classify] Classification result:", classification);

    // Chercher une suggestion de réponse dans FAQ si hint fourni
    let suggestedAnswer: string | null = null;
    if (classification.suggested_response_hint) {
      const { data: faqItems } = await supabase
        .from("faq_items")
        .select("answer")
        .eq("is_published", true)
        .textSearch("question", classification.suggested_response_hint, { type: "websearch" })
        .limit(1);

      if (faqItems && faqItems.length > 0) {
        suggestedAnswer = faqItems[0].answer;
      }
    }

    // Appliquer au ticket si demandé
    if (apply_result && ticket_id) {
      const { error: updateError } = await supabase
        .from("support_tickets")
        .update({
          ai_category: classification.category,
          ai_priority: classification.priority,
          ai_confidence: classification.confidence,
          ai_is_incomplete: classification.is_incomplete,
          ai_tags: classification.tags,
          ai_suggested_answer: suggestedAnswer,
          auto_classified: true,
          ai_classified_at: new Date().toISOString(),
        })
        .eq("id", ticket_id);

      if (updateError) {
        console.error("[support-auto-classify] Update error:", updateError);
      }
    }

    // Formater la réponse
    const result = {
      success: true,
      classification: {
        success: true,
        category: classification.category,
        priority: classification.priority,
        confidence: classification.confidence,
        isIncomplete: classification.is_incomplete,
        incompleteReasons: classification.incomplete_reasons || [],
        suggestedAnswer,
        suggestedAnswerSource: suggestedAnswer ? 'faq' : null,
        tags: classification.tags || [],
      },
      applied: apply_result && ticket_id ? true : false,
    };

    return withCors(req, new Response(
      JSON.stringify(result),
      { headers: { "Content-Type": "application/json" } }
    ));

  } catch (error) {
    console.error("[support-auto-classify] Error:", error);
    return withCors(req, new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        classification: {
          success: false,
          category: null,
          priority: null,
          confidence: 0,
          isIncomplete: false,
          incompleteReasons: [],
          suggestedAnswer: null,
          suggestedAnswerSource: null,
          tags: [],
        }
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    ));
  }
});

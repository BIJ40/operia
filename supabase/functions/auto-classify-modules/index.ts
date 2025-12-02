/**
 * Edge function pour auto-classifier les tickets sans module
 * Utilise l'IA pour détecter le module le plus probable (seuil 85%)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

const CONFIDENCE_THRESHOLD = 0.85; // 85%

const SYSTEM_PROMPT = `Tu es un expert en classification de tickets pour le logiciel Apogée (gestion d'interventions/travaux).

TA MISSION : Analyser un ticket et déterminer quel MODULE il concerne.

MODULES DISPONIBLES (utilise EXACTEMENT ces identifiants) :
- DOSSIERS : Gestion des dossiers, projets, création de dossier
- PLANNING : Planning, interventions, RDV, créneaux
- DEVIS : Devis, chiffrage, barèmes, prix
- FACTURATION : Factures, règlements, comptabilité, avoirs
- COMMANDES : Commandes fournisseurs, achats, stocks
- APP_TECH : Application mobile technicien, PDA, terrain
- NOTIFICATIONS : Alertes, SMS, emails, rappels
- STATS : Statistiques, tableaux de bord, rapports, BI
- WORKFLOW : Règles métier, statuts, transitions, automatisations
- PARAMETRAGE : Configuration, paramètres, infra, admin
- CLIENTS : Gestion clients, contacts, apporteurs
- AUTRE : Ticket ne correspondant à aucun module clairement

RÈGLES :
- Analyse le titre et la description pour identifier le module
- Donne un score de confiance entre 0 et 1
- Si confiance < 0.85, assigne "AUTRE"
- Sois précis dans ton analyse`;

const FUNCTION_SCHEMA = {
  type: "function",
  function: {
    name: "classify_module",
    description: "Classifie un ticket dans un module avec score de confiance",
    parameters: {
      type: "object",
      properties: {
        module_id: {
          type: "string",
          enum: ["DOSSIERS", "PLANNING", "DEVIS", "FACTURATION", "COMMANDES", "APP_TECH", "NOTIFICATIONS", "STATS", "WORKFLOW", "PARAMETRAGE", "CLIENTS", "AUTRE"],
          description: "Identifiant du module"
        },
        confidence: {
          type: "number",
          description: "Score de confiance entre 0 et 1"
        },
        reasoning: {
          type: "string",
          description: "Explication courte de la classification"
        }
      },
      required: ["module_id", "confidence", "reasoning"],
      additionalProperties: false
    }
  }
};

const AI_TIMEOUT_MS = 15000; // 15s timeout per ticket
const BATCH_SIZE = 5; // Process 5 tickets at a time

async function classifyTicketWithTimeout(
  ticket: { id: string; element_concerne: string | null; description: string | null; module_area: string | null },
  apiKey: string
): Promise<{ module_id: string; confidence: number; reasoning: string } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const userPrompt = `Classifie ce ticket dans un module :

TITRE: ${ticket.element_concerne || "N/A"}
DESCRIPTION: ${ticket.description || "N/A"}
MODULE_AREA actuel: ${ticket.module_area || "N/A"}

Analyse et retourne le module le plus approprié avec ton score de confiance.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        tools: [FUNCTION_SCHEMA],
        tool_choice: { type: "function", function: { name: "classify_module" } }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!aiResponse.ok) {
      console.error(`AI error for ticket ${ticket.id}: ${aiResponse.status}`);
      return null;
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "classify_module") {
      console.error(`No valid tool call for ticket ${ticket.id}`);
      return null;
    }

    return JSON.parse(toolCall.function.arguments);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Timeout for ticket ${ticket.id}`);
    } else {
      console.error(`Error classifying ticket ${ticket.id}:`, error);
    }
    return null;
  }
}

serve(async (req) => {
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

    const { mode = 'scan', ticket_ids, apply_changes = false, batch_index = 0 } = await req.json();

    let ticketsToProcess: Array<{id: string; element_concerne: string | null; description: string | null; module: string | null; module_area: string | null}> = [];

    if (mode === 'scan') {
      const { data, error } = await supabase
        .from("apogee_tickets")
        .select("id, element_concerne, description, module, module_area")
        .is("module", null)
        .neq("kanban_status", "EN_PROD")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      ticketsToProcess = data || [];
      
      // Return total count for batch processing
      return withCors(req, new Response(
        JSON.stringify({ 
          success: true, 
          total_tickets: ticketsToProcess.length,
          tickets: ticketsToProcess.map(t => ({ id: t.id, title: t.element_concerne }))
        }),
        { headers: { "Content-Type": "application/json" } }
      ));
    }
    
    if (mode === 'classify_batch' && ticket_ids?.length > 0) {
      const { data, error } = await supabase
        .from("apogee_tickets")
        .select("id, element_concerne, description, module, module_area")
        .in("id", ticket_ids);

      if (error) throw error;
      ticketsToProcess = data || [];
    } else if (ticket_ids?.length > 0) {
      const { data, error } = await supabase
        .from("apogee_tickets")
        .select("id, element_concerne, description, module, module_area")
        .in("id", ticket_ids);

      if (error) throw error;
      ticketsToProcess = data || [];
    }

    if (ticketsToProcess.length === 0) {
      return withCors(req, new Response(
        JSON.stringify({ success: true, message: "Aucun ticket à classifier", suggestions: [] }),
        { headers: { "Content-Type": "application/json" } }
      ));
    }

    const suggestions: Array<{
      ticket_id: string;
      title: string;
      current_module: string | null;
      suggested_module: string;
      confidence: number;
      reasoning: string;
      auto_applied: boolean;
    }> = [];

    // Process tickets in parallel batches
    for (let i = 0; i < ticketsToProcess.length; i += BATCH_SIZE) {
      const batch = ticketsToProcess.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(ticket => classifyTicketWithTimeout(ticket, LOVABLE_API_KEY))
      );

      for (let j = 0; j < batch.length; j++) {
        const ticket = batch[j];
        const classification = batchResults[j];

        if (!classification) {
          suggestions.push({
            ticket_id: ticket.id,
            title: ticket.element_concerne || "Sans titre",
            current_module: ticket.module,
            suggested_module: "AUTRE",
            confidence: 0,
            reasoning: "Échec de classification (timeout ou erreur)",
            auto_applied: false
          });
          continue;
        }

        const confidence = Math.min(1, Math.max(0, classification.confidence));
        const finalModule = confidence >= CONFIDENCE_THRESHOLD ? classification.module_id : "AUTRE";
        const shouldAutoApply = apply_changes && confidence >= CONFIDENCE_THRESHOLD && finalModule !== "AUTRE";

        if (shouldAutoApply) {
          await supabase
            .from("apogee_tickets")
            .update({ module: finalModule })
            .eq("id", ticket.id);
        }

        suggestions.push({
          ticket_id: ticket.id,
          title: ticket.element_concerne || "Sans titre",
          current_module: ticket.module,
          suggested_module: finalModule,
          confidence,
          reasoning: classification.reasoning || "",
          auto_applied: shouldAutoApply
        });
      }
    }

    const stats = {
      total: suggestions.length,
      high_confidence: suggestions.filter(s => s.confidence >= CONFIDENCE_THRESHOLD).length,
      low_confidence: suggestions.filter(s => s.confidence < CONFIDENCE_THRESHOLD).length,
      auto_applied: suggestions.filter(s => s.auto_applied).length,
    };

    return withCors(req, new Response(
      JSON.stringify({ 
        success: true,
        stats,
        suggestions: suggestions.sort((a, b) => b.confidence - a.confidence)
      }),
      { headers: { "Content-Type": "application/json" } }
    ));

  } catch (error) {
    console.error("auto-classify-modules error:", error);
    return withCors(req, new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    ));
  }
});

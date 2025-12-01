/**
 * Edge function pour qualifier les tickets Apogée avec l'IA
 * Utilise Lovable AI Gateway pour analyser et enrichir les tickets
 * 
 * Système de priorité UNIFIÉ : heat_priority (0-12) uniquement
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `Tu es l'assistant de qualification de tickets pour le projet Apogée / Help Confort.

TA MISSION : Analyser un ticket brut et produire une qualification structurée.

THÈMES DISPONIBLES :
1. Dossiers & Projets
2. Devis & Barèmes
3. Facturation & Règlements / Compta
4. Planning & Interventions
5. Commandes & Fournisseurs
6. Application Technicien & Mobile
7. Notifications & Communication
8. Statistiques & BI
9. Workflow & Règles métier
10. Paramétrage / Infra / Divers

TYPES DE TICKET :
- bug : erreur, plante, ne fonctionne pas, bloqué
- evolution : ajouter, améliorer, nouvelle fonctionnalité
- ergonomie : affichage, lisibilité, mise en forme
- data : donnée incohérente, mauvais calcul, doublon
- process : workflow, statut, transition, règle métier

PRIORITÉ THERMIQUE (0-12) - Échelle unique de priorisation :
- 0-3 : Froid - Confort, mineur, backlog lointain
  - 0: Gelé (backlog très lointain)
  - 1: Glacial
  - 2: Froid
  - 3: Frais
- 4-7 : Tiède à chaud - Important, planifié
  - 4: Tiède- (améliorations prévues)
  - 5: Tiède (priorité moyenne)
  - 6: Tiède+ (priorité normale)
  - 7: Chaud- (à traiter prochainement)
- 8-10 : Brûlant - Urgent, à traiter rapidement
  - 8: Chaud (priorité haute)
  - 9: Chaud+ (très prioritaire)
  - 10: Brûlant (urgent)
- 11-12 : Critique - Blocage
  - 11: Critique (blocage majeur)
  - 12: Urgence absolue (production bloquée)

TAGS D'IMPACT (plusieurs possibles) :
- impact_facturation : Impacte la facturation, paiements
- impact_terrain : Impacte les techniciens sur le terrain
- impact_rel_client : Impacte la relation client
- impact_pilotage : Impacte le pilotage, statistiques
- impact_process : Impacte un workflow métier

STATUTS QUALIF :
- a_qualifier, reproduit, spec_ok, pret_dev, en_dev, en_test, deploye, obsolete

IMPORTANT : Propose une priorité thermique (heat_priority_suggested) entre 0 et 12 basée sur :
- L'urgence opérationnelle décrite
- L'impact métier estimé
- La gêne pour les utilisateurs`;

// Fonction de calcul de priorité thermique basée sur les règles métier
function calculateHeatPriority(sourceSheet: string | null, priority: string | null): number {
  const sheet = (sourceSheet || '').toLowerCase().trim();
  const prio = (priority || '').toLowerCase().trim();

  // Priorités A
  if (sheet.includes('priorit') && sheet.includes('a')) {
    if (prio.includes('x1') || prio === '1') return 10;
    if (prio.includes('x2') || prio === '2') return 9;
    if (prio.includes('x3') || prio === '3') return 8;
    return 9;
  }

  // Priorités B
  if (sheet.includes('priorit') && sheet.includes('b')) {
    if (prio.includes('x1') || prio === '1') return 7;
    if (prio.includes('x2') || prio === '2') return 6;
    if (prio.includes('x3') || prio === '3') return 5;
    return 6;
  }

  // Liste évaluée
  if (sheet.includes('evalué') || sheet.includes('prioriser')) {
    if (prio.includes('c')) return 4;
    return 3;
  }

  // LISTE V1
  if (sheet.includes('v1')) return 3;

  // Bugs
  if (sheet.includes('bug')) {
    if (prio.includes('urgent') || prio.includes('bloquant')) return 11;
    if (prio.includes('critique')) return 9;
    if (prio.includes('important')) return 7;
    return 5;
  }

  // Manuel sans info
  if (sheet.includes('manual') || !sheet) return 5;

  return 3;
}

const FUNCTION_SCHEMA = {
  type: "function",
  function: {
    name: "qualify_ticket",
    description: "Qualifie un ticket avec thème, type, priorité thermique et tags",
    parameters: {
      type: "object",
      properties: {
        theme: {
          type: "string",
          enum: [
            "Dossiers & Projets",
            "Devis & Barèmes",
            "Facturation & Règlements / Compta",
            "Planning & Interventions",
            "Commandes & Fournisseurs",
            "Application Technicien & Mobile",
            "Notifications & Communication",
            "Statistiques & BI",
            "Workflow & Règles métier",
            "Paramétrage / Infra / Divers"
          ],
          description: "Thème macro du ticket"
        },
        ticket_type: {
          type: "string",
          enum: ["bug", "evolution", "ergonomie", "data", "process"],
          description: "Type principal du ticket"
        },
        heat_priority_suggested: {
          type: "number",
          description: "Proposition de priorité thermique 0-12 (0=gelé/backlog, 12=critique/bloquant)"
        },
        impact_tags: {
          type: "array",
          items: {
            type: "string",
            enum: ["impact_facturation", "impact_terrain", "impact_rel_client", "impact_pilotage", "impact_process"]
          },
          description: "Tags d'impact métier"
        },
        qualif_status: {
          type: "string",
          enum: ["a_qualifier", "reproduit", "spec_ok", "pret_dev", "en_dev", "en_test", "deploye", "obsolete"],
          description: "Statut de qualification"
        },
        notes_internes: {
          type: "string",
          description: "Notes internes pour les devs (hypothèses, cause probable, liens)"
        },
        titre_ameliore: {
          type: "string",
          description: "Titre amélioré, clair et concis (max 100 caractères)"
        },
        description_amelioree: {
          type: "string",
          description: "Description structurée et lisible pour un développeur"
        }
      },
      required: ["theme", "ticket_type", "impact_tags", "qualif_status", "notes_internes", "titre_ameliore", "description_amelioree"],
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

    const { ticket_ids, user_id } = await req.json();

    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return withCors(req, new Response(
        JSON.stringify({ error: "ticket_ids requis (array)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Récupérer les tickets
    const { data: tickets, error: fetchError } = await supabase
      .from("apogee_tickets")
      .select("*")
      .in("id", ticket_ids);

    if (fetchError) throw fetchError;
    if (!tickets || tickets.length === 0) {
      return withCors(req, new Response(
        JSON.stringify({ error: "Aucun ticket trouvé" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      ));
    }

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    // Qualifier chaque ticket
    for (const ticket of tickets) {
      try {
        const userPrompt = `Qualifie ce ticket :

TITRE: ${ticket.element_concerne || "N/A"}
DESCRIPTION: ${ticket.description || "N/A"}
MODULE: ${ticket.module || "N/A"}
MODULE_AREA: ${ticket.module_area || "N/A"}
PRIORITÉ BRUTE: ${ticket.priority || "N/A"}
STATUT APOGÉE: ${ticket.apogee_status_raw || "N/A"}
STATUT HC: ${ticket.hc_status_raw || "N/A"}
OWNER: ${ticket.owner_side || "N/A"}
SOURCE: ${ticket.source_sheet || "MANUAL"}
SEVERITY: ${ticket.severity || "N/A"}
H_MIN: ${ticket.h_min || "N/A"}
H_MAX: ${ticket.h_max || "N/A"}

Analyse et retourne la qualification complète via la fonction qualify_ticket.
Propose également une priorité thermique (heat_priority_suggested) entre 0 et 12.`;

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
            tool_choice: { type: "function", function: { name: "qualify_ticket" } }
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            results.push({ id: ticket.id, success: false, error: "Rate limit exceeded" });
            continue;
          }
          if (aiResponse.status === 402) {
            results.push({ id: ticket.id, success: false, error: "Payment required" });
            continue;
          }
          results.push({ id: ticket.id, success: false, error: `AI error: ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        
        if (!toolCall || toolCall.function.name !== "qualify_ticket") {
          results.push({ id: ticket.id, success: false, error: "No valid tool call returned" });
          continue;
        }

        const qualification = JSON.parse(toolCall.function.arguments);

        // Calculer la priorité thermique : IA si valide, sinon algorithme
        const baseHeat = calculateHeatPriority(ticket.source_sheet, ticket.priority);
        const heatFromIa = typeof qualification.heat_priority_suggested === 'number'
          ? Math.max(0, Math.min(12, Math.round(qualification.heat_priority_suggested)))
          : null;
        const heatPriority = heatFromIa ?? baseHeat;

        // Sauvegarder les textes originaux avant modification (seulement si pas déjà qualifié)
        const originalTitle = ticket.original_title || ticket.element_concerne;
        const originalDescription = ticket.original_description || ticket.description;

        // Mettre à jour le ticket (sans priority_normalized)
        const { error: updateError } = await supabase
          .from("apogee_tickets")
          .update({
            theme: qualification.theme,
            ticket_type: qualification.ticket_type,
            impact_tags: qualification.impact_tags,
            qualif_status: qualification.qualif_status,
            notes_internes: qualification.notes_internes,
            element_concerne: qualification.titre_ameliore || ticket.element_concerne,
            description: qualification.description_amelioree || ticket.description,
            // Sauvegarder les textes originaux
            original_title: originalTitle,
            original_description: originalDescription,
            // Priorité thermique unifiée
            heat_priority: heatPriority,
            is_qualified: true,
            qualified_at: new Date().toISOString(),
            qualified_by: user_id || null,
          })
          .eq("id", ticket.id);

        if (updateError) {
          results.push({ id: ticket.id, success: false, error: updateError.message });
        } else {
          results.push({ id: ticket.id, success: true });
        }

      } catch (ticketError) {
        results.push({ 
          id: ticket.id, 
          success: false, 
          error: ticketError instanceof Error ? ticketError.message : "Unknown error" 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return withCors(req, new Response(
      JSON.stringify({ 
        success: true, 
        qualified: successCount, 
        failed: failCount,
        results 
      }),
      { headers: { "Content-Type": "application/json" } }
    ));

  } catch (error) {
    console.error("qualify-ticket error:", error);
    return withCors(req, new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    ));
  }
});

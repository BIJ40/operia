import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Schéma Apogée simplifié pour le contexte IA
const APOGEE_CONTEXT = `
Tu es un assistant expert en analyse de données métier pour un réseau de franchises de services à domicile (plomberie, électricité, etc.).

## Sources de données disponibles (endpoints Apogée)

1. **apiGetDevis** - Devis/Quotes
   - Champs: id, reference, projectId, clientId, state, dateReelle, totalHT, totalTTC, items[]
   - États possibles: new, sent, accepted, rejected, cancelled, invoice_sent, order
   - Cas d'usage: CA prévisionnel, pipeline commercial, taux de transformation

2. **apiGetFactures** - Factures
   - Champs: id, projectId, clientId, totalHT, totalTTC, paymentStatus, typeFacture, payments[], createdAt
   - paymentStatus: pending, paid, partially_paid, overdue
   - typeFacture: facture, avoir (avoir = montant négatif)
   - Cas d'usage: CA réalisé, recouvrement, encours

3. **apiGetInterventions** - Interventions/RDV
   - Champs: id, projectId, userId, date, state, type, visites[]
   - state: planned, in_progress, completed, cancelled, validated
   - type: technique, releve_technique, maintenance, SAV
   - Cas d'usage: activité techniciens, planning, productivité

4. **apiGetProjects** - Dossiers/Projets
   - Champs: id, ref, clientId, state, date, data.commanditaireId, data.universes[], data.sinistre
   - Univers: plomberie, électricité, chauffage, climatisation, multi-travaux
   - Cas d'usage: volume dossiers, répartition par univers/apporteur

5. **apiGetClients** - Clients/Apporteurs
   - Champs: id, name, type, address, phone
   - type: particulier, assurance, gestionnaire, bailleur
   - Cas d'usage: statistiques clients, top apporteurs

6. **apiGetUsers** - Utilisateurs/Techniciens
   - Champs: id, firstname, lastname, type, universes[], skills[]
   - type: technicien, admin, bureau
   - Cas d'usage: stats par technicien, charge de travail

## Règles métier importantes
- CA réalisé = somme des factures (apiGetFactures.totalHT), pas des devis
- CA prévisionnel = somme des devis acceptés/en cours (apiGetDevis.totalHT)
- Avoirs (typeFacture='avoir') = montants NÉGATIFS qui réduisent le CA
- Taux de transformation = devis transformés en facture / total devis
- Interventions productives = state 'completed' ou 'validated', type 'technique'

## Filtres standards
- Période: date_range (date_from, date_to)
- Agence: agency_slug
- Univers: universes[]
- État/Statut: state, paymentStatus
- Type: type, typeFacture

## Formules disponibles
- count: compter les éléments
- sum: sommer un champ numérique (totalHT, totalTTC)
- avg: moyenne d'un champ numérique
- ratio: rapport entre deux valeurs (ex: taux de transformation)
- groupBy: regrouper par dimension (mois, univers, technicien, apporteur)
`;

const SYSTEM_PROMPT = `${APOGEE_CONTEXT}

## Ta mission
Analyser une phrase métier en français et générer une définition de métrique JSON.

## Format de réponse OBLIGATOIRE (JSON strict)
{
  "understood": true/false,
  "businessSummary": "Résumé en français de ce que la métrique va mesurer",
  "technicalSummary": "Résumé technique: source, filtres, agrégation",
  "metric": {
    "id": "identifiant_snake_case",
    "label": "Nom affichable de la métrique",
    "scope": "agency" ou "franchiseur",
    "input_sources": {
      "primary": "nom_endpoint",
      "joins": []
    },
    "formula": {
      "type": "count|sum|avg|ratio",
      "field": "champ_si_sum_ou_avg",
      "groupBy": ["dimension_optionnelle"]
    },
    "filters": [
      {"field": "nom_champ", "operator": "eq|in|between|gt|lt", "value": "valeur_ou_variable"}
    ],
    "description_agence": "Description pour utilisateur agence",
    "description_franchiseur": "Description pour franchiseur"
  },
  "confidence": 0.0-1.0,
  "suggestions": ["suggestion1 si ambiguïté", "suggestion2"]
}

## Règles
1. Toujours répondre en JSON valide
2. Si la demande est floue, understood=false et proposer des suggestions
3. Utiliser les variables {{date_from}}, {{date_to}}, {{agency_slug}} pour les filtres dynamiques
4. Privilégier les formules simples et efficaces
5. Le scope est "agency" par défaut sauf si mention explicite du réseau/toutes agences
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyse cette demande métier et génère la définition de métrique:\n\n"${query}"` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON response from AI
    let analysisResult;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      analysisResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      analysisResult = {
        understood: false,
        businessSummary: "Je n'ai pas compris votre demande. Pouvez-vous reformuler?",
        technicalSummary: "",
        metric: null,
        confidence: 0,
        suggestions: [
          "CA facturé du mois",
          "Nombre d'interventions cette semaine",
          "Devis en attente de validation",
          "Top 5 techniciens par nombre d'interventions"
        ]
      };
    }

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("statia-analyze-metric error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

const PAYSLIP_EXTRACTION_PROMPT = `Tu es un expert en analyse de bulletins de paie français. À partir du texte OCR d'un bulletin de paie, tu dois extraire TOUTES les informations et retourner UNIQUEMENT un JSON structuré.

RÈGLES STRICTES:
- Ne JAMAIS inventer de valeur : si un champ est introuvable ou ambigu, mettre null
- Tous les montants doivent être numériques (float), sans symbole € ni séparateur de milliers
- Les heures en heures décimales (float)
- Les dates au format ISO YYYY-MM-DD
- Ajouter les erreurs/ambiguïtés dans le tableau "warnings"

FORMAT JSON ATTENDU:
{
  "metadata": {
    "periode_mois": "string (ex: 11)",
    "periode_annee": "number (ex: 2025)",
    "periode_date_debut": "YYYY-MM-DD",
    "periode_date_fin": "YYYY-MM-DD",
    "numero_bulletin": "string",
    "convention_collective": "string"
  },
  "employeur": {
    "raison_sociale": "string",
    "adresse": "string",
    "siret": "string",
    "ape_naf": "string"
  },
  "salarie": {
    "nom_complet": "string",
    "adresse": "string",
    "numero_securite_sociale": "string",
    "matricule": "string",
    "date_entree": "YYYY-MM-DD",
    "date_anciennete": "YYYY-MM-DD"
  },
  "classification": {
    "emploi_intitule": "string",
    "statut": "string (Ouvrier, Mensualisé, Horaire...)",
    "niveau": "string ou number",
    "echelon": "string ou number",
    "coefficient": "string ou number",
    "duree_contractuelle_heures": "number (ex: 169.00)"
  },
  "base_salaire": {
    "heures_base": "number (ex: 151.67)",
    "taux_horaire_brut": "number (ex: 17.50)",
    "montant_brut_base": "number"
  },
  "lignes_remuneration_variables": [
    {
      "code": "string ou null",
      "libelle": "string (intitulé exact)",
      "categorie_interne": "string parmi: heures_normales, heures_supp_125, heures_supp_150, heures_nuit, dimanche_ferie, astreinte, deplacement, prime_exceptionnelle, prime_panier_repas, prime_outillage, prime_transport, prime_salissure, prime_performance, prime_anciennete, prime_vacances, indemnite_trajet_zone, indemnite_repas_soumise, indemnite_repas_non_soumise, indemnite_autre, autre",
      "nombre": "number (heures, jours, quantités)",
      "unite": "string (heures, jour, unite)",
      "taux": "number",
      "montant": "number",
      "soumis_cotisations": "boolean ou null",
      "soumis_impot": "boolean ou null"
    }
  ],
  "totaux": {
    "total_brut": "number",
    "total_soumis": "number ou null",
    "total_non_soumis": "number ou null",
    "assiette_csg": "number",
    "assiette_cotisations": "number",
    "assiette_plafonnee": "number",
    "plafond_ss_mensuel": "number ou null",
    "montant_net_social": "number"
  },
  "cotisations": {
    "maladie_maternite": { "part_salariale": "number|null", "part_patronale": "number|null" },
    "accident_travail": { "part_salariale": "number|null", "part_patronale": "number|null" },
    "vieillesse_deplafonnee": { "part_salariale": "number|null", "part_patronale": "number|null" },
    "vieillesse_plafonnee": { "part_salariale": "number|null", "part_patronale": "number|null" },
    "allocations_familiales": { "part_salariale": "number|null", "part_patronale": "number|null" },
    "complementaire_sante": { "part_salariale": "number|null", "part_patronale": "number|null" },
    "prevoyance_incapacite_deces": { "part_salariale": "number|null", "part_patronale": "number|null" },
    "retraite_complementaire_tranche1": { "part_salariale": "number|null", "part_patronale": "number|null" },
    "assurance_chomage": { "part_salariale": "number|null", "part_patronale": "number|null" },
    "csg_deductible": { "assiette": "number|null", "montant": "number|null" },
    "csg_crds_non_deductible": { "assiette": "number|null", "montant": "number|null" },
    "autres_contributions_patronales": "number|null",
    "exonerations_allegements": "number|null"
  },
  "net": {
    "net_imposable": "number",
    "net_a_payer_avant_impot": "number",
    "net_a_payer": "number",
    "taux_prelevement_source": "number|null",
    "montant_prelevement_source": "number|null",
    "montant_pas": "number|null"
  },
  "cumuls_annuels": {
    "heures_cumulees": "number",
    "brut_cumule": "number",
    "net_imposable_cumule": "number",
    "net_a_payer_cumule": "number",
    "charges_salariales_cumulees": "number",
    "charges_patronales_cumulees": "number",
    "assiette_cumulee": "number",
    "montant_pas_cumule": "number"
  },
  "conges_rtt": {
    "cp_n1_acquis": "number|null",
    "cp_n1_pris": "number|null",
    "cp_n1_solde": "number|null",
    "cp_n_acquis": "number|null",
    "cp_n_pris": "number|null",
    "cp_n_solde": "number|null",
    "rtt_acquis": "number|null",
    "rtt_pris": "number|null",
    "rtt_solde": "number|null"
  },
  "cout_employeur": {
    "total_charges_salariales": "number",
    "total_charges_patronales": "number",
    "cout_global_employeur": "number"
  },
  "paiement": {
    "mode_paiement": "string (Virement, Chèque...)",
    "date_paiement": "YYYY-MM-DD ou null",
    "iban_masque": "string ou null"
  },
  "warnings": ["tableau de string avec les champs introuvables ou ambigus"]
}

IMPORTANT: Retourne UNIQUEMENT le JSON, sans texte avant ou après.`;

serve(async (req) => {
  // Gestion CORS centralisée
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    const { documentId, filePath, collaboratorId, agencyId } = await req.json();

    if (!documentId || !filePath) {
      return withCors(req, new Response(
        JSON.stringify({ error: "documentId et filePath requis" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ));
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return withCors(req, new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY non configurée" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ));
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Créer l'entrée payslip_data en status 'processing'
    const { error: insertError } = await supabase
      .from("payslip_data")
      .upsert({
        document_id: documentId,
        collaborator_id: collaboratorId,
        agency_id: agencyId,
        extraction_status: "processing",
      }, { onConflict: "document_id" });

    if (insertError) {
      console.error("Erreur création payslip_data:", insertError);
    }

    // Télécharger le PDF depuis le storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("rh-documents")
      .download(filePath);

    if (downloadError || !fileData) {
      await supabase
        .from("payslip_data")
        .update({
          extraction_status: "error",
          extraction_error: `Impossible de télécharger le fichier: ${downloadError?.message}`,
        })
        .eq("document_id", documentId);

      return withCors(req, new Response(
        JSON.stringify({ error: "Impossible de télécharger le fichier", details: downloadError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Convertir le PDF en base64 (utiliser l'encodeur Deno natif pour éviter stack overflow)
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = base64Encode(arrayBuffer);

    // Appeler Lovable AI avec le PDF
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: PAYSLIP_EXTRACTION_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyse ce bulletin de paie et extrais toutes les informations au format JSON demandé."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Erreur AI:", aiResponse.status, errorText);
      
      await supabase
        .from("payslip_data")
        .update({
          extraction_status: "error",
          extraction_error: `Erreur API AI: ${aiResponse.status}`,
        })
        .eq("document_id", documentId);

      return withCors(req, new Response(
        JSON.stringify({ error: "Erreur lors de l'analyse AI", details: errorText }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ));
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parser le JSON de la réponse
    let extractedData;
    try {
      // Nettoyer le contenu (enlever les backticks markdown si présents)
      let jsonContent = content.trim();
      if (jsonContent.startsWith("```json")) {
        jsonContent = jsonContent.slice(7);
      }
      if (jsonContent.startsWith("```")) {
        jsonContent = jsonContent.slice(3);
      }
      if (jsonContent.endsWith("```")) {
        jsonContent = jsonContent.slice(0, -3);
      }
      extractedData = JSON.parse(jsonContent.trim());
    } catch (parseError) {
      console.error("Erreur parsing JSON:", parseError, "Content:", content);
      
      await supabase
        .from("payslip_data")
        .update({
          extraction_status: "error",
          extraction_error: "Impossible de parser la réponse AI en JSON",
          raw_data: { raw_response: content },
        })
        .eq("document_id", documentId);

      return withCors(req, new Response(
        JSON.stringify({ error: "Erreur parsing JSON", raw: content }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Extraire les champs clés pour les colonnes indexées
    const updateData = {
      extraction_status: "success",
      extracted_at: new Date().toISOString(),
      raw_data: extractedData,
      extraction_warnings: extractedData.warnings || [],
      extraction_error: null,
      
      // Période
      periode_mois: extractedData.metadata?.periode_mois ? parseInt(extractedData.metadata.periode_mois) : null,
      periode_annee: extractedData.metadata?.periode_annee || null,
      periode_date_debut: extractedData.metadata?.periode_date_debut || null,
      periode_date_fin: extractedData.metadata?.periode_date_fin || null,
      
      // Champs clés
      taux_horaire_brut: extractedData.base_salaire?.taux_horaire_brut || null,
      heures_base: extractedData.base_salaire?.heures_base || null,
      montant_brut_base: extractedData.base_salaire?.montant_brut_base || null,
      total_brut: extractedData.totaux?.total_brut || null,
      net_imposable: extractedData.net?.net_imposable || null,
      net_a_payer: extractedData.net?.net_a_payer || null,
      montant_net_social: extractedData.totaux?.montant_net_social || null,
      total_charges_salariales: extractedData.cout_employeur?.total_charges_salariales || null,
      total_charges_patronales: extractedData.cout_employeur?.total_charges_patronales || null,
      cout_global_employeur: extractedData.cout_employeur?.cout_global_employeur || null,
      
      // Cumuls
      brut_cumule: extractedData.cumuls_annuels?.brut_cumule || null,
      net_imposable_cumule: extractedData.cumuls_annuels?.net_imposable_cumule || null,
      heures_cumulees: extractedData.cumuls_annuels?.heures_cumulees || null,
    };

    const { error: updateError } = await supabase
      .from("payslip_data")
      .update(updateData)
      .eq("document_id", documentId);

    if (updateError) {
      console.error("Erreur mise à jour payslip_data:", updateError);
      return withCors(req, new Response(
        JSON.stringify({ error: "Erreur sauvegarde données", details: updateError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ));
    }

    return withCors(req, new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData,
        warnings: extractedData.warnings || []
      }),
      { headers: { "Content-Type": "application/json" } }
    ));

  } catch (error) {
    console.error("Erreur analyze-payslip:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return withCors(req, new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    ));
  }
});

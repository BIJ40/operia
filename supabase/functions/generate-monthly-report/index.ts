import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";
import { errorResponse, successResponse, authError, forbiddenError } from "../_shared/error.ts";

// Role level mapping
const ROLE_LEVELS: Record<string, number> = {
  'base_user': 0,
  'franchisee_user': 1,
  'franchisee_admin': 2,
  'franchisor_user': 3,
  'franchisor_admin': 4,
  'platform_admin': 5,
  'superadmin': 6,
};

function getRoleLevel(role: string | null): number {
  if (!role) return 0;
  return ROLE_LEVELS[role] ?? 0;
}

interface ReportSettings {
  enabled_sections: Record<string, boolean>;
  comparison_period: 'month' | 'year' | 'both';
  ca_format: 'euro' | 'kilo';
  custom_note?: string;
}

function formatCurrency(amount: number, format: 'euro' | 'kilo'): string {
  if (format === 'kilo') {
    return `${(amount / 1000).toFixed(1)} k€`;
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const cronSecret = Deno.env.get("CRON_SECRET");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check for CRON secret (service-to-service call)
    const cronSecretHeader = req.headers.get("X-CRON-SECRET");
    const isCronCall = cronSecretHeader && cronSecret && cronSecretHeader === cronSecret;

    // Parse body
    const body = await req.json();
    const { agencySlug, month, year, preview = false } = body;

    if (!agencySlug || !month || !year) {
      return withCors(req, errorResponse("VALIDATION_ERROR", "agencySlug, month et year sont requis", null, 400));
    }

    // Get agency info
    const { data: agency, error: agencyErr } = await supabaseAdmin
      .from("apogee_agencies")
      .select("id, slug, label, contact_email")
      .eq("slug", agencySlug)
      .single();

    if (agencyErr || !agency) {
      return withCors(req, errorResponse("AGENCY_NOT_FOUND", `Agence ${agencySlug} non trouvée`, agencyErr));
    }

    // --- SERVER-SIDE AUTHORIZATION (mandatory unless CRON call) ---
    if (!isCronCall) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return withCors(req, authError("Token manquant"));
      }

      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
      if (userErr || !user) {
        return withCors(req, authError("Utilisateur non authentifié"));
      }

      // Get user profile for authorization check
      const { data: profile, error: profErr } = await supabaseAdmin
        .from("profiles")
        .select("id, agency_id, global_role")
        .eq("id", user.id)
        .single();

      if (profErr || !profile) {
        return withCors(req, errorResponse("PROFILE_ERROR", "Profil introuvable"));
      }

      const roleLevel = getRoleLevel(profile.global_role);
      const userAgencyId = profile.agency_id;

      // N4+ = all agencies, else must be own agency and N2+
      if (roleLevel < 4) {
        if (roleLevel < 2 || userAgencyId !== agency.id) {
          return withCors(req, forbiddenError("Accès non autorisé à cette agence"));
        }
      }
    }

    console.log(`[generate-monthly-report] Generating for ${agency.label} - ${month}/${year} (preview: ${preview}, cron: ${isCronCall})`);

    // Get report settings
    const { data: settings } = await supabaseAdmin
      .from("report_settings")
      .select("*")
      .eq("agency_id", agency.id)
      .single();

    const reportSettings: ReportSettings = {
      enabled_sections: (settings?.enabled_sections as Record<string, boolean>) ?? {
        synthese: true, ca: true, techniciens: true, univers: true,
        apporteurs: true, sav: true, recouvrement: true, devis: true,
        interventions: true, actions: true,
      },
      comparison_period: (settings?.comparison_period as 'month' | 'year' | 'both') ?? 'both',
      ca_format: (settings?.ca_format as 'euro' | 'kilo') ?? 'euro',
      custom_note: settings?.custom_note ?? '',
    };

    // Fetch Apogée data
    const apogeeApiKey = Deno.env.get("APOGEE_API_KEY");
    // IMPORTANT: Dynamic URL based on agency slug - never hardcode!
    const apiBaseUrl = `https://${agencySlug}.hc-apogee.fr/api/`;

    const fetchApogee = async (endpoint: string) => {
      try {
        const res = await fetch(`${apiBaseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ API_KEY: apogeeApiKey }),
        });
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch {
        return [];
      }
    };

    const [factures, interventions, projects, clients, devis, users] = await Promise.all([
      fetchApogee('apiGetFactures'),
      fetchApogee('apiGetInterventions'),
      fetchApogee('apiGetProjects'),
      fetchApogee('apiGetClients'),
      fetchApogee('apiGetDevis'),
      fetchApogee('apiGetUsers'),
    ]);

    // Calculate date ranges
    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const prevMonthNum = month === 1 ? 12 : month - 1;
    const prevYearNum = month === 1 ? year - 1 : year;
    const prevStart = new Date(prevYearNum, prevMonthNum - 1, 1);
    const prevEnd = new Date(prevYearNum, prevMonthNum, 0, 23, 59, 59);

    const parseDate = (d: any): Date | null => {
      if (!d) return null;
      try {
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? null : parsed;
      } catch { return null; }
    };

    const isInPeriod = (d: Date | null, s: Date, e: Date) => d && d >= s && d <= e;

    const clientMap = new Map(clients.map((c: any) => [c.id, c]));
    const projectMap = new Map(projects.map((p: any) => [p.id, p]));
    const userMap = new Map(users.map((u: any) => [u.id, u]));

    // Calculate invoice totals
    const getInvoiceTotal = (f: any): number => {
      if (f.data?.totalHT) return parseFloat(f.data.totalHT) || 0;
      if (!f.items || !Array.isArray(f.items)) return 0;
      return f.items.reduce((sum: number, item: any) => sum + (parseFloat(item.totalHt || item.totalHT || 0)), 0);
    };

    // Filter invoices
    const filterFactures = (s: Date, e: Date) => factures.filter((f: any) => {
      if (f.data?.isInit === true) return false;
      if (f.type === 'Avoir' || f.isCreditNote === true) return false;
      const d = parseDate(f.dateReelle || f.date);
      return isInPeriod(d, s, e);
    });

    const facturesPeriod = filterFactures(startDate, endDate);
    const facturesPrev = filterFactures(prevStart, prevEnd);

    const caPeriod = facturesPeriod.reduce((sum: number, f: any) => sum + getInvoiceTotal(f), 0);
    const caPrev = facturesPrev.reduce((sum: number, f: any) => sum + getInvoiceTotal(f), 0);
    const caEvolution = caPrev > 0 ? ((caPeriod - caPrev) / caPrev) * 100 : 0;

    // Interventions
    const intervPeriod = interventions.filter((i: any) => {
      const d = parseDate(i.date || i.dateDebut);
      return isInPeriod(d, startDate, endDate);
    });

    // Devis
    const devisPeriod = devis.filter((d: any) => isInPeriod(parseDate(d.dateReelle || d.date), startDate, endDate));
    const devisEnvoyes = devisPeriod.filter((d: any) => (d.state || '').toLowerCase() !== 'draft');
    const devisAcceptes = devisEnvoyes.filter((d: any) => (d.state || '').toLowerCase() === 'invoice');
    const conversionRate = devisEnvoyes.length > 0 ? (devisAcceptes.length / devisEnvoyes.length) * 100 : 0;

    // Technicians stats
    const techStats: Record<string, { name: string; ca: number; interventions: number }> = {};
    intervPeriod.forEach((interv: any) => {
      const projectInvoices = facturesPeriod.filter((f: any) => f.projectId === interv.projectId);
      const projectCA = projectInvoices.reduce((sum: number, f: any) => sum + getInvoiceTotal(f), 0);
      
      const techIds: string[] = [];
      if (interv.userId) techIds.push(String(interv.userId));
      if (interv.data?.visites?.[0]?.usersIds) {
        techIds.push(...interv.data.visites[0].usersIds.map(String));
      }
      const unique = [...new Set(techIds)];
      const caPerTech = unique.length > 0 ? projectCA / unique.length : 0;

      unique.forEach(id => {
        if (!techStats[id]) {
          const u = userMap.get(parseInt(id)) || userMap.get(id);
          techStats[id] = {
            name: u?.label || u?.name || `Tech ${id}`,
            ca: 0,
            interventions: 0,
          };
        }
        techStats[id].ca += caPerTech;
        techStats[id].interventions += 1;
      });
    });

    // SAV
    const projectsFactures = new Set(facturesPeriod.map((f: any) => f.projectId));
    const projectsAvecSAV = new Set<string>();
    intervPeriod.forEach((i: any) => {
      if (!projectsFactures.has(i.projectId)) return;
      const isSAV = (i.type2 || '').toLowerCase() === 'sav' ||
                    i.data?.visites?.some((v: any) => (v.type2 || '').toLowerCase() === 'sav');
      if (isSAV) projectsAvecSAV.add(i.projectId);
    });
    const savRate = projectsFactures.size > 0 ? (projectsAvecSAV.size / projectsFactures.size) * 100 : 0;

    // Format month name
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const monthName = monthNames[month - 1];
    const generatedAt = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

    const formatCurr = (n: number) => formatCurrency(n, reportSettings.ca_format);
    const formatPct = (n: number) => `${n.toFixed(1)}%`;
    const sections = reportSettings.enabled_sections;
    const evolutionIcon = caEvolution >= 0 ? '📈' : '📉';
    const evolutionColor = caEvolution >= 0 ? '#22c55e' : '#ef4444';

    // Generate HTML report
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'Activité - ${agency.label} - ${monthName} ${year}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; line-height: 1.5; color: #1f2937; background: #fff; }
    .page { page-break-after: always; padding: 20px; }
    .page:last-child { page-break-after: auto; }
    .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; background: linear-gradient(135deg, #0066cc 0%, #003d7a 100%); color: white; }
    .cover h1 { font-size: 36pt; margin-bottom: 10px; font-weight: 700; }
    .cover h2 { font-size: 24pt; font-weight: 400; margin-bottom: 30px; }
    .cover .period { font-size: 18pt; opacity: 0.9; margin-bottom: 20px; }
    .cover .date { font-size: 12pt; opacity: 0.7; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 16pt; font-weight: 700; color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 8px; margin-bottom: 20px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
    .kpi-card { background: #f8fafc; border-radius: 8px; padding: 15px; text-align: center; border-left: 4px solid #0066cc; }
    .kpi-value { font-size: 24pt; font-weight: 700; color: #1f2937; }
    .kpi-label { font-size: 9pt; color: #6b7280; text-transform: uppercase; }
    .kpi-trend { font-size: 10pt; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; color: #374151; font-size: 10pt; }
    tr:nth-child(even) { background: #f9fafb; }
    .text-right { text-align: right; }
    .footer { text-align: center; font-size: 9pt; color: #9ca3af; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="page cover">
    <h1>Rapport d'Activité</h1>
    <h2>${agency.label}</h2>
    <div class="period">${monthName} ${year}</div>
    <div class="date">Généré le ${generatedAt}</div>
  </div>

  ${sections.synthese !== false ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">📊 Synthèse Dirigeant</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${formatCurr(caPeriod)}</div>
          <div class="kpi-label">CA HT Mois</div>
          <div class="kpi-trend" style="color: ${evolutionColor}">
            ${evolutionIcon} ${formatPct(Math.abs(caEvolution))} vs M-1
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${intervPeriod.length}</div>
          <div class="kpi-label">Interventions</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${devisPeriod.length}</div>
          <div class="kpi-label">Devis Émis</div>
          <div class="kpi-trend">${formatPct(conversionRate)} conversion</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${formatPct(savRate)}</div>
          <div class="kpi-label">Taux SAV</div>
        </div>
      </div>
    </div>
  </div>
  ` : ''}

  ${sections.techniciens !== false && Object.keys(techStats).length > 0 ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">👷 Performance Techniciens</h2>
      <table>
        <thead>
          <tr>
            <th>Technicien</th>
            <th class="text-right">CA Attribué</th>
            <th class="text-right">Interventions</th>
            <th class="text-right">Ticket Moyen</th>
          </tr>
        </thead>
        <tbody>
          ${Object.values(techStats).sort((a, b) => b.ca - a.ca).map(t => `
          <tr>
            <td>${t.name}</td>
            <td class="text-right">${formatCurr(t.ca)}</td>
            <td class="text-right">${t.interventions}</td>
            <td class="text-right">${formatCurr(t.interventions > 0 ? t.ca / t.interventions : 0)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  ` : ''}

  ${reportSettings.custom_note ? `
  <div class="section">
    <h2 class="section-title">📝 Note</h2>
    <p>${reportSettings.custom_note}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>HelpConfort Services • Rapport généré automatiquement</p>
    <p>© ${year} - Tous droits réservés</p>
  </div>
</body>
</html>`;

    // Convert to PDF via Gotenberg
    const gotenbergUrl = Deno.env.get("GOTENBERG_URL");
    const gotenbergApiKey = Deno.env.get("GOTENBERG_API_KEY");

    let pdfBuffer: ArrayBuffer | null = null;

    if (gotenbergUrl) {
      try {
        const formData = new FormData();
        formData.append("files", new Blob([html], { type: "text/html" }), "index.html");
        formData.append("marginTop", "0.5");
        formData.append("marginBottom", "0.5");
        formData.append("marginLeft", "0.5");
        formData.append("marginRight", "0.5");

        const pdfRes = await fetch(`${gotenbergUrl}/forms/chromium/convert/html`, {
          method: "POST",
          headers: gotenbergApiKey ? { "X-API-KEY": gotenbergApiKey } : {},
          body: formData,
        });

        if (pdfRes.ok) {
          pdfBuffer = await pdfRes.arrayBuffer();
          console.log(`[generate-monthly-report] PDF generated (${pdfBuffer.byteLength} bytes)`);
        } else {
          console.error(`[generate-monthly-report] Gotenberg error: ${pdfRes.status}`);
        }
      } catch (err) {
        console.error(`[generate-monthly-report] Gotenberg exception:`, err);
      }
    }

    // Handle preview mode - upload temp file and return signed URL
    if (preview) {
      if (!pdfBuffer) {
        return withCors(req, errorResponse("PREVIEW_UNAVAILABLE", "PDF non disponible (Gotenberg non configuré)"));
      }

      const previewPath = `previews/${agency.id}/${Date.now()}-${crypto.randomUUID()}.pdf`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from("monthly-reports")
        .upload(previewPath, new Uint8Array(pdfBuffer), {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadErr) {
        console.error(`[generate-monthly-report] Preview upload error:`, uploadErr);
        return withCors(req, errorResponse("PREVIEW_UPLOAD_ERROR", "Erreur upload preview", uploadErr.message));
      }

      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from("monthly-reports")
        .createSignedUrl(previewPath, 300); // 5 minutes

      if (signErr || !signed?.signedUrl) {
        return withCors(req, errorResponse("SIGNED_URL_ERROR", "Preview indisponible"));
      }

      return withCors(req, successResponse({ previewUrl: signed.signedUrl }));
    }

    // Upload final report to storage (UUID path: {agency_id}/{year}/{month}/...)
    const monthStr = String(month).padStart(2, '0');
    const fileName = `rapport-${year}-${monthStr}.pdf`;
    const filePath = `${agency.id}/${year}/${monthStr}/${fileName}`;

    if (pdfBuffer) {
      const { error: uploadError } = await supabaseAdmin.storage
        .from("monthly-reports")
        .upload(filePath, new Uint8Array(pdfBuffer), {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error(`[generate-monthly-report] Storage upload error:`, uploadError);
        return withCors(req, errorResponse("STORAGE_UPLOAD_ERROR", "Erreur upload rapport", uploadError.message));
      }
    }

    // Save report metadata to DB
    const metrics = {
      ca_total: caPeriod,
      ca_evolution: parseFloat(caEvolution.toFixed(2)),
      interventions_count: intervPeriod.length,
      devis_count: devisPeriod.length,
      devis_valides: devisAcceptes.length,
      taux_transformation: parseFloat(conversionRate.toFixed(2)),
      taux_sav: parseFloat(savRate.toFixed(2)),
    };

    const { data: report, error: insertErr } = await supabaseAdmin
      .from("monthly_reports")
      .upsert({
        agency_id: agency.id,
        month,
        year,
        status: "completed",
        file_path: pdfBuffer ? filePath : null,
        file_name: pdfBuffer ? fileName : null,
        file_size: pdfBuffer ? pdfBuffer.byteLength : null,
        metrics_snapshot: metrics,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: "agency_id,year,month",
      })
      .select()
      .single();

    if (insertErr) {
      console.error(`[generate-monthly-report] DB insert error:`, insertErr);
      return withCors(req, errorResponse("DB_INSERT_ERROR", "Erreur sauvegarde rapport", insertErr.message));
    }

    console.log(`[generate-monthly-report] Report saved: ${report?.id}`);

    return withCors(req, successResponse({
      id: report?.id,
      filePath: pdfBuffer ? filePath : null,
      metrics,
      message: `Rapport ${monthName} ${year} généré avec succès`,
    }));

  } catch (err) {
    console.error("[generate-monthly-report] Unexpected error:", err);
    return withCors(req, errorResponse("INTERNAL_ERROR", "Erreur interne", err instanceof Error ? err.message : String(err)));
  }
});

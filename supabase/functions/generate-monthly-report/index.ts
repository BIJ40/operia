import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";
import { errorResponse, successResponse, authError, forbiddenError } from "../_shared/error.ts";
import { withSentry } from '../_shared/withSentry.ts';

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

Deno.serve(withSentry({ functionName: 'generate-monthly-report' }, async (req) => {
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

    // ========================================
    // TECHNICIANS STATS - LOGIQUE STATIA CORRIGÉE
    // Attribution CA proportionnelle au temps passé
    // ========================================
    
    // Helper: vérifier si intervention est RT (non-productive)
    const isRTIntervention = (interv: any): boolean => {
      return (
        interv.data?.biRt?.isValidated === true ||
        interv.data?.type2 === 'RT' ||
        (interv.type2 || '').toUpperCase() === 'RT'
      );
    };

    // Helper: vérifier si intervention est productive (dépannage ou travaux)
    const isProductiveIntervention = (interv: any): boolean => {
      if (isRTIntervention(interv)) return false;
      return !!(interv.data?.biDepan || interv.data?.biTvx);
    };

    // Étape 1: Calculer le temps par technicien par projet (visites validées uniquement)
    const dureeTechParProjet: Record<string, Record<string, number>> = {};
    const dureeTotaleParProjet: Record<string, number> = {};
    
    interventions.forEach((interv: any) => {
      const projectId = interv.projectId || interv.refProjectId;
      if (!projectId) return;
      
      // Exclure RT et non-productives
      if (!isProductiveIntervention(interv)) return;
      
      // Initialiser le projet
      if (!dureeTechParProjet[projectId]) {
        dureeTechParProjet[projectId] = {};
        dureeTotaleParProjet[projectId] = 0;
      }
      
      // Parcourir les visites validées uniquement
      const visites = interv.data?.visites || [];
      visites.forEach((visite: any) => {
        if (visite.state !== 'validated') return;
        
        const duree = Number(visite.duree) || 0;
        const usersIds = visite.usersIds || [];
        
        usersIds.forEach((techId: string) => {
          const tid = String(techId);
          if (!dureeTechParProjet[projectId][tid]) {
            dureeTechParProjet[projectId][tid] = 0;
          }
          dureeTechParProjet[projectId][tid] += duree;
          dureeTotaleParProjet[projectId] += duree;
        });
      });
    });

    // Étape 2: Calculer CA par projet (factures de la période)
    const caParProjet: Record<string, number> = {};
    facturesPeriod.forEach((f: any) => {
      const pid = f.projectId;
      if (!pid) return;
      const montant = getInvoiceTotal(f);
      caParProjet[pid] = (caParProjet[pid] || 0) + montant;
    });

    // Étape 3: Attribuer le CA aux techniciens proportionnellement au temps
    const techStats: Record<string, { name: string; ca: number; interventions: number; heures: number }> = {};
    const projectsParTech: Record<string, Set<string>> = {};
    
    Object.keys(caParProjet).forEach((projectId) => {
      const ca = caParProjet[projectId];
      const dureeTotale = dureeTotaleParProjet[projectId] || 0;
      const dureesTechs = dureeTechParProjet[projectId] || {};
      
      // Si pas de temps tracké, ignorer (pas de CA attribué)
      if (dureeTotale === 0) return;
      
      Object.keys(dureesTechs).forEach((techId) => {
        const dureeTech = dureesTechs[techId];
        const partTech = dureeTech / dureeTotale;
        const caTech = ca * partTech;
        
        if (!techStats[techId]) {
          const u = userMap.get(parseInt(techId)) || userMap.get(techId);
          const nom = u?.label || u?.name || 
                     (u?.firstname && u?.lastname ? `${u.firstname} ${u.lastname}` : `Tech ${techId}`);
          techStats[techId] = { name: nom, ca: 0, interventions: 0, heures: 0 };
          projectsParTech[techId] = new Set();
        }
        
        techStats[techId].ca += caTech;
        techStats[techId].heures += dureeTech / 60; // Convertir minutes en heures
        projectsParTech[techId].add(projectId);
      });
    });

    // Compter les interventions productives par tech
    intervPeriod.forEach((interv: any) => {
      if (!isProductiveIntervention(interv)) return;
      const visites = interv.data?.visites || [];
      const techIds = new Set<string>();
      visites.forEach((v: any) => {
        if (v.state === 'validated' && v.usersIds) {
          v.usersIds.forEach((id: string) => techIds.add(String(id)));
        }
      });
      techIds.forEach((tid) => {
        if (techStats[tid]) {
          techStats[tid].interventions += 1;
        }
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

    // ========================================
    // UNIVERS STATS
    // ========================================
    const universStats: Record<string, { ca: number; factures: number; projets: Set<string> }> = {};
    facturesPeriod.forEach((f: any) => {
      const project = projectMap.get(f.projectId);
      const universes = project?.data?.universes || [];
      const ca = getInvoiceTotal(f);
      
      if (universes.length === 0) {
        // Sans univers = "Non classé"
        if (!universStats['Non classé']) {
          universStats['Non classé'] = { ca: 0, factures: 0, projets: new Set() };
        }
        universStats['Non classé'].ca += ca;
        universStats['Non classé'].factures += 1;
        if (f.projectId) universStats['Non classé'].projets.add(f.projectId);
      } else {
        const caPerUnivers = ca / universes.length;
        universes.forEach((u: string) => {
          const univers = u.charAt(0).toUpperCase() + u.slice(1).toLowerCase();
          if (!universStats[univers]) {
            universStats[univers] = { ca: 0, factures: 0, projets: new Set() };
          }
          universStats[univers].ca += caPerUnivers;
          universStats[univers].factures += 1;
          if (f.projectId) universStats[univers].projets.add(f.projectId);
        });
      }
    });

    // ========================================
    // APPORTEURS STATS
    // ========================================
    const apporteurStats: Record<string, { name: string; ca: number; projets: Set<string> }> = {};
    facturesPeriod.forEach((f: any) => {
      const project = projectMap.get(f.projectId);
      const commanditaireId = project?.data?.commanditaireId;
      const ca = getInvoiceTotal(f);
      
      if (!commanditaireId) {
        // Direct/Particulier
        if (!apporteurStats['Direct']) {
          apporteurStats['Direct'] = { name: 'Direct (Particuliers)', ca: 0, projets: new Set() };
        }
        apporteurStats['Direct'].ca += ca;
        if (f.projectId) apporteurStats['Direct'].projets.add(f.projectId);
      } else {
        const client = clientMap.get(commanditaireId);
        const name = client?.name || client?.nom || `Apporteur ${commanditaireId}`;
        const key = String(commanditaireId);
        if (!apporteurStats[key]) {
          apporteurStats[key] = { name, ca: 0, projets: new Set() };
        }
        apporteurStats[key].ca += ca;
        if (f.projectId) apporteurStats[key].projets.add(f.projectId);
      }
    });

    // ========================================
    // PROJETS créés ce mois
    // ========================================
    const projectsPeriod = projects.filter((p: any) => {
      const d = parseDate(p.date || p.created_at);
      return isInPeriod(d, startDate, endDate);
    });
    const nbDossiersCrees = projectsPeriod.length;

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

    // Escape HTML helper
    const escapeHtml = (str: string): string => {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    // ========================================
    // SVG CHART HELPERS
    // ========================================
    
    // Horizontal bar chart SVG
    const renderBarChart = (items: { label: string; value: number }[], maxBars = 8, color = '#0066cc'): string => {
      const top = items.slice(0, maxBars);
      if (top.length === 0) return '<p style="color:#9ca3af;text-align:center;">Aucune donnée</p>';
      
      const max = Math.max(...top.map(i => i.value), 1);
      const barHeight = 24;
      const labelWidth = 180;
      const chartWidth = 340;
      
      const bars = top.map((i, idx) => {
        const w = Math.round((i.value / max) * chartWidth);
        const y = idx * (barHeight + 8);
        const label = escapeHtml(i.label.length > 22 ? i.label.substring(0, 20) + '...' : i.label);
        return `
          <g transform="translate(0, ${y})">
            <text x="0" y="16" font-size="10" fill="#374151">${label}</text>
            <rect x="${labelWidth}" y="4" width="${w}" height="16" rx="3" fill="${color}"/>
            <text x="${labelWidth + w + 8}" y="16" font-size="10" fill="#374151">${formatCurr(i.value)}</text>
          </g>
        `;
      }).join('');

      const svgHeight = top.length * (barHeight + 8) + 10;
      return `<svg width="100%" height="${svgHeight}" viewBox="0 0 600 ${svgHeight}" style="max-width:600px;">${bars}</svg>`;
    };

    // Pie chart SVG (simple donut)
    const renderDonutChart = (items: { label: string; value: number; color: string }[], size = 140): string => {
      const total = items.reduce((sum, i) => sum + i.value, 0);
      if (total === 0) return '<p style="color:#9ca3af;text-align:center;">Aucune donnée</p>';
      
      let currentAngle = -90;
      const radius = size / 2 - 10;
      const innerRadius = radius * 0.5;
      const cx = size / 2;
      const cy = size / 2;
      
      const paths = items.map((item) => {
        const angle = (item.value / total) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;
        
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        
        const x1 = cx + radius * Math.cos(startRad);
        const y1 = cy + radius * Math.sin(startRad);
        const x2 = cx + radius * Math.cos(endRad);
        const y2 = cy + radius * Math.sin(endRad);
        const x3 = cx + innerRadius * Math.cos(endRad);
        const y3 = cy + innerRadius * Math.sin(endRad);
        const x4 = cx + innerRadius * Math.cos(startRad);
        const y4 = cy + innerRadius * Math.sin(startRad);
        
        const largeArc = angle > 180 ? 1 : 0;
        
        return `<path d="M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z" fill="${item.color}"/>`;
      }).join('');
      
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`;
    };

    // ========================================
    // PREPARE DATA FOR CHARTS
    // ========================================
    
    const techChartData = Object.values(techStats)
      .sort((a, b) => b.ca - a.ca)
      .map(t => ({ label: t.name, value: t.ca }));

    const universChartData = Object.entries(universStats)
      .sort((a, b) => b[1].ca - a[1].ca)
      .map(([name, data]) => ({ label: name, value: data.ca }));

    const apporteurChartData = Object.values(apporteurStats)
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 10)
      .map(data => ({ label: data.name, value: data.ca }));

    // Top 5 univers colors for donut
    const universColors = ['#0066cc', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
    const universDonutData = Object.entries(universStats)
      .sort((a, b) => b[1].ca - a[1].ca)
      .slice(0, 6)
      .map(([name, data], idx) => ({ label: name, value: data.ca, color: universColors[idx % universColors.length] }));

    // Panier moyen / Facture moyenne
    const panierMoyen = facturesPeriod.length > 0 ? caPeriod / facturesPeriod.length : 0;
    const dossiersMoisFactures = new Set(facturesPeriod.map((f: any) => f.projectId)).size;
    
    // Devis montants
    const totalDevisEnvoyes = devisEnvoyes.reduce((sum: number, d: any) => {
      const ht = d.data?.totalHT || d.totalHT || 0;
      return sum + (parseFloat(ht) || 0);
    }, 0);
    const totalDevisAcceptes = devisAcceptes.reduce((sum: number, d: any) => {
      const ht = d.data?.totalHT || d.totalHT || 0;
      return sum + (parseFloat(ht) || 0);
    }, 0);
    const tauxTransfoMontant = totalDevisEnvoyes > 0 ? (totalDevisAcceptes / totalDevisEnvoyes) * 100 : 0;

    // Recouvrement
    const duClients = facturesPeriod.reduce((sum: number, f: any) => {
      const reste = f.data?.calcReglementsReste || f.calcReglementsReste || 0;
      return sum + (parseFloat(reste) || 0);
    }, 0);
    const tauxRecouvrement = caPeriod > 0 ? ((caPeriod - duClients) / caPeriod) * 100 : 100;

    // ========================================
    // HTML GENERATION - RAPPORT DIRECTION COMPLET
    // ========================================

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'Activité - ${agency.label} - ${monthName} ${year}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 10pt; line-height: 1.4; color: #1f2937; background: #fff; }
    .page { page-break-after: always; padding: 15px 0; min-height: 250mm; }
    .page:last-child { page-break-after: auto; }
    
    /* Cover */
    .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; background: linear-gradient(135deg, #0066cc 0%, #003d7a 100%); color: white; padding: 40px; }
    .cover h1 { font-size: 32pt; margin-bottom: 8px; font-weight: 700; letter-spacing: -0.5px; }
    .cover h2 { font-size: 22pt; font-weight: 400; margin-bottom: 30px; opacity: 0.95; }
    .cover .period { font-size: 18pt; opacity: 0.9; margin-bottom: 20px; background: rgba(255,255,255,0.15); padding: 10px 30px; border-radius: 8px; }
    .cover .date { font-size: 11pt; opacity: 0.7; }
    
    /* Sections */
    .section { margin-bottom: 25px; }
    .section-title { font-size: 14pt; font-weight: 700; color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 6px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
    
    /* KPI Grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi-card { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; padding: 12px; text-align: center; border-left: 3px solid #0066cc; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .kpi-card.success { border-left-color: #22c55e; }
    .kpi-card.warning { border-left-color: #f59e0b; }
    .kpi-card.danger { border-left-color: #ef4444; }
    .kpi-value { font-size: 20pt; font-weight: 700; color: #1f2937; line-height: 1.2; }
    .kpi-label { font-size: 8pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .kpi-trend { font-size: 9pt; margin-top: 4px; font-weight: 500; }
    .kpi-trend.up { color: #22c55e; }
    .kpi-trend.down { color: #ef4444; }
    
    /* Tables */
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9pt; }
    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; color: #374151; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.3px; }
    tr:nth-child(even) { background: #fafafa; }
    .text-right { text-align: right; }
    
    /* Charts container */
    .charts-row { display: flex; gap: 20px; margin: 15px 0; }
    .chart-box { flex: 1; background: #fafafa; border-radius: 8px; padding: 15px; }
    .chart-title { font-size: 10pt; font-weight: 600; color: #374151; margin-bottom: 10px; }
    
    /* Legend */
    .legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
    .legend-item { display: flex; align-items: center; gap: 5px; font-size: 8pt; }
    .legend-dot { width: 10px; height: 10px; border-radius: 2px; }
    
    /* Alerts */
    .alert { padding: 12px 15px; border-radius: 6px; margin: 10px 0; display: flex; align-items: center; gap: 10px; }
    .alert.success { background: #dcfce7; color: #166534; }
    .alert.warning { background: #fef3c7; color: #92400e; }
    .alert.danger { background: #fee2e2; color: #991b1b; }
    
    /* Footer */
    .footer { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
    
    /* Two columns */
    .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  </style>
</head>
<body>
  <!-- COVER PAGE -->
  <div class="page cover">
    <h1>📊 Rapport d'Activité</h1>
    <h2>${escapeHtml(agency.label)}</h2>
    <div class="period">${monthName} ${year}</div>
    <div class="date">Généré le ${generatedAt}</div>
  </div>

  <!-- PAGE 1: SYNTHÈSE DIRIGEANT -->
  ${sections.synthese !== false ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">📊 Synthèse Dirigeant</h2>
      <div class="kpi-grid">
        <div class="kpi-card ${caEvolution >= 0 ? 'success' : 'danger'}">
          <div class="kpi-value">${formatCurr(caPeriod)}</div>
          <div class="kpi-label">CA HT Mois</div>
          <div class="kpi-trend ${caEvolution >= 0 ? 'up' : 'down'}">${evolutionIcon} ${formatPct(Math.abs(caEvolution))} vs M-1</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${nbDossiersCrees}</div>
          <div class="kpi-label">Dossiers Créés</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${intervPeriod.length}</div>
          <div class="kpi-label">Interventions</div>
        </div>
        <div class="kpi-card ${savRate > 5 ? 'warning' : 'success'}">
          <div class="kpi-value">${formatPct(savRate)}</div>
          <div class="kpi-label">Taux SAV</div>
        </div>
      </div>

      <!-- Alertes -->
      ${savRate > 5 ? `<div class="alert warning">⚠️ Taux SAV élevé (${formatPct(savRate)}) - Analyse qualité recommandée</div>` : ''}
      ${caEvolution < -10 ? `<div class="alert danger">⚠️ CA en baisse significative (${formatPct(caEvolution)}) vs mois précédent</div>` : ''}
      ${conversionRate < 30 ? `<div class="alert warning">⚠️ Taux de conversion devis faible (${formatPct(conversionRate)})</div>` : ''}
      ${caEvolution > 10 ? `<div class="alert success">✅ Excellente progression du CA (+${formatPct(caEvolution)})</div>` : ''}
    </div>

    <div class="section">
      <h2 class="section-title">💰 Performance Commerciale</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${formatCurr(panierMoyen)}</div>
          <div class="kpi-label">Facture Moyenne</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${facturesPeriod.length}</div>
          <div class="kpi-label">Factures Émises</div>
        </div>
        <div class="kpi-card ${tauxRecouvrement < 80 ? 'warning' : 'success'}">
          <div class="kpi-value">${formatPct(tauxRecouvrement)}</div>
          <div class="kpi-label">Taux Recouvrement</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${formatCurr(duClients)}</div>
          <div class="kpi-label">Reste à Encaisser</div>
        </div>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- PAGE 2: TECHNICIENS -->
  ${sections.techniciens !== false && Object.keys(techStats).length > 0 ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">👷 Performance Techniciens</h2>
      
      <div class="chart-box" style="margin-bottom: 20px;">
        <div class="chart-title">CA Attribué par Technicien</div>
        ${renderBarChart(techChartData, 8, '#0066cc')}
      </div>

      <table>
        <thead>
          <tr>
            <th>Technicien</th>
            <th class="text-right">CA Attribué</th>
            <th class="text-right">Heures</th>
            <th class="text-right">Interventions</th>
            <th class="text-right">CA/Heure</th>
          </tr>
        </thead>
        <tbody>
          ${Object.values(techStats).sort((a, b) => b.ca - a.ca).map((t: any) => `
          <tr>
            <td><strong>${escapeHtml(t.name)}</strong></td>
            <td class="text-right">${formatCurr(t.ca)}</td>
            <td class="text-right">${t.heures.toFixed(1)}h</td>
            <td class="text-right">${t.interventions}</td>
            <td class="text-right">${formatCurr(t.heures > 0 ? t.ca / t.heures : 0)}/h</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  ` : ''}

  <!-- PAGE 3: UNIVERS -->
  ${sections.univers !== false && Object.keys(universStats).length > 0 ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">🏠 Répartition par Univers</h2>
      
      <div class="charts-row">
        <div class="chart-box" style="flex: 0 0 160px; text-align: center;">
          ${renderDonutChart(universDonutData)}
          <div class="legend" style="justify-content: center; margin-top: 15px;">
            ${universDonutData.map(item => `
              <div class="legend-item">
                <div class="legend-dot" style="background: ${item.color};"></div>
                <span>${escapeHtml(item.label)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="chart-box" style="flex: 1;">
          <div class="chart-title">CA par Univers</div>
          ${renderBarChart(universChartData, 6, '#22c55e')}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Univers</th>
            <th class="text-right">CA HT</th>
            <th class="text-right">Factures</th>
            <th class="text-right">Dossiers</th>
            <th class="text-right">% du CA</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(universStats).sort((a, b) => b[1].ca - a[1].ca).map(([name, data]: [string, any]) => `
          <tr>
            <td><strong>${escapeHtml(name)}</strong></td>
            <td class="text-right">${formatCurr(data.ca)}</td>
            <td class="text-right">${data.factures}</td>
            <td class="text-right">${data.projets.size}</td>
            <td class="text-right">${caPeriod > 0 ? formatPct((data.ca / caPeriod) * 100) : '0%'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  ` : ''}

  <!-- PAGE 4: APPORTEURS -->
  ${sections.apporteurs !== false && Object.keys(apporteurStats).length > 0 ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">🤝 CA par Apporteur</h2>
      
      <div class="chart-box" style="margin-bottom: 20px;">
        <div class="chart-title">Top 10 Apporteurs</div>
        ${renderBarChart(apporteurChartData, 10, '#8b5cf6')}
      </div>

      <table>
        <thead>
          <tr>
            <th>Apporteur</th>
            <th class="text-right">CA HT</th>
            <th class="text-right">Nb Dossiers</th>
            <th class="text-right">% du CA</th>
          </tr>
        </thead>
        <tbody>
          ${Object.values(apporteurStats).sort((a, b) => b.ca - a.ca).slice(0, 15).map((data: any) => `
          <tr>
            <td><strong>${escapeHtml(data.name)}</strong></td>
            <td class="text-right">${formatCurr(data.ca)}</td>
            <td class="text-right">${data.projets.size}</td>
            <td class="text-right">${caPeriod > 0 ? formatPct((data.ca / caPeriod) * 100) : '0%'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  ` : ''}

  <!-- PAGE 5: DEVIS & INTERVENTIONS -->
  ${sections.devis !== false || sections.interventions !== false ? `
  <div class="page">
    ${sections.devis !== false ? `
    <div class="section">
      <h2 class="section-title">📝 Pipeline Devis</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${devisPeriod.length}</div>
          <div class="kpi-label">Devis Créés</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${devisEnvoyes.length}</div>
          <div class="kpi-label">Devis Envoyés</div>
          <div class="kpi-trend">${formatCurr(totalDevisEnvoyes)}</div>
        </div>
        <div class="kpi-card ${conversionRate >= 40 ? 'success' : conversionRate < 25 ? 'warning' : ''}">
          <div class="kpi-value">${devisAcceptes.length}</div>
          <div class="kpi-label">Devis Acceptés</div>
          <div class="kpi-trend">${formatCurr(totalDevisAcceptes)}</div>
        </div>
        <div class="kpi-card ${conversionRate >= 40 ? 'success' : conversionRate < 25 ? 'warning' : ''}">
          <div class="kpi-value">${formatPct(conversionRate)}</div>
          <div class="kpi-label">Taux Conversion (Nb)</div>
          <div class="kpi-trend">${formatPct(tauxTransfoMontant)} en montant</div>
        </div>
      </div>
    </div>
    ` : ''}

    ${sections.interventions !== false ? `
    <div class="section">
      <h2 class="section-title">🔧 Activité Interventions</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${intervPeriod.length}</div>
          <div class="kpi-label">Total Interventions</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${intervPeriod.filter((i: any) => isProductiveIntervention(i)).length}</div>
          <div class="kpi-label">Interventions Productives</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${intervPeriod.filter((i: any) => isRTIntervention(i)).length}</div>
          <div class="kpi-label">Relevés Techniques</div>
        </div>
        <div class="kpi-card ${savRate > 5 ? 'warning' : 'success'}">
          <div class="kpi-value">${projectsAvecSAV.size}</div>
          <div class="kpi-label">Dossiers SAV</div>
          <div class="kpi-trend">${formatPct(savRate)} du total</div>
        </div>
      </div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <!-- NOTE PERSONNALISÉE -->
  ${reportSettings.custom_note ? `
  <div class="section" style="margin-top: 30px;">
    <h2 class="section-title">📝 Note de la Direction</h2>
    <div style="background: #f8fafc; border-left: 4px solid #0066cc; padding: 15px 20px; border-radius: 0 8px 8px 0; font-style: italic;">
      ${escapeHtml(reportSettings.custom_note)}
    </div>
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <p><strong>HelpConfort Services</strong> • Rapport d'Activité Mensuel</p>
    <p>${escapeHtml(agency.label)} • ${monthName} ${year}</p>
    <p style="margin-top: 5px;">© ${year} - Document confidentiel - Tous droits réservés</p>
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

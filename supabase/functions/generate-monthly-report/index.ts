import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { errorResponse, successResponse, authError, validationError } from '../_shared/error.ts';

interface ReportRequest {
  agencySlug: string;
  month: number;
  year: number;
  preview?: boolean;
}

interface ReportSettings {
  enabled_sections: Record<string, boolean>;
  comparison_period: 'month' | 'year' | 'both';
  ca_format: 'euro' | 'kilo';
  custom_note?: string;
}

interface MetricsSnapshot {
  ca: {
    period: number;
    previousMonth: number;
    previousYear: number;
    evolution: number;
    byUniverse: Array<{ name: string; value: number; percentage: number }>;
    byApporteur: Array<{ name: string; value: number; type: string }>;
  };
  techniciens: Array<{
    name: string;
    ca: number;
    interventions: number;
    savCount: number;
    avgTicket: number;
  }>;
  devis: {
    count: number;
    amount: number;
    acceptedCount: number;
    acceptedAmount: number;
    conversionRate: number;
  };
  interventions: {
    count: number;
    byType: Record<string, number>;
  };
  sav: {
    count: number;
    rate: number;
    cost: number;
  };
  recouvrement: {
    encaisse: number;
    enCours: number;
    tauxRecouvrement: number;
    retards: number;
  };
  actions: {
    aFacturer: number;
    devisARelancer: number;
    dossiersEnRetard: number;
  };
}

function getMonthDates(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function getPreviousMonthDates(month: number, year: number): { start: Date; end: Date } {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return getMonthDates(prevMonth, prevYear);
}

function getPreviousYearDates(month: number, year: number): { start: Date; end: Date } {
  return getMonthDates(month, year - 1);
}

function formatCurrency(amount: number, format: 'euro' | 'kilo'): string {
  if (format === 'kilo') {
    return `${(amount / 1000).toFixed(1)} k€`;
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function parseDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function isInPeriod(date: Date | null, start: Date, end: Date): boolean {
  if (!date) return false;
  return date >= start && date <= end;
}

async function fetchApogeeData(apiBaseUrl: string, apiKey: string) {
  const fetchJson = async (endpoint: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    } catch {
      return [];
    }
  };

  const [factures, interventions, projects, clients, devis, users] = await Promise.all([
    fetchJson('apiGetFactures'),
    fetchJson('apiGetInterventions'),
    fetchJson('apiGetProjects'),
    fetchJson('apiGetClients'),
    fetchJson('apiGetDevis'),
    fetchJson('apiGetUsers'),
  ]);

  return { factures, interventions, projects, clients, devis, users };
}

function calculateMetrics(
  data: Awaited<ReturnType<typeof fetchApogeeData>>,
  month: number,
  year: number,
  _settings: ReportSettings
): MetricsSnapshot {
  const { factures, interventions, projects, clients, devis, users } = data;
  const { start, end } = getMonthDates(month, year);
  const prevMonth = getPreviousMonthDates(month, year);
  const prevYear = getPreviousYearDates(month, year);

  const clientMap = new Map(clients.map((c: any) => [c.id, c]));
  const projectMap = new Map(projects.map((p: any) => [p.id, p]));
  const userMap = new Map(users.map((u: any) => [u.id, u]));

  // Calculate invoice totals
  const calculateInvoiceTotal = (invoice: any): number => {
    if (invoice.data?.totalHT) return parseFloat(invoice.data.totalHT) || 0;
    if (!invoice.items || !Array.isArray(invoice.items)) return 0;
    return invoice.items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.totalHt || item.totalHT || 0));
    }, 0);
  };

  // Filter invoices by period
  const filterFactures = (s: Date, e: Date) => factures.filter((f: any) => {
    if (f.data?.isInit === true) return false;
    if (f.type === 'Avoir' || f.isCreditNote === true) return false;
    const factureDate = parseDate(f.dateReelle || f.date);
    return isInPeriod(factureDate, s, e);
  });

  const facturesPeriod = filterFactures(start, end);
  const facturesPrevMonth = filterFactures(prevMonth.start, prevMonth.end);
  const facturesPrevYear = filterFactures(prevYear.start, prevYear.end);

  const caPeriod = facturesPeriod.reduce((sum: number, f: any) => sum + calculateInvoiceTotal(f), 0);
  const caPrevMonth = facturesPrevMonth.reduce((sum: number, f: any) => sum + calculateInvoiceTotal(f), 0);
  const caPrevYear = facturesPrevYear.reduce((sum: number, f: any) => sum + calculateInvoiceTotal(f), 0);

  // CA by Universe
  const caByUniverse: Record<string, number> = {};
  facturesPeriod.forEach((f: any) => {
    const project = projectMap.get(f.projectId);
    const universe = project?.data?.universes?.[0] || project?.universe || 'Non défini';
    caByUniverse[universe] = (caByUniverse[universe] || 0) + calculateInvoiceTotal(f);
  });
  const totalCA = caPeriod || 1;
  const universeData = Object.entries(caByUniverse)
    .map(([name, value]) => ({ name, value, percentage: (value / totalCA) * 100 }))
    .sort((a, b) => b.value - a.value);

  // CA by Apporteur
  const caByApporteur: Record<string, { value: number; type: string }> = {};
  facturesPeriod.forEach((f: any) => {
    const project = projectMap.get(f.projectId);
    if (project?.data?.commanditaireId) {
      const client = clientMap.get(project.data.commanditaireId);
      if (client) {
        const name = client.label || client.name || `Client ${project.data.commanditaireId}`;
        if (!caByApporteur[name]) {
          caByApporteur[name] = { value: 0, type: client.typeClient || 'Autre' };
        }
        caByApporteur[name].value += calculateInvoiceTotal(f);
      }
    }
  });
  const apporteurData = Object.entries(caByApporteur)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Technicians
  const techData: Record<string, { ca: number; interventions: number; savCount: number }> = {};
  const intervPeriod = interventions.filter((i: any) => {
    const d = parseDate(i.date || i.dateDebut);
    return isInPeriod(d, start, end);
  });

  intervPeriod.forEach((interv: any) => {
    const projectId = interv.projectId;
    const projectInvoices = facturesPeriod.filter((f: any) => f.projectId === projectId);
    const projectCA = projectInvoices.reduce((sum: number, f: any) => sum + calculateInvoiceTotal(f), 0);

    const techIds: string[] = [];
    if (interv.userId) techIds.push(interv.userId);
    if (interv.data?.visites?.[0]?.usersIds) techIds.push(...interv.data.visites[0].usersIds);
    const uniqueTechIds = [...new Set(techIds)];
    const caPerTech = uniqueTechIds.length > 0 ? projectCA / uniqueTechIds.length : 0;

    const isSAV = (interv.type2 || '').toLowerCase() === 'sav' ||
                  interv.data?.visites?.some((v: any) => (v.type2 || '').toLowerCase() === 'sav');

    uniqueTechIds.forEach(techId => {
      if (!techData[techId]) {
        techData[techId] = { ca: 0, interventions: 0, savCount: 0 };
      }
      techData[techId].ca += caPerTech;
      techData[techId].interventions += 1;
      if (isSAV) techData[techId].savCount += 1;
    });
  });

  const techniciens = Object.entries(techData)
    .map(([id, data]) => {
      const user = userMap.get(id);
      return {
        name: user?.label || user?.name || `Tech ${id}`,
        ca: data.ca,
        interventions: data.interventions,
        savCount: data.savCount,
        avgTicket: data.interventions > 0 ? data.ca / data.interventions : 0,
      };
    })
    .sort((a, b) => b.ca - a.ca);

  // Devis
  const devisPeriod = devis.filter((d: any) => {
    const rawDate = d.dateReelle || d.date;
    return isInPeriod(parseDate(rawDate), start, end);
  });
  const devisEnvoyes = devisPeriod.filter((d: any) => (d.state || '').toLowerCase() !== 'draft');
  const devisAcceptes = devisEnvoyes.filter((d: any) => (d.state || '').toLowerCase() === 'invoice');
  const devisAmount = devisPeriod.reduce((sum: number, d: any) => sum + (parseFloat(d.totalHT || d.data?.totalHT || 0)), 0);
  const devisAcceptedAmount = devisAcceptes.reduce((sum: number, d: any) => sum + (parseFloat(d.totalHT || d.data?.totalHT || 0)), 0);

  // SAV
  const projectsFactures = new Set(facturesPeriod.map((f: any) => f.projectId));
  const projectsAvecSAV = new Set<string>();
  intervPeriod.forEach((interv: any) => {
    if (!projectsFactures.has(interv.projectId)) return;
    const isSAV = (interv.type2 || '').toLowerCase() === 'sav';
    if (isSAV) projectsAvecSAV.add(interv.projectId);
  });
  const savRate = projectsFactures.size > 0 ? (projectsAvecSAV.size / projectsFactures.size) * 100 : 0;

  // Recouvrement
  const encaisse = facturesPeriod.reduce((sum: number, f: any) => {
    const total = calculateInvoiceTotal(f);
    const reste = parseFloat(f.data?.calcReglementsReste || f.calcReglementsReste || 0);
    return sum + (total - reste);
  }, 0);
  const enCours = caPeriod - encaisse;

  // Actions
  const closedStatuses = ['terminé', 'facturé', 'archivé', 'annulé', 'closed', 'archived', 'cancelled'];
  const aFacturer = projects.filter((p: any) => {
    const status = (p.statut || p.status || '').toLowerCase();
    return status === 'terminé' || status === 'done';
  }).length;

  const devisARelancer = devisPeriod.filter((d: any) => {
    const state = (d.state || '').toLowerCase();
    const dateDevis = parseDate(d.dateReelle || d.date);
    if (!dateDevis) return false;
    const daysSince = Math.floor((Date.now() - dateDevis.getTime()) / (1000 * 60 * 60 * 24));
    return state !== 'draft' && state !== 'invoice' && state !== 'cancelled' && daysSince > 7;
  }).length;

  return {
    ca: {
      period: caPeriod,
      previousMonth: caPrevMonth,
      previousYear: caPrevYear,
      evolution: caPrevMonth > 0 ? ((caPeriod - caPrevMonth) / caPrevMonth) * 100 : 0,
      byUniverse: universeData,
      byApporteur: apporteurData,
    },
    techniciens,
    devis: {
      count: devisPeriod.length,
      amount: devisAmount,
      acceptedCount: devisAcceptes.length,
      acceptedAmount: devisAcceptedAmount,
      conversionRate: devisEnvoyes.length > 0 ? (devisAcceptes.length / devisEnvoyes.length) * 100 : 0,
    },
    interventions: {
      count: intervPeriod.length,
      byType: {},
    },
    sav: {
      count: projectsAvecSAV.size,
      rate: savRate,
      cost: 0,
    },
    recouvrement: {
      encaisse,
      enCours,
      tauxRecouvrement: caPeriod > 0 ? (encaisse / caPeriod) * 100 : 0,
      retards: 0,
    },
    actions: {
      aFacturer,
      devisARelancer,
      dossiersEnRetard: 0,
    },
  };
}

function generateReportHTML(
  metrics: MetricsSnapshot,
  settings: ReportSettings,
  agencyLabel: string,
  month: number,
  year: number
): string {
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const monthName = monthNames[month - 1];
  const formatCurr = (n: number) => formatCurrency(n, settings.ca_format);
  const formatPct = (n: number) => `${n.toFixed(1)}%`;
  const sections = settings.enabled_sections;

  const evolutionIcon = metrics.ca.evolution >= 0 ? '📈' : '📉';
  const evolutionColor = metrics.ca.evolution >= 0 ? '#22c55e' : '#ef4444';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'Activité - ${monthName} ${year}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      font-size: 11pt; 
      line-height: 1.5; 
      color: #1f2937; 
      background: #fff;
    }
    .page { page-break-after: always; padding: 20px; }
    .page:last-child { page-break-after: auto; }
    
    /* Cover Page */
    .cover { 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center; 
      min-height: 100vh; 
      text-align: center;
      background: linear-gradient(135deg, #0066cc 0%, #003d7a 100%);
      color: white;
    }
    .cover img { max-width: 300px; margin-bottom: 40px; }
    .cover h1 { font-size: 36pt; margin-bottom: 10px; font-weight: 700; }
    .cover h2 { font-size: 24pt; font-weight: 400; margin-bottom: 30px; }
    .cover .period { font-size: 18pt; opacity: 0.9; margin-bottom: 20px; }
    .cover .date { font-size: 12pt; opacity: 0.7; }
    
    /* Section Styles */
    .section { margin-bottom: 30px; }
    .section-title { 
      font-size: 16pt; 
      font-weight: 700; 
      color: #0066cc; 
      border-bottom: 2px solid #0066cc; 
      padding-bottom: 8px; 
      margin-bottom: 20px;
    }
    
    /* KPI Cards */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
    .kpi-card { 
      background: #f8fafc; 
      border-radius: 8px; 
      padding: 15px; 
      text-align: center;
      border-left: 4px solid #0066cc;
    }
    .kpi-value { font-size: 24pt; font-weight: 700; color: #1f2937; }
    .kpi-label { font-size: 9pt; color: #6b7280; text-transform: uppercase; }
    .kpi-trend { font-size: 10pt; margin-top: 5px; }
    .trend-up { color: #22c55e; }
    .trend-down { color: #ef4444; }
    
    /* Tables */
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; color: #374151; font-size: 10pt; }
    tr:nth-child(even) { background: #f9fafb; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    
    /* Charts placeholder */
    .chart-placeholder { 
      background: #f3f4f6; 
      border-radius: 8px; 
      padding: 30px; 
      text-align: center; 
      color: #6b7280;
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* Bar Chart Simple */
    .bar-chart { margin: 20px 0; }
    .bar-item { display: flex; align-items: center; margin: 8px 0; }
    .bar-label { width: 150px; font-size: 10pt; color: #374151; }
    .bar-container { flex: 1; height: 24px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: linear-gradient(90deg, #0066cc, #0099ff); border-radius: 4px; }
    .bar-value { width: 100px; text-align: right; font-weight: 600; font-size: 10pt; }
    
    /* Alerts */
    .alert { 
      padding: 15px; 
      border-radius: 8px; 
      margin: 15px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .alert-warning { background: #fef3c7; border-left: 4px solid #f59e0b; }
    .alert-success { background: #dcfce7; border-left: 4px solid #22c55e; }
    .alert-danger { background: #fee2e2; border-left: 4px solid #ef4444; }
    
    /* Footer */
    .footer { 
      text-align: center; 
      font-size: 9pt; 
      color: #9ca3af; 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <!-- Page de Garde -->
  <div class="page cover">
    <img src="https://helpconfort.services/images/helpconfort-signature.jpg" alt="HelpConfort" />
    <h1>Rapport d'Activité</h1>
    <h2>${agencyLabel}</h2>
    <div class="period">${monthName} ${year}</div>
    <div class="date">Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
  </div>

  <!-- Synthèse Dirigeant -->
  ${sections.synthese !== false ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">📊 Synthèse Dirigeant</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${formatCurr(metrics.ca.period)}</div>
          <div class="kpi-label">CA HT Mois</div>
          <div class="kpi-trend" style="color: ${evolutionColor}">
            ${evolutionIcon} ${formatPct(Math.abs(metrics.ca.evolution))} vs M-1
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${metrics.interventions.count}</div>
          <div class="kpi-label">Interventions</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${metrics.devis.count}</div>
          <div class="kpi-label">Devis Émis</div>
          <div class="kpi-trend">${formatPct(metrics.devis.conversionRate)} conversion</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${formatPct(metrics.sav.rate)}</div>
          <div class="kpi-label">Taux SAV</div>
        </div>
      </div>
      
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${metrics.techniciens.length}</div>
          <div class="kpi-label">Techniciens Actifs</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${formatPct(metrics.recouvrement.tauxRecouvrement)}</div>
          <div class="kpi-label">Taux Recouvrement</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${metrics.actions.aFacturer}</div>
          <div class="kpi-label">À Facturer</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${metrics.actions.devisARelancer}</div>
          <div class="kpi-label">Devis à Relancer</div>
        </div>
      </div>

      ${metrics.actions.aFacturer > 5 || metrics.actions.devisARelancer > 5 ? `
      <div class="alert alert-warning">
        ⚠️ <strong>Attention:</strong> ${metrics.actions.aFacturer} dossier(s) à facturer et ${metrics.actions.devisARelancer} devis à relancer
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  <!-- Performance CA -->
  ${sections.ca !== false ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">💰 Performance Chiffre d'Affaires</h2>
      
      <table>
        <tr>
          <th>Période</th>
          <th class="text-right">CA HT</th>
          <th class="text-right">Évolution</th>
        </tr>
        <tr>
          <td><strong>${monthName} ${year}</strong></td>
          <td class="text-right"><strong>${formatCurr(metrics.ca.period)}</strong></td>
          <td class="text-right">-</td>
        </tr>
        <tr>
          <td>${monthNames[month === 1 ? 11 : month - 2]} ${month === 1 ? year - 1 : year}</td>
          <td class="text-right">${formatCurr(metrics.ca.previousMonth)}</td>
          <td class="text-right" style="color: ${evolutionColor}">${formatPct(metrics.ca.evolution)}</td>
        </tr>
        <tr>
          <td>${monthName} ${year - 1}</td>
          <td class="text-right">${formatCurr(metrics.ca.previousYear)}</td>
          <td class="text-right" style="color: ${metrics.ca.previousYear > 0 ? (metrics.ca.period >= metrics.ca.previousYear ? '#22c55e' : '#ef4444') : '#6b7280'}">
            ${metrics.ca.previousYear > 0 ? formatPct(((metrics.ca.period - metrics.ca.previousYear) / metrics.ca.previousYear) * 100) : 'N/A'}
          </td>
        </tr>
      </table>
    </div>
  </div>
  ` : ''}

  <!-- Univers -->
  ${sections.univers !== false ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">🎯 Répartition par Univers</h2>
      <div class="bar-chart">
        ${metrics.ca.byUniverse.slice(0, 8).map(u => `
        <div class="bar-item">
          <div class="bar-label">${u.name}</div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${Math.min(u.percentage, 100)}%"></div>
          </div>
          <div class="bar-value">${formatCurr(u.value)}</div>
        </div>
        `).join('')}
      </div>
      
      <table>
        <tr>
          <th>Univers</th>
          <th class="text-right">CA HT</th>
          <th class="text-right">Part</th>
        </tr>
        ${metrics.ca.byUniverse.map(u => `
        <tr>
          <td>${u.name}</td>
          <td class="text-right">${formatCurr(u.value)}</td>
          <td class="text-right">${formatPct(u.percentage)}</td>
        </tr>
        `).join('')}
      </table>
    </div>
  </div>
  ` : ''}

  <!-- Techniciens -->
  ${sections.techniciens !== false ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">👷 Performance Techniciens</h2>
      <table>
        <tr>
          <th>#</th>
          <th>Technicien</th>
          <th class="text-right">CA HT</th>
          <th class="text-center">Interv.</th>
          <th class="text-right">Panier Moy.</th>
          <th class="text-center">SAV</th>
        </tr>
        ${metrics.techniciens.slice(0, 15).map((t, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${t.name}</td>
          <td class="text-right">${formatCurr(t.ca)}</td>
          <td class="text-center">${t.interventions}</td>
          <td class="text-right">${formatCurr(t.avgTicket)}</td>
          <td class="text-center">${t.savCount}</td>
        </tr>
        `).join('')}
      </table>
      
      ${metrics.techniciens.length > 0 ? `
      <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px;">
        <strong>Moyenne CA/technicien:</strong> ${formatCurr(metrics.techniciens.reduce((s, t) => s + t.ca, 0) / metrics.techniciens.length)}
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  <!-- Apporteurs -->
  ${sections.apporteurs !== false ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">🤝 Top 10 Apporteurs</h2>
      <table>
        <tr>
          <th>#</th>
          <th>Apporteur</th>
          <th>Type</th>
          <th class="text-right">CA HT</th>
        </tr>
        ${metrics.ca.byApporteur.map((a, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${a.name}</td>
          <td>${a.type}</td>
          <td class="text-right">${formatCurr(a.value)}</td>
        </tr>
        `).join('')}
      </table>
    </div>
  </div>
  ` : ''}

  <!-- Devis -->
  ${sections.devis !== false ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">📝 Pipeline Devis</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${metrics.devis.count}</div>
          <div class="kpi-label">Devis Émis</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${formatCurr(metrics.devis.amount)}</div>
          <div class="kpi-label">Montant Total</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${metrics.devis.acceptedCount}</div>
          <div class="kpi-label">Devis Acceptés</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${formatPct(metrics.devis.conversionRate)}</div>
          <div class="kpi-label">Taux Conversion</div>
        </div>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- SAV -->
  ${sections.sav !== false ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">🔧 Qualité & SAV</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${metrics.sav.count}</div>
          <div class="kpi-label">Dossiers SAV</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${formatPct(metrics.sav.rate)}</div>
          <div class="kpi-label">Taux SAV</div>
        </div>
      </div>
      
      ${metrics.sav.rate > 5 ? `
      <div class="alert alert-warning">
        ⚠️ Le taux SAV (${formatPct(metrics.sav.rate)}) est supérieur à l'objectif de 5%
      </div>
      ` : `
      <div class="alert alert-success">
        ✅ Le taux SAV est maîtrisé (objectif < 5%)
      </div>
      `}
    </div>
  </div>
  ` : ''}

  <!-- Recouvrement -->
  ${sections.recouvrement !== false ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">💳 Recouvrement</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${formatCurr(metrics.recouvrement.encaisse)}</div>
          <div class="kpi-label">Encaissé</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${formatCurr(metrics.recouvrement.enCours)}</div>
          <div class="kpi-label">En Cours</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${formatPct(metrics.recouvrement.tauxRecouvrement)}</div>
          <div class="kpi-label">Taux Recouvrement</div>
        </div>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Actions -->
  ${sections.actions !== false ? `
  <div class="page">
    <div class="section">
      <h2 class="section-title">🎯 Actions à Mener</h2>
      
      ${metrics.actions.aFacturer > 0 ? `
      <div class="alert alert-warning">
        📋 <strong>${metrics.actions.aFacturer} dossier(s) terminé(s)</strong> en attente de facturation
      </div>
      ` : ''}
      
      ${metrics.actions.devisARelancer > 0 ? `
      <div class="alert alert-warning">
        📧 <strong>${metrics.actions.devisARelancer} devis</strong> à relancer (envoyés depuis plus de 7 jours)
      </div>
      ` : ''}
      
      ${metrics.actions.aFacturer === 0 && metrics.actions.devisARelancer === 0 ? `
      <div class="alert alert-success">
        ✅ Aucune action urgente à mener
      </div>
      ` : ''}
    </div>
    
    ${settings.custom_note ? `
    <div class="section">
      <h2 class="section-title">📝 Note</h2>
      <p>${settings.custom_note}</p>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <div class="footer">
    <p>Rapport généré automatiquement par HelpConfort Services</p>
    <p>${new Date().toLocaleString('fr-FR')}</p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, authError('En-tête d\'autorisation manquant'));
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return withCors(req, authError('Non autorisé'));
    }

    const body: ReportRequest = await req.json();
    const { agencySlug, month, year, preview = false } = body;

    if (!agencySlug || !month || !year) {
      return withCors(req, validationError('agencySlug, month et year requis'));
    }

    if (month < 1 || month > 12 || year < 2020) {
      return withCors(req, validationError('Mois ou année invalide'));
    }

    console.log(`[generate-monthly-report] Agency: ${agencySlug}, Period: ${month}/${year}, Preview: ${preview}`);

    // Get agency info
    const { data: agency, error: agencyErr } = await supabaseAdmin
      .from('apogee_agencies')
      .select('id, label, slug')
      .eq('slug', agencySlug)
      .single();

    if (agencyErr || !agency) {
      return withCors(req, validationError('Agence non trouvée'));
    }

    // Get report settings (or use defaults)
    const { data: settingsData } = await supabaseAdmin
      .from('report_settings')
      .select('*')
      .eq('agency_id', agency.id)
      .maybeSingle();

    const settings: ReportSettings = {
      enabled_sections: settingsData?.enabled_sections || {
        synthese: true, ca: true, techniciens: true, univers: true,
        apporteurs: true, sav: true, recouvrement: true, devis: true,
        interventions: true, actions: true
      },
      comparison_period: settingsData?.comparison_period || 'both',
      ca_format: settingsData?.ca_format || 'euro',
      custom_note: settingsData?.custom_note,
    };

    // Fetch Apogee data
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    const apiBaseUrl = `https://${agencySlug}.hc-apogee.fr/api/`;
    
    console.log(`[generate-monthly-report] Fetching Apogee data from ${apiBaseUrl}`);
    const apogeeData = await fetchApogeeData(apiBaseUrl, apiKey || '');

    // Calculate metrics
    const metrics = calculateMetrics(apogeeData, month, year, settings);
    console.log(`[generate-monthly-report] Metrics calculated: CA=${metrics.ca.period}`);

    // Generate HTML
    const html = generateReportHTML(metrics, settings, agency.label, month, year);

    if (preview) {
      // Return HTML directly for preview
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          ...getCorsHeaders(req.headers.get('origin') || ''),
        },
      });
    }

    // Convert to PDF using Gotenberg (if available) or return HTML
    const gotenbergUrl = Deno.env.get('GOTENBERG_URL');
    let pdfBuffer: ArrayBuffer | null = null;

    if (gotenbergUrl) {
      try {
        const formData = new FormData();
        formData.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
        formData.append('paperWidth', '8.27');
        formData.append('paperHeight', '11.69');
        formData.append('marginTop', '0.4');
        formData.append('marginBottom', '0.4');
        formData.append('marginLeft', '0.4');
        formData.append('marginRight', '0.4');

        const pdfRes = await fetch(`${gotenbergUrl}/forms/chromium/convert/html`, {
          method: 'POST',
          body: formData,
        });

        if (pdfRes.ok) {
          pdfBuffer = await pdfRes.arrayBuffer();
          console.log(`[generate-monthly-report] PDF generated: ${pdfBuffer.byteLength} bytes`);
        }
      } catch (e) {
        console.error('[generate-monthly-report] Gotenberg error:', e);
      }
    }

    // Upload to storage
    const monthStr = month.toString().padStart(2, '0');
    const fileName = `rapport-${agencySlug}-${year}-${monthStr}.pdf`;
    const filePath = `${agencySlug}/${year}/${fileName}`;

    if (pdfBuffer) {
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('monthly-reports')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadErr) {
        console.error('[generate-monthly-report] Upload error:', uploadErr);
      }
    }

    // Upsert report record
    const { error: upsertErr } = await supabaseAdmin
      .from('monthly_reports')
      .upsert({
        agency_id: agency.id,
        month,
        year,
        file_path: pdfBuffer ? filePath : null,
        file_name: pdfBuffer ? fileName : null,
        file_size: pdfBuffer ? pdfBuffer.byteLength : null,
        status: pdfBuffer ? 'completed' : 'failed',
        error_message: pdfBuffer ? null : 'PDF generation not available',
        metrics_snapshot: metrics,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
      }, {
        onConflict: 'agency_id,month,year',
      });

    if (upsertErr) {
      console.error('[generate-monthly-report] Upsert error:', upsertErr);
    }

    return withCors(req, successResponse({
      success: true,
      reportId: agency.id,
      filePath: pdfBuffer ? filePath : null,
      metrics,
      message: pdfBuffer ? 'Rapport généré avec succès' : 'Rapport généré (HTML uniquement, PDF non disponible)',
    }));

  } catch (error) {
    console.error('[generate-monthly-report] Error:', error);
    return withCors(req, errorResponse('REPORT_ERROR', 'Erreur lors de la génération du rapport', error));
  }
});

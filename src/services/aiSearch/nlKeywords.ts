/**
 * StatIA AI Search - Base de mots-clés pondérés étendue (~2000 entrées)
 * Index précompilé pour performance O(1)
 * Source: KEYWORDS_01 → KEYWORDS_05
 */

import type { Keyword, KeywordCategory, KeywordMatch } from './types';

// ═══════════════════════════════════════════════════════════════
// CATÉGORIE MAPPING (normalisation des catégories brutes)
// ═══════════════════════════════════════════════════════════════

const CATEGORY_MAP: Record<string, KeywordCategory> = {
  finance: 'metric',
  recouvrement: 'metric',
  volumes: 'metric',
  ratios: 'metric',
  classements: 'intent',
  tendances: 'metric',
  delais: 'metric',
  activite: 'metric',
  univers: 'univers',
  visu: 'intent',
  analytics: 'metric',
  forecasting: 'metric',
  prediction: 'metric',
  optimisation: 'action',
  modelisation: 'metric',
  data_science: 'metric',
  nlp: 'filter',
  ai_analysis: 'filter',
  risk_analysis: 'metric',
  business_analysis: 'metric',
  operationnel: 'metric',
  qualite: 'metric',
  clientele: 'dimension',
  pilotage: 'metric',
  gestion: 'action',
  reseau: 'dimension',
  agence: 'dimension',
  segmentation: 'intent',
  region: 'dimension',
  metric: 'metric',
  dimension: 'dimension',
  intent: 'intent',
  period: 'period',
  action: 'action',
  doc: 'doc',
  filter: 'filter',
};

// ═══════════════════════════════════════════════════════════════
// RAW KEYWORDS - Intégration des 5 fichiers (~2000 entrées)
// ═══════════════════════════════════════════════════════════════

const RAW_KEYWORDS_DATA = `
finance; chiffre affaires; 5
finance; ca; 5
finance; ca ht; 5
finance; ca ttc; 5
finance; revenue; 5
finance; revenus; 5
finance; sales; 4
finance; ventes; 4
finance; vente; 4
finance; turnover; 4
finance; gross income; 5
finance; net income; 5
finance; resultat net; 5
finance; resultat brut; 5
finance; profit; 5
finance; profits; 5
finance; marge brute; 5
finance; marge nette; 5
finance; margin; 5
finance; gross margin; 5
finance; net margin; 5
finance; financial performance; 4
finance; cost; 4
finance; costs; 4
finance; cout; 4
finance; couts; 4
finance; charge; 4
finance; charges; 4
finance; operating cost; 4
finance; operating expenses; 4
finance; opex; 4
finance; capex; 4
finance; amortissement; 3
finance; depreciation; 3
finance; cash flow; 5
finance; cashflow; 5
finance; tresorerie; 5
finance; liquidity; 4
finance; financial ratio; 4
finance; rentabilite; 5
finance; operating profit; 5
finance; ebit; 5
finance; ebitda; 5
finance; kpi financier; 5
finance; variation ca; 4
finance; croissance ca; 4
finance; loss; 4
finance; pertes; 4
finance; deficit; 4
finance; balance sheet; 3
finance; bilan; 3
finance; accounting; 2
finance; charge fixe; 4
finance; charge variable; 4
finance; cout moyen; 4
finance; cout total; 4
finance; forecast ca; 4
finance; financial forecast; 4
finance; budget; 4
finance; budget previsionnel; 4
finance; provision; 3
finance; provisions; 3
finance; encaissement; 5
finance; credit control; 4
finance; forecast revenue; 4
finance; revenue projection; 4
finance; long term forecast; 3
finance; short term forecast; 3
finance; rolling forecast; 3
finance; financial planning; 3
finance; plan financier; 3
finance; budget annuel; 3
finance; budget mensuel; 3
finance; depreciation schedule; 2
finance; amortissement annuel; 2
finance; amortissement mensuel; 2
finance; marge operationnelle; 4
finance; operating margin; 4
finance; net profit margin; 4
finance; taux marge nette; 4
finance; taux marge brute; 4
finance; marge par univers; 4
finance; revenue per technician; 5
finance; revenu technicien; 5
finance; revenu par apporteur; 5
finance; revenu univers; 5
finance; panier moyen facture; 5
finance; panier moyen intervention; 5
finance; valeur moyenne dossier; 5
finance; cash burn; 3
finance; burn rate; 3
finance; financial risk; 3
finance; audit financier; 3
finance; irregularite facture; 3
finance; anomalie facture; 3
finance; variation marge; 3
finance; balance des paiements; 2
finance; incoming payments; 3
finance; outgoing payments; 3
finance; rentability index; 3
finance; taux rentabilite; 4
finance; variation financement; 3
finance; cash forecasting; 4
finance; liquidity ratio; 3
finance; solvency ratio; 3
finance; return on investment; 4
finance; roi; 4
finance; payback period; 3
finance; revenue efficiency; 4
finance; cost efficiency; 4
finance; budget variance; 3
finance; variance analysis; 3
finance; capital allocation; 3
finance; resource allocation; 3
finance; net operating income; 4
finance; operating revenue; 4
finance; cost deviation; 3
finance; yield; 3
finance; profit factor; 3
finance; capital turnover; 3
finance; financial drift; 3
finance; drift analysis; 3
finance; transaction volume; 3
finance; revenue flow; 3
finance; margin flow; 3
finance; cost flow; 3
finance; cash position; 4
finance; treasury balance; 4
finance; revenue simulator; 2
finance; finance simulator; 2
finance; ca simulator; 2
finance; scenario financier; 3
finance; revenue anomaly; 3
finance; ca anomaly; 3
finance; invoice anomaly; 3
finance; margin anomaly; 3
finance; cost anomaly; 3
finance; fraud detection; 2
finance; outlier detection; 2
finance; liquidation; 2
finance; revenue scoring; 3
finance; revenue prediction interval; 3
finance; financial projection model; 3
finance; cash projection model; 3
finance; expense forecast; 3
finance; cost projection; 3
finance; revenue curve; 3
finance; margin curve; 3
finance; financial planning curve; 3
finance; profit simulation; 3
finance; margin simulation; 3
finance; financial outlier; 3
finance; revenue deviation; 3
finance; margin deviation; 3
finance; financial drift alert; 3
finance; cash deviation; 3
finance; revenue seasonality; 3
finance; margin seasonality; 3
finance; seasonal volatility; 3
finance; seasonal variance; 3
finance; financial anomaly; 3
finance; loss projection; 3
finance; financial tension; 2
finance; tension budgetaire; 2
finance; depassement budget; 2
finance; budget drift; 2
finance; weekly cashflow; 2
finance; monthly cashflow; 2
finance; quarterly cashflow; 2
finance; annual cashflow; 2
finance; operational cashflow; 3
finance; free cashflow; 3
finance; cashflow volatility; 2
finance; financial benchmark; 2
finance; benchmark ca; 2
finance; benchmark marge; 2
finance; benchmark finance; 2
finance; asset allocation; 2
finance; revenue pillars; 2
finance; cost pillars; 2
finance; financial engine; 2
finance; ca engine; 2
finance; margin engine; 2
finance; pricing model; 2
finance; price elasticity; 2
finance; client profitability; 3
finance; apporteur profitability; 3
finance; flux financier; 3
finance; capacite financiere; 3
finance; financial exposure; 3
finance; risk exposure; 3
finance; exposure mapping; 3
finance; capital risk; 3
finance; debt ratio; 3
finance; leverage ratio; 3
finance; interest coverage ratio; 3
finance; solvency mapping; 3
finance; liquidity mapping; 3
finance; liquidity stress; 3
finance; revenue dependency; 2
finance; margin dependency; 2
finance; cost dependency; 2
finance; weighted revenue; 3
finance; weighted margin; 3
finance; weighted profit; 3
finance; cash health; 3
finance; monthly burn; 3
finance; burn projection; 3
finance; financial horizon; 2
finance; budget horizon; 2
finance; ca horizon; 2
finance; financial uncertainty; 2
finance; uncertainty model; 2
finance; revenue uncertainty; 2
finance; margin uncertainty; 2
finance; margin saturation; 2
finance; saturation finance; 1
finance; outlier finance; 2
finance; weak revenue; 2
finance; strong revenue; 2
finance; heavy margin; 1
finance; revenue cluster; 2
finance; margin cluster; 2
finance; financial pivot; 2
finance; scenario pivot; 2
finance; economic pivot; 2
finance; financial insight; 3
finance; revenue insight; 3
finance; margin insight; 3
finance; scenario insight; 3
finance; financial correction; 2
finance; revenue correction; 2
finance; margin correction; 2
recouvrement; recouvrement; 5
recouvrement; taux recouvrement; 5
recouvrement; recovery rate; 5
recouvrement; impaye; 5
recouvrement; impayes; 5
recouvrement; unpaid; 5
recouvrement; unpaid invoices; 5
recouvrement; facture impayee; 5
recouvrement; relance; 4
recouvrement; late payment; 4
recouvrement; retard paiement; 4
recouvrement; overdue invoice; 5
recouvrement; overdue; 4
recouvrement; creance; 5
recouvrement; creances; 5
recouvrement; debt; 5
recouvrement; debtor; 5
recouvrement; debiteur; 5
recouvrement; settlement; 4
recouvrement; paiement en retard; 4
recouvrement; late fee; 3
recouvrement; echeance depassee; 4
recouvrement; echeancier; 3
recouvrement; plan recouvrement; 4
recouvrement; financial recovery; 4
recouvrement; payment recovery; 4
recouvrement; collection process; 4
recouvrement; taux relance; 4
recouvrement; relance automatique; 3
recouvrement; procedure recouvrement; 3
recouvrement; recouvrement soft; 3
recouvrement; recouvrement hard; 3
recouvrement; dispute facture; 2
recouvrement; facture litigieuse; 2
recouvrement; manual recovery; 3
recouvrement; automated recovery; 3
recouvrement; recovery workflow; 3
recouvrement; aging balance; 4
recouvrement; balance agee; 4
recouvrement; outstanding balance; 4
recouvrement; montant impaye; 5
recouvrement; solde impaye; 5
recouvrement; facture ouverte; 4
recouvrement; facture en retard; 4
recouvrement; overdue debt; 4
recouvrement; overdue payment; 4
recouvrement; high risk invoice; 3
recouvrement; weak payer; 3
recouvrement; low credit score; 3
recouvrement; solvabilite; 3
recouvrement; remboursement; 3
recouvrement; recouvrement scoring; 3
recouvrement; invoice risk; 3
recouvrement; overdue scoring; 3
recouvrement; aging analysis; 4
recouvrement; payment default; 4
recouvrement; default risk; 4
recouvrement; payment probability; 3
recouvrement; debt analytics; 4
recouvrement; risk invoice; 4
recouvrement; collection scoring; 3
recouvrement; automated reminders; 3
recouvrement; intelligent recovery; 3
recouvrement; recouvrement prediction; 3
recouvrement; solvency analysis; 3
recouvrement; solvency score; 3
recouvrement; loan recovery; 2
recouvrement; payment segmentation; 2
recouvrement; collection efficiency; 3
recouvrement; recouvrement efficacite; 3
recouvrement; write off risk; 3
recouvrement; customer debt; 3
recouvrement; debt likelihood; 3
recouvrement; debiteur risque; 3
recouvrement; recouvrement timeline; 3
recouvrement; timeline recovery; 3
recouvrement; debt tracking; 3
recouvrement; open debt; 3
recouvrement; debt flow; 3
recouvrement; overdue flow; 3
recouvrement; overdue mapping; 3
recouvrement; aged balance; 3
recouvrement; 90 days overdue; 3
recouvrement; 60 days overdue; 3
recouvrement; 30 days overdue; 3
recouvrement; recovery curve; 3
recouvrement; recouvrement curve; 3
recouvrement; settlement delay; 3
recouvrement; dispute resolution; 3
recouvrement; collection behavior; 3
recouvrement; customer debtor; 3
recouvrement; payer behaviour; 2
recouvrement; debtor likelihood; 2
recouvrement; high risk payer; 2
recouvrement; recovery prediction; 3
recouvrement; settlement probability; 3
recouvrement; debt segmentation; 2
recouvrement; debt profile; 2
recouvrement; fiscal recovery; 2
recouvrement; cash recovery; 2
recouvrement; overdue risk score; 3
recouvrement; behavior recovery; 2
recouvrement; debt horizon; 2
recouvrement; debtor horizon; 2
recouvrement; risk debtor; 2
recouvrement; slow payer; 2
recouvrement; payment irregularity; 2
recouvrement; debtor irregularity; 2
recouvrement; recovery irregularity; 2
recouvrement; litigation risk; 2
recouvrement; litigation case; 2
recouvrement; dispute analysis; 2
recouvrement; projected recovery; 2
recouvrement; weighted recovery; 2
recouvrement; recovery engine; 2
recouvrement; settlement engine; 2
recouvrement; likelihood to pay; 3
recouvrement; probability to pay; 3
recouvrement; recouvrement saisonnier; 2
volumes; nombre; 4
volumes; nb; 4
volumes; total; 4
volumes; nombre total; 4
volumes; nombre dossiers; 4
volumes; nb dossiers; 4
volumes; nb interventions; 4
volumes; interventions total; 4
volumes; nb devis; 4
volumes; devis total; 4
volumes; nb factures; 4
volumes; factures total; 4
volumes; facturation volume; 4
volumes; volume activite; 4
volumes; workload; 3
volumes; quantite; 3
volumes; totals; 3
volumes; aggregate; 3
volumes; aggregat; 3
volumes; distribution; 3
volumes; repartition; 3
volumes; breakdown; 3
volumes; volumes; 4
volumes; demand volume; 3
volumes; pipeline volume; 3
volumes; ticket volume; 3
volumes; dossier count; 4
volumes; intervention count; 4
volumes; job count; 4
volumes; volume trimestriel; 3
volumes; volume annuel; 3
volumes; volume mensuel; 3
volumes; seasonality; 3
volumes; saisonnalite; 3
volumes; distribution temporelle; 3
volumes; timeline volume; 3
volumes; volume univers; 3
volumes; workload univers; 3
volumes; charge univers; 3
volumes; load distribution; 3
volumes; operational load; 3
volumes; interventions repartition; 3
volumes; task count; 3
volumes; jobs volume; 3
volumes; backlog volume; 3
volumes; backlog; 3
volumes; pending tasks; 3
volumes; pending interventions; 3
volumes; queue size; 3
volumes; ticket inflow; 3
volumes; ticket outflow; 3
volumes; dossier inflow; 3
volumes; flux interventions; 3
volumes; intervention demand; 3
volumes; demand peak; 3
volumes; load peak; 3
volumes; intervention flow; 3
volumes; job flow; 3
volumes; docket flow; 3
volumes; inflow analysis; 3
volumes; outflow analysis; 3
volumes; activity peak; 3
volumes; off peak; 3
volumes; work density; 3
volumes; density index; 3
volumes; intervention density; 3
volumes; flux horaire; 3
volumes; flux journalier; 3
volumes; flux mensuel; 3
volumes; demand seasonality; 3
volumes; intervention seasonality; 3
volumes; job seasonality; 3
volumes; volume plateau; 2
volumes; overload; 2
volumes; underload; 2
volumes; volume analytics; 3
volumes; distribution events; 2
volumes; job clusters; 2
volumes; workload cluster; 2
volumes; cluster volume; 2
volumes; temporal spike; 2
volumes; temporal peak; 2
volumes; event density; 2
volumes; density peak; 2
volumes; hour load; 2
volumes; hour density; 2
volumes; demand index; 2
volumes; job intensity; 2
volumes; flux global; 2
volumes; flux partiel; 2
volumes; flux predictif; 3
volumes; task saturation; 2
volumes; load saturation; 2
volumes; task volatility; 2
volumes; job volatility; 2
volumes; seasonal spike; 2
volumes; coaster curve; 2
volumes; inflow intensity; 2
volumes; outflow intensity; 2
volumes; demand modeling; 2
volumes; intensite mensuelle; 2
volumes; intensite annuelle; 2
volumes; intensite journaliere; 2
volumes; flow analyzer; 2
volumes; volume analyzer; 2
volumes; volume drift; 2
volumes; flux drift; 2
volumes; drift detection volume; 2
volumes; intervention volatility; 2
volumes; workload volatility; 2
volumes; density forecast; 2
volumes; density forecasted; 1
volumes; saturation index; 2
volumes; intervention saturation; 2
volumes; job saturation; 2
volumes; inflow saturation; 2
volumes; outflow saturation; 2
volumes; workload funnel; 2
volumes; intervention funnel; 2
volumes; dossier funnel; 2
volumes; dynamic clustering; 2
volumes; hourly distribution; 2
volumes; half hour distribution; 2
volumes; quarter hour distribution; 1
volumes; slot distribution; 2
volumes; time slot density; 2
ratios; ratio; 4
ratios; ratios; 4
ratios; taux; 5
ratios; taux transformation; 5
ratios; taux transfo; 5
ratios; taux multi visites; 5
ratios; taux marge; 5
ratios; taux facturation; 5
ratios; conversion rate; 5
ratios; closing rate; 5
ratios; average rate; 4
ratios; pourcentage; 4
ratios; percent; 4
ratios; percentage; 4
ratios; kpi technique; 4
ratios; kpi commercial; 4
ratios; kpi performance; 4
ratios; taux croissance; 4
ratios; growth rate; 4
ratios; average basket; 5
ratios; panier moyen; 5
ratios; ticket moyen; 5
ratios; success rate; 4
ratios; performance score; 3
ratios; index; 3
ratios; indice; 3
ratios; metrics; 4
ratios; taux d occupation; 4
ratios; taux occupation; 4
ratios; productivity ratio; 4
ratios; operational ratio; 4
ratios; ratio univers; 4
ratios; efficiency rate; 4
ratios; performance rate; 4
ratios; taux resolution; 4
ratios; resolution rate; 4
ratios; satisfaction rate; 3
ratios; intervention success rate; 4
ratios; closure rate; 4
ratios; taux closure; 4
ratios; adherence rate; 3
ratios; variation taux; 3
ratios; normalized ratio; 2
ratios; weighted ratio; 2
ratios; scoring rate; 2
ratios; kpi weighted; 3
ratios; percent change; 3
ratios; taux variation; 3
ratios; taux solvabilite; 3
ratios; solvency rate; 3
ratios; liquidite ratio; 3
ratios; liquidity rate; 3
ratios; operating ratio; 3
ratios; profitability ratio; 4
ratios; retention rate; 3
ratios; churn rate; 3
ratios; acquisition rate; 3
ratios; revenue per hour; 4
ratios; ca horaire; 4
ratios; cost per intervention; 4
ratios; average cost; 3
ratios; financial leverage; 3
ratios; productivity index; 4
ratios; risk ratio; 3
ratios; contribution margin; 3
ratios; expense ratio; 3
ratios; efficiency score; 3
ratios; taux efficacite; 3
ratios; normalized score; 2
ratios; cycle ratio; 2
ratios; coverage ratio; 3
ratios; ratio effectiveness; 3
ratios; effort ratio; 3
ratios; weighted kpi; 3
ratios; decorrelated ratio; 2
ratios; correlated ratio; 2
ratios; cumulative ratio; 3
ratios; blended ratio; 3
ratios; adjusted ratio; 3
ratios; profitability ratio advanced; 3
ratios; quality ratio; 2
ratios; stability ratio; 2
ratios; dynamic ratio; 2
ratios; ratio of variance; 2
ratios; anomaly ratio; 2
ratios; weighted trend ratio; 2
ratios; composite ratio; 2
ratios; triple ratio; 2
ratios; operational mix; 2
ratios; cost to revenue ratio; 3
ratios; cost to margin ratio; 2
ratios; intervention efficiency index; 3
ratios; apporteur efficiency index; 3
ratios; univers efficiency index; 3
ratios; cycle efficiency; 3
ratios; behavioral ratio; 2
ratios; distribution ratio; 2
ratios; leverage effect; 2
ratios; effect size; 2
ratios; intensity ratio; 2
ratios; business ratio; 2
ratios; anomaly rate; 2
classements; top; 5
classements; top 3; 5
classements; top 5; 5
classements; top 10; 5
classements; meilleur; 5
classements; meilleurs; 5
classements; the best; 5
classements; ranking; 5
classements; classement; 5
classements; leaderboard; 5
classements; performance ranking; 4
classements; classer; 4
classements; rank; 4
classements; rank by revenue; 5
classements; best performer; 5
classements; top performer; 5
classements; classement apporteur; 5
classements; classement technicien; 5
classements; classement univers; 5
classements; ranking univers; 5
classements; ranking tech; 5
classements; classement agence; 5
classements; classement reseau; 5
classements; classement annuel; 5
classements; classement mensuel; 4
classements; best month; 4
classements; best technician; 5
classements; best univers; 5
classements; worst performer; 5
classements; bottom performer; 5
classements; bottom ranking; 5
classements; tier list; 2
classements; best apporteur; 5
classements; best client category; 5
classements; top apporteurs mois; 5
classements; top apporteurs annee; 5
classements; top univers ca; 5
classements; classement categories; 4
classements; ranking univers monthly; 4
classements; ranking univers yearly; 4
classements; global ranking; 4
classements; ranking score; 4
classements; performance ladder; 3
classements; performance tier; 3
classements; top category; 4
classements; best month ranking; 4
classements; worst month ranking; 4
classements; efficiency ranking; 4
classements; reliability ranking; 4
classements; ranked list; 2
classements; ca ranking; 4
classements; technician leaderboard; 4
classements; apporteur leaderboard; 4
classements; univers leaderboard; 4
classements; ranking fluctuation; 2
classements; ranking deviation; 2
classements; ranking alert; 2
classements; ranked univers; 4
classements; ranked apporteurs; 4
classements; top decile; 2
classements; top percentile; 2
classements; top quartile; 2
classements; bottom quartile; 2
classements; quartile ranking; 2
classements; classement valeur; 3
classements; classement qualite; 3
classements; classement satisfaction; 3
classements; classement charge; 2
classements; leaderboard univers q; 2
classements; leaderboard apporteur q; 2
classements; leaderboard technician q; 2
classements; multi ranking; 2
classements; ranking engine; 2
classements; ranking trend; 2
classements; ranking heatmap; 2
classements; ranking weight; 1
classements; ranking algorithm; 1
tendances; evolution; 4
tendances; tendance; 4
tendances; croissance; 4
tendances; croissance ca; 4
tendances; hausse; 4
tendances; baisse; 4
tendances; progression; 4
tendances; trends; 4
tendances; trend; 4
tendances; growth; 4
tendances; decline; 4
tendances; drop; 4
tendances; increase; 4
tendances; forecast; 4
tendances; projection; 4
tendances; projections; 4
tendances; prediction trend; 4
tendances; evolution mensuelle; 4
tendances; mensuel ca; 4
tendances; quarterly trend; 4
tendances; annual trend; 4
tendances; saisonnalite; 3
tendances; saison; 2
tendances; long term trend; 3
tendances; short term trend; 3
tendances; yoy; 3
tendances; year over year; 3
tendances; month over month; 3
tendances; mom; 3
tendances; delta mensuel; 3
tendances; delta annuel; 3
tendances; anomalie; 2
tendances; anomaly; 3
tendances; anomaly detection; 3
tendances; variance; 3
tendances; ecart type; 3
tendances; trend analytics; 4
tendances; trending category; 4
tendances; trending univers; 4
tendances; trending technician; 4
tendances; anomaly shift; 3
tendances; variation trend; 3
tendances; projection curve; 3
tendances; moving average; 4
tendances; ma7; 4
tendances; ma30; 4
tendances; exponential trend; 3
tendances; rolling window; 3
tendances; z-score; 3
tendances; variation detection; 3
tendances; structural break; 2
tendances; trend deviation; 3
tendances; trend alert; 3
tendances; stability trend; 2
tendances; volatility; 3
tendances; time drift; 2
tendances; drift modeling; 2
tendances; macro trend; 2
tendances; micro trend; 2
tendances; global trend; 2
tendances; segmented trend; 2
tendances; phased trend; 2
tendances; rising trend; 2
tendances; falling trend; 2
tendances; stable trend; 2
tendances; sliced trend; 2
tendances; anomaly peaks; 2
tendances; anomaly valleys; 2
tendances; moving trend; 2
tendances; enveloppe tendance; 2
tendances; long drift; 2
tendances; short drift; 2
tendances; inverted trend; 1
tendances; pseudo trend; 1
tendances; unstable trend; 2
tendances; distorted trend; 1
tendances; decomposed trend; 1
tendances; sliced curve; 1
tendances; cumulative trend; 2
tendances; partial trend; 2
tendances; dynamic delta; 2
tendances; hybrid trend; 2
tendances; global forecast; 2
tendances; meta trend; 1
delais; delai; 4
delais; delais; 4
delais; temps moyen; 4
delais; response time; 4
delais; processing time; 4
delais; lead time; 4
delais; duration; 3
delais; cycle time; 4
delais; delai facturation; 4
delais; delai devis; 4
delais; delai recouvrement; 4
delais; delai intervention; 3
delais; intervention delay; 3
delais; waiting time; 3
delais; temps resolution; 4
delais; temps traitement; 4
delais; waiting duration; 3
delais; delai client; 3
delais; delai deplacement; 3
delais; start to finish time; 3
delais; average handle time; 3
delais; aht; 3
delais; tat; 3
delais; turnaround time; 3
delais; sla delay; 3
delais; sla compliance; 3
delais; response delay; 3
delais; delai journalier; 3
delais; delai horaire; 3
delais; technician delay; 3
delais; workflow delay; 3
delais; planning delay; 3
delais; process delay; 3
delais; execution delay; 3
delais; action delay; 3
delais; multi-step delay; 3
delais; processing latency; 3
delais; operational latency; 3
delais; cumulative delay; 3
delais; time deviation; 3
delais; cycle duration; 3
delais; flow duration; 3
delais; median delay; 3
delais; 95th percentile delay; 3
delais; min delay; 2
delais; max delay; 2
delais; distribution delais; 3
delais; delai cluster; 2
delais; delai deviation; 2
delais; delay segmentation; 2
delais; abnormal delay; 2
delais; delay anomaly; 2
delais; delay predictor; 2
delais; delay forecast; 2
delais; intervention completion time; 3
delais; service latency; 3
delais; opex latency; 2
delais; escalation delay; 2
delais; task delay; 2
delais; delai decharge; 1
delais; delai escalade; 2
delais; delai sauvegarde; 1
delais; delai criticite; 2
delais; delai resolution critique; 2
delais; delai resolution non critique; 2
delais; delai predicted; 2
delais; delai attendu; 2
delais; delai moyen global; 2
delais; delai pondere; 2
delais; time bucket; 1
delais; time bucket analysis; 1
activite; activite; 3
activite; activite commerciale; 3
activite; business activity; 3
activite; utilisation; 3
activite; occupation rate; 3
activite; charge travail; 3
activite; productivity load; 3
activite; operation volume; 3
activite; charge equipe; 3
activite; charge technicien; 3
activite; charge apporteur; 3
activite; utilisation technicien; 3
activite; utilisation equipe; 3
activite; taux sollicitation; 3
activite; flux activite; 3
activite; operational activity; 3
activite; schedule load; 3
activite; planification charge; 3
activite; operational dynamic; 3
activite; dynamique activite; 3
activite; daily activity; 3
activite; monthly activity; 3
activite; yearly activity; 3
activite; activity profile; 3
activite; technician activity; 3
activite; apporteur activity; 3
activite; univers activity; 3
activite; operation activity; 3
activite; dynamic activity; 3
activite; activity burst; 3
activite; slow period; 3
activite; busy period; 3
activite; season activity; 3
activite; workload heatmap; 3
activite; work intensity; 3
activite; density activite; 3
activite; peak hour; 2
activite; job load; 2
activite; flux analyse; 3
activite; changement activite; 3
activite; peak workload; 3
activite; work ratio; 2
activite; distribution charge; 3
activite; charge dynamique; 3
activite; activity load; 3
activite; equipe charge; 2
activite; high load; 2
activite; low load; 2
activite; operational burst; 2
activite; cycle activite; 2
activite; pattern activite; 2
activite; activite cluster; 2
activite; activite heatmap; 2
activite; activite drilldown; 2
activite; intensite activite; 2
activite; charge modale; 1
activite; load variability; 2
activite; load insight; 2
activite; operational density; 2
activite; operational intensity; 2
activite; season activity forecast; 2
activite; activity saturation; 2
activite; behaviour activity; 1
activite; activity breakdown; 2
activite; activity mapping; 2
activite; business activity density; 2
univers; electricite; 3
univers; plomberie; 3
univers; vitrerie; 3
univers; serrurerie; 3
univers; peinture; 2
univers; plaquiste; 2
univers; electricien; 2
univers; vitrier; 2
univers; serrurier; 2
univers; electricite general; 3
univers; plomberie general; 3
univers; vitrerie general; 3
univers; serrurerie general; 3
univers; clim; 2
univers; chaudiere; 2
univers; renovation; 2
univers; sinistre; 2
univers; depannage; 2
univers; intervention technique; 2
univers; travaux; 2
univers; estimations; 2
univers; devis technique; 2
univers; intervention categorie; 2
univers; domaine technique; 2
univers; travaux plomberie; 2
univers; travaux electricite; 2
univers; estimations plomberie; 2
univers; devis electricite; 2
univers; intervention sinistre; 2
univers; remise etat; 2
univers; assurance travaux; 2
univers; assurance sinistre; 2
univers; inondation; 1
univers; infiltration; 1
univers; humidite; 1
univers; moisture; 1
univers; water leak; 1
univers; fuite eau; 2
univers; panne; 2
univers; degat des eaux; 2
univers; pose vitre; 2
univers; remplacement vitre; 2
univers; vitre fissuree; 2
univers; volet roulant; 2
univers; volet depannage; 2
univers; electricite sinistre; 2
univers; electricite urbaine; 2
univers; plomberie urgence; 2
univers; plomberie sinistre; 2
univers; vitrerie urgence; 2
univers; serrureries depannage; 2
univers; serrurerie haute securite; 2
univers; clim reparation; 2
univers; clim installation; 2
univers; chaudiere depannage; 2
univers; chaudiere entretien; 2
univers; multi universe; 2
univers; multi metier; 2
univers; metier segment; 2
univers; secteur technique; 2
univers; secteur metier; 2
univers; zone intervention; 2
univers; chantier; 2
univers; chantier urgence; 2
univers; domaine assurance; 2
univers; ventilation metier; 2
univers; ventilation univers; 2
univers; univers cluster; 2
univers; metier cluster; 2
univers; univers forecasting; 2
univers; univers saturation; 2
univers; metier saturation; 2
univers; univers drift; 2
univers; metier drift; 2
univers; multi univers prediction; 2
univers; univers plate; 1
univers; metier plate; 1
univers; univers heatmap; 2
univers; univers pivot; 1
univers; sector modeling; 1
univers; zone metier; 1
univers; zone univers; 1
univers; secteur cluster; 1
univers; domaine cluster; 1
visu; graphique; 2
visu; graphe; 2
visu; chart; 2
visu; graph; 2
visu; pie chart; 2
visu; bar chart; 2
visu; histogramme; 2
visu; histogram; 2
visu; visualisation; 2
visu; visualization; 2
visu; heatmap; 2
visu; dashboard; 3
visu; tableau bord; 3
visu; scatter plot; 2
visu; courbe croissance; 2
visu; line chart; 2
visu; stacked bar; 2
visu; tree map; 2
visu; area chart; 2
visu; kpi tile; 2
visu; donut chart; 2
visu; metrics card; 2
visu; courbe saisonniere; 2
visu; monthly chart; 2
visu; data viz; 2
visu; data visualization; 2
visu; viz heatmap; 2
visu; viz timeline; 2
visu; viz flow; 2
visu; viz bar; 2
visu; viz donut; 2
visu; viz curve; 2
visu; multi chart; 2
visu; visual pattern; 2
visu; dynamic graph; 2
visu; interactive graph; 2
visu; stacked visualization; 2
visu; timeline visualization; 2
visu; kpi visualization; 3
visu; forecasting curve; 3
visu; marginal curve; 2
visu; deviation curve; 2
visu; variance chart; 2
visu; deviation chart; 2
visu; drilldown chart; 3
visu; heat curve; 2
visu; activation graph; 2
visu; comparative chart; 2
visu; matrix chart; 2
visu; kpi trend graph; 2
visu; kpi anomaly graph; 2
visu; streaming kpi; 2
visu; radar chart; 2
visu; spider chart; 2
visu; rose chart; 2
visu; detailed chart; 2
visu; multi axis chart; 2
visu; multi kpi visualization; 3
visu; seasonal chart; 2
visu; performance per hour chart; 2
visu; composite chart; 2
visu; multi composite; 2
visu; dual axis chart; 2
visu; event chart; 2
visu; hybrid viz; 2
visu; real time viz; 2
visu; animated viz; 1
visu; viz interaction; 2
visu; timeline overlay; 2
visu; pattern chart; 2
visu; job timeline; 2
visu; intervention timeline; 2
visu; cluster timeline; 2
visu; operational timeline; 2
visu; volumetric viz; 2
visu; heat signature; 1
visu; signature chart; 1
visu; spectral chart; 1
analytics; analyse; 3
analytics; data analysis; 3
analytics; statistical analysis; 4
analytics; analytics; 4
analytics; bi; 3
analytics; business intelligence; 3
analytics; reporting; 3
analytics; analyse performance; 3
analytics; diagnostic; 3
analytics; regression; 3
analytics; linear regression; 3
analytics; big data; 3
analytics; data mining; 3
analytics; clustering; 3
analytics; classification model; 3
analytics; evaluation metric; 3
analytics; advanced analytics; 4
analytics; revenue analytics; 4
analytics; operational analytics; 4
analytics; margin analytics; 4
analytics; univers analytics; 4
analytics; apporteur analytics; 4
analytics; technician analytics; 4
analytics; intervention analytics; 4
analytics; dossier analytics; 4
analytics; predictive analytics; 4
analytics; diagnostic analytics; 3
analytics; event analysis; 3
analytics; segmentation analysis; 3
analytics; anomaly analytics; 3
analytics; drift detection; 3
analytics; diagnostic avance; 3
analytics; advanced diagnostic; 3
analytics; operational diagnostic; 3
analytics; multi dimension analysis; 3
analytics; multidimensionnel; 3
analytics; cross data analysis; 3
analytics; data correlation; 3
analytics; correlation matrix; 3
analytics; covariance; 2
analytics; segment analysis; 3
analytics; multivariate analysis; 3
analytics; ca decomposition; 3
analytics; variance decomposition; 3
analytics; trend decomposition; 3
analytics; anomaly insight; 3
analytics; daily insight; 3
analytics; weekly insight; 3
analytics; monthly insight; 3
analytics; yearly insight; 3
analytics; large scale analytics; 3
analytics; high dimensional analytics; 3
analytics; anomaly clustering; 3
analytics; predictive segmentation; 3
analytics; kpi modeling; 3
analytics; deep analytics; 3
analytics; technical analytics; 3
analytics; revenue drift analysis; 3
analytics; intervention analytics multi; 3
analytics; apporteur segmentation; 3
analytics; univers clustering; 3
analytics; technician clustering; 3
analytics; density analytics; 3
analytics; variance analytics; 3
analytics; margin analytics deep; 3
analytics; event-driven analytics; 2
analytics; behaviour analytics; 2
analytics; behaviour pattern; 2
analytics; demand analytics; 3
analytics; synthetic analytics; 1
analytics; large analytics; 1
analytics; analytics drift; 2
analytics; analytics deviation; 2
analytics; weighted analytics; 2
analytics; multi weighted analytics; 2
analytics; scenario analytics; 2
analytics; panoptic analytics; 1
analytics; hybrid analytics; 2
analytics; analytic inspector; 2
analytics; analytic detector; 2
analytics; analytic forecaster; 2
analytics; analytic aggregator; 2
analytics; ensemble analytics; 2
analytics; spatio temporal analytics; 2
analytics; multi dimensional mapping; 2
analytics; decomposition analytics; 2
forecasting; forecasting; 4
forecasting; time series; 4
forecasting; prophet model; 3
forecasting; prediction; 4
forecasting; predictive model; 4
forecasting; seasonal trend; 3
forecasting; future trend; 3
forecasting; growth forecast; 4
forecasting; revenue growth model; 4
forecasting; predictive forecasting; 4
forecasting; ml forecasting; 4
forecasting; saisonnalite modele; 3
forecasting; time series model; 4
forecasting; prophet forecast; 4
forecasting; arima model; 4
forecasting; exponential smoothing; 3
forecasting; holt winters; 3
forecasting; projection trimestrielle; 4
forecasting; projection annuelle; 4
forecasting; forecast engine; 4
forecasting; predictive engine; 4
forecasting; seasonal adjustment; 4
forecasting; trend removal; 3
forecasting; future model; 3
forecasting; indicator forecast; 3
forecasting; business forecast; 3
forecasting; anomaly forecast; 3
forecasting; drift forecast; 3
forecasting; workload forecast; 3
forecasting; long horizon forecast; 3
forecasting; medium horizon forecast; 3
forecasting; short horizon forecast; 3
forecasting; drift correction; 2
forecasting; seasonal correction; 2
forecasting; demand forecast; 3
forecasting; repair demand forecast; 3
forecasting; univers forecast; 3
forecasting; apporteur forecast; 3
forecasting; technician forecast; 3
forecasting; capacity forecast; 3
forecasting; workload forecast advanced; 3
forecasting; weighted forecast; 2
forecasting; composite forecast; 2
forecasting; ensemble forecast; 2
forecasting; predictive ensemble; 2
forecasting; hybrid forecast; 2
forecasting; demand correction; 2
forecasting; univers correction; 2
forecasting; apporteur correction; 2
forecasting; technician correction; 2
forecasting; vector forecast; 2
forecasting; graph forecast; 2
forecasting; trend forecast; 2
forecasting; intra month forecast; 2
forecasting; inter month forecast; 2
prediction; ai prediction; 4
prediction; machine learning prediction; 4
prediction; predicted revenue; 4
prediction; anomaly detection; 3
prediction; ai anomaly prediction; 4
prediction; future revenue prediction; 4
prediction; next month prediction; 4
prediction; prediction univers; 4
prediction; prediction apporteur; 4
prediction; prediction technicien; 4
prediction; prediction chiffre affaire; 4
prediction; prediction recouvrement; 4
prediction; ai forecasting; 4
prediction; technician prediction; 4
prediction; workload prediction; 4
prediction; ca month prediction; 4
prediction; customer prediction; 3
prediction; client prediction; 3
prediction; job prediction; 3
prediction; kpi prediction; 3
prediction; outcome prediction; 3
prediction; deviation prediction; 3
prediction; recurrence prediction; 2
prediction; season prediction; 2
prediction; intervention prediction; 3
prediction; flux prediction; 3
prediction; dossier prediction; 3
prediction; recurrence engine; 2
prediction; seasonal classifier; 2
prediction; technician outcome; 2
prediction; apporteur outcome; 2
prediction; outcome classifier; 2
prediction; prediction uncertainty; 2
prediction; uncertainty band; 2
prediction; prediction band; 2
prediction; prediction envelope; 1
prediction; dynamic prediction; 2
prediction; meta prediction; 1
prediction; flux prediction advanced; 2
prediction; neural prediction; 2
prediction; hybrid prediction; 2
prediction; embedded prediction; 1
prediction; calibrated prediction; 2
prediction; probabilistic prediction; 2
prediction; multi model prediction; 2
prediction; cluster prediction; 2
optimisation; optimisation; 4
optimisation; optimization; 4
optimisation; resource optimization; 4
optimisation; cost optimization; 4
optimisation; operational optimization; 4
optimisation; optimisation planning; 4
optimisation; optimisation interventions; 4
optimisation; optimise workforce; 4
optimisation; optimize schedule; 4
optimisation; routing optimization; 4
optimisation; pto optimization; 2
optimisation; fatturation optimization; 4
optimisation; scheduling optimization; 4
optimisation; technician dispatch optimization; 4
optimisation; queue optimization; 4
optimisation; flux optimization; 3
optimisation; planning auto; 3
optimisation; auto scheduling; 3
optimisation; workload smoothing; 3
optimisation; cost smoothing; 3
optimisation; level optimization; 3
optimisation; financial optimization; 3
optimisation; margin optimization; 3
optimisation; intervention allocation; 3
optimisation; profit optimization; 3
optimisation; drift optimization; 2
optimisation; scoring optimization; 2
optimisation; cost reduction model; 2
optimisation; process optimization; 3
optimisation; flux optimization advanced; 3
optimisation; operational balancing; 2
optimisation; balancing charge; 2
optimisation; smoothing algorithm; 2
optimisation; pattern optimization; 2
optimisation; variance optimization; 2
optimisation; anomaly optimization; 2
optimisation; weighted optimization; 2
optimisation; workload redistribution; 2
optimisation; dynamic load optimization; 2
optimisation; univers optimization; 2
optimisation; apporteur optimization; 2
optimisation; ratio optimization; 2
optimisation; financial optimization advanced; 2
modelisation; modelisation; 4
modelisation; modeling; 4
modelisation; predictive modeling; 4
modelisation; simulation; 3
modelisation; data model; 3
modelisation; modelisation charge; 4
modelisation; modelisation flux; 4
modelisation; agent based model; 3
modelisation; kpi modeling; 3
modelisation; performance modeling; 3
modelisation; workload simulation; 3
modelisation; simulation ca; 3
modelisation; simulation univers; 3
modelisation; simulation niveau; 3
modelisation; business modeling; 3
modelisation; margin modeling; 3
modelisation; multi kpi modeling; 3
modelisation; hybrid modeling; 3
modelisation; simulation metier; 3
modelisation; scenario modeling; 3
modelisation; scenario simulation; 3
modelisation; operational modeling; 3
modelisation; univers modeling; 3
modelisation; univers simulation; 3
modelisation; apporteur simulation; 3
modelisation; technician simulation; 3
modelisation; 4d simulation; 2
modelisation; impact modeling; 3
modelisation; prediction modeling; 3
modelisation; cascade modeling; 2
modelisation; ripple model; 2
modelisation; factorial model; 2
modelisation; event modeling; 2
modelisation; probabilistic modeling; 2
modelisation; ratio modeling; 2
modelisation; scenario building; 2
modelisation; hierarchical modeling; 2
modelisation; trend modeling; 2
modelisation; season modeling; 2
modelisation; flux modeling; 2
modelisation; univers mapping model; 2
modelisation; apporteur mapping model; 2
data_science; data science; 4
data_science; deep learning; 3
data_science; neural network; 3
data_science; tensor model; 2
data_science; dataset; 2
data_science; embedding; 3
data_science; vector search; 3
data_science; feature engineering; 3
data_science; supervised learning; 3
data_science; unsupervised learning; 3
data_science; vector embedding; 3
data_science; transformer model; 3
data_science; multi modal model; 3
data_science; deep neural network; 2
data_science; seq2seq; 2
data_science; regression tree; 3
data_science; feature importance; 3
data_science; decision tree; 3
data_science; random forest; 3
data_science; gradient boosting; 3
data_science; xgboost; 3
data_science; lightgbm; 3
data_science; prophet; 3
data_science; time embedding; 3
data_science; trend embedding; 3
data_science; forecasting embedding; 3
data_science; dimensionality reduction; 2
data_science; pca; 2
data_science; t-sne; 2
data_science; temporal clustering; 3
data_science; spectral clustering; 2
data_science; gaussian model; 2
data_science; probabilistic model; 2
data_science; distribution model; 2
data_science; density model; 2
data_science; trend detector; 3
data_science; outlier detector; 3
data_science; anomaly score; 3
data_science; anomaly engine; 3
data_science; enrichment engine; 2
data_science; data ingestion; 2
data_science; feature extraction; 3
data_science; temporal embedding; 3
data_science; frequency embedding; 2
data_science; segmentation embedding; 2
data_science; spectral analysis; 2
data_science; latent cluster; 2
data_science; hidden pattern; 2
data_science; multi pattern; 2
data_science; behavioural embedding; 2
data_science; temporal embedding advanced; 2
data_science; drift embedding; 2
data_science; revenue embedding; 2
data_science; probabilistic embedding; 1
data_science; segment embedding; 2
data_science; vector analyzer; 2
data_science; drift analyzer; 2
data_science; frequency model; 2
data_science; season model; 2
nlp; nlp; 3
nlp; natural language processing; 4
nlp; query understanding; 4
nlp; semantic search; 4
nlp; tokenization; 2
nlp; language model; 3
nlp; llm classifier; 4
nlp; intent classification; 4
nlp; keyword extraction; 3
nlp; semantic parsing; 4
nlp; sentence embedding; 3
nlp; natural query; 3
nlp; query intent; 3
nlp; semantic engine; 3
nlp; semantic understanding; 3
nlp; natural query analysis; 3
nlp; query disambiguation; 3
nlp; llm disambiguation; 3
nlp; keyword matcher; 2
nlp; guided intent; 3
nlp; structured intent extraction; 4
nlp; question understanding; 3
nlp; phrase detection; 2
nlp; hybrid intent; 3
nlp; stat intent; 4
nlp; doc intent; 3
nlp; ambiguous intent; 3
nlp; reclassification; 2
nlp; entity extraction; 3
nlp; word classifier; 2
nlp; semantic intent engine; 4
nlp; llm stat detection; 3
nlp; stat classifier; 3
nlp; hybrid classifier; 3
nlp; multi intent detection; 3
nlp; meta intent; 2
nlp; stat token; 2
nlp; semantic classifier; 2
nlp; llm tokenization; 2
nlp; structured prompt classification; 2
nlp; llm guided classification; 3
ai_analysis; ai analysis; 4
ai_analysis; intent detection; 4
ai_analysis; llm intent; 4
ai_analysis; llm classification; 4
ai_analysis; llm routing; 4
ai_analysis; llm detection; 4
ai_analysis; llm understanding; 4
ai_analysis; hybrid routing; 4
ai_analysis; autonomous routing; 4
ai_analysis; structured intent; 4
ai_analysis; intent json; 4
ai_analysis; llm structured; 4
ai_analysis; high level intent; 4
ai_analysis; llm ranking; 3
ai_analysis; llm ca detection; 4
ai_analysis; llm univers detection; 4
ai_analysis; llm apporteur detection; 4
ai_analysis; llm technicien detection; 4
ai_analysis; ai decision layer; 4
ai_analysis; hybrid decision; 4
ai_analysis; routing decision; 4
ai_analysis; intent reranker; 4
ai_analysis; semantic reranking; 4
ai_analysis; hybrid reranking; 4
ai_analysis; llm chain; 3
ai_analysis; decision transformer; 3
ai_analysis; metric intent; 4
ai_analysis; kpi intent; 4
ai_analysis; stats intent; 4
ai_analysis; economic intent; 3
ai_analysis; financial intent; 4
ai_analysis; operational intent; 4
ai_analysis; llm reasoning; 3
ai_analysis; llm analytics; 3
ai_analysis; llm forecasting; 3
ai_analysis; llm scoring; 3
ai_analysis; llm hybrid scoring; 3
ai_analysis; hybrid intent engine; 3
ai_analysis; multi intent engine; 3
ai_analysis; llm business analysis; 3
ai_analysis; kpi detection; 3
ai_analysis; stat reasoning; 3
ai_analysis; metric reasoning; 3
risk_analysis; risk analysis; 3
risk_analysis; operational risk; 3
risk_analysis; financial risk; 3
risk_analysis; deviation; 2
risk_analysis; forecast risk; 3
risk_analysis; operational deviation; 3
risk_analysis; financial deviation; 3
risk_analysis; safety margin; 3
risk_analysis; risk mapping; 3
risk_analysis; risk matrix; 3
risk_analysis; solvency risk; 3
risk_analysis; coverage risk; 3
risk_analysis; workload risk; 3
risk_analysis; operational risk mapping; 3
risk_analysis; financial drift risk; 3
risk_analysis; variance risk; 3
risk_analysis; detection risque; 3
risk_analysis; deviation inspector; 3
risk_analysis; anomaly inspector; 3
risk_analysis; forecast deviation; 3
risk_analysis; event risk; 2
risk_analysis; cluster risk; 2
risk_analysis; demand risk; 2
risk_analysis; intervention risk; 2
risk_analysis; financial volatility; 3
risk_analysis; operational volatility; 3
risk_analysis; drift volatility; 3
risk_analysis; loss risk; 2
risk_analysis; high variance risk; 2
risk_analysis; structural risk; 2
risk_analysis; operational weak point; 2
risk_analysis; cluster risk mapping; 2
risk_analysis; exposure mapping advanced; 2
risk_analysis; dependency risk; 2
risk_analysis; deviation mapping; 2
risk_analysis; risk pattern; 2
business_analysis; business analysis; 3
business_analysis; market analysis; 3
business_analysis; strategic insight; 3
business_analysis; business performance; 3
business_analysis; performance mapping; 3
business_analysis; business dynamic; 3
business_analysis; performance evolution; 3
business_analysis; margin evolution; 3
business_analysis; univers performance; 3
business_analysis; apporteur performance; 3
business_analysis; technician performance; 3
business_analysis; business mapping; 3
business_analysis; cross analysis; 3
business_analysis; operational mapping; 3
business_analysis; univers mapping; 3
business_analysis; apporteur mapping; 3
business_analysis; technician mapping; 3
business_analysis; segmentation mapping; 3
business_analysis; migration analysis; 2
business_analysis; in depth analysis; 3
business_analysis; decomposition analysis; 3
business_analysis; contrast analysis; 2
business_analysis; multi-kpi analysis; 3
business_analysis; advanced performance; 3
business_analysis; macro analysis; 2
business_analysis; micro analysis; 2
business_analysis; cross time analysis; 2
business_analysis; aggregated analysis; 2
business_analysis; aggregated performance; 2
business_analysis; business anomaly; 2
business_analysis; cross period comparison; 2
business_analysis; macro indicator; 2
business_analysis; micro indicator; 2
business_analysis; behavioural indicator; 2
business_analysis; performance pulse; 2
business_analysis; business heatmap; 2
business_analysis; multi-axis performance; 2
business_analysis; performance window; 2
operationnel; operationnel; 3
operationnel; operational kpi; 3
operationnel; workload management; 3
operationnel; ops performance; 3
operationnel; planning performance; 3
operationnel; flux operationnel; 3
operationnel; operational efficiency; 3
operationnel; operational workflow; 3
operationnel; operational pattern; 3
operationnel; repetitive tasks; 2
operationnel; cycle operationnel; 3
operationnel; operational steps; 3
operationnel; workflow tracking; 3
operationnel; multi-stage workflow; 3
operationnel; operational bottleneck; 3
operationnel; workflow anomaly; 2
operationnel; operational breakdown; 2
operationnel; procedural drift; 2
operationnel; stage deviation; 2
operationnel; operation multistep; 2
operationnel; micro workflow; 1
operationnel; anormal workflow; 1
operationnel; charge breakdown; 2
operationnel; bottleneck detector; 2
operationnel; pipeline inspector; 2
operationnel; operational pressure; 2
operationnel; operational anomaly; 2
operationnel; operational mapping; 2
operationnel; pressure mapping; 2
qualite; qualite; 2
qualite; quality; 2
qualite; satisfaction; 3
qualite; csat; 3
qualite; customer satisfaction; 3
qualite; nps; 3
qualite; survey analysis; 3
qualite; process quality; 2
qualite; quality deviation; 2
qualite; quality compliance; 2
qualite; audit qualite; 3
qualite; satisfaction client; 3
qualite; revue qualite; 2
qualite; performance quality; 3
qualite; defect rate; 2
qualite; rework rate; 2
qualite; quality monitoring; 3
qualite; iso quality; 2
qualite; audit performance; 3
qualite; process deviation; 2
qualite; customer deviation; 2
qualite; quality anomaly; 2
qualite; nps drift; 2
qualite; satisfaction drift; 2
qualite; csat variation; 2
qualite; feedback analytics; 2
qualite; avis client; 2
qualite; qualitative analytics; 2
qualite; quality seasonality; 2
qualite; complaint analytics; 2
qualite; avis anomaly; 1
qualite; service quality; 2
qualite; kpi quality; 2
clientele; clientele; 3
clientele; customers; 3
clientele; customer count; 3
clientele; churn; 3
clientele; retention; 3
clientele; acquisition; 3
clientele; conversion; 3
clientele; retention rate; 3
clientele; customer inflow; 3
clientele; customer outflow; 3
clientele; customer funnel; 3
clientele; conversion funnel; 3
clientele; user behavior; 2
clientele; client segment; 2
clientele; client scoring; 3
clientele; behaviour scoring; 3
clientele; customer anomaly; 3
clientele; behaviour trend; 2
clientele; customer insight; 2
clientele; churn indicator; 2
clientele; churn predictor; 2
clientele; acquisition predictor; 2
clientele; satisfaction predictor; 2
clientele; lifetime value; 2
clientele; customer lifetime value; 2
clientele; clv; 2
clientele; panier client; 2
clientele; value segmentation; 2
clientele; client pattern; 2
clientele; cluster clientele; 2
clientele; client trend; 2
clientele; behaviour mapping; 2
clientele; customer plate; 1
clientele; client retention advanced; 2
clientele; client profitability segmentation; 2
pilotage; pilotage; 4
pilotage; kpi pilotage; 4
pilotage; pilotage agence; 4
pilotage; suivi performance; 4
pilotage; suivi ca; 4
pilotage; pilotage reseau; 4
pilotage; pilotage multi agence; 4
pilotage; suivi marge; 4
pilotage; suivi activite; 4
pilotage; controle gestion; 4
pilotage; control gestion; 4
pilotage; performance control; 4
pilotage; pilotage previsionnel; 3
pilotage; pilotage charge; 3
pilotage; pilotage univers; 3
pilotage; global pilotage; 3
pilotage; high level pilotage; 3
pilotage; director summary; 2
pilotage; pilotage indicateur; 3
pilotage; pilotage strategie; 3
pilotage; pilotage mensuel; 3
pilotage; pilotage annuel; 3
pilotage; review mensuelle; 2
pilotage; review trimestrielle; 2
pilotage; review annuelle; 2
pilotage; business review; 2
pilotage; performance review; 3
pilotage; strategic view; 2
pilotage; pilotage scenario; 2
pilotage; pilotage drift; 2
pilotage; pilotage tension; 2
pilotage; business tension; 2
pilotage; monthly business review; 2
pilotage; kpi overview; 2
pilotage; executive summary; 2
gestion; gestion; 3
gestion; management; 3
gestion; team management; 3
gestion; pipeline management; 3
gestion; gestion equipe; 3
gestion; gestion charge; 3
gestion; gestion interventions; 3
gestion; gestion apporteurs; 3
gestion; workflow management; 3
gestion; kanban management; 3
gestion; dossier management; 3
gestion; optimisation gestion; 3
gestion; gestion previsionnelle; 3
gestion; gestion flux; 3
gestion; gestion performance; 3
gestion; operational management; 3
gestion; gestion risque; 2
gestion; gestion priorite; 2
gestion; gestion charge dynamique; 3
gestion; gestion scenario; 2
gestion; workflow optimise; 2
gestion; flux continuous; 2
gestion; management charge; 2
gestion; gestion anomalies; 2
gestion; gestion business; 2
gestion; gestion visibilite; 1
gestion; gestion cluster; 1
gestion; charge inspector; 1
gestion; workload inspector; 2
reseau; reseau; 3
reseau; network stats; 3
reseau; multi agence; 3
reseau; multi-agency; 3
reseau; agency network; 3
reseau; network performance; 3
reseau; interagency analysis; 3
reseau; inter agence; 3
reseau; reseau evolution; 3
reseau; reseau performance; 3
reseau; reseau charge; 3
reseau; reseau flux; 3
reseau; reseau cartographie; 3
reseau; reseau tension; 3
reseau; interagency flow; 3
reseau; reseau distribution; 2
reseau; reseau segmentation; 2
reseau; inter agence performance; 2
reseau; reseau flux analytics; 2
reseau; reseau multi univers; 2
reseau; reseau heterogene; 1
reseau; reseau tension analytics; 2
reseau; reseau profondeur; 1
reseau; reseau charge analysis; 2
reseau; reseau saisonnalite; 2
reseau; inter agency comparison; 2
reseau; cross region mapping; 2
reseau; reseau intensite; 2
agence; agence; 2
agence; segmentation agence; 2
agence; agence performance; 3
agence; agence stats; 2
agence; agence details; 2
agence; multi agence stats; 3
agence; agence segment; 2
agence; agence repartition; 2
agence; agence drift; 2
agence; agence deviation; 2
agence; agence flux; 2
agence; agence insight; 2
agence; agence comparatif; 2
agence; agence croissance; 2
agence; agence intensite; 2
agence; agence mapping; 2
agence; agence scenario; 1
agence; agence analyse avancee; 2
agence; agence forecast; 2
agence; agence performance drift; 2
agence; agence mapping flux; 2
agence; agence cluster; 2
agence; agence seasonal deviation; 1
segmentation; segmentation; 2
segmentation; geo segmentation; 2
segmentation; segmentation univers; 2
segmentation; segmentation client; 2
segmentation; segmentation apporteur; 2
segmentation; segmentation performance; 2
segmentation; segmentation metier; 2
segmentation; segmentation univers detaillee; 2
segmentation; segmentation flux; 2
segmentation; segmentation operationnelle; 2
segmentation; segmentation revenue; 2
segmentation; segmentation marge; 2
segmentation; segmentation client value; 2
segmentation; segmentation ca; 2
segmentation; segmentation univers workload; 2
segmentation; segmentation comportementale; 2
segmentation; segmentation technique; 2
segmentation; segmentation apporteur avancee; 2
segmentation; segmentation univers avancee; 2
segmentation; segmentation temps; 1
segmentation; segmentation region; 1
region; region; 2
region; territory; 2
region; zone; 2
region; regional performance; 2
region; zone geographique; 2
region; geographic segmentation; 2
region; inter zone; 2
region; region performance mapping; 2
region; zone insight; 2
region; region drift; 2
region; region statistics; 2
region; multi region; 2
region; region workload; 2
region; region forecast; 2
region; region drift forecast; 2
region; zone saturation; 2
region; inter region analysis; 2
region; region distribution; 2
region; region optimiser; 1
period; aujourd hui; 5
period; hier; 5
period; semaine; 4
period; cette semaine; 4
period; semaine derniere; 4
period; mois; 4
period; ce mois; 4
period; mois dernier; 4
period; mensuel; 4
period; trimestre; 4
period; ce trimestre; 4
period; trimestriel; 4
period; annee; 5
period; cette annee; 5
period; annee derniere; 5
period; annuel; 5
period; janvier; 3
period; fevrier; 3
period; mars; 3
period; avril; 3
period; mai; 3
period; juin; 3
period; juillet; 3
period; aout; 3
period; septembre; 3
period; octobre; 3
period; novembre; 3
period; decembre; 3
period; dernier; 3
period; derniere; 3
period; derniers; 3
period; dernieres; 3
period; precedent; 3
period; precedente; 3
period; depuis; 3
period; jusqu; 3
period; jusque; 3
period; n-1; 4
period; n 1; 4
period; 12 mois; 4
period; 12 derniers mois; 4
period; ytd; 4
period; year to date; 4
period; mtd; 3
period; month to date; 3
period; q1; 3
period; q2; 3
period; q3; 3
period; q4; 3
action; ouvrir; 4
action; ouvre; 4
action; aller; 4
action; voir; 4
action; afficher; 4
action; montrer; 4
action; planning; 4
action; agenda; 4
action; calendrier; 4
action; tableau; 3
action; tableaux; 3
action; dashboard; 4
action; liste; 3
action; lister; 3
action; mes; 2
action; mon; 2
action; ma; 2
doc; comment; 5
doc; pourquoi; 4
doc; aide; 5
doc; aider; 4
doc; help; 4
doc; guide; 4
doc; tutoriel; 4
doc; tuto; 3
doc; definition; 4
doc; signifie; 4
doc; veut dire; 4
doc; procedure; 4
doc; process; 3
doc; etapes; 3
doc; regle; 3
doc; regles; 3
doc; politique; 3
doc; expliquer; 4
doc; explication; 4
doc; c est quoi; 5
doc; qu est ce que; 5
doc; quest ce que; 5
doc; a quoi sert; 4
dimension; technicien; 5
dimension; tech; 4
dimension; techs; 4
dimension; techniciens; 5
dimension; apporteur; 5
dimension; apporteurs; 5
dimension; commanditaire; 4
dimension; prescripteur; 4
dimension; client; 4
dimension; clients; 4
dimension; par technicien; 5
dimension; par apporteur; 5
dimension; par univers; 5
dimension; par agence; 4
dimension; par client; 4
dimension; par mois; 4
dimension; par semaine; 4
dimension; par jour; 4
intent; top; 5
intent; meilleur; 5
intent; premier; 4
intent; classement; 5
intent; moyenne; 4
intent; moyen; 4
intent; avg; 3
intent; somme; 4
intent; cumul; 4
intent; pourcentage; 4
intent; ratio; 4
intent; evolution; 4
intent; progression; 4
intent; comparer; 4
intent; versus; 3
intent; vs; 3
intent; distribution; 3
intent; ventilation; 3
intent; repartition; 4
intent; tri; 3
intent; trier; 3
intent; grouper; 3
intent; groupe par; 4
filter; sav; 5
filter; rt; 4
filter; travaux; 4
filter; depannage; 4
filter; diagnostic; 3
filter; releve technique; 4
filter; avec; 2
filter; sans; 2
filter; superieur; 3
filter; inferieur; 3
filter; entre; 2
filter; plus de; 3
filter; moins de; 3
filter; au moins; 3
filter; maximum; 3
filter; minimum; 3
`;

// ═══════════════════════════════════════════════════════════════
// PARSING ET NORMALISATION
// ═══════════════════════════════════════════════════════════════

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function parseRawKeywords(): Keyword[] {
  const lines = RAW_KEYWORDS_DATA.split('\n');
  const keywordMap = new Map<string, Keyword>();
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    
    const parts = trimmed.split(';');
    if (parts.length < 3) continue;
    
    const rawCategory = normalizeText(parts[0]);
    const phrase = normalizeText(parts[1]);
    const weightStr = parts[2].trim();
    const weight = parseInt(weightStr, 10);
    
    if (!phrase || isNaN(weight)) continue;
    
    // Mapper la catégorie brute vers une catégorie valide
    const category: KeywordCategory = CATEGORY_MAP[rawCategory] || 'filter';
    
    // Normaliser le poids (1-5 → 0.2-1.0)
    const normalizedWeight = Math.min(1, Math.max(0.2, weight / 5));
    
    // Dé-doublonnage: garder le poids le plus élevé
    const existing = keywordMap.get(phrase);
    if (!existing || existing.weight < normalizedWeight) {
      keywordMap.set(phrase, {
        word: phrase,
        category,
        weight: normalizedWeight,
      });
    }
  }
  
  return Array.from(keywordMap.values());
}

// ═══════════════════════════════════════════════════════════════
// INDEX PRÉCOMPILÉ (Map pour O(1))
// ═══════════════════════════════════════════════════════════════

const KEYWORDS_PARSED = parseRawKeywords();
const KEYWORD_INDEX = new Map<string, Keyword>();

// Index par catégorie pour recherches spécialisées
const KEYWORDS_BY_CATEGORY = new Map<KeywordCategory, Keyword[]>();

// Construire les index au chargement
(function buildIndexes() {
  for (const kw of KEYWORDS_PARSED) {
    KEYWORD_INDEX.set(kw.word, kw);
    
    // Index par catégorie
    const catList = KEYWORDS_BY_CATEGORY.get(kw.category) || [];
    catList.push(kw);
    KEYWORDS_BY_CATEGORY.set(kw.category, catList);
  }
  
  console.log(`[nlKeywords] Loaded ${KEYWORD_INDEX.size} keywords across ${KEYWORDS_BY_CATEGORY.size} categories`);
})();

// ═══════════════════════════════════════════════════════════════
// API PUBLIQUE
// ═══════════════════════════════════════════════════════════════

/**
 * Recherche un mot-clé dans l'index (O(1))
 */
export function findKeyword(word: string): Keyword | undefined {
  return KEYWORD_INDEX.get(normalizeText(word));
}

/**
 * Trouve tous les mots-clés dans une requête normalisée
 * Priorité aux correspondances multi-mots
 */
export function findAllKeywords(normalizedQuery: string): KeywordMatch[] {
  const matches: KeywordMatch[] = [];
  const words = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
  const usedPositions = new Set<number>();
  
  // Recherche multi-mots d'abord (4 → 3 → 2 → 1 mots)
  for (let len = 4; len >= 1; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      // Vérifier si ces positions sont déjà utilisées
      let anyUsed = false;
      for (let j = i; j < i + len; j++) {
        if (usedPositions.has(j)) {
          anyUsed = true;
          break;
        }
      }
      if (anyUsed) continue;
      
      const phrase = words.slice(i, i + len).join(' ');
      const keyword = KEYWORD_INDEX.get(phrase);
      
      if (keyword) {
        matches.push({
          keyword,
          position: i,
          matchedText: phrase,
        });
        
        // Marquer les positions comme utilisées
        for (let j = i; j < i + len; j++) {
          usedPositions.add(j);
        }
      }
    }
  }
  
  return matches;
}

/**
 * Calcule le score stats d'une requête basé sur les mots-clés matchés
 * Score amélioré avec bonus multi-catégories
 */
export function computeStatsScore(matches: KeywordMatch[]): number {
  const categoryWeights: Record<KeywordCategory, number> = {
    metric: 0.35,
    dimension: 0.2,
    intent: 0.15,
    period: 0.1,
    univers: 0.15,
    action: -0.15,  // Réduit le score stats
    doc: -0.35,     // Réduit fortement le score stats
    filter: 0.05,
  };
  
  let score = 0;
  const seen = new Set<string>();
  const categoriesFound = new Set<KeywordCategory>();
  
  for (const match of matches) {
    // Éviter les doublons
    if (seen.has(match.keyword.word)) continue;
    seen.add(match.keyword.word);
    
    const catWeight = categoryWeights[match.keyword.category] || 0;
    score += match.keyword.weight * catWeight;
    
    // Tracker les catégories pour le bonus
    if (catWeight > 0) {
      categoriesFound.add(match.keyword.category);
    }
  }
  
  // Bonus multi-catégories (synergie entre metric + dimension + univers)
  const statsCats: KeywordCategory[] = ['metric', 'dimension', 'univers', 'intent'];
  const foundStatsCats = statsCats.filter(c => categoriesFound.has(c)).length;
  if (foundStatsCats >= 2) {
    score += 0.1 * (foundStatsCats - 1); // +0.1 pour 2 cats, +0.2 pour 3, +0.3 pour 4
  }
  
  // Normaliser entre 0 et 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Détecte la catégorie dominante parmi les matches
 */
export function getDominantCategory(matches: KeywordMatch[]): KeywordCategory | null {
  const counts: Partial<Record<KeywordCategory, number>> = {};
  
  for (const match of matches) {
    const cat = match.keyword.category;
    counts[cat] = (counts[cat] || 0) + match.keyword.weight;
  }
  
  let maxCat: KeywordCategory | null = null;
  let maxScore = 0;
  
  for (const [cat, score] of Object.entries(counts)) {
    if (score > maxScore) {
      maxScore = score;
      maxCat = cat as KeywordCategory;
    }
  }
  
  return maxCat;
}

/**
 * Extrait les univers métier détectés
 */
export function extractUniversFromMatches(matches: KeywordMatch[]): string[] {
  return matches
    .filter(m => m.keyword.category === 'univers')
    .map(m => m.keyword.word.toUpperCase());
}

/**
 * Extrait la dimension principale détectée
 */
export function extractDimensionFromMatches(matches: KeywordMatch[]): string | null {
  const dimMatch = matches.find(m => m.keyword.category === 'dimension');
  return dimMatch?.keyword.word || null;
}

/**
 * Retourne les mots-clés d'une catégorie spécifique
 */
export function getKeywordsByCategory(category: KeywordCategory): Keyword[] {
  return KEYWORDS_BY_CATEGORY.get(category) || [];
}

/**
 * Statistiques sur l'index
 */
export function getKeywordStats(): { total: number; byCategory: Record<string, number> } {
  const byCategory: Record<string, number> = {};
  for (const [cat, kws] of KEYWORDS_BY_CATEGORY) {
    byCategory[cat] = kws.length;
  }
  return {
    total: KEYWORD_INDEX.size,
    byCategory,
  };
}

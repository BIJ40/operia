/**
 * Configuration centralisée de l'historique des versions
 */

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'fix' | 'improvement' | 'security' | 'audit';
    description: string;
  }[];
  auditLinks?: { label: string; path: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "V0.7.9",
    title: "Widgets StatIA & Administration Refonte",
    date: "2025-12-10",
    changes: [
      // ═══════════════════════════════════════════════════════════════
      // NOUVEAUX WIDGETS STATIA
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'Widget Taux SAV : KPI avec jauge visuelle et indicateur YTD' },
      { type: 'feature', description: 'Widget CA Mensuel Chart : graphique évolution CA sur 12 mois' },
      { type: 'feature', description: 'Widget CA Apporteurs : bar chart horizontal top apporteurs' },
      { type: 'feature', description: 'Widget Panier Moyen : KPI avec tendance vs mois précédent' },
      { type: 'feature', description: 'Widget Recouvrement : KPI avec cercle de progression encaissé/total' },
      { type: 'feature', description: 'Widget Techniciens Productivité : tableau CA par technicien' },
      { type: 'feature', description: '6 templates widgets ajoutés à la bibliothèque système' },
      
      // ═══════════════════════════════════════════════════════════════
      // PAGE ADMINISTRATION REFONTE
      // ═══════════════════════════════════════════════════════════════
      { type: 'improvement', description: 'Page /admin refaite avec 5 sections thématiques' },
      { type: 'improvement', description: 'Section "Droits, Permissions & Modules" : users, agencies, flags, widgets' },
      { type: 'improvement', description: 'Section "Intelligence Artificielle" : Helpi, guides, StatIA, formation' },
      { type: 'improvement', description: 'Section "Support & Assistance" : console, stats, escalation, FAQ' },
      { type: 'improvement', description: 'Section "Données & Sauvegardes" : backups, cache, storage' },
      { type: 'improvement', description: 'Section "Système & Monitoring" : health, metadata, annonces' },
      { type: 'improvement', description: 'Menu Administration : navigation directe (plus de dropdown)' },
      
      // ═══════════════════════════════════════════════════════════════
      // UX & TEXTES
      // ═══════════════════════════════════════════════════════════════
      { type: 'fix', description: 'Message accueil dashboard : passage au tutoiement' },
    ],
  },
  {
    version: "V0.7.8",
    title: "Live Support & FAQ Integration",
    date: "2025-12-08",
    changes: [
      // ═══════════════════════════════════════════════════════════════
      // LIVE SUPPORT AMÉLIORATIONS
      // ═══════════════════════════════════════════════════════════════
      { type: 'fix', description: 'Context partagé LiveSupportContext pour synchronisation Indicator ↔ ChatDialog' },
      { type: 'fix', description: 'Bouton "En attente..." fonctionnel - réouvre le chat correctement' },
      { type: 'fix', description: 'Notifications temps réel : écoute DELETE en plus de INSERT/UPDATE' },
      { type: 'fix', description: 'Badge "Live" = sessions en attente uniquement (pas toutes les sessions)' },
      
      // ═══════════════════════════════════════════════════════════════
      // TICKETS → FAQ
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'Edge function reformulate-ticket-faq : reformulation IA question/réponse' },
      { type: 'feature', description: 'Dialog TicketToFaqDialog : ajout direct ticket résolu → FAQ' },
      { type: 'feature', description: 'Sélection catégorie et contexte FAQ lors de l\'ajout' },
      { type: 'feature', description: 'Publication immédiate ou brouillon disponible' },
    ],
  },
  {
    version: "V0.7.7",
    title: "Audit complet Support Live Chat",
    date: "2025-12-07",
    changes: [
      // ═══════════════════════════════════════════════════════════════
      // CORRECTION CONVERSION CHAT → TICKET
      // ═══════════════════════════════════════════════════════════════
      { type: 'fix', description: 'Type ticket correctement défini à "ticket" (non "chat_human") après conversion' },
      { type: 'fix', description: 'Liaison converted_ticket_id dans live_support_sessions' },
      { type: 'fix', description: 'Statut session mis à "converted" après conversion réussie' },
      
      // ═══════════════════════════════════════════════════════════════
      // ABONNEMENT REALTIME CÔTÉ CLIENT
      // ═══════════════════════════════════════════════════════════════
      { type: 'fix', description: 'useLiveSupportSession écoute status="converted" en plus de "closed"' },
      { type: 'fix', description: 'Fermeture automatique du chat côté client après conversion' },
      { type: 'fix', description: 'Reset de l\'état local (sessionId, messages) après fermeture' },
      
      // ═══════════════════════════════════════════════════════════════
      // BOUTON FERMER FONCTIONNEL
      // ═══════════════════════════════════════════════════════════════
      { type: 'fix', description: 'Prop onClose propagée depuis GlobalLiveSupportManager' },
      { type: 'fix', description: 'Prop onClose propagée depuis AiInlineResult' },
      { type: 'fix', description: 'Reset état local avant appel onClose' },
      
      // ═══════════════════════════════════════════════════════════════
      // UI CONSOLE SUPPORT - ICÔNES SEULES
      // ═══════════════════════════════════════════════════════════════
      { type: 'improvement', description: 'Onglets Live/Actifs/Archives → icônes uniquement avec tooltips' },
      { type: 'improvement', description: 'Onglets En cours/Archives sessions → icônes uniquement avec tooltips' },
      
      // ═══════════════════════════════════════════════════════════════
      // WORKFLOW UNIFIÉ SU ↔ CLIENT
      // ═══════════════════════════════════════════════════════════════
      { type: 'audit', description: 'Agent ferme avec "Convertir en ticket" → ticket créé type="ticket"' },
      { type: 'audit', description: 'Client voit notification "Session convertie en ticket"' },
      { type: 'audit', description: 'Chat se ferme automatiquement côté client' },
      { type: 'audit', description: 'Ticket visible dans onglet "Actifs" de la console support' },
    ],
  },
  {
    version: "V0.7.6",
    title: "Audit Sécurité & Permissions V2 - Corrections P0/P1",
    date: "2025-12-06",
    changes: [
      // ═══════════════════════════════════════════════════════════════
      // P0 – SÉCURITÉ & PERMISSIONS
      // ═══════════════════════════════════════════════════════════════
      { type: 'security', description: 'Routes /security-audit-report et /security-documentation protégées N5+' },
      { type: 'security', description: 'Routes /projects/* protégées avec RoleGuard minRole="franchisee_user"' },
      { type: 'security', description: 'Routes /admin/* uniformément protégées platform_admin (N5)' },
      { type: 'security', description: 'Page dev UnifiedSearchAnimationPlayground protégée N5+' },
      { type: 'security', description: 'Hook useHasGlobalRole: suppression bypass legacy isAdmin' },
      
      // ═══════════════════════════════════════════════════════════════
      // P1 – MIGRATION V2 PERMISSIONS
      // ═══════════════════════════════════════════════════════════════
      { type: 'improvement', description: 'ChatbotNotifications: isAdmin → hasGlobalRole("platform_admin")' },
      { type: 'improvement', description: 'ApogeeGuide: isAdmin → hasModuleOption("help_academy", "edition")' },
      { type: 'improvement', description: 'CategoryActionsAMener: isAdmin → hasModuleOption V2' },
      { type: 'improvement', description: 'AdminHelpConfortBackup: isAdmin → hasGlobalRole V2' },
      
      // ═══════════════════════════════════════════════════════════════
      // P1 – ROUTES & NAVIGATION
      // ═══════════════════════════════════════════════════════════════
      { type: 'fix', description: 'Routes erreurs /401, /403, /500 explicitement déclarées dans App.tsx' },
      
      // ═══════════════════════════════════════════════════════════════
      // DOC SÉCURITÉ
      // ═══════════════════════════════════════════════════════════════
      { type: 'audit', description: 'SecurityAuditReport V2.0: mise à jour complète post-audit' },
      { type: 'audit', description: 'Score sécurité: 98/100 (toutes violations critiques corrigées)' },
    ],
    auditLinks: [
      { label: 'Rapport d\'Audit Sécurité V2', path: '/security-audit-report' },
    ]
  },
  {
    version: "V0.7.5",
    title: "Audit Qualité & Migration console.error → logError",
    date: "2025-12-06",
    changes: [
      // ═══════════════════════════════════════════════════════════════
      // AUDIT P1 – OBSERVABILITÉ & SENTRY
      // ═══════════════════════════════════════════════════════════════
      { type: 'audit', description: 'Migration console.error → logError dans 8 hooks critiques RH' },
      { type: 'audit', description: 'useSensitiveData.ts: erreurs remontées vers Sentry' },
      { type: 'audit', description: 'use-sav-overrides.ts: erreurs upsert/delete avec tags' },
      { type: 'audit', description: 'useCollaboratorDocuments.ts: analyse bulletin async loguée' },
      { type: 'audit', description: 'useFormationContent.ts: génération contenu formation' },
      { type: 'audit', description: 'useLeaveDecision.ts: décisions congés avec logging complet' },
      { type: 'audit', description: 'usePayslipAnalysis.ts: analyse bulletins de paie' },
      { type: 'audit', description: 'useRHExport.ts: exports CSV/ZIP avec catégorisation' },
      
      // ═══════════════════════════════════════════════════════════════
      // P2 – QUALITÉ CODE
      // ═══════════════════════════════════════════════════════════════
      { type: 'improvement', description: 'QrAssetPage: suppression console.error sur page publique' },
      { type: 'improvement', description: 'Imports logError/logDebug centralisés depuis lib/logger' },
    ],
  },
  {
    version: "V0.7.4",
    title: "Module Maintenance Préventive – Véhicules, Matériel, Alertes & QR",
    date: "2025-12-06",
    changes: [
      // ═══════════════════════════════════════════════════════════════
      // MODULE MAINTENANCE PRÉVENTIVE
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'Nouvelle page /maintenance : onglets Véhicules, Matériel & EPI, Alertes, Plans préventifs' },
      { type: 'feature', description: 'Gestion flotte véhicules : création, édition, suivi CT/révision/kilométrage' },
      { type: 'feature', description: 'Gestion matériel & EPI : création, édition, catégories (outillage, EPI, mesure, échelles)' },
      { type: 'feature', description: 'Plans de maintenance préventive avec items récurrents et fréquences personnalisables' },
      { type: 'feature', description: 'Événements de maintenance planifiés liés aux véhicules ou outils' },
      { type: 'feature', description: 'Alertes automatiques avec niveaux de sévérité (info, warning, critical)' },
      
      // ═══════════════════════════════════════════════════════════════
      // QR CODE PUBLIC
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'Edge function qr-asset : lookup véhicule/outil par qr_token sans authentification' },
      { type: 'feature', description: 'Page publique /qr/:token : affichage condensé actif + prochains contrôles + dernier réalisé' },
      { type: 'feature', description: 'Modal QR Code avec génération PNG et impression étiquette' },
      { type: 'feature', description: 'Bouton QR sur chaque ligne véhicule et matériel' },
      
      // ═══════════════════════════════════════════════════════════════
      // INFRASTRUCTURE
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'Tables Supabase : fleet_vehicles, tools, maintenance_plan_templates, maintenance_plan_items, maintenance_events, maintenance_alerts' },
      { type: 'security', description: 'RLS policies sur toutes les tables maintenance avec isolation par agence' },
      { type: 'improvement', description: 'Hooks React Query : useFleetVehicles, useTools, useMaintenanceEvents, useMaintenanceAlerts, usePlans' },
    ],
  },
  {
    version: "V0.7.3",
    title: "Pipeline IA Hybride – Refonte complète unified-search",
    date: "2025-12-06",
    changes: [
      // ═══════════════════════════════════════════════════════════════
      // PIPELINE IA HYBRIDE 5 ÉTAPES
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'Étape 1: detectQueryType() → classification heuristique stats/doc/action/unknown' },
      { type: 'feature', description: 'Étape 2: extractIntentLLM() → appel edge function ai-search-extract (Gemini 2.5 Flash)' },
      { type: 'feature', description: 'Étape 3: validateAndRoute() → validation déterministe (metricsRegistry, permissions, corrections)' },
      { type: 'feature', description: 'Étape 4: Exécution StatIA pour stats, RAG pour docs, routing pour actions' },
      { type: 'feature', description: 'Étape 5: Réponse structurée avec bloc interpretation + debug (N6 only)' },
      
      // ═══════════════════════════════════════════════════════════════
      // SÉCURITÉ & PERMISSIONS
      // ═══════════════════════════════════════════════════════════════
      { type: 'security', description: 'N0/N1: accès stats bloqué → fallback doc automatique' },
      { type: 'security', description: 'N2: stats limitées à agence rattachée uniquement' },
      { type: 'security', description: 'N3+: scope réseau avec allowedAgencyIds' },
      { type: 'security', description: 'LLM JAMAIS exécuté brut → toujours corrigé par validateAndRoute()' },
      { type: 'security', description: 'Métriques inventées par LLM rejetées → routing via keywords' },
      
      // ═══════════════════════════════════════════════════════════════
      // ARCHITECTURE aiSearch
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'Nouveau module src/services/aiSearch/ avec 8 fichiers' },
      { type: 'feature', description: 'types.ts: interfaces LLMDraftIntent, ValidatedIntent, SearchResult' },
      { type: 'feature', description: 'nlNormalize.ts: normalisation query (accents, typos, minuscules)' },
      { type: 'feature', description: 'nlKeywords.ts: STATS_KEYWORDS avec catégories et poids' },
      { type: 'feature', description: 'detectQueryType.ts: classification heuristique multi-signal' },
      { type: 'feature', description: 'extractPeriod.ts: parser période NL (mois, année, exercice, ce mois, etc.)' },
      { type: 'feature', description: 'metricsRegistry.ts: registre officiel 20+ métriques avec minRole et dimensions' },
      { type: 'feature', description: 'validateAndRoute.ts: moteur déterministe de validation + correction' },
      { type: 'feature', description: 'extractIntentLLM.ts: wrapper appel edge function ai-search-extract' },
      
      // ═══════════════════════════════════════════════════════════════
      // EDGE FUNCTIONS
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'ai-search-extract: extraction intent via Gemini 2.5 Flash avec JSON strict' },
      { type: 'improvement', description: 'unified-search refactoré pour pipeline 5 étapes complète' },
      { type: 'improvement', description: 'Bloc interpretation dans chaque réponse (metricId, période, filtres, engine)' },
      { type: 'improvement', description: 'Bloc debug (N6 only) avec llmDraft, corrections, timing' },
    ],
  },
  {
    version: "V0.7.2",
    title: "StatIA NL Routing – Amélioration compréhension langage naturel",
    date: "2025-12-06",
    changes: [
      // ═══════════════════════════════════════════════════════════════
      // STATIA NL ROUTING - DÉTECTION & PARSING
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'Ajout keywords recouvrement (encours, impayé, dû client, reste encaisser) dans STATS_KEYWORDS' },
      { type: 'feature', description: 'Routing "recouvrement" → métrique reste_a_encaisser (montant) par défaut, taux explicite' },
      { type: 'feature', description: 'Parsing période "au [jour] [mois]" - ex: "au 30 octobre" = 1er janvier → 30 oct' },
      { type: 'feature', description: 'Parsing période "jusqu\'au [jour] [mois]" - même logique avec préfixe jusqu\'au' },
      { type: 'improvement', description: 'extractPeriode utilise désormais la query normalisée pour meilleure détection' },
      { type: 'improvement', description: 'Fallback période 12 derniers mois si non détectée (jamais vide)' },
      
      // ═══════════════════════════════════════════════════════════════
      // SYNCHRONISATION FRONTEND / EDGE FUNCTION
      // ═══════════════════════════════════════════════════════════════
      { type: 'improvement', description: 'Synchronisation dictionaries.ts (frontend) et unified-search (edge function)' },
      { type: 'improvement', description: 'SPECIALIZED_METRICS: règles taux recouvrement vs montant recouvrement séparées' },
      
      // ═══════════════════════════════════════════════════════════════
      // ARCHITECTURE NL → STATIA (SPEC IMPLANTÉE ~80%)
      // ═══════════════════════════════════════════════════════════════
      { type: 'audit', description: 'isStatsQuery: détection requêtes stats via STATS_KEYWORDS étendu' },
      { type: 'audit', description: 'parseStatQuery: extraction dimension, intent, univers, période, topN, technicien' },
      { type: 'audit', description: 'detectDimension: apporteur, technicien, univers, agence, site, client_type' },
      { type: 'audit', description: 'detectIntent: top, moyenne, volume, taux, delay, compare, valeur' },
      { type: 'audit', description: 'NL_ROUTING_RULES + SPECIALIZED_METRICS: ~30 règles métier implémentées' },
      { type: 'audit', description: 'TYPO_CORRECTIONS: correcteur orthographique basique intégré' },
      { type: 'audit', description: 'Permissions: minRole vérifié, accessDenied géré, scope agence respecté' },
      
      // ═══════════════════════════════════════════════════════════════
      // À IMPLÉMENTER (SPEC RESTANTE ~20%)
      // ═══════════════════════════════════════════════════════════════
      { type: 'audit', description: 'TODO: stat_ambiguous - gestion cas multi-métriques possibles' },
      { type: 'audit', description: 'TODO: stat_cache - cache applicatif (metricId, agencyId, period, filters)' },
      { type: 'audit', description: 'TODO: Pré-agrégations SQL (factures_aggr_day, factures_aggr_month)' },
      { type: 'audit', description: 'TODO: stats_queries_history - stockage questions validées' },
      { type: 'audit', description: 'TODO: Scope réseau N3+ complet (allowedAgencyIds)' },
      { type: 'audit', description: 'PROPOSITION: Parsing LLM pour compréhension générale (évite ajouts manuels)' },
    ],
  },
  {
    version: "V0.7.1",
    title: "Migration StatIA – Page Techniciens",
    date: "2025-12-06",
    changes: [
      { type: 'feature', description: 'Création du hook useTechniciensStatia centralisant les appels métriques' },
      { type: 'feature', description: 'Connexion de la page IndicateursTechniciens aux métriques StatIA' },
      { type: 'feature', description: 'Affichage de 4 KPIs globaux : Nb Techniciens, CA Total, Heures productives, CA/Heure' },
      { type: 'feature', description: 'Widget Top 5 Techniciens avec couleurs personnalisées' },
      { type: 'feature', description: 'Heatmap technicien × univers alimentée par ca_par_technicien_univers' },
      { type: 'improvement', description: 'Métriques utilisées : ca_par_technicien_univers, ca_par_technicien, top_techniciens_ca, ca_moyen_par_heure_tous_techniciens, nb_heures_productives, nb_interventions_par_technicien' },
    ],
  },
  {
    version: 'V0.7.0',
    date: '2025-12-06',
    title: 'StatIA - Migration complète pages Statistiques Agence',
    changes: [
      // ═══════════════════════════════════════════════════════════════
      // STATIA - NOUVELLES MÉTRIQUES UNIVERS
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'StatIA: Métrique interventions_par_univers - nombre d\'interventions par univers métier' },
      { type: 'feature', description: 'StatIA: Métrique taux_sav_par_univers - taux SAV (dossiers avec SAV / total) par univers' },
      { type: 'feature', description: 'StatIA: Métrique ca_mensuel_par_univers - évolution mensuelle CA empilé par univers' },
      { type: 'feature', description: 'StatIA: Métrique taux_transfo_par_univers - ratio CA facturé/devisé par univers' },
      { type: 'feature', description: 'StatIA: Métrique matrix_univers_apporteur - matrice croisée univers × type apporteur' },
      
      // ═══════════════════════════════════════════════════════════════
      // HOOK & PAGE UNIVERS
      // ═══════════════════════════════════════════════════════════════
      { type: 'improvement', description: 'Hook useUniversStatia centralisé: 8 métriques en appels parallèles' },
      { type: 'improvement', description: 'Page Indicateurs Univers: toutes tuiles, graphiques et matrice alimentés par StatIA' },
      { type: 'improvement', description: 'Suppression calculs legacy universCalculations/universExtendedCalculations' },
      { type: 'improvement', description: 'UniversKpiCard: CA, dossiers, panier, interventions, taux SAV depuis StatIA' },
      { type: 'improvement', description: 'UniversStackedChart: CA mensuel empilé depuis StatIA' },
      { type: 'improvement', description: 'UniversTransfoChart: taux transformation depuis StatIA' },
      { type: 'improvement', description: 'UniversApporteurMatrix: matrice croisée depuis StatIA' },
      
      // ═══════════════════════════════════════════════════════════════
      // STATIA - MÉTRIQUES APPORTEURS (V0.6.9)
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'StatIA: Métrique ca_par_type_apporteur - ventilation CA HT par catégorie' },
      { type: 'feature', description: 'StatIA: Métrique dossiers_par_type_apporteur - nombre dossiers par type' },
      { type: 'feature', description: 'StatIA: Métrique panier_moyen_par_type_apporteur - CA/dossier par catégorie' },
      { type: 'feature', description: 'StatIA: Métrique taux_transfo_par_type_apporteur - taux transformation par type' },
      { type: 'feature', description: 'StatIA: Métrique taux_sav_par_type_apporteur - taux SAV par type d\'apporteur' },
      { type: 'feature', description: 'StatIA: Métrique ca_mensuel_segmente - répartition mensuelle CA Apporteurs vs Particuliers' },
      { type: 'feature', description: 'StatIA: Métrique encours_par_apporteur - montant restant à encaisser par apporteur' },
      
      // ═══════════════════════════════════════════════════════════════
      // HOOK & PAGE APPORTEURS
      // ═══════════════════════════════════════════════════════════════
      { type: 'improvement', description: 'Hook useApporteursStatia: 12 métriques en appels parallèles' },
      { type: 'improvement', description: 'Page Indicateurs Apporteurs: KPIs, Top/Flop widgets alimentés par StatIA' },
      { type: 'improvement', description: 'Normalisation types apporteurs uniforme' },
    ]
  },
  {
    version: 'V0.6.8',
    date: '2025-12-05',
    title: 'Conformité RGPD & UX Gestion de Projet',
    changes: [
      // ═══════════════════════════════════════════════════════════════
      // CONFORMITÉ RGPD
      // ═══════════════════════════════════════════════════════════════
      { type: 'security', description: 'RGPD-03 : Cascade DELETE sur FK collaborateurs (documents, congés, contrats, demandes)' },
      { type: 'security', description: 'RGPD-05 : Migration données sensibles vers table dédiée (NSS, date naissance, contacts urgence)' },
      { type: 'feature', description: 'Hook useSensitiveData pour gestion séparée des données personnelles sensibles' },
      
      // ═══════════════════════════════════════════════════════════════
      // MODULE GESTION DE PROJET - UX
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'Brouillons persistants : messages sauvegardés en localStorage, restaurés à réouverture ticket' },
      { type: 'feature', description: 'Recherche par numéro ticket : supporte APO-123, apo-123, ou 123' },
      { type: 'feature', description: 'Édition messages envoyés : modification possible avec marqueur "(modifié)" et notification' },
      { type: 'improvement', description: 'Filtres PEC et Nouveaux messages déplacés inline avec autres filtres' },
      { type: 'fix', description: 'Documents joints : correction chemin basePath FileManager pour affichage/téléchargement' },
    ]
  },
  {
    version: 'V0.6.7',
    date: '2025-12-05',
    title: 'Partage d\'écran Support & Messagerie améliorée',
    changes: [
      { type: 'feature', description: 'Partage d\'écran temps réel entre utilisateur et agent support via WebRTC' },
      { type: 'feature', description: 'Bouton "Voir l\'écran" dans console support pour chat humain' },
      { type: 'feature', description: 'Signaling WebRTC via Supabase Realtime (offres/réponses SDP, candidats ICE)' },
      { type: 'feature', description: 'Suppression de conversation messagerie (soft delete côté utilisateur uniquement)' },
      { type: 'improvement', description: 'Interface de consentement utilisateur avant partage d\'écran' },
      { type: 'improvement', description: 'Menu contextuel sur conversations avec option supprimer' },
    ]
  },
  {
    version: 'V0.6.6',
    date: '2025-12-05',
    title: 'Synchronisation Auto Collaborateurs & Corrections UI',
    changes: [
      { type: 'feature', description: 'Trigger auto_create_collaborator : création automatique du collaborateur quand un utilisateur est affecté à une agence' },
      { type: 'fix', description: 'Correction alignement liste utilisateurs admin (colonnes fixes, badges MDP provisoire)' },
      { type: 'fix', description: 'Correction décalage visuel modal ajout documents RH (footer aligné)' },
    ]
  },
  {
    version: 'V0.6.5',
    date: '2025-12-05',
    title: 'Gestion de Projet V2 & Template Email',
    changes: [
      // ═══════════════════════════════════════════════════════════════
      // MODULE GESTION DE PROJET - AMÉLIORATIONS MAJEURES
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'Transitions universelles : tous les utilisateurs peuvent déplacer les tickets entre tous les statuts (sans restriction de rôle)' },
      { type: 'feature', description: 'Fusion de tickets dupliqués : sélection du ticket principal, transfert messages/pièces jointes, ticket source marqué "fusionné"' },
      { type: 'feature', description: 'Filtre "Nouveaux messages" : bouton clignotant vert quand tickets non-lus, badge compteur dans header colonne' },
      { type: 'feature', description: 'Système de notification clignotant : indicateur vert sur cartes avec nouveaux messages d\'autres utilisateurs' },
      { type: 'feature', description: 'Détection tickets incomplets : vérification 4 champs (module, heat_priority, h_min/h_max, owner_side/PEC)' },
      { type: 'improvement', description: 'Page tickets incomplets avec filtres par type d\'incomplétude et changement statut direct' },
      { type: 'improvement', description: 'Historique complet des transitions accessible à tous les utilisateurs' },
      
      // ═══════════════════════════════════════════════════════════════
      // EMAIL & CORRECTIONS
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'Template email de bienvenue professionnel (couleurs HelpConfort, responsive)' },
      { type: 'fix', description: 'Correction lien email : www.helpconfort.services (au lieu de helpconfort.services)' },
    ]
  },
  {
    version: 'V0.6.4',
    date: '2025-12-04',
    title: 'Audits Pré-production & Corrections Complètes',
    changes: [
      // ═══════════════════════════════════════════════════════════════
      // AUDITS RÉALISÉS
      // ═══════════════════════════════════════════════════════════════
      { type: 'audit', description: '📋 AUDIT MODULE SUPPORT - Score final 100% production ready' },
      { type: 'audit', description: '📋 AUDIT MODULE RH - Score final 100% (P0/P1/P2 corrigés)' },
      { type: 'audit', description: '📋 AUDIT SOCLE TECHNIQUE & SÉCURITÉ - 12 composants validés' },
      { type: 'audit', description: '📋 AUDIT NAVIGATION & UX GLOBALE - 7 composants validés' },
      { type: 'audit', description: '📋 AUDIT MODULE GESTION DE PROJET - Score 94%' },
      { type: 'audit', description: '📋 AUDIT MODULE PILOTAGE FRANCHISEUR - Score 95%' },
      { type: 'audit', description: '📋 AUDIT MODULE PILOTAGE AGENCE - Règles métier validées' },
      { type: 'audit', description: '📋 AUDIT MODULE HELP ACADEMY - RAG et permissions validés' },
      { type: 'audit', description: '📋 AUDIT MODULE CHAT INTERNE - RLS et Realtime validés' },
      { type: 'audit', description: '📋 AUDIT MODULE ANNONCES RÉSEAU - Ciblage par rôle corrigé' },
      { type: 'audit', description: '📋 AUDIT MODULE ALERTES RÉSEAU - SLA auto implémenté' },
      { type: 'audit', description: '📋 AUDIT ADMIN/CONFIGURATION - Proxy API sécurisé' },
      
      // ═══════════════════════════════════════════════════════════════
      // CORRECTIONS MODULE SUPPORT (SUP-P0/P1/P2)
      // ═══════════════════════════════════════════════════════════════
      { type: 'security', description: 'SUP-P0-01: Indexes ajoutés sur support_tickets (type, status, viewed_by_support_at)' },
      { type: 'fix', description: 'SUP-P0-03: Edge function notify-support-ticket hardened (timeout 10s, partial success)' },
      { type: 'fix', description: 'SUP-P1-01: Notifications popup réactivées dans use-support-notifications.ts' },
      { type: 'fix', description: 'SUP-P1-03: Pagination serveur implémentée avec range() dans use-admin-tickets.ts' },
      { type: 'fix', description: 'SUP-P1-04: UUID tronqué → getAgentName() helper affiche noms complets' },
      { type: 'fix', description: 'SUP-P1-05: Validation Zod ChatbotConversationSchema créée' },
      { type: 'security', description: 'SUP-P1-06: RLS notes internes renforcé (is_internal_note filtre)' },
      { type: 'feature', description: 'SUP-P2-02: Historique d\'actions (support_ticket_actions + TicketActionHistory)' },
      { type: 'feature', description: 'SUP-P2-03: Export CSV des tickets (TicketExportCSV.tsx)' },
      { type: 'improvement', description: 'SUP-P2-04: Dark mode couleurs badges heat priority corrigées' },
      
      // ═══════════════════════════════════════════════════════════════
      // CORRECTIONS MODULE RH (RH-P0/P1/P2)
      // ═══════════════════════════════════════════════════════════════
      { type: 'security', description: 'RH-P0-02: RLS policy rate_limits "no_public_access" ajoutée' },
      { type: 'security', description: 'RH-P1-01: DELETE policy sur document_requests pour N2+' },
      { type: 'fix', description: 'RH-P1-03: useRef cleanup unlock pour éviter stale closure' },
      { type: 'improvement', description: 'RH-P2-01: DocumentPreviewModal responsive mobile optimisé' },
      
      // ═══════════════════════════════════════════════════════════════
      // CORRECTIONS GÉNÉRALES
      // ═══════════════════════════════════════════════════════════════
      { type: 'improvement', description: 'bg-white→bg-background migration (15+ fichiers pour dark mode)' },
      { type: 'improvement', description: 'aria-label ajoutés sur 20+ icônes interactives' },
      { type: 'improvement', description: 'Terminologie "Gestion de Projet" unifiée partout' },
      { type: 'improvement', description: 'Suppression hooks legacy (useNetworkStats.ts, usePeriodComparison.ts)' },
      { type: 'fix', description: 'Error401/403/404/500 pages avec GlobalErrorBoundary validés' },
      { type: 'fix', description: 'Session handling et refresh tokens validés' },
      
      // ═══════════════════════════════════════════════════════════════
      // MODULE RT INTERVENTIONS (nouveau)
      // ═══════════════════════════════════════════════════════════════
      { type: 'feature', description: 'Module RT Interventions - Prototype mobile-first pour techniciens' },
      { type: 'feature', description: 'RT Planning - Liste interventions avec filtres jour/demain/tous' },
      { type: 'feature', description: 'RT Question Runner - Arbre décisionnel avec auto-save et photos' },
      { type: 'feature', description: 'RT PDF génération - Document horodaté avec tampon agence' },
      { type: 'feature', description: 'Intégration API getInterventionsCreneaux pour planning technicien' },
    ],
    auditLinks: [
      { label: 'Session Audit 04/12', path: '/docs/AUDIT_SESSION_2024-12-04.md' },
      { label: 'Audit Module Support', path: '/docs/AUDIT_MODULE_SUPPORT.md' },
      { label: 'Audit Module RH', path: '/docs/AUDIT_MODULE_PILOTAGE_AGENCE.md' },
      { label: 'Audit Gestion Projet', path: '/docs/AUDIT_MODULE_GESTION_PROJET.md' },
      { label: 'Audit Pilotage Franchiseur', path: '/docs/AUDIT_MODULE_PILOTAGE_FRANCHISEUR.md' },
      { label: 'Audit Chat Interne', path: '/docs/AUDIT_MODULE_CHAT_INTERNE.md' },
      { label: 'Audit Annonces Réseau', path: '/docs/AUDIT_MODULE_ANNONCES_RESEAU.md' },
      { label: 'Audit Permissions', path: '/docs/AUDIT_PERMISSIONS_FINDINGS_SUMMARY.md' },
      { label: 'Audit Admin/Config', path: '/docs/AUDIT_MODULE_ADMIN_CONFIGURATION.md' },
      { label: 'Audits Complets', path: '/docs/AUDITS_COMPLETS.md' },
    ]
  },
  {
    version: 'V0.6.3',
    date: '2025-12-04',
    title: 'Messagerie interne intra-agence',
    changes: [
      { type: 'feature', description: 'Système de messagerie instantanée interne entre collaborateurs d\'une même agence' },
      { type: 'feature', description: 'Widget messagerie intégré au header avec badge notifications non-lues' },
      { type: 'feature', description: 'Conversations privées (1:1) et groupes de discussion' },
      { type: 'feature', description: 'Widget chatbot "Aide en direct" intégré au header avec sélection de thèmes' },
      { type: 'improvement', description: 'Interface unifiée header : AIDE EN DIRECT (gauche) et MESSAGERIE INTERNE (droite)' },
      { type: 'improvement', description: 'Suppression de la bulle flottante chatbot au profit du widget header' },
      { type: 'improvement', description: 'Indicateurs temps réel de présence et messages non-lus' },
    ]
  },
  {
    version: 'V0.6.2',
    date: '2025-12-03',
    title: 'Audit Sécurité API Apogée & Conformité RGPD',
    changes: [
      { type: 'security', description: '🔍 AUDIT : Scan complet du code - clés API, appels directs, RLS, CORS, rate-limiting' },
      { type: 'security', description: '📋 PRÉCONISATIONS : Migration obligatoire vers proxy sécurisé, isolation agences, JWT systématique' },
      { type: 'security', description: '✅ ACTIONS : Création proxy-apogee Edge Function avec whitelist endpoints, rate-limit 30 req/min/user' },
      { type: 'security', description: '✅ ACTIONS : Suppression clé API hardcodée (SlideCATechniciens.tsx), migration vers apogeeProxy' },
      { type: 'security', description: '✅ ACTIONS : Migration complète networkDataService, useAgencyMonthlyCA, computeEngine vers proxy' },
      { type: 'security', description: '📊 RÉSULTAT : Score sécurité 60/100 → 95/100, 0 clé exposée côté client, 0 appel API direct' },
      { type: 'security', description: '📁 ÉTAT ACTUEL : Documentation SECURITY.md + SECURITY-AUDIT-REPORT.md générée (voir /docs)' },
      { type: 'improvement', description: 'Client TypeScript apogeeProxy.ts avec méthodes typées (getFactures, getProjects, getAllData...)' },
      { type: 'improvement', description: 'Logs structurés sans données sensibles, CORS hardened, validation Zod des inputs' },
    ],
    auditLinks: [
      { label: 'Rapport Sécurité', path: '/docs/SECURITY-AUDIT-REPORT.md' },
      { label: 'Documentation Sécurité', path: '/docs/SECURITY.md' },
    ]
  },
  {
    version: 'V0.6.1',
    date: '2025-12-03',
    title: 'Création du Module RH complet',
    changes: [
      { type: 'feature', description: 'Module RH (Ressources Humaines) - gestion complète des collaborateurs agence' },
      { type: 'feature', description: 'Fiches collaborateurs avec informations personnelles, contrats et historique salarial' },
      { type: 'feature', description: 'GED RH - Gestion Électronique des Documents par collaborateur' },
      { type: 'feature', description: 'Coffre-fort RH salarié (/mon-coffre-rh) - espace personnel de documents' },
      { type: 'feature', description: 'Workflow de demandes de documents RH avec suivi lu/non-lu et pièces jointes' },
      { type: 'feature', description: 'Synchronisation automatique Profil ↔ Collaborateur via triggers DB' },
      { type: 'improvement', description: 'Permissions RH 3 niveaux : coffre (salarié), rh_viewer (équipe), rh_admin (paie)' },
      { type: 'improvement', description: 'Tuile GED avec dropdown collaborateurs - accès direct aux documents' },
      { type: 'security', description: 'RLS strictes - isolation des données RH par agence et niveau d\'accès' },
    ]
  },
  {
    version: 'V0.6.0',
    date: '2025-12-02',
    title: 'STATiA By BiJ - Moteur de règles métier',
    changes: [
      { type: 'feature', description: 'Création du module STATiA By BiJ - moteur de règles centralisé pour calculs métier HelpConfort' },
      { type: 'feature', description: 'Règles CA : source apiGetFactures.data.totalHT, états inclus (sent/paid/partial), avoirs soustraits automatiquement' },
      { type: 'feature', description: 'Règles Techniciens : types productifs (dépannage/travaux), non-productifs (RT/SAV/diagnostic), allocation proportionnelle au temps' },
      { type: 'feature', description: 'Règles Devis : taux transformation en nombre ET montant HT, résolution diagnostique type2="A DEFINIR"' },
      { type: 'feature', description: 'Règles Interventions : états valides (validated/done/finished), résolution automatique RT/TH/SAV' },
      { type: 'feature', description: 'Règles Univers/Apporteurs : allocation multi-univers uniforme ou pondérée, exclusion SAV des stats apporteurs' },
      { type: 'feature', description: 'Parser NLP avec synonymes métier (commanditaire→apporteur, tvx→travaux, garantie→sav)' },
      { type: 'feature', description: 'GroupBy dynamique : technicien, apporteur, univers, type_intervention, mois, semaine, année, ville, client, dossier' },
      { type: 'improvement', description: 'Intégration règles dans useMetricEngine et compute-metric edge function' },
      { type: 'improvement', description: 'Export JSON rules.json pour backend et interprétation IA' },
      { type: 'improvement', description: 'Helpers métier : resolveInterventionType, isProductiveIntervention, calculateNetAmount, normalizeSynonym' },
      { type: 'feature', description: 'Menu IA unifié dans toolbar Kanban : K-LifIA (qualification), IA-IA (doublons), Auto-Classeur (modules)' },
      { type: 'feature', description: 'Auto-Classeur IA : classification automatique des tickets sans module (seuil confiance 85%)' },
      { type: 'feature', description: 'Batch review pour Auto-Classeur avec sélection multiple et application groupée' },
    ]
  },
  {
    version: 'V0.5.2',
    date: '2025-12-02',
    title: 'Détection doublons IA, Import TRAITÉ, Support SA levels',
    changes: [
      { type: 'feature', description: 'Détection doublons IA pour tickets Apogée avec fusion manuelle et scan global Kanban' },
      { type: 'feature', description: 'Bouton "Tout fusionner" pour fusion batch des doublons détectés' },
      { type: 'feature', description: 'Import TRAITÉ pour importer des tickets directement en statut EN_PROD (DONE)' },
      { type: 'feature', description: 'Système de tags tickets (BUG, EVO, NTH) avec filtre multi-sélection' },
      { type: 'feature', description: 'Niveaux Support Agent (SA1/SA2/SA3) avec interface admin dédiée' },
      { type: 'feature', description: 'Tile infos agence avec date ouverture et date clôture bilan' },
      { type: 'feature', description: 'KPI Recouvrement avec taux et montants (facturé, encaissé, reste)' },
      { type: 'improvement', description: 'Lien retour parent dans header pour navigation hiérarchique' },
      { type: 'improvement', description: 'Sélecteur de période unifié (J/J-1/S/S-1/M/M-1/A/custom)' },
      { type: 'improvement', description: 'Formulaires création utilisateur unifiés admin/franchiseur/équipe' },
      { type: 'improvement', description: 'Règle automatique Dirigeant → N2 (franchisee_admin)' },
      { type: 'improvement', description: 'Fusion franchiseur_roles → global_role (N3=animateur, N4=directeur, N5+=dg)' },
      { type: 'improvement', description: 'Filtrage techniciens inactifs dans plannings et stats' },
      { type: 'fix', description: 'Correction embedding hashing pour détection doublons' },
      { type: 'fix', description: 'Correction qualification IA edge function errors' },
      { type: 'fix', description: 'Correction import priorité et global_role vide' },
      { type: 'fix', description: 'Correction calculs recouvrement TTC et structure données' },
      { type: 'fix', description: 'Correction chat text overflow et support notifications' },
      { type: 'security', description: 'Superadmin bypass complet des modules (N5+ accès total)' },
      { type: 'security', description: 'Support level gating renforcé (SA1/SA2/SA3)' },
    ]
  },
  {
    version: 'V0.5.1',
    date: '2025-12-02',
    title: 'Correction critique - Droits superadmin absolus',
    changes: [
      { 
        type: 'security', 
        description: 'RÈGLE ABSOLUE: Superadmin (N6) et Platform Admin (N5+) ont TOUS les modules et options activés automatiquement, sans dépendre de enabled_modules'
      },
      { 
        type: 'fix', 
        description: 'Correction hasModule() et hasModuleOption() dans accessControl.ts - bypass complet pour N5+, élimine lecture seule involontaire sur les droits'
      },
      { 
        type: 'fix', 
        description: 'Correction des politiques RLS sur apogee_tickets - N5+ ont accès complet à tous les tickets sans dépendre du module enabled_modules'
      },
    ]
  },
  {
    version: 'V0.5.0',
    date: '2025-12-01',
    title: 'Sprints 1-3: Fondations Sécurité, Permissions & Data Model',
    changes: [
      { type: 'security', description: 'P1.1 - RLS Franchiseur: can_access_agency() et get_user_assigned_agencies(). Policies réécrites sur animator_visits, expense_requests, royalty_*.' },
      { type: 'security', description: 'P1.2 - RLS Support Console (Option B): Console accessible aux support.agent=true + N5+. Fonction is_support_agent(). Policies support_tickets réécrites.' },
      { type: 'security', description: 'P1.3 - Migration agency_id: profiles.agency_id (UUID) comme source unique. Fonction get_user_agency_id(). Policies réécrites sur apogee_agencies.' },
      { type: 'improvement', description: 'P2.1 - Sémantique Support clarifiée: isSupportAgent→hasSupportAgentRole, canAccessSupportConsole→canAccessSupportConsoleUI (8 fichiers)' },
      { type: 'improvement', description: 'P2.2 - Guards centralisés vérifiés: 100% des protections dans App.tsx, 0% dans les pages' },
      { type: 'improvement', description: 'P2.3 - Navigation unifiée: canAccessFeature() centrale dans roleMatrix.ts pour tiles/nav/routes' },
      { type: 'improvement', description: 'P3.1 - Registre centralisé scopes (scopeRegistry.ts)' },
      { type: 'improvement', description: 'P3.2 - Documentation format unique enabled_modules V2' },
      { type: 'security', description: 'P3.3 - Suppression has_franchiseur_role() des RLS' },
      { type: 'improvement', description: 'P3.4 - Enum strict rag_context_type (7 valeurs)' },
      { type: 'feature', description: 'P3.5 - heat_priority unique (suppression priority texte)' },
    ],
    auditLinks: [
      { label: 'Sprint 1-2-3-4 Rapport Final', path: '/docs/SPRINT-1-2-3-4-RAPPORT-FINAL.md' },
      { label: 'P1 Sprint Security RLS', path: '/docs/P1-SPRINT-SECURITY-RLS.md' },
      { label: 'P2 Sprint Permissions', path: '/docs/P2-SPRINT-PERMISSIONS-GUARDS.md' },
      { label: 'P3 Sprint Data Model', path: '/docs/P3-SPRINT-DATA-MODEL.md' },
    ]
  },
  {
    version: 'V0.4.2',
    date: '2025-12-01',
    title: 'Audits de sécurité, permissions et fonctionnalités',
    changes: [
      { type: 'security', description: 'AUDIT F-SEC-CRIT-1: JWT validation via supabase.auth.getUser() au lieu de décodage manuel (update-user-email)' },
      { type: 'security', description: 'AUDIT F-SEC-5: Validation stricte agence - auto-création désactivée (create-user)' },
      { type: 'security', description: 'AUDIT F-SEC-1: Validation Zod centralisée dans _shared/validation.ts (chat-guide, qualify-ticket, network-kpis, create-user, update-user-email)' },
      { type: 'security', description: 'AUDIT F-SEC-2: Suppression logs sensibles email/agency_id (create-user, update-user-email, search-embeddings, chat-guide)' },
      { type: 'security', description: 'AUDIT F-SEC-3: Pagination .limit(200) sur notify-support-ticket + sanitize SMS' },
      { type: 'security', description: 'AUDIT F-SEC-4: Vérification rôle N3+ (franchisor_user) dans network-kpis' },
      { type: 'security', description: 'AUDIT F-SEC-6: Validation renforcée ticket_ids avec vérification UUID (qualify-ticket)' },
      { type: 'security', description: 'AUDIT F-RLS-4: Correction policy planning_signatures - tech_id cast invalide remplacé par signed_by_user_id' },
      { type: 'security', description: 'AUDIT F-PERM-1: Console support strictement réservée aux N5+ - suppression bypass via module option' },
      { type: 'security', description: 'AUDIT F-PERM-2: Groupe navigation Projects filtré selon module apogee_tickets activé' },
      { type: 'security', description: 'AUDIT F-PERM-3: Route /support/console protégée par SupportConsoleGuard dédié (N5+ strictement)' },
      { type: 'security', description: 'AUDIT F-EDIT-2: Agences dropdown filtrées selon manageScope (N2=ownAgency, N3=assignedAgencies, N4+=all)' },
      { type: 'security', description: 'AUDIT F-EDIT-4: Validation minRole pour activation modules - Switch désactivé si rôle utilisateur insuffisant' },
      { type: 'security', description: 'AUDIT PERMISSIONS: 12 findings identifiés - 2 critiques (Support Console Bypass, EditUserDialog incomplet), 4 élevés (module minRole, agence scope), 6 moyens (guards routes, scopeSlug)' },
      { type: 'fix', description: 'AUDIT F-MISC-1/F-MISC-2: Correction scopeSlug tiles (base_documentaire, rh_tech, mon_equipe)' },
      { type: 'improvement', description: 'AUDIT F-PERF-1: Parallélisation chargement agences (network-kpis) - Promise.all au lieu de boucle séquentielle' },
      { type: 'improvement', description: 'AUDIT F-TABLE-3: 14 index créés (chatbot_queries, support_tickets, apogee_tickets, profiles, franchiseur_assignments)' },
      { type: 'improvement', description: 'AUDIT FONCTIONNEL: Analyse complète 6 modules - 3 critiques identifiés (terminologie Apogée-Tickets, priorités support/apogée, statuts), 14h corrections pré-prod recommandées' },
    ],
    auditLinks: [
      { label: 'Audit Fonctionnel Modules', path: '/docs/AUDIT_FONCTIONNEL_MODULES.md' },
      { label: 'Audit Permissions', path: '/docs/AUDIT_PERMISSIONS_FINDINGS_SUMMARY.md' },
      { label: 'Corrections Audit Fonctionnel', path: '/docs/CORRECTIONS_AUDIT_FONCTIONNEL.md' },
    ]
  },
  {
    version: 'V0.4.1',
    date: '2025-12-01',
    title: 'Annonces prioritaires et communication réseau',
    changes: [
      { type: 'feature', description: 'Module d\'annonces prioritaires avec modal bloquante "J\'ai lu" / "Plus tard"' },
      { type: 'feature', description: 'Accès admin et franchiseur N3+ aux annonces depuis /admin et /hc-reseau' },
      { type: 'improvement', description: 'Tuile "Ouvrir un Ticket" sur page /support pour création rapide' },
      { type: 'improvement', description: 'Renommage "Bug Application" → "HC Services (ici)" dans création de ticket' },
      { type: 'improvement', description: 'Upload direct d\'image pour annonces (bucket Storage) au lieu d\'URL externe' },
      { type: 'improvement', description: 'Bouton "Plus tard" réaffiche l\'annonce à chaque connexion jusqu\'à lecture' },
      { type: 'improvement', description: 'Historique complet des annonces (actives/expirées) avec affichage du créateur et statistiques de lecture' },
      { type: 'fix', description: 'Gestion correcte du défilement des annonces multiples avec "Plus tard"' },
      { type: 'fix', description: 'Affichage automatique de l\'annonce suivante après avoir cliqué "J\'ai lu"' },
      { type: 'security', description: 'Permissions de suppression : N3+ peuvent supprimer uniquement leurs propres annonces, N5+ toutes les annonces' },
      { type: 'security', description: 'Restriction modification role_agence : uniquement Admin et N+1 peuvent modifier ce champ' },
      { type: 'improvement', description: 'Phase 1 - Élimination console.error (AnnouncementForm, use-announcements remplacés par logError)' },
      { type: 'improvement', description: 'Phase 1 - Types `any` éliminés dans useAgencies.ts (AgencyRow, ProfileRow, RoleRow)' },
      { type: 'improvement', description: 'Phase 1 - LocalErrorBoundary créé et intégré au Dashboard Apogée' },
      { type: 'improvement', description: 'Phase 2 - Élimination de 50% des types `any` (chart.tsx, use-chatbot.ts)' },
      { type: 'improvement', description: 'Phase 2 - React.memo ajouté sur composants lourds (UserAccordionItem, Landing)' },
      { type: 'improvement', description: 'Phase 2 - Debounce localStorage persistence chatbot (500ms)' },
      { type: 'improvement', description: 'Phase 3 - Skeleton loaders remplacent spinner générique (UserListSkeleton)' },
      { type: 'improvement', description: 'Phase 3 - React.memo ajouté sur 6 composants (ChartCard, MetricCard, UniversKpiCard, SortableCard)' },
      { type: 'improvement', description: 'Phase 3 - Bibliothèque react-window installée (préparation virtualisation listes longues)' },
    ]
  },
  {
    version: 'V0.4.0',
    date: '2025-12-01',
    title: 'Release Pré-production',
    changes: [
      { type: 'feature', description: 'Page historique des versions avec design cohérent' },
      { type: 'security', description: 'Hardening CORS et JWT sur toutes les edge functions' },
      { type: 'security', description: 'Rate limiting sur les endpoints sensibles' },
      { type: 'security', description: 'Audit RLS complet et correction des policies' },
      { type: 'feature', description: 'Intégration Sentry pour le monitoring d\'erreurs' },
      { type: 'improvement', description: 'React Query robustesse - élimination des undefined returns' },
      { type: 'feature', description: 'SLA automatique sur les tickets support' },
      { type: 'feature', description: 'Classification IA des tickets support' },
      { type: 'feature', description: 'RAG consolidé avec Mme MICHU chatbot' },
    ]
  },
  {
    version: 'V0.3.2',
    date: '2025-11-25',
    title: 'Corrections et améliorations',
    changes: [
      { type: 'fix', description: 'Correction isolation données agence' },
      { type: 'improvement', description: 'Optimisation chargement statistiques' },
      { type: 'feature', description: 'Notifications blinking sur tickets modifiés' },
      { type: 'improvement', description: 'Refactoring 100% - tous les fichiers < 400 lignes' },
      { type: 'feature', description: 'Dashboard franchiseur avec top apporteurs podium' },
      { type: 'feature', description: 'Export multi-format Kanban (CSV/Excel/PDF)' },
    ]
  },
  {
    version: 'V0.3.0',
    date: '2025-11-15',
    title: 'Système de permissions V2',
    changes: [
      { type: 'feature', description: 'Nouveau système de rôles hiérarchiques (N0-N6)' },
      { type: 'feature', description: 'Modules activables par utilisateur' },
      { type: 'improvement', description: 'Simplification de l\'architecture d\'autorisation' },
    ]
  },
  {
    version: 'V0.2.5',
    date: '2025-11-08',
    title: 'Ticketing Apogée avancé',
    changes: [
      { type: 'feature', description: 'Vue liste avec colonnes triables et redimensionnables' },
      { type: 'feature', description: 'Export CSV/Excel/PDF du Kanban avec filtres' },
      { type: 'feature', description: 'Système de priorité heat (0-12)' },
      { type: 'feature', description: 'Notifications visuelles par bordures clignotantes' },
      { type: 'improvement', description: 'Automatisation author_type selon rôle utilisateur' },
    ]
  },
  {
    version: 'V0.2.0',
    date: '2025-11-03',
    title: 'Support et ticketing',
    changes: [
      { type: 'feature', description: 'Système de tickets support avec SLA automatique' },
      { type: 'feature', description: 'Classification IA des tickets (catégorie, priorité, tags)' },
      { type: 'feature', description: 'Centre d\'aide avec FAQ et chatbot Mme MICHU' },
      { type: 'feature', description: 'Chat temps réel avec équipe support' },
      { type: 'security', description: 'RLS policies sur support_tickets et support_messages' },
    ]
  },
  {
    version: 'V0.1.5',
    date: '2025-10-30',
    title: 'Franchiseur & réseau',
    changes: [
      { type: 'feature', description: 'Dashboard franchiseur avec KPI réseau' },
      { type: 'feature', description: 'Gestion des agences et redevances' },
      { type: 'feature', description: 'Statistiques multi-agences avec filtres période' },
      { type: 'feature', description: 'Top 3 apporteurs avec podium' },
      { type: 'improvement', description: 'Isolation données par agence' },
    ]
  },
  {
    version: 'V0.1.0',
    date: '2025-10-29',
    title: 'Pilotage agence et indicateurs',
    changes: [
      { type: 'feature', description: 'Module "Mes indicateurs" avec KPI Apogée' },
      { type: 'feature', description: 'Intégration API Apogée multi-agences' },
      { type: 'feature', description: 'Dashboard avec filtres période (Jour, Semaine, Mois, Année)' },
      { type: 'feature', description: 'Widgets CA, interventions, projets, techniciens' },
      { type: 'improvement', description: 'Calculs d\'agrégation côté frontend' },
    ]
  },
  {
    version: 'V0.0.5',
    date: '2025-09-26',
    title: 'Guides et documentation',
    changes: [
      { type: 'feature', description: 'Help Academy avec guides Apogée, Apporteurs, HelpConfort' },
      { type: 'feature', description: 'Système de blocs éditables avec TipTap' },
      { type: 'feature', description: 'Upload et gestion de documents PDF' },
      { type: 'feature', description: 'Historique de navigation et favoris' },
      { type: 'improvement', description: 'Architecture modulaire par catégories' },
    ]
  },
  {
    version: 'V0.0.1',
    date: '2025-09-24',
    title: 'Version initiale',
    changes: [
      { type: 'feature', description: 'Authentification Supabase avec profils utilisateurs' },
      { type: 'feature', description: 'Layout unifié avec sidebar et header' },
      { type: 'feature', description: 'Dashboard d\'accueil avec tuiles de navigation' },
      { type: 'feature', description: 'Gestion des utilisateurs (admin)' },
      { type: 'feature', description: 'Système de thème clair/sombre' },
    ]
  },
];

/**
 * Obtenir la version actuelle (première entrée du changelog)
 */
export function getCurrentVersion(): ChangelogEntry {
  return CHANGELOG[0];
}

/**
 * Obtenir les versions précédentes (toutes sauf la première)
 */
export function getPreviousVersions(): ChangelogEntry[] {
  return CHANGELOG.slice(1);
}

/**
 * Configuration des badges de type de changement
 */
export const CHANGE_TYPE_CONFIG = {
  feature: {
    label: 'Nouveauté',
    emoji: '🟢',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-700',
  },
  fix: {
    label: 'Correction',
    emoji: '🔵',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
  },
  improvement: {
    label: 'Amélioration',
    emoji: '🟡',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-700',
  },
  security: {
    label: 'Sécurité',
    emoji: '🔴',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
  },
  audit: {
    label: 'Audit',
    emoji: '📋',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-700',
  },
} as const;

import { jsPDF } from 'jspdf';

export async function exportModulesDocumentationPdf(): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkPageBreak = (neededSpace: number) => {
    if (y + neededSpace > pageHeight - margin) {
      addPage();
    }
  };

  const addTitle = (text: string, size: number, color: [number, number, number] = [0, 0, 0]) => {
    checkPageBreak(size + 10);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y);
    y += size * 0.5 + 5;
  };

  const addParagraph = (text: string, size: number = 10) => {
    doc.setFontSize(size);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    checkPageBreak(lines.length * size * 0.4 + 5);
    doc.text(lines, margin, y);
    y += lines.length * size * 0.4 + 5;
  };

  const addBullet = (text: string, indent: number = 0) => {
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    const bulletX = margin + indent;
    const textX = bulletX + 5;
    const lines = doc.splitTextToSize(text, contentWidth - indent - 5);
    checkPageBreak(lines.length * 4 + 3);
    doc.text('•', bulletX, y);
    doc.text(lines, textX, y);
    y += lines.length * 4 + 3;
  };

  // Cover page
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENTATION', pageWidth / 2, 80, { align: 'center' });
  doc.text('MODULES', pageWidth / 2, 95, { align: 'center' });
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text('HelpConfort SaaS Platform', pageWidth / 2, 115, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 135, { align: 'center' });
  doc.text('Version 2.0', pageWidth / 2, 145, { align: 'center' });

  // Table of contents
  addPage();
  addTitle('TABLE DES MATIÈRES', 18, [30, 41, 59]);
  y += 5;
  const toc = [
    '1. Help Academy',
    '2. Apogee Connect',
    '3. Pilotage Agence',
    '4. Apogee Tickets',
    '5. Support',
    '6. RH & Parc',
    '7. Réseau Franchiseur',
    '8. Admin Plateforme',
    '9. Commercial',
    '10. Diffusion',
    '11. Maintenance',
    '12. Plans et Rôles'
  ];
  toc.forEach(item => addBullet(item));

  // Module 1: Help Academy
  addPage();
  addTitle('1. HELP ACADEMY', 16, [59, 130, 246]);
  addParagraph('Clé technique: help_academy');
  y += 3;
  addTitle('Description', 12);
  addParagraph('Base de connaissances centralisée pour les procédures, guides et formations du réseau HelpConfort. Plateforme d\'apprentissage autonome avec recherche intelligente.');
  addTitle('Utilisation', 12);
  addBullet('Consultation des guides métier structurés par catégories');
  addBullet('Recherche sémantique dans la documentation');
  addBullet('Système de favoris personnalisé');
  addBullet('Navigation hiérarchique (catégories → blocs → sous-blocs)');
  addTitle('Particularités', 12);
  addBullet('Contenu éditorial géré par l\'équipe centrale');
  addBullet('Deux contextes: HelpConfort (procédures) et Apporteurs (spécifiques partenaires)');
  addBullet('Intégration RAG pour recherche IA');
  addTitle('Sous-modules', 12);
  addBullet('apogee (Accès contenus Apogée) - Guides spécifiques au logiciel Apogée');
  addBullet('edition (Édition contenus) - Création/modification des blocs - Réservé N5/N6');
  addTitle('Accès', 12);
  addBullet('Lecture: Tous les utilisateurs authentifiés');
  addBullet('Édition: N5+ avec option edition activée');
  addTitle('Routes', 12);
  addParagraph('/helpconfort/*, /apporteurs/*');

  // Module 2: Apogee Connect
  addPage();
  addTitle('2. APOGEE CONNECT', 16, [34, 197, 94]);
  addParagraph('Clé technique: apogee_connect');
  y += 3;
  addTitle('Description', 12);
  addParagraph('Connexion temps réel au logiciel métier Apogée via API sécurisée. Permet la consultation des dossiers, interventions et données clients.');
  addTitle('Utilisation', 12);
  addBullet('Visualisation des dossiers en cours');
  addBullet('Suivi des interventions planifiées');
  addBullet('Accès aux informations clients (données sensibles masquées)');
  addBullet('Recherche unifiée dans les données Apogée');
  addTitle('Particularités', 12);
  addBullet('Données sensibles masquées côté serveur (RGPD)');
  addBullet('Accès contrôlé aux coordonnées via endpoint sécurisé');
  addBullet('Cache intelligent pour performances');
  addTitle('Sous-modules', 12);
  addBullet('Aucun sous-module - Module monolithique');
  addTitle('Accès', 12);
  addBullet('N1+ avec module activé dans le plan agence');
  addTitle('Routes', 12);
  addParagraph('/hc-agency/dossiers');

  // Module 3: Pilotage Agence
  addPage();
  addTitle('3. PILOTAGE AGENCE', 16, [168, 85, 247]);
  addParagraph('Clé technique: pilotage_agence');
  y += 3;
  addTitle('Description', 12);
  addParagraph('Tableau de bord statistique complet pour le pilotage de l\'activité agence. Intègre le moteur StatIA pour calculs KPI temps réel.');
  addTitle('Utilisation', 12);
  addBullet('Vue d\'ensemble CA, interventions, SAV');
  addBullet('Analyses par technicien, apporteur, univers');
  addBullet('Graphiques évolutifs et comparatifs');
  addBullet('Export données et rapports');
  addTitle('Particularités', 12);
  addBullet('Moteur StatIA centralisé (source unique de vérité)');
  addBullet('Persistance des filtres en session');
  addBullet('Animations et visualisations avancées');
  addTitle('Sous-modules', 12);
  addBullet('vue_ensemble - Dashboard principal avec KPIs globaux');
  addBullet('stats_techniciens - Analyse performance par technicien');
  addBullet('stats_apporteurs - Suivi CA par apporteur');
  addBullet('stats_univers - Répartition par univers métier');
  addBullet('veille - Alertes apporteurs dormants/en déclin');
  addBullet('previsionnel - Charge travaux à venir');
  addTitle('Accès', 12);
  addBullet('N2+ (dirigeants) avec module activé');
  addTitle('Routes', 12);
  addParagraph('/hc-agency/stats-hub, /hc-agency/veille-apporteurs');

  // Module 4: Apogee Tickets
  addPage();
  addTitle('4. APOGEE TICKETS', 16, [249, 115, 22]);
  addParagraph('Clé technique: apogee_tickets');
  y += 3;
  addTitle('Description', 12);
  addParagraph('Système de gestion de projet interne pour le suivi des évolutions, bugs et demandes liées au logiciel Apogée.');
  addTitle('Utilisation', 12);
  addBullet('Création et suivi de tickets');
  addBullet('Vue Kanban avec drag & drop');
  addBullet('Classification automatique par IA');
  addBullet('Historique des modifications');
  addTitle('Particularités', 12);
  addBullet('Workflow personnalisable par rôle');
  addBullet('Auto-classifieur IA pour modules');
  addBullet('Système de heat priority');
  addTitle('Sous-modules', 12);
  addBullet('kanban - Vue tableau Kanban + création tickets');
  addBullet('manage - Édition des champs ticket');
  addBullet('import - Import en masse depuis Excel');
  addTitle('Accès', 12);
  addBullet('Participation: Tous avec module activé');
  addBullet('Gestion: Option manage requise');
  addBullet('Import: Option import requise (N4+)');
  addTitle('Routes', 12);
  addParagraph('/admin/apogee-tickets');

  // Module 5: Support
  addPage();
  addTitle('5. SUPPORT', 16, [236, 72, 153]);
  addParagraph('Clé technique: support');
  y += 3;
  addTitle('Description', 12);
  addParagraph('Système de support utilisateur complet avec tickets, chat en direct et base de connaissances FAQ.');
  addTitle('Utilisation', 12);
  addBullet('Création de demandes d\'assistance');
  addBullet('Chat en direct avec agents');
  addBullet('Consultation FAQ intelligente');
  addBullet('Suivi des tickets en cours');
  addTitle('Particularités', 12);
  addBullet('Double facette: module agence + console agent');
  addBullet('Niveaux agents SA1/SA2/SA3');
  addBullet('Recherche IA dans FAQ');
  addTitle('Sous-modules', 12);
  addBullet('user - Interface utilisateur (tickets, FAQ)');
  addBullet('agent - Console agent support (N4+ requis)');
  addTitle('Accès', 12);
  addBullet('Création ticket: Tous authentifiés');
  addBullet('Console agent: support_role = agent + module activé');
  addTitle('Routes', 12);
  addParagraph('/support/*, /admin/support');

  // Module 6: RH & Parc
  addPage();
  addTitle('6. RH & PARC', 16, [20, 184, 166]);
  addParagraph('Clé technique: rh_parc');
  y += 3;
  addTitle('Description', 12);
  addParagraph('Gestion des ressources humaines et du parc matériel de l\'agence. Coffre-fort numérique pour documents salariés.');
  addTitle('Utilisation', 12);
  addBullet('Gestion des collaborateurs');
  addBullet('Documents RH (bulletins, contrats)');
  addBullet('Suivi des véhicules et équipements');
  addBullet('Demandes de documents');
  addTitle('Particularités', 12);
  addBullet('Données sensibles chiffrées');
  addBullet('Fusion automatique User ↔ Collaborateur');
  addBullet('Alertes échéances (CT, visites médicales)');
  addTitle('Sous-modules', 12);
  addBullet('rh - Documents, salaires, contrats');
  addBullet('parc - Véhicules, EPI, équipements');
  addTitle('Accès', 12);
  addBullet('RH: N2+ avec option rh activée');
  addBullet('Mon coffre: Collaborateurs (leurs propres documents)');
  addTitle('Routes', 12);
  addParagraph('/hc-agency/equipe, /mon-coffre-rh');

  // Module 7: Réseau Franchiseur
  addPage();
  addTitle('7. RÉSEAU FRANCHISEUR', 16, [99, 102, 241]);
  addParagraph('Clé technique: reseau_franchiseur');
  y += 3;
  addTitle('Description', 12);
  addParagraph('Outils de pilotage réseau pour les équipes franchiseur. Vue consolidée multi-agences et comparatifs.');
  addTitle('Utilisation', 12);
  addBullet('Dashboard réseau global');
  addBullet('Comparatif inter-agences');
  addBullet('Gestion des visites animateurs');
  addBullet('Attribution animateurs aux agences');
  addTitle('Particularités', 12);
  addBullet('Données anonymisées pour statistiques');
  addBullet('Filtres agences persistants');
  addBullet('Export rapports consolidés');
  addTitle('Sous-modules', 12);
  addBullet('dashboard - Vue réseau globale');
  addBullet('comparatif - Tableaux comparatifs agences');
  addBullet('visites - Gestion visites animateurs');
  addBullet('utilisateurs - Gestion users réseau');
  addTitle('Accès', 12);
  addBullet('N3+ (Animateurs, Directeurs, Admin)');
  addTitle('Routes', 12);
  addParagraph('/hc-reseau/*');

  // Module 8: Admin Plateforme
  addPage();
  addTitle('8. ADMIN PLATEFORME', 16, [239, 68, 68]);
  addParagraph('Clé technique: admin_plateforme');
  y += 3;
  addTitle('Description', 12);
  addParagraph('Administration centrale de la plateforme. Gestion des utilisateurs, plans, modules et configuration système.');
  addTitle('Utilisation', 12);
  addBullet('Console Droits & Accès unifiée');
  addBullet('Gestion des plans tarifaires');
  addBullet('Configuration modules par agence');
  addBullet('Monitoring système');
  addTitle('Particularités', 12);
  addBullet('Audit trail complet');
  addBullet('Feature flags dynamiques');
  addBullet('Export base de données');
  addTitle('Sous-modules', 12);
  addBullet('users - Gestion utilisateurs globale');
  addBullet('agencies - Configuration agences');
  addBullet('plans - Édition plans tarifaires');
  addBullet('system - Configuration système');
  addTitle('Accès', 12);
  addBullet('N4+ pour gestion utilisateurs');
  addBullet('N5+ pour plans et système');
  addTitle('Routes', 12);
  addParagraph('/admin/*');

  // Module 9: Commercial
  addPage();
  addTitle('9. COMMERCIAL', 16, [245, 158, 11]);
  addParagraph('Clé technique: commercial');
  y += 3;
  addTitle('Description', 12);
  addParagraph('Outils de génération de présentations commerciales et fiches agence personnalisées.');
  addTitle('Utilisation', 12);
  addBullet('Génération PowerPoint automatique');
  addBullet('Fiche agence personnalisable');
  addBullet('Templates présentations');
  addTitle('Sous-modules', 12);
  addBullet('pptx - Génération présentations');
  addBullet('fiche_agence - Profil commercial agence');
  addTitle('Accès', 12);
  addBullet('N2+ avec module activé');
  addTitle('Routes', 12);
  addParagraph('/hc-agency/commercial');

  // Module 10: Diffusion
  addPage();
  addTitle('10. DIFFUSION', 16, [6, 182, 212]);
  addParagraph('Clé technique: diffusion');
  y += 3;
  addTitle('Description', 12);
  addParagraph('Système d\'affichage dynamique pour écrans en agence. Rotation automatique de slides d\'information.');
  addTitle('Utilisation', 12);
  addBullet('Configuration slides actives');
  addBullet('Paramétrage vitesse rotation');
  addBullet('Affichage objectifs et KPIs');
  addTitle('Sous-modules', 12);
  addBullet('Aucun sous-module');
  addTitle('Accès', 12);
  addBullet('N2+ pour configuration');
  addBullet('Affichage public via route dédiée');
  addTitle('Routes', 12);
  addParagraph('/diffusion, /diffusion/settings');

  // Module 11: Maintenance
  addPage();
  addTitle('11. MAINTENANCE', 16, [107, 114, 128]);
  addParagraph('Clé technique: maintenance');
  y += 3;
  addTitle('Description', 12);
  addParagraph('Gestion des contrats de maintenance et suivi des interventions récurrentes.');
  addTitle('Utilisation', 12);
  addBullet('Suivi contrats maintenance');
  addBullet('Planification interventions récurrentes');
  addBullet('Alertes échéances');
  addTitle('Sous-modules', 12);
  addBullet('Aucun sous-module');
  addTitle('Accès', 12);
  addBullet('N2+ avec module activé');
  addTitle('Routes', 12);
  addParagraph('/hc-agency/maintenance');

  // Plans et Rôles
  addPage();
  addTitle('12. PLANS ET RÔLES', 16, [30, 41, 59]);
  y += 5;
  addTitle('Plans Tarifaires', 14);
  addBullet('STARTER - Help Academy (apogee), Support (user), Pilotage (vue_ensemble)');
  addBullet('PRO - Tous les modules avec toutes les options');
  y += 5;
  addTitle('Hiérarchie des Rôles', 14);
  addBullet('N0 (Extérieur) - Accès minimal, créable uniquement par N5/N6');
  addBullet('N1 (Utilisateur) - Accès modules agence selon plan');
  addBullet('N2 (Dirigeant) - Pilotage agence, gestion équipe');
  addBullet('N3 (Animateur) - Multi-agences assignées');
  addBullet('N4 (Directeur) - Réseau complet');
  addBullet('N5 (Admin) - Administration plateforme');
  addBullet('N6 (Superadmin) - Accès absolu illimité');
  y += 5;
  addTitle('Options Exclues des Plans', 14);
  addParagraph('Certaines options ne sont jamais incluses dans les plans et nécessitent une activation individuelle:');
  addBullet('edition (Help Academy) - Réservé équipe éditoriale');
  addBullet('agent (Support) - Réservé agents support');

  // Footer on last page
  y = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('© 2025 HelpConfort - Documentation Modules v2.0', pageWidth / 2, y, { align: 'center' });

  return doc.output('blob');
}

export async function downloadModulesDocumentationPdf(): Promise<void> {
  const blob = await exportModulesDocumentationPdf();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `modules-documentation-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// jsPDF is loaded dynamically to reduce initial bundle size (~300KB)
type JsPDFInstance = InstanceType<typeof import('jspdf').default>;
import { 
  MODULES_DOCS, 
  EDGE_FUNCTIONS_DOCS, 
  TABLE_CATEGORIES, 
  SYSTEM_STATS,
  SECURITY_FEATURES,
  STATIA_METRICS_COUNT 
} from '@/config/docsData';

const COLORS = {
  primary: [0, 74, 173] as [number, number, number],       // HelpConfort Blue
  secondary: [243, 145, 55] as [number, number, number],   // HelpConfort Orange
  text: [30, 30, 30] as [number, number, number],
  muted: [100, 100, 100] as [number, number, number],
  light: [245, 245, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  error: [239, 68, 68] as [number, number, number],
};

interface ExportOptions {
  includeModules?: boolean;
  includeEdgeFunctions?: boolean;
  includeDatabase?: boolean;
  includeStatia?: boolean;
  includeSecurity?: boolean;
}

// ============================================================================
// COMPREHENSIVE DEVELOPER MANUAL DATA
// ============================================================================

const ROLE_HIERARCHY = [
  { level: 'N0', enum: 'base_user', description: 'Utilisateur de base', example: 'Technicien', capabilities: 'Accès lecture guides, création tickets support' },
  { level: 'N1', enum: 'agency_user', description: 'Utilisateur agence', example: 'Assistante', capabilities: 'N0 + pilotage agence, module RH coffre' },
  { level: 'N2', enum: 'agency_admin', description: 'Admin agence (dirigeant)', example: 'Gérant', capabilities: 'N1 + gestion équipe, RH complet, parc' },
  { level: 'N3', enum: 'franchisor_user', description: 'Utilisateur franchiseur', example: 'Animateur', capabilities: 'N2 + vue multi-agences assignées' },
  { level: 'N4', enum: 'franchisor_admin', description: 'Admin franchiseur', example: 'Directeur réseau', capabilities: 'N3 + toutes agences, redevances, visites' },
  { level: 'N5', enum: 'platform_admin', description: 'Admin plateforme', example: 'Admin HC', capabilities: 'N4 + gestion utilisateurs, configuration' },
  { level: 'N6', enum: 'superadmin', description: 'Super administrateur', example: 'CTO', capabilities: 'DROITS ABSOLUS - Aucune restriction' },
];


const RLS_PATTERNS = [
  { name: 'Accès personnel', code: 'USING (auth.uid() = user_id)', usage: 'Données propres à l\'utilisateur' },
  { name: 'Accès agence', code: 'USING (agency_id = get_user_agency_id())', usage: 'Données de son agence' },
  { name: 'Rôle minimum', code: 'USING (has_min_global_role(\'agency_admin\'))', usage: 'Contrôle par niveau' },
  { name: 'Module activé', code: 'USING (has_module_enabled(\'support\'))', usage: 'Contrôle par module' },
  { name: 'Combinaison', code: 'USING (has_min_global_role(\'N5\') OR agency_id = get_user_agency_id())', usage: 'Admin OU agence' },
];

const STATIA_RULES_CRITICAL = [
  { 
    rule: 'CA Source', 
    description: 'apiGetFactures.data.totalHT - Tous états inclus (draft, sent, paid, partial, overdue)',
    priority: 'info'
  },
  { 
    rule: 'Avoirs = Négatifs', 
    description: 'typeFacture === "avoir" ? -Math.abs(montant) : montant - JAMAIS exclure les avoirs',
    priority: 'critical'
  },
  { 
    rule: 'RT = 0 CA Technicien', 
    description: 'Les relevés techniques ne génèrent JAMAIS de CA technicien',
    priority: 'warning'
  },
  { 
    rule: 'SAV Détection Stricte', 
    description: 'type2 === "sav" OU visites[].type2 === "sav" OU pictosInterv contient "sav"',
    priority: 'critical'
  },
  { 
    rule: 'Isolation Agence', 
    description: 'URL dynamique: https://${profile.agence}.hc-apogee.fr/api/ - JAMAIS hardcodé',
    priority: 'critical'
  },
];

const GLOSSARY = [
  { term: 'Apporteur', definition: 'Commanditaire/prescripteur (assurance, bailleur, syndic...)' },
  { term: 'Univers', definition: 'Domaine métier (plomberie, électricité, rénovation, CVC...)' },
  { term: 'RT', definition: 'Relevé Technique - Visite diagnostic sans travaux' },
  { term: 'SAV', definition: 'Service Après-Vente - Reprise gratuite sous garantie' },
  { term: 'Avoir', definition: 'Note de crédit - Montant NÉGATIF dans les calculs CA' },
  { term: 'TVX', definition: 'Travaux - Intervention productive générant du CA' },
  { term: 'CA HT', definition: 'Chiffre d\'Affaires Hors Taxes' },
  { term: 'Dû client', definition: 'Montant restant à encaisser (calcReglementsReste)' },
  { term: 'Devis transformé', definition: 'Devis ayant généré une facture (états: validated, signed, order)' },
  { term: 'RLS', definition: 'Row Level Security - Politiques d\'accès données Supabase' },
  { term: 'Edge Function', definition: 'Fonction serverless Deno sur Supabase' },
  { term: 'JWT', definition: 'JSON Web Token - Jeton d\'authentification' },
];

const CHECKLIST_PRE_PROD = [
  'RLS Linter sans erreur critique',
  'Tous les Edge Functions avec verify_jwt = true',
  'Aucun console.log en production (remplacé par logError)',
  'Sentry configuré avec DSN',
  'Secrets en Supabase Secrets (pas en code)',
  'Rate limiting actif sur toutes les fonctions sensibles',
  'CORS whitelist configuré correctement',
  'Données sensibles chiffrées (AES-256-GCM)',
  'Tests de régression passés',
  'Isolation données agence vérifiée',
];

// ============================================================================
// PDF GENERATOR CLASS
// ============================================================================

class ComprehensivePDFGenerator {
  private doc!: JsPDFInstance;
  private currentY: number = 25;
  private pageNumber: number = 1;
  private tocEntries: { title: string; page: number; level: number }[] = [];
  private pageWidth!: number;
  private pageHeight!: number;
  private margin: number = 20;
  private contentWidth!: number;

  static async create(): Promise<ComprehensivePDFGenerator> {
    const instance = new ComprehensivePDFGenerator();
    const { default: jsPDF } = await import('jspdf');
    instance.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    instance.pageWidth = instance.doc.internal.pageSize.getWidth();
    instance.pageHeight = instance.doc.internal.pageSize.getHeight();
    instance.contentWidth = instance.pageWidth - instance.margin * 2;
    return instance;
  }

  private addNewPage(): void {
    this.doc.addPage();
    this.pageNumber++;
    this.currentY = 25;
    this.addHeader();
    this.addFooter();
  }

  private checkPageBreak(neededHeight: number): void {
    if (this.currentY + neededHeight > this.pageHeight - 25) {
      this.addNewPage();
    }
  }

  private addHeader(): void {
    this.doc.setFillColor(...COLORS.primary);
    this.doc.rect(0, 0, this.pageWidth, 12, 'F');
    this.doc.setTextColor(...COLORS.white);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Manuel Développeur HelpConfort v0.7.13', this.margin, 8);
    this.doc.text(new Date().toLocaleDateString('fr-FR'), this.pageWidth - this.margin, 8, { align: 'right' });
  }

  private addFooter(): void {
    this.doc.setTextColor(...COLORS.muted);
    this.doc.setFontSize(7);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Confidentiel - Documentation Technique Interne', this.margin, this.pageHeight - 8);
    this.doc.text(`Page ${this.pageNumber}`, this.pageWidth - this.margin, this.pageHeight - 8, { align: 'right' });
  }

  addPartTitle(text: string): void {
    this.addNewPage();
    this.currentY = this.pageHeight / 3;
    
    this.doc.setFillColor(...COLORS.primary);
    this.doc.rect(0, this.currentY - 20, this.pageWidth, 40, 'F');
    
    this.doc.setTextColor(...COLORS.white);
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text, this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.tocEntries.push({ title: text, page: this.pageNumber, level: 0 });
    this.addNewPage();
  }

  addChapterTitle(text: string): void {
    this.checkPageBreak(25);
    this.currentY += 5;
    
    this.tocEntries.push({ title: text, page: this.pageNumber, level: 1 });
    
    this.doc.setFillColor(...COLORS.primary);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 12, 'F');
    this.doc.setTextColor(...COLORS.white);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text, this.margin + 5, this.currentY + 8);
    this.currentY += 18;
  }

  addSectionTitle(text: string): void {
    this.checkPageBreak(15);
    this.currentY += 3;
    
    this.tocEntries.push({ title: text, page: this.pageNumber, level: 2 });
    
    this.doc.setTextColor(...COLORS.secondary);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text, this.margin, this.currentY + 5);
    this.currentY += 10;
  }

  addSubsectionTitle(text: string): void {
    this.checkPageBreak(12);
    this.currentY += 2;
    
    this.doc.setTextColor(...COLORS.primary);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text, this.margin, this.currentY + 4);
    this.currentY += 8;
  }

  addParagraph(text: string): void {
    this.doc.setTextColor(...COLORS.text);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    
    const lines = this.doc.splitTextToSize(text, this.contentWidth);
    lines.forEach((line: string) => {
      this.checkPageBreak(5);
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += 5;
    });
    this.currentY += 2;
  }

  addBullet(text: string, indent: number = 0): void {
    this.checkPageBreak(6);
    this.doc.setTextColor(...COLORS.text);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    
    const bulletX = this.margin + (indent * 5);
    this.doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    this.doc.circle(bulletX + 1, this.currentY - 1.5, 0.8, 'F');
    
    const maxWidth = this.contentWidth - (indent * 5) - 5;
    const lines = this.doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string, i: number) => {
      if (i > 0) this.checkPageBreak(5);
      this.doc.text(line, bulletX + 4, this.currentY);
      this.currentY += 5;
    });
  }

  addCode(code: string, maxLines: number = 12): void {
    this.checkPageBreak(20);
    
    const lines = code.split('\n').slice(0, maxLines);
    const boxHeight = Math.min(lines.length * 4 + 8, 60);
    
    this.doc.setFillColor(...COLORS.light);
    this.doc.roundedRect(this.margin, this.currentY - 2, this.contentWidth, boxHeight, 2, 2, 'F');
    
    this.doc.setFontSize(7);
    this.doc.setTextColor(...COLORS.text);
    this.doc.setFont('courier', 'normal');
    
    let codeY = this.currentY + 3;
    for (const line of lines) {
      const truncated = line.length > 90 ? line.substring(0, 87) + '...' : line;
      this.doc.text(truncated, this.margin + 3, codeY);
      codeY += 4;
    }
    
    if (code.split('\n').length > maxLines) {
      this.doc.setTextColor(...COLORS.muted);
      this.doc.text('...', this.margin + 3, codeY);
    }
    
    this.currentY += boxHeight + 4;
  }

  addTable(headers: string[], rows: string[][], colWidths?: number[]): void {
    const rowHeight = 7;
    const cellPadding = 2;
    const numCols = headers.length;
    const defaultColWidth = this.contentWidth / numCols;
    const widths = colWidths || headers.map(() => defaultColWidth);

    this.checkPageBreak(rowHeight * Math.min(rows.length + 2, 8));

    // Header
    this.doc.setFillColor(...COLORS.primary);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, rowHeight, 'F');
    this.doc.setTextColor(...COLORS.white);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'bold');

    let xPos = this.margin;
    headers.forEach((header, i) => {
      const truncated = header.length > 25 ? header.substring(0, 22) + '...' : header;
      this.doc.text(truncated, xPos + cellPadding, this.currentY + 5);
      xPos += widths[i];
    });
    this.currentY += rowHeight;

    // Rows
    this.doc.setTextColor(...COLORS.text);
    this.doc.setFont('helvetica', 'normal');
    
    rows.forEach((row, rowIndex) => {
      this.checkPageBreak(rowHeight);
      
      if (rowIndex % 2 === 0) {
        this.doc.setFillColor(...COLORS.light);
        this.doc.rect(this.margin, this.currentY, this.contentWidth, rowHeight, 'F');
      }

      xPos = this.margin;
      row.forEach((cell, i) => {
        const maxChars = Math.floor(widths[i] / 2);
        const truncated = cell.length > maxChars ? cell.substring(0, maxChars - 3) + '...' : cell;
        this.doc.text(truncated, xPos + cellPadding, this.currentY + 5);
        xPos += widths[i];
      });
      this.currentY += rowHeight;
    });
    this.currentY += 5;
  }

  addInfoBox(title: string, content: string, type: 'info' | 'warning' | 'critical' = 'info'): void {
    this.checkPageBreak(25);
    
    const color = type === 'critical' ? COLORS.error : type === 'warning' ? COLORS.warning : COLORS.primary;
    
    const lines = this.doc.splitTextToSize(content, this.contentWidth - 12);
    const boxHeight = 14 + (lines.length * 4);
    
    // Border
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(0.5);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, boxHeight, 2, 2, 'S');
    
    // Left bar
    this.doc.setFillColor(...color);
    this.doc.rect(this.margin, this.currentY, 3, boxHeight, 'F');
    
    // Title
    this.doc.setFontSize(8);
    this.doc.setTextColor(...color);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title.toUpperCase(), this.margin + 6, this.currentY + 5);
    
    // Content
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.text);
    this.doc.setFontSize(8);
    
    let textY = this.currentY + 10;
    for (const line of lines) {
      this.doc.text(line, this.margin + 6, textY);
      textY += 4;
    }
    
    this.currentY += boxHeight + 4;
  }

  addSpace(mm: number = 5): void {
    this.currentY += mm;
  }

  getBlob(): Blob {
    return this.doc.output('blob');
  }

  // ============================================================================
  // CONTENT SECTIONS
  // ============================================================================

  addCoverPage(): void {
    // Blue header
    this.doc.setFillColor(...COLORS.primary);
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight / 3, 'F');
    
    // Title
    this.doc.setTextColor(...COLORS.white);
    this.doc.setFontSize(32);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('MANUEL DÉVELOPPEUR', this.pageWidth / 2, 45, { align: 'center' });
    
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('HelpConfort SaaS Platform', this.pageWidth / 2, 60, { align: 'center' });
    
    this.doc.setFontSize(12);
    this.doc.text('Documentation Technique Exhaustive', this.pageWidth / 2, 75, { align: 'center' });
    this.doc.text(`Version 0.7.13 - ${new Date().toLocaleDateString('fr-FR')}`, this.pageWidth / 2, 85, { align: 'center' });
    
    // Stats boxes
    const statsY = this.pageHeight / 2;
    const boxWidth = 40;
    const boxHeight = 35;
    const startX = (this.pageWidth - boxWidth * 4 - 15) / 2;
    
    const stats = [
      { value: SYSTEM_STATS.totalModules.toString(), label: 'Modules' },
      { value: SYSTEM_STATS.totalEdgeFunctions.toString(), label: 'Edge Functions' },
      { value: SYSTEM_STATS.totalTables.toString(), label: 'Tables BDD' },
      { value: STATIA_METRICS_COUNT.total.toString(), label: 'Métriques StatIA' },
    ];

    stats.forEach((stat, i) => {
      const x = startX + i * (boxWidth + 5);
      this.doc.setFillColor(...COLORS.light);
      this.doc.roundedRect(x, statsY, boxWidth, boxHeight, 3, 3, 'F');
      
      this.doc.setFontSize(22);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...COLORS.primary);
      this.doc.text(stat.value, x + boxWidth / 2, statsY + 15, { align: 'center' });
      
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...COLORS.muted);
      this.doc.text(stat.label, x + boxWidth / 2, statsY + 25, { align: 'center' });
    });

    // Footer info
    this.doc.setTextColor(...COLORS.muted);
    this.doc.setFontSize(9);
    this.currentY = this.pageHeight - 50;
    
    this.doc.text('Architecture • Permissions • Modules • Sécurité • API Apogée • StatIA', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 10;
    this.doc.text('Stack: React 18 + TypeScript + Vite + TailwindCSS + Supabase + Deno Edge Functions', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 15;
    this.doc.setFontSize(8);
    this.doc.text('Ce document constitue la référence technique complète pour les développeurs.', this.pageWidth / 2, this.currentY, { align: 'center' });
  }

  addTableOfContents(): void {
    this.addNewPage();
    
    this.doc.setTextColor(...COLORS.primary);
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Table des Matières', this.margin, this.currentY + 10);
    this.currentY += 25;

    const tocItems = [
      'PARTIE 1 : DÉMARRAGE RAPIDE',
      '  Chapitre 1 — Prérequis & Installation',
      '  Chapitre 2 — Architecture Vue d\'Ensemble',
      'PARTIE 2 : SYSTÈME DE PERMISSIONS',
      '  Chapitre 3 — Rôles Globaux (N0-N6)',
      '  Chapitre 4 — Modules Activables & Guards',
      'PARTIE 3 : MODULES FONCTIONNELS',
      '  Chapitre 5-9 — Modules métier détaillés',
      'PARTIE 4 : MOTEUR STATIA',
      '  Chapitre 10 — Architecture & Règles métier',
      'PARTIE 5 : BACKEND & EDGE FUNCTIONS',
      '  Chapitre 11 — Base de Données',
      '  Chapitre 12 — Edge Functions (41)',
      'PARTIE 6 : API APOGÉE & SÉCURITÉ',
      '  Chapitre 13 — API Apogée',
      '  Chapitre 14 — Sécurité Complète',
      'PARTIE 7 : BONNES PRATIQUES',
      '  Chapitre 15 — Conventions & Maintenance',
      'ANNEXES',
      '  Glossaire Métier',
      '  Checklist Pré-Production',
    ];

    tocItems.forEach((item) => {
      const isMain = !item.startsWith('  ');
      this.doc.setFontSize(isMain ? 11 : 9);
      this.doc.setFont('helvetica', isMain ? 'bold' : 'normal');
      const textColor = isMain ? COLORS.primary : COLORS.text;
      this.doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      this.doc.text(item, this.margin, this.currentY);
      this.currentY += isMain ? 8 : 6;
    });
  }

  addQuickStartSection(): void {
    this.addPartTitle('PARTIE 1 : DÉMARRAGE RAPIDE');
    
    this.addChapterTitle('Chapitre 1 — Prérequis & Installation');
    
    this.addSectionTitle('Prérequis Techniques');
    this.addBullet('Node.js 18+ (recommandé: 20 LTS)');
    this.addBullet('bun (gestionnaire de paquets rapide)');
    this.addBullet('Git');
    this.addBullet('VS Code avec extensions: ESLint, Prettier, Tailwind CSS IntelliSense');
    
    this.addSpace(5);
    
    this.addSectionTitle('Installation');
    this.addCode(`# Cloner le repository
git clone [repository-url]
cd helpconfort

# Installer les dépendances
bun install

# Lancer en développement
bun run dev

# Application accessible sur http://localhost:5173`);
    
    this.addInfoBox('IMPORTANT', 'Ne JAMAIS modifier les fichiers auto-générés: .env, supabase/config.toml, src/integrations/supabase/client.ts, src/integrations/supabase/types.ts', 'warning');
    
    this.addChapterTitle('Chapitre 2 — Architecture Vue d\'Ensemble');
    
    this.addSectionTitle('Structure des Dossiers');
    this.addCode(`src/
├── components/          # Composants React réutilisables
│   ├── ui/             # Composants shadcn/ui
│   └── admin/          # Composants admin
├── pages/              # Pages de l'application
├── hooks/              # Hooks React personnalisés
├── lib/                # Utilitaires et helpers
├── config/             # Configuration (roleMatrix, changelog)
├── contexts/           # Context providers React
├── integrations/       # Intégrations (Supabase)
├── statia/             # Moteur StatIA (métriques)
└── apogee-connect/     # Connexion API Apogée

supabase/
├── functions/          # 41 Edge Functions
│   └── _shared/        # Helpers (CORS, Rate Limit, Auth)
└── config.toml         # Config Supabase (verify_jwt)`);
    
    this.addSectionTitle('Flux de Données Principal');
    this.addParagraph('Client React → TanStack Query → Supabase Client → Edge Functions → PostgreSQL / API Apogée');
    
    this.addInfoBox('Pattern Clé', 'Toutes les requêtes Supabase passent par les helpers safe* (safeQuery, safeMutation, safeInvoke) pour une gestion d\'erreurs centralisée avec Sentry.', 'info');
  }

  addPermissionsSection(): void {
    this.addPartTitle('PARTIE 2 : SYSTÈME DE PERMISSIONS');
    
    this.addChapterTitle('Chapitre 3 — Rôles Globaux (N0-N6)');
    
    this.addParagraph('Le système utilise une hiérarchie stricte de 7 niveaux stockés dans profiles.global_role:');
    
    this.addTable(
      ['Niveau', 'Enum', 'Description', 'Exemple'],
      ROLE_HIERARCHY.map(r => [r.level, r.enum, r.description, r.example]),
      [20, 45, 55, 40]
    );
    
    this.addInfoBox('CRITIQUE', 'Les superadmins (N6) ont des droits ABSOLUS et inconditionnels sur TOUTES les fonctionnalités. Aucun contrôle d\'accès ne peut les restreindre. C\'est une règle fondamentale de l\'architecture.', 'critical');
    
    this.addSectionTitle('Fonctions SQL RLS Critiques');
    this.addCode(`-- Vérifier le niveau de rôle minimum
has_min_global_role(required_role text) → boolean

-- Récupérer l'agence de l'utilisateur connecté
get_user_agency_id() → uuid

-- Accès console support (agent uniquement)
has_support_access() → boolean

-- Accès espace franchiseur (N3+)
has_franchiseur_access() → boolean

-- Module activé pour l'utilisateur
has_module_enabled(module_key text) → boolean`);
    
    this.addChapterTitle('Chapitre 4 — Modules Activables');
    
    this.addParagraph('Les modules sont gérés via la table relationnelle user_modules et résolus par la RPC get_user_effective_modules:');
    
    this.addCode(`// Table user_modules (source de vérité)
-- user_id UUID → l'utilisateur
-- module_key TEXT → clé du module (aide, rh, agence, etc.)
-- options JSONB → options spécifiques { "agent": true, "rh_admin": true }

// Cascade de résolution (RPC get_user_effective_modules):
// 1. module_registry → modules déployés
// 2. plan_tier_modules → modules du plan agence (STARTER/PRO)
// 3. user_modules → overrides individuels
// 4. Filtre min_role → exclusion par niveau de rôle`);
    
    this.addSectionTitle('Guards UI');
    this.addBullet('RoleGuard: Vérifie le niveau de rôle minimum requis');
    this.addBullet('ModuleGuard: Vérifie l\'activation du module pour l\'utilisateur');
    this.addBullet('SupportConsoleGuard: Accès console support (agent only)');
    
    this.addCode(`// Exemple protection de route dans App.tsx
<Route path="/admin/*" element={
  <RoleGuard minRole="platform_admin">
    <ModuleGuard moduleKey="admin_plateforme">
      <AdminLayout />
    </ModuleGuard>
  </RoleGuard>
} />`);
    
    this.addSectionTitle('Patterns RLS');
    this.addTable(
      ['Pattern', 'Code SQL', 'Usage'],
      RLS_PATTERNS.map(p => [p.name, p.code, p.usage]),
      [35, 70, 55]
    );
  }

  addModulesSection(): void {
    this.addPartTitle('PARTIE 3 : MODULES FONCTIONNELS');
    
    MODULES_DOCS.forEach((mod, index) => {
      if (index > 0 && index % 3 === 0) {
        this.checkPageBreak(60);
      }
      
      this.addChapterTitle(`Module: ${mod.name}`);
      this.addParagraph(mod.description);
      
      this.addSubsectionTitle('Routes');
      mod.routes.forEach(route => this.addBullet(route));
      
      this.addSubsectionTitle('Permissions');
      this.addParagraph(mod.permissions);
      
      this.addSubsectionTitle('Tables BDD');
      this.addParagraph(mod.tables.join(', '));
      
      if (mod.edgeFunctions.length > 0) {
        this.addSubsectionTitle('Edge Functions');
        this.addParagraph(mod.edgeFunctions.join(', '));
      }
      
      this.addSpace(5);
    });
    
  }

  addStatiaSection(): void {
    this.addPartTitle('PARTIE 4 : MOTEUR STATIA');
    
    this.addChapterTitle('Chapitre 10 — Architecture StatIA');
    
    this.addParagraph('StatIA est le moteur centralisé de calcul de métriques, source unique de vérité pour toutes les statistiques métier de l\'application.');
    
    this.addSectionTitle('Pipeline de Traitement');
    this.addCode(`Query NLP → Intent Parser → Metric Registry → Data Loaders → Compute Engine → Enrichment → Result

Fichiers clés:
src/statia/
├── domain/rules.ts        # STATIA_RULES - Règles métier officielles
├── definitions/           # Définitions des métriques
├── loaders/              # Chargeurs de données Apogée
├── compute/              # Moteurs de calcul
├── hooks/                # Hooks React (useStatiaMetric)
└── nlp/                  # Routeur NLP v4`);
    
    this.addSectionTitle('Règles Métier CRITIQUES');
    
    STATIA_RULES_CRITICAL.forEach(rule => {
      this.addInfoBox(rule.rule, rule.description, rule.priority as 'info' | 'warning' | 'critical');
    });
    
    this.addSectionTitle('Hooks React');
    this.addCode(`// Métrique unique
const { data, isLoading, error } = useStatiaMetric('ca_global_ht', {
  agencySlug: 'lemans',
  period: { type: 'month', month: 12, year: 2025 }
});

// Métriques multiples (parallélisées)
const results = useStatiaMetrics([
  { id: 'ca_global_ht', params: {...} },
  { id: 'nb_dossiers', params: {...} },
  { id: 'taux_transformation', params: {...} }
]);`);
    
    this.addSectionTitle('Catégories de Métriques');
    this.addTable(
      ['Catégorie', 'Nombre', 'Exemples'],
      STATIA_METRICS_COUNT.categories.map(c => [c.name, c.count.toString(), '']),
      [50, 30, 80]
    );
  }

  addEdgeFunctionsSection(): void {
    this.addPartTitle('PARTIE 5 : BACKEND & EDGE FUNCTIONS');
    
    this.addChapterTitle('Chapitre 11 — Base de Données');
    
    this.addParagraph(`La base de données Supabase contient ${SYSTEM_STATS.totalTables} tables réparties en ${TABLE_CATEGORIES.length} domaines fonctionnels. Toutes les tables sensibles sont protégées par des politiques RLS.`);
    
    this.addSectionTitle('Tables par Domaine');
    TABLE_CATEGORIES.forEach(cat => {
      this.addSubsectionTitle(cat.name);
      this.addParagraph(cat.tables.join(', '));
    });
    
    this.addChapterTitle('Chapitre 12 — Edge Functions');
    
    this.addParagraph(`${SYSTEM_STATS.totalEdgeFunctions} fonctions Edge déployées sur Supabase, toutes sécurisées par JWT (verify_jwt=true dans config.toml) avec CORS hardening et rate limiting intégré.`);
    
    this.addSectionTitle('Helpers Partagés (_shared/)');
    this.addBullet('cors.ts - CORS whitelist (production, localhost, preview Lovable)');
    this.addBullet('rateLimit.ts - Rate limiting persistant en BDD (table rate_limits)');
    this.addBullet('auth.ts - Helpers authentification JWT et extraction user');
    this.addBullet('sentry.ts - Intégration monitoring erreurs');
    
    this.addSectionTitle('Fonctions par Catégorie');
    
    const categories = [...new Set(EDGE_FUNCTIONS_DOCS.map(f => f.category))];
    categories.forEach(cat => {
      const funcs = EDGE_FUNCTIONS_DOCS.filter(f => f.category === cat);
      this.addSubsectionTitle(cat);
      this.addTable(
        ['Fonction', 'Description', 'Rate Limit'],
        funcs.map(f => [f.name, f.description.substring(0, 40), f.rateLimit]),
        [45, 85, 30]
      );
    });
    
    this.addSectionTitle('Appels Frontend');
    this.addCode(`// Standard (JWT automatique via invoke)
const { data, error } = await supabase.functions.invoke('my-function', {
  body: { param: 'value' }
});

// Streaming (pour chat-guide)
const response = await fetch(
  \`\${SUPABASE_URL}/functions/v1/chat-guide\`,
  {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${session.access_token}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ question: 'Ma question' })
  }
);`);
  }

  addSecuritySection(): void {
    this.addPartTitle('PARTIE 6 : API APOGÉE & SÉCURITÉ');
    
    this.addChapterTitle('Chapitre 13 — API Apogée');
    
    this.addInfoBox('CRITIQUE: Isolation Données', 'Chaque requête API DOIT construire l\'URL dynamiquement: https://${profile.agence}.hc-apogee.fr/api/${endpoint}. JAMAIS d\'URL hardcodée. Violation = fuite de données inter-agences.', 'critical');
    
    this.addSectionTitle('Endpoints Autorisés');
    this.addBullet('apiGetProjects - Dossiers');
    this.addBullet('apiGetInterventions - Interventions');
    this.addBullet('apiGetFactures - Factures (source CA)');
    this.addBullet('apiGetDevis - Devis');
    this.addBullet('apiGetClients - Clients / Apporteurs');
    this.addBullet('apiGetUsers - Utilisateurs Apogée (techniciens)');
    this.addBullet('getInterventionsCreneaux - Créneaux interventions');
    
    this.addSectionTitle('Masquage Données Sensibles');
    this.addParagraph('Le proxy-apogee masque automatiquement les champs sensibles (email, tel, adresse, codePostal) avant transmission au client. Accès contrôlé via get-client-contact avec audit obligatoire.');
    
    this.addChapterTitle('Chapitre 14 — Sécurité Complète');
    
    this.addSectionTitle('Fonctionnalités de Sécurité');
    this.addTable(
      ['Fonctionnalité', 'Description', 'Statut'],
      SECURITY_FEATURES.map(f => [f.name, f.description, f.status === 'active' ? '✓ Actif' : '✗']),
      [45, 100, 25]
    );
    
    this.addSectionTitle('CORS Whitelist');
    this.addCode(`const ALLOWED_ORIGINS = [
  'https://helpconfort.services',      // Production
  'http://localhost:5173',             // Dev Vite
  'http://localhost:8080',             // Dev alternatif
  /\\.lovableproject\\.com$/,           // Preview Lovable
  /\\.lovable\\.app$/                   // App Lovable
];`);
    
    this.addSectionTitle('Conformité RGPD');
    this.addBullet('Export données personnelles (edge function: export-my-data)');
    this.addBullet('Gestion consentements (table: user_consents)');
    this.addBullet('Chiffrement données sensibles RH (AES-256-GCM)');
    this.addBullet('Logs d\'accès données sensibles (table: sensitive_data_access_logs)');
    
    this.addInfoBox('Score Sécurité', 'Audit pré-production: 95/100. Aucune vulnérabilité critique identifiée. RLS Linter clean. Toutes les Edge Functions protégées par JWT.', 'info');
  }

  addBestPracticesSection(): void {
    this.addPartTitle('PARTIE 7 : BONNES PRATIQUES');
    
    this.addChapterTitle('Chapitre 15 — Conventions & Maintenance');
    
    this.addSectionTitle('Conventions de Nommage');
    this.addTable(
      ['Type', 'Convention', 'Exemple'],
      [
        ['Pages', 'PascalCase.tsx', 'UserManagement.tsx'],
        ['Composants', 'PascalCase.tsx', 'UserCard.tsx'],
        ['Hooks', 'use-kebab.ts', 'use-user-data.ts'],
        ['Utils', 'camelCase.ts', 'formatDate.ts'],
        ['Types', 'PascalCase', 'UserProfile'],
        ['Constants', 'UPPER_SNAKE', 'MAX_RETRIES'],
      ],
      [40, 50, 70]
    );
    
    this.addSectionTitle('Gestion des Erreurs');
    this.addCode(`// ✅ CORRECT - Utiliser logError (intégré Sentry)
import { logError } from '@/lib/logger';
logError('Erreur chargement données', error, { module: 'pilotage' });

// ❌ INCORRECT - Ne jamais utiliser console.log/error en production
console.error('Erreur:', error);  // Interdit`);
    
    this.addSectionTitle('Safe Helpers Supabase');
    this.addCode(`// Requête sécurisée avec gestion d'erreur centralisée
const { data, error } = await safeQuery(
  supabase.from('profiles').select('*').eq('agency_id', agencyId),
  'Chargement profils équipe'
);

// Mutation sécurisée
const { error } = await safeMutation(
  supabase.from('profiles').update({ name: newName }).eq('id', userId),
  'Mise à jour nom utilisateur'
);

// Invocation Edge Function sécurisée
const { data } = await safeInvoke('proxy-apogee', { endpoint: 'apiGetFactures' });`);
    
    this.addSectionTitle('Pièges Courants');
    
    this.addInfoBox('RLS "No rows returned"', 'Une requête retourne vide mais des données existent? Vérifier les policies RLS. L\'utilisateur n\'a probablement pas les droits sur ces lignes.', 'warning');
    
    this.addInfoBox('Erreur 403/401 Edge Function', 'JWT invalide ou expiré. Vérifier que l\'utilisateur est connecté. Le token peut avoir expiré pendant une longue session.', 'warning');
    
    this.addInfoBox('Données autre agence visibles', 'FAILLE CRITIQUE. Vérifier immédiatement l\'isolation agence dans les requêtes. URL Apogée doit être dynamique.', 'critical');
    
    this.addInfoBox('Types TypeScript outdated', 'Après une migration Supabase, les types dans types.ts sont mis à jour automatiquement. Redémarrer le serveur de dev.', 'info');
  }

  addGlossaryAndChecklist(): void {
    this.addPartTitle('ANNEXES');
    
    this.addChapterTitle('Glossaire Métier');
    this.addTable(
      ['Terme', 'Définition'],
      GLOSSARY.map(g => [g.term, g.definition]),
      [40, 120]
    );
    
    this.addChapterTitle('Checklist Pré-Production');
    CHECKLIST_PRE_PROD.forEach(item => {
      this.addBullet(`☐ ${item}`);
    });
    
    this.addSpace(10);
    
    this.addChapterTitle('Ressources & Contacts');
    this.addBullet('Repository: GitHub HelpConfort');
    this.addBullet('Documentation en ligne: /admin/docs');
    this.addBullet('Monitoring: Sentry Dashboard');
    this.addBullet('Base de données: Lovable Cloud (Supabase)');
    this.addBullet('Edge Functions Logs: /admin/system-health');
  }
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export async function exportDocsPdf(
  options: ExportOptions = {},
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  const {
    includeModules = true,
    includeEdgeFunctions = true,
    includeDatabase = true,
    includeStatia = true,
    includeSecurity = true,
  } = options;

  const pdf = await ComprehensivePDFGenerator.create();
  
  onProgress?.(5, 'Génération de la page de couverture...');
  pdf.addCoverPage();
  
  onProgress?.(10, 'Génération de la table des matières...');
  pdf.addTableOfContents();
  
  onProgress?.(15, 'Section Démarrage rapide...');
  pdf.addQuickStartSection();
  
  onProgress?.(25, 'Section Permissions...');
  pdf.addPermissionsSection();
  
  if (includeModules) {
    onProgress?.(40, 'Section Modules fonctionnels...');
    pdf.addModulesSection();
  }
  
  if (includeStatia) {
    onProgress?.(55, 'Section StatIA...');
    pdf.addStatiaSection();
  }
  
  if (includeEdgeFunctions || includeDatabase) {
    onProgress?.(70, 'Section Backend & Edge Functions...');
    pdf.addEdgeFunctionsSection();
  }
  
  if (includeSecurity) {
    onProgress?.(85, 'Section Sécurité...');
    pdf.addSecuritySection();
  }
  
  onProgress?.(92, 'Section Bonnes pratiques...');
  pdf.addBestPracticesSection();
  
  onProgress?.(97, 'Génération des annexes...');
  pdf.addGlossaryAndChecklist();
  
  onProgress?.(100, 'Finalisation du PDF...');
  
  return pdf.getBlob();
}

export function downloadPdf(blob: Blob, filename: string = 'helpconfort-manuel-developpeur.pdf') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import jsPDF from 'jspdf';
import { 
  MODULES_DOCS, 
  EDGE_FUNCTIONS_DOCS, 
  TABLE_CATEGORIES, 
  SYSTEM_STATS,
  SECURITY_FEATURES,
  STATIA_METRICS_COUNT 
} from '@/config/docsData';

const COLORS = {
  primary: [0, 102, 204] as [number, number, number],       // HelpConfort Blue
  secondary: [255, 107, 53] as [number, number, number],    // HelpConfort Orange
  text: [30, 30, 30] as [number, number, number],
  muted: [100, 100, 100] as [number, number, number],
  light: [245, 245, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

interface ExportOptions {
  includeModules?: boolean;
  includeEdgeFunctions?: boolean;
  includeDatabase?: boolean;
  includeStatia?: boolean;
  includeSecurity?: boolean;
}

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

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;
  let pageNumber = 1;
  const tocEntries: { title: string; page: number }[] = [];

  // Helper functions
  const addNewPage = () => {
    doc.addPage();
    pageNumber++;
    currentY = margin;
    addHeader();
    addFooter();
  };

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 25) {
      addNewPage();
    }
  };

  const addHeader = () => {
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('HelpConfort SaaS - Documentation Technique', margin, 8);
    doc.text(new Date().toLocaleDateString('fr-FR'), pageWidth - margin, 8, { align: 'right' });
  };

  const addFooter = () => {
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Confidentiel - Usage interne uniquement', margin, pageHeight - 8);
    doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  const addSectionTitle = (title: string, level: number = 1) => {
    checkPageBreak(15);
    
    if (level === 1) {
      tocEntries.push({ title, page: pageNumber });
      doc.setFillColor(...COLORS.primary);
      doc.rect(margin, currentY, contentWidth, 10, 'F');
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 5, currentY + 7);
      currentY += 15;
    } else {
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, currentY + 5);
      currentY += 10;
    }
  };

  const addParagraph = (text: string) => {
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, margin, currentY);
      currentY += 5;
    });
    currentY += 3;
  };

  const addTable = (headers: string[], rows: string[][], colWidths?: number[]) => {
    const rowHeight = 7;
    const cellPadding = 2;
    const numCols = headers.length;
    const defaultColWidth = contentWidth / numCols;
    const widths = colWidths || headers.map(() => defaultColWidth);

    checkPageBreak(rowHeight * 2);

    // Header
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');

    let xPos = margin;
    headers.forEach((header, i) => {
      doc.text(header, xPos + cellPadding, currentY + 5);
      xPos += widths[i];
    });
    currentY += rowHeight;

    // Rows
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    
    rows.forEach((row, rowIndex) => {
      checkPageBreak(rowHeight);
      
      if (rowIndex % 2 === 0) {
        doc.setFillColor(...COLORS.light);
        doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
      }

      xPos = margin;
      row.forEach((cell, i) => {
        const truncated = cell.length > 40 ? cell.substring(0, 37) + '...' : cell;
        doc.text(truncated, xPos + cellPadding, currentY + 5);
        xPos += widths[i];
      });
      currentY += rowHeight;
    });
    currentY += 5;
  };

  // ==================== COVER PAGE ====================
  onProgress?.(5, 'Génération de la page de couverture...');
  
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, pageHeight / 3, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('HelpConfort SaaS', pageWidth / 2, 50, { align: 'center' });
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text('Documentation Technique', pageWidth / 2, 65, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Version ${new Date().toISOString().split('T')[0]}`, pageWidth / 2, 80, { align: 'center' });
  
  // Stats boxes
  doc.setTextColor(...COLORS.text);
  const statsY = pageHeight / 2;
  const boxWidth = 40;
  const boxHeight = 35;
  const startX = (pageWidth - boxWidth * 4 - 15) / 2;
  
  const stats = [
    { value: SYSTEM_STATS.totalModules.toString(), label: 'Modules' },
    { value: SYSTEM_STATS.totalEdgeFunctions.toString(), label: 'Edge Functions' },
    { value: SYSTEM_STATS.totalTables.toString(), label: 'Tables' },
    { value: STATIA_METRICS_COUNT.total.toString(), label: 'Métriques' },
  ];

  stats.forEach((stat, i) => {
    const x = startX + i * (boxWidth + 5);
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(x, statsY, boxWidth, boxHeight, 3, 3, 'F');
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(stat.value, x + boxWidth / 2, statsY + 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(stat.label, x + boxWidth / 2, statsY + 25, { align: 'center' });
  });

  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(9);
  doc.text('Document généré automatiquement', pageWidth / 2, pageHeight - 30, { align: 'center' });
  doc.text(new Date().toLocaleString('fr-FR'), pageWidth / 2, pageHeight - 22, { align: 'center' });

  addNewPage();

  // ==================== TABLE OF CONTENTS ====================
  onProgress?.(10, 'Génération de la table des matières...');
  
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Table des matières', margin, currentY + 10);
  currentY += 25;

  const tocItems = [
    ...(includeModules ? ['1. Modules Fonctionnels'] : []),
    ...(includeEdgeFunctions ? ['2. Edge Functions'] : []),
    ...(includeDatabase ? ['3. Base de Données'] : []),
    ...(includeStatia ? ['4. StatIA - Moteur de Métriques'] : []),
    ...(includeSecurity ? ['5. Sécurité'] : []),
  ];

  tocItems.forEach((item) => {
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(11);
    doc.text(item, margin, currentY);
    currentY += 8;
  });

  addNewPage();

  // ==================== MODULES ====================
  if (includeModules) {
    onProgress?.(20, 'Génération des modules...');
    addSectionTitle('1. Modules Fonctionnels');
    
    addParagraph(
      `L'application HelpConfort SaaS est organisée en ${SYSTEM_STATS.totalModules} modules fonctionnels, ` +
      `chacun gérant un domaine métier spécifique. L'accès aux modules est contrôlé par le système de permissions ` +
      `global (global_role N0-N6) et les activations par utilisateur (enabled_modules).`
    );

    MODULES_DOCS.forEach((mod, index) => {
      onProgress?.(20 + (index / MODULES_DOCS.length) * 15, `Module: ${mod.name}...`);
      
      addSectionTitle(mod.name, 2);
      addParagraph(mod.description);
      
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(`Permissions: ${mod.permissions}`, margin, currentY);
      currentY += 5;
      doc.text(`Routes: ${mod.routes.join(', ')}`, margin, currentY);
      currentY += 5;
      doc.text(`Tables: ${mod.tables.join(', ')}`, margin, currentY);
      currentY += 8;
    });

    addNewPage();
  }

  // ==================== EDGE FUNCTIONS ====================
  if (includeEdgeFunctions) {
    onProgress?.(35, 'Génération des Edge Functions...');
    addSectionTitle('2. Edge Functions');
    
    addParagraph(
      `${SYSTEM_STATS.totalEdgeFunctions} fonctions Edge déployées sur Supabase, toutes sécurisées par JWT ` +
      `(verify_jwt=true) avec CORS hardening et rate limiting intégré.`
    );

    const categories = [...new Set(EDGE_FUNCTIONS_DOCS.map(f => f.category))];
    
    categories.forEach((cat) => {
      addSectionTitle(cat, 2);
      
      const funcs = EDGE_FUNCTIONS_DOCS.filter(f => f.category === cat);
      const rows = funcs.map(f => [
        f.name,
        f.description.substring(0, 50),
        f.rateLimit,
        f.authentication ? 'Oui' : 'Non',
      ]);
      
      addTable(
        ['Fonction', 'Description', 'Rate Limit', 'Auth'],
        rows,
        [40, 70, 30, 20]
      );
    });

    addNewPage();
  }

  // ==================== DATABASE ====================
  if (includeDatabase) {
    onProgress?.(55, 'Génération du schéma base de données...');
    addSectionTitle('3. Base de Données');
    
    addParagraph(
      `La base de données Supabase contient ${SYSTEM_STATS.totalTables} tables réparties en ` +
      `${TABLE_CATEGORIES.length} domaines fonctionnels. Toutes les tables sensibles sont protégées ` +
      `par des politiques RLS (Row Level Security).`
    );

    TABLE_CATEGORIES.forEach((cat) => {
      addSectionTitle(cat.name, 2);
      
      const rows = cat.tables.map(t => [t, 'RLS activé']);
      addTable(['Table', 'Sécurité'], rows, [100, 60]);
    });

    addNewPage();
  }

  // ==================== STATIA ====================
  if (includeStatia) {
    onProgress?.(70, 'Génération de la documentation StatIA...');
    addSectionTitle('4. StatIA - Moteur de Métriques');
    
    addParagraph(
      `StatIA est le moteur centralisé de calcul de métriques métier. Il expose ${STATIA_METRICS_COUNT.total}+ ` +
      `métriques couvrant le CA, les univers, les apporteurs, les techniciens, les SAV, et plus encore.`
    );

    addSectionTitle('Catégories de métriques', 2);
    
    const metricsRows = STATIA_METRICS_COUNT.categories.map(c => [c.name, c.count.toString()]);
    addTable(['Catégorie', 'Nombre de métriques'], metricsRows, [100, 60]);

    addSectionTitle('Architecture', 2);
    addParagraph(
      `Le flux de données StatIA suit le parcours suivant:\n` +
      `1. API Apogée (source externe) → 2. proxy-apogee (Edge Function sécurisée) → ` +
      `3. DataService (cache 5min) → 4. computeStat (moteur de calcul) → 5. React Hooks (UI)`
    );

    addSectionTitle('Règles métier critiques', 2);
    addParagraph(
      `• Les avoirs sont toujours traités comme des montants négatifs (subtract)\n` +
      `• Le CA technicien est attribué proportionnellement au temps d'intervention\n` +
      `• Les types RT/SAV ne génèrent jamais de CA technicien\n` +
      `• L'isolation des données par agence est strictement appliquée`
    );

    addNewPage();
  }

  // ==================== SECURITY ====================
  if (includeSecurity) {
    onProgress?.(85, 'Génération de la section sécurité...');
    addSectionTitle('5. Sécurité');
    
    addParagraph(
      `L'application implémente une stratégie de sécurité multi-couches conforme aux bonnes pratiques ` +
      `et aux exigences RGPD.`
    );

    const securityRows = SECURITY_FEATURES.map(f => [f.name, f.description, f.status === 'active' ? '✓' : '✗']);
    addTable(['Fonctionnalité', 'Description', 'Statut'], securityRows, [45, 100, 15]);

    addSectionTitle('Niveaux de rôles', 2);
    const rolesRows = [
      ['N0', 'base_user', 'Accès basique'],
      ['N1', 'franchisee_user', 'Utilisateur agence'],
      ['N2', 'franchisee_admin', 'Dirigeant agence'],
      ['N3', 'franchisor_user', 'Animateur réseau'],
      ['N4', 'franchisor_admin', 'Directeur réseau'],
      ['N5', 'platform_admin', 'Admin plateforme'],
      ['N6', 'superadmin', 'Super administrateur'],
    ];
    addTable(['Niveau', 'Rôle', 'Description'], rolesRows, [20, 50, 90]);
  }

  onProgress?.(95, 'Finalisation du PDF...');

  // Finalize
  addFooter();
  
  onProgress?.(100, 'Export terminé');
  
  return doc.output('blob');
}

export function downloadPdf(blob: Blob, filename: string = 'helpconfort-documentation.pdf') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Script de migration pour convertir les liens HTML @ et # en mentions TipTap
 * 
 * Usage: npx tsx scripts/migrate-html-links.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface Block {
  id: string;
  type: 'category' | 'section';
  title: string;
  content: string;
  slug: string;
  parentId?: string;
  order: number;
  colorPreset?: string;
  icon?: string;
  attachments?: any[];
}

interface AppData {
  blocks: Block[];
  version: string;
  lastModified: number;
}

// Mapping des IDs HTML vers les slugs actuels
const HTML_ID_TO_SLUG_MAP: Record<string, string> = {
  'intro': 'introduction-principes',
  'theme-client': 'client-apporteur',
  'theme-dossier': 'dossier-projet',
  'theme-rdv': 'rendez-vous-planning',
  'theme-app-tech': 'application-technicien',
  'theme-devis-commandes': 'devis-commandes',
  'theme-facturation': 'facturation-paiements',
  'theme-articles': 'comptabilite-articles',
  'theme-docs-medias': 'documents-mediatheque',
  'theme-workflow': 'workflow-statuts',
  'theme-gestion-listes': 'gestion-listes-pictos',
  'theme-reporting': 'reporting-suivi',
  'faq-global': 'faq-globale-structuree',
  'rt': 'application-technicien', // Section spécifique RT
};

// Mapping des tags vers les slugs
const TAG_TO_SLUG_MAP: Record<string, string> = {
  '#client': 'client-apporteur',
  '#apporteur': 'client-apporteur',
  '#dossier': 'dossier-projet',
  '#rdv': 'rendez-vous-planning',
  '#planning': 'rendez-vous-planning',
  '#technicien': 'application-technicien',
  '#releve_technique': 'application-technicien',
  '#devis': 'devis-commandes',
  '#commande': 'devis-commandes',
  '#facture': 'facturation-paiements',
  '#franchise': 'facturation-paiements',
  '#acompte': 'facturation-paiements',
  '#articles': 'comptabilite-articles',
  '#mediatheque': 'documents-mediatheque',
  '#standby': 'workflow-statuts',
  '#workflow': 'workflow-statuts',
  '#sous_statuts': 'gestion-listes-pictos',
};

// Mapping des rôles vers les slugs
const ROLE_TO_SLUG_MAP: Record<string, string> = {
  '@BackOffice': 'client-apporteur',
  '@Technicien': 'application-technicien',
  '@ChargeAffaires': 'devis-commandes',
  '@Direction': 'workflow-statuts',
};

/**
 * Convertit un lien HTML <a href="#xxx"> en mention TipTap
 */
function convertLinkToMention(
  linkText: string,
  href: string,
  blocks: Block[]
): string {
  // Extraire l'ID de l'ancre
  const anchorId = href.replace('#', '');
  const slug = HTML_ID_TO_SLUG_MAP[anchorId];

  if (!slug) {
    console.warn(`⚠️  Slug non trouvé pour l'ancre: ${anchorId}`);
    return linkText; // Garder le texte original si pas de mapping
  }

  // Trouver le bloc correspondant
  const block = blocks.find(b => b.slug === slug);
  if (!block) {
    console.warn(`⚠️  Bloc non trouvé pour le slug: ${slug}`);
    return linkText;
  }

  // Créer la mention TipTap
  return `<span data-mention="" data-id="${block.id}" data-label="${block.title}" data-prefix="@" data-slug="${block.slug}" data-type="${block.type}" class="mention cursor-pointer text-primary font-medium hover:underline">@${block.title}</span>`;
}

/**
 * Convertit les tags et rôles isolés (ex: #dossier, @Technicien) en mentions
 */
function convertInlineTagsToMentions(content: string, blocks: Block[]): string {
  let result = content;

  // Convertir les tags #xxx
  Object.entries(TAG_TO_SLUG_MAP).forEach(([tag, slug]) => {
    const block = blocks.find(b => b.slug === slug);
    if (block) {
      const mention = `<span data-mention="" data-id="${block.id}" data-label="${block.title}" data-prefix="@" data-slug="${block.slug}" data-type="${block.type}" class="mention cursor-pointer text-primary font-medium hover:underline">@${block.title}</span>`;
      // Remplacer uniquement les tags isolés (pas dans les href)
      const regex = new RegExp(`(?<!href=["'])${tag.replace('#', '\\#')}(?!["'])`, 'g');
      result = result.replace(regex, mention);
    }
  });

  // Convertir les rôles @Xxx
  Object.entries(ROLE_TO_SLUG_MAP).forEach(([role, slug]) => {
    const block = blocks.find(b => b.slug === slug);
    if (block) {
      const mention = `<span data-mention="" data-id="${block.id}" data-label="${block.title}" data-prefix="@" data-slug="${block.slug}" data-type="${block.type}" class="mention cursor-pointer text-primary font-medium hover:underline">@${block.title}</span>`;
      const regex = new RegExp(`(?<!href=["'])${role.replace('@', '\\@')}(?!["'])`, 'g');
      result = result.replace(regex, mention);
    }
  });

  return result;
}

/**
 * Parse le HTML et convertit tous les liens en mentions
 */
function migrateHTMLContent(htmlContent: string, blocks: Block[]): string {
  let result = htmlContent;

  // Pattern pour matcher les liens <a href="#xxx">texte (#xxx)</a>
  const linkPattern = /<a\s+href="#([^"]+)"[^>]*>([^<]+)<\/a>/g;
  
  result = result.replace(linkPattern, (match, hrefId, linkText) => {
    return convertLinkToMention(linkText, `#${hrefId}`, blocks);
  });

  // Convertir les tags et rôles isolés
  result = convertInlineTagsToMentions(result, blocks);

  return result;
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Démarrage de la migration des liens HTML...\n');

  // Charger les données actuelles
  const dataPath = path.join(process.cwd(), 'src/data/apogee-data.json');
  const data: AppData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  console.log(`📦 ${data.blocks.length} blocs chargés\n`);

  // Charger le HTML (simulé - vous devrez copier le contenu)
  // Pour l'instant, on va juste montrer comment ça marcherait
  const htmlSample = `
    <p>Avant de penser <a href="#theme-dossier">dossier (#dossier)</a>, 
    <a href="#theme-devis-commandes">devis (#devis)</a> ou
    <a href="#theme-facturation">facture (#facture)</a>, 
    il faut s'assurer que le client existe.</p>
    <p>Les techniciens (@Technicien) peuvent créer des RT (#releve_technique).</p>
  `;

  console.log('📝 Exemple de contenu HTML avant migration:');
  console.log(htmlSample);
  console.log('\n');

  const migrated = migrateHTMLContent(htmlSample, data.blocks);

  console.log('✅ Exemple de contenu après migration:');
  console.log(migrated);
  console.log('\n');

  // Pour migrer réellement, décommenter et adapter:
  /*
  const htmlPath = path.join(process.cwd(), 'user-uploads/manuelV9_copie_2.txt');
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  
  // Mettre à jour chaque bloc de contenu
  data.blocks.forEach(block => {
    if (block.content) {
      block.content = migrateHTMLContent(block.content, data.blocks);
    }
  });

  // Sauvegarder
  const backupPath = path.join(process.cwd(), 'src/data/apogee-data.backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
  console.log(`💾 Backup créé: ${backupPath}`);

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log(`✅ Migration terminée: ${dataPath}`);
  */

  console.log('ℹ️  Pour migrer réellement vos données:');
  console.log('   1. Décommentez la section de migration dans le script');
  console.log('   2. Exécutez: npx tsx scripts/migrate-html-links.ts');
  console.log('   3. Un backup sera créé automatiquement\n');
}

main().catch(console.error);

/**
 * STATiA-BY-BIJ - Générateur de documentation du schéma Apogée
 */

import { APOGEE_SCHEMA, BUSINESS_CONCEPTS, getAllEndpoints } from './apogeeSchemaV2';

export function generateSchemaMarkdown(): string {
  const lines: string[] = [];
  
  lines.push('# Schéma API Apogée - Documentation Technique');
  lines.push('');
  lines.push('> Documentation auto-générée par STATiA-BY-BIJ');
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Table des matières
  lines.push('## Table des matières');
  lines.push('');
  const endpoints = getAllEndpoints();
  
  lines.push('1. [Vue d\'ensemble](#vue-densemble)');
  lines.push('2. [Endpoints](#endpoints)');
  endpoints.forEach(ep => {
    lines.push(`   - [${ep.label}](#${ep.name})`);
  });
  lines.push('3. [Où trouver quoi ?](#où-trouver-quoi)');
  lines.push('4. [Relations entre endpoints](#relations-entre-endpoints)');
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Vue d'ensemble
  lines.push('## Vue d\'ensemble');
  lines.push('');
  lines.push('L\'API Apogée expose les endpoints suivants :');
  lines.push('');
  lines.push('| Endpoint | Nom logique | Description | Clé primaire |');
  lines.push('|----------|-------------|-------------|--------------|');
  endpoints.forEach(ep => {
    lines.push(`| \`${ep.id}\` | ${ep.name} | ${ep.description} | \`${ep.primaryKey}\` |`);
  });
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Détail de chaque endpoint
  lines.push('## Endpoints');
  lines.push('');
  
  endpoints.forEach(ep => {
    lines.push(`### ${ep.label}`);
    lines.push('');
    lines.push(`**Endpoint:** \`${ep.id}\`  `);
    lines.push(`**Méthode HTTP:** ${ep.httpMethod}  `);
    lines.push(`**Clé primaire:** \`${ep.primaryKey}\`  `);
    if (ep.datePrimaryField) {
      lines.push(`**Champ date principal:** \`${ep.datePrimaryField}\`  `);
    }
    if (ep.tags?.length) {
      lines.push(`**Tags:** ${ep.tags.join(', ')}  `);
    }
    lines.push('');
    lines.push(`> ${ep.description}`);
    lines.push('');
    
    // Champs
    lines.push('#### Champs');
    lines.push('');
    lines.push('| Champ | Type | Rôle | Nullable | Description |');
    lines.push('|-------|------|------|----------|-------------|');
    ep.fields.forEach(f => {
      const path = f.path ? ` (${f.path})` : '';
      const nullable = f.nullable ? '✓' : '✗';
      lines.push(`| \`${f.name}\`${path} | ${f.type} | ${f.role} | ${nullable} | ${f.description} |`);
    });
    lines.push('');
    
    // Jointures
    if (ep.joins.length > 0) {
      lines.push('#### Jointures');
      lines.push('');
      ep.joins.forEach(j => {
        const optional = j.isOptional ? ' (optionnelle)' : '';
        lines.push(`- **→ ${j.target}** via \`${j.localField}\` = \`${j.remoteField}\` (${j.cardinality})${optional}`);
        lines.push(`  - ${j.description}`);
      });
      lines.push('');
    }
    
    // Filtres
    if (ep.filters.length > 0) {
      lines.push('#### Filtres supportés');
      lines.push('');
      lines.push('| Filtre | Champ | Type |');
      lines.push('|--------|-------|------|');
      ep.filters.forEach(f => {
        lines.push(`| ${f.name} | \`${f.field}\` | ${f.type} |`);
      });
      lines.push('');
    }
    
    lines.push('---');
    lines.push('');
  });
  
  // Où trouver quoi ?
  lines.push('## Où trouver quoi ?');
  lines.push('');
  lines.push('Guide rapide pour localiser les données métier clés :');
  lines.push('');
  
  BUSINESS_CONCEPTS.forEach(concept => {
    lines.push(`### ${concept.label}`);
    lines.push('');
    lines.push(`> ${concept.description}`);
    lines.push('');
    concept.locations.forEach(loc => {
      const path = loc.path ? ` → \`${loc.path}\`` : '';
      const note = loc.note ? ` *(${loc.note})*` : '';
      lines.push(`- **${loc.endpoint}**${path} : \`${loc.field}\`${note}`);
    });
    lines.push('');
  });
  
  lines.push('---');
  lines.push('');
  
  // Relations
  lines.push('## Relations entre endpoints');
  lines.push('');
  lines.push('```');
  lines.push('┌─────────────┐     ┌─────────────┐     ┌─────────────┐');
  lines.push('│   CLIENTS   │◄────│  PROJECTS   │────►│    USERS    │');
  lines.push('│  (clients)  │     │  (dossiers) │     │(techniciens)│');
  lines.push('└─────────────┘     └──────┬──────┘     └─────────────┘');
  lines.push('       ▲                   │                   ▲');
  lines.push('       │                   │                   │');
  lines.push('       │            ┌──────┴──────┐            │');
  lines.push('       │            │             │            │');
  lines.push('       │            ▼             ▼            │');
  lines.push('       │     ┌───────────┐ ┌───────────┐       │');
  lines.push('       └─────│  FACTURES │ │   DEVIS   │───────┘');
  lines.push('             │           │ │           │');
  lines.push('             └───────────┘ └───────────┘');
  lines.push('                   │             │');
  lines.push('                   └──────┬──────┘');
  lines.push('                          ▼');
  lines.push('                   ┌─────────────┐');
  lines.push('                   │INTERVENTIONS│');
  lines.push('                   │   (RDV)     │');
  lines.push('                   └─────────────┘');
  lines.push('```');
  lines.push('');
  lines.push('### Toutes les relations');
  lines.push('');
  
  endpoints.forEach(ep => {
    if (ep.joins.length > 0) {
      lines.push(`**${ep.label}** :`);
      ep.joins.forEach(j => {
        lines.push(`- ${ep.name}.${j.localField} → ${j.target}.${j.remoteField} (${j.cardinality})`);
      });
      lines.push('');
    }
  });
  
  lines.push('---');
  lines.push('');
  lines.push('*Généré automatiquement par STATiA-BY-BIJ*');
  
  return lines.join('\n');
}

export function downloadSchemaDoc(): void {
  const markdown = generateSchemaMarkdown();
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'apogee-schema.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

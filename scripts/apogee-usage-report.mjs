#!/usr/bin/env node Operia 2
/**
 * Apogée API Usage Report Generator
 * 
 * Analyzes TypeScript/JavaScript files to extract:
 * - Apogée API endpoint identifiers (apiGet*)
 * - Property access chains related to Apogée entities
 * 
 * Uses TypeScript Compiler API for AST parsing.
 */

import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Patterns for identifying Apogée-related property chains
const APOGEE_ENTITY_PATTERNS = [
  'apogee', 'project', 'projects', 'dossier', 'dossiers',
  'devis', 'quote', 'quotes',
  'facture', 'factures', 'invoice', 'invoices',
  'client', 'clients',
  'user', 'users', 'technicien', 'technician',
  'intervention', 'interventions',
  'visite', 'visites',
  'rdv', 'planning', 'creneau', 'creneaux',
  'commanditaire', 'apporteur', 'univers', 'universes',
  'biDepan', 'biTvx', 'biRt', 'bonsIntervention',
  'totalHT', 'totalTTC', 'calcReglementsReste',
  'dateReelle', 'pictosInterv', 'sinistre'
];

// Endpoint pattern
const ENDPOINT_REGEX = /apiGet[A-Za-z0-9_]+/g;

// Results storage
const endpoints = new Set();
const propertyChains = new Map(); // chain -> { count, files: Set }

/**
 * Extract property access chain from a node
 */
function extractPropertyChain(node) {
  const parts = [];
  let current = node;
  
  while (current) {
    if (ts.isPropertyAccessExpression(current)) {
      parts.unshift(current.name.text);
      current = current.expression;
    } else if (ts.isIdentifier(current)) {
      parts.unshift(current.text);
      current = null;
    } else if (ts.isElementAccessExpression(current)) {
      if (ts.isStringLiteral(current.argumentExpression)) {
        parts.unshift(`["${current.argumentExpression.text}"]`);
      } else if (ts.isNumericLiteral(current.argumentExpression)) {
        parts.unshift(`[${current.argumentExpression.text}]`);
      } else {
        parts.unshift('[*]');
      }
      current = current.expression;
    } else if (ts.isCallExpression(current)) {
      parts.unshift('()');
      current = current.expression;
    } else {
      current = null;
    }
  }
  
  return parts.join('.');
}

/**
 * Check if a property chain is Apogée-related
 */
function isApogeeRelated(chain) {
  const lowerChain = chain.toLowerCase();
  return APOGEE_ENTITY_PATTERNS.some(pattern => lowerChain.includes(pattern.toLowerCase()));
}

/**
 * Visit all nodes in an AST
 */
function visitNode(node, sourceFile, filePath) {
  // Check for endpoint patterns in string literals
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    const text = node.text;
    const matches = text.match(ENDPOINT_REGEX);
    if (matches) {
      matches.forEach(m => endpoints.add(m));
    }
  }
  
  // Check for endpoint patterns in identifiers
  if (ts.isIdentifier(node)) {
    const text = node.text;
    if (ENDPOINT_REGEX.test(text)) {
      endpoints.add(text);
      // Reset lastIndex for next use
      ENDPOINT_REGEX.lastIndex = 0;
    }
  }
  
  // Extract property access chains
  if (ts.isPropertyAccessExpression(node)) {
    const chain = extractPropertyChain(node);
    
    // Only keep chains with at least 2 parts and that are Apogée-related
    if (chain.includes('.') && isApogeeRelated(chain)) {
      const existing = propertyChains.get(chain);
      if (existing) {
        existing.count++;
        existing.files.add(filePath);
      } else {
        propertyChains.set(chain, { count: 1, files: new Set([filePath]) });
      }
    }
  }
  
  ts.forEachChild(node, child => visitNode(child, sourceFile, filePath));
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Quick regex check for endpoints in case they're in comments or special patterns
    const endpointMatches = content.match(ENDPOINT_REGEX);
    if (endpointMatches) {
      endpointMatches.forEach(m => endpoints.add(m));
    }
    
    // Parse with TypeScript
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') || filePath.endsWith('.jsx') 
        ? ts.ScriptKind.TSX 
        : ts.ScriptKind.TS
    );
    
    visitNode(sourceFile, sourceFile, filePath);
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
  }
}

/**
 * Group property chains by entity
 */
function groupByEntity(chains) {
  const groups = {
    projects: [],
    devis: [],
    factures: [],
    interventions: [],
    clients: [],
    users: [],
    other: []
  };
  
  for (const [chain, data] of chains) {
    const lowerChain = chain.toLowerCase();
    
    if (lowerChain.includes('project') || lowerChain.includes('dossier')) {
      groups.projects.push({ chain, ...data });
    } else if (lowerChain.includes('devis') || lowerChain.includes('quote')) {
      groups.devis.push({ chain, ...data });
    } else if (lowerChain.includes('facture') || lowerChain.includes('invoice')) {
      groups.factures.push({ chain, ...data });
    } else if (lowerChain.includes('intervention') || lowerChain.includes('visite') || lowerChain.includes('rdv') || lowerChain.includes('planning') || lowerChain.includes('creneau')) {
      groups.interventions.push({ chain, ...data });
    } else if (lowerChain.includes('client')) {
      groups.clients.push({ chain, ...data });
    } else if (lowerChain.includes('user') || lowerChain.includes('technicien') || lowerChain.includes('technician')) {
      groups.users.push({ chain, ...data });
    } else {
      groups.other.push({ chain, ...data });
    }
  }
  
  // Sort each group by count descending
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => b.count - a.count);
  }
  
  return groups;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Scanning for Apogée API usage...\n');
  
  // Find all relevant files
  const files = await glob('src/**/*.{ts,tsx,js,jsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/.next/**']
  });
  
  console.log(`📁 Found ${files.length} files to analyze\n`);
  
  // Analyze each file
  for (const file of files) {
    analyzeFile(file);
  }
  
  // Sort endpoints
  const sortedEndpoints = Array.from(endpoints).sort();
  
  // Convert property chains to array format with limited files
  const chainsArray = Array.from(propertyChains.entries())
    .map(([chain, data]) => ({
      chain,
      count: data.count,
      files: Array.from(data.files).slice(0, 5) // Top 5 files
    }))
    .sort((a, b) => b.count - a.count);
  
  // Group by entity
  const grouped = groupByEntity(propertyChains);
  
  // Generate report
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalFiles: files.length,
      uniqueEndpoints: sortedEndpoints.length,
      uniquePropertyChains: chainsArray.length
    },
    endpoints: sortedEndpoints,
    propertyChains: chainsArray,
    groupedByEntity: {
      projects: grouped.projects.map(({ chain, count, files }) => ({ chain, count, files: Array.from(files).slice(0, 5) })),
      devis: grouped.devis.map(({ chain, count, files }) => ({ chain, count, files: Array.from(files).slice(0, 5) })),
      factures: grouped.factures.map(({ chain, count, files }) => ({ chain, count, files: Array.from(files).slice(0, 5) })),
      interventions: grouped.interventions.map(({ chain, count, files }) => ({ chain, count, files: Array.from(files).slice(0, 5) })),
      clients: grouped.clients.map(({ chain, count, files }) => ({ chain, count, files: Array.from(files).slice(0, 5) })),
      users: grouped.users.map(({ chain, count, files }) => ({ chain, count, files: Array.from(files).slice(0, 5) })),
      other: grouped.other.map(({ chain, count, files }) => ({ chain, count, files: Array.from(files).slice(0, 5) }))
    }
  };
  
  // Write JSON report to root
  const outputPath = path.join(process.cwd(), 'apogee-usage-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  
  // Also write to src/data for frontend access
  const srcDataDir = path.join(process.cwd(), 'src/data');
  if (!fs.existsSync(srcDataDir)) {
    fs.mkdirSync(srcDataDir, { recursive: true });
  }
  const frontendOutputPath = path.join(srcDataDir, 'apogee-usage-report.json');
  fs.writeFileSync(frontendOutputPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('✅ Analysis complete!\n');
  console.log('📊 Summary:');
  console.log(`   - Files analyzed: ${files.length}`);
  console.log(`   - Unique endpoints: ${sortedEndpoints.length}`);
  console.log(`   - Unique property chains: ${chainsArray.length}`);
  console.log('\n📋 Endpoints found:');
  sortedEndpoints.forEach(ep => console.log(`   - ${ep}`));
  console.log('\n📈 Top 10 property chains:');
  chainsArray.slice(0, 10).forEach(({ chain, count }) => {
    console.log(`   ${count.toString().padStart(4)} × ${chain}`);
  });
  console.log(`\n📁 Report saved to:`);
  console.log(`   - ${outputPath}`);
  console.log(`   - ${frontendOutputPath}`);
}

main().catch(console.error);

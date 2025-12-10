# AUDIT BACK-END SUPABASE
**Date**: 2025-12-01  
**Scope**: RLS Policies, Structure Tables, Sécurité Edge Functions, Performance Queries  
**Projet**: guide-apogee-dev

---

## 2.1 AUDIT RÈGLES RLS

### ✅ Points forts
- **JWT vérifié sur toutes les edge functions** (verify_jwt = true)
- **Fonctions SECURITY DEFINER** pour éviter récursion RLS (`has_min_global_role`, `has_support_access`, `has_franchiseur_access`, `get_user_agency`)
- **Isolation par agence** fonctionnelle sur tables critiques (agency_collaborators, profiles)
- **Cohérence avec GLOBAL_ROLES** : policies utilisent correctement la hiérarchie N0-N6

### 🟡 Findings modérés

#### F-RLS-1: Tables configuration sans RLS restrictif
**Tables concernées**: `apogee_modules`, `apogee_priorities`, `apogee_owner_sides`, `apogee_reported_by`, `apogee_impact_tags`, `apogee_ticket_statuses`

**Issue**: Ces tables ont des policies SELECT permissives (basées sur module enabled) mais sont modifiables uniquement par N5+. Risque : si un utilisateur obtient le flag `enabled_modules.apogee_tickets`, il peut lire toutes les valeurs de configuration.

**Recommandation**: Acceptable pour des données de référence non sensibles. Si certaines valeurs doivent être masquées par agence, ajouter filtres supplémentaires.

**Priorité**: BASSE (acceptable en production)

---

#### F-RLS-2: support_tickets manque policy DELETE
**Table**: `support_tickets`

**Issue**: Aucune policy DELETE définie. Les utilisateurs et admins ne peuvent pas supprimer de tickets support.

**Impact**: Fonctionnel uniquement - pas de faille sécurité (table protégée par défaut).

**Recommandation**: Ajouter policy DELETE si suppression nécessaire:
```sql
CREATE POLICY "Admins can delete support tickets"
ON support_tickets FOR DELETE
USING (has_min_global_role(auth.uid(), 5));
```

**Priorité**: BASSE (si fonctionnalité nécessaire)

---

#### F-RLS-3: apogee_ticket_comments/history manque UPDATE/DELETE
**Tables**: `apogee_ticket_comments`, `apogee_ticket_history`

**Issue**: Les commentaires et historique ne peuvent pas être modifiés/supprimés après insertion (INSERT-only).

**Impact**: Fonctionnel - empêche édition/suppression de l'audit trail (comportement peut-être voulu).

**Recommandation**: Si édition de commentaires nécessaire, ajouter:
```sql
CREATE POLICY "Users can edit own comments within 5min"
ON apogee_ticket_comments FOR UPDATE
USING (
  created_by_user_id = auth.uid() 
  AND created_at > now() - interval '5 minutes'
);
```

**Priorité**: BASSE (comportement probablement voulu)

---

#### F-RLS-4: planning_signatures isolation incomplète
**Table**: `planning_signatures`

**Policy actuelle**:
```sql
USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) 
  AND (profiles.agence = ( SELECT get_user_agency(planning_signatures.tech_id::uuid))))))
  OR has_min_global_role(auth.uid(), 3))
```

**Issue**: Utilise `get_user_agency(planning_signatures.tech_id::uuid)` où `tech_id` est `integer`, pas `uuid`. Cast peut échouer.

**Recommandation**: Corriger le typage ou revoir la logique d'isolation par agence.

**Priorité**: MOYENNE (risque de crash RLS)

---

#### F-RLS-5: announcement_reads manque DELETE policy
**Table**: `announcement_reads`

**Issue**: Les utilisateurs ne peuvent pas supprimer leurs lectures d'annonces (seulement INSERT/UPDATE).

**Impact**: Les lectures restent à jamais, possiblement gonflant la base sans cleanup.

**Recommandation**: Ajouter DELETE si cleanup nécessaire, ou laisser append-only si audit requis.

**Priorité**: BASSE

---

### 🔴 Findings critiques
**Aucun finding critique RLS détecté** - toutes les tables sensibles ont RLS activé avec policies appropriées.

---

## 2.2 AUDIT DES TABLES

### ✅ Points forts
- **Foreign keys cohérentes** sur toutes les relations (agency_id, user_id, ticket_id, config_id, etc.)
- **Timestamps automatiques** (created_at, updated_at) avec triggers
- **UUIDs par défaut** (gen_random_uuid())
- **Types JSONB utilisés proprement** (enabled_modules, detail_tranches, metadata)

### 🟡 Findings modérés

#### F-TABLE-1: Colonnes `agence` (text) vs `agency_id` (uuid) - Duplication
**Tables**: `profiles`

**Issue**: La table profiles a DEUX champs pour l'agence:
- `agence` (text) - slug de l'agence (ex: "dax", "pau")
- `agency_id` (uuid) - clé étrangère vers `apogee_agencies.id`

**Impact**: Données dupliquées, risque de désynchronisation. Code utilise tantôt l'un, tantôt l'autre.

**Recommandation**: **Migration vers agency_id uniquement**, supprimer colonne `agence`:
```sql
-- Phase 1: Peupler agency_id depuis agence (slug)
UPDATE profiles p
SET agency_id = (SELECT id FROM apogee_agencies WHERE slug = p.agence)
WHERE agency_id IS NULL AND agence IS NOT NULL;

-- Phase 2: Supprimer colonne agence après migration code
ALTER TABLE profiles DROP COLUMN agence;
```

**Priorité**: HAUTE (dette technique majeure)

---

#### F-TABLE-2: Colonnes orphelines dans apogee_tickets
**Table**: `apogee_tickets`

**Colonnes potentiellement orphelines**:
- `apogee_status_raw` (text) - statut brut import, jamais utilisé après qualification
- `hc_status_raw` (text) - statut brut import, jamais utilisé après qualification
- `source_row_index` (integer) - index ligne import Excel, inutile après import
- `source_sheet` (text) - nom feuille Excel, inutile après import
- `original_title` (text) - titre avant qualification IA
- `original_description` (text) - description avant qualification IA

**Impact**: Colonnes occupent espace mais peuvent être utiles pour audit/debug.

**Recommandation**: Acceptable si utilisées pour traçabilité. Sinon, archiver ou supprimer après délai.

**Priorité**: BASSE (acceptable)

---

#### F-TABLE-3: Index manquants sur colonnes fréquemment filtrées
**Recommandations**:

```sql
-- apogee_tickets: filtrage fréquent par module, kanban_status, created_by
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_module ON apogee_tickets(module);
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_kanban_status ON apogee_tickets(kanban_status);
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_created_by ON apogee_tickets(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_qualified ON apogee_tickets(is_qualified);

-- support_tickets: filtrage par status, assigned_to, user_id
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);

-- chatbot_queries: filtrage par status, user_id
CREATE INDEX IF NOT EXISTS idx_chatbot_queries_status ON chatbot_queries(status);
CREATE INDEX IF NOT EXISTS idx_chatbot_queries_user ON chatbot_queries(user_id);

-- guide_chunks: recherche par block_type (RAG lookup)
CREATE INDEX IF NOT EXISTS idx_guide_chunks_block_type ON guide_chunks(block_type);
CREATE INDEX IF NOT EXISTS idx_guide_chunks_block_id ON guide_chunks(block_id);

-- agency_royalty_calculations: filtrage année/mois
CREATE INDEX IF NOT EXISTS idx_royalty_calc_year_month ON agency_royalty_calculations(agency_id, year, month);

-- animator_visits: filtrage par animator_id, agency_id
CREATE INDEX IF NOT EXISTS idx_animator_visits_animator ON animator_visits(animator_id);
CREATE INDEX IF NOT EXISTS idx_animator_visits_agency ON animator_visits(agency_id);
CREATE INDEX IF NOT EXISTS idx_animator_visits_date ON animator_visits(visit_date);
```

**Priorité**: MOYENNE (amélioration performance significative)

---

#### F-TABLE-4: Incohérences nommage colonnes
**Issues**:
- `apogee_tickets.element_concerne` vs `apogee_tickets.description` (élément_concerné serait + cohérent avec titre)
- `profiles.role_agence` (job title) vs `global_role` (système) - confusion possible
- `support_tickets.chatbot_conversation` (JSONB) vs `support_messages` (table) - redondance

**Impact**: Lisibilité réduite, risque de confusion.

**Recommandation**: Documenter clairement la sémantique ou normaliser lors de refonte majeure.

**Priorité**: BASSE (cosmétique)

---

#### F-TABLE-5: Relations non utilisées ou redondantes
**Cas identifiés**:
- `franchiseur_roles.permissions` (JSONB) - Non utilisé, système V2 utilise `enabled_modules`
- `expense_requests.visit_id` - Lie les frais aux visites mais peu exploité dans UI

**Impact**: Colonnes/tables inutilisées occupent espace et complexifient schéma.

**Recommandation**: Nettoyer lors de refonte majeure ou documenter usage futur prévu.

**Priorité**: BASSE

---

## 2.3 AUDIT SÉCURITÉ EDGE FUNCTIONS

### ✅ Points forts
- **17 edge functions** avec `verify_jwt = true` (authentification obligatoire)
- **CORS hardening** via `_shared/cors.ts` (allowlist origins)
- **Rate limiting** via `_shared/rateLimit.ts` (30 req/min chat, 5 req/10min RAG)
- **Helper _shared/** : cors, rateLimit, error, sentry, roles
- **Validation Zod** N/A (pas de Zod, mais validation manuelle présente)

### 🟡 Findings modérés

#### F-SEC-1: Absence de schéma Zod pour validation entrées
**Functions concernées**: TOUTES (17 edge functions)

**Issue**: Validation manuelle des inputs (`if (!messages || !Array.isArray(messages))`) au lieu de schémas Zod typés et exhaustifs.

**Exemple manquant**:
```typescript
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(5000)
  })).max(50),
  guideContent: z.string().max(100000),
  userId: z.string().uuid().optional(),
  chatContext: z.enum(['apogee', 'apporteurs', 'helpconfort', 'autre']).default('apogee')
});
```

**Impact**: Risque de validation incomplète, erreurs runtime, messages d'erreur moins clairs.

**Recommandation**: Migrer vers Zod pour toutes les edge functions (uniformité + robustesse).

**Priorité**: MOYENNE (amélioration qualité code)

---

#### F-SEC-2: Logs sensibles en console.error
**Functions**: chat-guide, get-kpis, network-kpis, support-auto-classify

**Issue**: Logs `console.error` incluent parfois des données utilisateur (email, userId, texte ticket).

**Exemple**:
```typescript
console.error('Search error:', error); // Peut contenir query utilisateur
console.log('[CHAT-GUIDE] Query:', query); // Log complet de la question
```

**Impact**: Faible si logs non accessibles publiquement, mais exposition PII dans logs Supabase.

**Recommandation**: Rediriger tous les logs d'erreur vers Sentry (déjà intégré) avec sanitization:
```typescript
captureEdgeException(error, {
  function: 'chat-guide',
  userId: userId, // OK - identifiant
  // NE PAS logger: query complète, email, texte complet
});
```

**Priorité**: MOYENNE (conformité RGPD)

---

#### F-SEC-3: notify-support-ticket - Liste emails hardcodée en clair
**Function**: `notify-support-ticket`

**Issue**: Récupère tous les profils avec `enabled_modules.support.agent = true` sans limite de pagination.

**Code actuel**:
```typescript
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, email, email_notifications_enabled, global_role, enabled_modules')
  .eq('is_active', true);
```

**Impact**: Si 1000 profils actifs, récupère TOUT. Pas de `.limit()` ni pagination.

**Recommandation**: Ajouter `.limit(100)` ou filtrer en amont par `global_role IN ('platform_admin', 'superadmin')` avant check `enabled_modules`.

**Priorité**: BASSE (peu probable d'avoir 100+ agents support)

---

#### F-SEC-4: Absence de filtres agency_id dans certaines edge functions
**Functions**: `get-kpis`, `network-kpis`

**Issue**: `get-kpis` filtre correctement par `profiles.agence` pour isoler l'agence de l'utilisateur. MAIS `network-kpis` charge TOUTES les agences actives sans vérifier si l'utilisateur a le droit (assume que RLS bloque déjà).

**Code network-kpis**:
```typescript
const { data: agencies } = await supabaseClient
  .from('apogee_agencies')
  .select('id, slug, label')
  .eq('is_active', true);
```

**Impact**: Si RLS sur `apogee_agencies` mal configuré, un utilisateur N1 pourrait voir toutes les agences. ACTUELLEMENT OK car policy RLS limite à:
```sql
has_min_global_role(auth.uid(), 5) 
OR has_franchiseur_access(auth.uid()) 
OR (slug = get_user_agency(auth.uid()))
```

**Recommandation**: Défense en profondeur - edge function devrait vérifier explicitement `has_min_global_role(user.id, 3)` avant de charger toutes les agences.

**Priorité**: MOYENNE (défense en profondeur manquante)

---

#### F-SEC-5: create-user - Auto-création agence sans validation
**Function**: `create-user/index.ts` lignes 206-234

**Code**:
```typescript
if (targetAgency && !targetAgencyId) {
  const agencySlug = targetAgency.toLowerCase().replace(/[^a-z0-9]/g, '-')
  const { data: newAgency } = await supabaseAdmin
    .from('apogee_agencies')
    .insert({ slug: agencySlug, label: targetAgency, is_active: true })
    .select('id')
    .single()
}
```

**Issue**: N'importe quel N3+ peut créer une agence en fournissant un `agence` inexistant. Pas de validation que l'agence existe réellement ou est autorisée.

**Impact**: Pollution de la table `apogee_agencies` avec des agences fantômes.

**Recommandation**: Désactiver auto-création ou restreindre à N5+:
```typescript
if (targetAgency && !targetAgencyId) {
  if (callerLevel < GLOBAL_ROLES.platform_admin) {
    throw new Error('Seuls les admins peuvent créer de nouvelles agences');
  }
  // ... reste du code
}
```

**Priorité**: HAUTE (risque de données incohérentes)

---

#### F-SEC-6: qualify-ticket - Validation des ticket_ids insuffisante
**Function**: `qualify-ticket/index.ts`

**Code**:
```typescript
const { ticket_ids, user_id } = await req.json();
if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
  return ...
}
```

**Issue**: Pas de validation que `ticket_ids` sont des UUIDs valides, ni de limite sur le nombre (un utilisateur pourrait envoyer 10 000 IDs).

**Recommandation**: Ajouter validation Zod:
```typescript
const QualifyRequestSchema = z.object({
  ticket_ids: z.array(z.string().uuid()).min(1).max(50),
  user_id: z.string().uuid().optional()
});
```

**Priorité**: MOYENNE (DoS potentiel)

---

### 🔴 Findings critiques

#### F-SEC-CRIT-1: update-user-email - Decode JWT manuellement (vulnérabilité)
**Function**: `update-user-email/index.ts` lignes 72-83

**Code DANGEREUX**:
```typescript
const authHeader = req.headers.get('Authorization')
const token = authHeader.replace('Bearer ', '')
const payload = JSON.parse(atob(token.split('.')[1])) // ⚠️ AUCUNE VÉRIFICATION SIGNATURE
const userId = payload.sub
```

**Issue**: Decode le JWT sans vérifier la signature cryptographique. Un attacker peut forger un JWT malveillant avec n'importe quel `sub` (userId).

**Impact**: CRITIQUE - Permet à un attacker de se faire passer pour n'importe quel utilisateur et modifier des emails.

**Recommandation URGENTE**: Utiliser `supabaseClient.auth.getUser()` comme les autres functions:
```typescript
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } }
});
const { data: { user }, error } = await supabaseClient.auth.getUser();
if (error || !user) throw new Error('Non authentifié');
const userId = user.id;
```

**Priorité**: CRITIQUE (à corriger IMMÉDIATEMENT)

---

## 2.4 AUDIT PERFORMANCE QUERIES

### ✅ Points forts
- **Pas de `SELECT *` détecté** dans les hooks (uniquement colonnes nécessaires)
- **safeQuery/safeMutation** utilisés partout (gestion erreur uniforme)
- **Pagination présente** sur AdminUsersUnified, AdminSupport (limit/offset)

### 🟡 Findings modérés

#### F-PERF-1: network-kpis - Chargement séquentiel de toutes les agences
**Function**: `network-kpis/index.ts` lignes 436-448

**Code**:
```typescript
for (const agency of agencies) {
  console.log(`🔄 Loading ${agency.slug}...`);
  const data = await loadAgencyData(agency.slug); // ⚠️ SÉQUENTIEL
  if (data) agencyData.push({ ... });
}
```

**Issue**: Charge 50+ agences SÉQUENTIELLEMENT (bloque ~30-60s). Cache de 5 minutes atténue mais premier call très lent.

**Impact**: Timeout possible, UX dégradée.

**Recommandation**: **Charger en parallèle** avec `Promise.all` + limite concurrence:
```typescript
const BATCH_SIZE = 10;
for (let i = 0; i < agencies.length; i += BATCH_SIZE) {
  const batch = agencies.slice(i, i + BATCH_SIZE);
  const results = await Promise.all(batch.map(a => loadAgencyData(a.slug)));
  agencyData.push(...results.filter(Boolean).map((data, idx) => ({
    agencyId: batch[idx].slug,
    agencyLabel: batch[idx].label,
    data
  })));
}
```

**Priorité**: HAUTE (performance critique)

---

#### F-PERF-2: get-kpis - Calculs lourds en JS au lieu de SQL
**Function**: `get-kpis/index.ts`

**Issue**: Récupère TOUTES les factures/interventions/projets de l'API Apogée puis filtre/agrège en JavaScript (lignes 195-420). Pas d'index, pas de SQL.

**Impact**: Inefficace pour grandes agences (1000+ factures). Mais contrainte API externe (pas de SQL).

**Recommandation**: Acceptable vu contrainte API Apogée. Optimisation possible : cache résultats calculés dans Supabase (table `agency_kpis_cache`).

**Priorité**: BASSE (contrainte externe)

---

#### F-PERF-3: regenerate-apogee-rag - Boucle for...of sans parallélisation embeddings
**Function**: `regenerate-apogee-rag/index.ts` lignes 184-250

**Code**:
```typescript
for (const section of sections || []) {
  const chunks = splitIntoChunks(fullText, 800);
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedChunk(chunkText); // ⚠️ SÉQUENTIEL
    await supabase.from('guide_chunks').insert({ ... });
  }
}
```

**Issue**: Génère les embeddings un par un (appels OpenAI séquentiels). Pour 100 chunks = 100 appels séquentiels (~60s).

**Impact**: Régénération RAG prend 1-2 minutes (acceptable pour opération admin rare).

**Recommandation**: Paralléliser embeddings par batch de 10:
```typescript
const BATCH_SIZE = 10;
for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
  const batch = chunks.slice(i, i + BATCH_SIZE);
  const embeddings = await Promise.all(batch.map(c => embedChunk(c)));
  await supabase.from('guide_chunks').insert(
    batch.map((text, idx) => ({ ..., embedding: embeddings[idx] }))
  );
}
```

**Priorité**: BASSE (opération admin rare)

---

#### F-PERF-4: Absence de pagination sur certaines queries hooks
**Hooks concernés**:
- `useAnimators.ts` - Récupère TOUS les animateurs sans limite
- `useAgencies.ts` - Récupère TOUTES les agences actives (50+) sans pagination
- `use-admin-backup.ts` - Récupère TOUTES les catégories/sections sans pagination

**Impact**: Performance OK actuellement (< 100 entités). Risque si croissance future.

**Recommandation**: Ajouter pagination ou limite raisonnable (`.limit(100)`) avec scroll infini si nécessaire.

**Priorité**: BASSE (anticipation croissance)

---

#### F-PERF-5: chatbot_queries - Pas d'index sur similarity_scores (JSONB)
**Table**: `chatbot_queries`

**Issue**: Colonne `similarity_scores` (JSONB) jamais indexée, mais utilisée pour audit/analyse.

**Recommandation**: Acceptable si jamais requêté. Sinon, ajouter GIN index:
```sql
CREATE INDEX IF NOT EXISTS idx_chatbot_similarity ON chatbot_queries USING GIN(similarity_scores);
```

**Priorité**: TRÈS BASSE (colonne rarement requêtée)

---

## 2.4 AUDIT INJECTIONS POSSIBLES

### ✅ Points forts
- **Aucune exécution SQL brute** dans les edge functions (interdit par design)
- **Supabase client methods** utilisés partout (`.from().select()`, pas de raw SQL)
- **Paramètres passés via body JSON** (pas d'URL params non échappés)

### 🟡 Findings

#### F-INJ-1: notify-support-ticket - Construction SMS avec concaténation
**Function**: `notify-support-ticket/index.ts` ligne 339

**Code**:
```typescript
const smsMessage = `🚨 Nouveau ticket ${sourceBadge} de ${userName}${agencySlug ? ` (${agencySlug})` : ''}: "${lastQuestion.substring(0, 80)}"`;
```

**Issue**: `userName`, `agencySlug`, `lastQuestion` concaténés sans sanitization. Si `userName = "Test\"; DROP TABLE--"`, injecté tel quel dans SMS.

**Impact**: FAIBLE - AllMySMS API encode probablement, mais mauvaise pratique.

**Recommandation**: Sanitizer inputs:
```typescript
const sanitize = (str: string) => str.replace(/[^\w\s\-.,!?éèàùç]/gi, '');
const smsMessage = `🚨 Nouveau ticket de ${sanitize(userName)}: "${sanitize(lastQuestion.substring(0, 80))}"`;
```

**Priorité**: BASSE (API probablement protégée)

---

#### F-INJ-2: chat-guide - guideContent injecté dans prompt sans limite stricte
**Function**: `chat-guide/index.ts` ligne 124

**Code**:
```typescript
<docs>
${guideContent}
</docs>
```

**Issue**: `guideContent` validé à 100 000 chars mais injecté tel quel dans prompt. Pas d'échappement XML/HTML.

**Impact**: FAIBLE - OpenAI API gère l'échappement. Mais si changement de modèle/API, risque.

**Recommandation**: Acceptable si toujours OpenAI. Documenter la dépendance.

**Priorité**: TRÈS BASSE

---

## SYNTHÈSE PRIORITÉS

### 🔴 CRITIQUE (À CORRIGER IMMÉDIATEMENT)
1. **F-SEC-CRIT-1**: update-user-email decode JWT sans vérification signature

### 🟠 HAUTE (Avant production)
1. **F-SEC-5**: create-user auto-création agences sans validation
2. **F-TABLE-1**: Duplication `agence` vs `agency_id` dans profiles
3. **F-PERF-1**: network-kpis chargement séquentiel

### 🟡 MOYENNE (Amélioration qualité)
1. **F-TABLE-3**: Index manquants (9 index recommandés)
2. **F-SEC-1**: Absence schéma Zod
3. **F-SEC-2**: Logs sensibles
4. **F-SEC-4**: Absence filtres agency_id (défense profondeur)
5. **F-SEC-6**: Validation ticket_ids insuffisante
6. **F-RLS-4**: planning_signatures typage tech_id

### 🔵 BASSE (Nice-to-have)
1. **F-RLS-2, F-RLS-3, F-RLS-5**: Policies DELETE manquantes (fonctionnel seulement)
2. **F-TABLE-2**: Colonnes orphelines (acceptable)
3. **F-TABLE-4, F-TABLE-5**: Nommage/relations inutilisées
4. **F-PERF-2, F-PERF-3, F-PERF-4, F-PERF-5**: Optimisations mineures
5. **F-INJ-1, F-INJ-2**: Injections théoriques faible risque

---

## RECOMMANDATIONS GÉNÉRALES

### Sécurité
✅ **Continuer** : JWT verification, CORS hardening, rate limiting  
⚠️ **Corriger F-SEC-CRIT-1 immédiatement**  
🔧 **Améliorer** : Validation Zod, défense profondeur agency_id

### Structure
🔧 **Nettoyer** : Migration `agence` → `agency_id`  
📊 **Ajouter** : 9 index recommandés (F-TABLE-3)  
📝 **Documenter** : Sémantique colonnes ambiguës

### Performance
⚡ **Optimiser** : network-kpis parallélisation (gain 10x)  
💾 **Envisager** : Cache pré-calculé pour KPIs agences  
📄 **Pagination** : Limiter queries ouvertes

---

## SCORE GLOBAL
- **Sécurité RLS**: 8/10 (1 critique, sinon solide)
- **Structure tables**: 7/10 (dette technique agence/agency_id)
- **Sécurité edge functions**: 6/10 (1 critique, validation manuelle)
- **Performance queries**: 7/10 (optimisations possibles mais acceptable)

**MOYENNE**: 7/10 - Bon état général, 1 correctif critique obligatoire, amélioration continue recommandée.

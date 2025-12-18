# AUDIT MODULE HELP ACADEMY
> Date: 2025-12-18 | Version: 0.8.1

## 1. PÉRIMÈTRE

### Description
Base de connaissances et formation interne. Contient guides, procédures, FAQ et ressources organisées par catégories. Inclut un chatbot IA pour recherche intelligente.

### Routes
- `/help` - Index Help Academy
- `/help/guides` - Guides et procédures
- `/help/guides/:slug` - Détail guide
- `/help/faq` - FAQ
- `/help/chatbot` - Assistant IA

### Routes Admin (N4+)
- `/admin/help` - Gestion contenu
- `/admin/help/guides` - Édition guides
- `/admin/help/faq` - Édition FAQ

### Tables Supabase
```
blocks                - Contenus (guides, sections)
apporteur_blocks      - Contenus portail apporteur
categories            - Catégories
apogee_guides         - Guides Apogée
chatbot_queries       - Historique requêtes IA
```

## 2. ARCHITECTURE

### Fichiers principaux
```
src/components/help/
├── HelpIndex.tsx              # Page index
├── GuidesPage.tsx             # Liste guides
├── GuideDetail.tsx            # Détail guide
├── FAQPage.tsx                # FAQ
├── ChatbotPage.tsx            # Assistant IA
└── BlockRenderer.tsx          # Rendu contenu

src/components/admin/help/
├── BlockEditor.tsx            # Éditeur WYSIWYG
├── BlockManager.tsx           # Gestion arborescence
└── CategoryManager.tsx        # Gestion catégories
```

### Structure contenu
```typescript
interface Block {
  id: string
  slug: string
  title: string
  content: string           // HTML ou Markdown
  type: 'guide' | 'faq' | 'section'
  parent_id: string | null  // Hiérarchie
  order: number
  color_preset: string
  icon: string
}
```

## 3. CHATBOT IA

### Fonctionnement
```
1. Utilisateur pose question
2. Recherche sémantique dans blocks
3. Contexte envoyé à LLM (Lovable AI)
4. Réponse générée avec sources
5. Log dans chatbot_queries
```

### Modèles utilisés
- `google/gemini-2.5-flash` - Réponses rapides
- Fallback possible vers autres modèles

### Cache
```sql
-- ai_search_cache
key: hash(question + context)
value: réponse
ttl_seconds: 3600
```

## 4. OPTIONS MODULE

### help_academy.options
```typescript
{
  apogee: boolean    // Guides Apogée (inclus STARTER)
  edition: boolean   // Édition contenu (individuel uniquement)
}
```

### Activation
- `apogee`: Plan STARTER+
- `edition`: Activation individuelle N4+ uniquement

## 5. PROBLÈMES IDENTIFIÉS

### P0 - Critiques
- ❌ Aucun problème critique

### P1 - Importants
- ⚠️ Recherche plein texte basique (pas de stemming FR)
- ⚠️ Cache IA peut retourner réponses obsolètes

### P2 - Améliorations
- 📝 Versioning contenu
- 📝 Workflow validation avant publication
- 📝 Analytics consultation guides

## 6. SÉCURITÉ

### RLS Policies
```sql
-- Lecture: tous les authentifiés
SELECT: auth.uid() IS NOT NULL

-- Écriture: N4+ avec option edition
INSERT/UPDATE/DELETE: 
  has_min_global_role('franchisor_admin')
  AND has_module_option('help_academy', 'edition')
```

### Points d'attention
- ✅ Contenu lecture accessible à tous
- ✅ Édition restreinte aux admins autorisés
- ✅ Chatbot queries loggées pour amélioration

## 7. ÉDITEUR CONTENU

### Fonctionnalités
- WYSIWYG (TipTap)
- Upload images
- Tableaux
- Code blocks
- Liens internes

### Limitations
- Pas de versioning natif
- Pas de workflow approbation
- Suppression définitive (pas de corbeille)

## 8. TESTS RECOMMANDÉS

```typescript
// Navigation
1. Parcourir arborescence guides
2. Vérifier breadcrumb correct
3. Liens internes fonctionnels

// Chatbot
1. Poser question pertinente
2. Vérifier sources citées
3. Vérifier réponse cohérente

// Édition (N4+ avec edition)
1. Créer nouveau guide
2. Ajouter contenu riche
3. Publier et vérifier affichage
```

## 9. ÉVOLUTIONS PRÉVUES

1. Versioning contenu avec historique
2. Workflow validation publication
3. Analytics (pages vues, temps lecture)
4. Recherche full-text améliorée (pg_trgm)
5. Import/export contenu

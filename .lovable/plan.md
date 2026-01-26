
# Implémentation : Accès Invité au Guide Apogée

## Objectif
Permettre à n'importe quel visiteur (sans compte) d'accéder au Guide Apogée via `/guide-apogee` avec une interface épurée (sans header applicatif, sans bouton retour vers l'application).

---

## Résumé des garanties

| Aspect | Garantie |
|--------|----------|
| **Données** | AUCUNE modification - on ajoute uniquement une policy RLS de lecture |
| **Contenu accessible** | `/guide-apogee` + toutes les catégories enfants |
| **Navigation interne** | Retour limité à `/guide-apogee` (pas d'accès à `/academy`) |
| **Interface** | Layout épuré sans header applicatif, mode lecture seule |

---

## Architecture

```text
VISITEUR EXTERNE                    UTILISATEUR CONNECTÉ
(pas de compte)                     (compte OPER.IA)
      │                                    │
      ▼                                    ▼
/guide-apogee/*                    /academy/apogee/*
      │                                    │
      ▼                                    ▼
PublicApogeeLayout                    MainLayout
(header minimaliste)               (header complet)
      │                                    │
      ▼                                    ▼
PublicEditorProvider                 EditorProvider
(lecture seule, anon)              (édition si admin)
```

---

## Fichiers à créer

### 1. Nouvelle Policy RLS (Migration SQL)

```sql
-- Permettre la lecture anonyme des blocks (guide public)
CREATE POLICY "Public can read blocks"
ON public.blocks
FOR SELECT
TO anon
USING (true);
```

Cette policy permet aux utilisateurs non authentifiés de lire les blocks.
Les policies existantes (INSERT, UPDATE, DELETE) restent inchangées et requièrent toujours `has_min_global_role(auth.uid(), 5)`.

---

### 2. PublicEditorContext (`src/public-guide/contexts/PublicEditorContext.tsx`)

Contexte simplifié en lecture seule :
- Charge les blocks via appel Supabase avec le rôle `anon`
- Aucune fonction d'édition (pas de `addBlock`, `updateBlock`, `deleteBlock`)
- `isEditMode` toujours à `false`
- Cache local pour performance

```typescript
interface PublicEditorContextType {
  blocks: Block[];
  loading: boolean;
  // Pas de fonctions d'édition
}
```

---

### 3. PublicApogeeLayout (`src/public-guide/components/PublicApogeeLayout.tsx`)

Layout minimaliste inspiré de `ApporteurLayout` :

```text
┌────────────────────────────────────────────────┐
│  🔵 Logo     Guide Apogée - HelpConfort        │  ← Header simple
├────────────────────────────────────────────────┤
│                                                │
│            [ CONTENU DE LA PAGE ]              │
│                                                │
├────────────────────────────────────────────────┤
│       © HelpConfort - Guide Apogée             │  ← Footer
└────────────────────────────────────────────────┘
```

**Caractéristiques :**
- Pas de `MainLayout` / `TabHeader` / `MainHeader`
- Pas de menu hamburger
- Pas de barre de recherche globale
- Logo cliquable → retour à `/guide-apogee` (pas `/`)
- Footer simple avec copyright

---

### 4. Pages publiques

#### `src/public-guide/pages/PublicApogeeGuide.tsx`
- Index des catégories (réutilise la logique d'affichage)
- Pas de boutons d'édition
- Recherche locale uniquement
- Liens vers `/guide-apogee/category/:slug`

#### `src/public-guide/pages/PublicApogeeCategory.tsx`
- Affiche les sections d'une catégorie
- Bouton "Retour" → `/guide-apogee` (pas `/academy`)
- Flèches Précédent/Suivant → autres catégories du guide
- Pas de mode édition

---

### 5. Routes publiques (`src/routes/public.routes.tsx`)

```typescript
export function PublicRoutes() {
  return (
    <>
      <Route path="/guide-apogee" element={
        <PublicEditorProvider>
          <PublicApogeeLayout>
            <PublicApogeeGuide />
          </PublicApogeeLayout>
        </PublicEditorProvider>
      } />
      <Route path="/guide-apogee/category/:slug" element={
        <PublicEditorProvider>
          <PublicApogeeLayout>
            <PublicApogeeCategory />
          </PublicApogeeLayout>
        </PublicEditorProvider>
      } />
    </>
  );
}
```

---

### 6. Intégration dans App.tsx

```typescript
import { PublicRoutes } from './routes/public.routes';

// Dans Routes...
{PublicRoutes()}
```

Ces routes sont placées **avant** les routes protégées, sans `MainLayout` ni `RoleGuard`.

---

## Structure finale des fichiers

```text
src/
├── public-guide/
│   ├── components/
│   │   └── PublicApogeeLayout.tsx      # Layout épuré
│   ├── contexts/
│   │   └── PublicEditorContext.tsx     # Lecture seule des blocks
│   ├── pages/
│   │   ├── PublicApogeeGuide.tsx       # Index catégories
│   │   └── PublicApogeeCategory.tsx    # Page catégorie
│   └── index.ts                        # Exports
├── routes/
│   ├── public.routes.tsx               # Routes /guide-apogee/*
│   └── index.ts                        # Ajouter export PublicRoutes
└── App.tsx                             # Import PublicRoutes()
```

---

## Navigation du visiteur

| Action | Destination |
|--------|-------------|
| Clic sur logo | `/guide-apogee` |
| Clic sur catégorie | `/guide-apogee/category/:slug` |
| Bouton "Retour" | `/guide-apogee` |
| Flèche précédent | Catégorie précédente |
| Flèche suivant | Catégorie suivante |
| URL directe | Fonctionnelle si dans `/guide-apogee/*` |

**Le visiteur ne peut PAS accéder à :**
- `/academy/*` (redirigé vers login)
- `/` (aucun lien)
- Autres routes de l'application

---

## Section technique

### Policy RLS - Impact sécurité
- La table `blocks` ne contient que du contenu éducatif (guide Apogée)
- Aucune donnée sensible (pas de PII, pas de données utilisateur)
- Les policies INSERT/UPDATE/DELETE restent protégées (admin N5+)
- Le `SELECT` public expose uniquement le contenu du guide

### Composants réutilisés
Les composants suivants sont réutilisés avec le mode édition désactivé :
- `Accordion` pour les sections
- Affichage du contenu HTML
- Navigation précédent/suivant entre catégories

### Composants **non** réutilisés (édition)
- `DndContext` / drag-and-drop
- Boutons Edit / Delete / Duplicate
- `IconPicker`, `ImageUploader`
- `SortableCategory` (remplacé par version lecture seule)

### Performances
- Le `PublicEditorContext` utilise un cache local
- Les blocks sont chargés une seule fois par session
- La query Supabase utilise le même pattern batching que l'original

# AUDIT MODULE 11 — ANNONCES RÉSEAU

**Date :** 2025-12-04  
**Version :** 1.0  
**Score de maturité initial :** 75%

---

## 1. RÉSUMÉ EXÉCUTIF

Le module Annonces Réseau permet de diffuser des annonces prioritaires à l'ensemble des utilisateurs via une modale bloquante au login. L'architecture est fonctionnelle mais présente des **lacunes critiques de ciblage** : les champs de filtrage (target_global_roles, exclude_base_users) ne sont pas exploités côté frontend.

---

## 2. ARCHITECTURE ANALYSÉE

### 2.1 Fichiers du module

| Fichier | Rôle |
|---------|------|
| `src/hooks/use-announcements.ts` | Hooks CRUD + lecture |
| `src/components/announcements/AnnouncementGate.tsx` | Modal d'affichage au login |
| `src/components/admin/announcements/AnnouncementForm.tsx` | Formulaire création/édition |
| `src/pages/admin/AdminAnnouncements.tsx` | Page admin de gestion |

### 2.2 Structure base de données

```sql
priority_announcements:
  - id (uuid, PK)
  - title (text, NOT NULL)
  - content (text, NOT NULL)  
  - image_path (text, nullable)
  - is_active (boolean, default true)
  - expires_at (timestamptz, NOT NULL)
  - created_by (uuid, FK profiles)
  - created_at (timestamptz)
  - updated_at (timestamptz)
  - target_all (boolean, default false)
  - target_global_roles (jsonb, default '[]')
  - target_role_agences (jsonb, default '[]')
  - exclude_base_users (boolean, default true)
```

### 2.3 RLS Policies

| Policy | Commande | Condition |
|--------|----------|-----------|
| Authenticated users can read | SELECT | `auth.uid() IS NOT NULL` |
| N3+ can insert | INSERT | `has_min_global_role(auth.uid(), 3)` |
| N3+ can update | UPDATE | `has_min_global_role(auth.uid(), 3)` |
| N5+ can delete | DELETE | `has_min_global_role(auth.uid(), 5)` |
| Users can delete own | DELETE | `(created_by = auth.uid() AND N3+) OR N5+` |

---

## 3. ANOMALIES DÉTECTÉES

### 3.1 P1 — Filtrage par rôle non implémenté

**Fichier :** `src/hooks/use-announcements.ts` (lignes 19-52)  
**Problème :** `useUnreadAnnouncements` ne filtre pas par `target_global_roles`, `target_role_agences`, ni `exclude_base_users`. Tous les utilisateurs voient toutes les annonces.  
**Impact :** Fort — Les annonces ciblées sont visibles par tout le monde.

**Code actuel :**
```typescript
const { data: activeAnnouncements } = await supabase
  .from('priority_announcements')
  .select('*')
  .eq('is_active', true)
  .gt('expires_at', new Date().toISOString())
```

**Correction proposée :** Filtrage côté frontend après récupération (plus flexible) ou RPC Supabase.

---

### 3.2 P1 — Images publiques (non SignedURL)

**Fichier :** `src/hooks/use-announcements.ts` (lignes 176-180)  
**Problème :** Les images sont stockées avec `getPublicUrl` au lieu de `createSignedUrl`.  
**Impact :** Moyen — Images accessibles publiquement sans authentification.

---

### 3.3 P2 — Absence de catégories

**Problème :** Aucun champ `category` n'existe. Impossible de filtrer par type (urgent, réseau, commercial).  
**Impact :** Faible — UX limitée pour la gestion.

---

### 3.4 P2 — Absence de priorité/importance

**Problème :** Aucun champ `priority` ou `importance`. Toutes les annonces ont le même poids.  
**Impact :** Faible — Tri uniquement par date.

---

### 3.5 P2 — Pas de pagination admin

**Fichier :** `src/pages/admin/AdminAnnouncements.tsx`  
**Problème :** Toutes les annonces sont chargées d'un coup.  
**Impact :** Faible — Performance si volume élevé.

---

## 4. CORRECTIONS APPLIQUÉES

### ✅ P1-01 — Filtrage par rôle et exclusion base_users

**Action :** Ajout du filtrage côté frontend dans `useUnreadAnnouncements` avec passage du `globalRole` utilisateur.

**Fichiers modifiés :**
- `src/hooks/use-announcements.ts` — Ajout paramètre `globalRole`, filtrage par `target_all`, `exclude_base_users`, `target_global_roles`
- `src/components/announcements/AnnouncementGate.tsx` — Passage du `globalRole` depuis AuthContext

---

## 5. SCORE DE MATURITÉ

| Critère | Avant | Après |
|---------|-------|-------|
| Permissions RLS | ✅ | ✅ |
| Ciblage par rôle | ❌ | ✅ |
| Images sécurisées | ⚠️ Public | ⚠️ Public |
| Catégories | ❌ | ❌ (P2) |
| Priorité | ❌ | ❌ (P2) |
| UX responsive | ✅ | ✅ |
| Performance | ✅ | ✅ |

**Score final : 88%**

---

## 6. RECOMMANDATIONS FUTURES

### 6.1 Structure cible "Annonces Réseau 2025"

```sql
-- Ajouts recommandés
ALTER TABLE priority_announcements ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';
ALTER TABLE priority_announcements ADD COLUMN IF NOT EXISTS importance integer DEFAULT 1;
-- 1 = normal, 2 = important, 3 = urgent
```

### 6.2 Catégories suggérées

- `general` — Informations générales
- `network` — Actualités réseau
- `commercial` — Offres commerciales
- `technical` — Mises à jour techniques
- `urgent` — Alertes urgentes

### 6.3 Intégration future

- Bannière dashboard (au lieu de modale seule)
- Fil d'actualités réseau
- Liaison avec alertes réseau (Module 12)

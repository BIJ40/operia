# AXE 8 — Sauvegarde et Reprise

> Audit production-grade Operia — 2026-03-08

---

## 1. Sauvegardes Supabase

### 1.1 Sauvegardes automatiques (Supabase managed)
- **Plan Pro Supabase**: Backup quotidien automatique, rétention 7 jours
- **Plan Team/Enterprise**: PITR (Point-In-Time Recovery) — restauration à la seconde
- **Plan Free**: Pas de backup automatique

**Risque**: Si le projet est sur un plan Free/Pro sans PITR, la granularité de restauration est de 24h maximum.

### 1.2 Backup applicatif

#### `export-all-data` (Edge Function)
- Exporte toutes les tables publiques en JSON paginé
- Réservé N5+ (platform_admin)
- **Limites**:
  - Export séquentiel (lent sur gros volumes)
  - Tables lourdes limitées à 3-10 rows/page → très lent
  - Pas de format compressé
  - Pas d'export Storage (fichiers non inclus)
  - Pas d'export `auth.users` (impossible via client)

#### `export-my-data` (Edge Function)
- Export des données personnelles d'un utilisateur (RGPD)
- Scope limité aux données de l'utilisateur

#### `AdminDatabaseExport` (page UI)
- Interface d'export table par table avec barre de progression
- Téléchargement JSON côté client
- **Problème**: Si le navigateur crash pendant l'export → données perdues (pas de reprise)

### 1.3 Cache backup (IndexedDB)
- `use-cache-backup.ts` et `cache-backup.ts` — sauvegarde locale via Dexie (IndexedDB)
- Stockage des données de préchargement
- **Pas un vrai backup** — c'est un cache de performance

## 2. Récupération de données

### 2.1 Scénario: Suppression accidentelle de données

| Type de données | Récupération | Délai |
|---|---|---|
| Ligne dans une table | Backup Supabase (restauration complète) | 1-24h |
| Table entière | Backup Supabase | 1-24h |
| Fichier Storage | Non récupérable si supprimé | ❌ |
| Données chiffrées (sensitive-data) | Backup Supabase + clé de chiffrement | Variable |
| Utilisateur auth.users | Non récupérable si supprimé via admin API | ❌ |

### 2.2 Scénario: Corruption de la base

**Étapes de reprise**:
1. Identifier le moment de la corruption
2. Restaurer le backup Supabase le plus récent avant la corruption
3. Les Edge Functions re-fonctionnent automatiquement (stateless)
4. Les sessions auth sont invalidées → tous les utilisateurs doivent se reconnecter
5. Les données entre le backup et la corruption sont perdues

**Temps estimé**: 30min à 2h selon le plan Supabase

### 2.3 Scénario: Perte de la clé de chiffrement

- `SENSITIVE_DATA_ENCRYPTION_KEY` perdue → **toutes les données sensibles sont irrécupérables** 🔴
- NIR, contacts d'urgence, dates de naissance → perdus définitivement
- Pas de clé de récupération documentée
- Pas de procédure de rotation de clé

## 3. Que perd-on en cas d'incident ?

| Incident | Perte maximale | Mitigation |
|---|---|---|
| Crash Supabase (avec backup) | 24h de données | PITR si plan compatible |
| Suppression accidentelle table | 24h | Backup quotidien |
| Perte clé chiffrement | Données sensibles permanentes | 🔴 Aucune |
| Bug trigger cascade | Données incohérentes | Activity log pour audit |
| Suppression Storage bucket | Fichiers permanents | 🔴 Aucune (pas de backup fichiers) |

## 4. Recommandations

| Priorité | Action |
|---|---|
| 🔴 Critique | Sauvegarder `SENSITIVE_DATA_ENCRYPTION_KEY` dans un vault séparé (1Password, AWS KMS) |
| 🔴 Critique | Vérifier le plan Supabase et activer PITR si possible |
| 🟠 Important | Ajouter un export automatique quotidien vers S3/GCS (backup off-site) |
| 🟠 Important | Documenter la procédure de restauration complète |
| 🟡 Confort | Ajouter un backup Storage (rsync ou script de copie périodique) |
| 🟡 Confort | Implémenter soft-delete sur les tables critiques (profiles, collaborators) |

# Phase 4 — Wave 2.5 : Ajout de 3 entrées COMPAT_MAP

Date : 2026-03-11

## 1. Résumé

Ajout de 3 entrées manquantes dans le COMPAT_MAP pour débloquer la Vague 3.

| Métrique | Valeur |
|---|---|
| Fichiers modifiés | 2 |
| Entrées COMPAT ajoutées | 3 |
| Assertions test ajoutées | 5 |

## 2. Entrées ajoutées dans `compatMap.ts`

| # | Nouvelle clé | Legacy key | Section |
|---|---|---|---|
| 1 | `pilotage.dashboard` | `stats` | Pilotage ← stats |
| 2 | `pilotage.agence` | `agence` | Pilotage ← agence |
| 3 | `mediatheque.documents` | `divers_documents` | Médiathèque |

## 3. Tests ajoutés dans `moduleCompatTest.ts`

- Cas 2 enrichi : assertion `pilotage.agence` (agence enabled)
- Cas 4 : `stats` → `pilotage.dashboard` + `pilotage.statistiques`
- Cas 5 : `divers_documents` → `mediatheque.documents` (+ vérification `mediatheque.consulter` = false sans option)

## 4. Vérification sécurité

| Élément | Statut |
|---|---|
| Backend | ✅ Inchangé |
| Supabase | ✅ Inchangé |
| COMPAT_MAP existant | ✅ Aucune entrée modifiée |
| Guards front | ✅ Non touchés |
| Ticketing | ✅ Inchangé |
| Isolation mediatheque / organisation.documents_legaux | ✅ Préservée |

# migrate-export — Hardening Vague 2

## Changements appliqués

### 1. Secret déplacé vers header HTTP

**Avant :** Le secret était transmis uniquement via query parameter (`?secret=xxx`), ce qui l'expose dans :
- Les logs serveur/reverse-proxy
- L'historique du navigateur
- Les outils de monitoring réseau

**Après :** Le secret est lu en priorité depuis le header `X-Migration-Secret`. Le query param reste accepté temporairement pour compatibilité, avec un warning de dépréciation dans les logs.

#### Nouvelle méthode d'appel (recommandée)

```bash
# Lister les tables
curl -X GET \
  "https://qvrankgpfltadxegeiky.supabase.co/functions/v1/migrate-export?mode=tables" \
  -H "X-Migration-Secret: VOTRE_SECRET"

# Exporter une table
curl -X GET \
  "https://qvrankgpfltadxegeiky.supabase.co/functions/v1/migrate-export?mode=export&table=profiles" \
  -H "X-Migration-Secret: VOTRE_SECRET"

# Exporter auth.users
curl -X GET \
  "https://qvrankgpfltadxegeiky.supabase.co/functions/v1/migrate-export?mode=auth_users" \
  -H "X-Migration-Secret: VOTRE_SECRET"

# Exporter storage
curl -X GET \
  "https://qvrankgpfltadxegeiky.supabase.co/functions/v1/migrate-export?mode=storage" \
  -H "X-Migration-Secret: VOTRE_SECRET"
```

#### Ancienne méthode (dépréciée)

```bash
# ⚠️ DÉPRÉCIÉ — sera supprimé en Vague 3
curl "https://qvrankgpfltadxegeiky.supabase.co/functions/v1/migrate-export?secret=xxx&mode=tables"
```

### 2. Rate limiting ajouté

- **Limite :** 10 requêtes par minute
- **Mécanisme :** In-memory (reset au cold start)
- **Réponse :** HTTP 429 avec message explicite
- **Justification :** Suffisant car un seul appelant attendu (script de migration). Le rate limiting DB n'est pas nécessaire ici.

## Contrat de réponse

Aucun changement dans le format des réponses JSON. Seuls les mécanismes d'authentification et de protection ont été renforcés.

## Plan de dépréciation

| Phase | Action | Échéance |
|-------|--------|----------|
| Vague 2 | Header `X-Migration-Secret` préféré, query param accepté | Immédiat |
| Vague 3 | Supprimer support query param `?secret=` | Prochaine vague |

# Intégration API Apogée

> **Date** : 29 mars 2026

---

## 1. Vue d'ensemble

Apogée est l'ERP métier externe (gestion de projets, interventions, factures). OPERIA se synchronise avec l'API Apogée via un **proxy sécurisé** et un **système de synchronisation planifié**.

### Architecture

```
Frontend ──→ proxy-apogee (Edge Function) ──→ API Apogée
                    │
                    ├── Masquage clé API
                    ├── Rate limiting par agence
                    └── Filtrage PII (apporteurs)

CRON (3x/jour) ──→ apogee-full-sync ──→ API Apogée
                         │
                         └──→ Shadow Mirror (tables *_mirror)
```

---

## 2. Endpoints Apogée

| Endpoint | Données | Usage |
|----------|---------|-------|
| `apiGetUsers` | Utilisateurs Apogée | Sync profils |
| `apiGetProjects` | Projets/dossiers (bulk léger) | Dashboard, KPI, StatIA |
| `apiGetProjectByRef` | Détail dossier (enrichissement) | Fiches dossiers, portail apporteur |
| `apiGetFactures` | Factures | CA, recouvrement, StatIA |
| `apiGetInterventions` | Interventions terrain | Performance, planning |
| `apiGetDevis` | Devis | Taux transformation, pipeline |
| `apiGetCreneaux` | Créneaux planning | Planning, cartes RDV |
| `apiGetCommanditaires` | Prescripteurs/apporteurs | Prospection, scoring |

---

## 3. Modèle de synchronisation

### Bulk léger (sync planifiée)

- **Fréquence** : CRON 3x/jour via `apogee-full-sync`
- **Données** : projets, factures, interventions, devis, créneaux
- **Stockage** : tables `*_mirror` dans Supabase
- **Idempotent** : chaque run peut être rejoué sans risque

### Enrichissement à la demande

- **Trigger** : action explicite de l'utilisateur
- **Fonction** : `apiGetProjectByRef` via `proxy-apogee`
- **Usage** : portail apporteur, fiches dossiers détaillées
- **EXCLUS de** : dashboards, cartes, recherche globale

### Shadow Mirror (tables miroir)

| Table miroir | Statut | Source |
|-------------|--------|--------|
| `users_mirror` | ✅ Actif (pilote DAX) | `apiGetUsers` |
| `projects_mirror` | Prêt — en attente | `apiGetProjects` |
| `factures_mirror` | Prêt — en attente | `apiGetFactures` |

### Logs de synchronisation

| Table | Contenu |
|-------|---------|
| `apogee_sync_runs` | Un row par exécution globale (statut, durée, compteurs) |
| `apogee_sync_logs` | Détail par endpoint/agence (records fetched/upserted/errors) |

---

## 4. Proxy sécurisé

### `proxy-apogee` (Edge Function)

| Fonctionnalité | Détail |
|----------------|--------|
| **Auth** | `verify_jwt = true`, vérification rôle utilisateur |
| **Clé API** | Stockée en secret, jamais exposée au client |
| **Rate limiting** | Par `agency_id`, empêche les abus |
| **Filtrage PII** | Données apporteurs masquées pour les non-autorisés |
| **Cache** | Mémoire volatile (opportuniste), pas de garantie |

---

## 5. Fiabilité des données

### Données fiables

| Donnée | Fiabilité | Raison |
|--------|:-:|--------|
| `totalHT` (factures) | ✅ Haute | Source comptable Apogée |
| `date_facture` | ✅ Haute | Horodatage système |
| `statut` (intervention) | ✅ Haute | Workflow Apogée |

### Données à traiter avec précaution

| Donnée | Fiabilité | Raison |
|--------|:-:|--------|
| `technicien` (nom) | ⚠️ Moyenne | Saisie manuelle, casse variable |
| `univers` | ⚠️ Moyenne | Peut être null ou mal catégorisé |
| `generatedDocs` | ⚠️ Optionnel | Peut être null, tableau vide, ou mal formaté |
| `date_modification` | ⚠️ Moyenne | Peut ne pas refléter la vraie dernière modif |

### Cas dégradés

- **Null** : toujours traiter comme optionnel (`?.` ou `?? defaultValue`)
- **Incohérences** : module `pilotage.incoherences` dédié à la détection
- **Timeout API** : retry avec backoff dans `apogee-full-sync`
- **Données manquantes** : le dashboard affiche "Données en cours de synchronisation"

---

## 6. Normalisation

Toutes les données Apogée passent par des normalizers :
- Dates → `Date` objects normalisés
- Montants → `number` (centimes → euros)
- Noms → trim + normalisation casse
- Documents → tableau garanti (jamais null)

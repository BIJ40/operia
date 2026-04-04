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
| `apiCreateTache` | Création de tâche planning | Actions à mener, automatisation |

### Liens profonds (Deep Links)

| Pattern URL | Usage |
|-------------|-------|
| `https://{slug}.hc-apogee.fr/go/project/{projectId}` | Ouvre un dossier dans Apogée |
| `https://{slug}.hc-apogee.fr/go/intervention/{interventionId}` | Ouvre une intervention dans Apogée |

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

---

## 7. Endpoint d'écriture : `apiCreateTache`

### Description

Crée une tâche dans le planning Apogée, assignée à un ou plusieurs utilisateurs.

### Payload

```json
{
  "API_KEY": "XXXXXXXXXXXXX",
  "dateTime": "2026-04-05T12:30",
  "duree": 60,
  "priority": 2,
  "label": "Exemple de tache",
  "content": "Description de la tâche",
  "usersIds": [4, 5, 6],
  "clientId": null,
  "projectId": null
}
```

### Champs

| Champ | Type | Obligatoire | Description |
|-------|------|:-:|-------------|
| `API_KEY` | string | ✅ | Clé API de l'agence |
| `dateTime` | string | ✅ | Date/heure au format `YYYY-MM-DDTHH:mm` ou `YYYY-MM-DD HH:mm` |
| `duree` | number | ✅ | Durée en minutes |
| `priority` | number | ✅ | Priorité : `0` (basse), `1` (normale), `2` (haute) |
| `label` | string | ✅ | Titre court de la tâche |
| `content` | string | ⬜ | Description détaillée |
| `usersIds` | number[] | ✅ | Tableau des IDs utilisateurs Apogée assignés |
| `clientId` | number \| null | ⬜ | ID client associé (optionnel) |
| `projectId` | number \| null | ⬜ | ID projet/dossier associé (optionnel) |

### Notes

- Le format `dateTime` accepte soit un `T` séparateur (`2026-04-05T12:30`) soit un espace (`2026-04-05 12:30`)
- Les `usersIds` correspondent aux IDs retournés par `apiGetUsers`
- `clientId` et `projectId` sont optionnels mais permettent de rattacher la tâche à un dossier existant

---

## 8. Liens profonds (Deep Links)

Apogée expose des URLs de navigation directe :

| Pattern | Exemple | Usage |
|---------|---------|-------|
| `https://{slug}.hc-apogee.fr/go/project/{id}` | `https://dax.hc-apogee.fr/go/project/4440` | Ouvre un dossier |
| `https://{slug}.hc-apogee.fr/go/intervention/{id}` | `https://dax.hc-apogee.fr/go/intervention/5654` | Ouvre une intervention |

### Utilisation dans OPERIA

- **Actions à mener** : le bouton 🔗 en fin de ligne ouvre le dossier directement dans Apogée (nouvel onglet)
- **Helper** : `buildApogeeDeepLink(slug, entity, id)` dans `src/apogee-connect/types/endpoints.ts`

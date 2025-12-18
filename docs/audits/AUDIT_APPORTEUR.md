# AUDIT MODULE APPORTEUR
> Date: 2025-12-18 | Version: 0.8.1

## 1. PÉRIMÈTRE

### Description
Portail externe isolé pour les apporteurs d'affaires (syndics, assurances, gestionnaires). Système d'authentification séparé du système interne N0-N6.

### Routes
- `/apporteur` - Dashboard apporteur
- `/apporteur/dossiers` - Liste dossiers
- `/apporteur/dossiers/:id` - Détail dossier
- `/apporteur/demande` - Nouvelle demande intervention
- `/apporteur/auth/login` - Connexion

### Routes Admin (N2+)
- `/hc-agency/mes-apporteurs` - Gestion apporteurs
- `/hc-agency/mes-apporteurs/:id` - Détail organisation

### Tables Supabase
```
apporteurs                      - Organisations apporteurs
apporteur_users                 - Utilisateurs portail
apporteur_contacts              - Contacts (non-utilisateurs)
apporteur_project_links         - Liaison dossiers Apogée
apporteur_intervention_requests - Demandes d'intervention
apporteur_access_logs           - Logs d'accès (audit)
```

## 2. ARCHITECTURE

### Isolation système
```
SYSTÈME INTERNE          PORTAIL APPORTEUR
─────────────────        ─────────────────
profiles.global_role     apporteur_users.role
N0-N6 hierarchy          viewer/editor/admin
AuthContext              ApporteurAuthContext
```

### Fichiers principaux
```
src/apporteur/
├── context/
│   └── ApporteurAuthContext.tsx  # Auth séparé
├── components/
│   ├── ApporteurLayout.tsx       # Layout portail
│   ├── ApporteurDashboard.tsx    # Dashboard
│   ├── ApporteurDossiers.tsx     # Liste dossiers
│   └── ApporteurDemandeForm.tsx  # Formulaire demande
├── hooks/
│   └── use-apporteur-data.ts     # Données
└── guards/
    └── ApporteurGuard.tsx        # Protection routes
```

### Edge Functions
```
supabase/functions/
├── create-apporteur-user/        # Création utilisateur
├── get-apporteur-stats/          # Statistiques
├── get-apporteur-dossiers/       # Dossiers Apogée
├── search-apogee-commanditaires/ # Recherche liaison
└── notify-apporteur-request/     # Notification email
```

## 3. WORKFLOW ONBOARDING

### Création organisation (N2)
```
1. N2 crée organisation apporteur
2. Recherche commanditaire Apogée (optionnel)
3. Liaison apogee_client_id
4. Création premier utilisateur
5. Affichage credentials
```

### Création utilisateur
```typescript
// Via Edge Function (service role)
1. Créer auth.users entry
2. Insérer apporteur_users
3. Retourner credentials (email + password)
```

## 4. DONNÉES ACCESSIBLES

### Dossiers
- Uniquement dossiers liés via `apporteur_project_links`
- OU dossiers où `project.data.commanditaireId` = `apporteur.apogee_client_id`

### Informations visibles
```
✅ Référence dossier
✅ Statut (workflow)
✅ Dates clés
✅ Montants devis/factures
❌ Coordonnées locataire (masquées)
❌ Détails techniques
```

## 5. PROBLÈMES IDENTIFIÉS

### P0 - Critiques
- ❌ Aucun problème critique

### P1 - Importants
- ⚠️ Email notification requiert domaine Resend vérifié
- ⚠️ Pas de reset password self-service

### P2 - Améliorations
- 📝 Documents attachés aux dossiers
- 📝 Chat avec agence
- 📝 Notifications push

## 6. SÉCURITÉ

### Isolation absolue
```sql
-- Apporteurs ne voient que leur organisation
SELECT: apporteur_id = get_my_apporteur_id()

-- Logs d'accès via Edge Function uniquement
INSERT: FALSE (RLS bloque, service role uniquement)
```

### Contraintes
```sql
-- Un seul apporteur par dossier par agence
UNIQUE(agency_id, apogee_project_id) ON apporteur_project_links
```

### Masquage données
- Coordonnées clients masquées
- Accès via `get-client-contact` avec audit log

### Dev Bypass
```typescript
// Environnements dev/preview uniquement
if (isDev || isPreview || isLovable) {
  // Accès sans auth pour tests
  // Bannière jaune "MODE DEV"
}
```

## 7. STATISTIQUES

### KPIs disponibles
```typescript
interface ApporteurStats {
  totalDossiers: number
  dossiersEnCours: number
  dossiersClos: number
  caTotal: number
  caPaye: number
  caEnCours: number
  delaiMoyenIntervention: number
}
```

### Calcul CA
```typescript
// Correction bug HT/TTC
ratioHT = totalHT / totalTTC
resteDuHT = resteDuTTC * ratioHT
caPaye = Math.max(0, totalHT - resteDuHT)
```

## 8. TESTS RECOMMANDÉS

```typescript
// Isolation
1. Apporteur A ne voit pas dossiers apporteur B
2. Apporteur ne voit pas données non liées

// Workflow
1. Créer demande intervention
2. Vérifier notification agence
3. Vérifier statut visible

// Permissions
- viewer: lecture seule
- editor: création demandes
- admin: gestion utilisateurs org
```

## 9. ÉVOLUTIONS PRÉVUES

### Phase 2.5-3 (en cours)
- Gestion contacts N2
- Invitation par email
- Documents attachés

### Phase 4 (après stabilisation)
- Intégration live Apogée
- Synchronisation automatique dossiers
- Planning interventions visible

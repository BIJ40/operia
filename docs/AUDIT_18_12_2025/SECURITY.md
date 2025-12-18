# 🔐 SÉCURITÉ - HelpConfort Services

## Table des matières

1. [Architecture Sécurité](#architecture-sécurité)
2. [Proxy API Apogée](#proxy-api-apogée)
3. [Gestion des Secrets](#gestion-des-secrets)
4. [Permissions et Rôles](#permissions-et-rôles)
5. [Conformité RGPD](#conformité-rgpd)
6. [Politiques RLS](#politiques-rls)
7. [Protection contre les Attaques](#protection-contre-les-attaques)
8. [Checklist Pré-Production](#checklist-pré-production)
9. [Procédure de Rotation de Clé](#procédure-de-rotation-de-clé)
10. [Audit et Logs](#audit-et-logs)

---

## Architecture Sécurité

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Navigateur)                       │
│  ⚠️ AUCUNE clé API exposée                                       │
│  ⚠️ AUCUN appel direct aux APIs externes                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS + JWT
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                       │
│  ✅ Authentification JWT obligatoire                             │
│  ✅ Rate limiting par utilisateur                                │
│  ✅ Validation des inputs (Zod)                                  │
│  ✅ CORS hardened                                                │
│  ✅ Isolation par agence                                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Secrets backend only
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API APOGÉE                                │
│  🔑 Clé API stockée uniquement côté serveur                     │
│  🔒 Jamais exposée au client                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Principes Fondamentaux

1. **Zero Trust Client** : Le client ne possède AUCUN secret
2. **Backend-First** : Toutes les opérations sensibles passent par le backend
3. **Least Privilege** : Chaque utilisateur n'accède qu'à ses données
4. **Defense in Depth** : Multiples couches de sécurité

---

## Proxy API Apogée

### Pourquoi un Proxy ?

L'API Apogée utilise une clé API unique partagée entre toutes les agences. Cette clé :
- **NE DOIT JAMAIS** être exposée dans le code frontend
- **NE DOIT JAMAIS** apparaître dans les logs client
- **NE DOIT JAMAIS** être transmise via le réseau depuis le client

### Architecture du Proxy

```typescript
// ✅ CORRECT : Utiliser le proxy
import { apogeeProxy } from '@/services/apogeeProxy';

const factures = await apogeeProxy.getFactures();
const projects = await apogeeProxy.getProjects({ agencySlug: 'dax' });

// ❌ INTERDIT : Appels directs (obsolète)
// fetch(`https://xxx.hc-apogee.fr/api/...`, { body: { API_KEY: '...' } })
```

### Endpoints Autorisés (Whitelist)

| Endpoint | Description |
|----------|-------------|
| `apiGetUsers` | Utilisateurs de l'agence |
| `apiGetClients` | Clients |
| `apiGetProjects` | Projets/Dossiers |
| `apiGetInterventions` | Interventions |
| `apiGetFactures` | Factures |
| `apiGetDevis` | Devis |
| `apiGetInterventionsCreneaux` | Créneaux d'interventions |

### Sécurités Implémentées

1. **Authentification JWT** : Obligatoire pour tous les appels
2. **Rate Limiting** : 30 requêtes/minute par utilisateur
3. **Validation Whitelist** : Seuls les endpoints autorisés sont accessibles
4. **Isolation Agence** : Vérification que l'utilisateur appartient à l'agence demandée
5. **Logs Structurés** : Aucune donnée sensible dans les logs

---

## Gestion des Secrets

### Secrets Stockés dans Supabase

| Secret | Usage | Rotation |
|--------|-------|----------|
| `APOGEE_API_KEY` | Authentification API Apogée | Annuelle |
| `OPENAI_API_KEY` | Services IA (qualification tickets) | Annuelle |
| `RESEND_API_KEY` | Envoi d'emails | Annuelle |
| `ALLMYSMS_API_KEY` | Envoi de SMS | Annuelle |
| `SENTRY_DSN` | Monitoring erreurs | N/A |

### Variables Client (Publiques)

Ces variables sont **publiques** et peuvent être exposées :

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Variables Interdites Côté Client

⚠️ **JAMAIS** de variable `VITE_APOGEE_API_KEY` ou équivalent !

---

## Permissions et Rôles

### Hiérarchie des Rôles (N0 → N6)

| Niveau | Rôle | Accès |
|--------|------|-------|
| N0 | `base_user` | Accès minimal |
| N1 | `franchisee_user` | Salarié agence |
| N2 | `franchisee_admin` | Dirigeant agence |
| N3 | `franchisor_user` | Animateur réseau |
| N4 | `franchisor_admin` | Directeur réseau |
| N5 | `platform_admin` | Admin plateforme |
| N6 | `superadmin` | Accès total |

### Contrôle d'Accès Multi-Agences

```sql
-- Fonction de vérification d'accès agence
SELECT can_access_agency(auth.uid(), 'agency-uuid');

-- N5+ : Accès global
-- N3/N4 sans assignments : Accès global (legacy)
-- N3/N4 avec assignments : Accès limité aux agences assignées
-- N0-N2 : Accès uniquement à leur agence
```

---

## Conformité RGPD

### Principes Appliqués

1. **Minimisation** : Seules les données nécessaires sont collectées
2. **Finalité** : Chaque donnée a un usage défini
3. **Limitation de Conservation** : Politique de rétention définie
4. **Sécurité** : Chiffrement et contrôle d'accès

### Données Sensibles

| Catégorie | Données | Protection |
|-----------|---------|------------|
| Identité | Nom, prénom, email | RLS + Chiffrement |
| Finances | Salaires, factures | RLS stricte + Module RH |
| Contact | Téléphone, adresse | RLS |
| Santé | Visites médicales | Module RH uniquement |

### Droits des Utilisateurs

- **Accès** : Via `/mon-profil` et `/mon-coffre-rh`
- **Rectification** : Via formulaires de modification
- **Suppression** : Via demande admin
- **Portabilité** : Export possible (à implémenter)

---

## Politiques RLS

### Tables Critiques

```sql
-- Exemple : Isolation des salaires par agence
CREATE POLICY "salary_agency_isolation" ON salary_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = salary_history.collaborator_id
      AND c.agency_id = get_user_agency_id(auth.uid())
    )
    AND (
      has_min_global_role(auth.uid(), 2)  -- N2+ de l'agence
      OR c.user_id = auth.uid()            -- Ou le collaborateur lui-même
    )
  );
```

### Vérifications Automatiques

- `has_min_global_role(user_id, level)` : Vérifie le niveau minimum
- `get_user_agency_id(user_id)` : Récupère l'agence de l'utilisateur
- `can_access_agency(user_id, agency_id)` : Vérifie l'accès multi-agences
- `is_support_agent(user_id)` : Vérifie le rôle support

---

## Protection contre les Attaques

### CORS Hardened

```typescript
// Origines autorisées uniquement
const ALLOWED_ORIGINS = [
  'https://helpconfort.services',
  'http://localhost:5173',
  'http://localhost:8080',
  /.*\.lovableproject\.com$/,
  /.*\.lovable\.app$/,
];
```

### Rate Limiting

| Fonction | Limite | Fenêtre |
|----------|--------|---------|
| `proxy-apogee` | 30 req | 1 min |
| `chat-guide` | 30 req | 1 min |
| `get-kpis` | 20 req | 1 min |
| `regenerate-*-rag` | 5 req | 10 min |

### Validation des Inputs

```typescript
// Toujours valider avec Zod
const schema = z.object({
  endpoint: z.enum(['apiGetUsers', 'apiGetProjects', ...]),
  agencySlug: z.string().regex(/^[a-z0-9-]+$/).optional(),
});
```

### Protection XSS

- DOMPurify pour tout contenu HTML dynamique
- Échappement automatique par React
- CSP headers (à configurer au niveau hosting)

### Protection CSRF

- Tokens JWT avec expiration courte
- Refresh tokens sécurisés
- SameSite cookies

---

## Checklist Pré-Production

### Sécurité API

- [x] Proxy Apogée implémenté
- [x] Clé API non exposée côté client
- [x] JWT obligatoire sur toutes les edge functions
- [x] Rate limiting activé
- [x] CORS hardened
- [x] Whitelist d'endpoints

### Authentification

- [x] Mots de passe forts (8+ chars, majuscules, minuscules, chiffres, symboles)
- [x] Confirmation email désactivée pour dev (à activer en prod)
- [x] Sessions JWT sécurisées
- [x] Refresh token rotation

### Données

- [x] RLS activé sur toutes les tables
- [x] Isolation par agence
- [x] Chiffrement au repos (Supabase)
- [x] Logs sans données sensibles

### Monitoring

- [x] Sentry intégré (frontend + edge functions)
- [x] Logs structurés
- [x] Alertes d'erreurs configurées

### À Faire Avant Production

- [ ] Activer confirmation email
- [ ] Configurer CSP headers
- [ ] Audit de pénétration
- [ ] Test de charge
- [ ] Backup automatisé vérifié

---

## Procédure de Rotation de Clé

### Rotation de la Clé Apogée

1. **Obtenir nouvelle clé** auprès d'Apogée
2. **Mettre à jour le secret** dans Supabase Dashboard
3. **Vérifier** que toutes les edge functions fonctionnent
4. **Documenter** la rotation avec date

```bash
# Via Supabase CLI (si accès)
supabase secrets set APOGEE_API_KEY=nouvelle-clé
```

### Rotation des Autres Clés

Même procédure pour `OPENAI_API_KEY`, `RESEND_API_KEY`, etc.

---

## Audit et Logs

### Structure des Logs

```typescript
// Format standardisé
console.log(`[FUNCTION_NAME] Action: ${action} for user ${userId.substring(0, 8)}...`);

// ❌ Interdit
console.log(`API_KEY: ${apiKey}`);  // JAMAIS
console.log(`Password: ${password}`);  // JAMAIS
console.log(`Full user data: ${JSON.stringify(user)}`);  // JAMAIS complet
```

### Rétention des Logs

| Type | Rétention | Stockage |
|------|-----------|----------|
| Logs applicatifs | 30 jours | Supabase |
| Logs d'erreurs | 90 jours | Sentry |
| Logs d'audit | 1 an | À implémenter |

### Alertes Configurées

- Erreurs 5xx récurrentes
- Rate limit dépassé
- Tentatives d'accès non autorisé
- Échecs d'authentification multiples

---

## Contact Sécurité

Pour signaler une vulnérabilité : contact@helpconfort.services

---

*Document généré le 2025-12-03 - Version 1.0*

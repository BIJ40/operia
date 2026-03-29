# Sécurité Globale OPERIA

> **Date** : 29 mars 2026

---

## 1. Principes fondamentaux

| Principe | Implémentation |
|----------|---------------|
| **Fail-closed** | Module absent = refusé. Aucun fallback permissif |
| **Defense in depth** | RLS (DB) + Guards (frontend) + Edge (serveur) |
| **Least privilege** | Chaque rôle n'accède qu'au minimum nécessaire |
| **Separation of concerns** | Rôles ≠ profils, permissions ≠ auth |

---

## 2. Authentification

### Supabase Auth (GoTrue)

- **Email + mot de passe** : méthode principale
- **Session JWT** : tokens signés, refresh automatique
- **Protection mot de passe** : HIBP check disponible (passwords compromis)
- **Rate limiting** : intégré Supabase

### Auth apporteurs (OTP custom)

Les apporteurs externes utilisent un système d'authentification séparé :
1. `apporteur-auth-send-code` → envoie OTP par email
2. `apporteur-auth-verify-code` → valide l'OTP
3. `apporteur-auth-validate-session` → vérifie la session
4. `apporteur-auth-logout` → déconnexion

**Isolation** : les apporteurs n'ont AUCUN accès aux tables internes. Tout passe par des Edge Functions dédiées avec `service_role`.

### MFA (prévu)

- TOTP via Supabase Auth (`auth.mfa`)
- Obligatoire pour N4+ (prévu)
- Optionnel pour N2+

---

## 3. Row Level Security (RLS)

### Politique : RLS sur TOUTES les tables

Aucune table sans politique RLS. Les patterns standard :

#### Lecture par agence

```sql
CREATE POLICY "select_agency_members" ON table_name
FOR SELECT TO authenticated
USING (
  agency_id IN (SELECT agency_id FROM profiles WHERE id = auth.uid())
  OR has_min_global_role('franchisor_admin')
);
```

#### Écriture admin

```sql
CREATE POLICY "admin_write" ON table_name
FOR ALL TO authenticated
USING (has_min_global_role('franchisor_admin'))
WITH CHECK (has_min_global_role('franchisor_admin'));
```

#### Accès module

```sql
CREATE POLICY "module_gate" ON table_name
FOR SELECT TO authenticated
USING (has_module_v2(auth.uid(), 'module_key'));
```

### Fonctions SECURITY DEFINER

| Fonction | Rôle |
|----------|------|
| `has_min_global_role(text)` | Vérifie le rôle minimum sans récursion RLS |
| `has_module_v2(uuid, text)` | Vérifie l'accès module sans récursion RLS |

---

## 4. Protection des rôles

### Trigger anti-escalade

```sql
-- profiles.global_role ne peut être modifié que par N4+
CREATE TRIGGER protect_global_role_update
BEFORE UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.global_role IS DISTINCT FROM NEW.global_role)
EXECUTE FUNCTION check_role_update_permission();
```

### Edge Function `create-user`

- Plafonnement N-1 : un N2 ne peut créer que des N1 ou N0
- Validation agence : N2 ne crée que dans son agence
- N3+ peut créer sans agence
- Rate limiting

### Edge Function `delete-user`

- Réservé N5+ uniquement
- Plafonnement : ne peut pas supprimer un utilisateur de même niveau ou supérieur

---

## 5. Chiffrement

### Données sensibles

- **Algorithme** : AES-256-GCM
- **Clé** : `SENSITIVE_DATA_ENCRYPTION_KEY` (secret Edge Function)
- **Données chiffrées** : clés API agence, tokens SMS

### Transport

- **HTTPS obligatoire** : Supabase + CDN
- **JWT signé** : tokens auth non falsifiables

---

## 6. Edge Functions — Sécurité

### Règles

| Règle | Application |
|-------|------------|
| `verify_jwt = true` | Toutes les fonctions (sauf webhooks) |
| Service role | Fonctions admin uniquement |
| Rate limiting | `proxy-apogee` (par agency), `helpi-search` (par user) |
| CRON secret | Fonctions planifiées (validation header) |
| Input sanitization | DOMPurify sur contenu HTML |

### Webhooks (exceptions verify_jwt)

- `treasury-bridge-webhook` : vérification signature
- `suivi-stripe-checkout` : vérification Stripe signature
- `email-to-ticket` : validation expéditeur

---

## 7. CORS

Configuration Supabase par défaut + Edge Functions avec headers appropriés.

---

## 8. Audit et traçabilité

### Table `activity_log`

```sql
-- Journal d'audit métier
INSERT INTO activity_log (
  module, entity_type, entity_id, action,
  actor_id, actor_type, agency_id,
  old_values, new_values, metadata
) VALUES (...);
```

### Colonnes de traçabilité

| Table | Colonnes |
|-------|---------|
| `user_modules` | `created_at` (pas de `granted_by` en V1) |
| `agency_features` | `activated_at`, `status` |
| `apogee_ticket_history` | `user_id`, `action_type`, `old_value`, `new_value` |

### Manques actuels (V1)

- ❌ Pas de `granted_by` sur `user_modules`
- ❌ Pas de table `permissions_audit_log` dédiée
- ❌ Pas d'alerte sur modifications sensibles

> Ces manques sont adressés par la V2 (`user_access.granted_by`, `granted_at`).

---

## 9. Checklist sécurité

- [x] RLS activé sur toutes les tables
- [x] `verify_jwt = true` sur toutes les Edge Functions
- [x] Trigger protection `global_role`
- [x] Fonctions SECURITY DEFINER pour RLS
- [x] Plafonnement N-1 sur création/suppression users
- [x] Chiffrement AES-256-GCM données sensibles
- [x] Rate limiting Edge Functions critiques
- [x] Input sanitization (DOMPurify)
- [x] CORS configuré
- [ ] MFA N4+ (prévu)
- [ ] Audit trail permissions dédié (V2)
- [ ] Alertes modifications sensibles (V2)

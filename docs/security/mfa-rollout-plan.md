# MFA Rollout Plan — Operia

> Date : 2026-03-08

## 1. Rôles concernés

| Rôle | Niveau | Priorité MFA | Justification |
|------|--------|-------------|---------------|
| `superadmin` | N6 | 🔴 Critique | Accès total à la plateforme |
| `platform_admin` | N5 | 🔴 Critique | Gestion utilisateurs, exports, modules |
| `franchisor_admin` | N4 | 🟠 Haute | Gestion réseau franchiseur |
| `franchisor_user` | N3 | 🟡 Moyenne | Accès réseau en lecture — MFA optionnel pour l'instant |
| `franchisee_admin` | N2 | ⚪ Non requis | Scope limité à l'agence |
| `franchisee_user` | N1 | ⚪ Non requis | Accès opérationnel |
| `base_user` | N0 | ⚪ Non requis | Accès minimal |

**Seuil actuel** : N4+ (`franchisor_admin`, `platform_admin`, `superadmin`)

## 2. Ordre d'activation recommandé

### Phase 1 — Advisory (actuel)
**Durée recommandée** : 2-4 semaines

- Mode `advisory` activé
- Les N4+ voient un banner d'incitation au MFA sur les zones sensibles
- Aucun blocage
- Objectif : tous les N5/N6 s'enrollent volontairement

### Phase 2 — Enforced N5+
**Prérequis** : Tous les `platform_admin` et `superadmin` ont enrollé leur MFA

- Passer `MFA_ENFORCEMENT_MODE` à `'enforced'`
- Optionnel : Baisser `MFA_MIN_ROLE_LEVEL` temporairement à `5` pour ne cibler que N5+
- Les N5+ sont bloqués sur les zones sensibles sans AAL2
- Les N4 restent en advisory

### Phase 3 — Enforced N4+
**Prérequis** : Phase 2 stable pendant 2+ semaines

- Rétablir `MFA_MIN_ROLE_LEVEL` à `4`
- Tous les N4+ doivent avoir MFA pour accéder aux zones sensibles

### Phase 4 (optionnel) — Extension N3
- Évaluer si les `franchisor_user` (N3) doivent être inclus
- Si oui, baisser `MFA_MIN_ROLE_LEVEL` à `3`

## 3. Mode progressif

Le système utilise un triple mécanisme de progressivité :

```
MFA_ENFORCEMENT_MODE  ──→  'off' | 'advisory' | 'enforced'
MFA_MIN_ROLE_LEVEL    ──→  Seuil de rôle (actuellement N4)
MfaGuard enforce prop ──→  Override local par zone
```

Cela permet :
- **Activation globale progressive** via le mode
- **Ciblage fin par rôle** via le seuil
- **Enforcement par zone** via le prop `enforce` du MfaGuard

## 4. Procédure de secours / Recovery

### Scénario : Admin a perdu son authenticator

1. **Via Supabase Dashboard** (recommandé) :
   - Un superadmin accède au Dashboard Supabase
   - Navigue vers Authentication > Users
   - Trouve l'utilisateur concerné
   - Supprime les facteurs MFA manuellement
   - L'utilisateur peut se reconnecter et ré-enroller

2. **Via l'API** (si accès au Dashboard impossible) :
   ```sql
   -- Dans le SQL Editor Supabase
   DELETE FROM auth.mfa_factors WHERE user_id = '<user-uuid>';
   ```

3. **Mesure temporaire** :
   - Passer `MFA_ENFORCEMENT_MODE` à `'advisory'` le temps de résoudre
   - Déployer, puis repasser en `'enforced'` après recovery

### Scénario : Rollback d'urgence

Si le MFA cause des problèmes en production :
1. Modifier `MFA_ENFORCEMENT_MODE` → `'off'` dans `src/lib/mfa.ts`
2. Déployer
3. Tous les utilisateurs retrouvent un accès normal immédiatement
4. Les enrollments MFA existants ne sont PAS supprimés (réactivation propre possible)

## 5. Communication

### Avant Phase 2

Envoyer une notification aux N5+ :
> "L'authentification à deux facteurs sera bientôt obligatoire pour votre rôle. 
> Activez-la dès maintenant depuis les zones d'administration."

### Avant Phase 3

Envoyer une notification aux N4 :
> "L'authentification à deux facteurs sera obligatoire à partir du [date]. 
> Configurez-la depuis les zones d'administration."

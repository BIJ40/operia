

# Plan : Corriger le blocage P0 — Synchronisation comptes E2E

## Probleme

Les tests utilisent des emails `@operia.dev` avec des mots de passe uniques par rôle. Le seeder crée des comptes `@helpconfort.test` avec un mot de passe unifié `Test1234!`. Aucun test ne peut se connecter.

## Decision : le seeder est la source de vérité

Le seeder crée les comptes en base. Les tests doivent s'aligner dessus, pas l'inverse.

## Comptes E2E finaux retenus

| Clé test | Email (seeder) | Password | Rôle | Usage tests |
|----------|---------------|----------|------|-------------|
| `base_user` | `test-n1@helpconfort.test` | `Test1234!` | `franchisee_user` (N1) | Accès refusé admin |
| `franchisee_admin` | `test-n2@helpconfort.test` | `Test1234!` | `franchisee_admin` (N2) | Accès agence, login |
| `platform_admin` | `test-n5@helpconfort.test` | `Test1234!` | `platform_admin` (N5) | Admin, backup, tickets |

Note : `base_user` dans les tests pointe vers le N1 (franchisee_user) du seeder — c'est le rôle le plus bas disponible, suffisant pour valider les refus d'accès admin.

## Modification — un seul fichier

**`tests/e2e/fixtures/test-helpers.ts`** : aligner les 3 entrées `TEST_USERS` sur les credentials du seeder.

```typescript
export const TEST_USERS = {
  base_user: {
    email: 'test-n1@helpconfort.test',
    password: 'Test1234!',
    role: 'franchisee_user',
  },
  franchisee_admin: {
    email: 'test-n2@helpconfort.test',
    password: 'Test1234!',
    role: 'franchisee_admin',
  },
  platform_admin: {
    email: 'test-n5@helpconfort.test',
    password: 'Test1234!',
    role: 'platform_admin',
  },
} as const;
```

Aucun autre fichier modifié. Les 5 specs (`auth`, `permissions`, `tickets`, `admin-users`, `backup`) importent `TEST_USERS` depuis ce fichier unique — elles seront automatiquement alignées.

Le seeder (`seed-test-users/index.ts`) reste inchangé.


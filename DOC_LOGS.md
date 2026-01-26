# Documentation Système de Logs

> **Dernière mise à jour** : 26 Janvier 2026

## Vue d'ensemble

Le projet utilise un système de logs centralisé défini dans `src/lib/logger.ts`. Ce système permet de contrôler le niveau de verbosité des logs entre environnement de développement et production.

**Intégration Sentry** : Les erreurs (`logError()`) sont automatiquement envoyées à Sentry quand `VITE_SENTRY_DSN` est défini. Les loggers catégorisés (`logApogee.error`, `logAuth.error`, etc.) en profitent automatiquement via `logError`.

## Niveaux de logs

| Niveau | Fonction | Visibilité en DEV | Visibilité en PROD | Sentry |
|--------|----------|-------------------|---------------------|--------|
| DEBUG | `logDebug()` | ✅ Actif | ❌ Masqué (sauf si `VITE_DEBUG_LOGS=true`) | ❌ |
| INFO | `logInfo()` | ✅ Actif | ✅ Actif | ❌ |
| WARN | `logWarn()` | ✅ Actif | ✅ Actif | ❌ |
| ERROR | `logError()` | ✅ Actif | ✅ Actif | ✅ Auto |
| DEPRECATED | `logDeprecation()` | ✅ Actif | ⚠️ Une seule fois par message | ❌ |

## Migration console.* → logger

### Fichiers migrés ✅
- `src/services/supportService.ts`
- `src/lib/db.ts`
- `src/lib/rag-michu.ts`
- `src/hooks/use-user-presence.ts`
- `src/hooks/use-admin-stats.ts`
- `src/hooks/use-cache-backup.ts`
- `src/hooks/use-diffusion-settings.ts`
- `src/hooks/use-support-ticket.ts`
- `src/hooks/use-admin-support.ts`
- `src/hooks/use-admin-tickets.ts`
- `src/hooks/use-user-tickets.ts`
- `src/hooks/use-category.ts`
- `src/hooks/use-page-metadata.ts`
- `src/apogee-tickets/hooks/useTicketPermissions.ts`
- `src/apogee-tickets/hooks/useApogeeTickets.ts`
- `src/franchiseur/hooks/useNetworkStats.ts`
- `src/franchiseur/hooks/usePeriodComparison.ts`
- `src/pages/NotFound.tsx`
- `src/components/admin/OnlineUsers.tsx`
- `src/components/admin/chatbot-rag/RagQuestionsTab.tsx`

### À migrer (TODO)
Environ 80 fichiers restants avec ~1500+ console.* à migrer progressivement.
Priorité : fichiers avec `console.error` (erreurs critiques pour Sentry).

## Activer les logs détaillés en production

Pour débugger un problème en production, ajoutez la variable d'environnement :

```
VITE_DEBUG_LOGS=true
```

Cela activera tous les logs `logDebug()` habituellement masqués.

## Logs catégorisés

Pour faciliter le filtrage dans la console, des loggers catégorisés sont disponibles :

### Logs Apogée API (`logApogee`)
```typescript
import { logApogee } from '@/lib/logger';

logApogee.debug('Appel API en cours...');  // [DEBUG] [APOGEE] Appel API en cours...
logApogee.error('Erreur HTTP', { status: 500 });  // [ERROR] [APOGEE] Erreur HTTP {...}
```

Fichiers concernés :
- `src/apogee-connect/services/api.ts` - Appels API Apogée
- `src/apogee-connect/contexts/AgencyContext.tsx` - Configuration agence

### Logs Authentification (`logAuth`)
```typescript
import { logAuth } from '@/lib/logger';

logAuth.debug('Session chargée');  // [DEBUG] [AUTH] Session chargée
logAuth.warn('Token expiré');  // [WARN] [AUTH] Token expiré
```

Fichiers concernés :
- `src/contexts/AuthContext.tsx` - Gestion de l'authentification et permissions

### Logs Permissions (`logPermissions`)
```typescript
import { logPermissions } from '@/lib/logger';

logPermissions.debug('Calcul permission pour scope X');
logPermissions.warn('Fallback block_id legacy utilisé');
```

### Logs Cache (`logCache`)
```typescript
import { logCache } from '@/lib/logger';

logCache.debug('Backup sauvegardé');  // [DEBUG] [CACHE] Backup sauvegardé
logCache.info('Cache vidé');  // [INFO] [CACHE] Cache vidé
```

Fichiers concernés :
- `src/lib/cache-backup.ts` - Système de backup IndexedDB
- `src/lib/cache-manager.ts` - Gestion du cache applicatif

## Bonnes pratiques

### À faire ✅
```typescript
// Import centralisé
import { logDebug, logError, logApogee } from '@/lib/logger';

// Log informatif en dev uniquement
logDebug('Données chargées:', data);

// Erreur avec contexte
logApogee.error('Erreur API', { endpoint, status, error });

// Fonction dépréciée
logDeprecation('hasAccessToBlock est déprécié, utiliser canViewScope()');
```

### À éviter ❌
```typescript
// NE PAS FAIRE - console brut
console.log('Debug:', data);  // ❌ Polluera la console en prod

// NE PAS FAIRE - données sensibles
logInfo('User:', { email, password });  // ❌ Jamais de mot de passe dans les logs
```

## Filtrage dans la console navigateur

Dans la console Chrome/Firefox, utilisez ces filtres :

- `[APOGEE]` - Voir tous les logs API Apogée
- `[AUTH]` - Voir tous les logs d'authentification
- `[CACHE]` - Voir tous les logs de cache/backup
- `[DEBUG]` - Voir tous les logs de debug
- `[ERROR]` - Voir uniquement les erreurs
- `[DEPRECATED]` - Voir les fonctions obsolètes utilisées

## Structure des fichiers

```
src/lib/
├── logger.ts          # Utilitaire de logs centralisé
├── cache-backup.ts    # Utilise logCache
└── cache-manager.ts   # Utilise logCache

src/contexts/
└── AuthContext.tsx    # Utilise logAuth, logPermissions

src/apogee-connect/
├── services/api.ts    # Utilise logApogee
└── contexts/AgencyContext.tsx  # Utilise logApogee
```

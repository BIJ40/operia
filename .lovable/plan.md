
# Diagnostic : Gestion des Apporteurs et Erreurs d'Accès API

## ✅ Phase 1 : COMPLÉTÉE

Le routage automatique des apporteurs est en place :
- `src/hooks/useApporteurCheck.ts` - Vérifie si l'utilisateur est un apporteur actif
- `src/components/auth/AuthRouter.tsx` - Bloque le rendu des composants internes pendant la vérification et redirige vers `/apporteur/dashboard`

## Prochaines Étapes

1. **Court terme** : Raccorder l'apporteur test à Apogée (définir `apogee_client_id` dans la table `apporteurs`)
2. **Moyen terme** : Créer un wizard d'onboarding apporteur pour guider le raccordement

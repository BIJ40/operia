

# Plan de correction global : Éliminer le "pseudo-refresh" au changement d'onglet navigateur

## Diagnostic confirmé

Les logs réseau prouvent que l'application se "remonte" complètement à chaque retour d'onglet :
- Nouveau log de connexion créé
- Ancien log de connexion fermé (durée: 28-42 secondes)
- Profil utilisateur rechargé depuis Supabase
- Modules effectifs rechargés via RPC

Cette cascade provient de l'objet `user` qui change de référence dans les dépendances React, même si l'utilisateur est identique.

---

## Correction A : Stabiliser les hooks globaux (cause principale)

**Fichiers concernés :**
- `src/hooks/use-connection-logger.ts`
- `src/hooks/use-user-presence.ts`

**Probleme actuel (ligne 94 de use-connection-logger) :**
```typescript
}, [user]);  // <- L'objet user change de référence au retour d'onglet
```

**Solution :**
Remplacer la dépendance `[user]` par `[user?.id]` pour que l'effet ne se ré-exécute QUE si l'utilisateur change réellement (login/logout).

```typescript
// use-connection-logger.ts
const userId = user?.id;

useEffect(() => {
  if (!userId) return;
  // ... logique existante avec userId au lieu de user.id
}, [userId]);  // Stable tant que l'utilisateur reste le même
```

```typescript
// use-user-presence.ts  
const userId = user?.id;

useEffect(() => {
  if (!userId) return;
  // ... logique existante
}, [userId]);  // Stable
```

**Impact attendu :**
- Plus de logs "Déconnexion/Connexion" au simple changement d'onglet
- Réduction massive des appels réseau inutiles

---

## Correction B : Protéger les Dialog/Sheet contre la fermeture au changement d'onglet

**Fichiers concernés :**
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`

**Probleme actuel :**
Radix Dialog détecte une perte de focus quand l'onglet navigateur perd le premier plan et peut déclencher une fermeture.

**Solution :**
Ajouter des handlers par défaut qui bloquent la fermeture si `document.hidden === true` :

```typescript
// dialog.tsx - DialogContent
<DialogPrimitive.Content
  onFocusOutside={(e) => {
    if (document.hidden) e.preventDefault();
  }}
  onPointerDownOutside={(e) => {
    if (document.hidden) e.preventDefault();
  }}
  // ... reste des props
>
```

```typescript
// sheet.tsx - SheetContent
<SheetPrimitive.Content
  onFocusOutside={(e) => {
    if (document.hidden) e.preventDefault();
  }}
  // ... reste des props
>
```

**Impact attendu :**
- Les modales restent ouvertes quand tu changes d'onglet pour copier du texte
- Le comportement normal (clic extérieur, ESC, bouton X) reste fonctionnel

---

## Correction C : Ignorer USER_UPDATED si l'utilisateur est identique

**Fichier concerné :**
- `src/contexts/AuthContext.tsx`

**Probleme actuel (lignes 411-418) :**
L'événement `USER_UPDATED` est autorisé même si `newUserId === prevUserId`, ce qui peut déclencher un rechargement complet des données utilisateur.

**Solution :**
Modifier la condition pour aussi ignorer `USER_UPDATED` si l'id n'a pas changé :

```typescript
// Ligne 411-419 actuelle
if (
  newUserId === prevUserId &&
  event !== 'SIGNED_IN' &&
  event !== 'SIGNED_OUT' &&
  event !== 'USER_UPDATED'  // <- À RETIRER
) {
  return;
}
```

```typescript
// Nouveau code
if (
  newUserId === prevUserId &&
  event !== 'SIGNED_IN' &&
  event !== 'SIGNED_OUT'
  // USER_UPDATED ignoré si même utilisateur
) {
  return;
}
```

**Impact attendu :**
- Moins de rechargements `loadUserData()` inutiles
- Réduction du temps de "loader visible" au retour d'onglet

---

## Récapitulatif des fichiers modifiés

| Fichier | Type de modification |
|---------|---------------------|
| `src/hooks/use-connection-logger.ts` | Dépendance `[user]` → `[user?.id]` |
| `src/hooks/use-user-presence.ts` | Dépendance `[user]` → `[user?.id]` |
| `src/components/ui/dialog.tsx` | Protection `onFocusOutside` |
| `src/components/ui/sheet.tsx` | Protection `onFocusOutside` |
| `src/contexts/AuthContext.tsx` | Ignorer `USER_UPDATED` si id identique |

---

## Garanties de non-régression

- Les corrections Dialog/Sheet sont conditionnelles à `document.hidden` : aucun impact sur le comportement normal
- La stabilisation des hooks utilise `user?.id` qui est une string stable : pas de risque de bugs de type
- La modification AuthContext est conservative : seuls les événements redondants sont filtrés

---

## Ce que tu verras après correction

- Plus de loader bleu flash au retour d'onglet
- Les popups d'édition restent ouvertes quand tu copies du texte depuis un autre onglet
- Plus de logs "Déconnexion enregistrée. Durée: X secondes" intempestifs
- La page `/guide-apogee` reste inchangée (elle fonctionnait déjà)


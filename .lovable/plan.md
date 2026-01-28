

# Suppression des Pages Legacy RH Collaborateur

## Contexte

Tu as deux systèmes de visualisation des fiches collaborateur :
- **NOUVEAU (à conserver)** : Interface Cockpit + onglets navigateur dans `/rh/suivi` qui utilise `RHCollaboratorPanel.tsx` avec ses sections repliables (Compétences, Sécurité, Documents)
- **LEGACY (à supprimer)** : Pages avec onglets classiques (Essentiel, RH, Sécurité & EPI, Compétences, IT & Accès, Documents) accessibles via `/rh/suivi/:id`

L'image que tu as envoyée montre l'ancienne interface avec l'onglet "IT & Accès" - c'est exactement ce qu'il faut supprimer.

---

## Ce qui sera supprimé

### Fichiers à supprimer

| Fichier | Raison |
|---------|--------|
| `src/pages/rh/RHCollaborateurPage.tsx` | Page legacy avec onglets |
| `src/components/rh/tabs/RHTabEssentiel.tsx` | Onglet Essentiel legacy |
| `src/components/rh/tabs/RHTabRH.tsx` | Onglet RH legacy |
| `src/components/rh/tabs/RHTabSecurite.tsx` | Onglet Sécurité legacy |
| `src/components/rh/tabs/RHTabCompetences.tsx` | Onglet Compétences legacy |
| `src/components/rh/tabs/RHTabParc.tsx` | Onglet Parc legacy |
| `src/components/rh/tabs/RHTabIT.tsx` | Onglet IT & Accès legacy |
| `src/components/rh/tabs/RHTabDocuments.tsx` | Onglet Documents legacy |
| `src/components/rh/tabs/components/` | Dossier sous-composants |

### Routes à modifier

Dans `src/routes/rh.routes.tsx` :
- Supprimer la route `/rh/suivi/:id` qui pointe vers `RHCollaborateurPage`
- Supprimer les routes legacy `/rh/equipe/:id` et `/hc-agency/collaborateurs/:id`
- Rediriger ces anciennes URLs vers `/rh/suivi` (le cockpit)

---

## Ce qui sera conservé

- `RHSuiviIndex.tsx` - La page cockpit principale
- `src/components/rh/browser-tabs/` - Système d'onglets navigateur moderne
- `src/components/rh/cockpit/` - Interface cockpit
- `src/components/rh/sections/` - Sections modernes (RHSectionSecurite, RHSectionCompetences, RHSectionDocuments)
- `RHCollaboratorPanel.tsx` - Le panneau moderne utilisé dans les browser-tabs

---

## Résumé technique

```text
SUPPRESSION:
├── src/pages/rh/RHCollaborateurPage.tsx
└── src/components/rh/tabs/
    ├── RHTabEssentiel.tsx
    ├── RHTabRH.tsx
    ├── RHTabSecurite.tsx
    ├── RHTabCompetences.tsx
    ├── RHTabParc.tsx
    ├── RHTabIT.tsx
    ├── RHTabDocuments.tsx
    └── components/

MODIFICATION:
└── src/routes/rh.routes.tsx → Redirection /rh/suivi/:id vers /rh/suivi
```

Après cette suppression, l'accès à une fiche collaborateur se fera uniquement via le cockpit (`/rh/suivi`) en double-cliquant sur une ligne ou via le système d'onglets navigateur.


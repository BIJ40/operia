

# Audit de nettoyage — Code mort identifié

## Fichiers à supprimer

### 1. Franchiseur browser-tabs (6 fichiers) — **jamais importés en dehors de leur propre dossier**
Le `FranchiseurView` utilise son propre système d'onglets inline (Tabs shadcn), pas ce système browser-tabs.

- `src/franchiseur/components/browser-tabs/BrowserTab.tsx`
- `src/franchiseur/components/browser-tabs/BrowserTabsBar.tsx`
- `src/franchiseur/components/browser-tabs/BrowserTabsContent.tsx`
- `src/franchiseur/components/browser-tabs/BrowserTabsContext.tsx`
- `src/franchiseur/components/browser-tabs/index.ts`
- `src/franchiseur/components/browser-tabs/types.ts`

### 2. PublicLanding (1 fichier) — **exporté mais jamais importé**
- `src/components/layout/PublicLanding.tsx`

### 3. Mise à jour de `src/components/layout/index.ts`
Retirer l'export de `PublicLanding`.

---

## Fichiers conservés (justification)

| Fichier | Raison |
|---------|--------|
| `unified/tabs/AdminTabContent.tsx` | Utilisé par `SidebarContentRouter` |
| `unified/tabs/AdminHubContent.tsx` | Utilisé par `AdminTabContent` |
| `unified/tabs/MapsTabContent.tsx` | Utilisé par `SidebarContentRouter` |
| `unified/tabs/DiversTabContent.tsx` | Utilisé par `FranchiseurView` |
| `unified/tabs/GuidesTabContent.tsx` | Utilisé par `FranchiseurView` |
| `unified/tabs/AideTabContent.tsx` | Utilisé par `FranchiseurView` |
| `unified/tabs/TicketingTabContent.tsx` | Utilisé par `FranchiseurView` |
| `unified/tabs/VehiculesTabContent.tsx` | **Potentiellement mort** — à vérifier lors de l'implémentation |
| `WorkspaceNavLinks.tsx` | Utilisé par `MinimalLayout` (routes sub-pages) |
| `filterNavigationByPermissions.ts` | Utilisé par `WorkspaceNavLinks` |
| `ProfileMenu.tsx` | Utilisé par `FranchiseurView` + `WorkspaceNavLinks` |
| Apporteur browser-tabs (tout le dossier) | Activement utilisé par `ApporteurLayout` |

## Résumé

**7 fichiers à supprimer**, 1 fichier à modifier. Impact : suppression du système browser-tabs franchiseur inutilisé et d'un composant landing orphelin.


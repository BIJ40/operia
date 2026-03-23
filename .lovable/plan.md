

# Élargir la zone de contenu (header + pages)

## Objectif
Passer de `max-w-7xl` (1280px) à une largeur plus grande, tout en conservant des marges de chaque côté (~80-100px, équivalent à la largeur de l'onglet "Profil"). Cela donne environ **1600px** de max-width sur un écran standard.

## Approche

### 1. Définir la nouvelle largeur dans Tailwind config
Ajouter une valeur custom `max-w-app` dans `tailwind.config.ts` → `maxWidth: { app: '1600px' }`. Cela centralise la valeur et facilite les ajustements futurs.

### 2. Remplacer `max-w-7xl` par `max-w-app` partout
Fichiers impactés (~43 fichiers) — remplacement global de `max-w-7xl` par `max-w-app` :

- **Header** : `src/components/navigation/MainHeader.tsx`
- **Dashboard** : `src/pages/DashboardStatic.tsx`
- **Onglets principaux** : `PilotageTabContent`, `StatsTabContent`, `CommercialTabContent`, `OrganisationTabContent`, `AdminHubContent`, `AideTabContent`, `GuidesTabContent`, `DiversTabContent`
- **Pages admin** : `AdminAgencies`, `AdminApogeeGuides`, `AdminHelpConfortBackup`, `TDRUsersPage`
- **Layouts** : `AppLayout`, `WorkspaceNavLinks`, `FranchiseurView`, `FranchiseurPageContainer`
- **Pages détail** : `CollaborateurProfilePage`, `FranchiseurAgencyProfile`, `ApporteursPage`, `ApogeeTicketsHistory`
- Et tous les autres fichiers utilisant `max-w-7xl`

### Détail technique
| Fichier | Modification |
|---|---|
| `tailwind.config.ts` | Ajouter `maxWidth: { app: '1600px' }` dans `theme.extend` |
| ~43 fichiers `.tsx` | Remplacer `max-w-7xl` → `max-w-app` |

La valeur de 1600px laisse ~160px de marge de chaque côté sur un écran 1920px, soit environ la largeur d'un onglet de navigation.


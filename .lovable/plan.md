

## Ajout d'un bouton fermer (X) sur le bandeau info RDV de la carte dashboard

### Fichier modifié
- **`src/components/dashboard/v2/DashboardMapWidget.tsx`** (lignes 397-426)

### Changement
Ajouter un bouton `X` en haut à droite du bandeau d'info RDV sélectionné, qui appelle `setSelectedRdv(null)` au clic.

Concrètement, ajouter un `<button>` avec une icône `X` (lucide) entre les avatars tech et le coin droit du bandeau, ou remplacer la zone avatars par une ligne avec avatars + bouton close.

```text
┌─────────────────────────────────────────────┐
│ BOURRELIERE                    👤👤    ✕    │
│ 186 RUE DES BRUYERES...                    │
│ 08:00  • 240 min  renovation                │
└─────────────────────────────────────────────┘
```


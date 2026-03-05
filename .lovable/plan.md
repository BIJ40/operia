

## Remplacement du Slider "Porteur" par 5 boutons radio

### Changement

Remplacer le composant `OwnerSideSlider` (slider Radix avec snapping) par **5 boutons toggle** : `APO | 75/25 | 50/50 | 25/75 | HC`, sélection unique, avec possibilité de désélectionner (retour à `null`).

### Implémentation

**Fichier unique** : `src/apogee-tickets/components/OwnerSideSlider.tsx`

- Supprimer le `Slider` Radix et le remplacer par un groupe de 5 boutons
- **Mode compact** (utilisé dans le panel inline et les tables) : boutons petits en ligne, style pill/toggle
- **Mode normal** (drawer, création) : boutons plus grands avec label + reset

```text
Mode compact :
┌─────┬───────┬───────┬───────┬────┐
│ APO │ 75/25 │ 50/50 │ 25/75 │ HC │  ← 5 boutons, le sélectionné est coloré
└─────┴───────┴───────┴───────┴────┘

Mode normal :
Porteur du projet
┌──────────┬───────┬───────┬───────┬──────┐
│  Apogée  │ 75/25 │ 50/50 │ 25/75 │  HC  │  + bouton reset
└──────────┴───────┴───────┴───────┴──────┘
  Apogée: 75%              HC: 25%
```

- Couleurs : APO = bleu, HC = orange, intermédiaires = violet/gradient
- Clic sur le bouton déjà sélectionné = désélection (retour `null`)
- Les helpers `ownerSideToSliderValue`, `sliderValueToOwnerSide`, etc. restent inchangés (même API)
- Aucun autre fichier à modifier : tous les parents utilisent déjà `value`/`onChange` avec les mêmes valeurs numériques


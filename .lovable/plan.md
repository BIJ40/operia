

## Plan : Adapter le webhook au format attendu par `receive-photos`

### Constat

Le webhook `dispatch-realisation-webhook` envoie actuellement un payload générique avec un header `X-API-KEY`. Or, ton outil externe (`receive-photos`) attend un format précis :

```json
{
  "secret": "whsec_5b9e...",
  "photos": [
    { "url": "https://signed-url...", "label": "avant", "chantier": "nom-du-chantier" }
  ]
}
```

Il faut donc adapter la fonction pour :
1. Récupérer les médias de la réalisation + générer des **signed URLs**
2. Envoyer le payload dans le **format exact** attendu
3. Utiliser le `WEBHOOK_SECRET` (`whsec_...`) dans le body

### Secret manquant

Le secret `WEBHOOK_SECRET` n'est pas encore configuré côté Lovable/Supabase secrets. Il faut l'ajouter avec la valeur `whsec_5b9e7f0c4d3a2f1e6c8b7a9d0e4f3c2b1a6d9e8c7f5a4b3d2c1e0f9a8b7c6d5`.

### Modifications

**1. Ajouter le secret `WEBHOOK_SECRET`**

**2. Réécrire `supabase/functions/dispatch-realisation-webhook/index.ts`**

- Après avoir chargé la réalisation, **fetch les médias** depuis `realisation_media`
- Pour chaque média, **générer une signed URL** (durée 1h) depuis le bucket `realisations-private`
- Construire le payload au format attendu :
  ```json
  {
    "secret": "<WEBHOOK_SECRET>",
    "photos": [
      {
        "url": "https://signed-url...",
        "label": "before",
        "chantier": "Remplacement serrure 3 points"
      }
    ]
  }
  ```
- `label` = `media_role` du média (before/during/after)
- `chantier` = `title` de la réalisation
- Le reste de la logique (guards anti-doublon, mise à jour sync status, activity log) reste identique

**3. Redéployer la fonction**

### Résultat

Quand une réalisation est créée avec des photos, le webhook envoie directement les URLs signées des photos à `receive-photos`, dans le format exact qu'il attend. L'outil externe peut immédiatement télécharger les images sans appel supplémentaire à `content-api`.


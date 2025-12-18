# AUDIT MODULE STATIA
> Date: 2025-12-18 | Version: 0.8.1

## 1. PÉRIMÈTRE

### Description
Module d'analytics et KPIs temps réel pour le pilotage d'agence. Intègre les données Apogée (factures, interventions, devis, techniciens) pour générer des métriques métier.

### Routes
- `/hc-agency/statia` - Dashboard principal
- `/hc-agency/statia/advanced` - Métriques avancées
- `/hc-reseau/statia` - Vue réseau franchiseur

### Tables Supabase
- `ai_search_cache` - Cache des requêtes IA StatIA

## 2. ARCHITECTURE

### Fichiers principaux
```
src/statia/
├── domain/
│   └── rules.ts              # SOURCE DE VÉRITÉ - Règles métier
├── definitions/
│   ├── index.ts              # Registre des définitions
│   ├── ca.ts                 # Métriques CA
│   ├── techniciens.ts        # Métriques techniciens
│   ├── devis.ts              # Métriques devis
│   ├── interventions.ts      # Métriques interventions
│   ├── apporteurs.ts         # Métriques apporteurs
│   ├── univers.ts            # Métriques par univers
│   ├── qualite.ts            # Métriques qualité/SAV
│   ├── recouvrement.ts       # Métriques recouvrement
│   └── advanced.ts           # Métriques avancées
├── hooks/
│   ├── useStatiaEngine.ts    # Moteur de calcul principal
│   ├── useStatiaReseauDashboard.ts # Dashboard réseau
│   └── useApporteursStatia.ts # Stats apporteurs
├── components/
│   └── ...                   # Composants UI
└── shared/utils/
    └── technicienUniversEngine.ts # Attribution CA techniciens
```

### Dépendances externes
- API Apogée via `proxy-apogee` Edge Function
- Données: factures, interventions, devis, projets, clients, users

## 3. RÈGLES MÉTIER CRITIQUES

### CA (Chiffre d'Affaires)
- **Source**: `apiGetFactures.data.totalHT`
- **États inclus**: TOUS (draft, sent, paid, partially_paid, overdue)
- **Avoirs**: Montants négatifs, réduisent le CA
- **Date**: `dateReelle` prioritaire, sinon `date`

### Attribution CA Techniciens
- **Types productifs**: depannage, travaux, "recherche de fuite"
- **Types NON productifs**: RT, TH, SAV, diagnostic
- **RT ne génère JAMAIS de CA technicien**
- **Attribution**: Proportionnelle au temps via `getInterventionsCreneaux`

### SAV
- **Identification**: dossier lié/enfant
- **Impact CA**: 0€
- **Impact stats technicien**: AUCUN

### Devis (taux transformation)
- **États validés**: validated, signed, order, accepted
- **Taux nombre**: count(facturés) / count(émis)
- **Taux montant**: sum(HT_facturé) / sum(HT_devisé)

## 4. PROBLÈMES IDENTIFIÉS

### P0 - Critiques
- ❌ Aucun problème critique identifié

### P1 - Importants
- ⚠️ `src/statia/definitions/univers.ts:29` - Type `any` à typer
- ⚠️ Console.log conditionnels (DEV only) - OK mais à surveiller

### P2 - Améliorations
- 📝 Métriques CA tranche horaire - TODO à implémenter
- 📝 `tauxFidelite`, `croissanceCA` apporteurs - TODO

## 5. SÉCURITÉ

### RLS
- ✅ Cache StatIA protégé par RLS
- ✅ Données Apogée masquées côté serveur (email, tel, adresse)

### Isolation données
- ✅ URL Apogée construite dynamiquement depuis `profile.agence`
- ✅ Pas d'URL hardcodée

## 6. TESTS RECOMMANDÉS

```typescript
// Test attribution CA technicien
- Vérifier qu'un RT n'attribue pas de CA
- Vérifier prorata temps multi-techniciens
- Vérifier exclusion SAV des stats

// Test métriques
- CA mois = somme factures période
- Taux transformation devis cohérent
- Délai premier RDV correct
```

## 7. ÉVOLUTIONS PRÉVUES

1. Métriques CA par tranche horaire
2. Taux fidélité apporteurs
3. Croissance CA apporteurs YoY
4. Export PDF rapport mensuel intégré

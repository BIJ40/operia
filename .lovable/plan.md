
# Plan de Correction : Identification Techniciens + Calcul CA

## 🎯 Objectif
Corriger deux problèmes critiques :
1. **Sébastien Caron** (non-technicien) reçoit du CA alors qu'il ne devrait pas
2. **Techniciens manquants** dans les listes d'autres agences

## 📋 Résumé des changements

### Fichier 1 : `src/apogee-connect/utils/techTools.ts`

**Modifications :**
- Ajouter une liste de types utilisateurs exclus : `commercial`, `admin`, `assistant`, `administratif`
- Normaliser la vérification `is_on` pour accepter `true`, `1`, `"1"`, `"true"` (évite les techniciens manquants)
- Créer deux helpers réutilisables : `normalizeIsOn()` et `isExcludedUserType()`

### Fichier 2 : `src/statia/domain/rules.ts`

**Modifications :**
- Ajouter `"TH"` (Taux d'Humidité) dans `nonProductiveTypes`
- Ajouter `"recherche de fuite"` dans `productiveTypes`
- Ajouter `excludedUserTypes` pour documenter les types non-techniciens
- Enrichir les constantes `TH_TYPES` avec les variantes

### Fichier 3 : `src/shared/utils/technicienUniversEngine.ts`

**Modifications :**
- Ajouter exclusion explicite des types TH dans `calculateTechTimeByProject()`
- Ajouter cas spécial "recherche de fuite" = toujours productif (même sans biDepan/biTvx)
- Utiliser les helpers normalisés de `techTools.ts`
- Exclure les types utilisateurs non-techniciens (commercial, admin, etc.)

### Fichier 4 : `src/apogee-connect/utils/technicienUniversCalculations.ts`

**Modifications :**
- Aligner la logique sur `technicienUniversEngine.ts`
- Ajouter exclusion TH
- Ajouter cas spécial "recherche de fuite"

---

## 🔧 Détail technique des changements

### `techTools.ts` - Nouveau code

```typescript
// Types utilisateurs explicitement NON techniciens
export const EXCLUDED_USER_TYPES = ['commercial', 'admin', 'assistant', 'administratif'];

// Normalise is_on pour gérer tous les formats API
export function normalizeIsOn(value: unknown): boolean {
  if (value === true) return true;
  if (value === 1) return true;
  if (value === "1") return true;
  if (typeof value === 'string' && value.toLowerCase() === 'true') return true;
  return false;
}

// Vérifie si un type est exclu
export function isExcludedUserType(userType: string): boolean {
  return EXCLUDED_USER_TYPES.includes(userType.toLowerCase().trim());
}
```

### `technicienUniversEngine.ts` - Exclusion TH + Recherche fuite

```typescript
// NOUVEAU: Exclure TH (Taux d'Humidité)
const isTH = type2Lower === "th" || 
             type2Lower.includes("taux d'humidité") || 
             type2Lower.includes("taux humidite");
if (isTH) return; // Ne génère pas de CA

// NOUVEAU: Recherche de fuite = toujours productif
const isRechercheFuite = type2Lower.includes('recherche de fuite') || 
                         type2Lower.includes('recherche fuite');
if (isRechercheFuite) {
  // Traiter comme productif même sans biDepan/biTvx
  // Continuer le traitement normalement
}
```

---

## ✅ Règles métier après correction

### Qui est un technicien ?
| Condition | Résultat |
|-----------|----------|
| `isTechnicien === true` (ou 1) | ✅ Technicien |
| `type === 'technicien'` | ✅ Technicien |
| `type === 'utilisateur'` ET `universes` non vide | ✅ Technicien |
| `is_on` normalisé = true | ✅ Actif |
| `type` dans `[commercial, admin, assistant, administratif]` | ❌ Exclu |

### Quelles interventions génèrent du CA ?
| Type | Génère CA ? |
|------|-------------|
| Dépannage | ✅ Oui |
| Travaux | ✅ Oui |
| Recherche de fuite | ✅ Oui (cas spécial) |
| RT (Relevé Technique) | ❌ Non |
| TH (Taux Humidité) | ❌ Non |
| SAV | ❌ Non |
| Diagnostic | ❌ Non |

---

## 📁 Fichiers impactés

| Fichier | Type de modification |
|---------|---------------------|
| `src/apogee-connect/utils/techTools.ts` | Ajout helpers + renforcement filtres |
| `src/statia/domain/rules.ts` | Ajout TH + recherche fuite dans constantes |
| `src/shared/utils/technicienUniversEngine.ts` | Exclusion TH + recherche fuite productive |
| `src/apogee-connect/utils/technicienUniversCalculations.ts` | Alignement logique |

---

## 🧪 Résultat attendu

1. **Sébastien Caron** (commercial/admin) ne recevra plus de CA
2. **Techniciens manquants** apparaîtront grâce à la normalisation `is_on`
3. **TH** n'impactera plus les stats technicien
4. **Recherche de fuite** sera toujours comptée comme productive

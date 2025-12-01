# P3.2 - Format unique `enabled_modules` V2

## Structure canonique

```typescript
type EnabledModules = {
  [moduleKey: string]: {
    enabled: boolean;
    options?: {
      [optionKey: string]: boolean | string | number;
    };
  };
};
```

## Modules disponibles

### help_academy
```json
{
  "help_academy": {
    "enabled": true,
    "options": {
      "apogee": true,
      "apporteurs": true,
      "helpconfort": true,
      "documents": true
    }
  }
}
```

### pilotage_agence
```json
{
  "pilotage_agence": {
    "enabled": true,
    "options": {
      "mes_indicateurs": true,
      "actions_a_mener": true,
      "diffusion": true
    }
  }
}
```

### support
```json
{
  "support": {
    "enabled": true,
    "options": {
      "mes_demandes": true,
      "agent": false  // Console support access
    }
  }
}
```

### reseau_franchiseur
```json
{
  "reseau_franchiseur": {
    "enabled": true,
    "options": {
      "dashboard": true,
      "kpi": true,
      "agencies": true,
      "royalties": true
    }
  }
}
```

### apogee_tickets
```json
{
  "apogee_tickets": {
    "enabled": true,
    "options": {
      "kanban": true,  // View board + create tickets
      "manage": true,  // Edit existing fields
      "import": true   // Bulk import
    }
  }
}
```

## Exemple complet

```json
{
  "help_academy": {
    "enabled": true,
    "options": {
      "apogee": true,
      "apporteurs": false,
      "helpconfort": true,
      "documents": true
    }
  },
  "pilotage_agence": {
    "enabled": true,
    "options": {
      "mes_indicateurs": true,
      "actions_a_mener": false,
      "diffusion": false
    }
  },
  "support": {
    "enabled": true,
    "options": {
      "mes_demandes": true,
      "agent": false
    }
  },
  "reseau_franchiseur": {
    "enabled": false
  },
  "apogee_tickets": {
    "enabled": true,
    "options": {
      "kanban": true,
      "manage": false,
      "import": false
    }
  }
}
```

## Migration depuis V1

Les anciennes structures sont automatiquement converties vers V2 via les fonctions de mapping dans `AuthContext.tsx` :
- `getEnabledModulesFromLegacy()` - conversion legacy → V2
- Lecture transparente depuis `profiles.enabled_modules` (JSONB)

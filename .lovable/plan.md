
# Plan de Nettoyage Legacy Complet - v0.8.6

## Récapitulatif des décisions utilisateur

| Domaine | Action confirmée |
|---------|------------------|
| **Paye / bulletins** | Supprimer entièrement (hook, composants, table `payslip_data`) |
| **Guide OPERIA** | Conserver mais renommer "Guide HC Services" |
| **Support V2 (`support_tickets`)** | Supprimer complètement (code + tables DB) |
| **Routes `/hc-agency`** | **Migrer vers `/agency`** (pas `/pilotage`) |

---

## Phase 1 : Suppression Module Paye (Bulletins)

### Fichiers à supprimer
- `src/hooks/usePayslipAnalysis.ts`
- `src/types/payslipData.ts` 
- `src/components/collaborators/payslip/` (dossier complet)

### Fichiers à corriger
- `src/components/collaborators/ContractSalaryTab.tsx` : retirer imports et bloc `PayslipDataViewer`

### Base de données
```sql
DROP TABLE IF EXISTS public.payslip_data CASCADE;
```

---

## Phase 2 : Suppression Support V2 (support_tickets)

### Fichiers à supprimer
- `src/hooks/use-support-stats.ts`
- `src/pages/AdminSupportStats.tsx`
- `src/pages/AdminEscalationHistory.tsx`

### Fichiers à corriger
- `src/components/ai/AiInlineResult.tsx` : modifier bouton "Créer un ticket" pour utiliser `apogee_tickets`

### Config à nettoyer
| Fichier | Éléments à supprimer |
|---------|---------------------|
| `src/config/navigation.ts` | Entrées Console Support V2, support_tickets children |
| `src/config/routes.ts` | `supportStats`, `escalationHistory` de admin |
| `src/config/scopeRegistry.ts` | `SUPPORT_TICKETS` |
| `src/config/roleMatrix.ts` | case `support_tickets` |
| `src/routes/admin.routes.tsx` | Routes `/admin/support-stats`, `/admin/escalation-history` |

### Base de données
```sql
DROP TABLE IF EXISTS public.support_ticket_actions CASCADE;
DROP TABLE IF EXISTS public.support_attachments CASCADE;
DROP TABLE IF EXISTS public.support_ticket_messages CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
```

---

## Phase 3 : Renommage OPERIA → HC Services

### Fichiers à renommer
| Ancien | Nouveau |
|--------|---------|
| `src/contexts/OperiaEditorContext.tsx` | `src/contexts/HcServicesEditorContext.tsx` |
| `src/pages/OperiaGuide.tsx` | `src/pages/HcServicesGuide.tsx` |
| `src/pages/CategoryOperia.tsx` | `src/pages/CategoryHcServices.tsx` |
| `src/components/operia/` | `src/components/hc-services-guide/` |

### Routes à migrer
| Ancienne route | Nouvelle route |
|----------------|----------------|
| `/academy/operia` | `/academy/hc-services` |
| `/academy/operia/category/:slug` | `/academy/hc-services/category/:slug` |

### Config à mettre à jour
- `src/config/routes.ts` : `operia` → `hcServices`, `operiaCategory` → `hcServicesCategory`
- `src/routes/academy.routes.tsx` : nouveaux imports + routes
- `src/config/sitemapData.ts` : labels "OPERIA" → "HC Services"
- Ajouter redirects legacy `/academy/operia/*` → `/academy/hc-services/*`

### Base de données
- Table `operia_blocks` conservée (nom technique interne)

---

## Phase 4 : Migration /hc-agency → /agency

### Nouvelle structure des routes

| Route actuelle | Nouvelle route |
|----------------|----------------|
| `/hc-agency` | `/agency` |
| `/hc-agency/stats-hub` | `/agency/stats-hub` |
| `/hc-agency/indicateurs` | `/agency/indicateurs` |
| `/hc-agency/actions` | `/agency/actions` |
| `/hc-agency/mes-apporteurs` | `/agency/apporteurs` |
| `/hc-agency/map` | `/agency/carte` |
| `/hc-agency/veille-apporteurs` | `/agency/veille-apporteurs` |
| `/hc-agency/commercial/*` | `/agency/commercial/*` |
| `/hc-agency/statistiques/diffusion` | `/agency/diffusion` |

### Fichiers à déplacer
| Source | Destination |
|--------|-------------|
| `src/pages/hc-agency/MesApporteursPage.tsx` | `src/pages/agency/ApporteursPage.tsx` |
| `src/pages/hc-agency/RdvMapPage.tsx` | `src/pages/agency/CartePage.tsx` |

### Fichiers à modifier
- `src/routes/pilotage.routes.tsx` : remplacer tous les `/hc-agency` par `/agency`
- `src/config/routes.ts` : mettre à jour bloc `agency` avec nouvelles URLs
- `src/config/navigation.ts` : mettre à jour `ROUTES.agency.*`
- `src/config/dashboardTiles.ts` : mettre à jour URLs des tuiles pilotage
- `src/config/sitemapData.ts` : mettre à jour URLs

### Redirects legacy
```tsx
<Route path="/hc-agency" element={<Navigate to="/agency" replace />} />
<Route path="/hc-agency/*" element={<Navigate to="/agency" replace />} />
```

---

## Phase 5 : Script de détection automatique

Ajouter dans `scripts/check-architecture.sh` :

```bash
# Patterns interdits (legacy)
FORBIDDEN_PATTERNS=(
  "support_tickets"      # Table V2 supprimée
  "payslip"              # Module paye supprimé
  "hc-agency"            # Ancien préfixe route
  "operia"               # Ancien nom guide
  "analyze-payslip"      # Edge function supprimée
)
```

---

## Ordre d'exécution (prévenir les erreurs de build)

```text
┌─────────────────────────────────────────────────┐
│ 1. Migration DB : DROP tables legacy            │
│    (payslip_data, support_tickets, etc.)        │
└─────────────────────┬───────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│ 2. Supprimer fichiers inutiles                  │
│    (hooks, pages, composants paye/support V2)   │
└─────────────────────┬───────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│ 3. Corriger imports cassés                      │
│    (ContractSalaryTab, AiInlineResult, etc.)    │
└─────────────────────┬───────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│ 4. Renommer OPERIA → HC Services                │
│    (fichiers + routes + config)                 │
└─────────────────────┬───────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│ 5. Migrer /hc-agency → /agency                  │
│    (routes + navigation + pages)                │
└─────────────────────┬───────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│ 6. Ajouter redirects legacy                     │
│    (/hc-agency/* → /agency/*, etc.)             │
└─────────────────────┬───────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│ 7. Mettre à jour check-architecture.sh          │
│    (patterns interdits)                         │
└─────────────────────────────────────────────────┘
```

---

## Estimation

| Phase | Effort |
|-------|--------|
| 1. Supprimer Paye | 15 min |
| 2. Supprimer Support V2 | 30 min |
| 3. Renommer OPERIA | 25 min |
| 4. Migrer /hc-agency → /agency | 35 min |
| 5. Script détection + redirects | 15 min |
| **Total** | **~2h** |

---

## Livrables attendus

1. **~800 lignes de code supprimées** (dead code)
2. **4 tables DB supprimées** (payslip_data, support_tickets, support_ticket_messages, support_ticket_actions)
3. **Routes simplifiées** : `/agency/*` au lieu de `/hc-agency/*`
4. **Guide renommé** : "HC Services" au lieu de "OPERIA"
5. **Script CI amélioré** : détection automatique des patterns legacy
6. **Redirects legacy** : aucun lien cassé pour les bookmarks existants

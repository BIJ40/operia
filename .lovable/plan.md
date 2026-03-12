

## Plan: Apply ViewSwitcher Style to Sub-Navigation Tabs

The current `PillTabsList` uses colorful pill buttons with gradients, borders, and icon containers. The user wants a simpler "ViewSwitcher" style when in header navigation mode.

### Approach

Add a `variant` prop to `PillTabsList` — `"pill"` (default, current style) and `"switcher"` (ViewSwitcher specs).

### Changes

**1. `src/components/ui/pill-tabs.tsx`**
- Add `variant?: 'pill' | 'switcher'` to `PillTabsListProps`
- When `variant === 'switcher'`:
  - Container: `bg-muted/30 rounded-lg border border-border/60 p-0.5` (wrap in a div)
  - TabsTrigger: `rounded-md px-3.5 py-1.5 text-sm font-medium`
  - Active state: `data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50 data-[state=active]:text-foreground`
  - Inactive: `text-muted-foreground` with transparent bg
  - No icon container styling, no motion animations, no accent colors
  - Icons rendered inline (same size, no colored wrapper)

**2. `src/components/unified/tabs/PilotageTabContent.tsx`**
- Pass `variant="switcher"` when `navMode === 'header'`
- Show `PillTabsList` in both modes (remove the `navMode === 'tabs'` guard) so header mode gets the switcher bar

**3. `src/components/unified/tabs/CommercialTabContent.tsx`** — Same change

**4. `src/components/unified/tabs/OrganisationTabContent.tsx`** — Same change


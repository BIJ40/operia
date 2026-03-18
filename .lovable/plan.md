

## Problem

The "Base documentaire" links in the Help Center (Support tab) point to routes like `/academy/apogee`, `/academy/apporteurs`, etc. These routes all redirect to `/?tab=support` via `academy.routes.tsx`, which just reloads the same Help Center page — a circular loop. The user clicks "Apogée" and nothing visible happens.

For the **Franchiseur** view, there's a separate "Guides" tab (`/?tab=guides`), but for regular users, the guides are not accessible from the Support tab links.

## Solution

Make each Base documentaire link navigate to the **Guides tab with the correct sub-tab pre-selected**, instead of using the dead `/academy/*` routes.

### Changes

**1. `src/components/unified/tabs/AideTabContent.tsx`** — Update `DOC_SECTIONS` hrefs

Replace the `href` values to use query-parameter navigation that switches to the correct tab/sub-tab:

| Section | Current href | New behavior |
|---------|-------------|--------------|
| Apogée | `/academy/apogee` | Navigate to `/?tab=support` with `guides_sub_tab=apogee` stored in session, then switch to guides view |
| Apporteurs | `/academy/apporteurs` | Same pattern with `apporteurs` |
| Operia | `/academy/hc-services` | Same pattern with `helpconfort` |
| HC Base | `/academy/hc-base` | Same pattern |

Concretely, convert the `<Link>` elements into `<button>` elements that:
1. Set the `guides_sub_tab` session state to the correct guide ID (e.g. `'apogee'`)
2. Navigate to `/?tab=guides` (for Franchiseur view) or switch to a guides sub-view within the support tab

**However**, since regular users don't have a "guides" tab, we need to check which approach works. Two options:

- **Option A**: Add the guides content as a sub-view within the Support tab (toggle between Help Center and Guides view)
- **Option B**: Add a "guides" tab for all users, not just Franchiseur

**Recommended: Option A** — Add a simple state toggle in `AideTabContent` that switches between the Help Center grid view and the `GuidesTabContent` component, with a back button. This keeps the current tab structure intact.

### Implementation Details

**`AideTabContent.tsx`**:
- Add a `guideView` state: `null` (show help center) or `'apogee' | 'apporteurs' | ...` (show guides)
- When a doc section is clicked, set `guideView` to the corresponding guide ID and update the `guides_sub_tab` session state
- When `guideView` is set, render `GuidesTabContent` with a "Retour au centre d'aide" button instead of the grid
- Replace `<Link>` with `<button onClick>` for each doc section

**No route changes needed** — everything stays within the Support tab.


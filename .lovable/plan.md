

## Diagnostic

The "Signaler un empêchement" function **always falls back to Dax** because `getAgencyInfo()` queries a table called `agencies` which does not exist. The actual agency configuration lives in `agency_suivi_settings`.

This means for St Omer:
- The function tries to verify the postal code against `dax.hc-apogee.fr` instead of `saint-omer.hc-apogee.fr`
- The dossier doesn't exist on the Dax API, so verification fails → "Accès refusé"
- Dax works by coincidence (correct fallback)

## Fix

**File: `supabase/functions/suivi-signaler-empechement/index.ts`**

Update `getAgencyInfo()` to query `agency_suivi_settings` instead of `agencies`, using the correct column names (`slug`, `contact_email`, `name`, `api_subdomain`).

```typescript
const { data, error } = await supabase
  .from("agency_suivi_settings")
  .select("contact_email, name, api_subdomain")
  .eq("slug", agencySlug)
  .eq("is_active", true)
  .single();
```

Then redeploy the function.

## Impact
- Fixes St Omer and all non-Dax agencies
- No frontend changes needed
- Single file change + deployment


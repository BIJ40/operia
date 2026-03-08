# Operia — Data Layer Reference (Phase 5)

Generated: 2026-03-08

## 1. Critical Tables (Source of Truth)

### Identity & Access
| Table | Role | Key Fields |
|---|---|---|
| `profiles` | User identity & role. Source of truth for `global_role`, `agency_id`, `agence` slug. | `id` (= auth.users.id), `global_role`, `agency_id`, `agence`, `support_level` |
| `user_modules` | Per-user module overrides | `user_id`, `module_key`, `options` |
| `module_registry` | Canonical module definitions (deployment, plan, min_role) | `key`, `is_deployed`, `required_plan`, `min_role` |
| `plan_tier_modules` | Legacy plan-based module grants (still active in `get_user_effective_modules()`) | `tier_key`, `module_key`, `enabled`, `options_override` |
| `agency_subscription` | Agency plan tier (STARTER/PRO) | `agency_id`, `tier_key`, `status` |
| `agency_rh_roles` | Per-agency RH role grants | `user_id`, `agency_id` |
| `apogee_ticket_user_roles` | Ticket system role assignments | `user_id`, `ticket_role` |
| `franchiseur_roles` | Franchiseur role assignments | — |

### RH Domain
| Table | Role |
|---|---|
| `collaborators` | Agency employees. Bi-directional sync with `profiles`. |
| `collaborator_sensitive_data` | Encrypted PII. Access only via `sensitive-data` Edge Function. |
| `employment_contracts` | Employment contracts per collaborator. |
| `salary_history` | Salary records. |
| `document_requests` | RH document request workflow. |
| `collaborator_documents` | Uploaded employee documents. |
| `rh_audit_log` | RH-specific audit trail. |
| `rh_notifications` | RH notification system. |

### Tickets & Support
| Table | Role |
|---|---|
| `apogee_tickets` | Product/dev tickets (Apogee kanban). ~807 rows. |
| `apogee_ticket_comments` | Ticket comments. |
| `apogee_ticket_history` | Ticket change history. ~1215 rows. |
| `apogee_ticket_support_exchanges` | Support ↔ user messaging on tickets. |
| `apogee_ticket_views` | Read tracking per user. |

### Apporteur Domain
| Table | Role |
|---|---|
| `apporteurs` | Partner companies. |
| `apporteur_users` | Partner users (linked to Supabase Auth). |
| `apporteur_managers` | Partner managers (autonomous OTP auth, NOT Supabase Auth). |
| `apporteur_sessions` | Custom token sessions for managers. |
| `apporteur_intervention_requests` | Partner intervention requests. |
| `apporteur_project_links` | Partner ↔ project associations. |

### Content & Knowledge
| Table | Size | Role |
|---|---|---|
| `blocks` | ~25 MB | Knowledge base content blocks (guides). |
| `apporteur_blocks` | ~544 KB | Partner-specific content blocks. |
| `guide_chunks` | ~16 MB | Chunked guides for RAG/search. |
| `formation_content` | ~13 MB | Training content. |

### Infrastructure
| Table | Role |
|---|---|
| `rate_limits` | Rate limiting for edge functions. Purged daily. |
| `activity_log` | Generic entity audit trail (via triggers). |
| `user_connection_logs` | Login tracking. ~21K rows. |
| `feature_flags` | Feature flag configuration. |
| `ai_search_cache` | Cached AI search results with TTL. |

## 2. Critical RPC Functions (Source of Truth)

| Function | Purpose | Security |
|---|---|---|
| `get_user_effective_modules(uuid)` | **Primary module access resolver.** Merges `module_registry` + `plan_tier_modules` + `user_modules`. N5+ bypasses `min_role`. | SECURITY DEFINER |
| `has_min_global_role(uuid, int)` | Core role-level check (0-6). Used in most RLS policies. | SECURITY DEFINER |
| `is_admin(uuid)` | Shorthand for `has_min_global_role(uid, 5)`. | SECURITY DEFINER |
| `is_support_agent(uuid)` | Checks `aide.agent` or `support.agent` module option. | SECURITY DEFINER |
| `has_franchiseur_access(uuid)` | Checks `reseau_franchiseur` module or N3+. | SECURITY DEFINER |
| `has_apogee_tickets_access(uuid)` | Checks ticket module access or N5+. | SECURITY DEFINER |
| `has_module_v2(uuid, text)` | Module access check. | SECURITY DEFINER |
| `has_module_option_v2(uuid, text, text)` | Module option check. | SECURITY DEFINER |
| `has_agency_rh_role(uuid, uuid)` | Per-agency RH role check. | SECURITY DEFINER |
| `get_user_agency_id(uuid)` | Returns user's agency_id. | SECURITY DEFINER |
| `log_rh_action(...)` | Writes to `rh_audit_log`. | SECURITY DEFINER |
| `handle_document_request(...)` | Document request workflow handler. | SECURITY DEFINER |
| `get_collaborator_sensitive_data(uuid)` | **Disabled.** Raises exception — forces use of Edge Function. | SECURITY DEFINER |

## 3. RLS Policy Architecture

- **All 90+ public tables have RLS enabled.** ✅
- **No tables are missing RLS policies.** ✅
- **1 intentionally permissive policy:** `pending_registrations` INSERT with `true` (public registration form).

### Common RLS Patterns
1. **Agency-scoped:** `agency_id = get_user_agency_id(auth.uid())` — most data tables.
2. **Admin bypass:** `has_min_global_role(auth.uid(), 5)` — admin read access.
3. **Self-access:** `user_id = auth.uid()` — personal data.
4. **Module-gated:** `has_module_v2(auth.uid(), 'xxx')` — feature-specific.
5. **Ticket role:** `has_apogee_tickets_access(auth.uid())` — ticket system.
6. **Block insert:** `activity_log_no_direct_insert` policy blocks direct INSERT (trigger-only).

## 4. Identified Fragilities & Remaining Debt

### Low Risk — Cleaned in Phase 5
- ✅ Removed 4 duplicate indexes (collaborators ×2, rate_limits ×1, document_requests ×1).
- ✅ Added SQL comments on 15 critical tables and 6 critical functions.

### Medium Risk — Documented, Not Touched
| Issue | Impact | Why Not Touched |
|---|---|---|
| `plan_tier_modules` legacy coexistence with `module_registry` | Two sources merged at runtime in `get_user_effective_modules()` | Removing legacy would require verifying all agencies have registry entries. Safe but requires data audit. |
| `pending_registrations` INSERT policy `WITH CHECK (true)` | Anyone can insert. | Intentional for public registration. Could add rate limiting at app level. |
| Extension in `public` schema (pg_trgm) | Supabase linter warning. | Moving extensions is a Supabase infrastructure concern. No functional impact. |
| Leaked password protection disabled | Supabase Auth setting. | Requires manual enable in Supabase Dashboard > Auth > Settings. |

### Not Touched — Too Risky Without Dedicated Chantier
| Zone | Reason |
|---|---|
| `profiles ↔ collaborators` bi-directional sync triggers | Complex trigger pair (`sync_profile_on_collaborator_update` / `auto_create_collaborator`). Working but fragile. Any change risks data sync issues. |
| Media folder auto-creation triggers | Deep trigger chain (`sync_collaborator_folder_to_media`). Working. Touching risks orphan folders. |
| `get_user_effective_modules()` refactor | 100+ line function with CTE chain. Works correctly. Refactoring would require extensive testing. |

## 5. Pre-existing Linter Warnings (Not Caused by Phase 5)

1. **Extension in Public** — `pg_trgm` in public schema. Cosmetic. No action needed.
2. **RLS Policy Always True** — `pending_registrations` INSERT. Intentional.
3. **Leaked Password Protection Disabled** — Auth setting. Recommend enabling in Dashboard.

## 6. Edge Function ↔ Data Dependencies

| Edge Function | Critical Tables |
|---|---|
| `sensitive-data` | `collaborator_sensitive_data`, `sensitive_data_access_logs` |
| `create-user` / `delete-user` / `reset-user-password` | `profiles`, `rate_limits` |
| `get-kpis` / `network-kpis` / `compute-metric` | Various metrics tables |
| `generate-hr-document` | `collaborators`, `employment_contracts`, `salary_history` |
| `export-all-data` | All tables (service role) |
| `apporteur-auth-*` | `apporteur_managers`, `apporteur_otp_codes`, `apporteur_sessions` |
| `reply-ticket-email` / `email-to-ticket` | `apogee_ticket_comments`, `apogee_tickets` |
| `maintenance-alerts-scan` | `maintenance_alerts`, `fleet_vehicles` |

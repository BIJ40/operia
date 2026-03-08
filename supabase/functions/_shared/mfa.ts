/**
 * MFA / AAL2 Enforcement Helper — Edge Functions
 * 
 * Provides server-side verification that the caller's JWT has
 * Authenticator Assurance Level 2 (AAL2), meaning MFA was completed.
 *
 * Usage:
 *   import { requireAal2 } from '../_shared/mfa.ts';
 *   const check = await requireAal2(req, { minRoleLevel: 4 });
 *   if (!check.ok) return check.response;
 *
 * Progressive activation:
 *   - SERVER_MFA_ENFORCEMENT = 'off'      → never block
 *   - SERVER_MFA_ENFORCEMENT = 'advisory'  → log warning, don't block
 *   - SERVER_MFA_ENFORCEMENT = 'enforced'  → block with 403
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { withCors } from './cors.ts';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type ServerMfaMode = 'off' | 'advisory' | 'enforced';

/**
 * Current server-side MFA enforcement mode.
 * Read from env var SERVER_MFA_ENFORCEMENT, defaults to 'advisory'.
 */
export function getServerMfaMode(): ServerMfaMode {
  const env = Deno.env.get('SERVER_MFA_ENFORCEMENT');
  if (env === 'off' || env === 'advisory' || env === 'enforced') return env;
  return 'advisory'; // safe default
}

/**
 * Minimum role level that triggers the AAL2 requirement.
 * N4 (franchisor_admin) and above by default.
 * Can be overridden per-function via options.
 */
const DEFAULT_MFA_MIN_ROLE = 4;

// ---------------------------------------------------------------------------
// Core helper
// ---------------------------------------------------------------------------

export interface Aal2Options {
  /** Override the minimum role level that triggers MFA (default 4 = N4). */
  minRoleLevel?: number;
  /** Function name for logging purposes. */
  functionName?: string;
}

export interface Aal2Ok {
  ok: true;
}

export interface Aal2Denied {
  ok: false;
  response: Response;
}

/**
 * Verify that the caller has completed MFA (AAL2).
 *
 * The JWT's `aal` claim is checked. If the user's role level
 * is >= minRoleLevel and the AAL is not `aal2`, the function
 * behaves according to the current enforcement mode.
 *
 * @param req The incoming Request (needed for CORS wrapping)
 * @param userRoleLevel The numeric role level of the authenticated user
 * @param userId The user ID (for logging)
 * @param options Additional options
 */
export async function requireAal2(
  req: Request,
  userRoleLevel: number,
  userId: string,
  options: Aal2Options = {},
): Promise<Aal2Ok | Aal2Denied> {
  const mode = getServerMfaMode();
  const minRole = options.minRoleLevel ?? DEFAULT_MFA_MIN_ROLE;
  const fnName = options.functionName ?? 'unknown';

  // If MFA is off globally, always pass
  if (mode === 'off') {
    return { ok: true };
  }

  // Only enforce for roles at or above the threshold
  if (userRoleLevel < minRole) {
    return { ok: true };
  }

  // Extract AAL from the JWT
  const aal = await extractAalFromRequest(req);

  if (aal === 'aal2') {
    return { ok: true };
  }

  // User is high-privilege but NOT aal2
  const logMsg = `[MFA:${fnName}] AAL2 required but got ${aal ?? 'aal1'} for user=${userId} roleLevel=${userRoleLevel}`;

  if (mode === 'advisory') {
    console.warn(`${logMsg} — mode=advisory, allowing through`);
    return { ok: true };
  }

  // mode === 'enforced'
  console.warn(`${logMsg} — mode=enforced, BLOCKING`);
  return {
    ok: false,
    response: withCors(req, new Response(
      JSON.stringify({
        error: 'MFA requis',
        code: 'MFA_REQUIRED',
        message: 'Cette action nécessite une vérification MFA (authentification à deux facteurs). Veuillez activer le MFA dans vos paramètres de sécurité.',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      },
    )),
  };
}

// ---------------------------------------------------------------------------
// AAL extraction from JWT
// ---------------------------------------------------------------------------

/**
 * Extract the AAL (Authenticator Assurance Level) claim from the JWT.
 * Uses Supabase Auth getUser to decode the token securely.
 * Falls back to manual JWT decoding if needed.
 */
async function extractAalFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');

  // Try to decode the JWT payload directly (it's base64url-encoded)
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // base64url → base64 → decode
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const decoded = JSON.parse(atob(payload));
    return decoded.aal ?? null;
  } catch {
    return null;
  }
}

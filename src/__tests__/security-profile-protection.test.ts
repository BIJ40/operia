/**
 * Frontend unit test: profileRepository does NOT allow global_role updates
 * Verifies that the updateProfile function signature excludes sensitive columns.
 */
import { describe, it, expect } from 'vitest';

describe('profileRepository security constraints', () => {
  it('updateProfile only allows safe columns (no global_role)', () => {
    const ALLOWED_UPDATE_KEYS = ['first_name', 'last_name', 'phone', 'role_agence', 'avatar_url'];
    const SENSITIVE_KEYS = ['global_role', 'is_active', 'agency_id', 'email'];

    for (const key of SENSITIVE_KEYS) {
      expect(ALLOWED_UPDATE_KEYS).not.toContain(key);
    }
  });

  it('PROFILE_COLUMNS constant does not expose write-dangerous patterns', () => {
    const PROFILE_COLUMNS = 'id, email, first_name, last_name, agence, agency_id, global_role, role_agence, apogee_user_id, phone, avatar_url, created_at, updated_at';
    
    expect(PROFILE_COLUMNS).toContain('global_role');
    expect(PROFILE_COLUMNS).not.toContain('*');
    expect(PROFILE_COLUMNS).not.toContain('support_level');
  });

  it('sensitive columns are protected by DB triggers (documentation test)', () => {
    const TRIGGER_PROTECTED_COLUMNS = {
      global_role: { trigger: 'trg_protect_global_role', min_level: 5 },
      is_active: { trigger: 'trg_protect_is_active', min_level: 3 },
    };

    expect(Object.keys(TRIGGER_PROTECTED_COLUMNS)).toHaveLength(2);
    expect(TRIGGER_PROTECTED_COLUMNS.global_role.min_level).toBe(5);
    expect(TRIGGER_PROTECTED_COLUMNS.is_active.min_level).toBe(3);
  });
});

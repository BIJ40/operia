/**
 * Tests anti-régression : agency_id = source unique de vérité d'appartenance agence
 */
import { describe, it, expect } from 'vitest';

// Simulated user profiles for testing filtering logic
interface MockProfile {
  id: string;
  agency_id: string | null;
  agence: string | null;
  role_agence: string | null;
}

const AGENCY_UUID = '11111111-1111-1111-1111-111111111111';
const AGENCY_UUID_2 = '22222222-2222-2222-2222-222222222222';

const mockProfiles: MockProfile[] = [
  { id: 'u1', agency_id: AGENCY_UUID, agence: 'lyon', role_agence: 'dirigeant' },
  { id: 'u2', agency_id: AGENCY_UUID, agence: 'lyon', role_agence: 'technicien' },
  { id: 'u3', agency_id: AGENCY_UUID_2, agence: 'paris', role_agence: 'dirigeant' },
  { id: 'u4', agency_id: null, agence: null, role_agence: 'dirigeant' }, // sans agence
  { id: 'u5', agency_id: null, agence: 'lyon', role_agence: 'technicien' }, // divergence: slug set but no UUID
  { id: 'u6', agency_id: AGENCY_UUID, agence: null, role_agence: 'assistante' }, // divergence: UUID set but no slug
];

/**
 * Canonical filtering: uses agency_id only
 */
function getUsersForAgency(users: MockProfile[], agencyId: string): MockProfile[] {
  return users.filter(u => u.agency_id === agencyId);
}

function getUsersWithoutAgency(users: MockProfile[]): MockProfile[] {
  return users.filter(u => !u.agency_id);
}

describe('Agency source of truth: agency_id', () => {
  it('user with agency_id=null does not appear in any agency team', () => {
    const lyonTeam = getUsersForAgency(mockProfiles, AGENCY_UUID);
    const parisTeam = getUsersForAgency(mockProfiles, AGENCY_UUID_2);
    
    expect(lyonTeam.find(u => u.id === 'u4')).toBeUndefined();
    expect(parisTeam.find(u => u.id === 'u4')).toBeUndefined();
  });

  it('agency counter and team list use the same source (agency_id)', () => {
    const lyonTeam = getUsersForAgency(mockProfiles, AGENCY_UUID);
    const lyonCount = lyonTeam.length;
    
    // u1, u2, u6 have agency_id = AGENCY_UUID
    expect(lyonCount).toBe(3);
    expect(lyonTeam.map(u => u.id).sort()).toEqual(['u1', 'u2', 'u6']);
  });

  it('changing agency updates both counter and team', () => {
    // Simulate u2 moving from lyon to paris
    const updated = mockProfiles.map(u =>
      u.id === 'u2' ? { ...u, agency_id: AGENCY_UUID_2, agence: 'paris' } : u
    );
    
    const lyonTeam = getUsersForAgency(updated, AGENCY_UUID);
    const parisTeam = getUsersForAgency(updated, AGENCY_UUID_2);
    
    expect(lyonTeam.length).toBe(2); // u1, u6
    expect(parisTeam.length).toBe(2); // u3, u2
    expect(lyonTeam.find(u => u.id === 'u2')).toBeUndefined();
    expect(parisTeam.find(u => u.id === 'u2')).toBeDefined();
  });

  it('removing agency excludes user everywhere', () => {
    const updated = mockProfiles.map(u =>
      u.id === 'u1' ? { ...u, agency_id: null, agence: null } : u
    );
    
    const lyonTeam = getUsersForAgency(updated, AGENCY_UUID);
    const withoutAgency = getUsersWithoutAgency(updated);
    
    expect(lyonTeam.find(u => u.id === 'u1')).toBeUndefined();
    expect(withoutAgency.find(u => u.id === 'u1')).toBeDefined();
  });

  it('agence/agency_id divergence does not break views (agency_id wins)', () => {
    // u5 has agence='lyon' but agency_id=null → should NOT appear in lyon team
    const lyonTeam = getUsersForAgency(mockProfiles, AGENCY_UUID);
    expect(lyonTeam.find(u => u.id === 'u5')).toBeUndefined();
    
    // u6 has agency_id=AGENCY_UUID but agence=null → SHOULD appear in lyon team
    expect(lyonTeam.find(u => u.id === 'u6')).toBeDefined();
    
    // u5 should be in "without agency" list
    const withoutAgency = getUsersWithoutAgency(mockProfiles);
    expect(withoutAgency.find(u => u.id === 'u5')).toBeDefined();
  });
});

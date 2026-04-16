/**
 * Tests for filterNavigationByPermissions
 * 
 * Validates that navigation items are hidden/shown correctly
 * based on module and role permissions.
 */

import { describe, it, expect } from 'vitest';
import {
  isWorkspaceTabVisible,
  filterWorkspaceTabs,
  filterSubTabs,
} from '@/lib/filterNavigationByPermissions';
import type { TabConfig } from '@/components/unified/workspace/types';
import { Home, BarChart3, ShoppingCart, Users, Headphones, Shield, FolderOpen } from 'lucide-react';

// ─── Fixtures ───────────────────────────────────────────

const ALL_TABS: TabConfig[] = [
  { id: 'accueil', label: 'Accueil', icon: Home },
  { id: 'pilotage', label: 'Pilotage', icon: BarChart3, requiresOption: { module: 'pilotage.statistiques' }, altModules: ['pilotage.agence'] },
  { id: 'commercial', label: 'Commercial', icon: ShoppingCart, requiresOption: { module: 'commercial' }, altModules: ['commercial.realisations'] },
  { id: 'organisation', label: 'Organisation', icon: Users, requiresOption: { module: 'organisation.salaries' }, altModules: ['organisation.parc'] },
  { id: 'documents', label: 'Documents', icon: FolderOpen, requiresOption: { module: 'mediatheque.documents' } },
  { id: 'support', label: 'Support', icon: Headphones },
  { id: 'admin', label: 'Admin', icon: Shield, requiresOption: { module: 'admin_plateforme' } },
];

function makePerms(enabledModules: string[]) {
  return {
    hasModule: (key: any) => enabledModules.includes(key),
    hasModuleOption: (_key: any, _opt: string) => false,
    isPlatformAdmin: false,
  };
}

const ADMIN_PERMS = {
  hasModule: () => true,
  hasModuleOption: () => true,
  isPlatformAdmin: true,
};

// ─── Tests ──────────────────────────────────────────────

describe('isWorkspaceTabVisible', () => {
  it('tab without guard is always visible', () => {
    const tab = ALL_TABS.find(t => t.id === 'accueil')!;
    expect(isWorkspaceTabVisible(tab, makePerms([]))).toBe(true);
  });

  it('module enabled → tab visible', () => {
    const tab = ALL_TABS.find(t => t.id === 'documents')!;
    expect(isWorkspaceTabVisible(tab, makePerms(['mediatheque.documents']))).toBe(true);
  });

  it('module disabled → tab hidden', () => {
    const tab = ALL_TABS.find(t => t.id === 'documents')!;
    expect(isWorkspaceTabVisible(tab, makePerms([]))).toBe(false);
  });

  it('altModule enabled → tab visible even if primary disabled', () => {
    const tab = ALL_TABS.find(t => t.id === 'pilotage')!;
    expect(isWorkspaceTabVisible(tab, makePerms(['pilotage.agence']))).toBe(true);
  });

  it('neither primary nor alt modules → tab hidden', () => {
    const tab = ALL_TABS.find(t => t.id === 'pilotage')!;
    expect(isWorkspaceTabVisible(tab, makePerms([]))).toBe(false);
  });

  it('platform admin bypasses all module checks', () => {
    const tab = ALL_TABS.find(t => t.id === 'documents')!;
    expect(isWorkspaceTabVisible(tab, ADMIN_PERMS)).toBe(true);
  });

  it('admin tab hidden for non-admin even with module', () => {
    const tab = ALL_TABS.find(t => t.id === 'admin')!;
    expect(isWorkspaceTabVisible(tab, makePerms(['admin_plateforme']))).toBe(false);
  });
});

describe('filterWorkspaceTabs', () => {
  it('returns only accessible tabs', () => {
    const perms = makePerms(['pilotage.statistiques', 'mediatheque.documents']);
    const result = filterWorkspaceTabs(ALL_TABS, perms, false);
    const ids = result.map(t => t.id);
    
    expect(ids).toContain('accueil');
    expect(ids).toContain('pilotage');
    expect(ids).toContain('documents');
    expect(ids).toContain('support');
    expect(ids).not.toContain('commercial');
    expect(ids).not.toContain('organisation');
    expect(ids).not.toContain('admin');
  });

  it('empty modules → only unguarded tabs remain', () => {
    const perms = makePerms([]);
    const result = filterWorkspaceTabs(ALL_TABS, perms, false);
    const ids = result.map(t => t.id);
    
    expect(ids).toEqual(['accueil', 'support']);
  });

  it('admin flag shows admin tab', () => {
    const perms = makePerms([]);
    const result = filterWorkspaceTabs(ALL_TABS, perms, true);
    expect(result.map(t => t.id)).toContain('admin');
  });

  it('category with no visible sub-modules is removed', () => {
    const perms = makePerms([]);
    const result = filterWorkspaceTabs(ALL_TABS, perms, false);
    expect(result.map(t => t.id)).not.toContain('organisation');
  });

  it('user override enabling module → tab becomes visible', () => {
    // Simulate override: user has 'organisation.parc' enabled via override
    const perms = makePerms(['organisation.parc']);
    const result = filterWorkspaceTabs(ALL_TABS, perms, false);
    expect(result.map(t => t.id)).toContain('organisation');
  });
});

describe('filterSubTabs', () => {
  const subTabs: { id: string; label: string; requiresModule?: any; disabled?: boolean }[] = [
    { id: 'stats', label: 'Stats', requiresModule: 'pilotage.statistiques' as any },
    { id: 'perf', label: 'Performance', requiresModule: 'pilotage.agence' as any },
    { id: 'actions', label: 'Actions', requiresModule: 'pilotage.agence' as any },
  ];

  it('marks inaccessible sub-tabs as disabled', () => {
    const result = filterSubTabs(subTabs, (key: any) => key === 'pilotage.statistiques');
    expect(result).toHaveLength(3);
    expect(result.find(t => t.id === 'stats')?.disabled).toBeFalsy();
    expect(result.find(t => t.id === 'perf')?.disabled).toBe(true);
    expect(result.find(t => t.id === 'actions')?.disabled).toBe(true);
  });

  it('returns all enabled if all modules enabled', () => {
    const result = filterSubTabs(subTabs, () => true);
    expect(result).toHaveLength(3);
    expect(result.every(t => !t.disabled)).toBe(true);
  });

  it('marks all as disabled if all modules disabled', () => {
    const result = filterSubTabs(subTabs, () => false);
    expect(result).toHaveLength(3);
    expect(result.every(t => t.disabled)).toBe(true);
  });
});

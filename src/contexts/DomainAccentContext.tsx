/**
 * DomainAccentContext — Propagates the current domain's accent color
 * to all child components (switcher tabs, period selectors, cards, etc.)
 */

import { createContext, useContext, type ReactNode } from 'react';

export type DomainAccent = 'blue' | 'orange' | 'green' | 'purple' | 'pink' | 'teal' | 'red';

interface DomainAccentContextValue {
  accent: DomainAccent;
}

const DomainAccentCtx = createContext<DomainAccentContextValue>({ accent: 'blue' });

export function DomainAccentProvider({ accent, children }: { accent: DomainAccent; children: ReactNode }) {
  return <DomainAccentCtx.Provider value={{ accent }}>{children}</DomainAccentCtx.Provider>;
}

export function useDomainAccent(): DomainAccent {
  return useContext(DomainAccentCtx).accent;
}

// ============================================================================
// Shared color mappings used by multiple components
// ============================================================================

const ACCENT_COLORS: Record<DomainAccent, {
  /** Active bg for switcher tabs / period buttons */
  activeBg: string;
  /** Active text */
  activeText: string;
  /** Active border */
  activeBorder: string;
  /** Hover bg for inactive elements */
  hoverBg: string;
  /** Hover text */
  hoverText: string;
  /** Light tinted background */
  tintBg: string;
  /** Foreground on filled bg */
  filledText: string;
  /** Filled bg (for period selector active) */
  filledBg: string;
}> = {
  blue: {
    activeBg: 'bg-warm-blue/15',
    activeText: 'text-warm-blue',
    activeBorder: 'border-warm-blue/40',
    hoverBg: 'hover:bg-warm-blue/10',
    hoverText: 'hover:text-warm-blue',
    tintBg: 'bg-warm-blue/5',
    filledText: 'text-white',
    filledBg: 'bg-warm-blue',
  },
  orange: {
    activeBg: 'bg-warm-orange/15',
    activeText: 'text-warm-orange',
    activeBorder: 'border-warm-orange/40',
    hoverBg: 'hover:bg-warm-orange/10',
    hoverText: 'hover:text-warm-orange',
    tintBg: 'bg-warm-orange/5',
    filledText: 'text-white',
    filledBg: 'bg-warm-orange',
  },
  green: {
    activeBg: 'bg-warm-green/15',
    activeText: 'text-warm-green',
    activeBorder: 'border-warm-green/40',
    hoverBg: 'hover:bg-warm-green/10',
    hoverText: 'hover:text-warm-green',
    tintBg: 'bg-warm-green/5',
    filledText: 'text-white',
    filledBg: 'bg-warm-green',
  },
  purple: {
    activeBg: 'bg-warm-purple/15',
    activeText: 'text-warm-purple',
    activeBorder: 'border-warm-purple/40',
    hoverBg: 'hover:bg-warm-purple/10',
    hoverText: 'hover:text-warm-purple',
    tintBg: 'bg-warm-purple/5',
    filledText: 'text-white',
    filledBg: 'bg-warm-purple',
  },
  pink: {
    activeBg: 'bg-warm-pink/15',
    activeText: 'text-warm-pink',
    activeBorder: 'border-warm-pink/40',
    hoverBg: 'hover:bg-warm-pink/10',
    hoverText: 'hover:text-warm-pink',
    tintBg: 'bg-warm-pink/5',
    filledText: 'text-white',
    filledBg: 'bg-warm-pink',
  },
  teal: {
    activeBg: 'bg-warm-teal/15',
    activeText: 'text-warm-teal',
    activeBorder: 'border-warm-teal/40',
    hoverBg: 'hover:bg-warm-teal/10',
    hoverText: 'hover:text-warm-teal',
    tintBg: 'bg-warm-teal/5',
    filledText: 'text-white',
    filledBg: 'bg-warm-teal',
  },
  red: {
    activeBg: 'bg-warm-red/15',
    activeText: 'text-warm-red',
    activeBorder: 'border-warm-red/40',
    hoverBg: 'hover:bg-warm-red/10',
    hoverText: 'hover:text-warm-red',
    tintBg: 'bg-warm-red/5',
    filledText: 'text-white',
    filledBg: 'bg-warm-red',
  },
};

export function getAccentColors(accent: DomainAccent) {
  return ACCENT_COLORS[accent];
}

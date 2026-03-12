/**
 * SupportHubTabContent - Onglet unifié "Support"
 * Sous-onglets : Aide en ligne, Guides, FAQ, Ticketing (conditionnel)
 * 
 * Guides contient des sous-catégories (Apogée, et futures : Apporteurs, HelpConfort)
 */

import { lazy, Suspense, useMemo, useState } from 'react';
import { Headphones, BookOpen, HelpCircle, Ticket, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ModuleKey } from '@/types/modules';
import { useModuleLabels } from '@/hooks/useModuleLabels';
import { InternalApogeeLayout } from '@/components/guides/apogee/InternalApogeeLayout';

const SupportTabContent = lazy(() => import('@/components/unified/tabs/SupportTabContent'));
const TicketingTabContent = lazy(() => import('@/components/unified/tabs/TicketingTabContent'));

type SupportSubTab = 'aide-en-ligne' | 'guides' | 'faq' | 'ticketing';

/** Configuration des guides disponibles (extensible) */
interface GuideConfig {
  id: string;
  label: string;
  requiresModule?: ModuleKey;
}

const GUIDE_SECTIONS: GuideConfig[] = [
  { id: 'apogee', label: 'Apogée' },
  // Futures sections : décommenter quand activées
  // { id: 'apporteurs', label: 'Apporteurs', requiresModule: 'divers_apporteurs' },
  // { id: 'helpconfort', label: 'HelpConfort', requiresModule: 'helpconfort' },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

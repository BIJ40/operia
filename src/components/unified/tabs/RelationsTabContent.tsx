/**
 * RelationsTabContent - Contenu de l'onglet "Relations"
 * Gestion des apporteurs et échanges
 */

import { lazy, Suspense, useMemo, useCallback } from 'react';
import { Loader2, Handshake, MessagesSquare } from 'lucide-react';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { useModuleLabels } from '@/hooks/useModuleLabels';
import { useSessionState } from '@/hooks/useSessionState';
import { DraggablePillTabsList } from '@/components/ui/DraggablePillTabsList';
import type { PillTabConfig } from '@/components/ui/PillTabsList';
import type { ModuleKey } from '@/types/modules';

const ApporteursTabContent = lazy(() => import('@/components/unified/tabs/ApporteursTabContent'));
const EchangesApporteursTabContent = lazy(() => import('@/components/unified/tabs/EchangesApporteursTabContent').catch(() => ({ default: () => <div className="p-4 text-muted-foreground">Module en cours de développement</div> })));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function RelationsTabContent() {
  const { hasModule } = usePermissionsBridge();
  const { getShortLabel } = useModuleLabels();
  const [activeTab, setActiveTab] = useSessionState<string>('relations_sub_tab', 'apporteurs');

  const allTabs: (PillTabConfig & { requiresModule?: ModuleKey })[] = useMemo(() => [
    { id: 'apporteurs', label: getShortLabel('relations.apporteurs', 'Apporteurs'), icon: Handshake, accent: 'purple', requiresModule: 'relations.apporteurs' },
    { id: 'echanges-apporteurs', label: 'Échanges apporteurs', icon: MessagesSquare, accent: 'purple', requiresModule: 'relations.apporteurs' },
  ], [getShortLabel]);

  const visibleTabs = useMemo(() =>
    allTabs.filter(t => !t.requiresModule || hasModule(t.requiresModule)),
    [allTabs, hasModule]
  );

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, [setActiveTab]);

  return (
    <div className="py-3 px-2 sm:px-4">
      <DraggablePillTabsList
        tabs={visibleTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isDraggable={false}
      />
      <Suspense fallback={<LoadingFallback />}>
        {activeTab === 'apporteurs' && <ApporteursTabContent />}
        {activeTab === 'echanges-apporteurs' && <EchangesApporteursTabContent />}
      </Suspense>
    </div>
  );
}

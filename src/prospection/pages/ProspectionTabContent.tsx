/**
 * ProspectionTabContent - Contenu de l'onglet "Prospection"
 * Hub avec sous-onglets Pill : Liste, Fiche, Comparateur, Veille, Prospects
 */

import { useState, useCallback } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, type PillTabConfig } from '@/components/ui/pill-tabs';
import { List, LayoutDashboard, GitCompare, Bell, UserSearch, FolderOpen } from 'lucide-react';
import { ApporteurListPage } from '../pages/ApporteurListPage';
import { ApporteurDashboardPage } from '../pages/ApporteurDashboardPage';
import { ApporteurComparisonPage } from '../pages/ApporteurComparisonPage';
import { ApporteurAlertsPage } from '../pages/ApporteurAlertsPage';
import { ProspectPoolPage } from '../pages/ProspectPoolPage';
import { ProspectCardsPage } from '../pages/ProspectCardsPage';
import { ProspectCardDetailPage } from '../pages/ProspectCardDetailPage';

const TABS: PillTabConfig[] = [
  { id: 'liste', label: 'Liste', icon: List },
  { id: 'fiche', label: 'Fiche', icon: LayoutDashboard },
  { id: 'comparateur', label: 'Comparateur', icon: GitCompare },
  { id: 'veille', label: 'Veille', icon: Bell },
  { id: 'prospects-pool', label: 'Prospects', icon: UserSearch },
  { id: 'prospects-fiches', label: 'Fiches Prospects', icon: FolderOpen },
];

export default function ProspectionTabContent() {
  const [activeTab, setActiveTab] = useState('liste');
  const [selectedApporteurId, setSelectedApporteurId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const handleSelectApporteur = useCallback((id: string) => {
    setSelectedApporteurId(id);
    setActiveTab('fiche');
  }, []);

  const handleBackToList = useCallback(() => {
    setActiveTab('liste');
  }, []);

  const handleSelectCard = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
    setActiveTab('prospect-detail');
  }, []);

  const handleBackToCards = useCallback(() => {
    setSelectedCardId(null);
    setActiveTab('prospects-fiches');
  }, []);

  return (
    <div className="py-6 px-2 sm:px-4 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {activeTab !== 'prospect-detail' && <PillTabsList tabs={TABS} />}

        <TabsContent value="liste" className="mt-4">
          <ApporteurListPage onSelectApporteur={handleSelectApporteur} />
        </TabsContent>

        <TabsContent value="fiche" className="mt-4">
          {selectedApporteurId ? (
            <ApporteurDashboardPage
              apporteurId={selectedApporteurId}
              onBack={handleBackToList}
            />
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Sélectionnez un apporteur depuis la liste pour voir sa fiche.
            </div>
          )}
        </TabsContent>

        <TabsContent value="comparateur" className="mt-4">
          <ApporteurComparisonPage />
        </TabsContent>

        <TabsContent value="veille" className="mt-4">
          <ApporteurAlertsPage onSelectApporteur={handleSelectApporteur} />
        </TabsContent>

        <TabsContent value="prospects-pool" className="mt-4">
          <ProspectPoolPage />
        </TabsContent>

        <TabsContent value="prospects-fiches" className="mt-4">
          <ProspectCardsPage onSelectCard={handleSelectCard} />
        </TabsContent>

        {activeTab === 'prospect-detail' && selectedCardId && (
          <div className="mt-4">
            <ProspectCardDetailPage cardId={selectedCardId} onBack={handleBackToCards} />
          </div>
        )}
      </Tabs>
    </div>
  );
}

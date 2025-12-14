/**
 * Gestion Globale - Page unifiée
 * Fusion de: Utilisateurs, Droits & Accès, Centre de Permissions, Agences
 */

import { useState } from 'react';
import { Users, Building2, Layers, History, Grid3X3, FlaskConical } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { UsersAccessTab } from '@/components/admin/access-rights/tabs/UsersAccessTab';
import { SubscriptionsTab } from '@/components/admin/access-rights/tabs/SubscriptionsTab';
import { PlansEditorTab } from '@/components/admin/access-rights/tabs/PlansEditorTab';
import { AuditHistoryTab } from '@/components/admin/access-rights/tabs/AuditHistoryTab';
import { RoleMatrixTab } from '@/components/admin/permissions-center/tabs/RoleMatrixTab';
import { SimulatorAuditTab } from '@/components/admin/permissions-center/tabs/SimulatorAuditTab';
import { useAuth } from '@/contexts/AuthContext';
import { AccessRightsGlobalBanner } from '@/components/admin/access-rights/AccessRightsHierarchyExplainer';
import AgenciesTab from './tabs/AgenciesTab';

export default function UnifiedManagementPage() {
  const [activeTab, setActiveTab] = useState('users');
  const { hasGlobalRole } = useAuth();
  
  const isN5Plus = hasGlobalRole('platform_admin');
  const isN4Plus = hasGlobalRole('franchisor_admin');

  // Calcul du nombre de colonnes visibles
  const visibleTabs = [
    true, // users - toujours visible
    true, // agences - toujours visible
    isN4Plus, // subscriptions
    isN5Plus, // plans
    isN5Plus, // matrix
    isN5Plus, // simulator
    true, // history
  ].filter(Boolean).length;

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        title="Gestion Globale"
        subtitle="Utilisateurs, agences, plans, permissions et audit"
        backTo="/admin"
        backLabel="Administration"
      />
      
      <AccessRightsGlobalBanner />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full h-auto p-1`} style={{ gridTemplateColumns: `repeat(${visibleTabs}, minmax(0, 1fr))` }}>
          <TabsTrigger 
            value="users" 
            className="flex items-center gap-2 py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Users className="h-4 w-4" />
            <span className="hidden lg:inline">Utilisateurs</span>
            <span className="lg:hidden">Users</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="agencies"
            className="flex items-center gap-2 py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden lg:inline">Agences</span>
            <span className="lg:hidden">Agences</span>
          </TabsTrigger>
          
          {isN4Plus && (
            <TabsTrigger 
              value="subscriptions"
              className="flex items-center gap-2 py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Layers className="h-4 w-4" />
              <span className="hidden lg:inline">Souscriptions</span>
              <span className="lg:hidden">Plans</span>
            </TabsTrigger>
          )}
          
          {isN5Plus && (
            <TabsTrigger 
              value="plans"
              className="flex items-center gap-2 py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Layers className="h-4 w-4" />
              <span className="hidden lg:inline">Éditeur Plans</span>
              <span className="lg:hidden">Config</span>
            </TabsTrigger>
          )}
          
          {isN5Plus && (
            <TabsTrigger 
              value="matrix"
              className="flex items-center gap-2 py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden lg:inline">Matrice</span>
              <span className="lg:hidden">Rôles</span>
            </TabsTrigger>
          )}
          
          {isN5Plus && (
            <TabsTrigger 
              value="simulator"
              className="flex items-center gap-2 py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FlaskConical className="h-4 w-4" />
              <span className="hidden lg:inline">Simulateur</span>
              <span className="lg:hidden">Test</span>
            </TabsTrigger>
          )}
          
          <TabsTrigger 
            value="history"
            className="flex items-center gap-2 py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <History className="h-4 w-4" />
            <span className="hidden lg:inline">Historique</span>
            <span className="lg:hidden">Logs</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="mt-6">
          <UsersAccessTab />
        </TabsContent>
        
        <TabsContent value="agencies" className="mt-6">
          <AgenciesTab />
        </TabsContent>
        
        {isN4Plus && (
          <TabsContent value="subscriptions" className="mt-6">
            <SubscriptionsTab />
          </TabsContent>
        )}
        
        {isN5Plus && (
          <TabsContent value="plans" className="mt-6">
            <PlansEditorTab />
          </TabsContent>
        )}
        
        {isN5Plus && (
          <TabsContent value="matrix" className="mt-6">
            <RoleMatrixTab />
          </TabsContent>
        )}
        
        {isN5Plus && (
          <TabsContent value="simulator" className="mt-6">
            <SimulatorAuditTab />
          </TabsContent>
        )}
        
        <TabsContent value="history" className="mt-6">
          <AuditHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

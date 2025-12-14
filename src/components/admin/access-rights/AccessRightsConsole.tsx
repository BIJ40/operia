/**
 * Console Droits & Accès - Page principale
 * Gestion unifiée des plans, souscriptions et permissions
 */

import { useState } from 'react';
import { Users, Building2, Layers, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { UsersAccessTab } from './tabs/UsersAccessTab';
import { SubscriptionsTab } from './tabs/SubscriptionsTab';
import { PlansEditorTab } from './tabs/PlansEditorTab';
import { AuditHistoryTab } from './tabs/AuditHistoryTab';
import { useAuth } from '@/contexts/AuthContext';
import { AccessRightsGlobalBanner } from './AccessRightsHierarchyExplainer';

export default function AccessRightsConsole() {
  const [activeTab, setActiveTab] = useState('users');
  const { hasGlobalRole } = useAuth();
  
  const isN5Plus = hasGlobalRole('platform_admin');
  const isN4Plus = hasGlobalRole('franchisor_admin');

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        title="Console Droits & Accès"
        subtitle="Gestion des plans, souscriptions et permissions utilisateurs"
        backTo="/admin"
        backLabel="Administration"
      />
      
      {/* Bannière explicative globale */}
      <AccessRightsGlobalBanner />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger 
            value="users" 
            className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Utilisateurs</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
          
          {isN4Plus && (
            <TabsTrigger 
              value="subscriptions"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Souscriptions</span>
              <span className="sm:hidden">Plans</span>
            </TabsTrigger>
          )}
          
          {isN5Plus && (
            <TabsTrigger 
              value="plans"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Plans</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
          )}
          
          <TabsTrigger 
            value="history"
            className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historique</span>
            <span className="sm:hidden">Logs</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="mt-6">
          <UsersAccessTab />
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
        
        <TabsContent value="history" className="mt-6">
          <AuditHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

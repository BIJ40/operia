/**
 * Gestion - Page unifiée simplifiée
 * 3 onglets : Utilisateurs, Plans Agences, Journal
 */

import { useState } from 'react';
import { Users, Layers, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { UsersAccessTab } from '@/components/admin/access-rights/tabs/UsersAccessTab';
import { SubscriptionsTab } from '@/components/admin/access-rights/tabs/SubscriptionsTab';
import { AuditHistoryTab } from '@/components/admin/access-rights/tabs/AuditHistoryTab';
import { useAuth } from '@/contexts/AuthContext';

export default function UnifiedManagementPage() {
  const [activeTab, setActiveTab] = useState('users');
  const { hasGlobalRole } = useAuth();
  
  const isN4Plus = hasGlobalRole('franchisor_admin');

  const tabs = [
    { id: 'users', label: 'Utilisateurs', icon: Users, visible: true },
    { id: 'plans', label: 'Plans Agences', icon: Layers, visible: isN4Plus },
    { id: 'journal', label: 'Journal', icon: History, visible: true },
  ].filter(t => t.visible);

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        title="Gestion"
        subtitle="Utilisateurs, plans et historique"
        backTo="/admin"
        backLabel="Administration"
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList 
          className="grid w-full h-auto p-1" 
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map(tab => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="users" className="mt-6">
          <UsersAccessTab />
        </TabsContent>
        
        {isN4Plus && (
          <TabsContent value="plans" className="mt-6">
            <SubscriptionsTab />
          </TabsContent>
        )}
        
        <TabsContent value="journal" className="mt-6">
          <AuditHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

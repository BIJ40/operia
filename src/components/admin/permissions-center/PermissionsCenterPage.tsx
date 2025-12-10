/**
 * Permissions Center - Page principale avec 4 onglets
 * Centre de contrôle unifié pour toutes les permissions
 */

import { useState } from 'react';
import { Grid3X3, FileCode2, Users, FlaskConical } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleMatrixTab } from './tabs/RoleMatrixTab';
import { RoleTemplatesTab } from './tabs/RoleTemplatesTab';
import { UserManagementTab } from './tabs/UserManagementTab';
import { SimulatorAuditTab } from './tabs/SimulatorAuditTab';
import { PageHeader } from '@/components/layout/PageHeader';

export default function PermissionsCenterPage() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        title="Centre de Permissions"
        subtitle="Gestion centralisée des rôles, modules et accès"
        backTo="/admin"
        backLabel="Administration"
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger 
            value="matrix" 
            className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Matrice des Rôles</span>
            <span className="sm:hidden">Matrice</span>
          </TabsTrigger>
          <TabsTrigger 
            value="templates"
            className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FileCode2 className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
            <span className="sm:hidden">Templates</span>
          </TabsTrigger>
          <TabsTrigger 
            value="users"
            className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Utilisateurs</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
          <TabsTrigger 
            value="simulator"
            className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FlaskConical className="h-4 w-4" />
            <span className="hidden sm:inline">Simulateur</span>
            <span className="sm:hidden">Test</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="matrix" className="mt-6">
          <RoleMatrixTab />
        </TabsContent>
        
        <TabsContent value="templates" className="mt-6">
          <RoleTemplatesTab />
        </TabsContent>
        
        <TabsContent value="users" className="mt-6">
          <UserManagementTab />
        </TabsContent>
        
        <TabsContent value="simulator" className="mt-6">
          <SimulatorAuditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

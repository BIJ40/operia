/**
 * Page principale du module Maintenance Préventive
 * Route: /hc-agency/maintenance
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/routes';
import { VehiclesTab } from '@/components/maintenance/VehiclesTab';
import { ToolsTab } from '@/components/maintenance/ToolsTab';
import { AlertsTab } from '@/components/maintenance/AlertsTab';
import { PlansTab } from '@/components/maintenance/PlansTab';
import { useOpenMaintenanceAlertsCount } from '@/hooks/maintenance/useMaintenanceAlerts';
import { Wrench, Car, HardHat, Bell, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';

type TabId = 'vehicles' | 'tools' | 'alerts' | 'plans';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: 'vehicles', label: 'Véhicules', icon: Car },
  { id: 'tools', label: 'Matériel & EPI', icon: HardHat },
  { id: 'alerts', label: 'Alertes', icon: Bell },
  { id: 'plans', label: 'Plans préventifs', icon: Settings },
];

export default function MaintenancePreventivePage() {
  const [activeTab, setActiveTab] = useState<TabId>('vehicles');
  const { data: alertsCount = 0 } = useOpenMaintenanceAlertsCount();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Maintenance préventive"
        subtitle="Suivi des véhicules, matériel, EPI et contrôles réglementaires"
        backTo={ROUTES.agency.index}
        backLabel="Mon Agence"
        rightElement={
          alertsCount > 0 ? (
            <Badge variant="destructive" className="gap-1.5 px-3 py-1.5 text-sm">
              <Bell className="h-4 w-4" />
              {alertsCount} alerte{alertsCount > 1 ? 's' : ''} en cours
            </Badge>
          ) : undefined
        }
      />

      {/* Onglets */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              icon={tab.icon}
              badge={tab.id === 'alerts' && alertsCount > 0 ? alertsCount : undefined}
            >
              {tab.label}
            </TabButton>
          ))}
        </nav>
      </div>

      {/* Contenu onglets */}
      <div className="min-h-[400px]">
        {activeTab === 'vehicles' && <VehiclesTab />}
        {activeTab === 'tools' && <ToolsTab />}
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'plans' && <PlansTab />}
      </div>
    </div>
  );
}

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ElementType;
  children: React.ReactNode;
  badge?: number;
}

function TabButton({ isActive, onClick, icon: Icon, children, badge }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
        isActive
          ? 'border-helpconfort-blue text-helpconfort-blue'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
      {badge !== undefined && badge > 0 && (
        <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px]">
          {badge}
        </Badge>
      )}
    </button>
  );
}

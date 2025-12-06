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
import { Wrench, Car, HardHat, Bell, Settings, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Lien retour */}
      <Link
        to={ROUTES.pilotage.index}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Mon Agence
      </Link>

      {/* Header */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Wrench className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Maintenance préventive
            </h1>
            <p className="text-sm text-muted-foreground">
              Suivi des véhicules, matériel, EPI et contrôles réglementaires
            </p>
          </div>
        </div>
        {alertsCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="gap-1">
              <Bell className="h-3.5 w-3.5" />
              {alertsCount} alerte{alertsCount > 1 ? 's' : ''} en cours
            </Badge>
          </div>
        )}
      </header>

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
      {activeTab === 'vehicles' && <VehiclesTab />}
      {activeTab === 'tools' && <ToolsTab />}
      {activeTab === 'alerts' && <AlertsTab />}
      {activeTab === 'plans' && <PlansTab />}
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
        'flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
      {badge !== undefined && badge > 0 && (
        <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
          {badge}
        </Badge>
      )}
    </button>
  );
}

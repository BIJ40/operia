/**
 * Page principale du module Maintenance Préventive
 * Route: /hc-agency/maintenance
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { VehiclesTab } from '@/components/maintenance/VehiclesTab';
import { ToolsTab } from '@/components/maintenance/ToolsTab';
import { Wrench, Car, HardHat } from 'lucide-react';

type TabId = 'vehicles' | 'tools';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: 'vehicles', label: 'Véhicules', icon: Car },
  { id: 'tools', label: 'Matériel & EPI', icon: HardHat },
];

export default function MaintenancePreventivePage() {
  const [activeTab, setActiveTab] = useState<TabId>('vehicles');

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Header */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Maintenance préventive
            </h1>
            <p className="text-sm text-muted-foreground">
              Suivi des véhicules, matériel et EPI de l'agence
            </p>
          </div>
        </div>
      </header>

      {/* Onglets */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-4">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              icon={tab.icon}
            >
              {tab.label}
            </TabButton>
          ))}
        </nav>
      </div>

      {/* Contenu onglets */}
      {activeTab === 'vehicles' && <VehiclesTab />}
      {activeTab === 'tools' && <ToolsTab />}
    </div>
  );
}

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ElementType;
  children: React.ReactNode;
}

function TabButton({ isActive, onClick, icon: Icon, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 border-b-2 px-2 pb-2 text-sm font-medium transition-colors',
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

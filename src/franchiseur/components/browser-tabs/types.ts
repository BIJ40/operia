import { LucideIcon } from 'lucide-react';

export interface BrowserTabData {
  id: string;
  label: string;
  icon: LucideIcon;
  closable: boolean;
}

export interface BrowserTabsState {
  tabs: BrowserTabData[];
  activeTabId: string | null;
}

export interface ModuleDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  closable: boolean;
  minRole?: string;
}

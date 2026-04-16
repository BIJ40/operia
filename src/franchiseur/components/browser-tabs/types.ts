import { LucideIcon } from 'lucide-react';

// Stored in sessionStorage - only serializable data
export interface StoredTabData {
  id: string;
  label: string;
  closable: boolean;
}

// Runtime tab data with resolved icon
export interface BrowserTabData {
  id: string;
  label: string;
  icon: LucideIcon;
  closable: boolean;
}

export interface BrowserTabsState {
  tabs: StoredTabData[];
  activeTabId: string | null;
}

export interface ModuleDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  closable: boolean;
  minRole?: string;
}

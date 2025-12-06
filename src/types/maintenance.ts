/**
 * Types pour le module Maintenance Préventive (Module 7)
 * Gestion des véhicules, outillages, EPI et contrôles réglementaires
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type VehicleStatus = 'active' | 'inactive' | 'sold' | 'repair';
export const VEHICLE_STATUSES: { value: VehicleStatus; label: string; color: string }[] = [
  { value: 'active', label: 'En service', color: 'green' },
  { value: 'inactive', label: 'Inactif', color: 'gray' },
  { value: 'sold', label: 'Vendu', color: 'blue' },
  { value: 'repair', label: 'En réparation', color: 'orange' },
];

export type ToolCategory = 'vehicle_tool' | 'power_tool' | 'ladder' | 'epi' | 'measuring' | 'other';
export const TOOL_CATEGORIES: { value: ToolCategory; label: string; icon: string }[] = [
  { value: 'vehicle_tool', label: 'Outillage véhicule', icon: 'Wrench' },
  { value: 'power_tool', label: 'Outillage électroportatif', icon: 'Zap' },
  { value: 'ladder', label: 'Échelle / Escabeau', icon: 'ArrowUpToLine' },
  { value: 'epi', label: 'EPI', icon: 'HardHat' },
  { value: 'measuring', label: 'Mesure', icon: 'Ruler' },
  { value: 'other', label: 'Autre', icon: 'Package' },
];

export type ToolStatus = 'in_service' | 'out_of_service' | 'lost' | 'repair';
export const TOOL_STATUSES: { value: ToolStatus; label: string; color: string }[] = [
  { value: 'in_service', label: 'En service', color: 'green' },
  { value: 'out_of_service', label: 'Hors service', color: 'red' },
  { value: 'lost', label: 'Perdu', color: 'gray' },
  { value: 'repair', label: 'En réparation', color: 'orange' },
];

export type MaintenanceTargetType = 'vehicle' | 'tool';

export type FrequencyUnit = 'days' | 'months' | 'years' | 'km';
export const FREQUENCY_UNITS: { value: FrequencyUnit; label: string }[] = [
  { value: 'days', label: 'Jours' },
  { value: 'months', label: 'Mois' },
  { value: 'years', label: 'Années' },
  { value: 'km', label: 'Kilomètres' },
];

export type MaintenanceEventStatus = 'scheduled' | 'overdue' | 'completed' | 'cancelled';
export const MAINTENANCE_EVENT_STATUSES: { value: MaintenanceEventStatus; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Planifié', color: 'blue' },
  { value: 'overdue', label: 'En retard', color: 'red' },
  { value: 'completed', label: 'Réalisé', color: 'green' },
  { value: 'cancelled', label: 'Annulé', color: 'gray' },
];

export type AlertSeverity = 'info' | 'warning' | 'critical';
export const ALERT_SEVERITIES: { value: AlertSeverity; label: string; color: string }[] = [
  { value: 'info', label: 'Information', color: 'blue' },
  { value: 'warning', label: 'Attention', color: 'orange' },
  { value: 'critical', label: 'Critique', color: 'red' },
];

export type AlertStatus = 'open' | 'acknowledged' | 'closed';
export const ALERT_STATUSES: { value: AlertStatus; label: string }[] = [
  { value: 'open', label: 'Ouverte' },
  { value: 'acknowledged', label: 'Accusée' },
  { value: 'closed', label: 'Clôturée' },
];

// ============================================================================
// INTERFACES
// ============================================================================

export interface FleetVehicle {
  id: string;
  agency_id: string;
  name: string;
  registration: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage_km: number | null;
  assigned_collaborator_id: string | null;
  status: VehicleStatus;
  ct_due_at: string | null;
  last_ct_at: string | null;
  next_revision_at: string | null;
  last_revision_at: string | null;
  next_tires_change_at: string | null;
  qr_token: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations jointes
  collaborator?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface Tool {
  id: string;
  agency_id: string;
  label: string;
  category: ToolCategory;
  serial_number: string | null;
  assigned_collaborator_id: string | null;
  status: ToolStatus;
  qr_token: string | null;
  default_plan_template_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations jointes
  collaborator?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  plan_template?: MaintenancePlanTemplate | null;
}

export interface MaintenancePlanTemplate {
  id: string;
  agency_id: string;
  name: string;
  target_type: MaintenanceTargetType;
  target_category: string | null;
  description: string | null;
  is_default_for_category: boolean;
  created_at: string;
  updated_at: string;
  // Relations jointes
  items?: MaintenancePlanItem[];
}

export interface MaintenancePlanItem {
  id: string;
  plan_template_id: string;
  label: string;
  frequency_unit: FrequencyUnit;
  frequency_value: number;
  first_due_after_days: number | null;
  is_mandatory: boolean;
  legal_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceEvent {
  id: string;
  agency_id: string;
  target_type: MaintenanceTargetType;
  vehicle_id: string | null;
  tool_id: string | null;
  plan_item_id: string | null;
  label: string;
  scheduled_at: string;
  completed_at: string | null;
  completed_by: string | null;
  status: MaintenanceEventStatus;
  mileage_km: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations jointes
  vehicle?: FleetVehicle | null;
  tool?: Tool | null;
  plan_item?: MaintenancePlanItem | null;
  completed_by_collaborator?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface MaintenanceAlert {
  id: string;
  agency_id: string;
  maintenance_event_id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  notified_channels: Record<string, boolean>;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
  // Relations jointes
  maintenance_event?: MaintenanceEvent | null;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface FleetVehicleFormData {
  name: string;
  registration?: string;
  brand?: string;
  model?: string;
  year?: number;
  mileage_km?: number;
  assigned_collaborator_id?: string;
  status: VehicleStatus;
  ct_due_at?: string;
  next_revision_at?: string;
  next_tires_change_at?: string;
  notes?: string;
}

export interface ToolFormData {
  label: string;
  category: ToolCategory;
  serial_number?: string;
  assigned_collaborator_id?: string;
  status: ToolStatus;
  default_plan_template_id?: string;
}

export interface MaintenancePlanTemplateFormData {
  name: string;
  target_type: MaintenanceTargetType;
  target_category?: string;
  description?: string;
  is_default_for_category?: boolean;
}

export interface MaintenancePlanItemFormData {
  label: string;
  frequency_unit: FrequencyUnit;
  frequency_value: number;
  first_due_after_days?: number;
  is_mandatory?: boolean;
  legal_reference?: string;
}

export interface MaintenanceEventFormData {
  target_type: MaintenanceTargetType;
  vehicle_id?: string;
  tool_id?: string;
  plan_item_id?: string;
  label: string;
  scheduled_at: string;
  notes?: string;
}

export interface CompleteMaintenanceEventData {
  completed_at: string;
  completed_by: string;
  mileage_km?: number;
  notes?: string;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface FleetVehiclesFilters {
  status?: VehicleStatus;
  ctOverdue?: boolean;
  ctDueSoon?: boolean; // < 30 jours
  collaboratorId?: string;
  search?: string;
}

export interface ToolsFilters {
  category?: ToolCategory;
  status?: ToolStatus;
  collaboratorId?: string;
  search?: string;
}

export interface MaintenanceEventsFilters {
  targetType?: MaintenanceTargetType;
  vehicleId?: string;
  toolId?: string;
  status?: MaintenanceEventStatus;
  from?: string;
  to?: string;
}

export interface MaintenanceAlertsFilters {
  severity?: AlertSeverity;
  status?: AlertStatus;
  targetType?: MaintenanceTargetType;
}

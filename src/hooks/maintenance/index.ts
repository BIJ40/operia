/**
 * Module Maintenance Préventive - Index des hooks
 */

// Véhicules
export {
  useFleetVehicles,
  useFleetVehicle,
  useCreateFleetVehicle,
  useUpdateFleetVehicle,
  useUpdateVehicleMileage,
  useDeleteFleetVehicle,
} from './useFleetVehicles';

// Outils / EPI / Matériel
export {
  useTools,
  useTool,
  useCreateTool,
  useUpdateTool,
  useDeleteTool,
} from './useTools';

// Événements de maintenance
export {
  useMaintenanceEvents,
  useMaintenanceEvent,
  useCreateMaintenanceEvent,
  useCompleteMaintenanceEvent,
  useCancelMaintenanceEvent,
  useDeleteMaintenanceEvent,
} from './useMaintenanceEvents';

// Alertes
export {
  useMaintenanceAlerts,
  useOpenMaintenanceAlertsCount,
  useAcknowledgeAlert,
  useCloseAlert,
} from './useMaintenanceAlerts';

// Plans préventifs
export {
  useMaintenancePlans,
  useMaintenancePlan,
  useCreatePlanTemplate,
  useUpdatePlanTemplate,
  useDeletePlanTemplate,
  useCreatePlanItem,
  useUpdatePlanItem,
  useDeletePlanItem,
  useApplyPlanToAsset,
} from './useMaintenancePlans';

/**
 * Hooks pour le portail salarié RH (N1)
 */
export { useMyCollaborator, type MyCollaborator } from "./useMyCollaborator";
export { useMyDocuments, useDownloadDocument, type MyDocument } from "./useMyDocuments";
export { 
  useMyRequests, 
  useCreateRequest, 
  useCancelRequest,
  useDownloadMyLetter,
  useArchiveMyRequest,
  canArchiveRequest,
  type RHRequest, 
  type RequestType, 
  type RequestStatus, 
  type CreateRequestPayload 
} from "./useMyRequests";
export { useMySignature, useSaveSignature, useDeleteSignature, type UserSignature } from "./useMySignature";
export { useMyVehicle } from "./useMyVehicle";
export { useMyEquipment, type MyEquipmentItem } from "./useMyEquipment";

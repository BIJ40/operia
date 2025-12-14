/**
 * Hooks pour le portail salarié RH (N1)
 */
export { useMyCollaborator, type MyCollaborator } from "./useMyCollaborator";
export { useMyDocuments, useDownloadDocument, type MyDocument } from "./useMyDocuments";
export { 
  useMyRequests, 
  useCreateRequest, 
  useCancelRequest, 
  type RHRequest, 
  type RequestType, 
  type RequestStatus, 
  type CreateRequestPayload 
} from "./useMyRequests";
export { useMySignature, useSaveSignature, useDeleteSignature, type UserSignature } from "./useMySignature";

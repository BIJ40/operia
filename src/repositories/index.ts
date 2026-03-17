/**
 * Repository Layer — Typed Supabase data access.
 * 
 * Usage:
 * ```ts
 * import { agencyRepo, profileRepo, collaboratorRepo } from '@/repositories';
 * const agencies = await agencyRepo.listAgencies({ activeOnly: true });
 * ```
 */

export * as agencyRepo from './agencyRepository';
export * as profileRepo from './profileRepository';
export * as collaboratorRepo from './collaboratorRepository';
export * as activityLogRepo from './activityLogRepository';
export * as announcementRepo from './announcementRepository';
export * as userModulesRepo from './userModulesRepository';
export * as adminDocumentRepo from './adminDocumentRepository';
export * as maintenanceRepo from './maintenanceRepository';
export * as profitabilityRepo from './profitabilityRepository';

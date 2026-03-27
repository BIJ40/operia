/**
 * Referrer allocations management
 */

import { loadData, saveData } from './core';

const REFERRER_ALLOCATIONS_KEY = 'referrerAllocations';

export interface ReferrerAllocation {
  referrerId: string;
  projectId: string;
  date: string;
  amount?: number;
}

export function getReferrerAllocations(): ReferrerAllocation[] {
  return loadData(REFERRER_ALLOCATIONS_KEY) || [];
}

export function setReferrerAllocations(allocations: ReferrerAllocation[]): void {
  saveData(REFERRER_ALLOCATIONS_KEY, allocations);
}

export function addReferrerAllocation(allocation: ReferrerAllocation): void {
  const allocations = getReferrerAllocations();
  allocations.push(allocation);
  setReferrerAllocations(allocations);
}

export function removeReferrerAllocation(index: number): void {
  const allocations = getReferrerAllocations();
  allocations.splice(index, 1);
  setReferrerAllocations(allocations);
}

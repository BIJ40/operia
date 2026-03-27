/**
 * Technician allocations management
 */

import { loadData, saveData } from './core';

const TECHNICIAN_ALLOCATIONS_KEY = 'technicianAllocations';

export interface TechnicianAllocation {
  technicianId: string;
  projectId: string;
  date: string;
  hours?: number;
}

export function getTechnicianAllocations(): TechnicianAllocation[] {
  return loadData(TECHNICIAN_ALLOCATIONS_KEY) || [];
}

export function setTechnicianAllocations(
  allocations: TechnicianAllocation[]
): void {
  saveData(TECHNICIAN_ALLOCATIONS_KEY, allocations);
}

export function addTechnicianAllocation(
  allocation: TechnicianAllocation
): void {
  const allocations = getTechnicianAllocations();
  allocations.push(allocation);
  setTechnicianAllocations(allocations);
}

export function removeTechnicianAllocation(index: number): void {
  const allocations = getTechnicianAllocations();
  allocations.splice(index, 1);
  setTechnicianAllocations(allocations);
}

/**
 * Performance Terrain — Multi-technician allocation
 * Division équitable stricte du temps entre techniciens
 */

export interface AllocationResult {
  allocations: Map<string, number>; // techId -> minutes
  method: 'equal_split';
  sharedSlots: number;
}

/**
 * Allocate duration equally across technicians.
 * If only 1 tech, full duration assigned.
 */
export function allocateDuration(
  minutes: number,
  technicianIds: string[]
): AllocationResult {
  const allocations = new Map<string, number>();
  const n = technicianIds.length;

  if (n === 0) {
    return { allocations, method: 'equal_split', sharedSlots: 0 };
  }

  const perTech = minutes / n;
  for (const id of technicianIds) {
    allocations.set(id, (allocations.get(id) || 0) + perTech);
  }

  return {
    allocations,
    method: 'equal_split',
    sharedSlots: n > 1 ? 1 : 0,
  };
}

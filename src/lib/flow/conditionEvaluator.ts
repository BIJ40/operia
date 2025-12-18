/**
 * Flow Condition Evaluator
 * Evaluates flow edge conditions to determine the next node
 */

import type { FlowEdge, FlowEdgeCondition } from './flowTypes';

/**
 * Evaluate a single condition against the current answers
 */
export function evaluateCondition(
  condition: FlowEdgeCondition | null | undefined,
  answers: Record<string, unknown>
): boolean {
  // No condition = always true (default edge)
  if (!condition || !condition.field || !condition.operator) {
    return true;
  }

  const fieldValue = answers[condition.field];
  const expectedValue = condition.value;

  switch (condition.operator) {
    case 'eq':
      return fieldValue === expectedValue;
    
    case 'neq':
      return fieldValue !== expectedValue;
    
    case 'gt':
      if (typeof fieldValue === 'number' && typeof expectedValue === 'number') {
        return fieldValue > expectedValue;
      }
      return false;
    
    case 'gte':
      if (typeof fieldValue === 'number' && typeof expectedValue === 'number') {
        return fieldValue >= expectedValue;
      }
      return false;
    
    case 'lt':
      if (typeof fieldValue === 'number' && typeof expectedValue === 'number') {
        return fieldValue < expectedValue;
      }
      return false;
    
    case 'lte':
      if (typeof fieldValue === 'number' && typeof expectedValue === 'number') {
        return fieldValue <= expectedValue;
      }
      return false;
    
    case 'in':
      if (Array.isArray(expectedValue)) {
        return expectedValue.includes(fieldValue);
      }
      return false;
    
    case 'contains':
      if (typeof fieldValue === 'string' && typeof expectedValue === 'string') {
        return fieldValue.toLowerCase().includes(expectedValue.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(expectedValue);
      }
      return false;
    
    default:
      return false;
  }
}

/**
 * Find the next node ID by evaluating edges from the current node
 * Edges are evaluated in priority order, first matching wins
 * Default edge (isDefault: true) is used if no conditions match
 */
export function findNextNode(
  currentNodeId: string,
  edges: FlowEdge[],
  answers: Record<string, unknown>
): string | null {
  // Get all edges from this node
  const outgoingEdges = edges
    .filter((edge) => edge.source === currentNodeId)
    .sort((a, b) => a.data.priority - b.data.priority);

  if (outgoingEdges.length === 0) {
    return null; // Terminal node
  }

  // Find first matching non-default edge
  for (const edge of outgoingEdges) {
    if (edge.data.isDefault) continue;
    
    if (evaluateCondition(edge.data.when, answers)) {
      return edge.target;
    }
  }

  // Fall back to default edge
  const defaultEdge = outgoingEdges.find((edge) => edge.data.isDefault);
  if (defaultEdge) {
    return defaultEdge.target;
  }

  // No match found, use first edge
  return outgoingEdges[0]?.target ?? null;
}

/**
 * Get all possible next nodes (for UI preview)
 */
export function getPossibleNextNodes(
  currentNodeId: string,
  edges: FlowEdge[]
): { nodeId: string; label: string; isDefault: boolean }[] {
  return edges
    .filter((edge) => edge.source === currentNodeId)
    .map((edge) => ({
      nodeId: edge.target,
      label: edge.data.label,
      isDefault: edge.data.isDefault,
    }));
}

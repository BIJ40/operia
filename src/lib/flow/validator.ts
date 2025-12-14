import type { FlowSchemaJson, FlowNode, FlowEdge, FlowValidationError } from './flowTypes';

export function validateFlowSchema(schema: FlowSchemaJson): FlowValidationError[] {
  const errors: FlowValidationError[] = [];
  const { rootNodeId, nodes, edges } = schema;

  // Check rootNodeId exists
  if (!rootNodeId) {
    errors.push({
      type: 'error',
      message: 'Le schéma doit avoir un nœud racine (rootNodeId)',
    });
  }

  // Check rootNodeId points to existing node
  if (rootNodeId && !nodes.find(n => n.id === rootNodeId)) {
    errors.push({
      type: 'error',
      message: `Le nœud racine "${rootNodeId}" n'existe pas`,
    });
  }

  // Check for duplicate node IDs
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({
        type: 'error',
        nodeId: node.id,
        message: `ID de nœud dupliqué: ${node.id}`,
      });
    }
    nodeIds.add(node.id);
  }

  // Check for duplicate edge IDs
  const edgeIds = new Set<string>();
  for (const edge of edges) {
    if (edgeIds.has(edge.id)) {
      errors.push({
        type: 'error',
        edgeId: edge.id,
        message: `ID de lien dupliqué: ${edge.id}`,
      });
    }
    edgeIds.add(edge.id);
  }

  // Build adjacency info
  const incomingEdges = new Map<string, FlowEdge[]>();
  const outgoingEdges = new Map<string, FlowEdge[]>();
  
  for (const edge of edges) {
    // Check edge references valid nodes
    if (!nodeIds.has(edge.source)) {
      errors.push({
        type: 'error',
        edgeId: edge.id,
        message: `Le lien référence un nœud source inexistant: ${edge.source}`,
      });
    }
    if (!nodeIds.has(edge.target)) {
      errors.push({
        type: 'error',
        edgeId: edge.id,
        message: `Le lien référence un nœud cible inexistant: ${edge.target}`,
      });
    }

    // Track adjacency
    if (!incomingEdges.has(edge.target)) {
      incomingEdges.set(edge.target, []);
    }
    incomingEdges.get(edge.target)!.push(edge);

    if (!outgoingEdges.has(edge.source)) {
      outgoingEdges.set(edge.source, []);
    }
    outgoingEdges.get(edge.source)!.push(edge);
  }

  // Validate each node
  for (const node of nodes) {
    const incoming = incomingEdges.get(node.id) || [];
    const outgoing = outgoingEdges.get(node.id) || [];

    // Check orphan nodes (except root)
    if (node.id !== rootNodeId && incoming.length === 0) {
      errors.push({
        type: 'warning',
        nodeId: node.id,
        message: `Nœud orphelin (aucune entrée): ${node.data.label || node.id}`,
      });
    }

    // Terminal nodes should have no outgoing edges
    if (node.type === 'terminal' && outgoing.length > 0) {
      errors.push({
        type: 'error',
        nodeId: node.id,
        message: `Un nœud terminal ne doit pas avoir de sortie: ${node.data.label || node.id}`,
      });
    }

    // Block and router nodes should have at least one outgoing edge
    if ((node.type === 'block' || node.type === 'router') && outgoing.length === 0) {
      errors.push({
        type: 'warning',
        nodeId: node.id,
        message: `Nœud sans sortie: ${node.data.label || node.id}`,
      });
    }

    // Start node should have no incoming edges
    if (node.type === 'start' && incoming.length > 0) {
      errors.push({
        type: 'error',
        nodeId: node.id,
        message: `Le nœud de départ ne doit pas avoir d'entrée`,
      });
    }

    // Check node has a label
    if (!node.data.label) {
      errors.push({
        type: 'warning',
        nodeId: node.id,
        message: `Nœud sans libellé: ${node.id}`,
      });
    }

    // Block nodes should have a blockId
    if (node.type === 'block' && !node.blockId) {
      errors.push({
        type: 'error',
        nodeId: node.id,
        message: `Nœud bloc sans type de bloc associé: ${node.data.label || node.id}`,
      });
    }
  }

  // Check for cycles (optional, warning only)
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    inStack.add(nodeId);

    const outgoing = outgoingEdges.get(nodeId) || [];
    for (const edge of outgoing) {
      if (hasCycle(edge.target)) return true;
    }

    inStack.delete(nodeId);
    return false;
  }

  if (rootNodeId && hasCycle(rootNodeId)) {
    errors.push({
      type: 'warning',
      message: 'Le schéma contient un cycle (boucle). Vérifiez que c\'est intentionnel.',
    });
  }

  return errors;
}

export function hasBlockingErrors(errors: FlowValidationError[]): boolean {
  return errors.some(e => e.type === 'error');
}

export function formatValidationErrors(errors: FlowValidationError[]): string {
  return errors
    .map(e => `[${e.type.toUpperCase()}] ${e.message}`)
    .join('\n');
}

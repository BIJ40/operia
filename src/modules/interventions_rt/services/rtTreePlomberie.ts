// Arbre de questions Plomberie - importé depuis JSON
import { QuestionTree, QuestionNode } from '../types';
import arbrePlomberieData from '../data/arbre_plomberie.json';

// Le JSON utilise un format tableau pour les nodes, on le convertit en objet indexé
interface RawTreeData {
  metadata: {
    univers: string;
    version: number;
    label: string;
    author: string;
  };
  root: string;
  blocks: Array<{
    blockId: string;
    label: string;
    entryNodeId: string;
    nodeIds: string[];
  }>;
  branches: Array<{
    branchId: string;
    label: string;
    entryNodeId: string;
    includeBlocks: string[];
  }>;
  nodes: Array<{
    id: string;
    group?: string;
    label: string;
    type: string;
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
    helpText?: string;
    next?: {
      default?: string;
      byAnswer?: Record<string, string>;
    };
    backTo?: string;
    tags?: string[];
  }>;
}

function convertToQuestionTree(raw: RawTreeData): QuestionTree {
  // Convertir le tableau de nodes en objet indexé par id
  const nodesMap: Record<string, QuestionNode> = {};
  
  for (const node of raw.nodes) {
    nodesMap[node.id] = {
      id: node.id,
      branch: node.group,
      question: node.label,
      type: node.type as QuestionNode['type'],
      options: node.options,
      helpText: node.helpText,
      required: node.required,
      next: node.next || { default: null },
      backTo: node.backTo,
      tags: node.tags,
    };
  }
  
  return {
    univers: raw.metadata.univers,
    version: String(raw.metadata.version),
    startNode: raw.root,
    nodes: nodesMap,
    metadata: {
      univers: raw.metadata.univers,
      version: raw.metadata.version,
      label: raw.metadata.label,
      author: raw.metadata.author,
    },
    blocks: raw.blocks,
    branches: raw.branches,
  };
}

export const rtTreePlomberie: QuestionTree = convertToQuestionTree(arbrePlomberieData as RawTreeData);

export default rtTreePlomberie;

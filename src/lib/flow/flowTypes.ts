// =============================================
// FLOW BUILDER TYPES
// =============================================

// ============ BLOCK SCHEMA (bibliothèque) ============

export interface BlockFieldSchema {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multi_select' | 'image' | 'signature' | 'date' | 'time';
  required?: boolean;
  unit?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  maxSize?: number; // for files
  options?: { value: string; label: string }[]; // for select
  defaultValue?: unknown;
}

export interface BlockComputedField {
  key: string;
  label: string;
  formula: string;
  unit?: string;
}

export interface BlockSchema {
  fields: BlockFieldSchema[];
  computed?: BlockComputedField[];
  branches?: string[]; // pour les blocs à choix multiples
  outputs: string[];
}

export interface QuestionBlock {
  id: string;
  name: string;
  category: string;
  icon?: string;
  schema: BlockSchema;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============ FLOW SCHEMA (workflow) ============

export type FlowDomain = 'rt' | 'bon_intervention' | 'pv' | 'checklist' | 'devis' | 'other';

export const FLOW_DOMAINS: { value: FlowDomain; label: string }[] = [
  { value: 'rt', label: 'Relevé Technique' },
  { value: 'bon_intervention', label: "Bon d'intervention" },
  { value: 'pv', label: 'Procès-Verbal' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'devis', label: 'Devis' },
  { value: 'other', label: 'Autre' },
];

export interface FlowNodePosition {
  x: number;
  y: number;
}

export type FlowNodeType = 'block' | 'router' | 'terminal' | 'start' | 'jump';

export interface FlowNodeOverrides {
  unit?: string;
  min?: number;
  max?: number;
  required?: boolean;
  label?: string;
}

export interface FlowNodeData {
  label: string;
  contextKey?: string; // "vitrage", "mur", "menuiserie"...
  overrides?: FlowNodeOverrides;
  mapping?: Record<string, string>; // future: mapping vers devis
  targetSchemaId?: string; // for jump nodes - reference to another schema
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  blockId?: string; // référence vers QuestionBlock.id
  position: FlowNodePosition;
  data: FlowNodeData;
}

export interface FlowEdgeCondition {
  field?: string;
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value?: unknown;
}

export interface FlowEdgeData {
  label: string;
  when?: FlowEdgeCondition | null;
  priority: number;
  isDefault: boolean;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data: FlowEdgeData;
}

export interface FlowSchemaMeta {
  tradeId?: string; // métier
  templateId?: string;
  version: number;
  publishedAt?: string;
}

export interface FlowSchemaJson {
  rootNodeId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  meta: FlowSchemaMeta;
}

export interface FlowSchema {
  id: string;
  name: string;
  domain: FlowDomain;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FlowSchemaVersion {
  id: string;
  schema_id: string;
  version: number;
  json: FlowSchemaJson;
  is_published: boolean;
  published_at?: string;
  published_by?: string;
  created_at: string;
}

// ============ VALIDATION ============

export interface FlowValidationError {
  type: 'error' | 'warning';
  nodeId?: string;
  edgeId?: string;
  message: string;
}

// ============ REACT FLOW ADAPTERS ============

export interface ReactFlowNodeData extends FlowNodeData {
  blockId?: string;
  nodeType: FlowNodeType;
  block?: QuestionBlock;
  targetSchemaId?: string; // for jump nodes
}

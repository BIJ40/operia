import { useCallback, useState, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeTypes } from './FlowNodeTypes';
import { FlowBlocksPalette } from './FlowBlocksPalette';
import { FlowPropertiesPanel } from './FlowPropertiesPanel';
import { FlowToolbar } from './FlowToolbar';
import { FlowValidationPanel } from './FlowValidationPanel';
import { validateFlowSchema } from '@/lib/flow/validator';
import type { 
  QuestionBlock, 
  FlowSchemaJson, 
  FlowNode as FlowNodeType,
  FlowEdge as FlowEdgeType,
  ReactFlowNodeData,
  FlowEdgeData,
  FlowValidationError,
} from '@/lib/flow/flowTypes';

interface FlowBuilderProps {
  blocks: QuestionBlock[];
  initialSchema?: FlowSchemaJson | null;
  onSave: (schema: FlowSchemaJson) => Promise<void>;
  onPublish: () => Promise<void>;
  onImportPackage?: (pkg: any) => Promise<void>;
  isSaving?: boolean;
  isPublishing?: boolean;
  schemaName?: string;
}

// Convert FlowNode to React Flow Node
function toReactFlowNode(node: FlowNodeType, blocks: QuestionBlock[]): Node<ReactFlowNodeData> {
  const block = node.blockId ? blocks.find(b => b.id === node.blockId) : undefined;
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      blockId: node.blockId,
      nodeType: node.type,
      block,
    },
  };
}

// Convert FlowEdge to React Flow Edge
function toReactFlowEdge(edge: FlowEdgeType): Edge<FlowEdgeData> {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: 'default',
    label: edge.data.label || undefined,
    data: edge.data,
  };
}

// Convert React Flow Node back to FlowNode
function fromReactFlowNode(node: Node<ReactFlowNodeData>): FlowNodeType {
  return {
    id: node.id,
    type: node.data.nodeType,
    blockId: node.data.blockId,
    position: node.position,
    data: {
      label: node.data.label,
      contextKey: node.data.contextKey,
      overrides: node.data.overrides,
      mapping: node.data.mapping,
      targetSchemaId: node.data.targetSchemaId,
    },
  };
}

// Convert React Flow Edge back to FlowEdge
function fromReactFlowEdge(edge: Edge<FlowEdgeData>): FlowEdgeType {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    data: edge.data || {
      label: '',
      when: null,
      priority: 0,
      isDefault: false,
    },
  };
}

// Default initial schema with start node
const createDefaultSchema = (): FlowSchemaJson => ({
  rootNodeId: 'start',
  nodes: [
    {
      id: 'start',
      type: 'start',
      position: { x: 250, y: 50 },
      data: { label: 'Début' },
    },
  ],
  edges: [],
  meta: { version: 1 },
});

function FlowBuilderInner({
  blocks,
  initialSchema,
  onSave,
  onPublish,
  onImportPackage,
  isSaving,
  isPublishing,
  schemaName,
}: FlowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Initialize nodes and edges from schema
  const schema = initialSchema || createDefaultSchema();
  const initialNodes = useMemo(
    () => schema.nodes.map(n => toReactFlowNode(n, blocks)),
    [schema.nodes, blocks]
  );
  const initialEdges = useMemo(
    () => schema.edges.map(toReactFlowEdge),
    [schema.edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<ReactFlowNodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge<FlowEdgeData> | null>(null);
  const [validationErrors, setValidationErrors] = useState<FlowValidationError[]>([]);

  // Generate unique ID
  const generateId = useCallback(() => {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Handle new connection
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge<FlowEdgeData> = {
        ...connection,
        id: `edge_${Date.now()}`,
        data: {
          label: '',
          when: null,
          priority: 0,
          isDefault: false,
        },
      } as Edge<FlowEdgeData>;
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<ReactFlowNodeData>) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // Handle edge selection
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge<FlowEdgeData>) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Handle node data change
  const onNodeChange = useCallback(
    (nodeId: string, data: Partial<ReactFlowNodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...data },
            };
          }
          return node;
        })
      );
      // Update selected node
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev
      );
    },
    [setNodes]
  );

  // Handle edge data change
  const onEdgeChange = useCallback(
    (edgeId: string, data: Partial<FlowEdgeData>) => {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === edgeId) {
            const newData = { ...edge.data, ...data };
            return {
              ...edge,
              data: newData,
              label: newData.label || undefined,
            };
          }
          return edge;
        })
      );
      // Update selected edge
      setSelectedEdge((prev) =>
        prev?.id === edgeId ? { ...prev, data: { ...prev.data, ...data } as FlowEdgeData } : prev
      );
    },
    [setEdges]
  );

  // Handle drag start from palette
  const onDragStart = useCallback((event: React.DragEvent, block: QuestionBlock) => {
    event.dataTransfer.setData('application/reactflow-block', JSON.stringify(block));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  // Handle drop on canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const blockData = event.dataTransfer.getData('application/reactflow-block');
      if (!blockData || !reactFlowInstance || !reactFlowWrapper.current) return;

      const block: QuestionBlock = JSON.parse(blockData);
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: Node<ReactFlowNodeData> = {
        id: generateId(),
        type: 'block',
        position,
        data: {
          label: block.name,
          blockId: block.id,
          nodeType: 'block',
          block,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes, generateId]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Add special nodes
  const addTerminalNode = useCallback(() => {
    if (!reactFlowInstance) return;
    const newNode: Node<ReactFlowNodeData> = {
      id: generateId(),
      type: 'terminal',
      position: reactFlowInstance.project({ x: 250, y: 400 }),
      data: {
        label: 'Fin',
        nodeType: 'terminal',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [reactFlowInstance, setNodes, generateId]);

  const addRouterNode = useCallback(() => {
    if (!reactFlowInstance) return;
    const newNode: Node<ReactFlowNodeData> = {
      id: generateId(),
      type: 'router',
      position: reactFlowInstance.project({ x: 250, y: 200 }),
      data: {
        label: 'Condition',
        nodeType: 'router',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [reactFlowInstance, setNodes, generateId]);

  // Build schema from current state
  const buildSchema = useCallback((): FlowSchemaJson => {
    const startNode = nodes.find(n => n.type === 'start');
    return {
      rootNodeId: startNode?.id || 'start',
      nodes: nodes.map(fromReactFlowNode),
      edges: edges.map(fromReactFlowEdge),
      meta: {
        version: schema.meta.version + 1,
      },
    };
  }, [nodes, edges, schema.meta.version]);

  // Validate
  const handleValidate = useCallback(() => {
    const currentSchema = buildSchema();
    const errors = validateFlowSchema(currentSchema);
    setValidationErrors(errors);
    return errors;
  }, [buildSchema]);

  // Save
  const handleSave = useCallback(async () => {
    const errors = handleValidate();
    if (errors.some(e => e.type === 'error')) {
      return; // Don't save with blocking errors
    }
    const currentSchema = buildSchema();
    await onSave(currentSchema);
  }, [handleValidate, buildSchema, onSave]);

  // Export
  const handleExport = useCallback(() => {
    const currentSchema = buildSchema();
    const blob = new Blob([JSON.stringify(currentSchema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schemaName || 'flow-schema'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buildSchema, schemaName]);

  // Import
  const handleImport = useCallback((json: FlowSchemaJson) => {
    const newNodes = json.nodes.map(n => toReactFlowNode(n, blocks));
    const newEdges = json.edges.map(toReactFlowEdge);
    setNodes(newNodes);
    setEdges(newEdges);
    setValidationErrors([]);
  }, [blocks, setNodes, setEdges]);

  // Delete selected
  const handleDeleteSelected = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    }
    if (selectedEdge) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  }, [selectedNode, selectedEdge, setNodes, setEdges]);

  return (
    <div className="flex flex-col h-full">
      <FlowToolbar
        onSave={handleSave}
        onPublish={onPublish}
        onValidate={handleValidate}
        onExport={handleExport}
        onImport={handleImport}
        onImportPackage={onImportPackage}
        onAddTerminal={addTerminalNode}
        onAddRouter={addRouterNode}
        onDelete={handleDeleteSelected}
        isSaving={isSaving}
        isPublishing={isPublishing}
        hasSelection={!!(selectedNode || selectedEdge)}
        schemaName={schemaName}
      />
      
      <div className="flex-1 flex gap-2 p-2 min-h-0">
        {/* Left: Blocks Palette */}
        <div className="w-64 flex-shrink-0">
          <FlowBlocksPalette blocks={blocks} onDragStart={onDragStart} />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div 
            ref={reactFlowWrapper}
            className="flex-1 bg-muted/30 rounded-lg border border-border overflow-hidden"
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
            >
              <Background gap={15} size={1} />
              <Controls />
              <MiniMap 
                nodeStrokeWidth={3}
                zoomable
                pannable
              />
            </ReactFlow>
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <FlowValidationPanel 
              errors={validationErrors} 
              onDismiss={() => setValidationErrors([])}
            />
          )}
        </div>

        {/* Right: Properties Panel */}
        <div className="w-72 flex-shrink-0">
          <FlowPropertiesPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            blocks={blocks}
            onNodeChange={onNodeChange}
            onEdgeChange={onEdgeChange}
          />
        </div>
      </div>
    </div>
  );
}

export function FlowBuilder(props: FlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <FlowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}

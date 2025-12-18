import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Play, 
  Square, 
  GitBranch,
  FileText,
  Ruler,
  Type,
  HelpCircle,
  Camera,
  PenTool,
  List,
  Hash,
  Calendar,
  ExternalLink,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactFlowNodeData } from '@/lib/flow/flowTypes';

const ICON_MAP: Record<string, LucideIcon> = {
  Ruler,
  Type,
  HelpCircle,
  Camera,
  PenTool,
  FileText,
  List,
  Hash,
  Calendar,
};

// Start Node
export const StartNode = memo(({ data, selected }: NodeProps<ReactFlowNodeData>) => {
  return (
    <div
      className={cn(
        'px-4 py-2 rounded-full bg-green-500 text-white flex items-center gap-2 shadow-md',
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <Play className="h-4 w-4" />
      <span className="font-medium text-sm">{data.label || 'Début'}</span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-700 !w-3 !h-3"
      />
    </div>
  );
});
StartNode.displayName = 'StartNode';

// Terminal Node
export const TerminalNode = memo(({ data, selected }: NodeProps<ReactFlowNodeData>) => {
  return (
    <div
      className={cn(
        'px-4 py-2 rounded-full bg-red-500 text-white flex items-center gap-2 shadow-md',
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-red-700 !w-3 !h-3"
      />
      <Square className="h-4 w-4" />
      <span className="font-medium text-sm">{data.label || 'Fin'}</span>
    </div>
  );
});
TerminalNode.displayName = 'TerminalNode';

// Router Node
export const RouterNode = memo(({ data, selected }: NodeProps<ReactFlowNodeData>) => {
  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg bg-amber-500 text-white flex items-center gap-2 shadow-md min-w-[120px]',
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-700 !w-3 !h-3"
      />
      <GitBranch className="h-4 w-4 flex-shrink-0" />
      <span className="font-medium text-sm">{data.label || 'Routeur'}</span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-amber-700 !w-3 !h-3"
      />
    </div>
  );
});
RouterNode.displayName = 'RouterNode';

// Block Node
export const BlockNode = memo(({ data, selected }: NodeProps<ReactFlowNodeData>) => {
  const IconComponent = data.block?.icon ? ICON_MAP[data.block.icon] : FileText;
  
  return (
    <div
      className={cn(
        'min-w-[180px] rounded-lg border-2 bg-card shadow-md overflow-hidden',
        selected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-border'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-primary !w-3 !h-3"
      />
      
      <div className="px-3 py-2 bg-muted border-b border-border flex items-center gap-2">
        {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
        <span className="font-medium text-sm truncate">
          {data.label || data.block?.name || 'Bloc'}
        </span>
      </div>
      
      <div className="px-3 py-2 text-xs text-muted-foreground">
        {data.contextKey && (
          <div className="mb-1">
            <span className="text-foreground font-medium">Contexte:</span> {data.contextKey}
          </div>
        )}
        {data.block && (
          <div>
            <span className="text-foreground font-medium">Type:</span> {data.block.name}
          </div>
        )}
        {!data.block && data.blockId && (
          <div className="text-amber-600">
            Bloc manquant: {data.blockId}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !w-3 !h-3"
      />
    </div>
  );
});
BlockNode.displayName = 'BlockNode';

// Jump Node (navigate to another schema)
export const JumpNode = memo(({ data, selected }: NodeProps<ReactFlowNodeData>) => {
  return (
    <div
      className={cn(
        'min-w-[140px] rounded-lg border-2 bg-card shadow-md overflow-hidden',
        selected ? 'border-purple-500 ring-2 ring-purple-500 ring-offset-2' : 'border-purple-300'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-500 !w-3 !h-3"
      />
      
      <div className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 border-b border-purple-200 flex items-center gap-2">
        <ExternalLink className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="font-medium text-sm text-purple-700 dark:text-purple-300 truncate">
          {data.label || 'Jump'}
        </span>
      </div>
      
      {data.targetSchemaId && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          <span className="text-purple-600 dark:text-purple-400">→</span> {data.targetSchemaId}
        </div>
      )}
    </div>
  );
});
JumpNode.displayName = 'JumpNode';

// Node types export for React Flow
export const nodeTypes = {
  start: StartNode,
  terminal: TerminalNode,
  router: RouterNode,
  block: BlockNode,
  jump: JumpNode,
};

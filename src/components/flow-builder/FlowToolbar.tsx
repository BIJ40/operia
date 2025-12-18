import { useRef } from 'react';
import { 
  Save, 
  Upload, 
  Download, 
  Plus, 
  Square, 
  GitBranch, 
  Trash2,
  CheckCircle,
  Rocket,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { FlowSchemaJson, FlowValidationError } from '@/lib/flow/flowTypes';

interface FlowToolbarProps {
  onSave: () => Promise<void>;
  onPublish: () => Promise<void>;
  onValidate: () => FlowValidationError[];
  onExport: () => void;
  onImport: (json: FlowSchemaJson) => void;
  onAddTerminal: () => void;
  onAddRouter: () => void;
  onDelete: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
  hasSelection?: boolean;
  schemaName?: string;
}

export function FlowToolbar({
  onSave,
  onPublish,
  onValidate,
  onExport,
  onImport,
  onAddTerminal,
  onAddRouter,
  onDelete,
  isSaving,
  isPublishing,
  hasSelection,
  schemaName,
}: FlowToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Check if it's a package format (with schemas array)
        if (json.schemas && Array.isArray(json.schemas)) {
          // It's a package - extract the first schema
          const firstSchema = json.schemas[0];
          if (!firstSchema) {
            toast.error('Aucun schéma trouvé dans le package');
            return;
          }
          
          // Convert package schema format to FlowSchemaJson
          const converted: FlowSchemaJson = {
            rootNodeId: firstSchema.rootNodeId || 'start',
            nodes: (firstSchema.nodes || []).map((node: any) => {
              const baseNode = {
                id: node.id,
                type: node.type as any,
                blockId: node.data?.blockId,
                position: node.position || { x: 0, y: 0 },
                data: {
                  label: node.data?.label || node.id,
                  contextKey: node.data?.answer?.key,
                  overrides: node.data?.overrides,
                  targetSchemaId: node.data?.targetSchemaId, // for jump nodes
                },
              };
              return baseNode;
            }),
            edges: (firstSchema.edges || []).map((edge: any) => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle,
              targetHandle: edge.targetHandle,
              data: {
                label: edge.data?.label || '',
                when: edge.data?.when ? {
                  field: edge.data.when.left?.answer,
                  operator: edge.data.when.op === 'eq' ? 'eq' : edge.data.when.op,
                  value: edge.data.when.right,
                } : null,
                priority: edge.data?.priority || 0,
                isDefault: !edge.data?.when,
              },
            })),
            meta: {
              version: firstSchema.meta?.version || 1,
            },
          };
          
          onImport(converted);
          toast.success(`Package importé: "${json.packageName || 'Sans nom'}" (${json.schemas.length} schéma(s))`);
          return;
        }
        
        // Check if it's already a valid FlowSchemaJson
        if (json.rootNodeId && json.nodes && json.edges) {
          onImport(json);
          toast.success('Schéma importé avec succès');
          return;
        }
        
        // Unknown format
        toast.error('Format JSON non reconnu. Attendu: FlowSchemaJson ou Package avec "schemas"');
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Fichier JSON invalide');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    e.target.value = '';
  };

  const handleValidate = () => {
    const errors = onValidate();
    const errorCount = errors.filter(e => e.type === 'error').length;
    const warningCount = errors.filter(e => e.type === 'warning').length;

    if (errorCount === 0 && warningCount === 0) {
      toast.success('Schéma valide !');
    } else if (errorCount === 0) {
      toast.warning(`${warningCount} avertissement(s)`);
    } else {
      toast.error(`${errorCount} erreur(s), ${warningCount} avertissement(s)`);
    }
  };

  const handleSave = async () => {
    try {
      await onSave();
      toast.success('Schéma sauvegardé');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handlePublish = async () => {
    const errors = onValidate();
    if (errors.some(e => e.type === 'error')) {
      toast.error('Corrigez les erreurs avant de publier');
      return;
    }
    try {
      await onPublish();
      toast.success('Schéma publié');
    } catch (error) {
      toast.error('Erreur lors de la publication');
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b border-border bg-card">
      {schemaName && (
        <>
          <span className="font-medium text-sm px-2">{schemaName}</span>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* Add nodes */}
      <Button variant="outline" size="sm" onClick={onAddRouter}>
        <GitBranch className="h-4 w-4 mr-1" />
        Routeur
      </Button>
      <Button variant="outline" size="sm" onClick={onAddTerminal}>
        <Square className="h-4 w-4 mr-1" />
        Fin
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Delete */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onDelete}
        disabled={!hasSelection}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Supprimer
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Validate */}
      <Button variant="outline" size="sm" onClick={handleValidate}>
        <CheckCircle className="h-4 w-4 mr-1" />
        Valider
      </Button>

      {/* Import / Export */}
      <Button variant="outline" size="sm" onClick={handleImportClick}>
        <Upload className="h-4 w-4 mr-1" />
        Importer
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button variant="outline" size="sm" onClick={onExport}>
        <Download className="h-4 w-4 mr-1" />
        Exporter
      </Button>

      <div className="flex-1" />

      {/* Save & Publish */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleSave}
        disabled={isSaving}
      >
        <Save className="h-4 w-4 mr-1" />
        {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
      </Button>
      <Button 
        size="sm" 
        onClick={handlePublish}
        disabled={isPublishing}
      >
        <Rocket className="h-4 w-4 mr-1" />
        {isPublishing ? 'Publication...' : 'Publier'}
      </Button>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Node, Edge } from 'reactflow';
import type { ReactFlowNodeData, FlowEdgeData, QuestionBlock } from '@/lib/flow/flowTypes';

interface FlowPropertiesPanelProps {
  selectedNode: Node<ReactFlowNodeData> | null;
  selectedEdge: Edge<FlowEdgeData> | null;
  blocks: QuestionBlock[];
  onNodeChange: (nodeId: string, data: Partial<ReactFlowNodeData>) => void;
  onEdgeChange: (edgeId: string, data: Partial<FlowEdgeData>) => void;
}

export function FlowPropertiesPanel({
  selectedNode,
  selectedEdge,
  blocks,
  onNodeChange,
  onEdgeChange,
}: FlowPropertiesPanelProps) {
  if (!selectedNode && !selectedEdge) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Propriétés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            Sélectionnez un nœud ou un lien pour voir ses propriétés
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedNode) {
    const block = blocks.find(b => b.id === selectedNode.data.blockId);
    
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Nœud: {selectedNode.data.label || selectedNode.id}
            <Badge variant="outline">{selectedNode.data.nodeType}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="node-label">Libellé</Label>
                <Input
                  id="node-label"
                  value={selectedNode.data.label || ''}
                  onChange={(e) => onNodeChange(selectedNode.id, { label: e.target.value })}
                  placeholder="Libellé du nœud"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="node-context">Clé de contexte</Label>
                <Input
                  id="node-context"
                  value={selectedNode.data.contextKey || ''}
                  onChange={(e) => onNodeChange(selectedNode.id, { contextKey: e.target.value })}
                  placeholder="ex: vitrage, mur, menuiserie..."
                />
                <p className="text-xs text-muted-foreground">
                  Identifie le contexte métier de ce nœud
                </p>
              </div>

              {block && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Bloc associé</Label>
                    <div className="p-2 rounded-md bg-muted">
                      <div className="font-medium text-sm">{block.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {block.schema.fields?.length || 0} champ(s)
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Champs du bloc</Label>
                    <div className="space-y-1">
                      {block.schema.fields?.map(field => (
                        <div
                          key={field.key}
                          className="text-xs p-2 rounded border border-border"
                        >
                          <div className="font-medium">{field.label}</div>
                          <div className="text-muted-foreground">
                            Type: {field.type}
                            {field.required && ' • Requis'}
                            {field.unit && ` • Unité: ${field.unit}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Surcharges</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="override-required" className="text-sm">Requis</Label>
                    <Switch
                      id="override-required"
                      checked={selectedNode.data.overrides?.required ?? true}
                      onCheckedChange={(checked) => 
                        onNodeChange(selectedNode.id, {
                          overrides: {
                            ...selectedNode.data.overrides,
                            required: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="override-unit" className="text-sm">Unité</Label>
                    <Input
                      id="override-unit"
                      value={selectedNode.data.overrides?.unit || ''}
                      onChange={(e) => 
                        onNodeChange(selectedNode.id, {
                          overrides: {
                            ...selectedNode.data.overrides,
                            unit: e.target.value || undefined,
                          },
                        })
                      }
                      placeholder="Laisser vide pour défaut"
                    />
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground pt-4">
                ID: {selectedNode.id}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  if (selectedEdge) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Lien: {selectedEdge.source} → {selectedEdge.target}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edge-label">Libellé</Label>
                <Input
                  id="edge-label"
                  value={selectedEdge.data?.label || ''}
                  onChange={(e) => onEdgeChange(selectedEdge.id, { label: e.target.value })}
                  placeholder="ex: Oui, Non, Suivant..."
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="edge-default">Lien par défaut</Label>
                <Switch
                  id="edge-default"
                  checked={selectedEdge.data?.isDefault ?? false}
                  onCheckedChange={(checked) => 
                    onEdgeChange(selectedEdge.id, { isDefault: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edge-priority">Priorité</Label>
                <Input
                  id="edge-priority"
                  type="number"
                  value={selectedEdge.data?.priority ?? 0}
                  onChange={(e) => 
                    onEdgeChange(selectedEdge.id, { priority: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Plus la valeur est élevée, plus le lien est prioritaire
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="edge-condition">Condition (JSON)</Label>
                <Textarea
                  id="edge-condition"
                  value={selectedEdge.data?.when ? JSON.stringify(selectedEdge.data.when, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const when = e.target.value ? JSON.parse(e.target.value) : null;
                      onEdgeChange(selectedEdge.id, { when });
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder='{"field": "answer", "operator": "eq", "value": true}'
                  rows={4}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Condition pour emprunter ce lien
                </p>
              </div>

              <div className="text-xs text-muted-foreground pt-4">
                ID: {selectedEdge.id}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return null;
}

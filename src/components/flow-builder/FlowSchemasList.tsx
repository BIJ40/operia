import { useState } from 'react';
import { Plus, FileText, Check, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FlowSchema, FlowDomain } from '@/lib/flow/flowTypes';
import { FLOW_DOMAINS } from '@/lib/flow/flowTypes';
import { cn } from '@/lib/utils';

interface FlowSchemasListProps {
  schemas: FlowSchema[];
  selectedSchemaId?: string;
  onSelect: (schema: FlowSchema) => void;
  onCreate: (name: string, domain: FlowDomain, description?: string) => Promise<void>;
  onDelete: (schema: FlowSchema) => Promise<void>;
  isCreating?: boolean;
}

export function FlowSchemasList({
  schemas,
  selectedSchemaId,
  onSelect,
  onCreate,
  onDelete,
  isCreating,
}: FlowSchemasListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [newSchemaDomain, setNewSchemaDomain] = useState<FlowDomain>('rt');
  const [newSchemaDescription, setNewSchemaDescription] = useState('');

  const handleCreate = async () => {
    if (!newSchemaName.trim()) return;
    await onCreate(newSchemaName, newSchemaDomain, newSchemaDescription || undefined);
    setShowCreateDialog(false);
    setNewSchemaName('');
    setNewSchemaDescription('');
  };

  const handleDelete = async (schema: FlowSchema, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Supprimer le schéma "${schema.name}" ?`)) {
      await onDelete(schema);
    }
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Schémas</CardTitle>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nouveau
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-2">
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {schemas.map((schema) => {
                const domain = FLOW_DOMAINS.find(d => d.value === schema.domain);
                return (
                  <div
                    key={schema.id}
                    onClick={() => onSelect(schema)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors group',
                      selectedSchemaId === schema.id
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-muted border border-transparent'
                    )}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{schema.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {domain?.label || schema.domain}
                        </Badge>
                        <span>
                          {formatDistanceToNow(new Date(schema.updated_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => handleDelete(schema, e as unknown as React.MouseEvent)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}

              {schemas.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Aucun schéma. Créez-en un !
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau schéma</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="schema-name">Nom</Label>
              <Input
                id="schema-name"
                value={newSchemaName}
                onChange={(e) => setNewSchemaName(e.target.value)}
                placeholder="Ex: RT Vitrage simple"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schema-domain">Domaine</Label>
              <Select
                value={newSchemaDomain}
                onValueChange={(v) => setNewSchemaDomain(v as FlowDomain)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLOW_DOMAINS.map((domain) => (
                    <SelectItem key={domain.value} value={domain.value}>
                      {domain.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schema-description">Description (optionnel)</Label>
              <Textarea
                id="schema-description"
                value={newSchemaDescription}
                onChange={(e) => setNewSchemaDescription(e.target.value)}
                placeholder="Description du schéma..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={!newSchemaName.trim() || isCreating}>
              {isCreating ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Dialog de configuration admin pour les tickets Apogée
 * Permet de gérer les statuts Kanban, modules, priorités et tags
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, Save, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import type { ApogeeTicketStatus, ApogeeModule, ApogeePriority, ApogeeImpactTag } from '../types';

interface ActionsConfigDialogProps {
  open: boolean;
  onClose: () => void;
  statuses: ApogeeTicketStatus[];
  modules: ApogeeModule[];
  priorities: ApogeePriority[];
}

export function ActionsConfigDialog({
  open,
  onClose,
  statuses,
  modules,
  priorities,
}: ActionsConfigDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('statuses');

  // Fetch tags
  const { data: tags = [] } = useQuery({
    queryKey: ['apogee-impact-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_impact_tags')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as ApogeeImpactTag[];
    },
  });

  // Local state for editing
  const [editedStatuses, setEditedStatuses] = useState<ApogeeTicketStatus[]>([]);
  const [editedModules, setEditedModules] = useState<ApogeeModule[]>([]);
  const [editedPriorities, setEditedPriorities] = useState<ApogeePriority[]>([]);
  const [editedTags, setEditedTags] = useState<ApogeeImpactTag[]>([]);

  // Initialize on open
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setEditedStatuses([...statuses]);
      setEditedModules([...modules]);
      setEditedPriorities([...priorities]);
      setEditedTags([...tags]);
    }
    if (!isOpen) onClose();
  };

  // Update tags when fetched
  useEffect(() => {
    if (open && tags.length > 0) {
      setEditedTags([...tags]);
    }
  }, [tags, open]);

  // Save handlers
  const saveStatuses = async () => {
    try {
      const existingIds = statuses.map(s => s.id);
      const currentIds = editedStatuses.map(s => s.id);
      const toDelete = existingIds.filter(id => !currentIds.includes(id));
      
      if (toDelete.length > 0) {
        await supabase.from('apogee_ticket_statuses').delete().in('id', toDelete);
      }

      for (const status of editedStatuses) {
        await supabase.from('apogee_ticket_statuses').upsert({
          id: status.id,
          label: status.label,
          display_order: status.display_order,
          is_final: status.is_final,
          color: status.color,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['apogee-ticket-statuses'] });
      toast.success('Statuts sauvegardés');
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const saveModules = async () => {
    try {
      const existingIds = modules.map(m => m.id);
      const currentIds = editedModules.map(m => m.id);
      const toDelete = existingIds.filter(id => !currentIds.includes(id));
      
      if (toDelete.length > 0) {
        await supabase.from('apogee_modules').delete().in('id', toDelete);
      }

      for (const mod of editedModules) {
        await supabase.from('apogee_modules').upsert({
          id: mod.id,
          label: mod.label,
          display_order: mod.display_order,
          color: mod.color,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['apogee-modules'] });
      toast.success('Modules sauvegardés');
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const savePriorities = async () => {
    try {
      const existingIds = priorities.map(p => p.id);
      const currentIds = editedPriorities.map(p => p.id);
      const toDelete = existingIds.filter(id => !currentIds.includes(id));
      
      if (toDelete.length > 0) {
        await supabase.from('apogee_priorities').delete().in('id', toDelete);
      }

      for (const prio of editedPriorities) {
        await supabase.from('apogee_priorities').upsert({
          id: prio.id,
          label: prio.label,
          display_order: prio.display_order,
          color: prio.color,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['apogee-priorities'] });
      toast.success('Priorités sauvegardées');
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const saveTags = async () => {
    try {
      const existingIds = tags.map(t => t.id);
      const currentIds = editedTags.map(t => t.id);
      const toDelete = existingIds.filter(id => !currentIds.includes(id));
      
      if (toDelete.length > 0) {
        await supabase.from('apogee_impact_tags').delete().in('id', toDelete);
      }

      for (let i = 0; i < editedTags.length; i++) {
        const tag = editedTags[i];
        await supabase.from('apogee_impact_tags').upsert({
          id: tag.id,
          label: tag.label,
          display_order: i,
          color: tag.color,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['apogee-impact-tags'] });
      toast.success('Tags sauvegardés');
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  // Add new item
  const addStatus = () => {
    const newId = `STATUS_${Date.now()}`;
    setEditedStatuses([...editedStatuses, {
      id: newId,
      label: 'Nouveau statut',
      display_order: editedStatuses.length,
      is_final: false,
      color: 'gray',
      created_at: new Date().toISOString(),
    }]);
  };

  const addModule = () => {
    const newId = `MOD_${Date.now()}`;
    setEditedModules([...editedModules, {
      id: newId,
      label: 'Nouveau module',
      display_order: editedModules.length,
      color: 'blue',
      created_at: new Date().toISOString(),
    }]);
  };

  const addPriority = () => {
    const newId = `PRIO_${Date.now()}`;
    setEditedPriorities([...editedPriorities, {
      id: newId,
      label: 'Nouvelle priorité',
      display_order: editedPriorities.length,
      color: 'gray',
      created_at: new Date().toISOString(),
    }]);
  };

  const addTag = () => {
    const newId = `tag_${Date.now()}`;
    setEditedTags([...editedTags, {
      id: newId,
      label: 'Nouveau tag',
      display_order: editedTags.length,
      color: 'gray',
      created_at: new Date().toISOString(),
    }]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Configuration Tickets Apogée</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="statuses">Statuts</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="priorities">Priorités</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            {/* Statuts Kanban */}
            <TabsContent value="statuses" className="space-y-4">
              {editedStatuses.map((status, idx) => (
                <Card key={status.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          value={status.id}
                          onChange={(e) => {
                            const updated = [...editedStatuses];
                            updated[idx] = { ...status, id: e.target.value.toUpperCase().replace(/\s/g, '_') };
                            setEditedStatuses(updated);
                          }}
                          placeholder="ID (ex: BACKLOG)"
                          className="text-xs"
                        />
                        <Input
                          value={status.label}
                          onChange={(e) => {
                            const updated = [...editedStatuses];
                            updated[idx] = { ...status, label: e.target.value };
                            setEditedStatuses(updated);
                          }}
                          placeholder="Libellé"
                        />
                        <Input
                          value={status.color}
                          onChange={(e) => {
                            const updated = [...editedStatuses];
                            updated[idx] = { ...status, color: e.target.value };
                            setEditedStatuses(updated);
                          }}
                          placeholder="Couleur (gray, blue...)"
                          className="text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Final</Label>
                        <Switch
                          checked={status.is_final}
                          onCheckedChange={(checked) => {
                            const updated = [...editedStatuses];
                            updated[idx] = { ...status, is_final: checked };
                            setEditedStatuses(updated);
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditedStatuses(editedStatuses.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" onClick={addStatus}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un statut
                </Button>
                <Button onClick={saveStatuses}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </TabsContent>

            {/* Modules */}
            <TabsContent value="modules" className="space-y-4">
              {editedModules.map((mod, idx) => (
                <Card key={mod.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          value={mod.id}
                          onChange={(e) => {
                            const updated = [...editedModules];
                            updated[idx] = { ...mod, id: e.target.value.toUpperCase().replace(/\s/g, '_') };
                            setEditedModules(updated);
                          }}
                          placeholder="ID (ex: RDV)"
                          className="text-xs"
                        />
                        <Input
                          value={mod.label}
                          onChange={(e) => {
                            const updated = [...editedModules];
                            updated[idx] = { ...mod, label: e.target.value };
                            setEditedModules(updated);
                          }}
                          placeholder="Libellé"
                        />
                        <Input
                          value={mod.color}
                          onChange={(e) => {
                            const updated = [...editedModules];
                            updated[idx] = { ...mod, color: e.target.value };
                            setEditedModules(updated);
                          }}
                          placeholder="Couleur"
                          className="text-xs"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditedModules(editedModules.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" onClick={addModule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un module
                </Button>
                <Button onClick={saveModules}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </TabsContent>

            {/* Priorités */}
            <TabsContent value="priorities" className="space-y-4">
              {editedPriorities.map((prio, idx) => (
                <Card key={prio.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          value={prio.id}
                          onChange={(e) => {
                            const updated = [...editedPriorities];
                            updated[idx] = { ...prio, id: e.target.value.toUpperCase().replace(/\s/g, '_') };
                            setEditedPriorities(updated);
                          }}
                          placeholder="ID (ex: A)"
                          className="text-xs"
                        />
                        <Input
                          value={prio.label}
                          onChange={(e) => {
                            const updated = [...editedPriorities];
                            updated[idx] = { ...prio, label: e.target.value };
                            setEditedPriorities(updated);
                          }}
                          placeholder="Libellé"
                        />
                        <Input
                          value={prio.color}
                          onChange={(e) => {
                            const updated = [...editedPriorities];
                            updated[idx] = { ...prio, color: e.target.value };
                            setEditedPriorities(updated);
                          }}
                          placeholder="Couleur"
                          className="text-xs"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditedPriorities(editedPriorities.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" onClick={addPriority}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une priorité
                </Button>
                <Button onClick={savePriorities}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </TabsContent>

            {/* Tags */}
            <TabsContent value="tags" className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">
                Tags d'impact utilisés pour catégoriser les tickets (ex: Performance, UX, Sécurité...)
              </p>
              {editedTags.map((tag, idx) => (
                <Card key={tag.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          value={tag.id}
                          onChange={(e) => {
                            const updated = [...editedTags];
                            updated[idx] = { ...tag, id: e.target.value.toLowerCase().replace(/\s/g, '_') };
                            setEditedTags(updated);
                          }}
                          placeholder="ID (ex: perf)"
                          className="text-xs"
                        />
                        <Input
                          value={tag.label}
                          onChange={(e) => {
                            const updated = [...editedTags];
                            updated[idx] = { ...tag, label: e.target.value };
                            setEditedTags(updated);
                          }}
                          placeholder="Libellé"
                        />
                        <Input
                          value={tag.color}
                          onChange={(e) => {
                            const updated = [...editedTags];
                            updated[idx] = { ...tag, color: e.target.value };
                            setEditedTags(updated);
                          }}
                          placeholder="Couleur"
                          className="text-xs"
                        />
                      </div>
                      <Badge 
                        style={{ backgroundColor: `var(--${tag.color || 'gray'}-500, gray)` }}
                        className="text-white text-xs"
                      >
                        {tag.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditedTags(editedTags.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" onClick={addTag}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un tag
                </Button>
                <Button onClick={saveTags}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

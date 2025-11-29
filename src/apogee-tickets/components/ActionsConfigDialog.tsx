/**
 * Dialog de configuration admin pour les tickets Apogée
 * Interface améliorée avec color pickers et previews + drag-and-drop
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  Tag, 
  Palette, 
  CheckCircle2,
  LayoutGrid,
  Layers,
  Thermometer,
  AlertCircle,
  Loader2,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import type { ApogeeTicketStatus, ApogeeModule, ApogeePriority, ApogeeImpactTag, ApogeeOwnerSide } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ActionsConfigDialogProps {
  open: boolean;
  onClose: () => void;
}

// Palette de couleurs prédéfinies
const COLOR_PALETTE = [
  { name: 'gray', hex: '#6b7280', label: 'Gris' },
  { name: 'red', hex: '#ef4444', label: 'Rouge' },
  { name: 'orange', hex: '#f97316', label: 'Orange' },
  { name: 'amber', hex: '#f59e0b', label: 'Ambre' },
  { name: 'yellow', hex: '#eab308', label: 'Jaune' },
  { name: 'lime', hex: '#84cc16', label: 'Lime' },
  { name: 'green', hex: '#22c55e', label: 'Vert' },
  { name: 'emerald', hex: '#10b981', label: 'Émeraude' },
  { name: 'teal', hex: '#14b8a6', label: 'Turquoise' },
  { name: 'cyan', hex: '#06b6d4', label: 'Cyan' },
  { name: 'sky', hex: '#0ea5e9', label: 'Ciel' },
  { name: 'blue', hex: '#3b82f6', label: 'Bleu' },
  { name: 'indigo', hex: '#6366f1', label: 'Indigo' },
  { name: 'violet', hex: '#8b5cf6', label: 'Violet' },
  { name: 'purple', hex: '#a855f7', label: 'Violet foncé' },
  { name: 'fuchsia', hex: '#d946ef', label: 'Fuchsia' },
  { name: 'pink', hex: '#ec4899', label: 'Rose' },
  { name: 'rose', hex: '#f43f5e', label: 'Rose foncé' },
];

// Color picker component
function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const selectedColor = COLOR_PALETTE.find(c => c.name === value) || COLOR_PALETTE[0];
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 w-full justify-start gap-2"
        >
          <div 
            className="w-4 h-4 rounded-full border" 
            style={{ backgroundColor: selectedColor.hex }}
          />
          <span className="text-xs truncate">{selectedColor.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="grid grid-cols-6 gap-1">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color.name}
              className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${
                value === color.name ? 'border-foreground ring-2 ring-offset-2 ring-primary' : 'border-transparent'
              }`}
              style={{ backgroundColor: color.hex }}
              onClick={() => onChange(color.name)}
              title={color.label}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Badge preview with color
function BadgePreview({ label, color }: { label: string; color: string }) {
  const colorObj = COLOR_PALETTE.find(c => c.name === color);
  return (
    <Badge 
      style={{ backgroundColor: colorObj?.hex || '#6b7280' }}
      className="text-white text-xs"
    >
      {label || 'Aperçu'}
    </Badge>
  );
}

// Sortable item wrapper
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className={`overflow-hidden ${isDragging ? 'ring-2 ring-primary' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <button
              {...listeners}
              className="touch-none cursor-grab active:cursor-grabbing shrink-0 p-1 hover:bg-muted rounded"
              type="button"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            {children}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ActionsConfigDialog({
  open,
  onClose,
}: ActionsConfigDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('statuses');

  // Fetch statuses directly
  const { data: statuses = [], isLoading: loadingStatuses } = useQuery({
    queryKey: ['apogee-ticket-statuses-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_ticket_statuses')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as ApogeeTicketStatus[];
    },
    enabled: open,
  });

  // Fetch modules directly
  const { data: modules = [], isLoading: loadingModules } = useQuery({
    queryKey: ['apogee-modules-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_modules')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as ApogeeModule[];
    },
    enabled: open,
  });

  // Fetch priorities directly
  const { data: priorities = [], isLoading: loadingPriorities } = useQuery({
    queryKey: ['apogee-priorities-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_priorities')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as ApogeePriority[];
    },
    enabled: open,
  });

  // Fetch tags
  const { data: tags = [], isLoading: loadingTags } = useQuery({
    queryKey: ['apogee-impact-tags-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_impact_tags')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as ApogeeImpactTag[];
    },
    enabled: open,
  });

  // Fetch owner sides
  const { data: ownerSides = [], isLoading: loadingOwnerSides } = useQuery({
    queryKey: ['apogee-owner-sides-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_owner_sides')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as ApogeeOwnerSide[];
    },
    enabled: open,
  });

  // Local state for editing
  const [editedStatuses, setEditedStatuses] = useState<ApogeeTicketStatus[]>([]);
  const [editedModules, setEditedModules] = useState<ApogeeModule[]>([]);
  const [editedPriorities, setEditedPriorities] = useState<ApogeePriority[]>([]);
  const [editedTags, setEditedTags] = useState<ApogeeImpactTag[]>([]);
  const [editedOwnerSides, setEditedOwnerSides] = useState<ApogeeOwnerSide[]>([]);

  // Sync when data is loaded
  useEffect(() => {
    if (statuses.length > 0) setEditedStatuses([...statuses]);
  }, [statuses]);

  useEffect(() => {
    if (modules.length > 0) setEditedModules([...modules]);
  }, [modules]);

  useEffect(() => {
    if (priorities.length > 0) setEditedPriorities([...priorities]);
  }, [priorities]);

  useEffect(() => {
    if (tags.length > 0) setEditedTags([...tags]);
  }, [tags]);

  useEffect(() => {
    if (ownerSides.length > 0) setEditedOwnerSides([...ownerSides]);
  }, [ownerSides]);

  const isLoading = loadingStatuses || loadingModules || loadingPriorities || loadingTags || loadingOwnerSides;

  // DnD sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag handlers for each list
  const handleStatusDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = editedStatuses.findIndex((s) => s.id === active.id);
      const newIndex = editedStatuses.findIndex((s) => s.id === over.id);
      setEditedStatuses(arrayMove(editedStatuses, oldIndex, newIndex));
    }
  };

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = editedModules.findIndex((m) => m.id === active.id);
      const newIndex = editedModules.findIndex((m) => m.id === over.id);
      setEditedModules(arrayMove(editedModules, oldIndex, newIndex));
    }
  };

  const handlePriorityDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = editedPriorities.findIndex((p) => p.id === active.id);
      const newIndex = editedPriorities.findIndex((p) => p.id === over.id);
      setEditedPriorities(arrayMove(editedPriorities, oldIndex, newIndex));
    }
  };

  const handleTagDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = editedTags.findIndex((t) => t.id === active.id);
      const newIndex = editedTags.findIndex((t) => t.id === over.id);
      setEditedTags(arrayMove(editedTags, oldIndex, newIndex));
    }
  };

  const handleOwnerDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = editedOwnerSides.findIndex((o) => o.id === active.id);
      const newIndex = editedOwnerSides.findIndex((o) => o.id === over.id);
      setEditedOwnerSides(arrayMove(editedOwnerSides, oldIndex, newIndex));
    }
  };

  // Save handlers
  const saveStatuses = async () => {
    try {
      const existingIds = statuses.map(s => s.id);
      const currentIds = editedStatuses.map(s => s.id);
      const toDelete = existingIds.filter(id => !currentIds.includes(id));
      
      if (toDelete.length > 0) {
        await supabase.from('apogee_ticket_statuses').delete().in('id', toDelete);
      }

      for (let i = 0; i < editedStatuses.length; i++) {
        const status = editedStatuses[i];
        await supabase.from('apogee_ticket_statuses').upsert({
          id: status.id,
          label: status.label,
          display_order: i,
          is_final: status.is_final,
          color: status.color,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['apogee-ticket-statuses'] });
      toast.success('Statuts Kanban sauvegardés');
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

      for (let i = 0; i < editedModules.length; i++) {
        const mod = editedModules[i];
        await supabase.from('apogee_modules').upsert({
          id: mod.id,
          label: mod.label,
          display_order: i,
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

      for (let i = 0; i < editedPriorities.length; i++) {
        const prio = editedPriorities[i];
        await supabase.from('apogee_priorities').upsert({
          id: prio.id,
          label: prio.label,
          display_order: i,
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

  const saveOwnerSides = async () => {
    try {
      const existingIds = ownerSides.map(o => o.id);
      const currentIds = editedOwnerSides.map(o => o.id);
      const toDelete = existingIds.filter(id => !currentIds.includes(id));
      
      if (toDelete.length > 0) {
        await supabase.from('apogee_owner_sides').delete().in('id', toDelete);
      }

      for (let i = 0; i < editedOwnerSides.length; i++) {
        const owner = editedOwnerSides[i];
        await supabase.from('apogee_owner_sides').upsert({
          id: owner.id,
          label: owner.label,
          display_order: i,
          color: owner.color,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['apogee-owner-sides'] });
      toast.success('Porteurs sauvegardés');
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

  const addOwnerSide = () => {
    const newId = `OWNER_${Date.now()}`;
    setEditedOwnerSides([...editedOwnerSides, {
      id: newId,
      label: 'Nouveau porteur',
      display_order: editedOwnerSides.length,
      color: 'gray',
      created_at: new Date().toISOString(),
    }]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Configuration Tickets Apogée
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="mx-6 grid w-auto grid-cols-5">
            <TabsTrigger value="statuses" className="flex items-center gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Statuts ({editedStatuses.length})</span>
              <span className="sm:hidden">Statuts</span>
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Modules ({editedModules.length})
            </TabsTrigger>
            <TabsTrigger value="owners" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Porteurs ({editedOwnerSides.length})
            </TabsTrigger>
            <TabsTrigger value="priorities" className="flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5" />
              Priorités
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Tags ({editedTags.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(85vh-180px)]">
            {/* Statuts Kanban */}
            <TabsContent value="statuses" className="px-6 pb-6 space-y-4 mt-4">
              <Card className="bg-muted/30">
                <CardHeader className="py-3">
                  <CardDescription className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Les statuts définissent les colonnes du Kanban. L'ordre définit l'affichage de gauche à droite. Glissez pour réordonner.
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleStatusDragEnd}
              >
                <SortableContext
                  items={editedStatuses.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {editedStatuses.map((status, idx) => (
                      <SortableItem key={status.id} id={status.id}>
                        <span className="text-xs text-muted-foreground w-6">{idx + 1}</span>
                        
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">ID technique</Label>
                            <Input
                              value={status.id}
                              onChange={(e) => {
                                const updated = [...editedStatuses];
                                updated[idx] = { ...status, id: e.target.value.toUpperCase().replace(/\s/g, '_') };
                                setEditedStatuses(updated);
                              }}
                              placeholder="BACKLOG"
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Libellé affiché</Label>
                            <Input
                              value={status.label}
                              onChange={(e) => {
                                const updated = [...editedStatuses];
                                updated[idx] = { ...status, label: e.target.value };
                                setEditedStatuses(updated);
                              }}
                              placeholder="Backlog"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Couleur</Label>
                            <ColorPicker
                              value={status.color}
                              onChange={(color) => {
                                const updated = [...editedStatuses];
                                updated[idx] = { ...status, color };
                                setEditedStatuses(updated);
                              }}
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground">Aperçu</Label>
                              <div className="h-9 flex items-center">
                                <BadgePreview label={status.label} color={status.color} />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pb-1">
                              <Switch
                                checked={status.is_final}
                                onCheckedChange={(checked) => {
                                  const updated = [...editedStatuses];
                                  updated[idx] = { ...status, is_final: checked };
                                  setEditedStatuses(updated);
                                }}
                              />
                              <Label className="text-xs whitespace-nowrap">Final</Label>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => setEditedStatuses(editedStatuses.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={addStatus}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un statut
                </Button>
                <Button onClick={saveStatuses}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder les statuts
                </Button>
              </div>
            </TabsContent>

            {/* Modules */}
            <TabsContent value="modules" className="px-6 pb-6 space-y-4 mt-4">
              <Card className="bg-muted/30">
                <CardHeader className="py-3">
                  <CardDescription className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Les modules catégorisent les tickets par fonctionnalité. Glissez pour réordonner.
                  </CardDescription>
                </CardHeader>
              </Card>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleModuleDragEnd}
              >
                <SortableContext
                  items={editedModules.map(m => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {editedModules.map((mod, idx) => (
                      <SortableItem key={mod.id} id={mod.id}>
                        <span className="text-xs text-muted-foreground w-6">{idx + 1}</span>
                        
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">ID technique</Label>
                            <Input
                              value={mod.id}
                              onChange={(e) => {
                                const updated = [...editedModules];
                                updated[idx] = { ...mod, id: e.target.value.toUpperCase().replace(/\s/g, '_') };
                                setEditedModules(updated);
                              }}
                              placeholder="RDV"
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Libellé affiché</Label>
                            <Input
                              value={mod.label}
                              onChange={(e) => {
                                const updated = [...editedModules];
                                updated[idx] = { ...mod, label: e.target.value };
                                setEditedModules(updated);
                              }}
                              placeholder="Rendez-vous"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Couleur</Label>
                            <ColorPicker
                              value={mod.color}
                              onChange={(color) => {
                                const updated = [...editedModules];
                                updated[idx] = { ...mod, color };
                                setEditedModules(updated);
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Aperçu</Label>
                            <div className="h-9 flex items-center">
                              <BadgePreview label={mod.label} color={mod.color} />
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => setEditedModules(editedModules.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={addModule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un module
                </Button>
                <Button onClick={saveModules}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder les modules
                </Button>
              </div>
            </TabsContent>

            {/* Priorités (legacy info) */}
            <TabsContent value="priorities" className="px-6 pb-6 space-y-4 mt-4">
              <Card className="bg-amber-50 border-amber-200">
                <CardHeader className="py-3">
                  <CardDescription className="flex items-center gap-2 text-amber-800">
                    <Thermometer className="h-4 w-4" />
                    <strong>Nouveau système :</strong> La priorité est maintenant thermique (0-12).
                    Les anciennes priorités (A/B/V1) sont conservées pour référence historique uniquement.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-muted/30">
                <CardHeader className="py-4">
                  <CardTitle className="text-sm">Échelle thermique (0-12)</CardTitle>
                  <CardDescription>
                    Le système de priorité thermique remplace l'ancien système A/B/V1:
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-blue-100 text-blue-800 p-2 rounded text-center">
                      <div className="font-bold">0-2</div>
                      <div className="text-xs">Gelé/Froid</div>
                    </div>
                    <div className="bg-cyan-100 text-cyan-800 p-2 rounded text-center">
                      <div className="font-bold">3-4</div>
                      <div className="text-xs">Frais</div>
                    </div>
                    <div className="bg-yellow-100 text-yellow-800 p-2 rounded text-center">
                      <div className="font-bold">5-6</div>
                      <div className="text-xs">Tiède</div>
                    </div>
                    <div className="bg-orange-100 text-orange-800 p-2 rounded text-center">
                      <div className="font-bold">7-8</div>
                      <div className="text-xs">Chaud</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-red-100 text-red-800 p-2 rounded text-center">
                      <div className="font-bold">9-10</div>
                      <div className="text-xs">Brûlant</div>
                    </div>
                    <div className="bg-red-200 text-red-900 p-2 rounded text-center">
                      <div className="font-bold">11-12</div>
                      <div className="text-xs">Critique/Urgence</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm text-muted-foreground">Priorités legacy (lecture seule)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {editedPriorities.map((prio) => (
                      <BadgePreview key={prio.id} label={prio.label} color={prio.color} />
                    ))}
                    {editedPriorities.length === 0 && (
                      <span className="text-sm text-muted-foreground">Aucune priorité legacy</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tags */}
            <TabsContent value="tags" className="px-6 pb-6 space-y-4 mt-4">
              <Card className="bg-muted/30">
                <CardHeader className="py-3">
                  <CardDescription className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Les tags d'impact permettent de catégoriser les tickets. Glissez pour réordonner.
                  </CardDescription>
                </CardHeader>
              </Card>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleTagDragEnd}
              >
                <SortableContext
                  items={editedTags.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {editedTags.map((tag, idx) => (
                      <SortableItem key={tag.id} id={tag.id}>
                        <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                        
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">ID technique</Label>
                            <Input
                              value={tag.id}
                              onChange={(e) => {
                                const updated = [...editedTags];
                                updated[idx] = { ...tag, id: e.target.value.toLowerCase().replace(/\s/g, '_') };
                                setEditedTags(updated);
                              }}
                              placeholder="perf"
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Libellé affiché</Label>
                            <Input
                              value={tag.label}
                              onChange={(e) => {
                                const updated = [...editedTags];
                                updated[idx] = { ...tag, label: e.target.value };
                                setEditedTags(updated);
                              }}
                              placeholder="Performance"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Couleur</Label>
                            <ColorPicker
                              value={tag.color}
                              onChange={(color) => {
                                const updated = [...editedTags];
                                updated[idx] = { ...tag, color };
                                setEditedTags(updated);
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Aperçu</Label>
                            <div className="h-9 flex items-center">
                              <BadgePreview label={tag.label} color={tag.color} />
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => setEditedTags(editedTags.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={addTag}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un tag
                </Button>
                <Button onClick={saveTags}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder les tags
                </Button>
              </div>
            </TabsContent>

            {/* Porteurs (Owner sides) */}
            <TabsContent value="owners" className="px-6 pb-6 space-y-4 mt-4">
              <Card className="bg-muted/30">
                <CardHeader className="py-3">
                  <CardDescription className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Les porteurs indiquent qui est responsable du ticket. Glissez pour réordonner.
                  </CardDescription>
                </CardHeader>
              </Card>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleOwnerDragEnd}
              >
                <SortableContext
                  items={editedOwnerSides.map(o => o.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {editedOwnerSides.map((owner, idx) => (
                      <SortableItem key={owner.id} id={owner.id}>
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">ID technique</Label>
                            <Input
                              value={owner.id}
                              onChange={(e) => {
                                const updated = [...editedOwnerSides];
                                updated[idx] = { ...owner, id: e.target.value.toUpperCase().replace(/\s/g, '_') };
                                setEditedOwnerSides(updated);
                              }}
                              placeholder="HC"
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Libellé affiché</Label>
                            <Input
                              value={owner.label}
                              onChange={(e) => {
                                const updated = [...editedOwnerSides];
                                updated[idx] = { ...owner, label: e.target.value };
                                setEditedOwnerSides(updated);
                              }}
                              placeholder="HelpConfort"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Couleur</Label>
                            <ColorPicker
                              value={owner.color}
                              onChange={(color) => {
                                const updated = [...editedOwnerSides];
                                updated[idx] = { ...owner, color };
                                setEditedOwnerSides(updated);
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Aperçu</Label>
                            <div className="h-9 flex items-center">
                              <BadgePreview label={owner.label} color={owner.color} />
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => setEditedOwnerSides(editedOwnerSides.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={addOwnerSide}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un porteur
                </Button>
                <Button onClick={saveOwnerSides}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder les porteurs
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

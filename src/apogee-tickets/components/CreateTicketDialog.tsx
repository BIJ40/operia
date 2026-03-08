/**
 * Dialog de création d'un nouveau ticket Apogée
 * 
 * Contient tous les champs disponibles pour une création complète
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSessionState } from '@/hooks/useSessionState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Paperclip, X, FileIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import type { ApogeeModule, ApogeeTicketInsert, OwnerSide, ApogeeTicketStatus } from '../types';
import type { TicketRole } from '../hooks/useTicketPermissions';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { supabase } from '@/integrations/supabase/client';
import { TagSelector } from './TagSelector';
import { OwnerSideSlider, ownerSideToSliderValue, sliderValueToOwnerSide } from './OwnerSideSlider';
import { RoadmapEditor } from './RoadmapEditor';
import { HeatPrioritySelector } from './HeatPrioritySelector';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreateTicketDialogProps {
  open: boolean;
  onClose: () => void;
  modules: ApogeeModule[];
  statuses: ApogeeTicketStatus[];
  /** Retourne l'ID du ticket créé pour permettre l'upload des fichiers */
  onCreate: (ticket: ApogeeTicketInsert) => Promise<string | undefined>;
  isCreating?: boolean;
  /** Rôle ticket de l'utilisateur - seul developer peut renseigner h_min/h_max */
  userTicketRole?: TicketRole | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
};

const DEFAULT_HEAT_PRIORITY = 3;

export function CreateTicketDialog({
  open,
  onClose,
  modules,
  statuses,
  onCreate,
  isCreating,
  userTicketRole,
}: CreateTicketDialogProps) {
  const { user } = useAuth();
  const [userFirstName, setUserFirstName] = useState<string>('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Persister le formulaire dans sessionStorage pour survivre aux changements d'onglets
  const [form, setForm] = useSessionState<ApogeeTicketInsert>('create-ticket-form', {
    element_concerne: '',
    description: '',
    module: undefined,
    h_min: undefined,
    h_max: undefined,
    kanban_status: 'BACKLOG',
    created_from: 'MANUAL',
    reported_by: '',
    impact_tags: [],
    heat_priority: DEFAULT_HEAT_PRIORITY,
    roadmap_enabled: false,
    roadmap_month: undefined,
    roadmap_year: undefined,
  });
  
  // État local pour le slider owner_side (valeur numérique 0-5, undefined = pas de porteur défini)
  // Également persisté
  const [ownerSliderValue, setOwnerSliderValue] = useSessionState<number | undefined>('create-ticket-owner-slider', undefined);
  
  // Persister l'état d'ouverture du dialog
  const [dialogWasOpen, setDialogWasOpen] = useSessionState<boolean>('create-ticket-dialog-open', false);
  
  // Synchroniser l'état d'ouverture
  useEffect(() => {
    setDialogWasOpen(open);
  }, [open, setDialogWasOpen]);

  // Charger le prénom de l'utilisateur et TOUJOURS le mettre comme reported_by à chaque ouverture
  useEffect(() => {
    async function loadUserName() {
      if (!user?.id || !open) return;
      const { data } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.first_name) {
        const formattedName = data.first_name.toUpperCase();
        setUserFirstName(formattedName);
        // TOUJOURS écraser reported_by avec le nom de l'utilisateur connecté à chaque ouverture
        setForm(prev => ({ ...prev, reported_by: formattedName }));
      }
    }
    loadUserName();
  }, [user?.id, open, setForm]);

  const isDeveloper = userTicketRole === 'developer';

  // Gestion du drag & drop
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(r => {
        if (r.errors[0]?.code === 'file-too-large') {
          return `${r.file.name}: fichier trop volumineux (max 10MB)`;
        }
        return `${r.file.name}: type de fichier non supporté`;
      });
      toast.error(errors.join('\n'));
    }
    setPendingFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadFilesToTicket = async (ticketId: string) => {
    if (pendingFiles.length === 0) return;

    for (const file of pendingFiles) {
      const fileExt = file.name.split('.').pop();
      const filePath = `${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload vers Storage
      const { error: uploadError } = await supabase.storage
        .from('apogee-ticket-attachments')
        .upload(filePath, file);

      if (uploadError) {
        toast.error(`Erreur upload ${file.name}: ${uploadError.message}`);
        continue;
      }

      // Créer l'entrée en base
      const { error: dbError } = await supabase
        .from('apogee_ticket_attachments')
        .insert({
          ticket_id: ticketId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.id,
        });

      if (dbError) {
        // Rollback storage si erreur DB
        await supabase.storage.from('apogee-ticket-attachments').remove([filePath]);
        toast.error(`Erreur enregistrement ${file.name}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.element_concerne.trim() || !form.module) return;

    try {
      const ticketId = await onCreate(form);
      
      if (ticketId && pendingFiles.length > 0) {
        setIsUploading(true);
        await uploadFilesToTicket(ticketId);
        toast.success(`${pendingFiles.length} document(s) ajouté(s)`);
      }

      // Reset form et nettoyer le sessionStorage
      const defaultForm = {
        element_concerne: '',
        description: '',
        module: undefined,
        h_min: undefined,
        h_max: undefined,
        kanban_status: 'BACKLOG' as const,
        created_from: 'MANUAL' as const,
        reported_by: userFirstName.toUpperCase(),
        impact_tags: [],
        heat_priority: DEFAULT_HEAT_PRIORITY,
        roadmap_enabled: false,
        roadmap_month: undefined,
        roadmap_year: undefined,
      };
      setForm(defaultForm);
      setOwnerSliderValue(undefined);
      setDialogWasOpen(false);
      setPendingFiles([]);
      // Nettoyer explicitement le sessionStorage
      sessionStorage.removeItem('create-ticket-form');
      sessionStorage.removeItem('create-ticket-owner-slider');
      sessionStorage.removeItem('create-ticket-dialog-open');
      onClose();
    } catch (error) {
      // Erreur gérée par le parent
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setPendingFiles([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nouveau ticket
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Titre */}
          <div className="space-y-2">
            <Label htmlFor="element">Élément concerné *</Label>
            <Input
              id="element"
              value={form.element_concerne}
              onChange={(e) => setForm({ ...form, element_concerne: e.target.value })}
              placeholder="Ex: Gestion des RDV"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Détaillez le besoin ou le problème..."
              rows={4}
            />
          </div>

          {/* Module + Statut en ligne */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Module (obligatoire) */}
            <div className="space-y-2">
              <Label htmlFor="module">Module *</Label>
              <Select
                value={form.module || ''}
                onValueChange={(v) => setForm({ ...form, module: v || undefined })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Statut */}
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={form.kanban_status || 'BACKLOG'}
                onValueChange={(v) => setForm({ ...form, kanban_status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: s.color || '#6b7280' }}
                        />
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estimations - uniquement pour les développeurs */}
          {isDeveloper && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="h_min">Estimation min (h)</Label>
                <Input
                  id="h_min"
                  type="number"
                  value={form.h_min || ''}
                  onChange={(e) => setForm({ ...form, h_min: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  min={0}
                  step={0.5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="h_max">Estimation max (h)</Label>
                <Input
                  id="h_max"
                  type="number"
                  value={form.h_max || ''}
                  onChange={(e) => setForm({ ...form, h_max: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  min={0}
                  step={0.5}
                />
              </div>
            </div>
          )}

          {/* PRIORITÉ */}
          <div className="space-y-2">
            <Label>Priorité</Label>
            <div className="p-3 bg-muted/30 rounded-lg">
              <HeatPrioritySelector
                priority={form.heat_priority ?? DEFAULT_HEAT_PRIORITY}
                onChange={(v) => setForm({ ...form, heat_priority: v })}
                size="default"
              />
            </div>
          </div>

          {/* PORTEUR DU PROJET */}
          <div className="space-y-2">
            <Label>Porteur du projet</Label>
            <div className="p-3 bg-muted/30 rounded-lg">
              <OwnerSideSlider
                value={ownerSliderValue ?? null}
                onChange={(v) => {
                  setOwnerSliderValue(v ?? undefined);
                  // Convertir la valeur slider en OwnerSide pour le form
                  const ownerSide = sliderValueToOwnerSide(v);
                  setForm(prev => ({ ...prev, owner_side: ownerSide as OwnerSide | undefined }));
                }}
              />
            </div>
          </div>

          {/* ROADMAP */}
          <div className="space-y-2">
            <Label>Roadmap</Label>
            <div className="p-3 bg-muted/30 rounded-lg">
              <RoadmapEditor
                enabled={form.roadmap_enabled}
                month={form.roadmap_month}
                year={form.roadmap_year}
                onChange={(enabled, month, year) => {
                  setForm(prev => ({
                    ...prev,
                    roadmap_enabled: enabled,
                    roadmap_month: month,
                    roadmap_year: year,
                  }));
                }}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagSelector
              selectedTags={form.impact_tags || []}
              onTagsChange={(tags) => setForm({ ...form, impact_tags: tags })}
            />
          </div>

          {/* Zone d'upload de documents */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Documents
            </Label>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                isDragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p className="text-sm text-primary">Déposez les fichiers ici...</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Glissez-déposez des fichiers ou cliquez pour sélectionner
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                PDF, Images, Word, Excel (max 10MB)
              </p>
            </div>

            {/* Liste des fichiers en attente */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2 mt-2">
                {pendingFiles.map((file, index) => (
                  <div 
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isCreating || isUploading || !form.element_concerne.trim() || !form.module}
            >
              {isUploading ? 'Upload en cours...' : isCreating ? 'Création...' : 'Créer le ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

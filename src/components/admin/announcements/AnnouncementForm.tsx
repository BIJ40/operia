import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateAnnouncement, useUpdateAnnouncement } from '@/hooks/use-announcements';
import type { Database } from '@/integrations/supabase/types';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Announcement = Database['public']['Tables']['priority_announcements']['Row'];

const announcementSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200),
  content: z.string().min(1, 'Le contenu est requis'),
  image_path: z.string().optional(),
  is_active: z.boolean(),
  expires_at: z.date(),
  target_all: z.boolean(),
  exclude_base_users: z.boolean(),
});

type FormData = z.infer<typeof announcementSchema>;

interface AnnouncementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement;
  userId: string;
}

export function AnnouncementForm({ 
  open, 
  onOpenChange, 
  announcement,
  userId 
}: AnnouncementFormProps) {
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  
  const isEdit = !!announcement;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: announcement ? {
      title: announcement.title,
      content: announcement.content,
      image_path: announcement.image_path || '',
      is_active: announcement.is_active ?? true,
      expires_at: new Date(announcement.expires_at),
      target_all: announcement.target_all ?? true,
      exclude_base_users: announcement.exclude_base_users ?? false,
    } : {
      is_active: true,
      target_all: true,
      exclude_base_users: false,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
    },
  });

  const expiresAt = watch('expires_at');
  const isActive = watch('is_active');
  const targetAll = watch('target_all');
  const excludeBaseUsers = watch('exclude_base_users');

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit && announcement) {
        await updateAnnouncement.mutateAsync({
          id: announcement.id,
          updates: {
            ...data,
            expires_at: data.expires_at.toISOString(),
          },
        });
      } else {
        await createAnnouncement.mutateAsync({
          ...data,
          expires_at: data.expires_at.toISOString(),
          created_by: userId,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving announcement:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier l\'annonce' : 'Nouvelle annonce'}</DialogTitle>
          <DialogDescription>
            Créez une annonce prioritaire qui sera affichée à tous les utilisateurs ciblés.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Titre */}
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Titre de l'annonce"
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Contenu */}
          <div>
            <Label htmlFor="content">Contenu *</Label>
            <Textarea
              id="content"
              {...register('content')}
              placeholder="Texte de l'annonce (HTML simple supporté)"
              rows={8}
              className="font-mono text-sm"
            />
            {errors.content && (
              <p className="text-sm text-destructive mt-1">{errors.content.message}</p>
            )}
          </div>

          {/* Image (optionnel) */}
          <div>
            <Label htmlFor="image_path">URL de l'image (optionnel)</Label>
            <Input
              id="image_path"
              {...register('image_path')}
              placeholder="https://..."
            />
          </div>

          {/* Date d'expiration */}
          <div>
            <Label>Date d'expiration *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background z-50">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={(date) => date && setValue('expires_at', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Options */}
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Annonce active</Label>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="target_all">Cibler tous les utilisateurs</Label>
              <Switch
                id="target_all"
                checked={targetAll}
                onCheckedChange={(checked) => setValue('target_all', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="exclude_base_users">Exclure les utilisateurs N0 (base_user)</Label>
              <Switch
                id="exclude_base_users"
                checked={excludeBaseUsers}
                onCheckedChange={(checked) => setValue('exclude_base_users', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createAnnouncement.isPending || updateAnnouncement.isPending}
              className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
            >
              {isEdit ? 'Mettre à jour' : 'Créer l\'annonce'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

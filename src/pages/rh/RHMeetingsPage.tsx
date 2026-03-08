import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calendar, FileText, Trash2, ExternalLink, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

interface RHMeeting {
  id: string;
  title: string;
  meeting_date: string;
  description: string | null;
  presentation_url: string | null;
  presentation_file_path: string | null;
  created_at: string;
}

export default function RHMeetingsPage() {
  const { agencyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    meeting_date: '',
    description: ''
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['rh-meetings', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('rh_meetings')
        .select('*')
        .eq('agency_id', agencyId)
        .order('meeting_date', { ascending: false });
      if (error) throw error;
      return data as RHMeeting[];
    },
    enabled: !!agencyId
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { file?: File }) => {
      if (!agencyId || !user?.id) throw new Error('Non autorisé');

      let filePath: string | null = null;

      // Upload file if provided
      if (data.file) {
        const fileExt = data.file.name.split('.').pop();
        const fileName = `${agencyId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('rh-meetings')
          .upload(fileName, data.file);
        if (uploadError) throw uploadError;
        filePath = fileName;
      }

      const { error } = await supabase.from('rh_meetings').insert({
        agency_id: agencyId,
        title: data.title,
        meeting_date: data.meeting_date,
        description: data.description || null,
        presentation_file_path: filePath,
        created_by: user.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-meetings', agencyId] });
      setIsDialogOpen(false);
      setFormData({ title: '', meeting_date: '', description: '' });
      setSelectedFile(null);
      toast({ title: 'Réunion ajoutée' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'ajouter la réunion", variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (meeting: RHMeeting) => {
      // Delete file if exists
      if (meeting.presentation_file_path) {
        await supabase.storage.from('rh-meetings').remove([meeting.presentation_file_path]);
      }
      const { error } = await supabase.from('rh_meetings').delete().eq('id', meeting.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-meetings', agencyId] });
      toast({ title: 'Réunion supprimée' });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.meeting_date) return;
    setUploadingFile(true);
    try {
      await createMutation.mutateAsync({ ...formData, file: selectedFile || undefined });
    } finally {
      setUploadingFile(false);
    }
  };

  const getFileUrl = async (filePath: string) => {
    const { data } = await supabase.storage.from('rh-meetings').createSignedUrl(filePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Réunions RH</h2>
          <p className="text-sm text-muted-foreground">Historique des réunions et présentations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-warm-purple/90 hover:bg-warm-purple text-white shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle réunion
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter une réunion</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Réunion mensuelle Janvier"
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.meeting_date}
                  onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Notes ou ordre du jour..."
                  className="rounded-xl"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Fichier présentation</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="flex-1 rounded-xl"
                  />
                  {selectedFile && (
                    <span className="text-sm text-muted-foreground truncate max-w-32">
                      {selectedFile.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                  Annuler
                </Button>
                <Button type="submit" disabled={uploadingFile || createMutation.isPending} className="rounded-xl">
                  {(uploadingFile || createMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Ajouter
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Card tableau */}
      <Card className="rounded-2xl border-border/50 shadow-sm backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warm-purple/70 to-warm-blue/50 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            Historique des réunions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune réunion enregistrée
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-medium">Date</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Titre</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Description</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Présentation</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map((meeting) => (
                    <TableRow key={meeting.id} className="border-border/30 hover:bg-muted/30">
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(meeting.meeting_date), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>{meeting.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {meeting.description || '-'}
                      </TableCell>
                      <TableCell>
                        {meeting.presentation_file_path ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => getFileUrl(meeting.presentation_file_path!)}
                            className="rounded-lg hover:bg-warm-purple/10"
                          >
                            <FileText className="h-4 w-4 mr-1 text-warm-purple" />
                            Fichier
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(meeting)}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

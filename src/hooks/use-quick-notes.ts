import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface QuickNote {
  id: string;
  user_id: string;
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple';
  created_at: string;
  updated_at: string;
}

const supabaseAny = supabase as any;

export function useQuickNotes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user]);

  const loadNotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabaseAny
        .from('user_quick_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les notes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (content: string, color: QuickNote['color'] = 'yellow') => {
    if (!user) return;

    try {
      const { data, error } = await supabaseAny
        .from('user_quick_notes')
        .insert({
          user_id: user.id,
          content,
          color,
        })
        .select()
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      toast({
        title: 'Note ajoutée',
        description: 'Votre note a été enregistrée',
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter la note',
        variant: 'destructive',
      });
    }
  };

  const updateNote = async (id: string, content: string) => {
    if (!user) return;

    try {
      const { error } = await supabaseAny
        .from('user_quick_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setNotes(notes.map(note => 
        note.id === id ? { ...note, content, updated_at: new Date().toISOString() } : note
      ));
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la note',
        variant: 'destructive',
      });
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabaseAny
        .from('user_quick_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotes(notes.filter(note => note.id !== id));
      toast({
        title: 'Note supprimée',
        description: 'La note a été supprimée',
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la note',
        variant: 'destructive',
      });
    }
  };

  return {
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
  };
}

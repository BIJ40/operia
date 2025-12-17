/**
 * Post-it éditable pour le Kanban
 * Style : punaise en haut, coin replié en bas à droite
 */
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function KanbanPostIt() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch postit content
  const { data: postit } = useQuery({
    queryKey: ['kanban-postit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kanban_postit')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('kanban_postit')
        .update({ 
          content, 
          updated_at: new Date().toISOString(),
        })
        .eq('id', postit?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-postit'] });
    },
  });

  // Sync local content with fetched data
  useEffect(() => {
    if (postit?.content !== undefined) {
      setLocalContent(postit.content || '');
    }
  }, [postit?.content]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (localContent !== postit?.content) {
      updateMutation.mutate(localContent);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setLocalContent(postit?.content || '');
      setIsEditing(false);
    }
  };

  return (
    <div 
      className="relative group z-50"
      style={{ marginTop: '-80px' }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Punaise */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
        <div className="relative">
          {/* Tête de la punaise */}
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-md border border-red-700/30" />
          {/* Reflet */}
          <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-white/40" />
          {/* Pointe */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-gradient-to-b from-gray-400 to-gray-600" />
        </div>
      </div>

      {/* Post-it */}
      <div 
        className={cn(
          "relative w-80 min-h-[180px] pt-3 pb-4 px-3",
          "bg-gradient-to-br from-yellow-200 to-yellow-300",
          "shadow-md hover:shadow-lg transition-shadow",
          "cursor-pointer select-none",
          isEditing && "ring-2 ring-yellow-500"
        )}
        style={{
          // Effet de papier légèrement incliné
          transform: 'rotate(-1deg)',
        }}
      >
        {/* Coin replié */}
        <div 
          className="absolute bottom-0 right-0 w-5 h-5"
          style={{
            background: 'linear-gradient(135deg, transparent 50%, hsl(45, 80%, 65%) 50%)',
            boxShadow: '-1px -1px 2px rgba(0,0,0,0.1)',
          }}
        />
        <div 
          className="absolute bottom-0 right-0 w-5 h-5 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, hsl(45, 90%, 75%) 50%, transparent 50%)',
          }}
        />

        {/* Contenu */}
        {isEditing ? (
          <Textarea
            ref={textareaRef}
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full min-h-[140px] p-0 border-none bg-transparent resize-none",
              "text-sm text-yellow-900 placeholder:text-yellow-700/50",
              "focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
              "font-handwriting"
            )}
            placeholder="Double-clic pour écrire..."
            style={{ 
              fontFamily: "'Caveat', 'Comic Sans MS', cursive",
              lineHeight: '1.4',
            }}
          />
        ) : (
          <p 
            className={cn(
              "text-sm text-yellow-900 whitespace-pre-wrap break-words",
              !localContent && "text-yellow-700/50 italic"
            )}
            style={{ 
              fontFamily: "'Caveat', 'Comic Sans MS', cursive",
              lineHeight: '1.4',
            }}
          >
            {localContent || 'Double-clic pour écrire...'}
          </p>
        )}
      </div>

      {/* Ombre portée du post-it */}
      <div 
        className="absolute inset-0 -z-10 bg-black/10 blur-sm"
        style={{
          transform: 'rotate(-1deg) translate(2px, 3px)',
        }}
      />
    </div>
  );
}

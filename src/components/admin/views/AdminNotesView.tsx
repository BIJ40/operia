/**
 * AdminNotesView - Post-it / bloc-notes rapide pour l'admin
 * Persisté en localStorage, champ libre type roadmap perso.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { StickyNote, Save, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STORAGE_KEY = 'admin_notes_v1';

interface NotesData {
  content: string;
  updatedAt: string | null;
}

function loadNotes(): NotesData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { content: '', updatedAt: null };
}

function saveNotes(data: NotesData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function AdminNotesView() {
  const [data, setData] = useState<NotesData>(loadNotes);
  const [isDirty, setIsDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 300) + 'px';
  }, []);

  useEffect(() => { resize(); }, [data.content, resize]);

  // Auto-save after 2s of inactivity
  const scheduleAutoSave = useCallback((content: string) => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      const updated: NotesData = { content, updatedAt: new Date().toISOString() };
      saveNotes(updated);
      setData(updated);
      setIsDirty(false);
    }, 2000);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setData(prev => ({ ...prev, content }));
    setIsDirty(true);
    scheduleAutoSave(content);
  };

  const handleSave = () => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    const updated: NotesData = { content: data.content, updatedAt: new Date().toISOString() };
    saveNotes(updated);
    setData(updated);
    setIsDirty(false);
    toast.success('Notes sauvegardées');
  };

  const handleClear = () => {
    if (!data.content.trim()) return;
    if (!confirm('Effacer toutes les notes ?')) return;
    const updated: NotesData = { content: '', updatedAt: new Date().toISOString() };
    saveNotes(updated);
    setData(updated);
    setIsDirty(false);
    toast.success('Notes effacées');
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, []);

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/80 to-yellow-500/60 flex items-center justify-center shadow-sm">
            <StickyNote className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Mes notes</h2>
            <p className="text-sm text-muted-foreground">
              Bloc-notes rapide — roadmap, TODO, idées…
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.updatedAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(data.updatedAt), "d MMM à HH:mm", { locale: fr })}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={!data.content.trim()}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty}
            className={cn(
              "gap-1.5",
              isDirty && "bg-amber-500 hover:bg-amber-600 text-white"
            )}
          >
            <Save className="w-4 h-4" />
            {isDirty ? 'Sauvegarder' : 'Sauvegardé'}
          </Button>
        </div>
      </div>

      {/* Post-it area */}
      <div className="relative rounded-2xl border-2 border-amber-300/40 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-700/30 shadow-sm overflow-hidden">
        {/* Decorative tape */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-amber-200/60 dark:bg-amber-800/30 rounded-b-md" />
        
        <textarea
          ref={textareaRef}
          value={data.content}
          onChange={handleChange}
          placeholder={"📌 Mes notes rapides…\n\n• Tâche 1\n• Tâche 2\n\n--- Roadmap ---\n\n☐ Feature A\n☐ Feature B\n☑ Feature C (done)"}
          spellCheck={false}
          className={cn(
            "w-full min-h-[300px] p-6 pt-8 resize-none",
            "bg-transparent border-none outline-none",
            "text-sm leading-relaxed text-foreground",
            "placeholder:text-muted-foreground/40",
            "font-mono"
          )}
        />
      </div>

      {/* Subtle hint */}
      <p className="text-xs text-muted-foreground/50 text-center">
        Auto-sauvegarde après 2s • Stocké localement dans votre navigateur
      </p>
    </div>
  );
}

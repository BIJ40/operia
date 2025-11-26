import { useState } from 'react';
import { Plus, X, Edit2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useQuickNotes } from '@/hooks/use-quick-notes';
import { ScrollArea } from '@/components/ui/scroll-area';

const colorClasses = {
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300',
  blue: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300',
  green: 'bg-green-100 dark:bg-green-900/30 border-green-300',
  pink: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300',
  purple: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300',
};

export function QuickNotesWidget() {
  const { notes, loading, addNote, updateNote, deleteNote } = useQuickNotes();
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    
    await addNote(newNote, 'yellow');
    setNewNote('');
    setIsAdding(false);
  };

  const handleEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    
    await updateNote(editingId, editContent);
    setEditingId(null);
    setEditContent('');
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Notes rapides</CardTitle>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setIsAdding(!isAdding)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-2 overflow-hidden flex flex-col">
        {isAdding && (
          <div className="space-y-2 p-2 border rounded-lg bg-muted/50">
            <Textarea
              placeholder="Nouvelle note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[60px] resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>
                <Check className="w-3 h-3 mr-1" />
                Ajouter
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Chargement...
              </p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune note. Cliquez sur + pour en ajouter.
              </p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg border-2 ${colorClasses[note.color]} relative group`}
                >
                  {editingId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px] resize-none bg-background/50"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm whitespace-pre-wrap pr-12">{note.content}</p>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleEdit(note.id, note.content)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => deleteNote(note.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

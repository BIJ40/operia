import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, AlertCircle, Lightbulb, AlertTriangle, Info, ImageIcon, AtSign, Hash, Highlighter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Mention, createMentionSuggestion } from '@/extensions/Mention';
import { ResizableImage } from '@/extensions/ResizableImage';
import { Callout } from '@/extensions/Callout';
import { ImageButton } from '@/extensions/ImageButton';
import { getAllMentionSuggestions, navigateToMention, MentionSuggestion } from '@/lib/mentions';
import { useEditor as useEditorContext } from '@/contexts/EditorContext';
import 'tippy.js/dist/tippy.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

// Custom extension for callout boxes
const CalloutExtension = StarterKit.configure({
  heading: {
    levels: [1, 2, 3],
  },
});

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [imageType, setImageType] = useState<'inline' | 'modal'>('inline');
  const [imageLabel, setImageLabel] = useState('Voir');
  const [showImageDialog, setShowImageDialog] = useState(false);
  const { blocks } = useEditorContext();
  
  // Load mentions immediately
  const mentions = getAllMentionSuggestions(blocks);

  const editor = useEditor({
    extensions: [
      CalloutExtension,
      ResizableImage,
      Callout,
      ImageButton,
      Highlight.configure({
        multicolor: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention cursor-pointer text-primary font-medium hover:underline',
        },
        suggestion: createMentionSuggestion(mentions, '@'),
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  }, [blocks]);

  useEffect(() => {
    if (!editor) return;

    // Handle clicks on mentions to navigate
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const mentionEl = target.closest('[data-mention]') as HTMLElement;
      
      if (mentionEl) {
        event.preventDefault();
        const id = mentionEl.getAttribute('data-id');
        const label = mentionEl.getAttribute('data-label');
        const slug = mentionEl.getAttribute('data-slug');
        const categorySlug = mentionEl.getAttribute('data-category-slug');
        const type = mentionEl.getAttribute('data-type') as 'category' | 'section';
        
        if (id && label) {
          navigateToMention({ id, label, slug: slug || id, categorySlug: categorySlug || undefined, type: type || 'category' });
        }
      }
    };

    const editorEl = editor.view.dom;
    editorEl.addEventListener('click', handleClick);

    return () => {
      editorEl.removeEventListener('click', handleClick);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const insertCallout = (type: 'warning' | 'info' | 'tip' | 'danger') => {
    editor?.chain().focus().setCallout(type).run();
  };

  const handleImageInsert = () => {
    if (!imageUrl) return;

    if (imageType === 'inline') {
      editor?.chain().focus().insertContent({
        type: 'resizableImage',
        attrs: { src: imageUrl },
      }).run();
    } else {
      // Insérer un bouton d'image modal via l'extension
      editor?.chain().focus().insertContent({
        type: 'imageButton',
        attrs: { src: imageUrl, label: imageLabel },
      }).run();
    }

    setImageUrl('');
    setImageLabel('Voir');
    setShowImageDialog(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted p-2 border-b flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-accent' : ''}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-accent' : ''}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-accent' : ''}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-accent' : ''}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Highlight buttons for selected text */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef3c7' }).run()}
          className={editor.isActive('highlight', { color: '#fef3c7' }) ? 'bg-accent' : ''}
          title="Surligner en jaune"
        >
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fef3c7', border: '1px solid #ccc' }} />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#d1fae5' }).run()}
          className={editor.isActive('highlight', { color: '#d1fae5' }) ? 'bg-accent' : ''}
          title="Surligner en vert"
        >
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#d1fae5', border: '1px solid #ccc' }} />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#dbeafe' }).run()}
          className={editor.isActive('highlight', { color: '#dbeafe' }) ? 'bg-accent' : ''}
          title="Surligner en bleu"
        >
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dbeafe', border: '1px solid #ccc' }} />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#fee2e2' }).run()}
          className={editor.isActive('highlight', { color: '#fee2e2' }) ? 'bg-accent' : ''}
          title="Surligner en rouge"
        >
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fee2e2', border: '1px solid #ccc' }} />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().unsetHighlight().run()}
          title="Enlever le surlignage"
        >
          <Highlighter className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => insertCallout('warning')}
          title="Encadré attention"
        >
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => insertCallout('info')}
          title="Encadré information"
        >
          <Info className="w-4 h-4 text-blue-600" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => insertCallout('tip')}
          title="Encadré astuce"
        >
          <Lightbulb className="w-4 h-4 text-green-600" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => insertCallout('danger')}
          title="Encadré danger"
        >
          <AlertCircle className="w-4 h-4 text-red-600" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          size="sm"
          variant="ghost"
          title="Insérer un lien @ (catégorie/section)"
          onClick={() => editor?.chain().focus().insertContent('@').run()}
        >
          <AtSign className="w-4 h-4 text-primary" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Insérer une image"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insérer une image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="image-upload">Télécharger une image</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="image-url">Ou coller une URL</Label>
                <Input
                  id="image-url"
                  type="url"
                  placeholder="https://exemple.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-2"
                />
              </div>

              <RadioGroup value={imageType} onValueChange={(v) => setImageType(v as 'inline' | 'modal')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inline" id="inline" />
                  <Label htmlFor="inline" className="cursor-pointer">
                    Afficher dans le texte (petites images, icônes)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="modal" id="modal" />
                  <Label htmlFor="modal" className="cursor-pointer">
                    Bouton "Voir" avec œil 👁️ (captures d&apos;écran, tutoriels)
                  </Label>
                </div>
              </RadioGroup>

              {imageType === 'modal' && (
                <div>
                  <Label htmlFor="image-label">Texte du bouton</Label>
                  <Input
                    id="image-label"
                    type="text"
                    placeholder="Voir"
                    value={imageLabel}
                    onChange={(e) => setImageLabel(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Par exemple : "Voir capture", "Voir tutoriel", "Afficher l&apos;exemple"
                  </p>
                </div>
              )}

              <Button onClick={handleImageInsert} disabled={!imageUrl} className="w-full">
                Insérer l&apos;image
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <EditorContent 
        editor={editor} 
        className="prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none [&_.mention]:cursor-pointer [&_.mention]:text-primary [&_.mention]:font-medium [&_.mention]:hover:underline"
      />
      <div className="text-xs text-muted-foreground px-4 pb-2">
        💡 Tapez @ pour créer des liens vers d&apos;autres sections
      </div>
    </div>
  );
}

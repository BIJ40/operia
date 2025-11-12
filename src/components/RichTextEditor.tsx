import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, AlertCircle, Lightbulb, AlertTriangle, Info, ImageIcon, AtSign, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Mention, createMentionSuggestion } from '@/extensions/Mention';
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
  const [showImageDialog, setShowImageDialog] = useState(false);
  const { blocks } = useEditorContext();
  const [mentions, setMentions] = useState<MentionSuggestion[]>([]);

  useEffect(() => {
    setMentions(getAllMentionSuggestions(blocks));
  }, [blocks]);

  const editor = useEditor({
    extensions: [
      CalloutExtension,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
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
  });

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
    const colors = {
      warning: '#fef3c7',
      info: '#dbeafe',
      tip: '#d1fae5',
      danger: '#fee2e2',
    };
    
    const icons = {
      warning: '⚠️',
      info: 'ℹ️',
      tip: '💡',
      danger: '🚨',
    };

    editor.chain().focus().insertContent(`
      <div style="background-color: ${colors[type]}; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid ${type === 'warning' ? '#f59e0b' : type === 'info' ? '#3b82f6' : type === 'tip' ? '#10b981' : '#ef4444'}">
        <p><strong>${icons[type]} ${type === 'warning' ? 'Attention' : type === 'info' ? 'Information' : type === 'tip' ? 'Astuce' : 'Danger'}</strong></p>
        <p>Votre texte ici...</p>
      </div>
    `).run();
  };

  const handleImageInsert = () => {
    if (!imageUrl) return;

    if (imageType === 'inline') {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    } else {
      // Insert a clickable "voir" button that opens in modal
      editor.chain().focus().insertContent(`
        <div style="margin: 16px 0;">
          <button data-image-modal="${imageUrl}" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: #3b82f6; color: white; border-radius: 6px; border: none; cursor: pointer; font-weight: 500;">
            <span style="font-size: 18px;">👁️</span> Voir l'image
          </button>
        </div>
      `).run();
    }

    setImageUrl('');
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

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { FontSize } from '@/extensions/FontSize';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, AlertCircle, Lightbulb, AlertTriangle, Info, ImageIcon, AtSign, Hash, Highlighter, FileText, Type, Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, Paperclip, ChevronDown, Table as TableIcon, Plus, Minus, Merge, Split } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Mention, createMentionSuggestion } from '@/extensions/Mention';
import { ResizableImage } from '@/extensions/ResizableImage';
import { Callout } from '@/extensions/Callout';
import { ImageButton } from '@/extensions/ImageButton';
import { FileButton } from '@/extensions/FileButton';
import { InlineFile } from '@/extensions/InlineFile';
import { getAllMentionSuggestions, navigateToMention, MentionSuggestion } from '@/lib/mentions';
import { useEditor as useEditorContext } from '@/contexts/EditorContext';
import { logError } from '@/lib/logger';
import { toast } from 'sonner';
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
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState<'inline' | 'button'>('inline');
  const [fileLabel, setFileLabel] = useState('Voir');
  const [filename, setFilename] = useState('');
  const [showFileDialog, setShowFileDialog] = useState(false);
  const { blocks } = useEditorContext();
  
  // Load mentions immediately
  const mentions = getAllMentionSuggestions(blocks);

  const editor = useEditor({
    extensions: [
      CalloutExtension,
      ResizableImage,
      Callout,
      ImageButton,
      FileButton,
      InlineFile,
      TextStyle,
      Color,
      FontSize,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'table-auto border-collapse my-4',
        },
      }),
      TableRow,
      TableHeader,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-border p-2 min-w-[100px]',
        },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention cursor-pointer text-primary font-medium hover:underline',
        },
        suggestion: createMentionSuggestion(mentions, '@'),
      }),
    ],
    content,
    autofocus: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
      // CRITIQUE : Désactiver complètement le scroll automatique de ProseMirror
      handleScrollToSelection: () => false,
    },
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

  const insertCallout = (type: 'warning' | 'info' | 'tip' | 'danger' | 'white') => {
    editor?.chain().focus().setCallout(type).run();
  };

  const handleImageInsert = () => {
    if (!imageUrl || !editor) return;

    try {
      // Vérifier la longueur de l'URL
      if (imageUrl.length > 10000000) { // 10MB en base64
        toast.error("L'image est trop volumineuse pour être insérée. Veuillez choisir une image plus petite.");
        return;
      }

      if (imageType === 'inline') {
        editor.chain().focus().insertContent({
          type: 'resizableImage',
          attrs: { src: imageUrl },
        }).run();
      } else {
        editor.chain().focus().insertContent({
          type: 'imageButton',
          attrs: { src: imageUrl, label: imageLabel },
        }).run();
      }

      setImageUrl('');
      setImageLabel('Voir');
      setShowImageDialog(false);
    } catch (error) {
      logError('RICH_TEXT_EDITOR', 'Erreur insertion image', { error });
      toast.error("Erreur lors de l'insertion de l'image. L'image est peut-être trop volumineuse.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la taille (limite à 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image trop volumineuse. Veuillez choisir une image de moins de 5 MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      
      // TOUJOURS compresser les images pour éviter les crashes
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Limiter à 1200px max pour les screenshots
        const maxDimension = 1200;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          toast.error('Erreur lors du traitement de l\'image');
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compression JPEG agressive pour screenshots
        const quality = file.size > 1000000 ? 0.7 : 0.85;
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Vérifier la taille du data URL final (limite à 2MB en base64)
        if (compressedDataUrl.length > 2000000) {
          toast.error('Image trop volumineuse même après compression. Veuillez réduire la résolution ou choisir une autre image.');
          return;
        }
        
        setImageUrl(compressedDataUrl);
      };
      
      img.onerror = () => {
        toast.error('Erreur lors du chargement de l\'image');
      };
      
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileInsert = () => {
    if (!fileUrl) return;

    if (fileType === 'inline') {
      editor?.chain().focus().setInlineFile({
        src: fileUrl,
        filename: filename || 'fichier',
      }).run();
    } else {
      editor?.chain().focus().setFileButton({
        src: fileUrl,
        label: fileLabel,
        filename: filename || 'fichier',
      }).run();
    }

    setFileUrl('');
    setFileLabel('Voir');
    setFilename('');
    setShowFileDialog(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFileUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border rounded-lg relative">
      <div className="sticky top-0 z-50 bg-muted/95 backdrop-blur-sm p-2 border-b flex flex-wrap gap-1 shadow-md">
        {/* Titres de bloc (affectent tout le paragraphe) */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}
          title="Titre 1 (bloc entier)"
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
          title="Titre 2 (bloc entier)"
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''}
          title="Titre 3 (bloc entier)"
        >
          <Heading3 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={editor.isActive('paragraph') ? 'bg-accent' : ''}
          title="Texte normal"
        >
          <Type className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Taille de texte inline (sélection uniquement) */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().setFontSize('0.75rem').run()}
          title="Petit texte"
          className="text-xs"
        >
          A
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().setFontSize('1rem').run()}
          title="Texte normal"
          className="text-sm"
        >
          A
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().setFontSize('1.25rem').run()}
          title="Grand texte"
          className="text-base"
        >
          A
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().setFontSize('1.5rem').run()}
          title="Très grand texte"
          className="text-lg"
        >
          A
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Mise en forme de texte */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-accent' : ''}
          title="Gras"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-accent' : ''}
          title="Italique"
        >
          <Italic className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Couleurs de texte */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Couleur du texte"
              className="gap-1"
            >
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#000000', border: '1px solid #ccc' }} />
              <ChevronDown className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 bg-background border-border z-50" align="start">
            <div className="grid grid-cols-4 gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().setColor('#000000').run()}
                title="Noir"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#000000', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().setColor('#dc2626').run()}
                title="Rouge"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#dc2626', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().setColor('#2563eb').run()}
                title="Bleu"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#2563eb', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().setColor('#06b6d4').run()}
                title="Cyan"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#06b6d4', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().setColor('#16a34a').run()}
                title="Vert"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#16a34a', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().setColor('#ea580c').run()}
                title="Orange"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ea580c', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().setColor('#9333ea').run()}
                title="Violet"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#9333ea', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().setColor('#ec4899').run()}
                title="Rose"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ec4899', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().unsetColor().run()}
                title="Par défaut"
                className="p-2"
              >
                <Type className="w-4 h-4" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Surlignage */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Surligner le texte"
              className="gap-1"
            >
              <Highlighter className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 bg-background border-border z-50" align="start">
            <div className="grid grid-cols-4 gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
                title="Jaune"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#fef08a', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleHighlight({ color: '#bbf7d0' }).run()}
                title="Vert"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#bbf7d0', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleHighlight({ color: '#fed7aa' }).run()}
                title="Orange"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#fed7aa', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleHighlight({ color: '#fecaca' }).run()}
                title="Rose"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#fecaca', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleHighlight({ color: '#bfdbfe' }).run()}
                title="Bleu"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#bfdbfe', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleHighlight({ color: '#e9d5ff' }).run()}
                title="Violet"
                className="p-2"
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#e9d5ff', border: '1px solid #ccc' }} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
                title="Enlever"
                className="p-2"
              >
                <Highlighter className="w-4 h-4" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Alignement */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'bg-accent' : ''}
          title="Aligner à gauche"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'bg-accent' : ''}
          title="Centrer"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'bg-accent' : ''}
          title="Aligner à droite"
        >
          <AlignRight className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Listes */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-accent' : ''}
          title="Liste à puces"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-accent' : ''}
          title="Liste numérotée"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Tableaux */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run()}
          title="Insérer un tableau (2x2)"
        >
          <TableIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 3, withHeaderRow: false }).run()}
          title="Insérer un tableau (3 colonnes)"
        >
          <TableIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 4, withHeaderRow: false }).run()}
          title="Insérer un tableau (4 colonnes)"
        >
          <TableIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          disabled={!editor.isActive('table')}
          title="Ajouter une ligne"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().deleteRow().run()}
          disabled={!editor.isActive('table')}
          title="Supprimer la ligne"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().mergeCells().run()}
          disabled={!editor.can().mergeCells()}
          title="Fusionner les cellules"
        >
          <Merge className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().splitCell().run()}
          disabled={!editor.can().splitCell()}
          title="Séparer la cellule"
        >
          <Split className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Encadrés */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => insertCallout('danger')}
          title="Encadré danger"
        >
          <AlertCircle className="w-4 h-4 text-red-600" />
        </Button>
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
          onClick={() => insertCallout('white')}
          title="Encadré blanc"
        >
          <FileText className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Liens et médias */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          title="Insérer un lien @ (catégorie/section)"
          onClick={() => editor?.chain().focus().insertContent('@').run()}
        >
          <AtSign className="w-4 h-4 text-primary" />
        </Button>

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

              <div>
                <Label>Type d&apos;affichage</Label>
                <RadioGroup value={imageType} onValueChange={(v) => setImageType(v as 'inline' | 'modal')} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inline" id="inline" />
                    <Label htmlFor="inline" className="font-normal cursor-pointer">
                      Inline (afficher directement dans le texte)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="modal" id="modal" />
                    <Label htmlFor="modal" className="font-normal cursor-pointer">
                      Bouton (afficher seulement un bouton cliquable)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

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

        <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
          <DialogTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Insérer un fichier"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insérer un fichier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Télécharger un fichier</Label>
                <Input
                  id="file-upload"
                  type="file"
                  onChange={handleFileUpload}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="file-url">Ou coller une URL</Label>
                <Input
                  id="file-url"
                  type="url"
                  placeholder="https://exemple.com/fichier.pdf"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="mt-2"
                />
              </div>

              {fileUrl && (
                <div>
                  <Label htmlFor="filename">Nom du fichier</Label>
                  <Input
                    id="filename"
                    type="text"
                    placeholder="document.pdf"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="mt-2"
                  />
                </div>
              )}

              <div>
                <Label>Type d&apos;affichage</Label>
                <RadioGroup value={fileType} onValueChange={(v) => setFileType(v as 'inline' | 'button')} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inline" id="file-inline" />
                    <Label htmlFor="file-inline" className="font-normal cursor-pointer">
                      Miniature (afficher une carte avec l&apos;icône du fichier)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="button" id="file-button" />
                    <Label htmlFor="file-button" className="font-normal cursor-pointer">
                      Bouton (afficher seulement un bouton cliquable)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {fileType === 'button' && (
                <div>
                  <Label htmlFor="file-label">Texte du bouton</Label>
                  <Input
                    id="file-label"
                    type="text"
                    placeholder="Voir"
                    value={fileLabel}
                    onChange={(e) => setFileLabel(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Par exemple : "Télécharger le PDF", "Voir le document", "Ouvrir le fichier"
                  </p>
                </div>
              )}

              <Button onClick={handleFileInsert} disabled={!fileUrl} className="w-full">
                Insérer le fichier
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <EditorContent 
        editor={editor} 
        className={`p-4 min-h-[300px] focus:outline-none 
          [&_.mention]:cursor-pointer [&_.mention]:text-primary [&_.mention]:font-medium [&_.mention]:hover:underline
          [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2
          [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2
          [&_li]:my-1
          [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:my-4 [&_h1]:block
          [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:my-3 [&_h2]:block
          [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:my-2 [&_h3]:block
          [&_p]:text-base [&_p]:my-2 [&_p]:block
          [&_table]:w-full [&_table]:my-4
          [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2
          [&_table.table-no-borders]:border-0 [&_table.table-no-borders_td]:border-0 [&_table.table-no-borders_th]:border-0`}
      />
      <div className="text-xs text-muted-foreground px-4 pb-2">
        💡 Tapez @ pour créer des liens vers d&apos;autres sections
      </div>
    </div>
  );
}

/**
 * DocumentDetailsDialog - Adaptive dialog for document metadata entry
 * Wizard mode for 1-3 files, Table mode for 4+ files
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { type RAGContextType } from '@/lib/rag-michu';

const CONTEXT_OPTIONS: { value: RAGContextType; label: string }[] = [
  { value: 'auto', label: 'Auto-détection' },
  { value: 'apogee', label: 'Apogée' },
  { value: 'apporteurs', label: 'Apporteurs' },
  { value: 'helpconfort', label: 'HelpConfort' },
  { value: 'metier', label: 'Métiers' },
  { value: 'franchise', label: 'Franchise' },
  { value: 'documents', label: 'Documents' },
];

export interface DocumentMetadata {
  file: File;
  title: string;
  contextType: RAGContextType;
  description: string;
}

interface DocumentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: File[];
  defaultContext: RAGContextType;
  onConfirm: (documents: DocumentMetadata[]) => void;
}

const WIZARD_THRESHOLD = 3;

export function DocumentDetailsDialog({
  open,
  onOpenChange,
  files,
  defaultContext,
  onConfirm,
}: DocumentDetailsDialogProps) {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset documents state when files change or dialog opens
  useEffect(() => {
    if (open && files.length > 0) {
      setDocuments(
        files.map(file => ({
          file,
          title: file.name.replace(/\.[^/.]+$/, ''),
          contextType: defaultContext,
          description: '',
        }))
      );
      setCurrentIndex(0);
    }
  }, [open, files, defaultContext]);

  const isWizardMode = files.length <= WIZARD_THRESHOLD;

  const updateDocument = (index: number, field: keyof DocumentMetadata, value: string) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, [field]: value } : doc
    ));
  };

  const handleConfirm = () => {
    onConfirm(documents);
    onOpenChange(false);
  };

  const canGoNext = currentIndex < files.length - 1;
  const canGoPrev = currentIndex > 0;
  const isLastStep = currentIndex === files.length - 1;

  // Wizard Mode UI
  const renderWizard = () => {
    const doc = documents[currentIndex];
    if (!doc) return null;

    return (
      <div className="space-y-4">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {files.map((_, idx) => (
            <div
              key={idx}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                idx === currentIndex 
                  ? 'bg-primary' 
                  : idx < currentIndex 
                    ? 'bg-primary/50' 
                    : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* File info */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{doc.file.name}</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {(doc.file.size / 1024).toFixed(1)} KB
          </Badge>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={doc.title}
              onChange={(e) => updateDocument(currentIndex, 'title', e.target.value)}
              placeholder="Titre du document"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Famille</Label>
            <Select
              value={doc.contextType}
              onValueChange={(v) => updateDocument(currentIndex, 'contextType', v as RAGContextType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTEXT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={doc.description}
              onChange={(e) => updateDocument(currentIndex, 'description', e.target.value)}
              placeholder="Description du contenu..."
              rows={3}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(prev => prev - 1)}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Précédent
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {files.length}
          </span>

          {isLastStep ? (
            <Button onClick={handleConfirm}>
              <Check className="w-4 h-4 mr-1" />
              Confirmer
            </Button>
          ) : (
            <Button onClick={() => setCurrentIndex(prev => prev + 1)}>
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Table Mode UI
  const renderTable = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {files.length} fichiers à configurer. Modifiez les informations ci-dessous.
      </p>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {documents.map((doc, idx) => (
            <div key={idx} className="p-3 border rounded-lg space-y-3 bg-card">
              {/* File header */}
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate flex-1">{doc.file.name}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {(doc.file.size / 1024).toFixed(0)} KB
                </Badge>
              </div>

              {/* Inline fields */}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <Input
                    value={doc.title}
                    onChange={(e) => updateDocument(idx, 'title', e.target.value)}
                    placeholder="Titre"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <Select
                    value={doc.contextType}
                    onValueChange={(v) => updateDocument(idx, 'contextType', v as RAGContextType)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTEXT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Input
                    value={doc.description}
                    onChange={(e) => updateDocument(idx, 'description', e.target.value)}
                    placeholder="Description..."
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          <X className="w-4 h-4 mr-1" />
          Annuler
        </Button>
        <Button onClick={handleConfirm}>
          <Check className="w-4 h-4 mr-1" />
          Confirmer {files.length} fichiers
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isWizardMode ? 'max-w-md' : 'max-w-3xl'}>
        <DialogHeader>
          <DialogTitle>
            {isWizardMode 
              ? `Document ${currentIndex + 1}/${files.length}` 
              : 'Configuration des documents'
            }
          </DialogTitle>
          <DialogDescription>
            {isWizardMode 
              ? 'Renseignez les informations pour chaque document' 
              : 'Renseignez les informations pour tous les documents'
            }
          </DialogDescription>
        </DialogHeader>

        {isWizardMode ? renderWizard() : renderTable()}
      </DialogContent>
    </Dialog>
  );
}

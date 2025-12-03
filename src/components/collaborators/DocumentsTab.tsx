/**
 * Onglet Documents RH - Phase 2.1
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  File,
} from 'lucide-react';
import { useCollaboratorDocuments } from '@/hooks/useCollaboratorDocuments';
import { toast } from 'sonner';
import {
  CollaboratorDocument,
  DocumentType,
  DocumentVisibility,
  DOCUMENT_TYPES,
  DOCUMENT_VISIBILITY,
} from '@/types/collaboratorDocument';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useDropzone } from 'react-dropzone';

interface DocumentsTabProps {
  collaboratorId: string;
  canManage: boolean;
}

export function DocumentsTab({ collaboratorId, canManage }: DocumentsTabProps) {
  const {
    documents,
    isLoading,
    uploadDocument,
    deleteDocument,
    downloadDocument,
  } = useCollaboratorDocuments(collaboratorId);

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<CollaboratorDocument | null>(null);

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocTypeLabel = (type: DocumentType) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const groupedDocuments = documents.reduce((acc, doc) => {
    const type = doc.doc_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<DocumentType, CollaboratorDocument[]>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Chargement des documents...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents RH
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setShowUploadDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un document
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun document pour ce collaborateur.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedDocuments).map(([type, docs]) => (
                <div key={type}>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    {getDocTypeLabel(type as DocumentType)}
                    <Badge variant="secondary">{docs.length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{doc.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{formatDate(doc.created_at)}</span>
                              <span>·</span>
                              <span>{formatFileSize(doc.file_size)}</span>
                              {doc.period_month && doc.period_year && (
                                <>
                                  <span>·</span>
                                  <span>{`${doc.period_month}/${doc.period_year}`}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={doc.visibility === 'EMPLOYEE_VISIBLE' ? 'default' : 'secondary'}
                            className="flex items-center gap-1"
                          >
                            {doc.visibility === 'EMPLOYEE_VISIBLE' ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                            {doc.visibility === 'EMPLOYEE_VISIBLE' ? 'Visible' : 'Privé'}
                          </Badge>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDocumentToDelete(doc)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <UploadDocumentDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        collaboratorId={collaboratorId}
        onUpload={uploadDocument.mutateAsync}
        isUploading={uploadDocument.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le document "{documentToDelete?.title}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (documentToDelete) {
                  deleteDocument.mutate(documentToDelete);
                  setDocumentToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Upload Dialog Component
interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorId: string;
  onUpload: (data: any) => Promise<any>;
  isUploading: boolean;
}

function UploadDocumentDialog({
  open,
  onOpenChange,
  collaboratorId,
  onUpload,
  isUploading,
}: UploadDocumentDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    doc_type: 'OTHER' as DocumentType,
    title: '',
    description: '',
    period_month: '',
    period_year: '',
    visibility: 'ADMIN_ONLY' as DocumentVisibility,
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      if (!formData.title) {
        setFormData((prev) => ({ ...prev, title: f.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  }, [formData.title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const handleSubmit = async () => {
    if (!file) return;

    // Validation taille fichier (max 10 Mo)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('Fichier trop volumineux (max 10 Mo)');
      return;
    }

    // Validation champs obligatoires
    if (!formData.title.trim()) {
      toast.error('Le titre est obligatoire');
      return;
    }

    // Validation période pour bulletins de paie
    if (formData.doc_type === 'PAYSLIP' && (!formData.period_month || !formData.period_year)) {
      toast.error('La période (mois/année) est obligatoire pour les bulletins de paie');
      return;
    }

    await onUpload({
      collaborator_id: collaboratorId,
      doc_type: formData.doc_type,
      title: formData.title.trim(),
      description: formData.description || undefined,
      period_month: formData.period_month ? parseInt(formData.period_month) : undefined,
      period_year: formData.period_year ? parseInt(formData.period_year) : undefined,
      visibility: formData.visibility,
      file,
    });

    // Reset form
    setFile(null);
    setFormData({
      doc_type: 'OTHER',
      title: '',
      description: '',
      period_month: '',
      period_year: '',
      visibility: 'ADMIN_ONLY',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {file ? (
              <p className="font-medium">{file.name}</p>
            ) : (
              <p className="text-muted-foreground">
                Glissez un fichier ici ou cliquez pour sélectionner
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              PDF, images ou documents Word (max 10 MB)
            </p>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de document *</Label>
              <Select
                value={formData.doc_type}
                onValueChange={(v) => setFormData({ ...formData, doc_type: v as DocumentType })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Visibilité *</Label>
              <Select
                value={formData.visibility}
                onValueChange={(v) => setFormData({ ...formData, visibility: v as DocumentVisibility })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {DOCUMENT_VISIBILITY.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Bulletin de paie janvier 2024"
            />
          </div>

          {formData.doc_type === 'PAYSLIP' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mois</Label>
                <Select
                  value={formData.period_month}
                  onValueChange={(v) => setFormData({ ...formData, period_month: v })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Mois" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {new Date(2024, i).toLocaleString('fr-FR', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Année</Label>
                <Input
                  type="number"
                  value={formData.period_year}
                  onChange={(e) => setFormData({ ...formData, period_year: e.target.value })}
                  placeholder={new Date().getFullYear().toString()}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Description (optionnel)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Notes additionnelles..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isUploading || !file || !formData.title}
          >
            {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

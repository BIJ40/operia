/**
 * AgencyAdminDocuments - Gestionnaire des documents administratifs de l'agence
 * Documents récurrents demandés par les clients (Kbis, RC, RIB, etc.)
 */

import { useState, useRef } from 'react';
import { format, differenceInDays, parseISO, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  File,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { cn } from '@/lib/utils';
import {
  useAgencyAdminDocuments,
  useUploadAgencyAdminDocument,
  useDeleteAgencyAdminDocument,
  useDownloadAgencyAdminDocument,
  ADMIN_DOCUMENT_TYPES,
  type AgencyAdminDocument,
} from '@/hooks/useAgencyAdminDocuments';

interface DocumentCardProps {
  docType: (typeof ADMIN_DOCUMENT_TYPES)[number];
  document?: AgencyAdminDocument;
  onUpload: (docType: string, label: string) => void;
  onDownload: (doc: AgencyAdminDocument) => void;
  onDelete: (doc: AgencyAdminDocument) => void;
  onPreview: (doc: AgencyAdminDocument) => void;
}

function getExpiryStatus(expiryDate: string | null): {
  status: 'ok' | 'warning' | 'expired' | 'none';
  label: string;
  daysLeft?: number;
} {
  if (!expiryDate) return { status: 'none', label: 'Sans expiration' };

  const expiry = parseISO(expiryDate);
  const daysLeft = differenceInDays(expiry, new Date());

  if (daysLeft < 0) {
    return { status: 'expired', label: 'Expiré', daysLeft };
  }
  if (daysLeft <= 30) {
    return { status: 'warning', label: `Expire dans ${daysLeft} jours`, daysLeft };
  }
  return { status: 'ok', label: `Valide jusqu'au ${format(expiry, 'dd/MM/yyyy')}`, daysLeft };
}

function DocumentCard({
  docType,
  document,
  onUpload,
  onDownload,
  onDelete,
  onPreview,
}: DocumentCardProps) {
  const hasDocument = !!document?.file_path;
  const expiryInfo = document ? getExpiryStatus(document.expiry_date) : null;

  const statusColors = {
    ok: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    none: 'bg-muted text-muted-foreground',
  };

  const StatusIcon = {
    ok: CheckCircle2,
    warning: Clock,
    expired: AlertTriangle,
    none: FileText,
  }[expiryInfo?.status || 'none'];

  return (
    <Card
      className={cn(
        'relative transition-all duration-200 hover:shadow-md',
        hasDocument ? 'border-border' : 'border-dashed border-muted-foreground/30'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                hasDocument
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <File className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{docType.label}</CardTitle>
              {document?.file_name && (
                <CardDescription className="text-xs truncate max-w-[180px]">
                  {document.file_name}
                </CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {hasDocument && expiryInfo && docType.requiresExpiry && (
          <Badge variant="secondary" className={cn('gap-1', statusColors[expiryInfo.status])}>
            <StatusIcon className="w-3 h-3" />
            {expiryInfo.label}
          </Badge>
        )}

        {hasDocument && document.uploaded_at && (
          <p className="text-xs text-muted-foreground">
            Mis à jour le {format(parseISO(document.uploaded_at), 'dd MMM yyyy', { locale: fr })}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          {hasDocument ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onPreview(document)}
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                Voir
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onDownload(document)}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Télécharger
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(document)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onUpload(docType.id, docType.label)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Ajouter
            </Button>
          )}
        </div>

        {hasDocument && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => onUpload(docType.id, docType.label)}
          >
            <Upload className="w-3 h-3 mr-1" />
            Remplacer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function AgencyAdminDocuments() {
  const { data: documents = [], isLoading } = useAgencyAdminDocuments();
  const uploadMutation = useUploadAgencyAdminDocument();
  const deleteMutation = useDeleteAgencyAdminDocument();
  const downloadMutation = useDownloadAgencyAdminDocument();

  const [uploadDialog, setUploadDialog] = useState<{
    open: boolean;
    docType: string;
    label: string;
  }>({ open: false, docType: '', label: '' });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    document: AgencyAdminDocument | null;
  }>({ open: false, document: null });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get document by type
  const getDocumentByType = (type: string) => {
    return documents.find((d) => d.document_type === type);
  };

  // Handle upload
  const handleUploadClick = (docType: string, label: string) => {
    setUploadDialog({ open: true, docType, label });
    setSelectedFile(null);
    setExpiryDate('');
    setNotes('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-set expiry to 3 months for Kbis
      if (uploadDialog.docType === 'kbis') {
        setExpiryDate(format(addMonths(new Date(), 3), 'yyyy-MM-dd'));
      }
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    await uploadMutation.mutateAsync({
      file: selectedFile,
      documentType: uploadDialog.docType,
      label: uploadDialog.label,
      expiryDate: expiryDate || undefined,
      notes: notes || undefined,
    });

    setUploadDialog({ open: false, docType: '', label: '' });
  };

  // Handle download
  const handleDownload = async (doc: AgencyAdminDocument) => {
    if (!doc.file_path) return;

    const url = await downloadMutation.mutateAsync(doc.file_path);
    window.open(url, '_blank');
  };

  // Handle preview
  const handlePreview = async (doc: AgencyAdminDocument) => {
    if (!doc.file_path) return;

    const url = await downloadMutation.mutateAsync(doc.file_path);
    setPreviewUrl(url);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteDialog.document) return;

    await deleteMutation.mutateAsync(deleteDialog.document.id);
    setDeleteDialog({ open: false, document: null });
  };

  // Count expired and expiring documents
  const expiringCount = documents.filter((d) => {
    if (!d.expiry_date) return false;
    const status = getExpiryStatus(d.expiry_date);
    return status.status === 'warning' || status.status === 'expired';
  }).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Documents administratifs</h2>
          <p className="text-sm text-muted-foreground">
            Documents récurrents demandés par vos clients
          </p>
        </div>

        {expiringCount > 0 && (
          <Badge variant="destructive" className="gap-1 w-fit">
            <AlertTriangle className="w-3.5 h-3.5" />
            {expiringCount} document{expiringCount > 1 ? 's' : ''} à renouveler
          </Badge>
        )}
      </div>

      {/* Document grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {ADMIN_DOCUMENT_TYPES.map((docType) => (
          <DocumentCard
            key={docType.id}
            docType={docType}
            document={getDocumentByType(docType.id)}
            onUpload={handleUploadClick}
            onDownload={handleDownload}
            onDelete={(doc) => setDeleteDialog({ open: true, document: doc })}
            onPreview={handlePreview}
          />
        ))}
      </div>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialog.open}
        onOpenChange={(open) => setUploadDialog({ ...uploadDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {getDocumentByType(uploadDialog.docType) ? 'Remplacer' : 'Ajouter'}{' '}
              {uploadDialog.label}
            </DialogTitle>
            <DialogDescription>
              Sélectionnez le fichier à téléverser
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File input */}
            <div className="space-y-2">
              <Label>Fichier</Label>
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
                  'hover:border-primary hover:bg-primary/5',
                  selectedFile && 'border-primary bg-primary/5'
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Cliquez pour sélectionner un fichier
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, JPG ou PNG</p>
                  </div>
                )}
              </div>
            </div>

            {/* Expiry date */}
            {ADMIN_DOCUMENT_TYPES.find((t) => t.id === uploadDialog.docType)?.requiresExpiry && (
              <div className="space-y-2">
                <Label htmlFor="expiry">Date d'expiration</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="expiry"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations complémentaires..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialog({ open: false, docType: '', label: '' })}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUploadSubmit}
              disabled={!selectedFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Envoi...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le fichier sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Aperçu du document</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe src={previewUrl} className="w-full h-full rounded-lg" title="Document preview" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

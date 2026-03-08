/**
 * RagIngestionTab - P2#4 Advanced Ingestion Pipeline UI
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Play, 
  RefreshCw,
  Trash2,
  FolderUp,
} from 'lucide-react';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { 
  createIngestionJob, 
  getIngestionJobs, 
  getIngestionDocuments, 
  startProcessingJob,
  retryDocument,
  deleteIngestionJob,
  type IngestionJob,
  type IngestionDocument,
  type UploadedFile,
} from '@/lib/rag-ingestion';
import { type RAGContextType } from '@/lib/rag-michu';
import { successToast, errorToast, warningToast } from '@/lib/toastHelpers';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DocumentDetailsDialog, type DocumentMetadata } from './DocumentDetailsDialog';

const CONTEXT_OPTIONS: { value: RAGContextType; label: string }[] = [
  { value: 'auto', label: 'Auto-détection' },
  { value: 'apogee', label: 'Apogée' },
  { value: 'apporteurs', label: 'Apporteurs' },
  { value: 'helpconfort', label: 'HelpConfort' },
  { value: 'metier', label: 'Métiers' },
  { value: 'franchise', label: 'Franchise' },
  { value: 'documents', label: 'Documents' },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    pending: { variant: 'secondary', icon: <Clock className="w-3 h-3" /> },
    processing: { variant: 'default', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    completed: { variant: 'outline', icon: <CheckCircle2 className="w-3 h-3 text-green-500" /> },
    failed: { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
  };

  const { variant, icon } = config[status] || config.pending;

  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      {status}
    </Badge>
  );
}

export function HelpiIngestionTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [globalContext, setGlobalContext] = useState<RAGContextType>('auto');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  
  // Dialog state for document details
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Fetch jobs
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['rag-ingestion-jobs'],
    queryFn: () => getIngestionJobs(20),
    refetchInterval: 5000, // Poll every 5s for updates
  });

  // Fetch documents for selected job
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['rag-ingestion-docs', selectedJobId],
    queryFn: () => selectedJobId ? getIngestionDocuments(selectedJobId) : Promise.resolve([]),
    enabled: !!selectedJobId,
    refetchInterval: selectedJobId ? 3000 : false,
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      return createIngestionJob(selectedFiles, user.id);
    },
    onSuccess: (result) => {
      if (result.success && result.jobId) {
        successToast(`Job ${result.jobId.slice(0, 8)} créé avec ${selectedFiles.length} documents`);
        setSelectedFiles([]);
        setSelectedJobId(result.jobId);
        queryClient.invalidateQueries({ queryKey: ['rag-ingestion-jobs'] });
      } else {
        errorToast(result.error || 'Impossible de créer le job');
      }
    },
    onError: (error) => {
      errorToast(error instanceof Error ? error.message : 'Erreur inconnue');
    },
  });

  // Start processing mutation
  const startProcessingMutation = useMutation({
    mutationFn: (jobId: string) => startProcessingJob(jobId),
    onSuccess: (result, jobId) => {
      if (result.success) {
        successToast(`Job ${jobId.slice(0, 8)} en cours de traitement`);
        queryClient.invalidateQueries({ queryKey: ['rag-ingestion-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['rag-ingestion-docs', jobId] });
      } else {
        errorToast(result.error || 'Impossible de lancer le traitement');
      }
    },
  });

  // Retry document mutation
  const retryDocMutation = useMutation({
    mutationFn: (docId: string) => retryDocument(docId),
    onSuccess: (result) => {
      if (result.success) {
        successToast('Document relancé');
        queryClient.invalidateQueries({ queryKey: ['rag-ingestion-docs', selectedJobId] });
      } else {
        errorToast(result.error || 'Impossible de relancer');
      }
    },
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: (jobId: string) => deleteIngestionJob(jobId),
    onSuccess: (result, jobId) => {
      if (result.success) {
        successToast('Job supprimé');
        if (selectedJobId === jobId) setSelectedJobId(null);
        queryClient.invalidateQueries({ queryKey: ['rag-ingestion-jobs'] });
      } else {
        errorToast(result.error || 'Impossible de supprimer');
      }
    },
  });

  // Dropzone - opens dialog for metadata entry (max 10 files)
  const MAX_FILES_PER_UPLOAD = 10;
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    if (acceptedFiles.length > MAX_FILES_PER_UPLOAD) {
      warningToast(
        `Maximum ${MAX_FILES_PER_UPLOAD} fichiers`,
        `Seuls les ${MAX_FILES_PER_UPLOAD} premiers fichiers ont été conservés.`
      );
    }
    
    setPendingFiles(acceptedFiles.slice(0, MAX_FILES_PER_UPLOAD));
    setShowDetailsDialog(true);
  }, []);

  // Handle dialog confirmation
  const handleDocumentsConfirm = useCallback((documents: DocumentMetadata[]) => {
    const newFiles: UploadedFile[] = documents.map(doc => ({
      file: doc.file,
      contextType: doc.contextType,
      title: doc.title,
      description: doc.description,
    }));
    setSelectedFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES_PER_UPLOAD));
    setPendingFiles([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    maxFiles: MAX_FILES_PER_UPLOAD,
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const progressPercent = selectedJob && selectedJob.total_documents > 0
    ? Math.round((selectedJob.processed_documents / selectedJob.total_documents) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderUp className="h-5 w-5" />
            Upload Documents
          </CardTitle>
        <CardDescription>
            Glissez-déposez jusqu'à 10 fichiers (PDF, DOCX, PPTX, TXT, MD)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Context selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Contexte par défaut:</span>
            <Select value={globalContext} onValueChange={(v) => setGlobalContext(v as RAGContextType)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTEXT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary">Déposez les fichiers ici...</p>
            ) : (
              <div>
                <p className="font-medium">Glissez-déposez des fichiers ici</p>
                <p className="text-sm text-muted-foreground mt-1">ou cliquez pour sélectionner</p>
              </div>
            )}
          </div>

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{selectedFiles.length} fichier(s) prêt(s)</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {selectedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium truncate block">{f.title || f.file.name}</span>
                        {f.description && (
                          <span className="text-xs text-muted-foreground truncate block">{f.description}</span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{f.contextType}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(idx)}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button 
                onClick={() => createJobMutation.mutate()} 
                disabled={createJobMutation.isPending}
                className="w-full"
              >
                {createJobMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Créer le job d'ingestion
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Jobs d'ingestion</span>
            <Button variant="outline" size="sm" onClick={() => refetchJobs()} disabled={jobsLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${jobsLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun job d'ingestion</p>
          ) : (
            <div className="space-y-2">
              {jobs.map(job => (
                <div
                  key={job.id}
                  className={`
                    p-3 rounded-lg border cursor-pointer
                    transition-colors hover:bg-muted/50
                    ${selectedJobId === job.id ? 'border-primary bg-primary/5' : 'border-border'}
                  `}
                  onClick={() => setSelectedJobId(job.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={job.status} />
                      <div>
                        <p className="text-sm font-medium">
                          Job #{job.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(job.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          {' • '}
                          {job.processed_documents}/{job.total_documents} documents
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startProcessingMutation.mutate(job.id);
                          }}
                          disabled={startProcessingMutation.isPending}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Supprimer ce job et tous ses documents ?')) {
                            deleteJobMutation.mutate(job.id);
                          }
                        }}
                        disabled={deleteJobMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {/* Document names inline */}
                  {job.document_names && job.document_names.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {job.document_names.map((name, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs font-normal">
                          <FileText className="w-3 h-3 mr-1" />
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Job Details */}
      {selectedJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusBadge status={selectedJob.status} />
              Job #{selectedJob.id.slice(0, 8)}
            </CardTitle>
            <CardDescription>
              Créé le {format(new Date(selectedJob.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            {selectedJob.status === 'processing' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progression</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} />
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded">
                <p className="text-2xl font-bold">{selectedJob.total_documents}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded">
                <p className="text-2xl font-bold text-green-600">{selectedJob.processed_documents}</p>
                <p className="text-xs text-muted-foreground">Traités</p>
              </div>
              <div className="text-center p-3 bg-destructive/10 rounded">
                <p className="text-2xl font-bold text-destructive">{selectedJob.error_count}</p>
                <p className="text-xs text-muted-foreground">Erreurs</p>
              </div>
            </div>

            {/* Documents list */}
            <div>
              <h4 className="text-sm font-medium mb-2">Documents</h4>
              {docsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun document</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <StatusBadge status={doc.status} />
                        <div className="min-w-0 flex-1">
                          <span className="truncate block font-medium">{doc.title || doc.filename}</span>
                          {doc.title && doc.title !== doc.filename && (
                            <span className="truncate block text-xs text-muted-foreground">{doc.filename}</span>
                          )}
                        </div>
                        {doc.detected_context && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {doc.detected_context}
                          </Badge>
                        )}
                        {doc.chunk_count > 0 && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {doc.chunk_count} chunks
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.status === 'failed' && (
                          <>
                            <span className="text-xs text-destructive max-w-32 truncate" title={doc.error_message || ''}>
                              {doc.error_message}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => retryDocMutation.mutate(doc.id)}
                              disabled={retryDocMutation.isPending}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Details Dialog */}
      <DocumentDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        files={pendingFiles}
        defaultContext={globalContext}
        onConfirm={handleDocumentsConfirm}
      />
    </div>
  );
}

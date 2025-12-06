/**
 * RAG Ingestion Service - P2#4
 * Pipeline d'ingestion avancée pour documents RAG
 */

import { supabase } from '@/integrations/supabase/client';
import { safeQuery, safeMutation, safeInvoke } from '@/lib/safeQuery';
import { logDebug, logError, logInfo, logWarn } from '@/lib/logger';
import { detectContextFromText, chunkText, type RAGContextType } from '@/lib/rag-michu';

// ============ TYPES ============

export interface IngestionJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_documents: number;
  processed_documents: number;
  error_count: number;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
}

export interface IngestionDocument {
  id: string;
  job_id: string;
  filename: string;
  title: string | null;
  file_path: string | null;
  file_size: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count: number;
  context_type: string;
  detected_context: string | null;
  apporteur_code: string | null;
  univers_code: string | null;
  role_cible: string | null;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  file: File;
  contextType?: RAGContextType;
  title?: string;
  description?: string;
  apporteurCode?: string;
  universCode?: string;
  roleCible?: string;
}

export interface IngestionStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalDocuments: number;
  documentsThisMonth: number;
  avgProcessingTime: number; // in seconds
}

// ============ JOB MANAGEMENT ============

/**
 * Create a new ingestion job
 */
export async function createIngestionJob(
  files: UploadedFile[],
  userId: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  logInfo('rag-ingestion', `Creating ingestion job for ${files.length} files`);

  // Create job record
  const jobResult = await safeMutation<{ id: string }[]>(
    supabase
      .from('rag_index_jobs')
      .insert({
        status: 'pending',
        total_documents: files.length,
        processed_documents: 0,
        error_count: 0,
        created_by: userId,
        metadata: {
          fileNames: files.map(f => f.file.name),
          createdAt: new Date().toISOString(),
        },
      })
      .select('id'),
    'RAG_INGESTION_CREATE_JOB'
  );

  if (!jobResult.success || !jobResult.data?.[0]?.id) {
    logError('rag-ingestion', 'Failed to create job', jobResult.error);
    return { success: false, error: 'Impossible de créer le job' };
  }

  const jobId = jobResult.data[0].id;
  logDebug('rag-ingestion', `Job created: ${jobId}`);

  // Upload files and create document records
  for (const uploadedFile of files) {
    const { file, contextType, apporteurCode, universCode, roleCible } = uploadedFile;
    
    // Upload to storage
    const filePath = `jobs/${jobId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('rag-uploads')
      .upload(filePath, file);

    if (uploadError) {
      logWarn('rag-ingestion', `Failed to upload ${file.name}`, uploadError);
    }

    // Create document record
    await safeMutation(
      supabase.from('rag_index_documents').insert({
        job_id: jobId,
        filename: file.name,
        title: uploadedFile.title || null,
        file_path: uploadError ? null : filePath,
        file_size: file.size,
        status: 'pending',
        context_type: contextType || 'auto',
        apporteur_code: apporteurCode || null,
        univers_code: universCode || null,
        role_cible: roleCible || null,
      }),
      'RAG_INGESTION_CREATE_DOC'
    );
  }

  logInfo('rag-ingestion', `Job ${jobId} created with ${files.length} documents`);
  return { success: true, jobId };
}

/**
 * Get job details
 */
export async function getIngestionJob(jobId: string): Promise<IngestionJob | null> {
  const result = await safeQuery<IngestionJob[]>(
    supabase
      .from('rag_index_jobs')
      .select('*')
      .eq('id', jobId),
    'RAG_INGESTION_GET_JOB'
  );

  return result.data?.[0] || null;
}

/**
 * Get all jobs (paginated)
 */
export async function getIngestionJobs(limit = 20): Promise<IngestionJob[]> {
  const result = await safeQuery<IngestionJob[]>(
    supabase
      .from('rag_index_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit),
    'RAG_INGESTION_LIST_JOBS'
  );

  return result.data || [];
}

/**
 * Get documents for a job
 */
export async function getIngestionDocuments(jobId: string): Promise<IngestionDocument[]> {
  const result = await safeQuery<IngestionDocument[]>(
    supabase
      .from('rag_index_documents')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true }),
    'RAG_INGESTION_GET_DOCS'
  );

  return result.data || [];
}

// ============ PROCESSING ============

/**
 * Start processing a job
 */
export async function startProcessingJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  logInfo('rag-ingestion', `Starting processing for job ${jobId}`);

  // Update job status
  await safeMutation(
    supabase
      .from('rag_index_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', jobId),
    'RAG_INGESTION_START_JOB'
  );

  // Get documents to process
  const documents = await getIngestionDocuments(jobId);
  const pendingDocs = documents.filter(d => d.status === 'pending' || d.status === 'failed');

  if (pendingDocs.length === 0) {
    logWarn('rag-ingestion', 'No pending documents to process');
    return { success: true };
  }

  let processedCount = 0;
  let errorCount = 0;

  for (const doc of pendingDocs) {
    try {
      await processDocument(doc);
      processedCount++;
    } catch (error) {
      errorCount++;
      logError('rag-ingestion', `Failed to process ${doc.filename}`, error);
      
      await safeMutation(
        supabase
          .from('rag_index_documents')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', doc.id),
        'RAG_INGESTION_DOC_FAIL'
      );
    }

    // Update job progress
    await safeMutation(
      supabase
        .from('rag_index_jobs')
        .update({
          processed_documents: processedCount,
          error_count: errorCount,
        })
        .eq('id', jobId),
      'RAG_INGESTION_UPDATE_PROGRESS'
    );
  }

  // Finalize job
  const finalStatus = errorCount === pendingDocs.length ? 'failed' : 'completed';
  await safeMutation(
    supabase
      .from('rag_index_jobs')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId),
    'RAG_INGESTION_COMPLETE_JOB'
  );

  logInfo('rag-ingestion', `Job ${jobId} completed: ${processedCount} processed, ${errorCount} errors`);
  return { success: true };
}

/**
 * Process a single document
 */
async function processDocument(doc: IngestionDocument): Promise<void> {
  logDebug('rag-ingestion', `Processing document: ${doc.filename}`);

  // Update status to processing
  await safeMutation(
    supabase
      .from('rag_index_documents')
      .update({ status: 'processing' })
      .eq('id', doc.id),
    'RAG_INGESTION_DOC_PROCESSING'
  );

  // Get file content
  let rawText = '';
  
  if (doc.file_path) {
    // Download and parse file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('rag-uploads')
      .download(doc.file_path);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Use parse-document edge function for complex files
    const extension = doc.filename.split('.').pop()?.toLowerCase();
    
    if (['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx'].includes(extension || '')) {
      logDebug('rag-ingestion', `Calling parse-document for ${doc.filename} (${extension})`);
      
      const parseResult = await safeInvoke<{ text?: string; content?: string; raw_text?: string; metadata?: Record<string, unknown> }>(
        supabase.functions.invoke('parse-document', {
          body: { 
            filePath: doc.file_path,
            bucket: 'rag-uploads',
          },
        }),
        'RAG_INGESTION_PARSE'
      );

      logDebug('rag-ingestion', `Parse result for ${doc.filename}:`, {
        success: parseResult.success,
        hasText: !!parseResult.data?.text,
        hasContent: !!parseResult.data?.content,
        hasRawText: !!parseResult.data?.raw_text,
        textLength: parseResult.data?.text?.length || parseResult.data?.content?.length || parseResult.data?.raw_text?.length || 0,
      });

      // Accept any of the text field variants
      const extractedText = parseResult.data?.text || parseResult.data?.content || parseResult.data?.raw_text;
      
      if (parseResult.success && extractedText) {
        rawText = extractedText;
      } else {
        throw new Error(`Failed to parse document: ${parseResult.error || 'No text extracted'}`);
      }
    } else {
      // Plain text file
      rawText = await fileData.text();
    }
  }

  if (!rawText.trim()) {
    throw new Error('Empty document content');
  }

  // Detect context if auto
  let detectedContext: RAGContextType = doc.context_type as RAGContextType;
  if (doc.context_type === 'auto') {
    detectedContext = detectContextFromText(rawText);
  }

  // Chunk the text
  const chunks = chunkText(rawText, {
    maxChunkSize: 1500,
    overlap: 200,
  });

  if (chunks.length === 0) {
    throw new Error('No chunks generated');
  }

  logDebug('rag-ingestion', `Generated ${chunks.length} chunks for ${doc.filename}`);

  // Map context to block_type
  const blockTypeMap: Record<RAGContextType, string> = {
    apogee: 'apogee_guide',
    apporteurs: 'apporteur_guide',
    helpconfort: 'helpconfort_guide',
    documents: 'document',
    metier: 'metier_guide',
    franchise: 'franchise_guide',
    auto: 'document',
  };

  const blockType = blockTypeMap[detectedContext] || 'document';

  // Insert chunks into guide_chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Generate embedding via edge function
    const embeddingResult = await safeInvoke<{ embedding: number[] }>(
      supabase.functions.invoke('generate-embeddings', {
        body: { text: chunk },
      }),
      'RAG_INGESTION_EMBED'
    );

    if (!embeddingResult.success || !embeddingResult.data?.embedding) {
      logWarn('rag-ingestion', `Failed to generate embedding for chunk ${i}`);
      continue;
    }

    // Insert chunk
    await safeMutation(
      supabase.from('guide_chunks').insert([{
        block_id: doc.id,
        block_slug: doc.filename.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
        block_title: doc.filename,
        block_type: blockType,
        chunk_index: i,
        chunk_text: chunk,
        context_type: detectedContext,
        embedding: embeddingResult.data.embedding,
        metadata: {
          source: 'ingestion',
          family: detectedContext,
          filename: doc.filename,
          apporteur_code: doc.apporteur_code,
          univers_code: doc.univers_code,
          role_cible: doc.role_cible,
          job_id: doc.job_id,
        },
      }]),
      'RAG_INGESTION_INSERT_CHUNK'
    );
  }

  // Update document as completed
  await safeMutation(
    supabase
      .from('rag_index_documents')
      .update({
        status: 'completed',
        chunk_count: chunks.length,
        detected_context: detectedContext,
        processed_at: new Date().toISOString(),
      })
      .eq('id', doc.id),
    'RAG_INGESTION_DOC_COMPLETE'
  );

  logInfo('rag-ingestion', `Document ${doc.filename} processed: ${chunks.length} chunks`);
}

/**
 * Retry a failed document
 */
export async function retryDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  logInfo('rag-ingestion', `Retrying document ${documentId}`);

  const result = await safeQuery<IngestionDocument[]>(
    supabase
      .from('rag_index_documents')
      .select('*')
      .eq('id', documentId),
    'RAG_INGESTION_GET_DOC'
  );

  const doc = result.data?.[0];
  if (!doc) {
    return { success: false, error: 'Document not found' };
  }

  // Reset status
  await safeMutation(
    supabase
      .from('rag_index_documents')
      .update({ status: 'pending', error_message: null })
      .eq('id', documentId),
    'RAG_INGESTION_RESET_DOC'
  );

  // Delete existing chunks for this document
  await safeMutation(
    supabase
      .from('guide_chunks')
      .delete()
      .eq('block_id', documentId),
    'RAG_INGESTION_DELETE_CHUNKS'
  );

  try {
    await processDocument({ ...doc, status: 'pending', error_message: null });
    return { success: true };
  } catch (error) {
    logError('rag-ingestion', 'Retry failed', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============ STATS ============

/**
 * Get ingestion statistics
 */
export async function getIngestionStats(): Promise<IngestionStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Get job counts
  const jobsResult = await safeQuery<{ status: string; created_at: string; started_at: string | null; completed_at: string | null }[]>(
    supabase
      .from('rag_index_jobs')
      .select('status, created_at, started_at, completed_at'),
    'RAG_INGESTION_STATS_JOBS'
  );

  const jobs = jobsResult.data || [];
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const failedJobs = jobs.filter(j => j.status === 'failed').length;

  // Calculate average processing time
  const completedWithTimes = jobs.filter(j => j.started_at && j.completed_at);
  let avgProcessingTime = 0;
  if (completedWithTimes.length > 0) {
    const totalTime = completedWithTimes.reduce((acc, j) => {
      const start = new Date(j.started_at!).getTime();
      const end = new Date(j.completed_at!).getTime();
      return acc + (end - start);
    }, 0);
    avgProcessingTime = Math.round(totalTime / completedWithTimes.length / 1000);
  }

  // Get document counts
  const docsResult = await safeQuery<{ created_at: string }[]>(
    supabase
      .from('rag_index_documents')
      .select('created_at'),
    'RAG_INGESTION_STATS_DOCS'
  );

  const docs = docsResult.data || [];
  const totalDocuments = docs.length;
  const documentsThisMonth = docs.filter(d => d.created_at >= startOfMonth).length;

  return {
    totalJobs,
    completedJobs,
    failedJobs,
    totalDocuments,
    documentsThisMonth,
    avgProcessingTime,
  };
}

/**
 * Delete a job and its documents
 */
export async function deleteIngestionJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  logInfo('rag-ingestion', `Deleting job ${jobId}`);

  // Get documents to delete their chunks
  const docs = await getIngestionDocuments(jobId);
  
  // Delete chunks for all documents
  for (const doc of docs) {
    await safeMutation(
      supabase
        .from('guide_chunks')
        .delete()
        .eq('block_id', doc.id),
      'RAG_INGESTION_DELETE_DOC_CHUNKS'
    );
  }

  // Delete storage files
  const { data: files } = await supabase.storage
    .from('rag-uploads')
    .list(`jobs/${jobId}`);

  if (files && files.length > 0) {
    const filePaths = files.map(f => `jobs/${jobId}/${f.name}`);
    await supabase.storage.from('rag-uploads').remove(filePaths);
  }

  // Delete job (cascade will delete documents)
  const result = await safeMutation(
    supabase
      .from('rag_index_jobs')
      .delete()
      .eq('id', jobId),
    'RAG_INGESTION_DELETE_JOB'
  );

  if (!result.success) {
    return { success: false, error: result.error?.message };
  }

  return { success: true };
}

/**
 * AdminDocumentRepository — Typed Supabase queries for agency admin documents.
 */
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

export interface AdminDocumentRow {
  id: string;
  agency_id: string;
  document_type: string;
  label: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  expiry_date: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  updated_at: string | null;
  notes: string | null;
}

export async function listAdminDocuments(agencyId: string): Promise<AdminDocumentRow[]> {
  const { data, error } = await supabase
    .from('agency_admin_documents')
    .select('*')
    .eq('agency_id', agencyId)
    .order('document_type');

  if (error) {
    logError('[adminDocumentRepository.listAdminDocuments]', error);
    throw error;
  }
  return (data ?? []) as AdminDocumentRow[];
}

export async function upsertAdminDocument(
  doc: Record<string, unknown>
): Promise<AdminDocumentRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('agency_admin_documents')
    .upsert(doc, { onConflict: 'agency_id,document_type' })
    .select()
    .single();

  if (error) {
    logError('[adminDocumentRepository.upsertAdminDocument]', error);
    throw error;
  }
  return data as AdminDocumentRow;
}

export async function getAdminDocumentById(id: string): Promise<AdminDocumentRow | null> {
  const { data, error } = await supabase
    .from('agency_admin_documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logError('[adminDocumentRepository.getAdminDocumentById]', error);
    throw error;
  }
  return data as AdminDocumentRow | null;
}

export async function deleteAdminDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('agency_admin_documents')
    .delete()
    .eq('id', id);

  if (error) {
    logError('[adminDocumentRepository.deleteAdminDocument]', error);
    throw error;
  }
}

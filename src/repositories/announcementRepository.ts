/**
 * AnnouncementRepository — Typed Supabase queries for announcements.
 */
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

export interface AnnouncementRow {
  id: string;
  title: string;
  content: string | null;
  image_path: string | null;
  is_active: boolean;
  target_all: boolean | null;
  target_global_roles: string[] | null;
  exclude_base_users: boolean | null;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export async function listActiveAnnouncements(): Promise<AnnouncementRow[]> {
  const { data, error } = await supabase
    .from('priority_announcements')
    .select('*')
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    logError('[announcementRepository.listActiveAnnouncements]', error);
    throw error;
  }
  return (data ?? []) as AnnouncementRow[];
}

export async function listAllAnnouncements(): Promise<AnnouncementRow[]> {
  const { data, error } = await supabase
    .from('priority_announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logError('[announcementRepository.listAllAnnouncements]', error);
    throw error;
  }
  return (data ?? []) as AnnouncementRow[];
}

export async function listAnnouncementReads(
  userId: string
): Promise<{ announcement_id: string; status: string }[]> {
  const { data, error } = await supabase
    .from('announcement_reads')
    .select('announcement_id, status')
    .eq('user_id', userId)
    .eq('status', 'read');

  if (error) {
    logError('[announcementRepository.listAnnouncementReads]', error);
    throw error;
  }
  return data ?? [];
}

export async function upsertAnnouncementRead(params: {
  announcementId: string;
  userId: string;
  status: 'read' | 'later';
}): Promise<void> {
  const { error } = await supabase
    .from('announcement_reads')
    .upsert({
      announcement_id: params.announcementId,
      user_id: params.userId,
      status: params.status,
      read_at: new Date().toISOString(),
    }, { onConflict: 'announcement_id,user_id' });

  if (error) {
    logError('[announcementRepository.upsertAnnouncementRead]', error);
    throw error;
  }
}

export async function createAnnouncement(
  data: Record<string, unknown>
): Promise<AnnouncementRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase as any)
    .from('priority_announcements')
    .insert(data)
    .select()
    .single();

  if (error) {
    logError('[announcementRepository.createAnnouncement]', error);
    throw error;
  }
  return result as AnnouncementRow;
}

export async function updateAnnouncement(
  id: string,
  updates: Partial<AnnouncementRow>
): Promise<AnnouncementRow> {
  const { data, error } = await supabase
    .from('priority_announcements')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logError('[announcementRepository.updateAnnouncement]', error);
    throw error;
  }
  return data as AnnouncementRow;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase
    .from('priority_announcements')
    .delete()
    .eq('id', id);

  if (error) {
    logError('[announcementRepository.deleteAnnouncement]', error);
    throw error;
  }
}

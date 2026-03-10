/**
 * Réalisations Module — TypeScript types (simplified)
 */

export type MediaType = 'image' | 'video';
export type MediaRole = 'before' | 'during' | 'after' | 'cover' | 'detail' | 'other';
export type ExternalSyncStatus = 'not_queued' | 'queued' | 'processing' | 'generated' | 'published' | 'failed';

export interface Realisation {
  id: string;
  agency_id: string;
  created_by: string;
  title: string;
  intervention_date: string;
  created_at: string;
  updated_at: string;
  // External sync
  external_sync_status: ExternalSyncStatus;
  external_sync_last_at: string | null;
  external_sync_error: string | null;
  published_article_url: string | null;
  published_article_id: string | null;
}

export interface RealisationMedia {
  id: string;
  realisation_id: string;
  agency_id: string;
  storage_path: string;
  file_name: string;
  original_file_name: string | null;
  mime_type: string;
  media_type: MediaType;
  media_role: MediaRole;
  sequence_order: number;
  file_size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  caption: string | null;
  created_at: string;
  updated_at: string;
  // Computed client-side
  signedUrl?: string;
}

export interface RealisationActivityLog {
  id: string;
  agency_id: string;
  realisation_id: string | null;
  actor_type: 'user' | 'system' | 'external';
  actor_user_id: string | null;
  actor_label: string | null;
  action_type: string;
  action_payload: Record<string, unknown>;
  created_at: string;
}

export const MEDIA_ROLE_LABELS: Record<MediaRole, string> = {
  before: 'Avant',
  during: 'Pendant',
  after: 'Après',
  cover: 'Couverture',
  detail: 'Détail',
  other: 'Autre',
};

export const SYNC_STATUS_LABELS: Record<ExternalSyncStatus, string> = {
  not_queued: 'Non envoyé',
  queued: 'En file',
  processing: 'En traitement',
  generated: 'Article généré',
  published: 'Publié',
  failed: 'Échec',
};

export const SYNC_STATUS_COLORS: Record<ExternalSyncStatus, string> = {
  not_queued: 'bg-muted text-muted-foreground',
  queued: 'bg-accent/20 text-accent-foreground',
  processing: 'bg-primary/15 text-primary',
  generated: 'bg-primary/25 text-primary',
  published: 'bg-primary/30 text-primary font-semibold',
  failed: 'bg-destructive/15 text-destructive',
};

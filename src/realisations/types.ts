/**
 * Réalisations Module — TypeScript types
 */

export type ValidationStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';
export type PublicationStatus = 'private' | 'internal_ready' | 'web_ready' | 'published';
export type ArticleStatus = 'not_used' | 'queued' | 'generated' | 'published';
export type ClientType = 'particulier' | 'professionnel' | 'syndic' | 'assureur' | 'bailleur' | 'autre';
export type VisibilityScope = 'agency' | 'network' | 'global';
export type MediaType = 'image' | 'video';
export type MediaRole = 'before' | 'during' | 'after' | 'cover' | 'detail' | 'other';

export interface Realisation {
  id: string;
  agency_id: string;
  created_by: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  short_summary: string | null;
  city: string | null;
  postal_code: string | null;
  department: string | null;
  region: string | null;
  country: string;
  intervention_address: string | null;
  service_family: string | null;
  service_type: string | null;
  job_type: string | null;
  chantier_type: string | null;
  client_type: ClientType | null;
  apporteur_name: string | null;
  technician_name: string | null;
  technician_user_id: string | null;
  intervention_date: string | null;
  publication_consent: boolean;
  marketing_authorized: boolean;
  seo_ready: boolean;
  validation_status: ValidationStatus;
  publication_status: PublicationStatus;
  article_status: ArticleStatus;
  featured_before_media_id: string | null;
  featured_after_media_id: string | null;
  cover_media_id: string | null;
  visibility_scope: VisibilityScope;
  internal_notes: string | null;
  rejection_reason: string | null;
  quality_score: number | null;
  seo_score: number | null;
  // Qualification
  context_intervention: string | null;
  problem_initial: string | null;
  solution_applied: string | null;
  materials_used: string | null;
  differentiators: string | null;
  approximate_duration: string | null;
  client_benefit: string | null;
  // SEO
  seo_city: string | null;
  seo_target_query: string | null;
  seo_article_angle: string | null;
  seo_suggested_title: string | null;
  seo_meta_description: string | null;
  seo_slug: string | null;
  seo_internal_links: string | null;
  seo_cta: string | null;
  seo_secondary_keywords: string | null;
  seo_faq: string | null;
  created_at: string;
  updated_at: string;
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
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  checksum: string | null;
  exif_datetime: string | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  detected_labels: string[];
  alt_text: string | null;
  caption: string | null;
  seo_filename: string | null;
  is_blurred: boolean;
  contains_face: boolean;
  contains_plate: boolean;
  is_sensitive: boolean;
  is_validated: boolean;
  validation_comment: string | null;
  used_in_article: boolean;
  article_id: string | null;
  created_at: string;
  updated_at: string;
  // Computed client-side
  signedUrl?: string;
}

export interface RealisationTag {
  id: string;
  realisation_id: string;
  tag: string;
  created_at: string;
}

export interface RealisationActivityLog {
  id: string;
  agency_id: string;
  realisation_id: string | null;
  actor_type: 'user' | 'system';
  actor_user_id: string | null;
  actor_label: string | null;
  action_type: string;
  action_payload: Record<string, unknown>;
  created_at: string;
}

// Realisation with computed fields
export interface RealisationWithMeta extends Realisation {
  media_count?: number;
  has_before?: boolean;
  has_after?: boolean;
  tags?: string[];
  creator_name?: string;
}

// Filter state
export interface RealisationFilters {
  search?: string;
  city?: string;
  department?: string;
  service_family?: string;
  service_type?: string;
  technician_name?: string;
  client_type?: ClientType;
  validation_status?: ValidationStatus;
  publication_status?: PublicationStatus;
  article_status?: ArticleStatus;
  has_before_after?: boolean;
  quality_score_min?: number;
  seo_score_min?: number;
  date_from?: string;
  date_to?: string;
}

// Labels
export const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  draft: 'Brouillon',
  pending_review: 'En attente',
  approved: 'Validé',
  rejected: 'Refusé',
  archived: 'Archivé',
};

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  private: 'Privé',
  internal_ready: 'Prêt interne',
  web_ready: 'Prêt web',
  published: 'Publié',
};

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  not_used: 'Non utilisé',
  queued: 'En file',
  generated: 'Généré',
  published: 'Publié',
};

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  particulier: 'Particulier',
  professionnel: 'Professionnel',
  syndic: 'Syndic',
  assureur: 'Assureur',
  bailleur: 'Bailleur',
  autre: 'Autre',
};

export const MEDIA_ROLE_LABELS: Record<MediaRole, string> = {
  before: 'Avant',
  during: 'Pendant',
  after: 'Après',
  cover: 'Couverture',
  detail: 'Détail',
  other: 'Autre',
};

export const VALIDATION_STATUS_COLORS: Record<ValidationStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_review: 'bg-accent/20 text-accent-foreground',
  approved: 'bg-primary/15 text-primary',
  rejected: 'bg-destructive/15 text-destructive',
  archived: 'bg-muted text-muted-foreground',
};

export const PUBLICATION_STATUS_COLORS: Record<PublicationStatus, string> = {
  private: 'bg-muted text-muted-foreground',
  internal_ready: 'bg-accent/20 text-accent-foreground',
  web_ready: 'bg-primary/15 text-primary',
  published: 'bg-primary/25 text-primary',
};

// Service families for the franchise
export const SERVICE_FAMILIES = [
  'Serrurerie',
  'Plomberie',
  'Vitrerie',
  'Volet roulant',
  'Électricité',
  'Menuiserie',
  'Peinture',
  'Climatisation',
  'Chauffage',
  'Rénovation',
  'Multi-services',
  'Autre',
] as const;

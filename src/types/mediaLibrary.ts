/**
 * Types pour la Médiathèque Centralisée v6
 * Alignés avec le schéma Supabase généré
 */

import type { Database } from '@/integrations/supabase/types';

export type MediaAccessScope = Database['public']['Enums']['media_access_scope'];

// Types from database
export type MediaAsset = Database['public']['Tables']['media_assets']['Row'];
export type MediaFolder = Database['public']['Tables']['media_folders']['Row'];
export type MediaLink = Database['public']['Tables']['media_links']['Row'];
export type MediaSystemFolder = Database['public']['Tables']['media_system_folders']['Row'];
export type MediaSystemRoute = Database['public']['Tables']['media_system_routes']['Row'];

// Extended types with joins
export interface MediaLinkWithAsset extends MediaLink {
  asset: MediaAsset;
}

export interface MediaFolderWithChildren extends MediaFolder {
  children?: MediaFolderWithChildren[];
}

// UI State types
export interface MediaBreadcrumb {
  id: string;
  name: string;
  path: string;
}

export interface MediaSelection {
  type: 'folder' | 'file';
  id: string;
}

export interface MediaViewMode {
  type: 'grid' | 'list';
  sortBy: 'name' | 'date' | 'size';
  sortOrder: 'asc' | 'desc';
}

export interface MediaQuickLookState {
  isOpen: boolean;
  asset: MediaAsset | null;
  link: MediaLink | null;
}

// API Response types
export interface SignedUrlResponse {
  success: boolean;
  url?: string;
  file_name?: string;
  expires_in?: number;
  error?: string;
}

// Filter types
export interface MediaFilters {
  search: string;
  mimeTypes: string[];
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
}

// Context menu target
export interface MediaContextTarget {
  type: 'folder' | 'file';
  data: MediaFolder | MediaLinkWithAsset;
}

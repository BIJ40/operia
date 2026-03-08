/**
 * Hook pour une vue scopée de la Médiathèque
 * Permet d'afficher une sous-arborescence comme un portail autonome
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { 
  MediaFolder, 
  MediaLinkWithAsset, 
  MediaAsset,
  MediaBreadcrumb,
  MediaSelection,
  MediaViewMode,
  MediaQuickLookState,
  MediaFilters,
  MediaContextTarget,
  SignedUrlResponse
} from '@/types/mediaLibrary';
import { toast } from 'sonner';

interface UseScopedMediaLibraryOptions {
  /** Chemin racine du scope (ex: "/rh/salaries/dupont-j") */
  rootPath: string;
  /** Autorise la navigation au-dessus de la racine */
  allowNavigateUp?: boolean;
}

export function useScopedMediaLibrary({ 
  rootPath, 
  allowNavigateUp = false 
}: UseScopedMediaLibraryOptions) {
  const { agencyId } = useProfile();
  const queryClient = useQueryClient();
  
  // Current folder ID (starts at null = root of scope)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  
  // View state
  const [viewMode, setViewMode] = useState<MediaViewMode>({
    type: 'grid',
    sortBy: 'name',
    sortOrder: 'asc',
  });
  
  // Selection state
  const [selection, setSelection] = useState<MediaSelection[]>([]);
  
  // Quick Look state
  const [quickLook, setQuickLook] = useState<MediaQuickLookState>({
    isOpen: false,
    asset: null,
    link: null,
  });
  
  // Filter state
  const [filters, setFilters] = useState<MediaFilters>({
    search: '',
    mimeTypes: [],
    dateRange: { from: null, to: null },
  });
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: MediaContextTarget | null;
  } | null>(null);

  // ===== Find root folder by path =====
  const { data: resolvedRootFolder, isLoading: isResolvingRoot } = useQuery({
    queryKey: ['media-folder-by-path', agencyId, rootPath],
    queryFn: async () => {
      if (!agencyId || !rootPath) return null;
      
      const segments = rootPath.split('/').filter(Boolean);
      if (segments.length === 0) return null;
      
      let currentParentId: string | null = null;
      let currentFolder: MediaFolder | null = null;
      
      for (const segment of segments) {
        const { data, error } = await supabase
          .from('media_folders')
          .select('*')
          .eq('agency_id', agencyId)
          .eq('slug', segment)
          .is('deleted_at', null);

        if (error) throw error;
        
        // Find folder matching parent
        const folder = data?.find(f => f.parent_id === currentParentId);
        if (!folder) {
          // Folder doesn't exist - try to create it
          return null;
        }
        
        currentFolder = folder;
        currentParentId = folder.id;
      }
      
      return currentFolder;
    },
    enabled: !!agencyId && !!rootPath,
  });

  // Update rootFolderId when resolved
  useEffect(() => {
    if (resolvedRootFolder) {
      setRootFolderId(resolvedRootFolder.id);
      // Start navigation at root
      if (!currentFolderId) {
        setCurrentFolderId(resolvedRootFolder.id);
      }
    }
  }, [resolvedRootFolder, currentFolderId]);

  // Effective folder ID (current or root)
  const effectiveFolderId = currentFolderId || rootFolderId;

  // ===== Fetch folders =====
  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['media-folders', agencyId, effectiveFolderId],
    queryFn: async () => {
      if (!agencyId || !effectiveFolderId) return [];

      const { data, error } = await supabase
        .from('media_folders')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('parent_id', effectiveFolderId)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data as MediaFolder[];
    },
    enabled: !!agencyId && !!effectiveFolderId,
  });

  // ===== Fetch current folder =====
  const { data: currentFolder } = useQuery({
    queryKey: ['media-folder', effectiveFolderId],
    queryFn: async () => {
      if (!effectiveFolderId) return null;

      const { data, error } = await supabase
        .from('media_folders')
        .select('*')
        .eq('id', effectiveFolderId)
        .single();

      if (error) throw error;
      return data as MediaFolder;
    },
    enabled: !!effectiveFolderId,
  });

  // ===== Fetch links (files) =====
  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ['media-links', agencyId, effectiveFolderId],
    queryFn: async () => {
      if (!agencyId || !effectiveFolderId) return [];

      const { data, error } = await supabase
        .from('media_links')
        .select(`*, asset:media_assets(*)`)
        .eq('agency_id', agencyId)
        .eq('folder_id', effectiveFolderId)
        .is('deleted_at', null)
        .order('sort_order', { nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || [])
        .filter(item => item.asset)
        .map(item => ({
          ...item,
          asset: item.asset as MediaAsset,
        })) as MediaLinkWithAsset[];
    },
    enabled: !!agencyId && !!effectiveFolderId,
  });

  // ===== Breadcrumbs (relative to root) =====
  const { data: fullBreadcrumbs = [] } = useQuery({
    queryKey: ['media-breadcrumbs-scoped', effectiveFolderId, rootFolderId],
    queryFn: async () => {
      if (!effectiveFolderId) return [];

      const path: MediaBreadcrumb[] = [];
      let currentId: string | null = effectiveFolderId;

      while (currentId) {
        const { data, error } = await supabase
          .from('media_folders')
          .select('id, name, slug, parent_id')
          .eq('id', currentId)
          .single();

        if (error || !data) break;

        path.unshift({
          id: data.id,
          name: data.name,
          path: data.slug,
        });

        // Stop at root folder boundary
        if (data.id === rootFolderId) break;

        currentId = data.parent_id;
      }

      return path;
    },
    enabled: !!effectiveFolderId,
  });

  // Relative breadcrumbs (exclude the root itself for cleaner display)
  const breadcrumbs = useMemo(() => {
    if (!rootFolderId) return fullBreadcrumbs;
    const rootIndex = fullBreadcrumbs.findIndex(b => b.id === rootFolderId);
    if (rootIndex === -1) return fullBreadcrumbs;
    // Show from root (inclusive) for context
    return fullBreadcrumbs.slice(rootIndex);
  }, [fullBreadcrumbs, rootFolderId]);

  // ===== Navigation =====
  const navigateToFolder = useCallback((folderId: string | null) => {
    setSelection([]);
    if (!allowNavigateUp && folderId === null && rootFolderId) {
      // Can't go above root - stay at root
      setCurrentFolderId(rootFolderId);
    } else {
      setCurrentFolderId(folderId);
    }
  }, [allowNavigateUp, rootFolderId]);

  const navigateUp = useCallback(() => {
    const parentId = currentFolder?.parent_id || null;
    
    // Check if we're at or above root
    if (!allowNavigateUp && rootFolderId) {
      if (currentFolderId === rootFolderId || parentId === null) {
        // At root boundary, can't go up
        return;
      }
      // Check if parent is above root
      // For simplicity, just navigate to parent
    }
    
    navigateToFolder(parentId || rootFolderId);
  }, [currentFolder, currentFolderId, rootFolderId, allowNavigateUp, navigateToFolder]);

  const navigateToRoot = useCallback(() => {
    navigateToFolder(rootFolderId);
  }, [rootFolderId, navigateToFolder]);

  // Can navigate up?
  const canNavigateUp = useMemo(() => {
    if (!currentFolderId || !rootFolderId) return false;
    if (!allowNavigateUp && currentFolderId === rootFolderId) return false;
    return true;
  }, [currentFolderId, rootFolderId, allowNavigateUp]);

  // ===== Selection helpers =====
  const toggleSelection = useCallback((type: 'folder' | 'file', id: string, multiSelect = false) => {
    setSelection(prev => {
      const exists = prev.find(s => s.id === id && s.type === type);
      if (exists) {
        return prev.filter(s => !(s.id === id && s.type === type));
      }
      if (multiSelect) {
        return [...prev, { type, id }];
      }
      return [{ type, id }];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelection([]);
  }, []);

  const selectAll = useCallback(() => {
    const folderSelections: MediaSelection[] = folders.map(f => ({
      type: 'folder' as const,
      id: f.id,
    }));
    const fileSelections: MediaSelection[] = links.map(l => ({
      type: 'file' as const,
      id: l.id,
    }));
    setSelection([...folderSelections, ...fileSelections]);
  }, [folders, links]);

  // ===== Quick Look =====
  const openQuickLook = useCallback((link: MediaLinkWithAsset) => {
    setQuickLook({
      isOpen: true,
      asset: link.asset,
      link,
    });
  }, []);

  const closeQuickLook = useCallback(() => {
    setQuickLook({
      isOpen: false,
      asset: null,
      link: null,
    });
  }, []);

  // ===== Context menu =====
  const openContextMenu = useCallback((
    e: React.MouseEvent,
    target: MediaContextTarget | null
  ) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      target,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // ===== Filtering & sorting =====
  const filteredFolders = useMemo(() => {
    let result = [...folders];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(search));
    }

    result.sort((a, b) => {
      const order = viewMode.sortOrder === 'asc' ? 1 : -1;
      if (viewMode.sortBy === 'name') {
        return a.name.localeCompare(b.name) * order;
      }
      if (viewMode.sortBy === 'date') {
        return (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()) * order;
      }
      return 0;
    });

    return result;
  }, [folders, filters.search, viewMode]);

  const filteredLinks = useMemo(() => {
    let result = [...links];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(l =>
        (l.label || l.asset?.file_name || '').toLowerCase().includes(search)
      );
    }

    if (filters.mimeTypes.length > 0) {
      result = result.filter(l =>
        filters.mimeTypes.some(type => l.asset?.mime_type?.startsWith(type))
      );
    }

    result.sort((a, b) => {
      if (a.sort_order != null && b.sort_order != null) {
        return a.sort_order - b.sort_order;
      }
      if (a.sort_order != null) return -1;
      if (b.sort_order != null) return 1;

      const order = viewMode.sortOrder === 'asc' ? 1 : -1;
      if (viewMode.sortBy === 'name') {
        const nameA = a.label || a.asset?.file_name || '';
        const nameB = b.label || b.asset?.file_name || '';
        return nameA.localeCompare(nameB) * order;
      }
      if (viewMode.sortBy === 'date') {
        return (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()) * order;
      }
      if (viewMode.sortBy === 'size') {
        return ((a.asset?.file_size || 0) - (b.asset?.file_size || 0)) * order;
      }
      return 0;
    });

    return result;
  }, [links, filters, viewMode]);

  // ===== Mutations =====
  
  // Create folder
  const createFolder = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId: string | null }) => {
      if (!agencyId) throw new Error('Agency ID required');

      const targetParentId = parentId || effectiveFolderId;
      
      // Get parent scope for inheritance
      let accessScope: 'general' | 'rh' | 'rh_sensitive' | 'admin' = 'general';
      if (targetParentId) {
        const { data: parent } = await supabase
          .from('media_folders')
          .select('access_scope')
          .eq('id', targetParentId)
          .single();
        accessScope = parent?.access_scope || 'general';
      }

      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'dossier';

      const { data, error } = await supabase
        .from('media_folders')
        .insert({
          agency_id: agencyId,
          parent_id: targetParentId,
          name,
          slug,
          is_system: false,
          access_scope: accessScope,
          icon: 'folder',
          color: 'default',
        })
        .select()
        .single();

      if (error) throw error;
      return data as MediaFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders', agencyId] });
      toast.success('Dossier créé');
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === '23505') {
        toast.error('Un dossier avec ce nom existe déjà');
      } else {
        toast.error('Erreur lors de la création du dossier');
      }
    },
  });

  // Rename folder
  const renameFolder = useMutation({
    mutationFn: async ({ folderId, newName }: { folderId: string; newName: string }) => {
      const slug = newName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'dossier';

      const { data, error } = await supabase
        .from('media_folders')
        .update({ name: newName, slug })
        .eq('id', folderId)
        .eq('is_system', false)
        .select()
        .single();

      if (error) throw error;
      return data as MediaFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast.success('Dossier renommé');
    },
    onError: () => {
      toast.error('Impossible de renommer ce dossier');
    },
  });

  // Delete folder
  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from('media_folders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', folderId)
        .eq('is_system', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast.success('Dossier mis à la corbeille');
    },
    onError: () => {
      toast.error('Impossible de supprimer ce dossier');
    },
  });

  // Move folder
  const moveFolder = useMutation({
    mutationFn: async ({ folderId, newParentId }: { folderId: string; newParentId: string | null }) => {
      const { data, error } = await supabase
        .from('media_folders')
        .update({ parent_id: newParentId })
        .eq('id', folderId)
        .eq('is_system', false)
        .select()
        .single();

      if (error) throw error;
      return data as MediaFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast.success('Dossier déplacé');
    },
    onError: () => {
      toast.error('Impossible de déplacer ce dossier');
    },
  });

  // Upload file
  const uploadFile = useMutation({
    mutationFn: async ({ file, folderId }: { file: File; folderId?: string }) => {
      if (!agencyId) throw new Error('Agency ID required');

      const targetFolderId = folderId || effectiveFolderId;
      if (!targetFolderId) throw new Error('Folder ID required');

      const timestamp = Date.now();
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${agencyId}/${targetFolderId}/${timestamp}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data: asset, error: assetError } = await supabase
        .from('media_assets')
        .insert({
          agency_id: agencyId,
          storage_bucket: 'media-library',
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          metadata: {},
        })
        .select()
        .single();

      if (assetError) throw assetError;

      const { data: link, error: linkError } = await supabase
        .from('media_links')
        .insert({
          agency_id: agencyId,
          asset_id: asset.id,
          folder_id: targetFolderId,
          label: file.name,
        })
        .select()
        .single();

      if (linkError) throw linkError;

      return { asset, link };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-links', agencyId] });
      toast.success('Fichier téléversé');
    },
    onError: () => {
      toast.error('Erreur lors du téléversement');
    },
  });

  // Rename file
  const renameFile = useMutation({
    mutationFn: async ({ linkId, newName }: { linkId: string; newName: string }) => {
      const { data, error } = await supabase
        .from('media_links')
        .update({ label: newName })
        .eq('id', linkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-links'] });
      toast.success('Fichier renommé');
    },
    onError: () => {
      toast.error('Erreur lors du renommage');
    },
  });

  // Delete file
  const deleteFile = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('media_links')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-links'] });
      toast.success('Fichier mis à la corbeille');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  // Move file
  const moveFile = useMutation({
    mutationFn: async ({ linkId, newFolderId }: { linkId: string; newFolderId: string }) => {
      const { data, error } = await supabase
        .from('media_links')
        .update({ folder_id: newFolderId })
        .eq('id', linkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-links'] });
      toast.success('Fichier déplacé');
    },
    onError: () => {
      toast.error('Erreur lors du déplacement');
    },
  });

  // Get signed URL
  const getSignedUrl = async (assetId: string, linkId?: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke<SignedUrlResponse>(
        'media-get-signed-url',
        {
          body: { asset_id: assetId, link_id: linkId },
        }
      );

      if (error || !data?.success) {
        toast.error(data?.error || 'Erreur lors du téléchargement');
        return null;
      }

      return data.url || null;
    } catch (e) {
      toast.error('Erreur lors du téléchargement');
      return null;
    }
  };

  // Download file
  const downloadFile = async (link: MediaLinkWithAsset) => {
    const url = await getSignedUrl(link.asset_id, link.id);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = link.label || link.asset.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Update sort order
  const updateSortOrder = useMutation({
    mutationFn: async ({ linkId, sortOrder }: { linkId: string; sortOrder: number }) => {
      const { data, error } = await supabase
        .from('media_links')
        .update({ sort_order: sortOrder })
        .eq('id', linkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-links'] });
    },
  });

  return {
    // Loading states
    isLoading: isResolvingRoot || foldersLoading || linksLoading,
    isReady: !!rootFolderId,
    
    // Root info
    rootFolderId,
    rootPath,
    
    // Navigation
    currentFolderId: effectiveFolderId,
    navigateToFolder,
    navigateUp,
    navigateToRoot,
    canNavigateUp,

    // Folders
    folders: filteredFolders,
    currentFolder,
    breadcrumbs,
    foldersLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,

    // Files
    links: filteredLinks,
    linksLoading,
    uploadFile,
    renameFile,
    deleteFile,
    moveFile,
    downloadFile,
    getSignedUrl,
    updateSortOrder,

    // View mode
    viewMode,
    setViewMode,

    // Selection
    selection,
    toggleSelection,
    clearSelection,
    selectAll,

    // Quick Look
    quickLook,
    openQuickLook,
    closeQuickLook,

    // Context menu
    contextMenu,
    openContextMenu,
    closeContextMenu,

    // Filters
    filters,
    setFilters,
  };
}

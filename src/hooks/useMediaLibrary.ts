/**
 * Hook principal pour la médiathèque - gère l'état de navigation
 */

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMediaFolders } from './useMediaFolders';
import { useMediaLinks } from './useMediaLinks';
import { 
  MediaFolder, 
  MediaSelection, 
  MediaViewMode, 
  MediaQuickLookState, 
  MediaFilters, 
  MediaLinkWithAsset,
  MediaContextTarget 
} from '@/types/mediaLibrary';

export function useMediaLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Current folder from URL
  const currentFolderId = searchParams.get('folder') || null;
  
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
  
  // Hooks for data
  const foldersHook = useMediaFolders(currentFolderId);
  const linksHook = useMediaLinks(currentFolderId);
  
  // Navigation
  const navigateToFolder = useCallback((folderId: string | null) => {
    setSelection([]);
    if (folderId) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set('folder', folderId);
        return newParams;
      }, { replace: true });
    } else {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('folder');
        return newParams;
      }, { replace: true });
    }
  }, [setSearchParams]);
  
  const navigateUp = useCallback(() => {
    const parentId = foldersHook.currentFolder?.parent_id || null;
    navigateToFolder(parentId);
  }, [foldersHook.currentFolder, navigateToFolder]);
  
  const navigateToRoot = useCallback(() => {
    navigateToFolder(null);
  }, [navigateToFolder]);
  
  // Selection helpers
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
    const folderSelections: MediaSelection[] = foldersHook.folders.map(f => ({
      type: 'folder' as const,
      id: f.id,
    }));
    const fileSelections: MediaSelection[] = linksHook.links.map(l => ({
      type: 'file' as const,
      id: l.id,
    }));
    setSelection([...folderSelections, ...fileSelections]);
  }, [foldersHook.folders, linksHook.links]);
  
  // Quick Look helpers
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
  
  // Context menu helpers
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
  
  // Filtered and sorted items
  const filteredFolders = useMemo(() => {
    let result = [...foldersHook.folders];
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(search));
    }
    
    // Sort
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
  }, [foldersHook.folders, filters.search, viewMode]);
  
  const filteredLinks = useMemo(() => {
    let result = [...linksHook.links];
    
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
    
    // Sort (by sort_order first, then by chosen sort)
    result.sort((a, b) => {
      // Primary sort by sort_order if both have it
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
  }, [linksHook.links, filters, viewMode]);
  
  return {
    // Navigation
    currentFolderId,
    navigateToFolder,
    navigateUp,
    navigateToRoot,
    
    // Folders
    folders: filteredFolders,
    currentFolder: foldersHook.currentFolder,
    breadcrumbs: foldersHook.breadcrumbs,
    foldersLoading: foldersHook.isLoading,
    createFolder: foldersHook.createFolder,
    renameFolder: foldersHook.renameFolder,
    deleteFolder: foldersHook.deleteFolder,
    moveFolder: foldersHook.moveFolder,
    
    // Files
    links: filteredLinks,
    linksLoading: linksHook.isLoading,
    uploadFile: linksHook.uploadFile,
    renameFile: linksHook.renameFile,
    deleteFile: linksHook.deleteFile,
    moveFile: linksHook.moveFile,
    downloadFile: linksHook.downloadFile,
    getSignedUrl: linksHook.getSignedUrl,
    updateSortOrder: linksHook.updateSortOrder,
    
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

/**
 * Hook pour l'export ZIP + CSV des données RH (P2-03)
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

interface ExportFilters {
  doc_type?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

interface ExportDocumentsParams {
  document_ids: string[];
}

interface ExportCollaboratorsParams {
  agency_id?: string;
  filters?: ExportFilters;
}

interface ExportRequestsParams {
  agency_id?: string;
  filters?: ExportFilters;
}

export function useRHExport() {
  // Export documents (get signed URLs)
  const exportDocuments = useMutation({
    mutationFn: async ({ document_ids }: ExportDocumentsParams) => {
      const { data, error } = await supabase.functions.invoke('export-rh-documents', {
        body: {
          type: 'documents_zip',
          document_ids,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      if (data.type === 'documents_urls' && data.data) {
        // Download each document
        toast.info(`Téléchargement de ${data.count} document(s)...`);
        
        for (const doc of data.data) {
          if (doc.download_url) {
            // Create a temporary link and click it
            const link = document.createElement('a');
            link.href = doc.download_url;
            link.download = doc.file_name || doc.title;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        
        toast.success(`${data.count} document(s) téléchargé(s)`);
      }
    },
    onError: (error: Error) => {
      logError('[useRHExport] Documents export error:', error);
      toast.error(error.message || 'Erreur lors de l\'export');
    },
  });

  // Export collaborators CSV
  const exportCollaborators = useMutation({
    mutationFn: async ({ agency_id, filters }: ExportCollaboratorsParams) => {
      const { data, error } = await supabase.functions.invoke('export-rh-documents', {
        body: {
          type: 'collaborators_csv',
          agency_id,
          filters,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (csvContent) => {
      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `collaborateurs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Export collaborateurs téléchargé');
    },
    onError: (error: Error) => {
      logError('[useRHExport] Collaborators export error:', error);
      toast.error(error.message || 'Erreur lors de l\'export');
    },
  });

  // Export requests CSV
  const exportRequests = useMutation({
    mutationFn: async ({ agency_id, filters }: ExportRequestsParams) => {
      const { data, error } = await supabase.functions.invoke('export-rh-documents', {
        body: {
          type: 'requests_csv',
          agency_id,
          filters,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (csvContent) => {
      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `demandes_rh_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Export demandes téléchargé');
    },
    onError: (error: any) => {
      logError('[useRHExport] Requests export error:', error);
      toast.error(error.message || 'Erreur lors de l\'export');
    },
  });

  return {
    exportDocuments,
    exportCollaborators,
    exportRequests,
    isExporting: exportDocuments.isPending || exportCollaborators.isPending || exportRequests.isPending,
  };
}

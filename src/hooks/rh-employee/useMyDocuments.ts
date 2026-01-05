/**
 * Hook pour récupérer les documents RH visibles par le salarié
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyCollaborator } from "./useMyCollaborator";
import { logError } from "@/lib/logger";

export interface MyDocument {
  id: string;
  doc_type: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  period_month: number | null;
  period_year: number | null;
  created_at: string;
  subfolder: string | null;
  visibility: string | null;
}

export function useMyDocuments() {
  const { data: collaborator, isLoading: loadingCollaborator } = useMyCollaborator();

  const query = useQuery({
    queryKey: ["my-documents", collaborator?.id],
    queryFn: async (): Promise<MyDocument[]> => {
      if (!collaborator?.id) return [];

      // Filtrer sur visibility = 'EMPLOYEE_VISIBLE' (le champ utilisé par les uploads)
      const { data, error } = await supabase
        .from("collaborator_documents")
        .select(`
          id, doc_type, title, description, file_path, file_name,
          file_size, file_type, period_month, period_year, created_at, subfolder, visibility
        `)
        .eq("collaborator_id", collaborator.id)
        .eq("visibility", "EMPLOYEE_VISIBLE")
        .order("created_at", { ascending: false });

      if (error) {
        logError("Erreur récupération documents:", error);
        throw error;
      }

      return (data || []) as MyDocument[];
    },
    enabled: !!collaborator?.id,
  });

  return {
    ...query,
    isLoading: loadingCollaborator || query.isLoading,
  };
}

export function useDownloadDocument() {
  const downloadDocument = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("rh-documents")
      .download(filePath);

    if (error) {
      logError("Erreur téléchargement document:", error);
      throw error;
    }

    // Déclencher le téléchargement
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return { downloadDocument };
}

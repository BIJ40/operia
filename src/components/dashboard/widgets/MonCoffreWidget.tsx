/**
 * Widget Mon Coffre RH - Affiche les 3 derniers documents
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, FolderOpen, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function MonCoffreWidget() {
  const { user, agencyId } = useAuth();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['widget-coffre-documents', user?.id, agencyId],
    queryFn: async () => {
      if (!user?.id || !agencyId) return [];
      
      // Récupérer le collaborator_id de l'utilisateur
      const { data: collaborator } = await supabase
        .from('collaborators')
        .select('id')
        .eq('user_id', user.id)
        .eq('agency_id', agencyId)
        .single();

      if (!collaborator) return [];

      const { data, error } = await supabase
        .from('collaborator_documents')
        .select('id, title, doc_type, created_at, file_type')
        .eq('collaborator_id', collaborator.id)
        .in('visibility', ['employee', 'all'])
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!agencyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-4">
        <FolderOpen className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground text-center">
          Aucun document dans votre coffre
        </p>
        <Link 
          to="/mon-coffre-rh" 
          className="text-xs text-helpconfort-blue hover:underline flex items-center gap-1"
        >
          Accéder au coffre <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const getDocTypeLabel = (docType: string) => {
    const labels: Record<string, string> = {
      'PAYSLIP': 'Bulletin de paie',
      'CONTRACT': 'Contrat',
      'MEDICAL': 'Visite médicale',
      'NOTE': 'Note RH',
      'OTHER': 'Autre',
    };
    return labels[docType] || docType;
  };

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <FileText className="h-5 w-5 text-helpconfort-blue shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.title}</p>
            <p className="text-xs text-muted-foreground">
              {getDocTypeLabel(doc.doc_type)} • {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
      ))}
      
      <Link
        to="/mon-coffre-rh"
        className="flex items-center justify-center gap-1 p-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <FolderOpen className="h-3 w-3" />
        Accéder au coffre
      </Link>
    </div>
  );
}

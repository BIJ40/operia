import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { RAGIndexManager } from '@/components/RAGIndexManager';
import { Database } from 'lucide-react';

export default function AdminRAG() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Database className="w-8 h-8 text-primary" />
          Gestion de l'index RAG
        </h1>
        <p className="text-muted-foreground">
          Indexation du contenu pour la recherche sémantique de Mme MICHU
        </p>
      </div>

      <RAGIndexManager />
    </div>
  );
}

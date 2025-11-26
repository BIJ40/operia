import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AdminWidgetGrid } from '@/components/admin/overview/AdminWidgetGrid';

export default function AdminIndex() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container max-w-7xl mx-auto p-8 space-y-12">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Administration
        </h1>
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="rounded-2xl border-2 hover:bg-accent"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour accueil
        </Button>
      </div>

      <AdminWidgetGrid />
    </div>
  );
}

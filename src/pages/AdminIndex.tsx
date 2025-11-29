import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { StatsOverview } from '@/components/admin/overview/StatsOverview';
import { QuickActions } from '@/components/admin/overview/QuickActions';
import { NavigationCards } from '@/components/admin/overview/NavigationCards';
import { ROUTES } from '@/config/routes';

// Route protégée par RoleGuard (N5+) dans App.tsx
export default function AdminIndex() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-7xl mx-auto p-8 space-y-12">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Administration
        </h1>
        <Button 
          variant="outline" 
          onClick={() => navigate(ROUTES.home)}
          className="rounded-2xl border-2 hover:bg-accent"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour accueil
        </Button>
      </div>

      <StatsOverview />

      <QuickActions />

      <NavigationCards />
    </div>
  );
}

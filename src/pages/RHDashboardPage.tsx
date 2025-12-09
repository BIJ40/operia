import { RHDashboard } from '@/components/rh/dashboard';
import { PageHeader } from '@/components/layout/PageHeader';
import { ROUTES } from '@/config/routes';

export default function RHDashboardPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Dashboard RH"
        subtitle="Tableau de bord des ressources humaines"
        backTo={ROUTES.rh.index}
        backLabel="Espace RH"
      />
      <RHDashboard />
    </div>
  );
}

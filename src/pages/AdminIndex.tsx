import { StatsOverview } from '@/components/admin/overview/StatsOverview';
import { QuickActions } from '@/components/admin/overview/QuickActions';
import { NavigationCards } from '@/components/admin/overview/NavigationCards';

// Route protégée par RoleGuard (N5+) dans App.tsx
export default function AdminIndex() {
  return (
    <div className="container max-w-7xl mx-auto p-8 space-y-12">

      <StatsOverview />

      <QuickActions />

      <NavigationCards />
    </div>
  );
}

import { StatsOverview } from '@/components/admin/overview/StatsOverview';
import { NavigationCards } from '@/components/admin/overview/NavigationCards';
import { Settings } from 'lucide-react';

// Route protégée par RoleGuard (N5+) dans App.tsx
export default function AdminIndex() {
  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <div className="w-12 h-12 rounded-xl bg-helpconfort-blue/10 flex items-center justify-center">
          <Settings className="w-6 h-6 text-helpconfort-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administration</h1>
          <p className="text-sm text-muted-foreground">Gérez votre plateforme HC Services</p>
        </div>
      </div>

      <StatsOverview />

      <NavigationCards />
    </div>
  );
}

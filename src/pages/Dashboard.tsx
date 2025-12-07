/**
 * Dashboard - Page principale du hub opérationnel
 */

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { DashboardWelcomeMessage } from '@/components/dashboard/DashboardWelcomeMessage';

export default function Dashboard() {
  return (
    <div className="container mx-auto py-6 px-4">
      <DashboardHeader />
      <DashboardWelcomeMessage />
      <DashboardGrid />
    </div>
  );
}

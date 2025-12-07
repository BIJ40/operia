/**
 * Dashboard - Page principale du hub opérationnel
 */

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { DashboardWelcomeMessage } from '@/components/dashboard/DashboardWelcomeMessage';

export default function Dashboard() {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <div className="container mx-auto py-6 px-4">
      <DashboardHeader isEditMode={isEditMode} onToggleEditMode={() => setIsEditMode(prev => !prev)} />
      <DashboardWelcomeMessage />
      <DashboardGrid isEditMode={isEditMode} />
    </div>
  );
}

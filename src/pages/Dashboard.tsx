/**
 * Dashboard - Page principale du hub opérationnel
 */

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { DashboardWelcomeMessage } from '@/components/dashboard/DashboardWelcomeMessage';
import { useDefaultWidgets } from '@/hooks/useDefaultWidgets';

export default function Dashboard() {
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Initialise les widgets par défaut (ex: Favoris) pour tous les utilisateurs
  useDefaultWidgets();

  return (
    <div className="container mx-auto py-6 px-4">
      <DashboardHeader isEditMode={isEditMode} onToggleEditMode={() => setIsEditMode(prev => !prev)} />
      <DashboardWelcomeMessage />
      <DashboardGrid isEditMode={isEditMode} />
    </div>
  );
}

/**
 * Gestion des Permissions - Page centrale de gestion des accès
 * Gère les utilisateurs, leurs rôles, plans agences et overrides de pages
 */

import { Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { UsersAccessTab } from '@/components/admin/access-rights/tabs/UsersAccessTab';

export default function UnifiedManagementPage() {
  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        title="Gestion des Permissions"
        subtitle="Utilisateurs, rôles, plans et accès aux pages"
        backTo="/admin"
        backLabel="Administration"
      />
      
      <UsersAccessTab />
    </div>
  );
}

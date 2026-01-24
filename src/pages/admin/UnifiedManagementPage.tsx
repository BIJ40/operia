/**
 * Gestion des Permissions - Page centrale de gestion des accès
 * Gère les utilisateurs, leurs rôles, plans agences et overrides de pages
 */

import { Users, ToggleRight, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { UsersAccessTab } from '@/components/admin/access-rights/tabs/UsersAccessTab';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/config/routes';

interface QuickLinkProps {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

function QuickLink({ to, icon: Icon, title, description }: QuickLinkProps) {
  return (
    <Link to={to}>
      <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function UnifiedManagementPage() {
  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        title="Gestion des Permissions"
        subtitle="Utilisateurs, rôles, plans et accès aux pages"
        backTo="/admin"
        backLabel="Administration"
      />

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <QuickLink 
          to={ROUTES.admin.featureFlags} 
          icon={ToggleRight} 
          title="Feature Flags" 
          description="Activer/désactiver les modules" 
        />
        <QuickLink 
          to="/admin/hidden-features" 
          icon={EyeOff} 
          title="Fonctionnalités masquées" 
          description="Pages et fonctions désactivées" 
        />
      </div>
      
      <UsersAccessTab />
    </div>
  );
}

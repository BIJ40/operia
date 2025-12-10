/**
 * P2.2 - Export CSV des utilisateurs avec rôles/modules
 */

import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { GlobalRole, GLOBAL_ROLE_LABELS } from '@/types/globalRoles';

interface UserForExport {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  global_role: GlobalRole | null;
  agency_label: string | null;
  enabled_modules: Record<string, any> | null;
  support_level: number | null;
  is_active: boolean;
}

interface UserExportCSVProps {
  users: UserForExport[];
}

function countActiveModules(modules: Record<string, any> | null): number {
  if (!modules) return 0;
  return Object.values(modules).filter(m => 
    (typeof m === 'boolean' && m) || (typeof m === 'object' && m?.enabled)
  ).length;
}

function getActiveModulesList(modules: Record<string, any> | null): string {
  if (!modules) return '';
  const activeModules = Object.entries(modules)
    .filter(([_, m]) => (typeof m === 'boolean' && m) || (typeof m === 'object' && m?.enabled))
    .map(([key]) => key);
  return activeModules.join(', ');
}

export function UserExportCSV({ users }: UserExportCSVProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Header CSV
      const headers = [
        'ID',
        'Email',
        'Prénom',
        'Nom',
        'Rôle Global',
        'Niveau',
        'Agence',
        'Nb Modules',
        'Modules Actifs',
        'Niveau Support',
        'Actif'
      ];
      
      // Lignes de données
      const rows = users.map(user => [
        user.id,
        user.email,
        user.first_name || '',
        user.last_name || '',
        user.global_role ? GLOBAL_ROLE_LABELS[user.global_role] : '',
        user.global_role ? `N${['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'].indexOf(user.global_role)}` : '',
        user.agency_label || '',
        countActiveModules(user.enabled_modules),
        getActiveModulesList(user.enabled_modules),
        user.support_level ? `SA${user.support_level}` : '',
        user.is_active ? 'Oui' : 'Non'
      ]);
      
      // Construire le CSV
      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      ].join('\n');
      
      // Créer le blob avec BOM pour Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
      
      // Télécharger
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `utilisateurs-permissions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport}
      disabled={isExporting || users.length === 0}
      className="h-9"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-1.5" />
      )}
      CSV
    </Button>
  );
}

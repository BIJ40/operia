import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield, Check, X } from 'lucide-react';

interface Permission {
  role_agence: string;
  block_id: string;
  can_access: boolean;
}

const AVAILABLE_ROLES = [
  { value: 'dirigeant', label: 'Dirigeant(e)' },
  { value: 'assistante', label: 'Assistante' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'tete_de_reseau', label: 'Tête de réseau' },
  { value: 'externe', label: 'Externe' },
];

const MAIN_CATEGORIES = [
  { id: 'apogee', name: 'Guide Apogée' },
  { id: 'apporteurs', name: 'Guide Apporteurs' },
  { id: 'helpconfort', name: 'Base HelpConfort' },
];

export default function AdminRolePermissions() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>('dirigeant');
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    if (isAdmin) {
      loadPermissions();
    }
  }, [isAdmin, selectedRole]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_agence', selectedRole)
        .in('block_id', MAIN_CATEGORIES.map(c => c.id));

      if (permissionsError) throw permissionsError;

      setPermissions(permissionsData || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les permissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (categoryId: string): boolean => {
    const permission = permissions.find(p => p.block_id === categoryId);
    // Par défaut, l'accès est accordé si aucune permission n'existe
    return permission ? permission.can_access : true;
  };

  const togglePermission = async (categoryId: string, newValue: boolean) => {
    const existingPermission = permissions.find(p => p.block_id === categoryId);
    
    // Mise à jour optimiste
    if (existingPermission) {
      setPermissions(prev => 
        prev.map(p => p.block_id === categoryId ? { ...p, can_access: newValue } : p)
      );
    } else {
      setPermissions(prev => [...prev, {
        role_agence: selectedRole,
        block_id: categoryId,
        can_access: newValue,
      }]);
    }

    try {
      if (existingPermission) {
        const { error } = await supabase
          .from('role_permissions')
          .update({ can_access: newValue })
          .eq('role_agence', selectedRole)
          .eq('block_id', categoryId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('role_permissions')
          .insert({
            role_agence: selectedRole,
            block_id: categoryId,
            can_access: newValue,
          });

        if (error) throw error;
      }

      toast({
        title: 'Permission mise à jour',
        description: `Accès ${newValue ? 'autorisé' : 'refusé'}`,
      });
    } catch (error) {
      console.error('Error toggling permission:', error);
      await loadPermissions();
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la permission',
        variant: 'destructive',
      });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          Gestion des permissions par rôle
        </h1>
        <p className="text-muted-foreground">
          Autorisez ou interdisez l'accès aux guides pour chaque rôle
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Sélectionner un rôle</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AVAILABLE_ROLES.map(role => (
            <Button
              key={role.value}
              variant={selectedRole === role.value ? 'default' : 'outline'}
              className="h-auto py-4 px-6"
              onClick={() => setSelectedRole(role.value)}
            >
              <div className="flex flex-col items-center gap-1">
                <Shield className="w-5 h-5" />
                <span className="font-medium">{role.label}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Catégories accessibles</h2>
        <p className="text-sm text-muted-foreground">
          Cliquez sur une catégorie pour autoriser ou refuser l'accès
        </p>
        
        <div className="grid grid-cols-1 gap-4">
          {MAIN_CATEGORIES.map(category => {
            const isAllowed = hasPermission(category.id);
            
            return (
              <Card 
                key={category.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => togglePermission(category.id, !isAllowed)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                      isAllowed 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {isAllowed ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span className="font-medium text-sm">Autorisé</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          <span className="font-medium text-sm">Interdit</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

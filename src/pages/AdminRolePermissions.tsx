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

interface Category {
  id: string;
  name: string;
}

const AVAILABLE_ROLES = [
  { value: 'dirigeant', label: 'Dirigeant(e)' },
  { value: 'assistant(e)', label: 'Assistant(e)' },
  { value: 'commercial', label: 'Commercial' },
];

// Fonction pour extraire le scope depuis l'URL
function extractScopeFromLink(link: string): string | null {
  if (link.includes('/apogee')) return 'apogee';
  if (link.includes('/apporteur')) return 'apporteurs';
  if (link.includes('/helpconfort')) return 'helpconfort';
  if (link.includes('/mes-indicateurs')) return 'indicateurs';
  return null;
}

export default function AdminRolePermissions() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>('dirigeant');
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (isAdmin) {
      loadCategoriesAndPermissions();
    }
  }, [isAdmin, selectedRole]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const loadCategoriesAndPermissions = async () => {
    setLoading(true);
    try {
      // Charger les home_cards pour récupérer dynamiquement les catégories
      const { data: homeCards, error: homeCardsError } = await supabase
        .from('home_cards')
        .select('*')
        .order('display_order');

      if (homeCardsError) throw homeCardsError;

      // Extraire les scopes depuis les liens
      const extractedCategories: Category[] = [];
      homeCards?.forEach(card => {
        const scope = extractScopeFromLink(card.link);
        if (scope) {
          extractedCategories.push({
            id: scope,
            name: card.title,
          });
        }
      });

      setCategories(extractedCategories);

      // Charger les permissions existantes
      const categoryIds = extractedCategories.map(c => c.id);
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_agence', selectedRole)
        .in('block_id', categoryIds);

      if (permissionsError) throw permissionsError;

      setPermissions(permissionsData || []);

      // Créer automatiquement les permissions manquantes avec can_access=false
      const existingBlockIds = new Set(permissionsData?.map(p => p.block_id) || []);
      const missingCategories = extractedCategories.filter(cat => !existingBlockIds.has(cat.id));

      if (missingCategories.length > 0) {
        // Créer les permissions pour tous les rôles avec accès bloqué par défaut
        const newPermissions = AVAILABLE_ROLES.flatMap(role =>
          missingCategories.map(cat => ({
            role_agence: role.value,
            block_id: cat.id,
            can_access: false, // Bloqué par défaut
          }))
        );

        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(newPermissions);

        if (insertError) {
          console.error('Error creating default permissions:', insertError);
        } else {
          console.log(`Created ${newPermissions.length} default permissions (blocked) for new categories`);
          // Recharger les permissions après insertion
          const { data: updatedPermissions } = await supabase
            .from('role_permissions')
            .select('*')
            .eq('role_agence', selectedRole)
            .in('block_id', categoryIds);

          if (updatedPermissions) {
            setPermissions(updatedPermissions);
          }
        }
      }
    } catch (error) {
      console.error('Error loading categories and permissions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les catégories et permissions',
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
      await loadCategoriesAndPermissions();
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
          {categories.map(category => {
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

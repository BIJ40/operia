import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Block {
  id: string;
  title: string;
  slug: string;
  type: string;
  parentId: string | null;
  order: number;
}

interface Permission {
  role_agence: string;
  block_id: string;
  can_access: boolean;
}

const AVAILABLE_ROLES = [
  { value: 'dirigeant', label: 'Dirigeant(e)' },
  { value: 'assistant(e)', label: 'Assistant(e)' },
  { value: 'commercial', label: 'Commercial' },
];

export default function AdminRolePermissions() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>('dirigeant');
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apporteurBlocks, setApporteurBlocks] = useState<Block[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    if (isAdmin) {
      loadBlocks();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && blocks.length > 0) {
      loadPermissions();
    }
  }, [selectedRole, blocks.length]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const loadBlocks = async () => {
    setLoading(true);
    try {
      // Charger les blocks (Apogée et HelpConfort)
      const { data: blocksData, error: blocksError } = await supabase
        .from('blocks')
        .select('*')
        .order('order', { ascending: true });

      if (blocksError) throw blocksError;

      // Charger les apporteur_blocks
      const { data: apporteurData, error: apporteurError } = await supabase
        .from('apporteur_blocks')
        .select('*')
        .order('order', { ascending: true });

      if (apporteurError) throw apporteurError;

      // Convertir les données en format camelCase
      const mappedBlocks = (blocksData || []).map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        type: b.type,
        parentId: b.parent_id,
        order: b.order
      }));

      const mappedApporteurBlocks = (apporteurData || []).map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        type: b.type,
        parentId: b.parent_id,
        order: b.order
      }));

      setBlocks(mappedBlocks);
      setApporteurBlocks(mappedApporteurBlocks);
    } catch (error) {
      console.error('Error loading blocks:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_agence', selectedRole);

      if (permissionsError) throw permissionsError;

      setPermissions(permissionsData || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les permissions',
        variant: 'destructive',
      });
    }
  };

  const hasPermission = (blockId: string): boolean => {
    const permission = permissions.find(p => p.block_id === blockId);
    // Si aucune permission n'est définie, l'accès est accordé par défaut
    return permission ? permission.can_access : true;
  };

  const togglePermission = async (blockId: string, newValue: boolean) => {
    // Mise à jour optimiste de l'UI
    const existingPermission = permissions.find(p => p.block_id === blockId);
    
    if (existingPermission) {
      setPermissions(prev => 
        prev.map(p => p.block_id === blockId ? { ...p, can_access: newValue } : p)
      );
    } else {
      setPermissions(prev => [...prev, {
        role_agence: selectedRole,
        block_id: blockId,
        can_access: newValue,
      }]);
    }

    try {
      if (existingPermission) {
        const { error } = await supabase
          .from('role_permissions')
          .update({ can_access: newValue })
          .eq('role_agence', selectedRole)
          .eq('block_id', blockId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('role_permissions')
          .insert({
            role_agence: selectedRole,
            block_id: blockId,
            can_access: newValue,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
      // Rollback en cas d'erreur
      await loadPermissions();
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la permission',
        variant: 'destructive',
      });
    }
  };

  const toggleCategoryAndChildren = async (categoryId: string, newValue: boolean) => {
    const allBlocks = [...blocks, ...apporteurBlocks];
    const childBlocks = allBlocks.filter(b => b.parentId === categoryId);
    const blockIds = [categoryId, ...childBlocks.map(b => b.id)];

    // Mise à jour optimiste de l'UI
    setPermissions(prev => {
      const filtered = prev.filter(p => !blockIds.includes(p.block_id));
      const newPerms = blockIds.map(id => ({
        role_agence: selectedRole,
        block_id: id,
        can_access: newValue,
      }));
      return [...filtered, ...newPerms];
    });

    try {
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_agence', selectedRole)
        .in('block_id', blockIds);

      const newPermissions = blockIds.map(id => ({
        role_agence: selectedRole,
        block_id: id,
        can_access: newValue,
      }));

      const { error } = await supabase
        .from('role_permissions')
        .insert(newPermissions);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Permissions ${newValue ? 'activées' : 'désactivées'}`,
      });
    } catch (error) {
      console.error('Error toggling category:', error);
      await loadPermissions();
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier les permissions',
        variant: 'destructive',
      });
    }
  };

  const toggleAllInSection = async (blocksList: Block[], newValue: boolean) => {
    const allBlockIds = blocksList.map(b => b.id);

    // Mise à jour optimiste de l'UI
    setPermissions(prev => {
      const filtered = prev.filter(p => !allBlockIds.includes(p.block_id));
      const newPerms = allBlockIds.map(id => ({
        role_agence: selectedRole,
        block_id: id,
        can_access: newValue,
      }));
      return [...filtered, ...newPerms];
    });

    try {
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_agence', selectedRole)
        .in('block_id', allBlockIds);

      const newPermissions = allBlockIds.map(id => ({
        role_agence: selectedRole,
        block_id: id,
        can_access: newValue,
      }));

      const { error } = await supabase
        .from('role_permissions')
        .insert(newPermissions);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Toutes les permissions ${newValue ? 'activées' : 'désactivées'}`,
      });
    } catch (error) {
      console.error('Error toggling all:', error);
      await loadPermissions();
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier les permissions',
        variant: 'destructive',
      });
    }
  };

  const getSectionCheckState = (blocksList: Block[]): boolean | 'indeterminate' => {
    const allBlockIds = blocksList.map(b => b.id);
    const accessibleCount = allBlockIds.filter(id => hasPermission(id)).length;
    
    if (accessibleCount === 0) return false;
    if (accessibleCount === allBlockIds.length) return true;
    return 'indeterminate';
  };

  const renderCategoryGrid = (parentBlocks: Block[], tableName: 'blocks' | 'apporteur_blocks') => {
    const categories = parentBlocks.filter(b => b.type === 'category' && !b.parentId);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => {
          const categoryPermission = hasPermission(category.id);

          return (
            <Card key={category.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={categoryPermission}
                    onCheckedChange={(checked) => togglePermission(category.id, !!checked)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight break-words">{category.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          Gestion des permissions par rôle
        </h1>
        <p className="text-muted-foreground">
          Gérez les accès aux catégories et sections pour chaque rôle
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Sélectionner un rôle</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      <Tabs defaultValue="apogee" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="apogee">Guide Apogée</TabsTrigger>
          <TabsTrigger value="apporteurs">Guide Apporteurs</TabsTrigger>
          <TabsTrigger value="helpconfort">Base HelpConfort</TabsTrigger>
        </TabsList>

        <TabsContent value="apogee" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Gérez l'accès aux catégories et sections du guide Apogée
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const apogeeBlocks = blocks.filter(b => !b.slug.startsWith('helpconfort-'));
                const currentState = getSectionCheckState(apogeeBlocks);
                toggleAllInSection(apogeeBlocks, currentState !== true);
              }}
            >
              {getSectionCheckState(blocks.filter(b => !b.slug.startsWith('helpconfort-'))) === true 
                ? 'Tout désélectionner' 
                : 'Tout sélectionner'}
            </Button>
          </div>
          {renderCategoryGrid(blocks.filter(b => !b.slug.startsWith('helpconfort-')), 'blocks')}
        </TabsContent>

        <TabsContent value="apporteurs" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Gérez l'accès aux catégories et sections du guide Apporteurs
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const currentState = getSectionCheckState(apporteurBlocks);
                toggleAllInSection(apporteurBlocks, currentState !== true);
              }}
            >
              {getSectionCheckState(apporteurBlocks) === true 
                ? 'Tout désélectionner' 
                : 'Tout sélectionner'}
            </Button>
          </div>
          {renderCategoryGrid(apporteurBlocks, 'apporteur_blocks')}
        </TabsContent>

        <TabsContent value="helpconfort" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Gérez l'accès aux catégories et sections de la base HelpConfort
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const helpconfortBlocks = blocks.filter(b => b.slug.startsWith('helpconfort-'));
                const currentState = getSectionCheckState(helpconfortBlocks);
                toggleAllInSection(helpconfortBlocks, currentState !== true);
              }}
            >
              {getSectionCheckState(blocks.filter(b => b.slug.startsWith('helpconfort-'))) === true 
                ? 'Tout désélectionner' 
                : 'Tout sélectionner'}
            </Button>
          </div>
          {renderCategoryGrid(blocks.filter(b => b.slug.startsWith('helpconfort-')), 'blocks')}
        </TabsContent>
      </Tabs>
    </div>
  );
}

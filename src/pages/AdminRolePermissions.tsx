import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  { value: 'technicien', label: 'Technicien' },
  { value: 'commercial', label: 'Commercial' },
];

export default function AdminRolePermissions() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>('technicien');
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apporteurBlocks, setApporteurBlocks] = useState<Block[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

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

  const toggleCategory = (categoryId: string) => {
    const newOpen = new Set(openCategories);
    if (newOpen.has(categoryId)) {
      newOpen.delete(categoryId);
    } else {
      newOpen.add(categoryId);
    }
    setOpenCategories(newOpen);
  };

  const renderBlockTree = (parentBlocks: Block[], tableName: 'blocks' | 'apporteur_blocks') => {
    const categories = parentBlocks.filter(b => b.type === 'category' && !b.parentId);
    const allBlocks = tableName === 'blocks' ? blocks : apporteurBlocks;

    return categories.map(category => {
      const sections = allBlocks.filter(b => b.type === 'section' && b.parentId === category.id);
      const isOpen = openCategories.has(category.id);
      const categoryPermission = hasPermission(category.id);

      return (
        <div key={category.id} className="border rounded-lg p-4 mb-4">
          <Collapsible open={isOpen} onOpenChange={() => toggleCategory(category.id)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  checked={categoryPermission}
                  onCheckedChange={(checked) => toggleCategoryAndChildren(category.id, !!checked)}
                />
                <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-semibold">{category.title}</span>
                  <span className="text-xs text-muted-foreground">({sections.length} sections)</span>
                </CollapsibleTrigger>
              </div>
            </div>

            <CollapsibleContent className="mt-4 ml-8 space-y-2">
              {sections.map(section => {
                const sectionPermission = hasPermission(section.id);
                return (
                  <div key={section.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                    <Checkbox
                      checked={sectionPermission}
                      onCheckedChange={(checked) => togglePermission(section.id, !!checked)}
                    />
                    <span className="text-sm">{section.title}</span>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>
      );
    });
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Gestion des permissions par rôle
          </h1>
          <p className="text-muted-foreground">
            Gérez les accès aux catégories et sections pour chaque rôle
          </p>
        </div>
        <Link to="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour admin
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sélectionner un rôle</CardTitle>
          <CardDescription>
            Choisissez le rôle pour lequel vous souhaitez gérer les permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_ROLES.map(role => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Guide Apogée</CardTitle>
                <CardDescription>
                  Gérez l'accès aux catégories et sections du guide Apogée
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={getSectionCheckState(blocks.filter(b => !b.slug.startsWith('helpconfort-')))}
                  onCheckedChange={(checked) => 
                    toggleAllInSection(blocks.filter(b => !b.slug.startsWith('helpconfort-')), !!checked)
                  }
                />
                <span className="text-sm font-medium">Tout sélectionner</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderBlockTree(blocks.filter(b => !b.slug.startsWith('helpconfort-')), 'blocks')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Guide Apporteurs</CardTitle>
                <CardDescription>
                  Gérez l'accès aux catégories et sections du guide Apporteurs
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={getSectionCheckState(apporteurBlocks)}
                  onCheckedChange={(checked) => 
                    toggleAllInSection(apporteurBlocks, !!checked)
                  }
                />
                <span className="text-sm font-medium">Tout sélectionner</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderBlockTree(apporteurBlocks, 'apporteur_blocks')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Base HelpConfort</CardTitle>
                <CardDescription>
                  Gérez l'accès aux catégories et sections de la base HelpConfort
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={getSectionCheckState(blocks.filter(b => b.slug.startsWith('helpconfort-')))}
                  onCheckedChange={(checked) => 
                    toggleAllInSection(blocks.filter(b => b.slug.startsWith('helpconfort-')), !!checked)
                  }
                />
                <span className="text-sm font-medium">Tout sélectionner</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderBlockTree(blocks.filter(b => b.slug.startsWith('helpconfort-')), 'blocks')}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, ChevronDown, ChevronRight } from 'lucide-react';
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
  { value: 'dirigeant', label: 'Dirigeant' },
  { value: 'assistant(e)', label: 'Assistant(e)' },
  { value: 'technicien', label: 'Technicien' },
  { value: 'commercial', label: 'Commercial' },
];

export default function AdminRolePermissions() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>('technicien');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apporteurBlocks, setApporteurBlocks] = useState<Block[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, selectedRole]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const loadData = async () => {
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

      // Charger les permissions pour le rôle sélectionné
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_agence', selectedRole);

      if (permissionsError) throw permissionsError;

      setPermissions(permissionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (blockId: string): boolean => {
    const permission = permissions.find(p => p.block_id === blockId);
    // Si aucune permission n'est définie, l'accès est accordé par défaut
    return permission ? permission.can_access : true;
  };

  const togglePermission = async (blockId: string, newValue: boolean) => {
    try {
      // Vérifier si une permission existe déjà
      const existingPermission = permissions.find(p => p.block_id === blockId);

      if (existingPermission) {
        // Mettre à jour
        const { error } = await supabase
          .from('role_permissions')
          .update({ can_access: newValue })
          .eq('role_agence', selectedRole)
          .eq('block_id', blockId);

        if (error) throw error;
      } else {
        // Créer
        const { error } = await supabase
          .from('role_permissions')
          .insert({
            role_agence: selectedRole,
            block_id: blockId,
            can_access: newValue,
          });

        if (error) throw error;
      }

      // Recharger les permissions
      await loadData();
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la permission',
        variant: 'destructive',
      });
    }
  };

  const toggleCategoryAndChildren = async (categoryId: string, newValue: boolean) => {
    setSaving(true);
    try {
      const allBlocks = [...blocks, ...apporteurBlocks];
      const childBlocks = allBlocks.filter(b => b.parentId === categoryId);
      const blockIds = [categoryId, ...childBlocks.map(b => b.id)];

      // Supprimer les anciennes permissions
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_agence', selectedRole)
        .in('block_id', blockIds);

      // Créer les nouvelles permissions
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
        description: `Permissions ${newValue ? 'activées' : 'désactivées'} pour la catégorie et ses enfants`,
      });

      await loadData();
    } catch (error) {
      console.error('Error toggling category:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier les permissions',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
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
                  disabled={saving}
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
                      disabled={saving}
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          Gestion des permissions par rôle
        </h1>
        <p className="text-muted-foreground">
          Gérez les accès aux catégories et sections pour chaque rôle
        </p>
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
            <CardTitle>Guide Apogée</CardTitle>
            <CardDescription>
              Gérez l'accès aux catégories et sections du guide Apogée
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderBlockTree(blocks.filter(b => !b.slug.startsWith('helpconfort-')), 'blocks')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guide Apporteurs</CardTitle>
            <CardDescription>
              Gérez l'accès aux catégories et sections du guide Apporteurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderBlockTree(apporteurBlocks, 'apporteur_blocks')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Base HelpConfort</CardTitle>
            <CardDescription>
              Gérez l'accès aux catégories et sections de la base HelpConfort
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderBlockTree(blocks.filter(b => b.slug.startsWith('helpconfort-')), 'blocks')}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

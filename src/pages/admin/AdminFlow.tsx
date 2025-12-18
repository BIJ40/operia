import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Workflow, Loader2 } from 'lucide-react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { FlowBuilder } from '@/components/flow-builder/FlowBuilder';
import { FlowSchemasList } from '@/components/flow-builder/FlowSchemasList';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  listBlocks,
  listSchemas,
  createSchema,
  deleteSchema,
  getLatestSchemaVersion,
  saveNewVersion,
  publishVersion,
  importPackage,
} from '@/lib/flow/flowApi';
import type { 
  FlowSchema, 
  FlowSchemaVersion, 
  FlowSchemaJson, 
  FlowDomain 
} from '@/lib/flow/flowTypes';
import { FLOW_DOMAINS } from '@/lib/flow/flowTypes';

export default function AdminFlow() {
  const queryClient = useQueryClient();
  const [domainFilter, setDomainFilter] = useState<FlowDomain | 'all'>('all');
  const [selectedSchema, setSelectedSchema] = useState<FlowSchema | null>(null);

  // Fetch blocks
  const { data: blocks = [], isLoading: isLoadingBlocks } = useQuery({
    queryKey: ['flow-blocks'],
    queryFn: listBlocks,
  });

  // Fetch schemas
  const { data: schemas = [], isLoading: isLoadingSchemas } = useQuery({
    queryKey: ['flow-schemas', domainFilter],
    queryFn: () => listSchemas(domainFilter === 'all' ? undefined : domainFilter),
  });

  // Fetch selected schema version
  const { data: schemaVersion, isLoading: isLoadingVersion } = useQuery({
    queryKey: ['flow-schema-version', selectedSchema?.id],
    queryFn: () => (selectedSchema ? getLatestSchemaVersion(selectedSchema.id) : null),
    enabled: !!selectedSchema,
  });

  // Create schema mutation
  const createMutation = useMutation({
    mutationFn: ({ name, domain, description }: { name: string; domain: FlowDomain; description?: string }) =>
      createSchema(name, domain, description),
    onSuccess: (newSchema) => {
      queryClient.invalidateQueries({ queryKey: ['flow-schemas'] });
      setSelectedSchema(newSchema);
      toast.success('Schéma créé');
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    },
  });

  // Delete schema mutation
  const deleteMutation = useMutation({
    mutationFn: (schema: FlowSchema) => deleteSchema(schema.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flow-schemas'] });
      if (selectedSchema) {
        setSelectedSchema(null);
      }
      toast.success('Schéma supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  // Save version mutation
  const saveMutation = useMutation({
    mutationFn: ({ schemaId, json }: { schemaId: string; json: FlowSchemaJson }) =>
      saveNewVersion(schemaId, json),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flow-schema-version', selectedSchema?.id] });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: (versionId: string) => publishVersion(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flow-schema-version', selectedSchema?.id] });
    },
  });

  // Handlers
  const handleSelectSchema = useCallback((schema: FlowSchema) => {
    setSelectedSchema(schema);
  }, []);

  const handleCreateSchema = useCallback(
    async (name: string, domain: FlowDomain, description?: string) => {
      await createMutation.mutateAsync({ name, domain, description });
    },
    [createMutation]
  );

  const handleDeleteSchema = useCallback(
    async (schema: FlowSchema) => {
      await deleteMutation.mutateAsync(schema);
    },
    [deleteMutation]
  );

  const handleSave = useCallback(
    async (json: FlowSchemaJson) => {
      if (!selectedSchema) return;
      await saveMutation.mutateAsync({ schemaId: selectedSchema.id, json });
    },
    [selectedSchema, saveMutation]
  );

  const handlePublish = useCallback(async () => {
    if (!schemaVersion) {
      toast.error('Sauvegardez d\'abord le schéma');
      return;
    }
    await publishMutation.mutateAsync(schemaVersion.id);
  }, [schemaVersion, publishMutation]);

  // Handle package import
  const handleImportPackage = useCallback(async (pkg: any) => {
    try {
      toast.loading('Import du package en cours...', { id: 'package-import' });
      
      const result = await importPackage(pkg);
      
      // Invalidate queries to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['flow-schemas'] });
      
      toast.success(
        `Package "${pkg.packageName || 'Sans nom'}" importé avec succès: ${result.schemasCreated} schéma(s) créé(s)`,
        { id: 'package-import' }
      );
      
      // Select the root schema if available
      if (result.rootSchemaId) {
        const newSchemas = await listSchemas();
        const rootSchema = newSchemas.find(s => s.id === result.rootSchemaId);
        if (rootSchema) {
          setSelectedSchema(rootSchema);
        }
      }
    } catch (error) {
      console.error('Package import error:', error);
      toast.error('Erreur lors de l\'import du package', { id: 'package-import' });
    }
  }, [queryClient]);

  const isLoading = isLoadingBlocks || isLoadingSchemas;

  return (
    <RoleGuard minRole="franchisor_admin">
      <div className="flex flex-col h-screen">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Workflow className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">Flow Builder</h1>
                <p className="text-sm text-muted-foreground">
                  Construisez des formulaires et workflows visuellement
                </p>
              </div>
            </div>
            <Select
              value={domainFilter}
              onValueChange={(v) => setDomainFilter(v as FlowDomain | 'all')}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tous les domaines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les domaines</SelectItem>
                {FLOW_DOMAINS.map((domain) => (
                  <SelectItem key={domain.value} value={domain.value}>
                    {domain.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 flex min-h-0">
            {/* Left: Schemas list */}
            <div className="w-72 border-r border-border p-2">
              <FlowSchemasList
                schemas={schemas}
                selectedSchemaId={selectedSchema?.id}
                onSelect={handleSelectSchema}
                onCreate={handleCreateSchema}
                onDelete={handleDeleteSchema}
                isCreating={createMutation.isPending}
              />
            </div>

            {/* Center & Right: Builder */}
            <div className="flex-1 min-w-0">
              {selectedSchema ? (
                isLoadingVersion ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <FlowBuilder
                    blocks={blocks}
                    initialSchema={schemaVersion?.json || null}
                    onSave={handleSave}
                    onPublish={handlePublish}
                    onImportPackage={handleImportPackage}
                    isSaving={saveMutation.isPending}
                    isPublishing={publishMutation.isPending}
                    schemaName={selectedSchema.name}
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Sélectionnez un schéma ou créez-en un nouveau</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

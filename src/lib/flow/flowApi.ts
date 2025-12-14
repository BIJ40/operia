import { supabase } from '@/integrations/supabase/client';
import type { 
  QuestionBlock, 
  FlowSchema, 
  FlowSchemaVersion, 
  FlowSchemaJson,
  FlowDomain 
} from './flowTypes';
import { logError } from '@/lib/logger';

// ============ BLOCKS ============

export async function listBlocks(): Promise<QuestionBlock[]> {
  const { data, error } = await supabase
    .from('flow_blocks')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    logError('Failed to list flow blocks', error);
    throw error;
  }

  return (data || []) as unknown as QuestionBlock[];
}

export async function getBlock(id: string): Promise<QuestionBlock | null> {
  const { data, error } = await supabase
    .from('flow_blocks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logError('Failed to get flow block', error);
    throw error;
  }

  return data as unknown as QuestionBlock;
}

export async function createBlock(block: Omit<QuestionBlock, 'created_at' | 'updated_at' | 'is_active'>): Promise<QuestionBlock> {
  const { data, error } = await supabase
    .from('flow_blocks')
    .insert(block as unknown as Record<string, unknown>)
    .select()
    .single();

  if (error) {
    logError('Failed to create flow block', error);
    throw error;
  }

  return data as unknown as QuestionBlock;
}

export async function updateBlock(id: string, updates: Partial<QuestionBlock>): Promise<QuestionBlock> {
  const { data, error } = await supabase
    .from('flow_blocks')
    .update(updates as unknown as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logError('Failed to update flow block', error);
    throw error;
  }

  return data as unknown as QuestionBlock;
}

// ============ SCHEMAS ============

export async function listSchemas(domain?: FlowDomain): Promise<FlowSchema[]> {
  let query = supabase
    .from('flow_schemas')
    .select('*')
    .order('updated_at', { ascending: false });

  if (domain) {
    query = query.eq('domain', domain);
  }

  const { data, error } = await query;

  if (error) {
    logError('Failed to list flow schemas', error);
    throw error;
  }

  return (data || []) as FlowSchema[];
}

export async function getSchema(id: string): Promise<FlowSchema | null> {
  const { data, error } = await supabase
    .from('flow_schemas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logError('Failed to get flow schema', error);
    throw error;
  }

  return data as FlowSchema;
}

export async function createSchema(name: string, domain: FlowDomain, description?: string): Promise<FlowSchema> {
  const { data: userData } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('flow_schemas')
    .insert({
      name,
      domain,
      description,
      created_by: userData?.user?.id,
    })
    .select()
    .single();

  if (error) {
    logError('Failed to create flow schema', error);
    throw error;
  }

  return data as FlowSchema;
}

export async function updateSchema(id: string, updates: Partial<FlowSchema>): Promise<FlowSchema> {
  const { data, error } = await supabase
    .from('flow_schemas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logError('Failed to update flow schema', error);
    throw error;
  }

  return data as FlowSchema;
}

export async function deleteSchema(id: string): Promise<void> {
  const { error } = await supabase
    .from('flow_schemas')
    .delete()
    .eq('id', id);

  if (error) {
    logError('Failed to delete flow schema', error);
    throw error;
  }
}

// ============ SCHEMA VERSIONS ============

export async function getLatestSchemaVersion(schemaId: string): Promise<FlowSchemaVersion | null> {
  const { data, error } = await supabase
    .from('flow_schema_versions')
    .select('*')
    .eq('schema_id', schemaId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logError('Failed to get latest schema version', error);
    throw error;
  }

  return data as unknown as FlowSchemaVersion;
}

export async function getPublishedSchemaVersion(schemaId: string): Promise<FlowSchemaVersion | null> {
  const { data, error } = await supabase
    .from('flow_schema_versions')
    .select('*')
    .eq('schema_id', schemaId)
    .eq('is_published', true)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logError('Failed to get published schema version', error);
    throw error;
  }

  return data as unknown as FlowSchemaVersion;
}

export async function listSchemaVersions(schemaId: string): Promise<FlowSchemaVersion[]> {
  const { data, error } = await supabase
    .from('flow_schema_versions')
    .select('*')
    .eq('schema_id', schemaId)
    .order('version', { ascending: false });

  if (error) {
    logError('Failed to list schema versions', error);
    throw error;
  }

  return (data || []) as unknown as FlowSchemaVersion[];
}

export async function saveNewVersion(schemaId: string, json: FlowSchemaJson): Promise<FlowSchemaVersion> {
  // Get current max version
  const { data: maxVersionData } = await supabase
    .from('flow_schema_versions')
    .select('version')
    .eq('schema_id', schemaId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (maxVersionData?.version || 0) + 1;

  const { data, error } = await supabase
    .from('flow_schema_versions')
    .insert([{
      schema_id: schemaId,
      version: nextVersion,
      json: json as unknown as Record<string, unknown>,
    }])
    .select()
    .single();

  if (error) {
    logError('Failed to save new schema version', error);
    throw error;
  }

  // Update schema updated_at
  await supabase
    .from('flow_schemas')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', schemaId);

  return data as unknown as FlowSchemaVersion;
}

export async function publishVersion(schemaVersionId: string): Promise<FlowSchemaVersion> {
  const { data: userData } = await supabase.auth.getUser();

  // Get the version to find the schema_id
  const { data: version, error: versionError } = await supabase
    .from('flow_schema_versions')
    .select('schema_id')
    .eq('id', schemaVersionId)
    .single();

  if (versionError) throw versionError;

  // Unpublish all other versions of this schema
  await supabase
    .from('flow_schema_versions')
    .update({ is_published: false })
    .eq('schema_id', version.schema_id);

  // Publish this version
  const { data, error } = await supabase
    .from('flow_schema_versions')
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
      published_by: userData?.user?.id,
    })
    .eq('id', schemaVersionId)
    .select()
    .single();

  if (error) {
    logError('Failed to publish schema version', error);
    throw error;
  }

  return data as unknown as FlowSchemaVersion;
}

export async function unpublishVersion(schemaVersionId: string): Promise<void> {
  const { error } = await supabase
    .from('flow_schema_versions')
    .update({
      is_published: false,
      published_at: null,
      published_by: null,
    })
    .eq('id', schemaVersionId);

  if (error) {
    logError('Failed to unpublish schema version', error);
    throw error;
  }
}

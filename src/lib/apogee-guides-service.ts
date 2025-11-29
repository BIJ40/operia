// Service CRUD pour la table apogee_guides
import { supabase } from '@/integrations/supabase/client';
import type { ApogeeGuide, ApogeeGuideInsert, ApogeeGuideUpdate } from '@/types/apogeeGuides';

// GET ALL
export async function getAllApogeeGuides(): Promise<ApogeeGuide[]> {
  const { data, error } = await supabase
    .from('apogee_guides')
    .select('*')
    .order('categorie', { ascending: true })
    .order('section', { ascending: true });

  if (error) throw error;
  return (data || []) as ApogeeGuide[];
}

// GET BY ID
export async function getApogeeGuideById(id: string): Promise<ApogeeGuide | null> {
  const { data, error } = await supabase
    .from('apogee_guides')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as ApogeeGuide | null;
}

// GET BY CATEGORIE
export async function getApogeeGuidesByCategorie(categorie: string): Promise<ApogeeGuide[]> {
  const { data, error } = await supabase
    .from('apogee_guides')
    .select('*')
    .eq('categorie', categorie)
    .order('section', { ascending: true });

  if (error) throw error;
  return (data || []) as ApogeeGuide[];
}

// GET BY SECTION
export async function getApogeeGuidesBySection(section: string): Promise<ApogeeGuide[]> {
  const { data, error } = await supabase
    .from('apogee_guides')
    .select('*')
    .eq('section', section)
    .order('titre', { ascending: true });

  if (error) throw error;
  return (data || []) as ApogeeGuide[];
}

// INSERT
export async function insertApogeeGuide(guide: ApogeeGuideInsert): Promise<ApogeeGuide> {
  const { data, error } = await supabase
    .from('apogee_guides')
    .insert(guide)
    .select()
    .single();

  if (error) throw error;
  return data as ApogeeGuide;
}

// INSERT MANY (pour import CSV)
export async function insertManyApogeeGuides(guides: ApogeeGuideInsert[]): Promise<ApogeeGuide[]> {
  const { data, error } = await supabase
    .from('apogee_guides')
    .insert(guides)
    .select();

  if (error) throw error;
  return (data || []) as ApogeeGuide[];
}

// UPDATE
export async function updateApogeeGuide(id: string, updates: ApogeeGuideUpdate): Promise<ApogeeGuide> {
  const { data, error } = await supabase
    .from('apogee_guides')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ApogeeGuide;
}

// DELETE
export async function deleteApogeeGuide(id: string): Promise<void> {
  const { error } = await supabase
    .from('apogee_guides')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// DELETE MANY
export async function deleteManyApogeeGuides(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('apogee_guides')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

// SEARCH (pour RAG)
export async function searchApogeeGuides(query: string): Promise<ApogeeGuide[]> {
  const { data, error } = await supabase
    .from('apogee_guides')
    .select('*')
    .or(`titre.ilike.%${query}%,texte.ilike.%${query}%,tags.ilike.%${query}%`)
    .order('categorie', { ascending: true });

  if (error) throw error;
  return (data || []) as ApogeeGuide[];
}

// GET DISTINCT CATEGORIES
export async function getDistinctCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('apogee_guides')
    .select('categorie')
    .order('categorie', { ascending: true });

  if (error) throw error;
  const categories = [...new Set((data || []).map(d => d.categorie))];
  return categories;
}

// GET DISTINCT SECTIONS
export async function getDistinctSections(): Promise<string[]> {
  const { data, error } = await supabase
    .from('apogee_guides')
    .select('section')
    .order('section', { ascending: true });

  if (error) throw error;
  const sections = [...new Set((data || []).map(d => d.section))];
  return sections;
}

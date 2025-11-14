-- D'abord supprimer la contrainte de clé étrangère
ALTER TABLE public.blocks DROP CONSTRAINT IF EXISTS blocks_parent_id_fkey;

-- Modifier les colonnes
ALTER TABLE public.blocks ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.blocks ALTER COLUMN parent_id TYPE TEXT USING parent_id::text;

-- Changer le default
ALTER TABLE public.blocks ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Recréer la contrainte
ALTER TABLE public.blocks 
  ADD CONSTRAINT blocks_parent_id_fkey 
  FOREIGN KEY (parent_id) 
  REFERENCES public.blocks(id) 
  ON DELETE CASCADE;
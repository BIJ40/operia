-- Créer un bucket pour les icônes de catégories
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-icons', 'category-icons', true);

-- Politique pour permettre à tout le monde de voir les icônes
CREATE POLICY "Les icônes de catégories sont publiques"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-icons');

-- Politique pour permettre aux admins d'uploader des icônes
CREATE POLICY "Les admins peuvent uploader des icônes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'category-icons' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Politique pour permettre aux admins de supprimer des icônes
CREATE POLICY "Les admins peuvent supprimer des icônes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'category-icons' 
  AND has_role(auth.uid(), 'admin'::app_role)
);
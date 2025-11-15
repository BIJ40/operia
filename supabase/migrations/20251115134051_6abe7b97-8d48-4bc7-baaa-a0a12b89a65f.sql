-- Créer un bucket pour les images de catégories
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Créer les politiques RLS pour le bucket
CREATE POLICY "Images de catégories publiquement accessibles"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

CREATE POLICY "Les administrateurs peuvent uploader des images de catégories"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'category-images' AND
  (SELECT COUNT(*) FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') > 0
);

CREATE POLICY "Les administrateurs peuvent supprimer des images de catégories"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'category-images' AND
  (SELECT COUNT(*) FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') > 0
);
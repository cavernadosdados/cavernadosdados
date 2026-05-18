-- Create storage bucket for lore/worldbuilding images
INSERT INTO storage.buckets (id, name, public) VALUES ('lore-images', 'lore-images', true);

-- Allow public read access to lore-images
CREATE POLICY "Lore images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lore-images');

-- Allow authenticated users to upload to lore-images
CREATE POLICY "Authenticated users can upload lore images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'lore-images' AND auth.role() = 'authenticated');

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own lore images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'lore-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own lore images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'lore-images' AND auth.uid()::text = (storage.foldername(name))[1]);
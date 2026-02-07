-- ============================================
-- Memorial Photos Storage Bucket
-- File uploads for memorial photos
-- ============================================

-- Create storage bucket for memorial photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'memorial-photos',
  'memorial-photos',
  true,
  5242880,  -- 5MB limit per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- Allow authenticated users to upload photos to their own folder
CREATE POLICY "Authenticated users can upload memorial photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'memorial-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all memorial photos
CREATE POLICY "Public read access to memorial photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'memorial-photos');

-- Allow users to update their own photos
CREATE POLICY "Users can update own memorial photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'memorial-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own memorial photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'memorial-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Update memorial_photos table comment to reflect storage paths
COMMENT ON COLUMN public.memorial_photos.photo_url IS
  'Storage path or external URL. For uploaded files: memorial-photos/{user_id}/{memorial_id}/{filename}';

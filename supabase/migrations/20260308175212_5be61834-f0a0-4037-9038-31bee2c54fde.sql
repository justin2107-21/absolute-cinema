
-- Create storage bucket for profile banners
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-banners', 'profile-banners', true);

-- Allow authenticated users to upload their own banners
CREATE POLICY "Users can upload banners" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-banners' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to view banners (public bucket)
CREATE POLICY "Anyone can view banners" ON storage.objects FOR SELECT
USING (bucket_id = 'profile-banners');

-- Allow users to update their own banners
CREATE POLICY "Users can update own banners" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-banners' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own banners
CREATE POLICY "Users can delete own banners" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-banners' AND (storage.foldername(name))[1] = auth.uid()::text);

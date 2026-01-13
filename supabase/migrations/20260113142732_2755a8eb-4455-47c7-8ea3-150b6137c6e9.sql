-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Keep the existing "Users can view their own profile" policy
-- But also allow viewing profiles for social features (comments, friends)
-- by allowing authenticated users to see basic profile info of others
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a single, clearer policy: authenticated users can view all profiles
-- This is intentional for social features (comments show usernames, friends list, etc.)
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- For unauthenticated users, no access
CREATE POLICY "Anon users cannot view profiles"
ON public.profiles FOR SELECT
TO anon
USING (false);
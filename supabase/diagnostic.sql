-- ============================================
-- DIAGNOSTIC & FIX SCRIPT
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. FIRST: Check what columns exist in auth.users
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. CHECK EXISTING USERS AND PROFILES (simplified)
SELECT 
  u.id,
  u.email,
  p.full_name,
  p.role AS profile_role,
  p.is_active
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- 2. IF YOU SEE ANY USER WITHOUT A PROFILE, CREATE IT:
-- Insert missing profiles
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT 
  id, email, 
  COALESCE(email, 'User'),
  'gestionnaire',
  true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 3. VERIFY THE TRIGGER IS WORKING
-- Create a test user to verify the trigger auto-creates profile:
-- (This will create a user and should auto-create profile)
-- SELECT create_test_user();

-- 4. CREATE PROFILES FOR EXISTING USERS (if any missing)
-- Already done in step 2 above

-- 5. VERIFY RLS POLICIES
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'members', 'settings')
ORDER BY tablename, policyname;

-- 6. SIMPLIFIED PROFILE POLICIES (for debugging)
-- These are less restrictive while testing:
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Admins: check if the current user's profile role is 'admin'
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL 
  USING (
    -- User is admin if their profile has role='admin'
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin' AND is_active = true
    )
  );

-- 7. TEST LOGIN (from client code)
-- After running create-admin.mjs, test with:
-- await supabase.auth.signInWithPassword({
--   email: 'admin@eyoenian.com',
--   password: 'Admin@12345678'
-- });

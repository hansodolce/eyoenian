-- ============================================
-- CLEANUP & DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. CLEANUP: Delete old admin attempts
DELETE FROM public.profiles WHERE email IN ('admin@eyoenian.com', 'admi2n@eyoenian.com');
DELETE FROM auth.users WHERE email IN ('admin@eyoenian.com', 'admi2n@eyoenian.com');

-- 2. VERIFY: Check what columns exist in auth.users
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users'
LIMIT 20;

-- 3. POLICIES: List all RLS policies on profiles
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 4. TEST: Can the service role insert into profiles?
INSERT INTO public.profiles (id, email, full_name, role, is_active)
VALUES (
  gen_random_uuid(),
  'test-rls@example.com',
  'Test',
  'gestionnaire',
  true
);

-- 5. VERIFY: Was insert successful?
SELECT COUNT(*) as profiles_count FROM public.profiles;

-- 6. CLEANUP: Remove test record
DELETE FROM public.profiles WHERE email = 'test-rls@example.com';
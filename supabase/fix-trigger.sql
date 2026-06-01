-- ============================================
-- FIX TRIGGER - Run this in Supabase SQL Editor
-- ============================================

-- 1. Drop the broken trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop the broken function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Create a NEW working trigger function
-- This function will be called when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile for the user
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.email, 'User'),
    'gestionnaire',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Verify the trigger was created
SELECT trigger_name, event_manipulation, event_object_schema, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 6. Test the function (optional - this won't actually create a user)
-- SELECT public.handle_new_user();

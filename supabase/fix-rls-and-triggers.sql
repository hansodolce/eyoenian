-- ============================================
-- FIX: RLS Policies and Auto Profile Creation
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. DROP problematic circular policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert settings" ON settings;
DROP POLICY IF EXISTS "Admins can update settings" ON settings;

-- 2. CREATE new non-circular admin policies using JWT
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL 
  USING (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.jwt() ->> 'user_role') = 'admin'
  );

CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT 
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.jwt() ->> 'user_role') = 'admin'
  );

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE 
  USING (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.jwt() ->> 'user_role') = 'admin'
  );

-- 3. CREATE trigger function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.email, 'User'),
    'gestionnaire'::TEXT,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CREATE trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Verify existing admins have correct metadata
-- If you have any admin users without the role in metadata, update them:
-- UPDATE auth.users 
-- SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"'::jsonb)
-- WHERE email = 'admin@eyoenian.com';

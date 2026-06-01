-- ============================================
-- Eyo-Enian Database Schema
-- PostgreSQL for Supabase
-- ============================================

-- 1. PROFILES (admin + gestionnaire users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gestionnaire')) DEFAULT 'gestionnaire',
  is_active BOOLEAN DEFAULT true,
  pin TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Allow admins to manage all profiles (check metadata)
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin' AND is_active = true
    )
  );

-- 2. MEMBERS
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  prenoms TEXT NOT NULL,
  telephone TEXT NOT NULL UNIQUE,
  adresse TEXT,
  sexe TEXT NOT NULL CHECK (sexe IN ('M', 'F')),
  date_naissance DATE,
  photo_url TEXT,
  date_adhesion DATE NOT NULL DEFAULT CURRENT_DATE,
  fonction TEXT,
  statut TEXT NOT NULL CHECK (statut IN ('Actif', 'Inactif')) DEFAULT 'Actif',
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_members_nom ON members(nom);
CREATE INDEX idx_members_telephone ON members(telephone);
CREATE INDEX idx_members_statut ON members(statut);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read members"
  ON members FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert members"
  ON members FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update members"
  ON members FOR UPDATE USING (true);

-- 3. ANNUAL CONTRIBUTIONS
CREATE TABLE annual_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annee INTEGER NOT NULL,
  montant NUMERIC(12, 0) NOT NULL CHECK (montant >= 0),
  description TEXT,
  date_limite DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_annual_contributions_annee ON annual_contributions(annee);

ALTER TABLE annual_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage annual contributions"
  ON annual_contributions FOR ALL USING (true);

-- 4. ANNUAL PAYMENTS
CREATE TABLE annual_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES annual_contributions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  montant NUMERIC(12, 0) NOT NULL CHECK (montant >= 0),
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  mode_paiement TEXT NOT NULL CHECK (mode_paiement IN ('Espèces', 'Mobile Money', 'Autres')),
  statut TEXT NOT NULL CHECK (statut IN ('En attente', 'Confirmé', 'Rejeté')) DEFAULT 'En attente',
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_annual_payments_contribution ON annual_payments(contribution_id);
CREATE INDEX idx_annual_payments_member ON annual_payments(member_id);
CREATE INDEX idx_annual_payments_statut ON annual_payments(statut);

ALTER TABLE annual_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage annual payments"
  ON annual_payments FOR ALL USING (true);

-- 5. SPECIAL CONTRIBUTIONS
CREATE TABLE special_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  description TEXT,
  montant NUMERIC(12, 0) NOT NULL CHECK (montant >= 0),
  date_limite DATE,
  type TEXT NOT NULL CHECK (type IN ('Décès', 'Mariage', 'Projet', 'Voyage', 'Événement', 'Soutien spécial', 'Autre')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE special_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage special contributions"
  ON special_contributions FOR ALL USING (true);

-- 6. SPECIAL PAYMENTS
CREATE TABLE special_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES special_contributions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  montant NUMERIC(12, 0) NOT NULL CHECK (montant >= 0),
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  mode_paiement TEXT NOT NULL CHECK (mode_paiement IN ('Espèces', 'Mobile Money', 'Autres')),
  statut TEXT NOT NULL CHECK (statut IN ('En attente', 'Confirmé', 'Rejeté')) DEFAULT 'En attente',
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_special_payments_contribution ON special_payments(contribution_id);
CREATE INDEX idx_special_payments_member ON special_payments(member_id);

ALTER TABLE special_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage special payments"
  ON special_payments FOR ALL USING (true);

-- 7. DISBURSEMENTS
CREATE TABLE disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  responsable TEXT NOT NULL,
  observation TEXT,
  total_montant NUMERIC(12, 0) NOT NULL CHECK (total_montant >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage disbursements"
  ON disbursements FOR ALL USING (true);

-- 8. DISBURSEMENT ITEMS
CREATE TABLE disbursement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disbursement_id UUID NOT NULL REFERENCES disbursements(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  montant NUMERIC(12, 0) NOT NULL CHECK (montant >= 0)
);

ALTER TABLE disbursement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage disbursement items"
  ON disbursement_items FOR ALL USING (true);

-- 9. MEETINGS
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  heure TIME NOT NULL,
  lieu TEXT NOT NULL,
  objet TEXT NOT NULL,
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage meetings"
  ON meetings FOR ALL USING (true);

-- 10. ATTENDANCES
CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  statut TEXT NOT NULL CHECK (statut IN ('Présent', 'Absent', 'Excusé')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id, member_id)
);

CREATE INDEX idx_attendances_meeting ON attendances(meeting_id);
CREATE INDEX idx_attendances_member ON attendances(member_id);

ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage attendances"
  ON attendances FOR ALL USING (true);

-- 11. SETTINGS
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings"
  ON settings FOR SELECT USING (true);

CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.jwt() ->> 'user_role') = 'admin'
  );

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE USING (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.jwt() ->> 'user_role') = 'admin'
  ) WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.jwt() ->> 'user_role') = 'admin'
  );

-- 12. IMPORT LOGS
CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fichier TEXT NOT NULL,
  type TEXT NOT NULL,
  lignes_total INTEGER DEFAULT 0,
  lignes_importees INTEGER DEFAULT 0,
  lignes_erreurs INTEGER DEFAULT 0,
  rapport TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage import logs"
  ON import_logs FOR ALL USING (true);

-- 13. AUTO-UPDATE TRIGGER FOR members.updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 14. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.email, 'User'),
    'gestionnaire'::TEXT,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Admin creation script
-- Run this AFTER the schema above, but ONLY if
-- the admin user doesn't already exist.
-- Update email/password as needed.
-- ============================================
-- INSERT INTO auth.users (
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   raw_user_meta_data
-- ) VALUES (
--   'admin@eyoenian.com',
--   crypt('Admin123!', gen_salt('bf')),
--   now(),
--   '{"full_name":"Administrateur","role":"admin"}'::jsonb
-- );

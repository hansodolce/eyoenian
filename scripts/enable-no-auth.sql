-- Mode gestionnaire unique, sans connexion.
-- Exécuter dans l'éditeur SQL Supabase sur la base existante.
-- Les opérations métier deviennent accessibles avec la clé publique du projet.
-- Ce script peut être exécuté plusieurs fois et conserve les données existantes.
BEGIN;

GRANT USAGE ON SCHEMA public TO anon, authenticated;

DO $$
DECLARE
  table_name text;
  existing_policy record;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'members', 'annual_contributions', 'annual_payments',
    'special_contributions', 'special_payments', 'disbursements',
    'disbursement_items', 'meetings', 'attendances', 'settings', 'import_logs'
  ] LOOP
    -- Remplacer les anciennes restrictions de rôle sur les seules tables métier.
    FOR existing_policy IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', existing_policy.policyname, table_name);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', table_name);

    IF table_name = 'settings' THEN
      -- Le PIN historique n'est plus utilisé ni exposé par l'application.
      EXECUTE 'CREATE POLICY gestionnaire_direct_access ON public.settings
        FOR ALL TO anon, authenticated
        USING (key IN (''nom'', ''adresse'', ''telephone'', ''email''))
        WITH CHECK (key IN (''nom'', ''adresse'', ''telephone'', ''email''))';
    ELSE
      EXECUTE format('CREATE POLICY gestionnaire_direct_access ON public.%I
        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', table_name);
    END IF;
  END LOOP;
END;
$$;

-- Les anciens comptes sont conservés mais ne servent plus à l'application.
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.update_own_gestionnaire(uuid, text, text, text, text);

COMMIT;

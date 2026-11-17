-- Exécuter dans l'éditeur SQL Supabase pour activer les modifications
-- personnelles des gestionnaires (connexion anonyme + téléphone/PIN).
CREATE OR REPLACE FUNCTION public.update_own_gestionnaire(
  p_id uuid,
  p_current_pin text,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_new_pin text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Veuillez vous reconnecter';
  END IF;
  SELECT * INTO v_profile FROM public.profiles
    WHERE id = p_id AND role = 'gestionnaire' AND is_active = true
      AND pin = p_current_pin AND coalesce(p_current_pin, '') <> ''
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PIN actuel incorrect ou compte indisponible';
  END IF;
  IF p_full_name IS NOT NULL AND btrim(p_full_name) = '' THEN
    RAISE EXCEPTION 'Le nom est obligatoire';
  END IF;
  IF p_phone IS NOT NULL AND btrim(p_phone) = '' THEN
    RAISE EXCEPTION 'Le téléphone est obligatoire';
  END IF;
  IF p_new_pin IS NOT NULL AND (p_new_pin !~ '^[0-9]{4}$' OR p_new_pin = p_current_pin) THEN
    RAISE EXCEPTION 'Choisissez un nouveau PIN de 4 chiffres';
  END IF;
  UPDATE public.profiles SET
    full_name = coalesce(btrim(p_full_name), full_name),
    phone = coalesce(btrim(p_phone), phone),
    pin = coalesce(p_new_pin, pin)
    WHERE id = v_profile.id
    RETURNING * INTO v_profile;
  RETURN to_jsonb(v_profile) - 'pin';
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_gestionnaire(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_gestionnaire(uuid, text, text, text, text) TO authenticated;

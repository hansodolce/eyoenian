-- Exécute ceci dans Supabase SQL Editor pour lister les fonctions auth disponibles
SELECT proname, pg_get_function_arguments(oid) AS args
FROM pg_proc
WHERE pronamespace = 'auth'::regnamespace
  AND proname LIKE '%user%'
ORDER BY proname;

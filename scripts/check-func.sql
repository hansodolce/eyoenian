-- Explore available auth functions
SELECT proname, pronargs, pg_get_function_arguments(oid) as args
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
  AND proname LIKE '%create%user%'
ORDER BY proname;

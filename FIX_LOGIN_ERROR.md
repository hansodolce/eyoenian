# Correction de l'erreur 500 - Connexion impossible

## Problème
Erreur 500 lors de la tentative de connexion:
```
profiles?select=*&id=eq.dc992189-403f-4039-a35e-4e8d3fe69f0d:1
Failed to load resource: the server responded with a status of 500
```

## Causes possibles
1. **Le profil de l'utilisateur n'existe pas** dans la table `profiles`
2. **Les policies RLS (Row Level Security) ont des dépendances circulaires**
3. **Le rôle admin n'est pas correctement configuré**

## Solution complète

### Étape 1 : Nettoyer les policies RLS dans Supabase

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Allez dans **SQL Editor**
3. Créez une nouvelle query et exécutez le contenu du fichier `supabase/diagnostic.sql`

Ceci va:
- Lister tous les utilisateurs et leurs profils
- Corriger les policies RLS
- Créer les profils manquants

### Étape 2 : Réinitialiser l'utilisateur admin

Dans VS Code Terminal, exécutez:

```powershell
node --env-file=.env scripts/create-admin.mjs
```

Cela va:
- Supprimer l'utilisateur admin existant
- Créer un nouvel utilisateur admin avec les bonnes métadonnées
- Créer automatiquement son profil grâce au trigger

### Étape 3 : Mettre à jour le schéma (une seule fois)

Si vous avez accès au SQL Editor de Supabase, exécutez aussi:

```sql
-- Exécutez le contenu du fichier: supabase/fix-rls-and-triggers.sql
```

Cela va:
- Créer des policies RLS non-circulaires
- Mettre à jour le trigger `handle_new_user()`

### Étape 4 : Tester la connexion

1. Accédez à l'application
2. Allez sur la page **Admin Login** (`/login/admin`)
3. Connectez-vous avec:
   - Email: `admin@eyoenian.com`
   - Password: `Admin@12345678`

## Vérification

Si vous voyez cette erreur dans la console:
```
SyntaxError: Unexpected character ":" at line X
```

C'est normal - un assemblage de lien interne. La connexion devrait réussir et vous rediriger vers `/dashboard`.

## Si cela ne fonctionne toujours pas

Exécutez ce script de diagnostic dans le **SQL Editor** de Supabase:

```sql
-- 1. Vérifier les utilisateurs
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- 2. Vérifier les profils
SELECT id, email, full_name, role FROM public.profiles ORDER BY created_at DESC LIMIT 5;

-- 3. Vérifier les policies
SELECT schemaname, tablename, policyname FROM pg_policies 
WHERE tablename = 'profiles' ORDER BY policyname;
```

Rapportez les résultats si le problème persiste.

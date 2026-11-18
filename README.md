# Eyo-Enian — mode gestionnaire sans authentification

L'application s'ouvre directement sur `/dashboard`. Tous les visiteurs utilisent
le même espace gestionnaire : membres, cotisations, paiements, décaissements,
réunions, présences, rapports, import Excel et paramètres.

Il n'y a plus de compte utilisateur, de mot de passe, de PIN ou de session à créer.
Les anciennes URL de connexion redirigent vers le tableau de bord. `/profile`
redirige vers les paramètres et `/gestionnaires` vers le tableau de bord.

## Configuration Supabase

1. Conserver `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans l'environnement
   local et celui de l'hébergement. Utiliser la clé publique du projet.
2. Sur la base existante, exécuter **`scripts/enable-no-auth.sql`** dans l'éditeur SQL
   Supabase avant de déployer cette version.
3. Déployer l'application. L'activation des connexions anonymes Supabase Auth
   n'est plus nécessaire : le client utilise directement la clé publique et ignore
   les anciennes sessions du navigateur.

Le script accorde la lecture et les modifications des données métier sans
connexion. Toute personne ayant accès à l'application peut donc les gérer.
Les données et les anciens comptes sont conservés ; la table `profiles` n'est
plus accessible au client. Le PIN global historique n'est plus utilisé.

## Commandes

```sh
npm install
npm run dev
npm run build
node --test scripts/no-auth.test.mjs
```

## Notes du template d'origine

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

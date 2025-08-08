# Déploiement ECOS Infirmier sur Vercel

## Configuration pour Vercel

Le projet ECOS Infirmier a été adapté pour le déploiement sur Vercel avec les fonctionnalités suivantes :

### 🔄 Rewrites d'URL
- `/teacher/email@domain.com` → Page enseignant avec email dans l'URL
- `/student/email@domain.com` → Page étudiant avec email dans l'URL  
- `/admin` → Page d'administration
- `/api/*` → Backend Express.js

### 📁 Structure de déploiement
```
├── client/                 # Frontend React + Vite
│   ├── index.html         # Page d'accueil
│   ├── teacher.html       # Page enseignant
│   ├── student.html       # Page étudiant
│   ├── admin.html         # Page admin
│   └── package.json       # Config client pour Vercel
├── server/                 # Backend Express.js
│   └── index.ts           # API serverless
├── vercel.json            # Configuration Vercel
└── dist/                  # Build output
```

## 🚀 Étapes de déploiement

### 1. Préparer les variables d'environnement
Configurer sur Vercel les variables suivantes :
```bash
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
PINECONE_INDEX_NAME=infirmierbeaujon
NODE_ENV=production
```

### 2. Déployer sur Vercel
```bash
# Via CLI Vercel
npx vercel --prod

# Ou via GitHub integration
# 1. Connecter le repo GitHub à Vercel
# 2. Configurer les variables d'environnement
# 3. Déployer automatiquement
```

### 3. Tester les routes
- `https://votre-app.vercel.app/` → Page d'accueil
- `https://votre-app.vercel.app/teacher/prof@ecole.fr` → Dashboard enseignant
- `https://votre-app.vercel.app/student/etudiant@ecole.fr` → Interface étudiant
- `https://votre-app.vercel.app/admin` → Panel admin
- `https://votre-app.vercel.app/api/health` → API backend

## 🔧 Configuration technique

### Frontend (Vite + React)
- Build statique avec pages HTML séparées
- Récupération des paramètres email depuis l'URL
- Compatible avec les rewrites Vercel

### Backend (Express.js)
- Fonctions serverless Vercel
- Timeout configuré à 30 secondes
- Proxy API vers `/api/*`

### Sécurité
- Variables d'environnement sécurisées
- Pas de clés API exposées côté client
- CORS configuré pour production

## 🐛 Dépannage

### Problème de routes
Si les routes ne fonctionnent pas :
1. Vérifier `vercel.json` rewrites
2. S'assurer que les pages HTML sont buildées
3. Contrôler les logs Vercel

### Variables d'environnement
Si l'API ne fonctionne pas :
1. Vérifier les variables sur Vercel dashboard
2. Redéployer après modification des variables
3. Tester les endpoints API individuellement

### Build errors
Si le build échoue :
```bash
# Tester localement
npm run build:vercel

# Nettoyer et rebuilder
rm -rf dist node_modules
npm install
npm run build:vercel
```

## 📝 Notes importantes

- Les emails dans l'URL sont automatiquement décodés
- Le backend est serverless (cold starts possibles)
- Les assets statiques sont servis via CDN Vercel
- Logs disponibles dans Vercel dashboard

## 🔗 Liens utiles
- [Documentation Vercel](https://vercel.com/docs)
- [Configuration Rewrites](https://vercel.com/docs/concepts/projects/project-configuration#rewrites)
- [Variables d'environnement](https://vercel.com/docs/concepts/projects/environment-variables)

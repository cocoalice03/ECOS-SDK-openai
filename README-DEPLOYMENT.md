# ECOS Infirmier - Configuration de Déploiement

## Variables d'Environnement Requises

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

### Variables Obligatoires

```bash
# Base de données PostgreSQL (Supabase)
DATABASE_URL=postgresql://username:password@host:5432/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI API pour l'IA conversationnelle et la commande vocale
OPENAI_API_KEY=sk-proj-your_openai_api_key

# Pinecone pour la recherche vectorielle
PINECONE_API_KEY=pcsk_your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=infirmierbeaujon
```

### Variables Optionnelles

```bash
# Configuration serveur
NODE_ENV=production
PORT=3000

# Firebase (si utilisé pour l'authentification)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
```

## Installation et Démarrage

1. **Installer les dépendances :**
   ```bash
   npm install
   ```

2. **Configurer les variables d'environnement :**
   - Copiez le fichier `.env.example` vers `.env`
   - Remplissez toutes les variables requises

3. **Démarrer en développement :**
   ```bash
   npm run dev
   ```

4. **Build pour la production :**
   ```bash
   npm run build
   npm start
   ```

## Fonctionnalités

- 🤖 **Assistant IA conversationnel** avec RAG (Retrieval-Augmented Generation)
- 🎙️ **Commande vocale temps réel** avec WebRTC et OpenAI Realtime API
- 🏥 **Simulations ECOS** pour la formation médicale
- 📚 **Base de connaissances** avec recherche vectorielle
- 👥 **Interface multi-utilisateurs** (étudiants, enseignants, administrateurs)

## Architecture

- **Frontend :** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend :** Express.js + TypeScript
- **Base de données :** PostgreSQL (Supabase)
- **Recherche vectorielle :** Pinecone
- **IA :** OpenAI GPT-4 + Realtime API
- **Commande vocale :** WebRTC + Whisper

## Sécurité

⚠️ **Important :** Ne jamais commiter le fichier `.env` ou exposer les clés API dans le code source.

Le fichier `.gitignore` est configuré pour protéger automatiquement :
- Le fichier `.env`
- Les dossiers `node_modules/`
- Les builds de production
- Les fichiers temporaires

## Support

Pour toute question technique, consultez la documentation du projet ou contactez l'équipe de développement.

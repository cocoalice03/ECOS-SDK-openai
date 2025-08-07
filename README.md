
# 🏥 LearnWorlds RAG Assistant - Plateforme ECOS Infirmier

## 📋 Vue d'ensemble

Cette application est un assistant éducatif intelligent conçu pour l'intégration avec LearnWorlds LMS. Elle combine des capacités de chatbot IA alimentées par RAG (Retrieval-Augmented Generation) avec des fonctionnalités de simulation ECOS (Examen Clinique Objectif Structuré) pour la formation médicale en kinésithérapie et soins infirmiers.

## 🎯 Fonctionnalités principales

### 1. 🤖 Système RAG (Retrieval-Augmented Generation)
- **Base de connaissances intelligente** : Stockage et recherche vectorielle de documents PDF
- **Recherche sémantique** : Utilisation d'embeddings pour trouver le contenu le plus pertinent
- **Génération de réponses contextuelles** : Réponses IA basées sur le contenu spécialisé
- **Gestion multi-index** : Support de différents domaines de connaissances

### 2. 🏥 Plateforme de simulation ECOS
- **Patients virtuels IA** : Simulation de consultations patient-soignant
- **Scénarios cliniques** : Cas d'étude interactifs pour l'apprentissage
- **Évaluation automatisée** : Système de notation et feedback intelligent
- **Sessions d'entraînement** : Organisation de parcours d'apprentissage structurés

### 3. 👥 Gestion des utilisateurs
- **Authentification par email** : Système d'identification simple et sécurisé
- **Rôles différenciés** :
  - **Admin** : Gestion complète des contenus et index
  - **Enseignant** : Création de scénarios et suivi des étudiants
  - **Étudiant** : Accès aux simulations et chatbot
- **Limites quotidiennes** : 20 questions par jour par utilisateur
- **Sessions persistantes** : Historique des interactions sauvegardé

### 4. 📊 Interface d'administration
- **Gestion des index Pinecone** : Création, sélection et maintenance
- **Upload de documents** : Import et traitement automatique de PDFs
- **Catégorisation** : Organisation par spécialités médicales
- **Monitoring en temps réel** : Suivi des performances et utilisation

## 🛠️ Architecture technique

### Frontend (React/TypeScript)
```
Technologies utilisées :
├── React 18 + TypeScript
├── Vite (Build system)
├── Tailwind CSS + Radix UI
├── TanStack Query (State management)
├── Wouter (Client-side routing)
└── Framer Motion (Animations)
```

**Composants principaux :**
- **Pages** : Admin, Teacher, Student, Diagnostic
- **Composants ECOS** : PatientSimulator, EvaluationReport, TrainingSessionsTab
- **Composants Debug** : Outils de diagnostic et monitoring
- **UI Components** : Système de design cohérent avec Radix UI

### Backend (Node.js/Express)
```
Technologies utilisées :
├── Node.js + Express.js
├── TypeScript
├── Drizzle ORM
├── Session management
├── Multer (File uploads)
└── WebSocket support
```

**Services principaux :**
- **PineconeService** : Gestion des embeddings et recherche vectorielle
- **OpenAIService** : Génération de réponses et embeddings
- **EcosService** : Logique de simulation patient
- **EvaluationService** : Système d'évaluation automatisé
- **FirebaseService** : Authentification et données utilisateur

### Base de données
```
Stack de données :
├── PostgreSQL (Supabase) - Données principales
├── Pinecone - Base vectorielle pour RAG
├── Firebase Firestore - Données utilisateur
└── Sessions Redis-like - État des sessions
```

**Tables principales :**
- `users` : Profils et authentification
- `scenarios` : Cas cliniques ECOS
- `training_sessions` : Historique des formations
- `chat_history` : Conversations sauvegardées
- `evaluations` : Résultats et feedback

## 🧠 Intelligence artificielle

### Modèles utilisés
- **OpenAI GPT-4o** : Génération de réponses conversationnelles
- **text-embedding-3-small** : Création d'embeddings pour la recherche

### Pipeline RAG
1. **Indexation** : Documents PDF → Chunking → Embeddings → Pinecone
2. **Recherche** : Question → Embedding → Recherche similarité → Contexte
3. **Génération** : Contexte + Question → GPT-4o → Réponse personnalisée

## 🎓 Domaines médicaux supportés

### Spécialités couvertes
- 🧒 **Pédiatrie** : Soins infirmiers pédiatriques
- 🫁 **Kinésithérapie respiratoire** : Rééducation pulmonaire
- 🦴 **Musculo-squelettique/Orthopédie** : Traumatologie et rééducation
- 🧠 **Neurologie** : Soins neurologiques et réhabilitation
- 👴 **Gériatrie** : Soins aux personnes âgées
- 🤱 **Périnéologie & Obstétrique** : Santé reproductive
- 🎗️ **Oncologie** : Soins en cancérologie
- ⚖️ **Ergonomie** : Prévention et adaptation
- 🔬 **Domaines transversaux** : Compétences polyvalentes

## 🔧 Configuration et déploiement

### Variables d'environnement requises
```env
# Base de données
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...

# IA et recherche
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=infirmierbeaujon


# Firebase
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

### Scripts disponibles
```bash
# Développement
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run start        # Serveur de production

# Base de données
npm run db:push      # Synchronisation du schéma
npm run check        # Vérification TypeScript
```

## 🚀 Fonctionnalités avancées

### 1. Système de chunks intelligents
- **Découpage automatique** : Division optimale des documents PDF
- **Overlapping** : Chevauchement pour préserver le contexte
- **Métadonnées riches** : Source, catégorie, index de chunk

### 2. Recherche multi-dimensionnelle
- **Embeddings adaptatifs** : Dimensions variables selon l'index
- **Filtrage par source** : Recherche ciblée par document
- **Score de pertinence** : Classement par similarité sémantique

### 3. Évaluation ECOS automatisée
- **Critères multiples** : Communication, diagnostic, traitement
- **Scoring IA** : Notation automatique des interactions
- **Feedback détaillé** : Conseils d'amélioration personnalisés

### 4. Interface adaptive
- **Design responsive** : Optimisé mobile et desktop
- **Thème professionnel** : Interface médicale clean
- **Accessibilité** : Support des lecteurs d'écran

## 📈 Monitoring et debug

### Outils de diagnostic intégrés
- **Health checks** : Monitoring des services
- **Debug endpoints** : Inspection en temps réel
- **Logs structurés** : Traçabilité complète
- **Performance metrics** : Métriques d'utilisation

### Endpoints de monitoring
```
GET /health          # État général du système
GET /ready           # Vérification de disponibilité
GET /diagnostic      # Page de diagnostic complète
```

## 🔐 Sécurité

### Mesures de protection
- **Validation des entrées** : Sanitisation avec Zod
- **Rate limiting** : Limitation des requêtes par utilisateur
- **Session sécurisée** : Tokens d'authentification
- **Filtrage de contenu** : Protection contre les injections

### Gestion des erreurs
- **Fallback gracieux** : Fonctionnement dégradé si services indisponibles
- **Retry automatique** : Nouvelle tentative sur échec temporaire
- **Logs d'erreur** : Traçabilité complète des problèmes

## 🎯 Cas d'usage

### Pour les enseignants
1. **Création de scénarios** : Développement de cas cliniques
2. **Suivi des étudiants** : Monitoring des performances
3. **Gestion de contenu** : Upload et organisation de ressources

### Pour les étudiants
1. **Simulation patient** : Entraînement en conditions réelles
2. **Questions/réponses** : Assistance IA contextuelle
3. **Auto-évaluation** : Feedback immédiat sur les performances

### Pour les administrateurs
1. **Gestion globale** : Configuration des index et contenus
2. **Analytics** : Suivi d'utilisation et performance
3. **Maintenance** : Monitoring et résolution des problèmes

## 🔄 Intégration LearnWorlds

### Script d'intégration
- **JavaScript injectable** : Integration dans les cours LearnWorlds
- **API webhook** : Synchronisation des données utilisateur
- **SSO compatible** : Authentification transparente

### Déploiement
- **Hébergement Replit** : Déploiement cloud automatisé
- **Scaling automatique** : Adaptation à la charge
- **HTTPS par défaut** : Sécurité des communications

## 📞 Support et contribution

### Structure du projet
```
220725-ECOS-infirmier/
├── client/          # Frontend React
├── server/          # Backend Express
├── shared/          # Types partagés
├── scripts/         # Scripts utilitaires
└── docs/           # Documentation
```

### Points d'extension
- **Nouveaux modèles IA** : Support d'autres LLMs
- **Bases vectorielles** : Alternative à Pinecone
- **Authentification** : Intégration d'autres providers
- **Export de données** : Formats additionnels

---

**Développé pour l'excellence en formation médicale** 🏥✨

*Cette plateforme révolutionne l'apprentissage médical en combinant l'intelligence artificielle avec la simulation clinique interactive.*

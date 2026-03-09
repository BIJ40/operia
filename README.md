# Manuel CRM Apogée - Guide d'utilisation éditable    

[![Operia CI](https://github.com/<OWNER>/<REPO>/actions/workflows/operia-ci.yml/badge.svg)](https://github.com/<OWNER>/<REPO>/actions/workflows/operia-ci.yml)
 
Application React permettant de gérer et éditer le guide d'utilisation du CRM Apogée avec un système de blocs modulaires, navigation conditionnelle et édition visuelle.

## 🚀 Fonctionnalités

- **Grille de blocs modulaires** : Page d'accueil avec cartes éditables
- **Navigation conditionnelle** : Épinglez des blocs pour créer des pages secondaires avec sidebar
- **Éditeur visuel** : Drag & drop, réorganisation, édition en temps réel
- **Couleurs préréglées** : Vert (bonnes pratiques), Jaune (astuces), Rouge (à éviter)
- **Authentification admin** : Login simple pour activer le mode édition
- **Persistance locale** : Sauvegarde automatique dans IndexedDB
- **Export/Import** : Format JSON pour sauvegarde et transfert

## 📦 Installation

```bash
# Cloner le dépôt
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build pour production
npm run build
```

## 🔐 Authentification

**Identifiants par défaut :**
- Utilisateur : `admin`
- Mot de passe : `apogee2024`

> ⚠️ Pour la production, modifiez ces valeurs dans `src/contexts/AuthContext.tsx`

## 📚 Import des données initiales

1. Connectez-vous en tant qu'administrateur
2. Cliquez sur "Import" dans la barre d'outils
3. Sélectionnez le fichier `src/data/seed.json`

Le contenu initial contient 8 sections principales du manuel Apogée.

## 🎨 Utilisation

### Mode Lecture (par défaut)
- Visualisez les blocs en grille responsive
- Cliquez sur les blocs épinglés pour accéder aux pages détaillées
- Navigation via sidebar sur les pages secondaires

### Mode Édition (après connexion)
- **Ajouter un bloc** : Bouton "+" en haut à droite
- **Réorganiser** : Glissez-déposez les blocs
- **Épingler** : Activez le toggle "Épingler au menu" pour créer une page `/b/:slug`
- **Supprimer** : Icône corbeille sur chaque bloc
- **Exporter** : Sauvegardez toutes vos données en JSON
- **Importer** : Restaurez ou transférez des données

### Couleurs préréglées
- **Vert pastel** : Bonnes pratiques
- **Jaune pastel** : Astuces et conseils
- **Rouge pastel** : Erreurs à éviter
- **Neutre** : Contenu standard

## 🏗️ Architecture

```
src/
├── components/          # Composants réutilisables
│   ├── BlockCard.tsx   # Carte de bloc avec drag & drop
│   ├── EditorToolbar.tsx
│   ├── LoginDialog.tsx
│   └── Sidebar.tsx
├── contexts/           # Contexts React
│   ├── AuthContext.tsx
│   └── EditorContext.tsx
├── lib/
│   └── db.ts          # Gestion IndexedDB
├── pages/
│   ├── Home.tsx       # Page d'accueil (grille)
│   └── BlockDetail.tsx # Page bloc épinglé
├── types/
│   └── block.ts       # Types TypeScript
└── data/
    └── seed.json      # Données initiales
```

## 🔧 Stack technique

- **React 18** + TypeScript
- **TailwindCSS** : Design system
- **React Router** : Navigation
- **@dnd-kit** : Drag & drop
- **@tiptap** : Éditeur riche (futur)
- **idb** : IndexedDB wrapper
- **Lucide React** : Icônes

## 📝 Format de données

```json
{
  "blocks": [
    {
      "id": "unique-id",
      "type": "content",
      "title": "Titre du bloc",
      "content": "<p>Contenu HTML...</p>",
      "icon": "BookOpen",
      "colorPreset": "good",
      "order": 0,
      "size": "lg",
      "pinned": true,
      "slug": "titre-du-bloc",
      "attachments": []
    }
  ],
  "version": "1.0",
  "lastModified": 1234567890
}
```

## 🚀 Déploiement

Simply open [Lovable](https://lovable.dev/projects/fec9c289-c9ae-48ee-83c7-69ea7150d5b5) and click on Share -> Publish.

You can also build manually:
1. Build de production : `npm run build`
2. Le dossier `dist/` contient l'application statique
3. Déployez sur n'importe quel hébergement statique

## 📄 Licence

Usage interne - Apogée / HELPCONFORT

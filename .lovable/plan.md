## Plan : Appliquer le thème depan40 uniquement à l'espace `/apporteur`

### Objectif

Donner à toute la section `/apporteur` (login + layout authentifié) l'identité visuelle du projet depan40 : couleurs, typographies (Montserrat/Open Sans), ombres et gradients, **sans toucher au reste du projet**.

### Approche technique

On utilise le **scoping CSS** : les variables CSS du thème depan40 sont redéfinies dans une classe `.apporteur-theme` appliquée au conteneur racine de l'espace apporteur. Tout composant enfant hérite automatiquement des nouvelles valeurs.

### Fichiers modifiés

#### 1. `src/index.css` — Ajouter le scope `.apporteur-theme`

Ajouter en fin de fichier un bloc qui redéfinit toutes les variables CSS sous `.apporteur-theme` :

```css
/* ── Thème Apporteur (depan40) ── */
.apporteur-theme {
  --background: 210 20% 98%;
  --foreground: 215 25% 20%;
  --card: 0 0% 100%;
  --card-foreground: 215 25% 20%;
  --popover: 0 0% 100%;
  --popover-foreground: 215 25% 20%;
  --primary: 205 85% 45%;
  --primary-foreground: 0 0% 100%;
  --primary-light: 200 85% 55%;
  --primary-dark: 210 85% 32%;
  --secondary: 38 95% 55%;
  --secondary-foreground: 0 0% 100%;
  --muted: 210 20% 95%;
  --muted-foreground: 215 15% 50%;
  --accent: 205 85% 92%;
  --accent-foreground: 205 85% 30%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 210 20% 90%;
  --input: 210 20% 90%;
  --ring: 205 85% 45%;
  --radius: 0.75rem;

  --gradient-hero: linear-gradient(135deg, hsl(205 85% 45%) 0%, hsl(200 85% 55%) 50%, hsl(195 80% 60%) 100%);
  --gradient-cta: linear-gradient(135deg, hsl(38 95% 55%) 0%, hsl(30 95% 50%) 100%);
  --shadow-card: 0 4px 20px -4px hsl(205 85% 45% / 0.12);
  --shadow-card-hover: 0 8px 30px -4px hsl(205 85% 45% / 0.2);
  --shadow-hero: 0 20px 60px -15px hsl(205 85% 45% / 0.3);

  --font-display: 'Montserrat', sans-serif;
  --font-body: 'Open Sans', sans-serif;

  font-family: var(--font-body);
}

.apporteur-theme h1,
.apporteur-theme h2,
.apporteur-theme h3,
.apporteur-theme h4,
.apporteur-theme h5,
.apporteur-theme h6 {
  font-family: var(--font-display);
}
```

Import de la Google Font Montserrat + Open Sans en haut du fichier (ajout `@import`).

#### 2. `src/apporteur/components/ApporteurLayout.tsx`

Ajouter la classe `apporteur-theme` sur le `<div>` racine principal (celui avec `min-h-screen`), et aussi sur le loading spinner et le wrapper de `<ApporteurLoginPage />`.

Trois points d'application :

- Loading state : `<div className="apporteur-theme min-h-screen ...">`
- Login page : wrapping dans `<div className="apporteur-theme">...</div>`
- Layout authentifié : `<div className="apporteur-theme min-h-screen ...">`

#### 3. `src/apporteur/pages/ApporteurLoginPage.tsx`

Ajouter `apporteur-theme` sur le `<div>` racine (si non déjà hérité du layout), et utiliser les utility classes depan40 (`shadow-card`, `bg-gradient-hero`) pour renforcer l'identité visuelle du formulaire de login.

### Ce qui ne change PAS

- Aucun fichier hors de `src/apporteur/` et `src/index.css`
- Les variables `:root` du projet principal restent intactes
- Les thèmes existants (Classique, Zen, Sombre) ne sont pas affectés

### Résultat

L'espace apporteur aura sa propre identité visuelle (bleu depan40 `hsl(205,85%,45%)`, orange `hsl(38,95%,55%)`, coins plus arrondis `0.75rem`, typo Montserrat pour les titres, Open Sans pour le corps), isolée du reste de l'application.  
  
  
Prévois que, si l'intégration se passe bien,  un theme a part entière puisse etre ajouté en "apparence" pour la globalité du site (a valider selon le résultat de la partie /apporteur)

&nbsp;
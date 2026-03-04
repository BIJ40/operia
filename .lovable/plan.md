

## Problème

Les réponses IA dans le chat affichent le markdown brut (les `**` sont visibles au lieu d'être rendus en gras, les listes numérotées ne sont pas formatées, etc.).

## Correction

**Fichier** : `src/components/support/SimplifiedSupportChat.tsx`

**Ligne 504** : Remplacer `{msg.content}` (texte brut) par un rendu markdown via `react-markdown` (déjà installé dans le projet).

```tsx
// Avant
{msg.content}

// Après
import ReactMarkdown from 'react-markdown';

// Dans le rendu des messages assistant :
{msg.role === 'user' ? (
  msg.content
) : (
  <div className="prose prose-sm max-w-none dark:prose-invert">
    <ReactMarkdown>{msg.content}</ReactMarkdown>
  </div>
)}
```

Les messages utilisateur restent en texte brut (pas besoin de markdown). Seules les réponses de l'assistant sont rendues avec `react-markdown` + classes `prose` de Tailwind pour un formatage propre (gras, listes, titres, etc.).




# Correction de l'aperçu PDF dans le gestionnaire de documents RH

## Probleme identifie

L'aperçu PDF ne fonctionne pas dans le modal de preview des documents. Sur la capture d'écran, on voit une icône cassée au lieu du contenu PDF. Le titre "41276" et les boutons "Télécharger" / "Ouvrir" sont bien affichés, ce qui confirme que l'URL signée est générée, mais le navigateur (notamment Safari) ne peut pas afficher le PDF dans l'iframe.

**Cause technique :** Le code actuel utilise un simple `<iframe src={signedUrl}>` pour afficher les PDFs. Cette approche a des limitations :
- Safari bloque souvent les PDFs dans les iframes avec des URLs signées externes
- Les headers CORS de Supabase Storage peuvent interferer avec l'affichage inline
- Le `Content-Disposition` peut forcer le telechargement au lieu de l'affichage

## Solution proposee

Utiliser **PDF.js** (deja installe dans le projet : `pdfjs-dist v5.4.530`) pour rendre les PDFs via un canvas HTML au lieu de dependre de l'iframe native du navigateur.

---

## Plan d'implementation

### Etape 1 : Creer un composant PDFViewer reutilisable

Creer `src/components/ui/pdf-viewer.tsx` qui :
- Utilise PDF.js pour charger et rendre les pages PDF
- Affiche un canvas par page avec rendu haute qualite
- Gere la navigation entre pages (precedent/suivant)
- Affiche un indicateur de chargement
- Gere les erreurs gracieusement

```text
+------------------------------------------+
|  [<] Page 1 / 5 [>]    Zoom: [100%]      |
+------------------------------------------+
|                                          |
|     +----------------------------+       |
|     |                            |       |
|     |      PDF Canvas            |       |
|     |      (rendu pdfjs)         |       |
|     |                            |       |
|     +----------------------------+       |
|                                          |
+------------------------------------------+
```

### Etape 2 : Mettre a jour DocumentPreviewModal

Modifier `src/components/collaborators/documents/DocumentPreviewModal.tsx` :
- Remplacer l'iframe PDF par le nouveau composant `PDFViewer`
- Conserver l'iframe comme fallback si PDF.js echoue
- Ajouter un meilleur logging pour debug

### Etape 3 : Mettre a jour DocumentQuickLook

Appliquer les memes changements a `src/components/rh/tabs/components/DocumentQuickLook.tsx` pour coherence.

### Etape 4 : Configurer le worker PDF.js

Dans `src/components/ui/pdf-viewer.tsx`, configurer le worker :
```typescript
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
```

---

## Details techniques

### Fichiers a creer
| Fichier | Description |
|---------|-------------|
| `src/components/ui/pdf-viewer.tsx` | Composant PDFViewer avec PDF.js |

### Fichiers a modifier
| Fichier | Modifications |
|---------|---------------|
| `src/components/collaborators/documents/DocumentPreviewModal.tsx` | Utiliser PDFViewer au lieu d'iframe pour les PDFs |
| `src/components/rh/tabs/components/DocumentQuickLook.tsx` | Utiliser PDFViewer au lieu d'iframe pour les PDFs |

### Comportement du PDFViewer
1. Charge le PDF via l'URL signee en utilisant `pdfjsLib.getDocument()`
2. Rend chaque page dans un canvas HTML5
3. Permet la navigation entre pages
4. Affiche un loader pendant le chargement
5. Affiche un message d'erreur si le chargement echoue avec option de telecharger

### Avantages de cette approche
- Fonctionne sur tous les navigateurs (Chrome, Safari, Firefox, Edge)
- Pas de dependance aux capacites PDF du navigateur
- Controle total sur l'interface (zoom, navigation, annotations futures)
- Securise : le PDF est rendu cote client sans ouvrir de nouvelle fenetre




## Plan : Correction préventive du rendu Mapbox

### Fichier modifié
`src/components/dashboard/v2/DashboardMapWidget.tsx`

### 3 changements

1. **Délai d'init 150ms** — retarder `new mapboxgl.Map()` pour laisser l'animation Framer finir
2. **ResizeObserver** — observer le conteneur et appeler `map.resize()` à chaque changement de dimensions
3. **`resize()` après fallback** — dans `enableStyleFallback`, après `setStyle()`, écouter `style.load` et forcer `map.resize()`

Même logique appliquée au composant principal et à `ExpandedMapContent`.



# Plan : Documents administratifs en vue liste compacte

## Objectif

Remplacer l'affichage actuel en grosses tuiles (Card grid) par une présentation en **liste/tableau compact** avec les actions (œil, télécharger, supprimer) alignées en fin de ligne.

---

## Aperçu visuel

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Documents administratifs                     ⚠️ 2 documents à renouveler│
├─────────────────────────────────────────────────────────────────────────┤
│ 📄 Kbis (< 3 mois)        kbis_2025.pdf    ✓ Valide    30/04/2025  👁 ⬇ 🗑│
│ 📄 RC Décennale           rc_dece.pdf      ⚠ 15 jours  15/02/2025  👁 ⬇ 🗑│
│ 📄 RC Pro                 —                 [+ Ajouter]                  │
│ 📄 Vigilance URSSAF       urssaf.pdf       ✓ Valide    01/06/2025  👁 ⬇ 🗑│
│ 📄 Régularité fiscale     —                 [+ Ajouter]                  │
│ 📄 RIB                    rib_hc.pdf       Sans expir.              👁 ⬇ 🗑│
│ 📄 Autre                  —                 [+ Ajouter]                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Structure proposée

Chaque ligne affiche :

| Colonne | Contenu |
|---------|---------|
| **Icône** | Icône fichier (couleur selon statut) |
| **Type** | Label du type de document |
| **Fichier** | Nom du fichier ou "—" si absent |
| **Statut** | Badge coloré (OK/Warning/Expiré/Sans expiration) |
| **Date expiration** | Date formatée ou vide |
| **Actions** | 3 icônes : Œil (voir), Download, Trash |

Si pas de document : bouton "+ Ajouter" à la place des actions.

---

## Modifications techniques

### Fichier : `src/components/outils/AgencyAdminDocuments.tsx`

**Changements :**

1. **Supprimer le composant `DocumentCard`** (grosses tuiles)

2. **Créer un composant `DocumentRow`** :
   - Structure horizontale flex ou Table row
   - Affiche toutes les infos sur une seule ligne
   - Icônes d'action compactes en fin de ligne (ghost buttons, `h-7 w-7`)

3. **Remplacer la grille par un conteneur liste** :
   - `div` avec `space-y-1` ou `<table>` 
   - Alternance de couleurs légère pour lisibilité (`odd:bg-muted/30`)

4. **Conserver les dialogs existants** :
   - Upload dialog (inchangé)
   - Delete confirmation (inchangé)
   - Preview dialog (inchangé)

---

## Code du nouveau composant `DocumentRow`

```tsx
function DocumentRow({
  docType,
  document,
  onUpload,
  onDownload,
  onDelete,
  onPreview,
}: DocumentCardProps) {
  const hasDocument = !!document?.file_path;
  const expiryInfo = document ? getExpiryStatus(document.expiry_date) : null;

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Icône */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        hasDocument ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      )}>
        <FileText className="w-4 h-4" />
      </div>

      {/* Type de document */}
      <div className="w-40 flex-shrink-0">
        <span className="font-medium text-sm">{docType.label}</span>
      </div>

      {/* Nom du fichier */}
      <div className="flex-1 min-w-0">
        {document?.file_name ? (
          <span className="text-sm text-muted-foreground truncate block">
            {document.file_name}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/50 italic">—</span>
        )}
      </div>

      {/* Statut */}
      <div className="w-32 flex-shrink-0">
        {hasDocument && expiryInfo && docType.requiresExpiry ? (
          <Badge variant="secondary" className={cn('gap-1 text-xs', statusColors[expiryInfo.status])}>
            <StatusIcon className="w-3 h-3" />
            {expiryInfo.status === 'ok' ? 'Valide' : expiryInfo.label}
          </Badge>
        ) : hasDocument ? (
          <span className="text-xs text-muted-foreground">Sans expiration</span>
        ) : null}
      </div>

      {/* Date expiration */}
      <div className="w-24 flex-shrink-0 text-xs text-muted-foreground">
        {document?.expiry_date && format(parseISO(document.expiry_date), 'dd/MM/yyyy')}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {hasDocument ? (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(document)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDownload(document)}>
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(document)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpload(docType.id, docType.label)}>
            <Plus className="w-3 h-3 mr-1" />
            Ajouter
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## Rendu principal modifié

```tsx
{/* Liste des documents */}
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-base">Liste des documents</CardTitle>
  </CardHeader>
  <CardContent className="p-2">
    <div className="divide-y divide-border/50">
      {ADMIN_DOCUMENT_TYPES.map((docType) => (
        <DocumentRow
          key={docType.id}
          docType={docType}
          document={getDocumentByType(docType.id)}
          onUpload={handleUploadClick}
          onDownload={handleDownload}
          onDelete={(doc) => setDeleteDialog({ open: true, document: doc })}
          onPreview={handlePreview}
        />
      ))}
    </div>
  </CardContent>
</Card>
```

---

## Résultat attendu

| Avant | Après |
|-------|-------|
| Grille de 4 colonnes de grosses cartes | Liste compacte sur toute la largeur |
| ~200px de hauteur par document | ~45px par ligne |
| Actions sous forme de boutons texte | Icônes compactes alignées à droite |
| Beaucoup d'espace vide | Interface dense et lisible |

---

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/components/outils/AgencyAdminDocuments.tsx` | Refactoring complet : `DocumentCard` → `DocumentRow` |


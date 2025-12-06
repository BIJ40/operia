/**
 * Composant liste des dossiers SAV avec gestion du coût et confirmation
 */

import { useState } from "react";
import { Check, X, AlertTriangle, Euro, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useSavOverrides, SavOverride } from "@/hooks/use-sav-overrides";
import { formatEuros, formatUniverseLabel } from "@/apogee-connect/utils/formatters";

export interface SAVDossier {
  projectId: number;
  projectRef: string;
  projectLabel: string;
  clientName: string;
  universes: string[];
  apporteurNom: string;
  apporteurType: string;
  nbInterventionsSAV: number;
  caSAVAuto: number; // CA calculé automatiquement
  dateSAV: string;
}

interface SAVDossierListProps {
  dossiers: SAVDossier[];
  isLoading?: boolean;
}

export function SAVDossierList({ dossiers, isLoading = false }: SAVDossierListProps) {
  const { overridesMap, upsertOverride, deleteOverride, isUpdating } = useSavOverrides();
  const [showAll, setShowAll] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCout, setEditCout] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");

  const displayedDossiers = showAll ? dossiers : dossiers.slice(0, 10);

  const handleConfirmSAV = (projectId: number, confirmed: boolean) => {
    upsertOverride({ project_id: projectId, is_confirmed_sav: confirmed });
  };

  const handleResetConfirmation = (projectId: number) => {
    deleteOverride(projectId);
  };

  const openCoutDialog = (dossier: SAVDossier) => {
    const override = overridesMap.get(dossier.projectId);
    setEditingId(dossier.projectId);
    setEditCout(override?.cout_sav_manuel?.toString() || "");
    setEditNotes(override?.notes || "");
  };

  const handleSaveCout = () => {
    if (editingId === null) return;
    
    const coutValue = editCout ? parseFloat(editCout) : null;
    // Si un coût est renseigné, valider automatiquement le SAV
    const isConfirmedSav = coutValue !== null ? true : undefined;
    
    upsertOverride({
      project_id: editingId,
      cout_sav_manuel: coutValue,
      notes: editNotes || null,
      ...(isConfirmedSav !== undefined && { is_confirmed_sav: isConfirmedSav }),
    });
    setEditingId(null);
  };

  /**
   * Détermine la couleur de la ligne selon les règles:
   * - SAV négatif (is_sav = false) → VERT
   * - SAV validé + coût estimé → ROUGE  
   * - Que coût estimé → auto SAV validé → ROUGE
   * - SAV validé seul → ORANGE
   * - Auto-détecté → pas de couleur
   */
  const getRowColor = (projectId: number): string => {
    const override = overridesMap.get(projectId);
    
    // SAV négatif = vert
    if (override?.is_confirmed_sav === false) {
      return "bg-green-50 border-l-4 border-l-green-500";
    }
    
    const hasCout = override?.cout_sav_manuel !== null && override?.cout_sav_manuel !== undefined;
    const isConfirmed = override?.is_confirmed_sav === true;
    
    // Coût estimé (avec ou sans SAV confirmé) = rouge
    if (hasCout) {
      return "bg-red-50 border-l-4 border-l-red-500";
    }
    
    // SAV validé seul = orange
    if (isConfirmed) {
      return "bg-orange-50 border-l-4 border-l-orange-500";
    }
    
    return "";
  };

  const getStatusBadge = (projectId: number) => {
    const override = overridesMap.get(projectId);
    
    if (override?.is_confirmed_sav === true) {
      return <Badge className="bg-red-500 hover:bg-red-600">SAV Confirmé</Badge>;
    }
    if (override?.is_confirmed_sav === false) {
      return <Badge variant="outline" className="border-green-500 text-green-600">Infirmé</Badge>;
    }
    return <Badge variant="secondary">Auto-détecté</Badge>;
  };

  const getCoutDisplay = (dossier: SAVDossier) => {
    const override = overridesMap.get(dossier.projectId);
    
    if (override?.cout_sav_manuel !== null && override?.cout_sav_manuel !== undefined) {
      return (
        <div className="flex items-center gap-1">
          <span className="font-semibold text-amber-600">{formatEuros(override.cout_sav_manuel)}</span>
          <Badge variant="outline" className="text-xs">Manuel</Badge>
        </div>
      );
    }
    
    return <span className="text-muted-foreground">{formatEuros(dossier.caSAVAuto)}</span>;
  };

  // Ne plus filtrer les dossiers infirmés - on les affiche en vert
  const filteredDossiers = displayedDossiers;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="h-64 animate-pulse bg-muted rounded" />
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 border-l-4 border-l-red-400 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              Dossiers SAV
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {dossiers.length} dossiers détectés • Confirmez ou infirmez le statut SAV
            </p>
          </div>
          {dossiers.length > 10 && (
            <Button
              variant="ghost"
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-2"
            >
              {showAll ? (
                <>Voir moins <ChevronUp size={16} /></>
              ) : (
                <>Voir les {dossiers.length - 10} autres <ChevronDown size={16} /></>
              )}
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dossier</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Univers</TableHead>
                <TableHead>Apporteur</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-right">Coût SAV</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {filteredDossiers.map((dossier) => {
                const override = overridesMap.get(dossier.projectId);
                const isConfirmed = override?.is_confirmed_sav === true;
                const isInfirmed = override?.is_confirmed_sav === false;
                const rowColor = getRowColor(dossier.projectId);
                
                return (
                  <TableRow 
                    key={dossier.projectId}
                    className={rowColor}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">#{dossier.projectRef}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {dossier.projectLabel}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {dossier.clientName}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {dossier.universes.slice(0, 2).map((u, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {formatUniverseLabel(u)}
                          </Badge>
                        ))}
                        {dossier.universes.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{dossier.universes.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{dossier.apporteurNom}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(dossier.projectId)}
                    </TableCell>
                    <TableCell className="text-right">
                      {getCoutDisplay(dossier)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {/* Bouton confirmer SAV */}
                        <Button
                          size="icon"
                          variant={isConfirmed ? "default" : "outline"}
                          className={`h-8 w-8 ${isConfirmed ? "bg-red-500 hover:bg-red-600" : "hover:bg-red-100 hover:text-red-600"}`}
                          onClick={() => handleConfirmSAV(dossier.projectId, true)}
                          disabled={isUpdating}
                          title="Confirmer SAV"
                        >
                          <AlertTriangle size={14} />
                        </Button>
                        
                        {/* Bouton infirmer SAV */}
                        <Button
                          size="icon"
                          variant={isInfirmed ? "default" : "outline"}
                          className={`h-8 w-8 ${isInfirmed ? "bg-green-500 hover:bg-green-600" : "hover:bg-green-100 hover:text-green-600"}`}
                          onClick={() => handleConfirmSAV(dossier.projectId, false)}
                          disabled={isUpdating}
                          title="Infirmer SAV"
                        >
                          <X size={14} />
                        </Button>
                        
                        {/* Bouton reset */}
                        {override && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleResetConfirmation(dossier.projectId)}
                            disabled={isUpdating}
                            title="Réinitialiser"
                          >
                            <RotateCcw size={14} />
                          </Button>
                        )}
                        
                        {/* Bouton modifier coût */}
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 hover:bg-amber-100 hover:text-amber-600"
                          onClick={() => openCoutDialog(dossier)}
                          disabled={isUpdating}
                          title="Modifier le coût SAV"
                        >
                          <Euro size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredDossiers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun dossier SAV à afficher
          </div>
        )}
      </Card>

      {/* Dialog modification coût */}
      <Dialog open={editingId !== null} onOpenChange={() => setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le coût SAV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Coût SAV (€)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Laisser vide pour calcul auto"
                value={editCout}
                onChange={(e) => setEditCout(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si vide, le coût sera calculé automatiquement (35% du CA)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Notes sur ce SAV..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveCout} disabled={isUpdating}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

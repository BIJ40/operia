import { useState } from "react";
import { Droplets, Loader2, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface HumidityWizardDialogProps {
  refDossier: string;
  clientName: string;
  agencySlug?: string;
  verifiedPostalCode?: string;
}

const PIECES = [
  "Salon",
  "Chambre",
  "Cuisine",
  "Salle de bain",
  "WC",
  "Couloir",
  "Entrée",
  "Bureau",
  "Buanderie",
  "Cave",
  "Garage",
  "Autre",
];

type Support = "mur" | "plafond";

interface HumidityEntry {
  piece: string;
  pieceAutre: string;
  support: Support;
  taux: string;
}

export function HumidityWizardDialog({
  refDossier,
  clientName,
  agencySlug,
  verifiedPostalCode,
}: HumidityWizardDialogProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<HumidityEntry[]>([
    { piece: "", pieceAutre: "", support: "mur", taux: "" },
  ]);
  const [openIndex, setOpenIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const updateEntry = (index: number, field: keyof HumidityEntry, value: string) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    );
  };

  const addEntry = () => {
    if (entries.length < 10) {
      const newIndex = entries.length;
      setEntries((prev) => [...prev, { piece: "", pieceAutre: "", support: "mur", taux: "" }]);
      setOpenIndex(newIndex);
    }
  };

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const isEntryComplete = (e: HumidityEntry) => {
    const pieceValid = e.piece && (e.piece !== "Autre" || e.pieceAutre.trim());
    return pieceValid && e.support && e.taux && !isNaN(parseFloat(e.taux));
  };

  const isFormValid = entries.length > 0 && entries.every(isEntryComplete);

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast({
        title: "Formulaire incomplet",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    if (!verifiedPostalCode) {
      toast({
        title: "Session expirée",
        description: "Veuillez rafraîchir la page",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("suivi-send-humidity-report", {
        body: {
          refDossier,
          clientName,
          entries: entries.map((e) => ({
            piece: e.piece === "Autre" && e.pieceAutre ? e.pieceAutre : e.piece,
            support: e.support,
            taux: parseFloat(e.taux),
          })),
          agencySlug,
          codePostal: verifiedPostalCode,
        },
      });

      if (error) throw error;

      if (data?.error === "Accès refusé") {
        toast({
          title: "Session expirée",
          description: "Veuillez rafraîchir la page",
          variant: "destructive",
        });
        return;
      }

      setIsSuccess(true);
    } catch (error: any) {
      console.error("Error sending humidity report:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'envoi",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEntries([{ piece: "", pieceAutre: "", support: "mur", taux: "" }]);
      setOpenIndex(0);
      setIsSuccess(false);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 bg-primary hover:bg-primary-dark text-primary-foreground shadow-md hover:shadow-lg transition-all text-xs"
        >
          💧 Taux d'humidité
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Relevés envoyés !</h3>
            <p className="text-sm text-muted-foreground">
              Vos relevés d'humidité ont été transmis avec succès à votre agence.
            </p>
            <Button
              onClick={() => handleOpenChange(false)}
              className="mt-4 bg-primary hover:bg-primary-dark"
            >
              Fermer
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-primary" />
                Relevé d'humidité
              </DialogTitle>
              <DialogDescription>
                Saisissez les taux d'humidité relevés dans chaque pièce
              </DialogDescription>
            </DialogHeader>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors group">
                <span>📋 Comment prélever le taux d'humidité</span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 rounded-lg border border-border bg-accent/30 p-3 text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground">1. Préparer la zone</p>
                  <p>La surface doit être propre et sans revêtement mobile. Si possible, effectuer la mesure à température ambiante normale (15-25°C).</p>
                  <p className="font-semibold text-foreground">2. Positionner l'appareil</p>
                  <p>Planter les deux picots métalliques directement dans le matériau (bois, placo, plâtre, etc.). Les picots doivent pénétrer correctement la surface pour obtenir une lecture stable. Maintenir l'appareil immobile pendant quelques secondes.</p>
                  <p className="font-semibold text-foreground">3. Lire la valeur</p>
                  <p>La valeur affichée correspond à un taux d'humidité approximatif du matériau. Relever la mesure une fois stabilisée.</p>
                  <p className="font-semibold text-foreground">4. Multiplier les points de mesure</p>
                  <p>Pour obtenir une indication plus fiable : réaliser au minimum 3 mesures sur différentes zones. Comparer les résultats pour identifier les zones plus humides.</p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="space-y-4">
              {entries.map((entry, index) => {
                const isComplete = isEntryComplete(entry);
                const isOpen = openIndex === index;
                const displayPiece = entry.piece === "Autre" && entry.pieceAutre ? entry.pieceAutre : entry.piece;
                return (
                  <Collapsible key={index} open={isOpen} onOpenChange={(o) => { if (o) setOpenIndex(index); else if (isComplete) setOpenIndex(-1); }}>
                    <div className="rounded-lg border border-border bg-accent/20 overflow-hidden">
                      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-accent/30 transition-colors group">
                        <span className="text-xs font-medium text-muted-foreground">
                          {isComplete ? (
                            <span className="text-foreground">
                              ✅ {displayPiece} — {entry.support === "mur" ? "Mur" : "Plafond"} — {entry.taux}%
                            </span>
                          ) : (
                            `Relevé ${index + 1}`
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          {entries.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); removeEntry(index); }}
                              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                            >
                              Retirer
                            </Button>
                          )}
                          <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Pièce <span className="text-destructive">*</span>
                            </label>
                            <Select
                              value={entry.piece}
                              onValueChange={(v) => updateEntry(index, "piece", v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une pièce" />
                              </SelectTrigger>
                              <SelectContent>
                                {PIECES.map((p) => (
                                  <SelectItem key={p} value={p}>
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {entry.piece === "Autre" && (
                              <Input
                                placeholder="Précisez la pièce..."
                                value={entry.pieceAutre}
                                onChange={(e) => updateEntry(index, "pieceAutre", e.target.value)}
                                className="mt-1"
                              />
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Support</label>
                            <Select
                              value={entry.support}
                              onValueChange={(v) => updateEntry(index, "support", v as Support)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mur">Mur</SelectItem>
                                <SelectItem value="plafond">Plafond</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Taux d'humidité (%) <span className="text-destructive">*</span>
                            </label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder="Ex: 65"
                              value={entry.taux}
                              onChange={(e) => updateEntry(index, "taux", e.target.value)}
                              required
                            />
                            {!entry.taux && entry.piece && (
                              <p className="text-xs text-destructive">Le taux d'humidité est obligatoire</p>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}

              {entries.length < 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addEntry}
                  className="w-full"
                >
                  + Ajouter un relevé
                </Button>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !isFormValid}
                className="bg-primary hover:bg-primary-dark"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Droplets className="h-4 w-4 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

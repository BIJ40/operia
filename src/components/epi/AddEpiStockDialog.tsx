import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useEpiCatalog, EPI_CATEGORIES } from "@/hooks/epi/useEpiCatalog";
import { useCreateEpiStock } from "@/hooks/epi/useEpiStock";

interface AddEpiStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId?: string;
}

const DEFAULT_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
];

export function AddEpiStockDialog({ open, onOpenChange, agencyId }: AddEpiStockDialogProps) {
  const [catalogItemId, setCatalogItemId] = useState("");
  const [size, setSize] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [reorderThreshold, setReorderThreshold] = useState<number | "">("");
  const [location, setLocation] = useState<string>("");

  const { data: catalog = [], isLoading: catalogLoading } = useEpiCatalog(agencyId);
  const createStock = useCreateEpiStock();

  const selectedItem = useMemo(
    () => catalog.find((c) => c.id === catalogItemId) || null,
    [catalog, catalogItemId],
  );

  const availableSizes = useMemo(() => {
    if (!selectedItem?.requires_size) return [];
    return (selectedItem.available_sizes && selectedItem.available_sizes.length > 0)
      ? selectedItem.available_sizes
      : DEFAULT_SIZES;
  }, [selectedItem]);

  const reset = () => {
    setCatalogItemId("");
    setSize("");
    setQuantity(1);
    setReorderThreshold("");
    setLocation("");
  };

  const canSubmit =
    !!agencyId &&
    !!catalogItemId &&
    Number.isFinite(quantity) &&
    quantity >= 0 &&
    (!selectedItem?.requires_size || !!size);

  const handleSubmit = async () => {
    if (!agencyId || !canSubmit) return;

    await createStock.mutateAsync({
      agency_id: agencyId,
      catalog_item_id: catalogItemId,
      size: selectedItem?.requires_size ? size : null,
      quantity: Math.max(0, Math.floor(quantity)),
      reorder_threshold: reorderThreshold === "" ? null : Math.max(0, Math.floor(reorderThreshold)),
      location: location.trim() ? location.trim() : null,
    });

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un équipement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Article *</Label>
            <Select value={catalogItemId} onValueChange={setCatalogItemId}>
              <SelectTrigger>
                <SelectValue placeholder={catalogLoading ? "Chargement…" : "Sélectionner un article"} />
              </SelectTrigger>
              <SelectContent>
                {catalogLoading ? (
                  <div className="p-2 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                ) : (
                  EPI_CATEGORIES.map((cat) => {
                    const items = catalog.filter((c) => c.category === cat.value);
                    if (items.length === 0) return null;
                    return (
                      <React.Fragment key={cat.value}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {cat.label}
                        </div>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedItem?.requires_size && (
            <div className="space-y-2">
              <Label>Taille *</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une taille" />
                </SelectTrigger>
                <SelectContent>
                  {availableSizes.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantité *</Label>
              <Input
                type="number"
                min={0}
                value={Number.isFinite(quantity) ? quantity : 0}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Seuil d'alerte</Label>
              <Input
                type="number"
                min={0}
                value={reorderThreshold}
                onChange={(e) => {
                  const v = e.target.value;
                  setReorderThreshold(v === "" ? "" : Number(v));
                }}
                placeholder="(optionnel)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Emplacement</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Dépôt, véhicule, armoire…"
            />
          </div>

          {!agencyId && (
            <p className="text-sm text-muted-foreground">
              Impossible d'ajouter: agence non détectée.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createStock.isPending}>
            {createStock.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

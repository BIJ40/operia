import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSignAckN1, EpiMonthlyAck, EpiMonthlyAckItem } from "@/hooks/epi/useEpiAcknowledgements";
import { EPI_CATEGORIES } from "@/hooks/epi/useEpiCatalog";
import { Loader2, FileCheck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SignAckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ack: EpiMonthlyAck | null;
  collaboratorName: string;
}

export function SignAckDialog({
  open,
  onOpenChange,
  ack,
  collaboratorName,
}: SignAckDialogProps) {
  const [confirmedItems, setConfirmedItems] = useState<
    Record<string, { confirmed: boolean; notes: string }>
  >({});
  const [globalNote, setGlobalNote] = useState("");

  const signAck = useSignAckN1();

  // Initialize confirmed items when ack changes
  useMemo(() => {
    if (ack?.items) {
      const initial: Record<string, { confirmed: boolean; notes: string }> = {};
      ack.items.forEach((item) => {
        initial[item.id] = {
          confirmed: item.is_confirmed_present,
          notes: item.notes || "",
        };
      });
      setConfirmedItems(initial);
    }
  }, [ack?.id]);

  const toggleItem = (itemId: string) => {
    setConfirmedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        confirmed: !prev[itemId]?.confirmed,
      },
    }));
  };

  const setItemNote = (itemId: string, notes: string) => {
    setConfirmedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        notes,
      },
    }));
  };

  const allConfirmed = Object.values(confirmedItems).every((i) => i.confirmed);
  const someNotConfirmed = Object.values(confirmedItems).some((i) => !i.confirmed);

  const handleSign = async () => {
    if (!ack) return;

    const itemsToSubmit = Object.entries(confirmedItems).map(([itemId, data]) => ({
      itemId,
      confirmed: data.confirmed,
      notes: data.notes || undefined,
    }));

    await signAck.mutateAsync({
      ackId: ack.id,
      confirmedItems: itemsToSubmit,
    });

    onOpenChange(false);
  };

  if (!ack) return null;

  const monthLabel = format(new Date(ack.month), "MMMM yyyy", { locale: fr });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Attestation EPI - {monthLabel}
          </DialogTitle>
          <DialogDescription>
            Confirmez que vous disposez des équipements listés ci-dessous.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4 py-4">
            {/* EPI Items List */}
            <div className="space-y-3">
              {ack.items?.map((item) => {
                const category = EPI_CATEGORIES.find(
                  (c) => c.value === item.catalog_item?.category
                );
                const isConfirmed = confirmedItems[item.id]?.confirmed ?? false;

                return (
                  <div
                    key={item.id}
                    className={`p-3 border rounded-lg transition-colors ${
                      isConfirmed
                        ? "bg-green-50 border-green-200"
                        : "bg-orange-50 border-orange-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isConfirmed}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {item.catalog_item?.name}
                          </span>
                          {item.size && (
                            <span className="text-sm text-muted-foreground">
                              (Taille {item.size})
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {category?.label}
                        </span>
                      </div>
                      {!isConfirmed && (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                    </div>

                    {!isConfirmed && (
                      <div className="mt-2 ml-7">
                        <Textarea
                          placeholder="Raison de l'absence..."
                          value={confirmedItems[item.id]?.notes || ""}
                          onChange={(e) => setItemNote(item.id, e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Global Note */}
            {someNotConfirmed && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Commentaire général (optionnel)</Label>
                <Textarea
                  value={globalNote}
                  onChange={(e) => setGlobalNote(e.target.value)}
                  placeholder="Informations complémentaires..."
                  rows={2}
                />
              </div>
            )}

            {/* Signature Declaration */}
            <div className="p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Déclaration</p>
              <p className="text-muted-foreground">
                Je soussigné(e) <strong>{collaboratorName}</strong>, atteste
                avoir vérifié l'état de mes équipements de protection individuelle
                pour le mois de <strong>{monthLabel}</strong>.
              </p>
              {!allConfirmed && (
                <p className="mt-2 text-orange-600">
                  ⚠️ Certains équipements ne sont pas confirmés. Une demande
                  de renouvellement peut être nécessaire.
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSign}
            disabled={signAck.isPending}
            className={allConfirmed ? "" : "bg-orange-600 hover:bg-orange-700"}
          >
            {signAck.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {allConfirmed ? "Signer l'attestation" : "Signer avec réserves"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

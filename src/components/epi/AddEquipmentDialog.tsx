import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateEquipment, EQUIPMENT_CATEGORIES, EQUIPMENT_STATUSES, EquipmentCategory, EquipmentStatus } from "@/hooks/epi/useEquipmentInventory";
import { Wrench } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Nom requis"),
  category: z.enum(["electroportatif", "gros_outillage", "outillage_main", "mesure", "securite", "autre"]),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  purchase_date: z.string().optional(),
  status: z.enum(["fonctionnel", "en_reparation", "hs", "perdu"]).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId?: string;
}

export function AddEquipmentDialog({ open, onOpenChange, agencyId }: AddEquipmentDialogProps) {
  const createEquipment = useCreateEquipment();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      category: "electroportatif",
      brand: "",
      model: "",
      serial_number: "",
      purchase_date: "",
      status: "fonctionnel",
      location: "",
      notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!agencyId) return;
    
    await createEquipment.mutateAsync({
      agency_id: agencyId,
      name: values.name,
      category: values.category as EquipmentCategory,
      brand: values.brand || null,
      model: values.model || null,
      serial_number: values.serial_number || null,
      purchase_date: values.purchase_date || null,
      status: (values.status as EquipmentStatus) || "fonctionnel",
      location: values.location || null,
      notes: values.notes || null,
    });
    
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Ajouter un matériel
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Perceuse Bosch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EQUIPMENT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>État</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EQUIPMENT_STATUSES.map((st) => (
                          <SelectItem key={st.value} value={st.value}>
                            {st.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marque</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Bosch" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modèle</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: GSR 18V-50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serial_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° de série</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: ABC123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'achat</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emplacement</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Atelier, Véhicule 1..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informations complémentaires..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createEquipment.isPending}>
                {createEquipment.isPending ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

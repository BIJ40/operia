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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateEpiCatalogItem, EPI_CATEGORIES } from "@/hooks/epi/useEpiCatalog";
import { HardHat } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Nom requis"),
  category: z.string().min(1, "Catégorie requise"),
  description: z.string().optional(),
  requires_size: z.boolean().default(false),
  available_sizes: z.string().optional(),
  default_renewal_days: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddEpiCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId?: string;
}

export function AddEpiCatalogDialog({ open, onOpenChange, agencyId }: AddEpiCatalogDialogProps) {
  const createCatalogItem = useCreateEpiCatalogItem();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      requires_size: false,
      available_sizes: "",
      default_renewal_days: undefined,
    },
  });

  const requiresSize = form.watch("requires_size");

  const onSubmit = async (values: FormValues) => {
    const sizes = values.requires_size && values.available_sizes
      ? values.available_sizes.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    await createCatalogItem.mutateAsync({
      agency_id: agencyId || null,
      name: values.name,
      category: values.category,
      description: values.description || null,
      requires_size: values.requires_size,
      available_sizes: sizes,
      default_renewal_days: values.default_renewal_days || null,
      is_active: true,
    });

    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Ajouter un EPI au catalogue
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'EPI *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Chaussures de sécurité S3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une catégorie..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EPI_CATEGORIES.map((cat) => (
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description de l'équipement..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_renewal_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durée avant renouvellement (jours)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex: 365 pour 1 an"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Laissez vide si pas de renouvellement périodique
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requires_size"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Cet EPI nécessite une taille</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {requiresSize && (
              <FormField
                control={form.control}
                name="available_sizes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tailles disponibles</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 38, 39, 40, 41, 42, 43, 44, 45"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Séparez les tailles par des virgules
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createCatalogItem.isPending}>
                {createCatalogItem.isPending ? "Ajout..." : "Ajouter au catalogue"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

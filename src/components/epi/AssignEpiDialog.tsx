import React, { useState } from "react";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEpiCatalog, EPI_CATEGORIES } from "@/hooks/epi/useEpiCatalog";
import { useCreateEpiAssignment } from "@/hooks/epi/useEpiAssignments";
import { useCollaborators } from "@/hooks/useCollaborators";
import { useAuth } from "@/contexts/AuthContext";
import { HardHat, UserPlus } from "lucide-react";
import { addDays, format } from "date-fns";

const schema = z.object({
  collaborator_id: z.string().min(1, "Sélectionnez un technicien"),
  catalog_item_id: z.string().min(1, "Sélectionnez un EPI"),
  size: z.string().optional(),
  serial_number: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AssignEpiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId?: string;
  preselectedCollaboratorId?: string;
}

export function AssignEpiDialog({ 
  open, 
  onOpenChange, 
  agencyId,
  preselectedCollaboratorId 
}: AssignEpiDialogProps) {
  const { user } = useAuthCore();
  const createAssignment = useCreateEpiAssignment();
  
  const { data: catalog = [] } = useEpiCatalog(agencyId);
  const { collaborators = [] } = useCollaborators(agencyId);

  // Filter only active technicians
  const activeCollabs = collaborators.filter(c => !c.leaving_date);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      collaborator_id: preselectedCollaboratorId || "",
      catalog_item_id: "",
      size: "",
      serial_number: "",
      notes: "",
    },
  });

  // Watch selected item to show size field if needed
  const selectedItemId = form.watch("catalog_item_id");
  const selectedItem = catalog.find(c => c.id === selectedItemId);

  const onSubmit = async (values: FormValues) => {
    if (!agencyId || !user?.id) return;

    // Calculate expected renewal date if item has default_renewal_days
    let expectedRenewal: string | null = null;
    if (selectedItem?.default_renewal_days) {
      expectedRenewal = format(
        addDays(new Date(), selectedItem.default_renewal_days),
        "yyyy-MM-dd'T'HH:mm:ss"
      );
    }

    await createAssignment.mutateAsync({
      agency_id: agencyId,
      user_id: values.collaborator_id,
      catalog_item_id: values.catalog_item_id,
      size: values.size || null,
      serial_number: values.serial_number || null,
      assigned_by_user_id: user.id,
      notes: values.notes || null,
      expected_renewal_at: expectedRenewal,
    });

    form.reset();
    onOpenChange(false);
  };

  // Group catalog by category
  const catalogByCategory = catalog.reduce((acc, item) => {
    const cat = item.category || "autre";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof catalog>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Attribuer un EPI
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="collaborator_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technicien *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un technicien..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeCollabs.map((collab) => (
                        <SelectItem key={collab.id} value={collab.id}>
                          {collab.first_name} {collab.last_name}
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
              name="catalog_item_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EPI à attribuer *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un EPI..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(catalogByCategory).map(([category, items]) => {
                        const catLabel = EPI_CATEGORIES.find(c => c.value === category)?.label || category;
                        return (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                              {catLabel}
                            </div>
                            {items.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                                {item.default_renewal_days && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (renouv. {item.default_renewal_days}j)
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </div>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedItem?.requires_size && (
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taille *</FormLabel>
                    {selectedItem.available_sizes?.length ? (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir une taille..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedItem.available_sizes.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input placeholder="Ex: 42, M, L..." {...field} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="serial_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° de série / lot</FormLabel>
                  <FormControl>
                    <Input placeholder="Optionnel" {...field} />
                  </FormControl>
                  <FormDescription>
                    Pour traçabilité si applicable
                  </FormDescription>
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
                      placeholder="Commentaires..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedItem?.default_renewal_days && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <HardHat className="h-4 w-4 inline mr-2" />
                Renouvellement prévu dans <strong>{selectedItem.default_renewal_days} jours</strong>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createAssignment.isPending}>
                {createAssignment.isPending ? "Attribution..." : "Attribuer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * TeamUserDialog - Formulaire de création directe d'utilisateur depuis /equipe
 * Identique aux formulaires admin/réseau mais avec choix de rôles limités selon niveau
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAssignableRoles, GLOBAL_ROLE_LABELS } from "@/types/globalRoles";
import type { GlobalRole } from "@/types/globalRoles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { successToast, errorToast } from "@/lib/toastHelpers";
import { logError } from "@/lib/logger";

interface TeamUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyLabel: string;
  onSuccess?: () => void;
}

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role_agence: string;
  global_role: GlobalRole;
}

export function TeamUserDialog({
  open,
  onOpenChange,
  agencyLabel,
  onSuccess,
}: TeamUserDialogProps) {
  const { globalRole } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assignableRoles = getAssignableRoles(globalRole);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      password: "",
      role_agence: "Assistante",
      global_role: "base_user" as GlobalRole,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const { data: result, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: data.email,
          password: data.password,
          first_name: data.first_name,
          last_name: data.last_name,
          agence: agencyLabel,
          role_agence: data.role_agence,
          global_role: data.global_role,
        },
      });

      if (error) throw error;
      if (!result?.success) {
        throw new Error(result?.error || "Erreur lors de la création");
      }

      return result;
    },
    onSuccess: () => {
      successToast("Utilisateur créé avec succès");
      queryClient.invalidateQueries({ queryKey: ["agencyUsers"] });
      queryClient.invalidateQueries({ queryKey: ["agencyCollaborators"] });
      reset();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      logError("Erreur création utilisateur", error);
      errorToast(error.message || "Impossible de créer l'utilisateur");
    },
  });

  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      await createUserMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un utilisateur</DialogTitle>
          <DialogDescription>
            Création d'un compte utilisateur pour l'agence {agencyLabel}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register("email", {
                required: "Email requis",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Email invalide",
                },
              })}
              placeholder="utilisateur@exemple.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom *</Label>
              <Input
                id="first_name"
                {...register("first_name", { required: "Prénom requis" })}
                placeholder="Jean"
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Nom *</Label>
              <Input
                id="last_name"
                {...register("last_name", { required: "Nom requis" })}
                placeholder="Dupont"
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
            <Input
              id="password"
              type="password"
              {...register("password", {
                required: "Mot de passe requis",
                minLength: {
                  value: 8,
                  message: "Minimum 8 caractères",
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
                  message: "Doit contenir majuscule, minuscule, chiffre et symbole",
                },
              })}
              placeholder="Mot de passe sécurisé"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role_agence">Poste occupé *</Label>
            <Select
              value={watch("role_agence")}
              onValueChange={(value) => setValue("role_agence", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="Dirigeant">Dirigeant</SelectItem>
                <SelectItem value="Assistante">Assistante</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Tête de réseau">Tête de réseau</SelectItem>
                <SelectItem value="Externe">Externe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="global_role">Rôle système *</Label>
            <Select
              value={watch("global_role")}
              onValueChange={(value) => setValue("global_role", value as GlobalRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {assignableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {GLOBAL_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer l'utilisateur
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

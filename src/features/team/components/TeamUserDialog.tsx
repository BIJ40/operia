/**
 * TeamUserDialog - Formulaire de création directe d'utilisateur depuis /equipe
 * Identique au formulaire admin avec rôles limités selon niveau
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GLOBAL_ROLE_LABELS } from "@/types/globalRoles";
import type { GlobalRole } from "@/types/globalRoles";
import { getUserManagementCapabilities } from "@/config/roleMatrix";
import { generateSecurePassword } from "@/lib/passwordUtils";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw, UserPlus } from "lucide-react";
import { successToast, errorToast } from "@/lib/toastHelpers";
import { logError } from "@/lib/logger";

interface TeamUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyLabel: string;
  onSuccess?: () => void;
}

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  globalRole: GlobalRole;
  sendEmail: boolean;
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
  
  const [formData, setFormData] = useState<UserFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    globalRole: "base_user",
    sendEmail: true,
  });

  const capabilities = getUserManagementCapabilities(globalRole);
  const assignableRoles = capabilities.canCreateRoles;

  const handleGeneratePassword = () => {
    setFormData((prev) => ({ ...prev, password: generateSecurePassword() }));
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      globalRole: "base_user",
      sendEmail: true,
    });
  };

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data: result, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          agence: agencyLabel,
          globalRole: formData.globalRole,
          sendEmail: formData.sendEmail,
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
      resetForm();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      logError("Erreur création utilisateur", error);
      errorToast(error.message || "Impossible de créer l'utilisateur");
    },
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createUserMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Créer un utilisateur
          </DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouvel utilisateur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prénom *</Label>
              <Input
                value={formData.firstName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                value={formData.lastName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Mot de passe provisoire *</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeneratePassword}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Générer
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              18 caractères avec majuscules, minuscules, chiffres et symboles
            </p>
          </div>

          <div className="space-y-2">
            <Label>Rôle système</Label>
            <Select
              value={formData.globalRole}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, globalRole: v as GlobalRole }))
              }
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

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="sendEmail"
              checked={formData.sendEmail}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, sendEmail: checked === true }))
              }
            />
            <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
              Envoyer l'email de bienvenue avec mot de passe provisoire
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !formData.email ||
              !formData.password ||
              !formData.firstName ||
              !formData.lastName ||
              isSubmitting
            }
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface RoyaltyConfigSectionProps {
  agencyId: string;
}

export function RoyaltyConfigSection({ agencyId }: RoyaltyConfigSectionProps) {
  // Placeholder pour la configuration des redevances
  // À compléter avec la logique réelle de gestion des tranches
  
  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-l-4 border-l-accent">
        <CardHeader>
          <CardTitle>Configuration des Redevances</CardTitle>
          <CardDescription>
            Définissez les tranches de CA et les pourcentages de redevances applicables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Configuration des redevances à implémenter</p>
            <p className="text-sm mt-2">
              Cette section permettra de gérer les tranches de CA et les pourcentages de redevances
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

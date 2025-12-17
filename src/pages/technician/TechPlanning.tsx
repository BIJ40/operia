import { useState } from 'react';
import { format, parseISO, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Check, Loader2, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMyPlanningPackages, useSignPlanning } from '@/hooks/technician/usePlanningPackages';
import { useTechnicianProfile } from '@/hooks/technician/useTechnicianProfile';
import { toast } from 'sonner';

export default function TechPlanning() {
  const { data: profile, isLoading: profileLoading } = useTechnicianProfile();
  const { data: packages = [], isLoading } = useMyPlanningPackages();
  const signMutation = useSignPlanning();
  
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<typeof packages[0] | null>(null);
  const [signChecked, setSignChecked] = useState(false);
  const [signComment, setSignComment] = useState('');

  // Find package for selected week
  const currentPackage = packages.find(p => {
    const pkgWeekStart = startOfWeek(parseISO(p.week_start), { weekStartsOn: 1 });
    return pkgWeekStart.getTime() === selectedWeek.getTime();
  });

  const handleOpenSign = (pkg: typeof packages[0]) => {
    setSelectedPackage(pkg);
    setSignChecked(false);
    setSignComment('');
    setSignDialogOpen(true);
  };

  const handleSign = async () => {
    if (!selectedPackage || !signChecked) return;

    try {
      await signMutation.mutateAsync({
        recipientId: selectedPackage.recipient_id,
        comment: signComment || undefined,
      });
      toast.success('Planning signé avec succès');
      setSignDialogOpen(false);
    } catch {
      toast.error('Erreur lors de la signature');
    }
  };

  if (profileLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aucun profil salarié configuré
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Mon Planning
        </h1>
      </div>

      {/* Week navigation */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <div className="font-medium">
                Semaine du {format(selectedWeek, 'd MMMM yyyy', { locale: fr })}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Planning status */}
      {currentPackage ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {currentPackage.title || 'Planning hebdomadaire'}
              </CardTitle>
              {currentPackage.signed_at ? (
                <Badge variant="default" className="bg-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  Signé
                </Badge>
              ) : (
                <Badge variant="secondary">À signer</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Envoyé le {format(parseISO(currentPackage.sent_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </div>

            {currentPackage.signed_at ? (
              <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-sm">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <FileCheck className="h-4 w-4" />
                  Signé le {format(parseISO(currentPackage.signed_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </div>
                {currentPackage.signed_comment && (
                  <div className="mt-2 text-muted-foreground">
                    Commentaire : {currentPackage.signed_comment}
                  </div>
                )}
              </div>
            ) : (
              <Button 
                className="w-full" 
                onClick={() => handleOpenSign(currentPackage)}
              >
                Signer le planning
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aucun planning pour cette semaine
          </CardContent>
        </Card>
      )}

      {/* Historical packages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {packages.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun planning reçu
            </div>
          ) : (
            <div className="divide-y divide-border">
              {packages.slice(0, 10).map(pkg => (
                <div
                  key={pkg.id}
                  className="flex items-center justify-between p-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      Semaine du {format(parseISO(pkg.week_start), 'd MMM yyyy', { locale: fr })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pkg.title || 'Planning'}
                    </div>
                  </div>
                  {pkg.signed_at ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Signé
                    </Badge>
                  ) : (
                    <Badge variant="outline">En attente</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signer le planning</DialogTitle>
            <DialogDescription>
              En signant, vous confirmez avoir pris connaissance du planning de la semaine.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="sign-confirm"
                checked={signChecked}
                onCheckedChange={(c) => setSignChecked(c === true)}
              />
              <label
                htmlFor="sign-confirm"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                J'ai lu et j'approuve ce planning
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Commentaire (optionnel)
              </label>
              <Textarea
                value={signComment}
                onChange={(e) => setSignComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSign}
              disabled={!signChecked || signMutation.isPending}
            >
              {signMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Signer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

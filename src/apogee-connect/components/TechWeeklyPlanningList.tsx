import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle, Send, Loader2, Printer } from "lucide-react";
import { useWeeklyTechPlanning } from "@/apogee-connect/hooks/useWeeklyTechPlanning";
import { usePlanningSignature } from "@/apogee-connect/hooks/usePlanningSignature";
import { formatMinutesToHours, WeeklyTechPlanning } from "@/apogee-connect/utils/planning";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";


interface TechWeeklyPlanningListProps {
  techFilterId?: number;
  showInactiveTechs?: boolean;
  isN1View?: boolean; // true = vue technicien, false = vue N2
}

// Sub-component for N2 signature section
function TechSignatureSectionN2({ 
  techId, 
  weekDate,
  techName,
}: { 
  techId: number; 
  weekDate: Date;
  techName: string;
}) {
  const { 
    signature, 
    isSent, 
    isSignedByTech, 
    sendToTech, 
    cancelSend,
    isSending,
    isCancelling,
    isLoading 
  } = usePlanningSignature({ techId, weekDate });

  if (isLoading) {
    return <Skeleton className="h-8 w-48" />;
  }

  // État 3: Signé par le tech
  if (isSignedByTech && signature?.tech_signed_at) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="default" className="bg-emerald-600 text-white">
          <CheckCircle className="w-3 h-3 mr-1" />
          Signé le {format(new Date(signature.tech_signed_at), "dd/MM/yyyy HH:mm", { locale: fr })}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Imprimer le planning
            window.print();
          }}
        >
          <Printer className="w-4 h-4 mr-1" />
          Imprimer
        </Button>
      </div>
    );
  }

  // État 2: Envoyé, en attente signature tech
  if (isSent && signature?.sent_at) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock className="w-3 h-3 mr-1" />
          En attente signature
        </Badge>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => cancelSend()}
          disabled={isCancelling}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : "Annuler"}
        </Button>
      </div>
    );
  }

  // État 1: Non envoyé
  return (
    <Button
      onClick={() => sendToTech()}
      disabled={isSending}
      size="sm"
      variant="outline"
      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
    >
      {isSending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Send className="w-4 h-4 mr-2" />
      )}
      Envoyer au technicien
    </Button>
  );
}

// Sub-component for N1 signature section (technicien)
function TechSignatureSectionN1({ 
  techId, 
  weekDate,
  onRequestSign,
}: { 
  techId: number; 
  weekDate: Date;
  onRequestSign: () => void;
}) {
  const { 
    signature, 
    isSent, 
    isSignedByTech,
    isLoading 
  } = usePlanningSignature({ techId, weekDate });

  if (isLoading) {
    return <Skeleton className="h-8 w-48" />;
  }

  // Déjà signé
  if (isSignedByTech && signature?.tech_signed_at) {
    return (
      <Badge variant="default" className="bg-emerald-600 text-white">
        <CheckCircle className="w-3 h-3 mr-1" />
        Signé le {format(new Date(signature.tech_signed_at), "dd/MM/yyyy HH:mm", { locale: fr })}
      </Badge>
    );
  }

  // Planning envoyé, prêt à signer
  if (isSent) {
    return (
      <Button
        onClick={onRequestSign}
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-500"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Signer mon planning
      </Button>
    );
  }

  // Pas encore envoyé par N2
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      En attente de validation
    </Badge>
  );
}

export const TechWeeklyPlanningList: React.FC<TechWeeklyPlanningListProps> = ({
  techFilterId,
  showInactiveTechs = false,
  isN1View = false,
}) => {
  const {
    data,
    isLoading,
    error,
    weekDate,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
  } = useWeeklyTechPlanning(techFilterId, showInactiveTechs);

  // Pour le modal de signature N1
  const [showSignModal, setShowSignModal] = React.useState(false);
  const [signingTechId, setSigningTechId] = React.useState<number | null>(null);

  const handleRequestSign = (techId: number) => {
    setSigningTechId(techId);
    setShowSignModal(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    console.error("[TechWeeklyPlanningList] Error loading planning:", error);
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Erreur lors du chargement du planning.</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : "Une erreur inattendue s'est produite."}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Aucun planning trouvé pour cette semaine.</p>
        </CardContent>
      </Card>
    );
  }

  const weekLabel = `Semaine du ${format(weekDate, "dd MMMM yyyy", { locale: fr })}`;

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {weekLabel}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {data.length} technicien{data.length > 1 ? "s" : ""} avec planning
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevWeek}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Précédente
          </Button>
          <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            Suivante
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Tech Planning Cards */}
      {data.map((techWeek: WeeklyTechPlanning) => (
        <Card key={techWeek.techId} className="overflow-hidden print:break-inside-avoid">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {techWeek.color && (
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: techWeek.color }}
                  />
                )}
                <CardTitle className="text-lg">{techWeek.techName}</CardTitle>
                <Badge variant="secondary" className="font-mono">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatMinutesToHours(techWeek.weeklyTotalMinutes)}
                </Badge>
              </div>
              
              {isN1View ? (
                <TechSignatureSectionN1 
                  techId={techWeek.techId} 
                  weekDate={weekDate}
                  onRequestSign={() => handleRequestSign(techWeek.techId)}
                />
              ) : (
                <TechSignatureSectionN2 
                  techId={techWeek.techId} 
                  weekDate={weekDate}
                  techName={techWeek.techName}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {techWeek.days.map((day) => (
                <div
                  key={day.date}
                  className="rounded-lg border bg-card p-3 space-y-2"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium text-sm capitalize">{day.label}</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {formatMinutesToHours(day.totalMinutes)}
                    </Badge>
                  </div>

                  {day.slots.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Aucun RDV</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {day.slots.map((slot, idx) => {
                        const start = format(new Date(slot.start), "HH:mm");
                        const end = format(new Date(slot.end), "HH:mm");
                        const isBreak = slot.isBreak === true;

                        return (
                          <li
                            key={`${slot.slotId}-${idx}`}
                            className={cn(
                              "rounded px-2 py-1.5 text-xs border",
                              isBreak
                                ? "border-amber-500/40 bg-amber-500/10"
                                : "border-border bg-muted/30"
                            )}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-foreground">
                                {start} - {end}
                              </span>
                              {slot.state && (
                                <Badge 
                                  variant="secondary" 
                                  className="text-[10px] px-1.5 py-0 h-4"
                                >
                                  {slot.state}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 space-y-0.5">
                              {isBreak ? (
                                <span className="font-medium text-amber-600">Pause</span>
                              ) : (
                                <>
                                  {slot.clientName && (
                                    <div className="font-medium text-foreground truncate">
                                      {slot.clientName}
                                    </div>
                                  )}
                                  {slot.city && (
                                    <div className="text-muted-foreground truncate">
                                      {slot.city}
                                    </div>
                                  )}
                                  {slot.type && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 mt-0.5">
                                      {slot.type}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Modal de signature N1 */}
      {showSignModal && signingTechId && (
        <PlanningSignModal
          techId={signingTechId}
          weekDate={weekDate}
          onClose={() => {
            setShowSignModal(false);
            setSigningTechId(null);
          }}
        />
      )}
    </div>
  );
};

// Modal pour signer le planning (N1)
function PlanningSignModal({
  techId,
  weekDate,
  onClose,
}: {
  techId: number;
  weekDate: Date;
  onClose: () => void;
}) {
  const { techSign, isTechSigning } = usePlanningSignature({ techId, weekDate });
  const [signatureData, setSignatureData] = React.useState<string | null>(null);
  const [loadingSignature, setLoadingSignature] = React.useState(true);

  // Charger la signature personnelle depuis user_signatures
  React.useEffect(() => {
    async function loadSignature() {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_signatures")
        .select("signature_png_base64, signature_svg")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.signature_png_base64) {
        setSignatureData(data.signature_png_base64);
      } else if (data?.signature_svg) {
        // Fallback sur SVG (sera converti en PNG côté serveur si besoin)
        setSignatureData(data.signature_svg);
      }
      setLoadingSignature(false);
    }
    loadSignature();
  }, []);

  const handleSign = async () => {
    if (!signatureData) return;
    await techSign(signatureData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Signer mon planning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSignature ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : signatureData ? (
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground mb-2">Votre signature :</p>
              <img 
                src={signatureData.startsWith("data:") ? signatureData : `data:image/png;base64,${signatureData}`}
                alt="Ma signature"
                className="max-h-24 mx-auto"
              />
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm">Aucune signature enregistrée.</p>
              <p className="text-sm mt-1">
                <Link to="/rh/signature" className="text-primary hover:underline">
                  Créer ma signature →
                </Link>
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            En signant, vous confirmez avoir pris connaissance de votre planning 
            pour la semaine du {format(weekDate, "dd MMMM yyyy", { locale: fr })}.
          </p>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              onClick={handleSign}
              disabled={!signatureData || isTechSigning}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isTechSigning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Confirmer et signer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

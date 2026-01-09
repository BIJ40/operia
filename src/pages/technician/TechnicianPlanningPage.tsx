/**
 * Technician Planning Page
 * Week view with clickable day headers to show day detail
 */
import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Calendar, AlertCircle, ChevronLeft, ChevronRight, MapPin, Clock, Building, FileText, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTechnicianProfile } from '@/hooks/technician/useTechnicianProfile';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { useWeeklyTechPlanning } from '@/apogee-connect/hooks/useWeeklyTechPlanning';
import { usePlanningSignature } from '@/apogee-connect/hooks/usePlanningSignature';
import { TechPlanningSlot, formatMinutesToHours, WeeklyTechPlanning } from '@/apogee-connect/utils/planning';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Send, Loader2 as Loader2Icon } from 'lucide-react';
import { Link } from 'react-router-dom';

function getSlotColor(type: string | null | undefined): string {
  const t = type?.toLowerCase() || '';
  if (t.includes('pause')) return 'bg-amber-500/80';
  if (t.includes('rt') || t.includes('releve') || t.includes('technique')) return 'bg-blue-500/80';
  if (t.includes('travaux') || t.includes('tvx')) return 'bg-emerald-500/80';
  if (t.includes('depannage') || t.includes('repair')) return 'bg-orange-500/80';
  return 'bg-primary/80';
}

// Card pour afficher un RDV du jour
interface DayEventCardProps {
  slot: TechPlanningSlot;
  onClick: () => void;
}

function DayEventCard({ slot, onClick }: DayEventCardProps) {
  const startDate = new Date(slot.start);
  const endDate = new Date(slot.end);
  const timeStr = `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`;
  const isBreak = slot.isBreak === true;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg p-3 shadow-sm transition-all active:scale-[0.98]",
        getSlotColor(slot.type),
        "text-white"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {isBreak ? 'Pause' : slot.clientName || slot.type || 'RDV'}
          </p>
          {!isBreak && slot.city && (
            <p className="text-sm opacity-90 truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {slot.city}
            </p>
          )}
        </div>
        <Badge variant="secondary" className="flex-shrink-0 bg-white/20 text-white border-0 text-xs">
          {timeStr}
        </Badge>
      </div>
      {slot.projectRef && (
        <p className="text-xs opacity-80 mt-1">Dossier: {slot.projectRef}</p>
      )}
    </button>
  );
}

// Sheet détail d'un slot
interface SlotDetailSheetProps {
  slot: TechPlanningSlot | null;
  open: boolean;
  onClose: () => void;
}

function SlotDetailSheet({ slot, open, onClose }: SlotDetailSheetProps) {
  if (!slot) return null;
  
  const startDate = new Date(slot.start);
  const endDate = new Date(slot.end);
  const timeStr = `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`;
  const dateStr = format(startDate, "EEEE d MMMM", { locale: fr });
  
  const googleMapsUrl = slot.city 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(slot.city)}`
    : null;
  
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-left flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Détail du RDV
          </SheetTitle>
        </SheetHeader>
        
        <div className="py-4 space-y-4 overflow-auto">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">{timeStr}</p>
                <p className="text-sm text-muted-foreground capitalize">{dateStr}</p>
              </div>
            </CardContent>
          </Card>
          
          {slot.clientName && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="font-semibold text-lg">{slot.clientName}</p>
                {slot.projectRef && (
                  <p className="text-sm text-muted-foreground">Dossier : {slot.projectRef}</p>
                )}
              </CardContent>
            </Card>
          )}
          
          {slot.city && (
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 text-left h-auto py-3"
              onClick={() => googleMapsUrl && window.open(googleMapsUrl, '_blank')}
            >
              <MapPin className="h-5 w-5 flex-shrink-0 text-primary" />
              <span>{slot.city}</span>
            </Button>
          )}
          
          {slot.type && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Type d'intervention
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Badge variant="secondary" className="text-sm">
                  {slot.type}
                </Badge>
              </CardContent>
            </Card>
          )}
          
          {slot.state && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">État :</span>
              <Badge variant="outline">{slot.state}</Badge>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Vue jour avec navigation
interface DayViewProps {
  selectedDate: Date;
  slots: TechPlanningSlot[];
  onClose: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
}

function DayView({ selectedDate, slots, onClose, onPrevDay, onNextDay }: DayViewProps) {
  const [selectedSlot, setSelectedSlot] = useState<TechPlanningSlot | null>(null);
  
  const daySlots = useMemo(() => {
    return slots
      .filter(s => isSameDay(new Date(s.start), selectedDate))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [slots, selectedDate]);
  
  const dayMinutes = useMemo(() => {
    return daySlots
      .filter(s => !s.isBreak)
      .reduce((acc, s) => {
        const start = new Date(s.start);
        const end = new Date(s.end);
        return acc + Math.round((end.getTime() - start.getTime()) / 60_000);
      }, 0);
  }, [daySlots]);
  
  const dateLabel = format(selectedDate, "EEEE d MMMM", { locale: fr });
  const isToday = isSameDay(selectedDate, new Date());
  
  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header avec fermeture */}
      <div className="sticky top-0 bg-background border-b z-10">
        <div className="flex items-center justify-between p-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold">Détail du jour</h2>
          <div className="w-10" /> {/* Spacer */}
        </div>
        
        {/* Navigation jour */}
        <div className="flex items-center justify-between px-3 pb-3">
          <Button variant="ghost" size="icon" onClick={onPrevDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="font-semibold capitalize">{dateLabel}</p>
            <p className="text-xs text-muted-foreground">
              {daySlots.length} RDV • {formatMinutesToHours(dayMinutes)}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onNextDay}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Liste des RDV */}
      <div className="p-3 space-y-2 overflow-auto" style={{ height: 'calc(100vh - 120px)' }}>
        {daySlots.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Aucun RDV prévu</p>
              <p className="text-sm">
                {isToday ? "Votre journée est libre" : "Pas d'intervention ce jour"}
              </p>
            </CardContent>
          </Card>
        ) : (
          daySlots.map((slot, idx) => (
            <DayEventCard
              key={`${slot.slotId}-${idx}`}
              slot={slot}
              onClick={() => setSelectedSlot(slot)}
            />
          ))
        )}
      </div>
      
      {/* Sheet détail slot */}
      <SlotDetailSheet 
        slot={selectedSlot}
        open={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
      />
    </div>
  );
}

// Section signature N1
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

  if (isSignedByTech && signature?.tech_signed_at) {
    return (
      <Badge variant="default" className="bg-emerald-600 text-white">
        <CheckCircle className="w-3 h-3 mr-1" />
        Signé le {format(new Date(signature.tech_signed_at), "dd/MM/yyyy HH:mm", { locale: fr })}
      </Badge>
    );
  }

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

  return (
    <Badge variant="secondary" className="text-muted-foreground">
      En attente de validation
    </Badge>
  );
}

// Modal pour signer le planning
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
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [loadingSignature, setLoadingSignature] = useState(true);

  useState(() => {
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
        setSignatureData(data.signature_svg);
      }
      setLoadingSignature(false);
    }
    loadSignature();
  });

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

// Composant principal avec vue semaine + jours cliquables
function TechWeekPlanning({ techId }: { techId: number }) {
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  
  const {
    data,
    isLoading,
    error,
    weekDate,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
  } = useWeeklyTechPlanning(techId, false);

  // Extraire tous les slots du tech
  const allSlots = useMemo(() => {
    if (!data?.length) return [];
    const techData = data.find(t => t.techId === techId);
    if (!techData) return [];
    return techData.days.flatMap(d => d.slots);
  }, [data, techId]);

  const currentWeekStart = useMemo(() => 
    startOfWeek(weekDate, { weekStartsOn: 1 }),
    [weekDate]
  );

  // Handlers pour navigation jour
  const handlePrevDay = () => {
    if (!selectedDayDate) return;
    const newDate = subDays(selectedDayDate, 1);
    if (newDate < currentWeekStart) {
      goToPrevWeek();
    }
    setSelectedDayDate(newDate);
  };

  const handleNextDay = () => {
    if (!selectedDayDate) return;
    const newDate = addDays(selectedDayDate, 1);
    const weekEnd = addDays(currentWeekStart, 6);
    if (newDate > weekEnd) {
      goToNextWeek();
    }
    setSelectedDayDate(newDate);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Erreur lors du chargement du planning.</p>
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

  const techWeek = data.find(t => t.techId === techId);
  if (!techWeek) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Aucun planning trouvé.</p>
        </CardContent>
      </Card>
    );
  }

  const weekLabel = `Semaine du ${format(weekDate, "dd MMMM", { locale: fr })}`;

  return (
    <>
      <div className="space-y-4">
        {/* Navigation semaine */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goToPrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button 
            onClick={goToCurrentWeek}
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            {weekLabel}
          </button>
          <Button variant="ghost" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Header avec total et signature */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Badge variant="secondary" className="font-mono">
            <Clock className="w-3 h-3 mr-1" />
            {formatMinutesToHours(techWeek.weeklyTotalMinutes)}
          </Badge>
          
          <TechSignatureSectionN1 
            techId={techWeek.techId} 
            weekDate={weekDate}
            onRequestSign={() => setShowSignModal(true)}
          />
        </div>

        {/* Grille des jours - CLIQUABLES */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {techWeek.days.map((day) => {
            const dayDate = new Date(day.date);
            const isToday = isSameDay(dayDate, new Date());
            
            return (
              <button
                key={day.date}
                onClick={() => setSelectedDayDate(dayDate)}
                className={cn(
                  "rounded-lg border bg-card p-3 space-y-2 text-left transition-all hover:border-primary hover:shadow-md active:scale-[0.98]",
                  isToday && "ring-2 ring-primary/50"
                )}
              >
                {/* En-tête du jour - CLIQUABLE */}
                <div className="flex items-center justify-between border-b pb-2">
                  <span className={cn(
                    "font-medium text-sm capitalize",
                    isToday && "text-primary"
                  )}>
                    {day.label}
                  </span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {formatMinutesToHours(day.totalMinutes)}
                  </Badge>
                </div>

                {/* Aperçu des RDV */}
                {day.slots.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Aucun RDV</p>
                ) : (
                  <div className="space-y-1">
                    {day.slots.slice(0, 3).map((slot, idx) => {
                      const start = format(new Date(slot.start), "HH:mm");
                      const isBreak = slot.isBreak === true;
                      
                      return (
                        <div
                          key={`${slot.slotId}-${idx}`}
                          className={cn(
                            "rounded px-2 py-1 text-xs",
                            isBreak
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-muted/50"
                          )}
                        >
                          <span className="font-medium">{start}</span>
                          {!isBreak && slot.clientName && (
                            <span className="ml-1 text-muted-foreground truncate">
                              - {slot.clientName.slice(0, 10)}...
                            </span>
                          )}
                          {isBreak && <span className="ml-1">Pause</span>}
                        </div>
                      );
                    })}
                    {day.slots.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{day.slots.length - 3} autres
                      </p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vue jour en plein écran */}
      {selectedDayDate && (
        <DayView
          selectedDate={selectedDayDate}
          slots={allSlots}
          onClose={() => setSelectedDayDate(null)}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
        />
      )}

      {/* Modal signature */}
      {showSignModal && (
        <PlanningSignModal
          techId={techId}
          weekDate={weekDate}
          onClose={() => setShowSignModal(false)}
        />
      )}
    </>
  );
}

export default function TechnicianPlanningPage() {
  const { data: profile, isLoading: profileLoading } = useTechnicianProfile();

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
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

  if (!profile.apogee_user_id) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">Compte non lié à Apogée</p>
              <p className="text-sm mt-1">
                Votre profil n'est pas encore lié à votre compte technicien Apogée.
                Contactez votre responsable pour effectuer cette liaison.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Mon Planning</h1>
      </div>

      {/* Planning semaine avec jours cliquables */}
      <AgencyProvider>
        <TechWeekPlanning techId={profile.apogee_user_id} />
      </AgencyProvider>
    </div>
  );
}

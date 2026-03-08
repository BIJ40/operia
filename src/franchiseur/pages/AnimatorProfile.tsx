import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useFranchiseur } from '../contexts/FranchiseurContext';
import { useAnimatorVisits, VISIT_TYPE_LABELS, VISIT_STATUS_LABELS, VISIT_STATUS_COLORS, AnimatorVisit } from '../hooks/useAnimatorVisits';
import { AnimatorVisitDialog } from '../components/AnimatorVisitDialog';
import { VisitReportDialog } from '../components/VisitReportDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePersistedTab } from '@/hooks/usePersistedState';
import { 
  ArrowLeft, Calendar, MapPin, Plus, FileText, 
  Building2, Clock, CheckCircle2, AlertCircle, Edit2, Receipt
} from 'lucide-react';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ROUTES } from '@/config/routes';

const ROLE_LABELS: Record<string, string> = {
  animateur: 'Animateur réseau',
  directeur: 'Directeur réseau',
  dg: 'Directeur Général',
};

export default function AnimatorProfile() {
  const { animatorId } = useParams<{ animatorId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthCore();
  const { globalRole } = usePermissions();
  const { franchiseurRole } = useFranchiseur();
  
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<AnimatorVisit | null>(null);
  const [activeTab, setActiveTab] = usePersistedTab(`animator-${animatorId}-visits-tab`, 'upcoming');
  
  // Check access: N3 can only view own profile, N4+ can view all
  const isOwnProfile = user?.id === animatorId;
  const canViewProfile = isOwnProfile || franchiseurRole === 'directeur' || franchiseurRole === 'dg' || (globalRole && ['platform_admin', 'superadmin'].includes(globalRole));
  
  // Fetch animator profile
  const { data: animator, isLoading: animatorLoading } = useQuery({
    queryKey: ['animator-profile', animatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, agence')
        .eq('id', animatorId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!animatorId && canViewProfile,
  });
  
  // Derive franchiseur role from animator's global_role
  const animatorRole = useMemo(() => {
    if (!animator) return null;
    // Query global_role from profiles (already fetched in animator query)
    return null; // Will be enriched below
  }, [animator]);
  
  // Fetch animator's global_role for role display
  const { data: animatorGlobalRole } = useQuery({
    queryKey: ['animator-global-role', animatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('global_role')
        .eq('id', animatorId)
        .single();
      
      if (!data?.global_role) return 'animateur';
      const role = data.global_role;
      if (role === 'superadmin' || role === 'platform_admin') return 'dg';
      if (role === 'franchisor_admin') return 'directeur';
      return 'animateur';
    },
    enabled: !!animatorId && canViewProfile,
  });
  
  // Fetch assigned agencies
  const { data: assignments } = useQuery({
    queryKey: ['animator-assignments', animatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franchiseur_agency_assignments')
        .select('agency_id, apogee_agencies(id, label, slug)')
        .eq('user_id', animatorId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!animatorId && canViewProfile,
  });
  
  const { data: visits, isLoading: visitsLoading } = useAnimatorVisits(animatorId || null);
  
  const assignedAgencyIds = useMemo(() => 
    assignments?.map(a => a.agency_id) || [], 
  [assignments]);
  
  // Categorize visits
  const { upcomingVisits, pastVisits, todayVisits } = useMemo(() => {
    const upcoming: AnimatorVisit[] = [];
    const past: AnimatorVisit[] = [];
    const today: AnimatorVisit[] = [];
    
    visits?.forEach(visit => {
      const visitDate = new Date(visit.visit_date);
      if (visit.status === 'annule') {
        past.push(visit);
      } else if (isToday(visitDate)) {
        today.push(visit);
      } else if (isFuture(visitDate)) {
        upcoming.push(visit);
      } else {
        past.push(visit);
      }
    });
    
    return { 
      upcomingVisits: upcoming.sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()),
      pastVisits: past.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()),
      todayVisits: today 
    };
  }, [visits]);
  
  const handleOpenVisitDialog = (visit?: AnimatorVisit) => {
    setSelectedVisit(visit || null);
    setVisitDialogOpen(true);
  };
  
  const handleOpenReportDialog = (visit: AnimatorVisit) => {
    setSelectedVisit(visit);
    setReportDialogOpen(true);
  };
  
  if (!canViewProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Accès refusé</h2>
        <p className="text-muted-foreground">Vous ne pouvez accéder qu'à votre propre profil animateur.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(ROUTES.reseau.animateurs)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }
  
  if (animatorLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  
  if (!animator) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Animateur non trouvé</p>
      </div>
    );
  }
  
  const initials = `${animator.first_name?.[0] || ''}${animator.last_name?.[0] || ''}`.toUpperCase();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.reseau.animateurs)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Profil Animateur</h1>
          <p className="text-muted-foreground">Gérez vos visites et rapports d'agence</p>
        </div>
      </div>
      
      {/* Profile Card */}
      <Card className="rounded-2xl">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-gradient-to-br from-primary to-helpconfort-blue-dark text-white text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{animator.first_name} {animator.last_name}</h2>
                <p className="text-muted-foreground">{animator.email}</p>
                {animatorGlobalRole && (
                  <Badge variant="outline" className="mt-2">
                    {ROLE_LABELS[animatorGlobalRole] || animatorGlobalRole}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={() => handleOpenVisitDialog()} className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Planifier une visite
              </Button>
              <Button variant="outline" className="rounded-xl" disabled>
                <Receipt className="h-4 w-4 mr-2" />
                Notes de frais
                <Badge variant="secondary" className="ml-2 text-xs">Bientôt</Badge>
              </Button>
            </div>
          </div>
          
          {/* Assigned Agencies */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Agences assignées
              <Badge variant="secondary" className="rounded-full">
                {assignedAgencyIds.length === 0 ? 'Toutes' : assignedAgencyIds.length}
              </Badge>
            </h3>
            {assignedAgencyIds.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Accès à toutes les agences du réseau
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignments?.map((a: any) => (
                  <Badge key={a.agency_id} variant="outline">
                    {a.apogee_agencies?.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{todayVisits.length}</p>
                <p className="text-xs text-muted-foreground">Visite(s) aujourd'hui</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{upcomingVisits.length}</p>
                <p className="text-xs text-muted-foreground">Visites planifiées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{pastVisits.filter(v => v.status === 'effectue').length}</p>
                <p className="text-xs text-muted-foreground">Visites effectuées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{visits?.filter(v => v.report_content).length || 0}</p>
                <p className="text-xs text-muted-foreground">Rapports rédigés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Visits Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="upcoming">À venir ({upcomingVisits.length})</TabsTrigger>
          <TabsTrigger value="today">Aujourd'hui ({todayVisits.length})</TabsTrigger>
          <TabsTrigger value="past">Historique ({pastVisits.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming">
          <VisitsList 
            visits={upcomingVisits} 
            onEdit={handleOpenVisitDialog}
            onReport={handleOpenReportDialog}
            emptyMessage="Aucune visite planifiée"
          />
        </TabsContent>
        
        <TabsContent value="today">
          <VisitsList 
            visits={todayVisits} 
            onEdit={handleOpenVisitDialog}
            onReport={handleOpenReportDialog}
            emptyMessage="Aucune visite aujourd'hui"
          />
        </TabsContent>
        
        <TabsContent value="past">
          <VisitsList 
            visits={pastVisits} 
            onEdit={handleOpenVisitDialog}
            onReport={handleOpenReportDialog}
            emptyMessage="Aucune visite passée"
            showReport
          />
        </TabsContent>
      </Tabs>
      
      {/* Dialogs */}
      <AnimatorVisitDialog
        open={visitDialogOpen}
        onOpenChange={setVisitDialogOpen}
        animatorId={animatorId!}
        assignedAgencyIds={assignedAgencyIds}
        visit={selectedVisit}
      />
      
      {selectedVisit && (
        <VisitReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          visit={selectedVisit}
        />
      )}
    </div>
  );
}

// Sub-component for visits list
function VisitsList({ 
  visits, 
  onEdit, 
  onReport,
  emptyMessage,
  showReport = false 
}: { 
  visits: AnimatorVisit[];
  onEdit: (visit: AnimatorVisit) => void;
  onReport: (visit: AnimatorVisit) => void;
  emptyMessage: string;
  showReport?: boolean;
}) {
  if (visits.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-3">
      {visits.map(visit => (
        <Card key={visit.id} className="rounded-xl hover:shadow-md transition-shadow">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">{visit.agency?.label || 'Agence'}</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(visit.visit_date), 'EEEE d MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {VISIT_TYPE_LABELS[visit.visit_type]}
                </Badge>
                <Badge variant="outline" className={VISIT_STATUS_COLORS[visit.status]}>
                  {VISIT_STATUS_LABELS[visit.status]}
                </Badge>
                {visit.report_content && (
                  <Badge variant="secondary" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    Rapport
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(visit)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onReport(visit)}>
                  <FileText className="h-4 w-4 mr-1" />
                  Rapport
                </Button>
              </div>
            </div>
            
            {visit.notes && (
              <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
                {visit.notes}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAnimators } from '../hooks/useAnimators';
import { useFranchiseur } from '../contexts/FranchiseurContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ManageAgencyAssignmentsDialog } from '@/components/admin/franchiseur/ManageAgencyAssignmentsDialog';
import { Users, Building2, MapPin, ChevronRight, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ROLE_LABELS: Record<string, string> = {
  animateur: 'Animateur réseau',
  directeur: 'Directeur réseau',
  dg: 'Directeur Général',
};

const ROLE_COLORS: Record<string, string> = {
  animateur: 'bg-blue-500/10 text-blue-600 border-blue-200',
  directeur: 'bg-purple-500/10 text-purple-600 border-purple-200',
  dg: 'bg-amber-500/10 text-amber-600 border-amber-200',
};

export default function FranchiseurAnimateurs() {
  const { permissions } = useFranchiseur();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAnimatorId, setSelectedAnimatorId] = useState<string | null>(null);
  
  const { data: animators, isLoading: animatorsLoading } = useAnimators();
  
  // Fetch all agency assignments
  const { data: allAssignments } = useQuery({
    queryKey: ['all-agency-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franchiseur_agency_assignments')
        .select('user_id, agency_id, apogee_agencies(id, label, slug)');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Group assignments by user
  const assignmentsByUser = allAssignments?.reduce((acc, assignment) => {
    if (!acc[assignment.user_id]) {
      acc[assignment.user_id] = [];
    }
    acc[assignment.user_id].push(assignment);
    return acc;
  }, {} as Record<string, typeof allAssignments>);

  // Filter only animateurs (not directeurs or DG)
  const animateursOnly = animators?.filter(a => a.franchiseur_role === 'animateur') || [];
  const directeursAndDG = animators?.filter(a => a.franchiseur_role !== 'animateur') || [];

  const canManage = permissions.canAssignAnimators;

  const handleOpenAssignments = (animatorId: string) => {
    setSelectedAnimatorId(animatorId);
  };

  const handleCloseAssignments = () => {
    setSelectedAnimatorId(null);
    queryClient.invalidateQueries({ queryKey: ['all-agency-assignments'] });
  };

  if (animatorsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Gestion des Animateurs
        </h1>
        <p className="text-muted-foreground mt-2">
          Assignez des agences spécifiques aux animateurs réseau
        </p>
      </div>

      {/* Stats summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{animateursOnly.length}</p>
                <p className="text-sm text-muted-foreground">Animateurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{directeursAndDG.length}</p>
                <p className="text-sm text-muted-foreground">Directeurs / DG</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Building2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Set(allAssignments?.map(a => a.agency_id)).size}
                </p>
                <p className="text-sm text-muted-foreground">Agences assignées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Animateurs list */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Animateurs Réseau
        </h2>
        
        {animateursOnly.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Aucun animateur réseau configuré</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {animateursOnly.map((animator) => {
              const assignments = assignmentsByUser?.[animator.id] || [];
              const initials = `${animator.first_name?.[0] || ''}${animator.last_name?.[0] || ''}`.toUpperCase();
              
              return (
                <Card key={animator.id} className="rounded-2xl hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-helpconfort-blue-dark text-white">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">
                            {animator.first_name} {animator.last_name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{animator.email}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Badge 
                      variant="outline" 
                      className={ROLE_COLORS[animator.franchiseur_role]}
                    >
                      {ROLE_LABELS[animator.franchiseur_role]}
                    </Badge>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          Agences assignées
                        </span>
                        <Badge variant="secondary" className="rounded-full">
                          {assignments.length === 0 ? 'Toutes' : assignments.length}
                        </Badge>
                      </div>
                      
                      {assignments.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {assignments.slice(0, 3).map((a: any) => (
                            <Badge 
                              key={a.agency_id} 
                              variant="outline" 
                              className="text-xs"
                            >
                              {a.apogee_agencies?.label}
                            </Badge>
                          ))}
                          {assignments.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{assignments.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {assignments.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">
                          Accès à toutes les agences du réseau
                        </p>
                      )}
                    </div>
                    
                    {canManage && (
                      <Button 
                        variant="outline" 
                        className="w-full rounded-xl"
                        onClick={() => handleOpenAssignments(animator.id)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Gérer les agences
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Directeurs & DG list (read-only) */}
      {directeursAndDG.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Direction Réseau
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {directeursAndDG.map((director) => {
              const assignments = assignmentsByUser?.[director.id] || [];
              const initials = `${director.first_name?.[0] || ''}${director.last_name?.[0] || ''}`.toUpperCase();
              
              return (
                <Card key={director.id} className="rounded-2xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-700 text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          {director.first_name} {director.last_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{director.email}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Badge 
                      variant="outline" 
                      className={ROLE_COLORS[director.franchiseur_role]}
                    >
                      {ROLE_LABELS[director.franchiseur_role]}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-3">
                      {assignments.length === 0 
                        ? 'Accès à toutes les agences du réseau' 
                        : `${assignments.length} agence(s) assignée(s)`
                      }
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog for managing assignments */}
      {selectedAnimatorId && (
        <ManageAgencyAssignmentsDialog
          open={!!selectedAnimatorId}
          onOpenChange={(open) => !open && handleCloseAssignments()}
          userId={selectedAnimatorId}
          onSuccess={handleCloseAssignments}
        />
      )}
    </div>
  );
}

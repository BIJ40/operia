/**
 * Onglet Souscriptions - Plans par agence
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Search, Check, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useAllAgencySubscriptions, 
  useUpdateAgencySubscription,
  usePlanTiers,
  useAuditLog,
} from '@/hooks/access-rights';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AgencyRow {
  id: string;
  label: string;
  slug: string;
  is_active: boolean;
  ville: string | null;
}

export function SubscriptionsTab() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  
  const { data: agencies, isLoading: loadingAgencies } = useQuery({
    queryKey: ['agencies-list'],
    queryFn: async (): Promise<AgencyRow[]> => {
      const { data, error } = await supabase
        .from('apogee_agencies')
        .select('id, label, slug, is_active, ville')
        .order('label');
      
      if (error) throw error;
      return data;
    },
  });
  
  const { data: subscriptions, isLoading: loadingSubscriptions } = useAllAgencySubscriptions();
  const { data: planTiers } = usePlanTiers();
  const updateSubscription = useUpdateAgencySubscription();
  const { log } = useAuditLog();
  
  // Map subscriptions by agency_id
  const subscriptionMap = new Map<string, typeof subscriptions extends (infer T)[] ? T : never>();
  subscriptions?.forEach(sub => {
    subscriptionMap.set(sub.agency_id, sub);
  });
  
  const filteredAgencies = agencies?.filter(agency => {
    const matchesSearch = !search || 
      agency.label.toLowerCase().includes(search.toLowerCase()) ||
      agency.slug.toLowerCase().includes(search.toLowerCase());
    
    const sub = subscriptionMap.get(agency.id);
    const matchesPlan = planFilter === 'all' || sub?.tier_key === planFilter;
    
    return matchesSearch && matchesPlan;
  }) || [];
  
  const handlePlanChange = async (agencyId: string, newPlan: string) => {
    const oldPlan = subscriptionMap.get(agencyId)?.tier_key;
    
    await updateSubscription.mutateAsync({ agencyId, tierKey: newPlan });
    
    await log({
      action: 'change_plan',
      entityType: 'subscription',
      entityId: agencyId,
      agencyId,
      changes: { from: oldPlan, to: newPlan },
    });
  };
  
  const getPlanBadgeStyle = (plan: string | undefined) => {
    switch (plan) {
      case 'PRO': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0';
      case 'STARTER': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0';
      case 'FREE': return 'bg-muted text-muted-foreground';
      default: return 'bg-destructive/10 text-destructive';
    }
  };
  
  const isLoading = loadingAgencies || loadingSubscriptions;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Souscriptions par Agence
        </CardTitle>
        <CardDescription className="flex flex-col gap-1">
          <span>Gérez le plan de chaque agence (FREE, STARTER, PRO).</span>
          <span className="text-blue-600 font-medium">
            Le plan définit les modules de base pour tous les utilisateurs de l'agence (Priorité 4/4).
            Les modules utilisateur et overrides agence s'y ajoutent.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {planTiers?.map(tier => {
            const count = subscriptions?.filter(s => s.tier_key === tier.key).length || 0;
            return (
              <Card key={tier.key} className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <Badge className={getPlanBadgeStyle(tier.key)}>{tier.label}</Badge>
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tier.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une agence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les plans</SelectItem>
              {planTiers?.map(tier => (
                <SelectItem key={tier.key} value={tier.key}>{tier.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agence</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Plan actuel</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Depuis</TableHead>
                <TableHead className="text-right">Changer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAgencies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Aucune agence trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgencies.map((agency) => {
                  const sub = subscriptionMap.get(agency.id);
                  
                  return (
                    <TableRow key={agency.id}>
                      <TableCell>
                        <div className="font-medium">{agency.label}</div>
                        <div className="text-sm text-muted-foreground">{agency.slug}</div>
                      </TableCell>
                      <TableCell>{agency.ville || '—'}</TableCell>
                      <TableCell>
                        {sub ? (
                          <Badge className={getPlanBadgeStyle(sub.tier_key)}>
                            {sub.tier_key}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-destructive border-destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Non configuré
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {sub?.status === 'active' ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Actif
                          </Badge>
                        ) : sub?.status === 'suspended' ? (
                          <Badge variant="secondary">Suspendu</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sub?.valid_from 
                          ? format(new Date(sub.valid_from), 'dd MMM yyyy', { locale: fr })
                          : '—'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Select 
                          value={sub?.tier_key || ''} 
                          onValueChange={(value) => handlePlanChange(agency.id, value)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {planTiers?.map(tier => (
                              <SelectItem key={tier.key} value={tier.key}>
                                {tier.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {filteredAgencies.length} agence(s) affichée(s)
        </div>
      </CardContent>
    </Card>
  );
}

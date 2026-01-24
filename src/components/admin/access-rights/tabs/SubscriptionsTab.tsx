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
import { getPlanColorClass } from '@/config/planTiers';

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
    if (!plan) return 'bg-destructive/10 text-destructive';
    return getPlanColorClass(plan);
  };
  
  const isLoading = loadingAgencies || loadingSubscriptions;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5" />
          Plans Agences
        </CardTitle>
        <CardDescription>
          Définissez le plan de chaque agence. Les utilisateurs héritent des modules du plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres simplifiés */}
        <div className="flex gap-3">
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
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {planTiers?.map(tier => (
                <SelectItem key={tier.key} value={tier.key}>{tier.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Table simplifiée */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agence</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right w-[140px]">Modifier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAgencies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
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
                        {agency.ville && (
                          <div className="text-sm text-muted-foreground">{agency.ville}</div>
                        )}
                      </TableCell>
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
                      <TableCell className="text-right">
                        <Select 
                          value={sub?.tier_key || ''} 
                          onValueChange={(value) => handlePlanChange(agency.id, value)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Choisir" />
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
        
        <div className="text-xs text-muted-foreground">
          {filteredAgencies.length} agence(s)
        </div>
      </CardContent>
    </Card>
  );
}

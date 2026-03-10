/**
 * Fiche utilisateur 360° - Résumé complet d'un utilisateur
 * Agrège les données de : profiles, collaborators, user_modules, agency_subscription
 */

import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User, Mail, Phone, Building2, Shield, Zap, Calendar,
  MapPin, Briefcase, Clock, AlertCircle, UserX, CheckCircle2,
  Hash, KeyRound, FileText,
} from 'lucide-react';
import { GlobalRole } from '@/types/globalRoles';
import { EnabledModules, MODULE_DEFINITIONS, ModuleKey } from '@/types/modules';
import { getVisibleRoleLabel, getVisibleRoleColor, VISIBLE_ROLE_DESCRIPTIONS } from '@/lib/visibleRoleLabels';
import { UserProfile } from '@/hooks/use-user-management';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile;
  effectiveRole: GlobalRole | null;
  effectiveModules: EnabledModules;
  agencyLabel?: string;
}

const ROLE_AGENCE_LABELS: Record<string, string> = {
  dirigeant: 'Dirigeant(e)',
  assistante: 'Assistante',
  commercial: 'Commercial',
  tete_de_reseau: 'Tête de réseau',
  externe: 'Externe',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: fr });
  } catch {
    return '—';
  }
}

/** Section avec titre et icône */
function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="pl-6 space-y-2">
        {children}
      </div>
    </div>
  );
}

/** Ligne d'information */
function InfoRow({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm text-right ${muted ? 'text-muted-foreground italic' : 'font-medium'}`}>
        {value || <span className="text-muted-foreground italic">Non renseigné</span>}
      </span>
    </div>
  );
}

export const UserProfileSheet = memo(function UserProfileSheet({
  open,
  onOpenChange,
  user,
  effectiveRole,
  effectiveModules: _legacyModules,
  agencyLabel,
}: UserProfileSheetProps) {
  // ═══ TRUTH: Fetch real effective modules via the SAME RPC that controls runtime access ═══
  const { data: rpcModules, isLoading: rpcModulesLoading } = useQuery({
    queryKey: ['user-profile-sheet-effective-modules', user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_effective_modules', {
        p_user_id: user.id,
      });
      if (error) throw error;
      const result: EnabledModules = {};
      if (Array.isArray(data)) {
        for (const row of data as Array<{ module_key: string; enabled: boolean; options: unknown }>) {
          result[row.module_key as ModuleKey] = {
            enabled: row.enabled === true,
            options: (typeof row.options === 'object' && row.options !== null && !Array.isArray(row.options))
              ? row.options as Record<string, boolean>
              : {},
          } as any;
        }
      }
      return result;
    },
    enabled: open,
    staleTime: 15_000,
  });

  // Use RPC truth when available, fallback to legacy prop
  const effectiveModules = rpcModules ?? _legacyModules;

  // Fetch collaborator data linked to this user
  const { data: collaborator, isLoading: collabLoading } = useQuery({
    queryKey: ['user-profile-sheet-collab', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
    staleTime: 30_000,
  });

  // Fetch contract data
  const { data: contract } = useQuery({
    queryKey: ['user-profile-sheet-contract', collaborator?.id],
    queryFn: async () => {
      if (!collaborator?.id) return null;
      const { data, error } = await supabase
        .from('employment_contracts')
        .select('contract_type, start_date, end_date, job_title, weekly_hours')
        .eq('collaborator_id', collaborator.id)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!collaborator?.id,
    staleTime: 30_000,
  });

  // Fetch extended profile info (phone, avatar, etc.)
  const { data: profileExtra } = useQuery({
    queryKey: ['user-profile-sheet-extra', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('phone, avatar_url, support_level, created_at, onboarding_completed_at')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
    staleTime: 30_000,
  });

  // Active modules count and list — uses RPC truth
  const activeModules = useMemo(() => {
    return MODULE_DEFINITIONS.filter(def => {
      const state = effectiveModules[def.key];
      if (typeof state === 'boolean') return state;
      if (typeof state === 'object') return state?.enabled;
      return false;
    });
  }, [effectiveModules]);

  // Module options summary
  const getModuleOptionsLabels = (moduleKey: ModuleKey): string[] => {
    const state = effectiveModules[moduleKey];
    if (typeof state !== 'object' || !state?.options) return [];
    const moduleDef = MODULE_DEFINITIONS.find(d => d.key === moduleKey);
    if (!moduleDef?.options) return [];
    return moduleDef.options
      .filter(opt => state.options?.[opt.key])
      .map(opt => opt.label);
  };

  const isDeactivated = user.is_active === false;

  const getDisplayName = () => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email || 'Utilisateur';
  };

  const getInitials = () => {
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  };

  // Completeness check
  const profileFields = [
    user.first_name, user.last_name, user.email,
    profileExtra?.phone, user.agence, user.role_agence,
  ];
  const filledCount = profileFields.filter(Boolean).length;
  const completionPct = Math.round((filledCount / profileFields.length) * 100);

  const collabFields = collaborator ? [
    collaborator.phone, collaborator.address || collaborator.street,
    collaborator.hiring_date, collaborator.type,
  ] : [];
  const collabFilledCount = collabFields.filter(Boolean).length;
  const collabCompletionPct = collaborator ? Math.round((collabFilledCount / collabFields.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[85vh] max-h-[85vh] flex flex-col overflow-hidden p-0">
        {/* Header with avatar */}
        <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold shrink-0 ${
              isDeactivated ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
            }`}>
              {getInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold truncate">
                {getDisplayName()}
              </DialogTitle>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{user.email || 'Pas d\'email'}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={getVisibleRoleColor(effectiveRole)}>
                  {getVisibleRoleLabel(effectiveRole)}
                </Badge>
                {isDeactivated && (
                  <Badge variant="destructive" className="text-xs">
                    <UserX className="w-3 h-3 mr-1" />
                    Désactivé
                  </Badge>
                )}
                {user.must_change_password && !isDeactivated && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30 text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    MDP provisoire
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <ScrollArea type="always" className="flex-1 min-h-0">
          <div className="px-6 py-5 space-y-6">

            {/* ═══ PROFIL UTILISATEUR ═══ */}
            <Section icon={User} title="Profil utilisateur">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Complétude profil</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${completionPct === 100 ? 'bg-emerald-500' : completionPct >= 60 ? 'bg-amber-500' : 'bg-red-400'}`}
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{completionPct}%</span>
                </div>
              </div>
              <InfoRow label="Prénom" value={user.first_name} />
              <InfoRow label="Nom" value={user.last_name} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Téléphone" value={profileExtra?.phone} />
              <InfoRow label="Agence" value={agencyLabel || user.agence} />
              <InfoRow label="Poste" value={ROLE_AGENCE_LABELS[user.role_agence || ''] || user.role_agence} />
              {user.apogee_user_id && (
                <InfoRow label="ID Apogée" value={`#${user.apogee_user_id}`} />
              )}
              <InfoRow label="Inscrit le" value={formatDate(user.created_at)} />
              {profileExtra?.onboarding_completed_at && (
                <InfoRow label="Onboarding terminé" value={formatDate(profileExtra.onboarding_completed_at)} />
              )}
            </Section>

            <Separator />

            {/* ═══ FICHE SALARIÉ ═══ */}
            <Section icon={Briefcase} title="Fiche salarié">
              {collabLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : collaborator ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Complétude fiche</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${collabCompletionPct === 100 ? 'bg-emerald-500' : collabCompletionPct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                          style={{ width: `${collabCompletionPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{collabCompletionPct}%</span>
                    </div>
                  </div>
                  <InfoRow label="Type" value={collaborator.type} />
                  <InfoRow label="Rôle agence" value={collaborator.role} />
                  <InfoRow label="Téléphone" value={collaborator.phone} />
                  <InfoRow label="Adresse" value={
                    [collaborator.street || collaborator.address, collaborator.postal_code, collaborator.city]
                      .filter(Boolean).join(', ') || null
                  } />
                  <InfoRow label="Date d'embauche" value={formatDate(collaborator.hiring_date)} />
                  {collaborator.leaving_date && (
                    <InfoRow label="Date de sortie" value={formatDate(collaborator.leaving_date)} />
                  )}
                  {contract && (
                    <>
                      <Separator className="my-2" />
                      <InfoRow label="Contrat" value={contract.contract_type} />
                      {contract.job_title && <InfoRow label="Poste contrat" value={contract.job_title} />}
                      {contract.weekly_hours && <InfoRow label="Heures/semaine" value={`${contract.weekly_hours}h`} />}
                      <InfoRow label="Début contrat" value={formatDate(contract.start_date)} />
                      {contract.end_date && <InfoRow label="Fin contrat" value={formatDate(contract.end_date)} />}
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Aucune fiche salarié rattachée à cet utilisateur
                </p>
              )}
            </Section>

            <Separator />

            {/* ═══ DROITS & ACCÈS ═══ */}
            <Section icon={Shield} title="Droits & Accès">
              <InfoRow label="Rôle global" value={
                <Badge className={`${getVisibleRoleColor(effectiveRole)} text-xs`}>
                  {getVisibleRoleLabel(effectiveRole)}
                </Badge>
              } />
              {effectiveRole && (
                <p className="text-xs text-muted-foreground">
                  {VISIBLE_ROLE_DESCRIPTIONS[effectiveRole]}
                </p>
              )}
              {profileExtra?.support_level && profileExtra.support_level > 0 && (
                <InfoRow label="Niveau support" value={`N${profileExtra.support_level}`} />
              )}
            </Section>

            <Separator />

            {/* ═══ MODULES ACTIFS (VÉRITÉ RPC) ═══ */}
            <Section icon={Zap} title={`Accès réels (${rpcModulesLoading ? '…' : activeModules.length} modules)`}>
              {rpcModulesLoading ? (
                <p className="text-sm text-muted-foreground italic">Chargement des droits effectifs…</p>
              ) : activeModules.length > 0 ? (
                <div className="space-y-2">
                  {activeModules.map(mod => {
                    const optLabels = getModuleOptionsLabels(mod.key);
                    return (
                      <div key={mod.key} className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{mod.label}</span>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        {optLabels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {optLabels.map(label => (
                              <Badge key={label} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Aucun module accessible pour cet utilisateur
                </p>
              )}
            </Section>

            {/* ═══ STATUT COMPTE ═══ */}
            <Separator />
            <Section icon={KeyRound} title="Statut du compte">
              <InfoRow label="Actif" value={
                isDeactivated ? (
                  <Badge variant="destructive" className="text-xs">Non</Badge>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">Oui</Badge>
                )
              } />
              {isDeactivated && user.deactivated_at && (
                <InfoRow label="Désactivé le" value={formatDate(user.deactivated_at)} />
              )}
              <InfoRow label="MDP provisoire" value={
                user.must_change_password ? (
                  <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">Oui</Badge>
                ) : '—'
              } />
            </Section>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

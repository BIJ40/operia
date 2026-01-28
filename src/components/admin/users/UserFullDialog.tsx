/**
 * Dialog unifié utilisateur - Informations + Permissions
 * Design moderne à deux colonnes avec bords arrondis
 */

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Eye, Shield, Building2, Lock, LockOpen, Check, X, ChevronDown, 
  Zap, Plus, AlertCircle, PlusCircle, User, Mail, Briefcase, 
  Loader2, KeyRound, RefreshCw
} from 'lucide-react';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { EnabledModules, ModuleKey, isModuleEnabled, isModuleOptionEnabled } from '@/types/modules';
import { SITEMAP_ROUTES, SECTION_LABELS, SitemapSection } from '@/config/sitemapData';
import { getVisibleRoleLabel, getVisibleRoleColor, VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { isHardcodedProtectedUser } from '@/hooks/access-rights/useProtectedAccess';
import { usePlanTiers } from '@/hooks/access-rights';
import { generateSecurePassword } from '@/lib/passwordUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ApogeeUserSelect } from '@/components/collaborators/ApogeeUserSelect';

// Postes disponibles (N1 supprimé - technicien legacy conservé pour édition)
const ROLE_AGENCE_LABELS: Record<string, string> = {
  'dirigeant': 'Dirigeant(e)',
  'assistante': 'Assistante',
  'commercial': 'Commercial',
  'tete_de_reseau': 'Tête de réseau',
  'externe': 'Externe',
};

interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
}

interface UserFullDialogProps {
  userId: string;
  userName: string;
  userEmail: string;
  firstName: string;
  lastName: string;
  globalRole: GlobalRole | null;
  agencyId?: string | null;
  agencySlug?: string | null;
  agencyLabel?: string | null;
  roleAgence?: string | null;
  isActive?: boolean;
  mustChangePassword?: boolean;
  apogeeUserId?: number | null;
  enabledModules: EnabledModules | null;
  planKey?: string | null;
  planLabel?: string | null;
  canEdit?: boolean;
  pageOverrides?: string[];
  agencies?: Agency[];
  assignableRoles?: GlobalRole[];
  onPlanChange?: (newPlanKey: string) => void;
  onModuleToggle?: (moduleKey: ModuleKey, enabled: boolean, optionKey?: string) => void;
  onPageOverrideToggle?: (pagePath: string, enabled: boolean) => void;
  onSaveUser?: (data: {
    first_name: string;
    last_name: string;
    email: string;
    agence: string;
    agency_id: string | null;
    role_agence: string;
    global_role: GlobalRole;
    apogee_user_id: number | null;
  }) => void;
  onUpdateEmail?: (newEmail: string) => void;
  onResetPassword?: (newPassword: string, sendEmail: boolean) => void;
  isSaving?: boolean;
  isEmailPending?: boolean;
  isPasswordPending?: boolean;
}

const SPECIAL_ACCESS_KEYS: { moduleKey: ModuleKey; optionKey?: string; label: string }[] = [
  { moduleKey: 'apogee_tickets', label: 'Gestion de Projet' },
  { moduleKey: 'support', optionKey: 'agent', label: 'Agent Support' },
  { moduleKey: 'help_academy', optionKey: 'edition', label: 'Contributeur FAQ' },
];

const VISIBLE_SECTIONS: SitemapSection[] = ['core', 'academy', 'pilotage', 'rh', 'support', 'reseau', 'projects', 'admin'];

export function UserFullDialog({
  userId,
  userName,
  userEmail,
  firstName,
  lastName,
  globalRole,
  agencyId,
  agencySlug,
  agencyLabel,
  roleAgence,
  isActive = true,
  mustChangePassword = false,
  apogeeUserId,
  enabledModules,
  planKey,
  planLabel,
  canEdit = false,
  pageOverrides = [],
  agencies = [],
  assignableRoles = [],
  onPlanChange,
  onModuleToggle,
  onPageOverrideToggle,
  onSaveUser,
  onUpdateEmail,
  onResetPassword,
  isSaving = false,
  isEmailPending = false,
  isPasswordPending = false,
}: UserFullDialogProps) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState<SitemapSection[]>([]);
  const [addAccessOpen, setAddAccessOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    agence: '',
    roleAgence: '',
    globalRole: 'base_user' as GlobalRole,
    apogeeUserId: undefined as number | undefined,
  });
  const [newPassword, setNewPassword] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  
  const { data: planTiers } = usePlanTiers();
  
  const isProtected = isHardcodedProtectedUser(userId);
  const userLevel = globalRole ? GLOBAL_ROLES[globalRole] ?? 0 : 0;
  const isN5Plus = userLevel >= GLOBAL_ROLES.platform_admin;
  
  // Sync form data when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        firstName: firstName || '',
        lastName: lastName || '',
        email: userEmail || '',
        agence: agencySlug || '',
        roleAgence: roleAgence || '',
        globalRole: globalRole || 'base_user',
        apogeeUserId: apogeeUserId ?? undefined,
      });
    }
  }, [open, firstName, lastName, userEmail, agencySlug, roleAgence, globalRole, apogeeUserId]);
  
  // Routes by section
  const routesBySection = useMemo(() => {
    const grouped: Partial<Record<SitemapSection, typeof SITEMAP_ROUTES>> = {};
    for (const route of SITEMAP_ROUTES) {
      if (route.isRedirect || route.isDynamic) continue;
      if (!VISIBLE_SECTIONS.includes(route.section)) continue;
      if (!grouped[route.section]) grouped[route.section] = [];
      grouped[route.section]!.push(route);
    }
    return grouped;
  }, []);
  
  // Access by section
  const accessBySection = useMemo(() => {
    const result: Partial<Record<SitemapSection, { route: typeof SITEMAP_ROUTES[0]; hasAccess: boolean; hasOverride: boolean }[]>> = {};
    for (const [section, routes] of Object.entries(routesBySection)) {
      result[section as SitemapSection] = routes!.map(route => {
        const hasOverride = pageOverrides.includes(route.path);
        if (hasOverride) return { route, hasAccess: true, hasOverride: true };
        
        const minRole = route.guards?.roleGuard?.minRole;
        const minLevel = minRole ? GLOBAL_ROLES[minRole] ?? 0 : 0;
        const hasRoleLevel = userLevel >= minLevel;
        
        let hasModuleAccess = true;
        if (route.guards?.moduleGuard?.moduleKey) {
          const moduleKey = route.guards.moduleGuard.moduleKey as ModuleKey;
          const optionKey = route.guards.moduleGuard.requiredOption;
          hasModuleAccess = optionKey
            ? isModuleOptionEnabled(enabledModules, moduleKey, optionKey)
            : isModuleEnabled(enabledModules, moduleKey);
          if (isN5Plus) hasModuleAccess = true;
        }
        
        return { route, hasAccess: hasRoleLevel && hasModuleAccess, hasOverride: false };
      });
    }
    return result;
  }, [routesBySection, userLevel, enabledModules, isN5Plus, pageOverrides]);
  
  const inaccessiblePages = useMemo(() => {
    const pages: { path: string; label: string; section: SitemapSection }[] = [];
    for (const [section, routes] of Object.entries(accessBySection)) {
      for (const { route, hasAccess } of routes!) {
        if (!hasAccess) {
          pages.push({ path: route.path, label: route.label, section: section as SitemapSection });
        }
      }
    }
    return pages;
  }, [accessBySection]);
  
  const sectionStats = useMemo(() => {
    const stats: Partial<Record<SitemapSection, { total: number; accessible: number }>> = {};
    for (const [section, routes] of Object.entries(accessBySection)) {
      stats[section as SitemapSection] = {
        total: routes!.length,
        accessible: routes!.filter(r => r.hasAccess).length,
      };
    }
    return stats;
  }, [accessBySection]);
  
  const totalStats = useMemo(() => {
    let total = 0, accessible = 0;
    for (const stat of Object.values(sectionStats)) {
      total += stat!.total;
      accessible += stat!.accessible;
    }
    return { total, accessible };
  }, [sectionStats]);
  
  const specialAccess = useMemo(() => {
    return SPECIAL_ACCESS_KEYS.map(sa => ({
      ...sa,
      enabled: sa.optionKey
        ? isModuleOptionEnabled(enabledModules, sa.moduleKey, sa.optionKey)
        : isModuleEnabled(enabledModules, sa.moduleKey),
    }));
  }, [enabledModules]);
  
  const toggleSection = (section: SitemapSection) => {
    setExpandedSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };
  
  const handleSpecialAccessToggle = (moduleKey: ModuleKey, optionKey?: string) => {
    if (!onModuleToggle) return;
    const currentlyEnabled = optionKey
      ? isModuleOptionEnabled(enabledModules, moduleKey, optionKey)
      : isModuleEnabled(enabledModules, moduleKey);
    onModuleToggle(moduleKey, !currentlyEnabled, optionKey);
  };
  
  const handleAddPageAccess = (pagePath: string) => {
    if (!onPageOverrideToggle) return;
    onPageOverrideToggle(pagePath, true);
    setAddAccessOpen(false);
  };
  
  const handleRemovePageAccess = (pagePath: string) => {
    if (!onPageOverrideToggle) return;
    onPageOverrideToggle(pagePath, false);
  };
  
  const handleSaveUser = () => {
    if (!onSaveUser) return;
    const normalizedSlug = (formData.agence || '').toLowerCase();
    const resolvedAgencyId = normalizedSlug
      ? (agencies.find(a => a.slug?.toLowerCase() === normalizedSlug)?.id ?? null)
      : null;
    
    onSaveUser({
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      agence: formData.agence,
      agency_id: resolvedAgencyId,
      role_agence: formData.roleAgence,
      global_role: formData.globalRole,
      apogee_user_id: formData.apogeeUserId ?? null,
    });
  };
  
  const handleResetPassword = () => {
    if (!onResetPassword || !newPassword) return;
    
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasDigit = /\d/.test(newPassword);
    const hasSymbol = /[!@#$%&*_+\-]/.test(newPassword);
    const validLength = newPassword.length >= 8;
    
    if (!validLength || !hasLower || !hasUpper || !hasDigit || !hasSymbol) {
      const missing: string[] = [];
      if (!validLength) missing.push('8 caractères minimum');
      if (!hasLower) missing.push('une minuscule');
      if (!hasUpper) missing.push('une majuscule');
      if (!hasDigit) missing.push('un chiffre');
      if (!hasSymbol) missing.push('un symbole');
      toast.error(`Il manque : ${missing.join(', ')}`);
      return;
    }
    
    onResetPassword(newPassword, sendEmail);
    setNewPassword('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Voir / Modifier">
          <Eye className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 pr-14 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">{userName}</DialogTitle>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isProtected && (
                <Badge variant="outline" className="text-warning border-warning/50 gap-1">
                  <Lock className="h-3 w-3" />
                  Protégé
                </Badge>
              )}
              {!isActive && (
                <Badge variant="destructive" className="gap-1">Inactif</Badge>
              )}
              {canEdit && (
                <Button 
                  variant={editMode ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  className="gap-1.5 rounded-lg"
                >
                  {editMode ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {editMode ? 'Verrouiller' : 'Éditer'}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        {/* Content - Two columns */}
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x max-h-[calc(90vh-120px)]">
          {/* Left column - User Info */}
          <ScrollArea className="flex-1 p-5">
            <div className="space-y-5">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <User className="h-4 w-4" />
                Informations
              </h3>
              
              {/* Status badges */}
              {mustChangePassword && (
                <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30 gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Mot de passe provisoire
                </Badge>
              )}
              
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Prénom</Label>
                  {editMode ? (
                    <Input 
                      value={formData.firstName}
                      onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                      className="rounded-lg"
                    />
                  ) : (
                    <p className="font-medium">{firstName || '—'}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nom</Label>
                  {editMode ? (
                    <Input 
                      value={formData.lastName}
                      onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                      className="rounded-lg"
                    />
                  ) : (
                    <p className="font-medium">{lastName || '—'}</p>
                  )}
                </div>
              </div>
              
              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                {editMode ? (
                  <div className="flex gap-2">
                    <Input 
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      className="flex-1 rounded-lg"
                    />
                    {onUpdateEmail && formData.email !== userEmail && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onUpdateEmail(formData.email)}
                        disabled={isEmailPending}
                        className="rounded-lg"
                      >
                        {isEmailPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Modifier'}
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="font-medium">{userEmail || '—'}</p>
                )}
              </div>
              
              {/* Agency */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Agence
                </Label>
                {editMode ? (
                  <Select 
                    value={formData.agence || "none"} 
                    onValueChange={v => setFormData(p => ({ ...p, agence: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune agence</SelectItem>
                      {agencies.filter(a => a.slug?.trim()).map(a => (
                        <SelectItem key={a.id} value={a.slug}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{agencyLabel || '—'}</p>
                )}
              </div>
              
              {/* Role agence */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> Poste
                </Label>
                {editMode ? (
                  <Select 
                    value={formData.roleAgence || ""} 
                    onValueChange={v => setFormData(p => ({ ...p, roleAgence: v }))}
                  >
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_AGENCE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{ROLE_AGENCE_LABELS[roleAgence || ''] || roleAgence || '—'}</p>
                )}
              </div>
              
              {/* Global role */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Rôle système
                </Label>
                {editMode && assignableRoles.length > 0 ? (
                  <Select 
                    value={formData.globalRole} 
                    onValueChange={v => setFormData(p => ({ ...p, globalRole: v as GlobalRole }))}
                  >
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map(role => (
                        <SelectItem key={role} value={role}>{VISIBLE_ROLE_LABELS[role]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={cn(getVisibleRoleColor(globalRole), "rounded-lg")}>
                    {getVisibleRoleLabel(globalRole)}
                  </Badge>
                )}
              </div>
              
              {/* Apogée link */}
              {editMode && formData.agence && (
                <ApogeeUserSelect
                  value={formData.apogeeUserId}
                  onChange={id => setFormData(p => ({ ...p, apogeeUserId: id }))}
                  agencySlug={formData.agence}
                  label="Liaison Apogée"
                  collaboratorName={`${formData.firstName} ${formData.lastName}`}
                />
              )}
              
              {/* Password reset */}
              {editMode && onResetPassword && (
                <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <KeyRound className="h-3 w-3" /> Réinitialiser mot de passe
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      type="text"
                      placeholder="Nouveau mot de passe"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="flex-1 rounded-lg"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setNewPassword(generateSecurePassword())}
                      className="rounded-lg shrink-0"
                      title="Générer"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={handleResetPassword}
                      disabled={!newPassword || isPasswordPending}
                      className="rounded-lg"
                    >
                      {isPasswordPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Appliquer'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="sendPwdEmail"
                      checked={sendEmail}
                      onChange={e => setSendEmail(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="sendPwdEmail" className="text-xs">Envoyer par email</label>
                  </div>
                </div>
              )}
              
              {/* Save button */}
              {editMode && onSaveUser && (
                <Button 
                  onClick={handleSaveUser}
                  disabled={isSaving}
                  className="w-full rounded-lg"
                >
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...</>
                  ) : (
                    'Enregistrer les modifications'
                  )}
                </Button>
              )}
            </div>
          </ScrollArea>
          
          {/* Right column - Permissions */}
          <ScrollArea className="flex-1 p-5 bg-muted/20">
            <div className="space-y-5">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions
              </h3>
              
              {/* Plan */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-background border">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Plan agence</span>
                </div>
                {editMode && planTiers && agencyId && onPlanChange ? (
                  <Select value={planKey || ''} onValueChange={onPlanChange}>
                    <SelectTrigger className="w-[100px] h-8 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {planTiers.map(tier => (
                        <SelectItem key={tier.key} value={tier.key}>{tier.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={planLabel === 'PRO' ? 'default' : 'secondary'} className="rounded-lg">
                    {planLabel || 'Aucun'}
                  </Badge>
                )}
              </div>
              
              {/* Special access */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Accès spéciaux
                </div>
                <div className="grid gap-2">
                  {specialAccess.map(sa => (
                    <div 
                      key={`${sa.moduleKey}-${sa.optionKey || 'root'}`}
                      className={cn(
                        "flex items-center justify-between py-2.5 px-3 rounded-xl text-sm border transition-colors",
                        sa.enabled ? "bg-success/5 border-success/30" : "bg-background"
                      )}
                    >
                      <span className={cn(!sa.enabled && "text-muted-foreground")}>{sa.label}</span>
                      {editMode && onModuleToggle ? (
                        <Switch 
                          checked={sa.enabled}
                          onCheckedChange={() => handleSpecialAccessToggle(sa.moduleKey, sa.optionKey)}
                        />
                      ) : (
                        sa.enabled ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Pages */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pages accessibles</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-lg text-xs">
                      {totalStats.accessible}/{totalStats.total}
                    </Badge>
                    {editMode && onPageOverrideToggle && inaccessiblePages.length > 0 && (
                      <Popover open={addAccessOpen} onOpenChange={setAddAccessOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs rounded-lg">
                            <PlusCircle className="h-3 w-3" />
                            Ajouter
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0 rounded-xl" align="end">
                          <Command>
                            <CommandInput placeholder="Rechercher..." />
                            <CommandList>
                              <CommandEmpty>Aucune page trouvée</CommandEmpty>
                              <CommandGroup>
                                {inaccessiblePages.map(page => (
                                  <CommandItem
                                    key={page.path}
                                    value={`${page.label} ${page.path}`}
                                    onSelect={() => handleAddPageAccess(page.path)}
                                  >
                                    <div className="flex flex-col">
                                      <span>{page.label}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {SECTION_LABELS[page.section]}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
                
                {/* Overrides */}
                {pageOverrides.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pageOverrides.map(path => {
                      const route = SITEMAP_ROUTES.find(r => r.path === path);
                      return (
                        <Badge 
                          key={path} 
                          className="text-xs gap-1 bg-success/80 hover:bg-success rounded-lg"
                        >
                          <Plus className="h-3 w-3" />
                          {route?.label || path}
                          {editMode && onPageOverrideToggle && (
                            <button 
                              onClick={() => handleRemovePageAccess(path)}
                              className="ml-1 hover:text-destructive-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                )}
                
                {/* Sections */}
                <div className="space-y-1">
                  {VISIBLE_SECTIONS.map(section => {
                    const stats = sectionStats[section];
                    const routes = accessBySection[section];
                    if (!stats || !routes || routes.length === 0) return null;
                    
                    const isExpanded = expandedSections.includes(section);
                    const allAccessible = stats.accessible === stats.total;
                    const noneAccessible = stats.accessible === 0;
                    
                    return (
                      <Collapsible key={section} open={isExpanded} onOpenChange={() => toggleSection(section)}>
                        <CollapsibleTrigger asChild>
                          <button className={cn(
                            "w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm hover:bg-muted/50 transition-colors border",
                            allAccessible && "bg-success/5 border-success/20",
                            noneAccessible && "bg-muted/30 opacity-70 border-transparent"
                          )}>
                            <div className="flex items-center gap-2">
                              <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                              <span className="font-medium">{SECTION_LABELS[section]}</span>
                            </div>
                            <Badge variant={allAccessible ? "default" : noneAccessible ? "secondary" : "outline"} className="rounded-lg text-xs">
                              {stats.accessible}/{stats.total}
                            </Badge>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-6 mt-1 space-y-0.5 border-l pl-3 pb-2">
                            {routes.map(({ route, hasAccess, hasOverride }) => (
                              <div 
                                key={route.path}
                                className={cn(
                                  "flex items-center justify-between text-xs py-1.5 px-2 rounded-lg",
                                  hasAccess ? "text-foreground" : "text-muted-foreground opacity-60",
                                  hasOverride && "bg-success/10"
                                )}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="truncate">{route.label}</span>
                                  {hasOverride && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1 border-success text-success rounded">
                                      +
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {hasAccess ? (
                                    <Check className="h-3 w-3 text-success" />
                                  ) : editMode && onPageOverrideToggle ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={e => { e.stopPropagation(); handleAddPageAccess(route.path); }}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  ) : (
                                    <X className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
              
              {/* Info note */}
              {agencyId && (
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-xl text-xs text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Le plan affecte <strong>tous les utilisateurs</strong> de l'agence. 
                    Les accès individuels (+) s'appliquent uniquement à cet utilisateur.
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

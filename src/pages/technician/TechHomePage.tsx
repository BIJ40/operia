/**
 * Page d'accueil technicien mobile-first avec tiles
 * Design: Tiles cliquables, KPIs condensés, intuitif smartphone
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  FileText,
  Car,
  Wrench,
  Inbox,
  Bell,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTechnicianProfile } from '@/hooks/technician/useTechnicianProfile';
import { usePersonalKpis } from '@/hooks/usePersonalKpis';
import { useMyRequests } from '@/hooks/rh-employee/useMyRequests';
import { useMyPlanningPackages } from '@/hooks/technician/usePlanningPackages';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================
interface TileConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  to: string;
  color: string;
  bgColor: string;
  badge?: number;
  description?: string;
}

// ============================================
// KPIs condensés en ligne
// ============================================
function KpiStrip() {
  const { data, isLoading } = usePersonalKpis();
  
  const isNotLinked = data?.type === 'not_linked';
  const stats = data?.type === 'technicien' ? data.data : null;
  
  if (isNotLinked) {
    return (
      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <CardContent className="p-3 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Compte non lié à Apogée</span>
        </CardContent>
      </Card>
    );
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-3 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  const formatValue = (val: number | undefined, type: 'currency' | 'number') => {
    if (val === undefined) return '-';
    if (type === 'currency') {
      return new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR',
        maximumFractionDigits: 0
      }).format(val);
    }
    return val.toString();
  };
  
  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Mes perfs (mois)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="font-bold text-primary">{formatValue(stats?.caMonth, 'currency')}</div>
              <div className="text-[10px] text-muted-foreground">CA</div>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-center">
              <div className="font-bold text-primary">{formatValue(stats?.interventionsRealisees, 'number')}</div>
              <div className="text-[10px] text-muted-foreground">RDV</div>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-center">
              <div className="font-bold text-primary">{formatValue(stats?.dossiersTraites, 'number')}</div>
              <div className="text-[10px] text-muted-foreground">Facturés</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Tile Component
// ============================================
function ActionTile({ tile }: { tile: TileConfig }) {
  const Icon = tile.icon;
  
  return (
    <Link to={tile.to} className="block">
      <Card className={cn(
        "relative overflow-hidden transition-all active:scale-[0.98]",
        "hover:shadow-md hover:border-primary/30",
        tile.bgColor
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className={cn("p-2 rounded-lg", tile.color)}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            {tile.badge !== undefined && tile.badge > 0 && (
              <Badge variant="destructive" className="text-xs">
                {tile.badge}
              </Badge>
            )}
          </div>
          <div className="mt-3">
            <div className="font-semibold text-sm">{tile.label}</div>
            {tile.description && (
              <div className="text-xs text-muted-foreground mt-0.5">{tile.description}</div>
            )}
          </div>
          <ChevronRight className="absolute right-3 bottom-3 h-4 w-4 text-muted-foreground/50" />
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================
// Main Component
// ============================================
export default function TechHomePage() {
  const { data: profile, isLoading: profileLoading } = useTechnicianProfile();
  const { data: requests = [] } = useMyRequests({ archived: false });
  const { data: packages = [] } = useMyPlanningPackages();
  
  // Calculer les badges
  const pendingRequests = requests.filter(r => r.status === 'SUBMITTED' || r.status === 'SEEN').length;
  const unsignedPackages = packages.filter(p => !p.signed_at).length;
  
  // Configuration des tiles
  const tiles: TileConfig[] = useMemo(() => [
    {
      id: 'planning',
      label: 'Mon Planning',
      icon: Calendar,
      to: '/t',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      description: 'Semaine en cours',
    },
    {
      id: 'pointage',
      label: 'Pointage',
      icon: Clock,
      to: '/t/pointage',
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      badge: unsignedPackages,
      description: unsignedPackages > 0 ? `${unsignedPackages} à signer` : 'Gérer mes heures',
    },
    {
      id: 'documents',
      label: 'Coffre RH',
      icon: FileText,
      to: '/t/documents',
      color: 'bg-violet-500',
      bgColor: 'bg-violet-50 dark:bg-violet-950/20',
      description: 'Bulletins, contrats',
    },
    {
      id: 'vehicule',
      label: 'Mon Véhicule',
      icon: Car,
      to: '/t/documents?tab=vehicule',
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      description: 'Infos & signalements',
    },
    {
      id: 'materiel',
      label: 'Matériel & EPI',
      icon: Wrench,
      to: '/t/documents?tab=materiel',
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      description: 'Équipements attribués',
    },
    {
      id: 'demandes',
      label: 'Mes Demandes',
      icon: Inbox,
      to: '/t/documents?tab=demandes',
      color: 'bg-pink-500',
      bgColor: 'bg-pink-50 dark:bg-pink-950/20',
      badge: pendingRequests,
      description: pendingRequests > 0 ? `${pendingRequests} en attente` : 'Congés, EPI...',
    },
  ], [unsignedPackages, pendingRequests]);
  
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }, []);
  
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const firstName = profile?.first_name || 'Technicien';
  const today = format(new Date(), "EEEE d MMMM", { locale: fr });
  
  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header avec salutation */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </div>
      
      {/* KPIs condensés en ligne */}
      <KpiStrip />
      
      {/* Grille de tiles 2x3 */}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <ActionTile key={tile.id} tile={tile} />
        ))}
      </div>
      
      {/* Alerte si profil non configuré */}
      {!profile?.apogee_user_id && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-amber-800 dark:text-amber-200">
                Profil incomplet
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Votre compte n'est pas encore lié à Apogée. Contactez votre responsable.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

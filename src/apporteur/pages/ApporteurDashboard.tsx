/**
 * ApporteurDashboard - Page d'accueil de l'espace Apporteur
 */

import { useApporteurAuth } from '@/contexts/ApporteurAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, 
  FileText, 
  PlusCircle, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function ApporteurDashboard() {
  const { apporteurUser } = useApporteurAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bienvenue, {apporteurUser?.firstName || 'Partenaire'}
          </h1>
          <p className="text-muted-foreground">
            {apporteurUser?.apporteurName} - Tableau de bord
          </p>
        </div>
        <Button onClick={() => navigate('/apporteur/nouvelle-demande')} className="gap-2">
          <PlusCircle className="w-4 h-4" />
          Nouvelle demande
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          icon={FolderOpen}
          label="Dossiers en cours"
          value="--"
          trend="+0%"
          color="primary"
        />
        <StatsCard
          icon={Clock}
          label="En attente"
          value="--"
          color="orange"
        />
        <StatsCard
          icon={CheckCircle}
          label="Terminés ce mois"
          value="--"
          color="green"
        />
        <StatsCard
          icon={FileText}
          label="Demandes"
          value="--"
          color="blue"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <ActionCard
          icon={FolderOpen}
          title="Mes dossiers"
          description="Consultez l'avancement de vos dossiers"
          onClick={() => navigate('/apporteur/dossiers')}
        />
        <ActionCard
          icon={FileText}
          title="Mes demandes"
          description="Historique de vos demandes d'intervention"
          onClick={() => navigate('/apporteur/demandes')}
        />
        <ActionCard
          icon={PlusCircle}
          title="Nouvelle demande"
          description="Créer une demande d'intervention"
          onClick={() => navigate('/apporteur/nouvelle-demande')}
          highlight
        />
      </div>

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune activité récente</p>
            <p className="text-sm mt-1">Créez votre première demande pour commencer</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  trend?: string;
  color: 'primary' | 'orange' | 'green' | 'blue';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
        {trend && (
          <p className="text-xs text-green-600 mt-2">{trend} ce mois</p>
        )}
      </CardContent>
    </Card>
  );
}

function ActionCard({ 
  icon: Icon, 
  title, 
  description, 
  onClick,
  highlight = false
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 ${highlight ? 'border-primary/50 bg-primary/5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${highlight ? 'bg-primary text-white' : 'bg-muted'}`}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

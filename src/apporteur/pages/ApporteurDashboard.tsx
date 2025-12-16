/**
 * ApporteurDashboard - Page d'accueil de l'espace Apporteur avec stats réelles
 */

import { useState } from 'react';
import { useApporteurAuth } from '@/contexts/ApporteurAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, 
  FileText, 
  PlusCircle, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Euro,
  Receipt,
  FileCheck,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useApporteurStats, formatCurrency, formatPercentage, type StatsPeriod } from '@/hooks/useApporteurStats';

export default function ApporteurDashboard() {
  const { apporteurUser } = useApporteurAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<StatsPeriod>('month');

  const { data: statsResponse, isLoading, error } = useApporteurStats({ period });

  const stats = statsResponse?.data;
  const isNotLinked = statsResponse?.error === 'non_raccorde';
  const isNotApporteurUser = statsResponse?.error === 'Utilisateur apporteur non trouvé' || error?.message?.includes('403');

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
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as StatsPeriod)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => navigate('/apporteur/nouvelle-demande')} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Nouvelle demande
          </Button>
        </div>
      </div>

      {/* Not an apporteur user Warning */}
      {isNotApporteurUser && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Accès réservé aux apporteurs
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ce tableau de bord est réservé aux utilisateurs apporteurs. Votre compte n'est pas configuré comme apporteur.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Non raccordé Warning */}
      {!isNotApporteurUser && isNotLinked && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Compte non raccordé à Apogée
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Les statistiques ne sont pas disponibles. Contactez l'agence HelpConfort pour activer le raccordement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Stats Cards - Only show if linked and is apporteur user */}
      {!isLoading && !isNotLinked && !isNotApporteurUser && stats && (
        <>
          {/* Financial Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              icon={Euro}
              label="CA Facturé"
              value={formatCurrency(stats.factures.amount_ht)}
              color="primary"
            />
            <StatsCard
              icon={CheckCircle}
              label="CA Payé"
              value={formatCurrency(stats.factures.paid_ht)}
              color="green"
            />
            <StatsCard
              icon={Clock}
              label="Reste dû"
              value={formatCurrency(stats.factures.due_ht)}
              color="orange"
            />
            <StatsCard
              icon={Receipt}
              label="Nb Factures"
              value={String(stats.factures.total)}
              color="blue"
            />
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              icon={FolderOpen}
              label="Dossiers"
              value={String(stats.projects.total)}
              subtitle={`${stats.projects.open} en cours`}
              color="primary"
            />
            <StatsCard
              icon={FileText}
              label="Devis"
              value={String(stats.devis.total)}
              subtitle={`${stats.devis.accepted} acceptés`}
              color="blue"
            />
            <StatsCard
              icon={FileCheck}
              label="Taux transfo"
              value={formatPercentage(stats.devis.conversion_rate)}
              color="green"
            />
            <StatsCard
              icon={TrendingUp}
              label="Demandes"
              value={String(stats.demands.total)}
              subtitle={`${stats.demands.pending} en attente`}
              color="orange"
            />
          </div>
        </>
      )}

      {/* Fallback stats when not linked or not apporteur user */}
      {!isLoading && (isNotLinked || isNotApporteurUser) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard icon={FolderOpen} label="Dossiers" value="--" color="primary" />
          <StatsCard icon={Clock} label="En attente" value="--" color="orange" />
          <StatsCard icon={CheckCircle} label="Terminés" value="--" color="green" />
          <StatsCard icon={FileText} label="Demandes" value="--" color="blue" />
        </div>
      )}

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
  subtitle,
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  subtitle?: string;
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
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold truncate">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
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

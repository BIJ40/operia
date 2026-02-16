/**
 * ProspectCardsPage - Liste des fiches prospect avec suivi CRM
 */
import { useState, useCallback } from 'react';
import { Search, Plus, Phone, Globe, MapPin, Calendar, Star, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useProspectCards,
  PROSPECT_STATUS_CONFIG,
  type ProspectCard,
  type ProspectStatus,
} from '../hooks/useProspectCards';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProspectCardsPageProps {
  onSelectCard: (cardId: string) => void;
}

export function ProspectCardsPage({ onSelectCard }: ProspectCardsPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: cards = [], isLoading } = useProspectCards({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter as ProspectStatus : undefined,
  });

  // Stats par status
  const stats = cards.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Fiches prospects</h2>
          <p className="text-sm text-muted-foreground">
            {cards.length} fiche{cards.length !== 1 ? 's' : ''} de suivi commercial
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(PROSPECT_STATUS_CONFIG).map(([key, config]) => {
          const count = stats[key] || 0;
          if (count === 0) return null;
          return (
            <Badge
              key={key}
              variant="outline"
              className={`cursor-pointer ${statusFilter === key ? 'ring-2 ring-primary' : ''} ${config.color}`}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            >
              {config.label}: {count}
            </Badge>
          );
        })}
      </div>

      {/* Search & filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une fiche..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(PROSPECT_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {!isLoading && cards.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Plus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Aucune fiche prospect</h3>
            <p className="text-sm text-muted-foreground">
              Sélectionnez des prospects depuis l'onglet "Pool" pour créer des fiches de suivi.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {cards.map(card => (
          <ProspectCardItem
            key={card.id}
            card={card}
            onClick={() => onSelectCard(card.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ProspectCardItem({ card, onClick }: { card: ProspectCard; onClick: () => void }) {
  const statusConfig = PROSPECT_STATUS_CONFIG[card.status];

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{card.denomination}</h3>
            {card.enseigne && (
              <p className="text-sm text-muted-foreground truncate">{card.enseigne}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2 mt-1" />
        </div>

        <Badge className={`mb-3 ${statusConfig.color}`}>
          {statusConfig.label}
        </Badge>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          {card.adresse && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{card.adresse}</span>
            </div>
          )}
          {card.telephone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>{card.telephone}</span>
            </div>
          )}
          {card.representant && (
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 shrink-0 text-center text-xs">👤</span>
              <span className="truncate">{card.representant}</span>
            </div>
          )}
          {card.next_rdv_at && (
            <div className="flex items-center gap-2 text-primary">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>RDV: {format(new Date(card.next_rdv_at), 'dd MMM yyyy HH:mm', { locale: fr })}</span>
            </div>
          )}
        </div>

        {/* Score */}
        {card.score > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${i < card.score ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

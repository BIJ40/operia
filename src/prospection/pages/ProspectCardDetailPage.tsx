/**
 * ProspectCardDetailPage - Fiche détaillée d'un prospect avec CRM complet
 */
import { useState, useCallback } from 'react';
import {
  ArrowLeft, Phone, Globe, MapPin, Calendar, Star, Building2, User, Hash,
  PlusCircle, MessageSquare, PhoneCall, Mail, MapPinned, RotateCcw, Edit2, Save, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useProspectCard,
  useUpdateProspectCard,
  useProspectInteractions,
  useCreateInteraction,
  PROSPECT_STATUS_CONFIG,
  type ProspectStatus,
  type ProspectInteraction,
} from '../hooks/useProspectCards';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface ProspectCardDetailPageProps {
  cardId: string;
  onBack: () => void;
}

const INTERACTION_ICONS: Record<string, React.ElementType> = {
  appel: PhoneCall,
  email: Mail,
  rdv: Calendar,
  visite: MapPinned,
  note: MessageSquare,
  relance: RotateCcw,
};

const INTERACTION_LABELS: Record<string, string> = {
  appel: 'Appel',
  email: 'Email',
  rdv: 'Rendez-vous',
  visite: 'Visite',
  note: 'Note',
  relance: 'Relance',
};

export function ProspectCardDetailPage({ cardId, onBack }: ProspectCardDetailPageProps) {
  const { data: card, isLoading } = useProspectCard(cardId);
  const { data: interactions = [] } = useProspectInteractions(cardId);
  const updateCard = useUpdateProspectCard();
  const createInteraction = useCreateInteraction();

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [showNewInteraction, setShowNewInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    type: 'appel' as ProspectInteraction['interaction_type'],
    summary: '',
    next_action: '',
  });
  const [editingRdv, setEditingRdv] = useState(false);
  const [rdvValue, setRdvValue] = useState('');

  if (isLoading || !card) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Chargement...</div>;
  }

  const handleStatusChange = async (status: string) => {
    await updateCard.mutateAsync({ id: cardId, status: status as ProspectStatus });
    toast.success('Statut mis à jour');
  };

  const handleScoreChange = async (score: number) => {
    await updateCard.mutateAsync({ id: cardId, score });
  };

  const handleSaveNotes = async () => {
    await updateCard.mutateAsync({ id: cardId, notes: notesValue });
    setEditingNotes(false);
    toast.success('Notes enregistrées');
  };

  const handleSaveRdv = async () => {
    if (!rdvValue) return;
    await updateCard.mutateAsync({
      id: cardId,
      next_rdv_at: new Date(rdvValue).toISOString(),
      status: 'rdv_planifie',
    });
    setEditingRdv(false);
    toast.success('RDV planifié');
  };

  const handleAddInteraction = async () => {
    if (!newInteraction.summary.trim()) {
      toast.error('Veuillez ajouter un résumé');
      return;
    }
    await createInteraction.mutateAsync({
      card_id: cardId,
      interaction_type: newInteraction.type,
      summary: newInteraction.summary,
      next_action: newInteraction.next_action || undefined,
    });
    setNewInteraction({ type: 'appel', summary: '', next_action: '' });
    setShowNewInteraction(false);
    toast.success('Interaction ajoutée');
  };

  const statusConfig = PROSPECT_STATUS_CONFIG[card.status];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{card.denomination}</h2>
          {card.enseigne && <p className="text-sm text-muted-foreground">{card.enseigne}</p>}
        </div>
        <Select value={card.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-44">
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PROSPECT_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Info column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {card.adresse && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span>{card.adresse}</span>
                </div>
              )}
              {card.telephone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${card.telephone}`} className="text-primary hover:underline">{card.telephone}</a>
                </div>
              )}
              {card.site_web && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <a href={card.site_web.startsWith('http') ? card.site_web : `https://${card.site_web}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:underline truncate">
                    {card.site_web}
                  </a>
                </div>
              )}
              {card.representant && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{card.representant}</span>
                </div>
              )}
              {card.siren && (
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-xs">SIREN: {card.siren}</span>
                </div>
              )}
              {card.chiffre_affaire && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  CA: <span className="font-mono">{Number(card.chiffre_affaire).toLocaleString('fr-FR')} €</span>
                </div>
              )}
              {card.tranche_effectif && (
                <div className="text-muted-foreground text-xs">
                  Effectif: {card.tranche_effectif}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Score prospect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <button key={i} onClick={() => handleScoreChange(i === card.score ? 0 : i)}>
                    <Star
                      className={`w-6 h-6 transition-colors ${i <= card.score ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30 hover:text-yellow-300'}`}
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* RDV */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Prochain RDV</span>
                <Button variant="ghost" size="sm" onClick={() => { setEditingRdv(true); setRdvValue(''); }}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingRdv ? (
                <div className="flex gap-2">
                  <Input type="datetime-local" value={rdvValue} onChange={e => setRdvValue(e.target.value)} className="flex-1" />
                  <Button size="sm" onClick={handleSaveRdv}><Save className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingRdv(false)}><X className="w-4 h-4" /></Button>
                </div>
              ) : card.next_rdv_at ? (
                <p className="text-primary font-medium">
                  {format(new Date(card.next_rdv_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun RDV planifié</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes & Interactions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Notes</span>
                {!editingNotes && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingNotes(true); setNotesValue(card.notes || ''); }}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={e => setNotesValue(e.target.value)}
                    rows={4}
                    placeholder="Ajouter des notes sur ce prospect..."
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingNotes(false)}>Annuler</Button>
                    <Button size="sm" onClick={handleSaveNotes}>Enregistrer</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{card.notes || 'Aucune note'}</p>
              )}
            </CardContent>
          </Card>

          {/* Interactions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Historique des interactions</span>
                <Button size="sm" variant="outline" onClick={() => setShowNewInteraction(true)}>
                  <PlusCircle className="w-4 h-4 mr-1" /> Ajouter
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* New interaction form */}
              {showNewInteraction && (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="flex gap-2">
                    <Select
                      value={newInteraction.type}
                      onValueChange={v => setNewInteraction(p => ({ ...p, type: v as any }))}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(INTERACTION_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder="Résumé de l'interaction..."
                    value={newInteraction.summary}
                    onChange={e => setNewInteraction(p => ({ ...p, summary: e.target.value }))}
                    rows={2}
                  />
                  <Input
                    placeholder="Prochaine action (optionnel)"
                    value={newInteraction.next_action}
                    onChange={e => setNewInteraction(p => ({ ...p, next_action: e.target.value }))}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setShowNewInteraction(false)}>Annuler</Button>
                    <Button size="sm" onClick={handleAddInteraction} disabled={createInteraction.isPending}>
                      Ajouter
                    </Button>
                  </div>
                </div>
              )}

              {/* Interaction list */}
              {interactions.length === 0 && !showNewInteraction && (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune interaction enregistrée</p>
              )}
              {interactions.map(interaction => {
                const Icon = INTERACTION_ICONS[interaction.interaction_type] || MessageSquare;
                return (
                  <div key={interaction.id} className="flex gap-3 border-l-2 border-muted pl-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-xs">
                          {INTERACTION_LABELS[interaction.interaction_type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(interaction.interaction_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      </div>
                      {interaction.summary && (
                        <p className="text-sm whitespace-pre-wrap">{interaction.summary}</p>
                      )}
                      {interaction.next_action && (
                        <p className="text-xs text-primary mt-1">
                          → Prochaine action: {interaction.next_action}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

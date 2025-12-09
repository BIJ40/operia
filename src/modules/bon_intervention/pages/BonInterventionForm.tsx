/**
 * Formulaire Bon d'Intervention
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FileSignature, 
  ArrowLeft, 
  Plus, 
  Clock, 
  User, 
  MapPin, 
  Calendar,
  Save,
  PenTool,
  Wrench,
  Package
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useBonIntervention } from '../hooks/useBonIntervention';
import { TravailItem } from '../components/TravailItem';
import { MateriauItem } from '../components/MateriauItem';
import { PhotosSection } from '../components/PhotosSection';
import { TravailEffectue, MateriauUtilise, PhotoBI } from '../types';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/contexts/AuthContext';

export default function BonInterventionForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { interventionId } = useParams<{ interventionId: string }>();
  const { user } = useAuth();
  
  const { getOrCreateBI, updateFormData, calculateTempsPasse, bonIntervention } = useBonIntervention(
    interventionId ? Number(interventionId) : undefined
  );

  // Récupérer les données de navigation
  const navState = location.state as {
    intervention?: any;
    client?: string;
    adresse?: string;
    projectRef?: string;
    projectId?: number;
    technicien?: string;
    date?: string;
  } | null;

  // État du formulaire
  const [formData, setFormData] = useState({
    heureDepart: '',
    heureArrivee: '',
    heureFin: '',
    travaux: [] as TravailEffectue[],
    materiaux: [] as MateriauUtilise[],
    observations: '',
    recommandations: '',
    photos: [] as PhotoBI[],
  });

  const [isSaving, setIsSaving] = useState(false);

  // Initialiser ou charger le BI
  useEffect(() => {
    if (!interventionId || !navState) return;

    const bi = getOrCreateBI(
      Number(interventionId),
      navState.projectId || 0,
      navState.client || 'Client',
      navState.adresse || '',
      navState.projectRef || '',
      user?.id ? 0 : 0, // TODO: récupérer l'ID technicien Apogée
      navState.technicien || user?.email || 'Technicien',
      navState.date || new Date().toISOString()
    );

    // Charger les données existantes
    setFormData({
      heureDepart: bi.heureDepart || '',
      heureArrivee: bi.heureArrivee || '',
      heureFin: bi.heureFin || '',
      travaux: bi.travaux || [],
      materiaux: bi.materiaux || [],
      observations: bi.observations || '',
      recommandations: bi.recommandations || '',
      photos: bi.photos || [],
    });
  }, [interventionId, navState, getOrCreateBI, user]);

  // Calculer le temps passé
  const tempsPasse = calculateTempsPasse(formData.heureArrivee, formData.heureFin);
  const tempsPasseFormatted = tempsPasse > 0 
    ? `${Math.floor(tempsPasse / 60)}h${(tempsPasse % 60).toString().padStart(2, '0')}`
    : '--';

  // Handlers
  const handleAddTravail = () => {
    const newTravail: TravailEffectue = {
      id: `travail-${Date.now()}`,
      description: '',
    };
    setFormData((prev) => ({
      ...prev,
      travaux: [...prev.travaux, newTravail],
    }));
  };

  const handleUpdateTravail = (index: number, travail: TravailEffectue) => {
    setFormData((prev) => ({
      ...prev,
      travaux: prev.travaux.map((t, i) => (i === index ? travail : t)),
    }));
  };

  const handleRemoveTravail = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      travaux: prev.travaux.filter((_, i) => i !== index),
    }));
  };

  const handleAddMateriau = () => {
    const newMateriau: MateriauUtilise = {
      id: `materiau-${Date.now()}`,
      designation: '',
      quantite: 1,
      unite: 'u',
    };
    setFormData((prev) => ({
      ...prev,
      materiaux: [...prev.materiaux, newMateriau],
    }));
  };

  const handleUpdateMateriau = (index: number, materiau: MateriauUtilise) => {
    setFormData((prev) => ({
      ...prev,
      materiaux: prev.materiaux.map((m, i) => (i === index ? materiau : m)),
    }));
  };

  const handleRemoveMateriau = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      materiaux: prev.materiaux.filter((_, i) => i !== index),
    }));
  };

  const handleSave = useCallback(async () => {
    if (!bonIntervention) return;

    setIsSaving(true);
    try {
      updateFormData(bonIntervention.id, {
        ...formData,
        tempsPasse,
      });
      toast.success('Bon d\'intervention enregistré');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  }, [bonIntervention, formData, tempsPasse, updateFormData]);

  const handleGoToSignature = () => {
    if (!bonIntervention) return;

    // Sauvegarder avant d'aller à la signature
    updateFormData(bonIntervention.id, {
      ...formData,
      tempsPasse,
    });

    navigate(ROUTES.technicien.bonInterventionSignature.replace(':interventionId', interventionId!));
  };

  if (!navState && !bonIntervention) {
    return (
      <div className="container py-6">
        <Button variant="ghost" onClick={() => navigate(ROUTES.technicien.bonIntervention)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Card className="mt-4">
          <CardContent className="py-8 text-center text-muted-foreground">
            Intervention non trouvée
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.technicien.bonIntervention)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="p-2 rounded-lg bg-green-500/10">
          <FileSignature className="h-6 w-6 text-green-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Bon d'Intervention</h1>
          <p className="text-sm text-muted-foreground">
            {navState?.projectRef || bonIntervention?.refDossier}
          </p>
        </div>
      </div>

      {/* Infos client (lecture seule) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informations client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{navState?.client || bonIntervention?.clientNom}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{navState?.adresse || bonIntervention?.clientAdresse || '–'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {navState?.date
                ? format(parseISO(navState.date), 'EEEE d MMMM yyyy', { locale: fr })
                : bonIntervention?.dateIntervention
                ? format(parseISO(bonIntervention.dateIntervention), 'EEEE d MMMM yyyy', { locale: fr })
                : '–'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Heures */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horaires
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="heureDepart" className="text-xs">Départ agence</Label>
              <Input
                id="heureDepart"
                type="time"
                value={formData.heureDepart}
                onChange={(e) => setFormData((prev) => ({ ...prev, heureDepart: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="heureArrivee" className="text-xs">Arrivée chantier</Label>
              <Input
                id="heureArrivee"
                type="time"
                value={formData.heureArrivee}
                onChange={(e) => setFormData((prev) => ({ ...prev, heureArrivee: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="heureFin" className="text-xs">Fin intervention</Label>
              <Input
                id="heureFin"
                type="time"
                value={formData.heureFin}
                onChange={(e) => setFormData((prev) => ({ ...prev, heureFin: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Temps passé sur site :</span>
            <span className="font-bold text-lg">{tempsPasseFormatted}</span>
          </div>
        </CardContent>
      </Card>

      {/* Travaux effectués */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Travaux effectués
          </CardTitle>
          <CardDescription>Listez les travaux réalisés</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.travaux.map((travail, index) => (
            <TravailItem
              key={travail.id}
              travail={travail}
              onChange={(t) => handleUpdateTravail(index, t)}
              onRemove={() => handleRemoveTravail(index)}
            />
          ))}
          <Button type="button" variant="outline" onClick={handleAddTravail} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un travail
          </Button>
        </CardContent>
      </Card>

      {/* Matériaux utilisés */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Matériaux utilisés
          </CardTitle>
          <CardDescription>Listez les matériaux et fournitures</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.materiaux.map((materiau, index) => (
            <MateriauItem
              key={materiau.id}
              materiau={materiau}
              onChange={(m) => handleUpdateMateriau(index, m)}
              onRemove={() => handleRemoveMateriau(index)}
            />
          ))}
          <Button type="button" variant="outline" onClick={handleAddMateriau} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un matériau
          </Button>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Photos</CardTitle>
          <CardDescription>Ajoutez des photos de l'intervention</CardDescription>
        </CardHeader>
        <CardContent>
          <PhotosSection
            photos={formData.photos}
            onChange={(photos) => setFormData((prev) => ({ ...prev, photos }))}
          />
        </CardContent>
      </Card>

      {/* Observations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Observations & Recommandations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              placeholder="Observations sur l'intervention..."
              value={formData.observations}
              onChange={(e) => setFormData((prev) => ({ ...prev, observations: e.target.value }))}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="recommandations">Recommandations client</Label>
            <Textarea
              id="recommandations"
              placeholder="Recommandations pour le client..."
              value={formData.recommandations}
              onChange={(e) => setFormData((prev) => ({ ...prev, recommandations: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions fixes en bas */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg">
        <div className="container flex gap-3">
          <Button variant="outline" onClick={handleSave} disabled={isSaving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
          <Button onClick={handleGoToSignature} className="flex-1 bg-green-600 hover:bg-green-700">
            <PenTool className="h-4 w-4 mr-2" />
            Signature client
          </Button>
        </div>
      </div>
    </div>
  );
}

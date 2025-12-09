/**
 * Formulaire PV Apporteur
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ClipboardCheck, 
  ArrowLeft, 
  Plus, 
  Clock, 
  User, 
  MapPin, 
  Calendar,
  Save,
  PenTool,
  CheckSquare,
  AlertTriangle,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { usePvApporteur } from '../hooks/usePvApporteur';
import { ConstatItem } from '../components/ConstatItem';
import { ReserveItem } from '../components/ReserveItem';
import { PhotosPVSection } from '../components/PhotosPVSection';
import { ConstatRealise, ReserveFormule, PhotoPV } from '../types';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/contexts/AuthContext';

export default function PvApporteurForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dossierId } = useParams<{ dossierId: string }>();
  const { user } = useAuth();
  
  const { getOrCreatePV, updateFormData, pvApporteur } = usePvApporteur(
    dossierId ? Number(dossierId) : undefined
  );

  // Récupérer les données de navigation
  const navState = location.state as {
    dossierId?: number;
    projectId?: number;
    client?: string;
    adresse?: string;
    projectRef?: string;
    technicien?: string;
    date?: string;
    apporteur?: string;
  } | null;

  // État du formulaire
  const [formData, setFormData] = useState({
    dateReception: '',
    heureReception: '',
    constats: [] as ConstatRealise[],
    reserves: [] as ReserveFormule[],
    sansReserve: true,
    observations: '',
    conclusionGenerale: '',
    photos: [] as PhotoPV[],
  });

  const [isSaving, setIsSaving] = useState(false);

  // Initialiser ou charger le PV
  useEffect(() => {
    if (!dossierId || !navState) return;

    const pv = getOrCreatePV(
      Number(dossierId),
      navState.projectId || Number(dossierId),
      navState.client || 'Client',
      navState.adresse || '',
      navState.projectRef || '',
      user?.id ? 0 : 0,
      navState.technicien || user?.email || 'Représentant',
      navState.date || new Date().toISOString(),
      navState.apporteur,
      undefined
    );

    // Charger les données existantes
    setFormData({
      dateReception: pv.dateReception || navState.date?.split('T')[0] || '',
      heureReception: pv.heureReception || '',
      constats: pv.constats || [],
      reserves: pv.reserves || [],
      sansReserve: pv.sansReserve ?? true,
      observations: pv.observations || '',
      conclusionGenerale: pv.conclusionGenerale || '',
      photos: pv.photos || [],
    });
  }, [dossierId, navState, getOrCreatePV, user]);

  // Handlers Constats
  const handleAddConstat = () => {
    const newConstat: ConstatRealise = {
      id: `constat-${Date.now()}`,
      description: '',
      conforme: true,
    };
    setFormData((prev) => ({
      ...prev,
      constats: [...prev.constats, newConstat],
    }));
  };

  const handleUpdateConstat = (index: number, constat: ConstatRealise) => {
    setFormData((prev) => ({
      ...prev,
      constats: prev.constats.map((c, i) => (i === index ? constat : c)),
    }));
  };

  const handleRemoveConstat = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      constats: prev.constats.filter((_, i) => i !== index),
    }));
  };

  // Handlers Réserves
  const handleAddReserve = () => {
    const newReserve: ReserveFormule = {
      id: `reserve-${Date.now()}`,
      description: '',
      estLevee: false,
    };
    setFormData((prev) => ({
      ...prev,
      reserves: [...prev.reserves, newReserve],
      sansReserve: false,
    }));
  };

  const handleUpdateReserve = (index: number, reserve: ReserveFormule) => {
    setFormData((prev) => ({
      ...prev,
      reserves: prev.reserves.map((r, i) => (i === index ? reserve : r)),
    }));
  };

  const handleRemoveReserve = (index: number) => {
    setFormData((prev) => {
      const newReserves = prev.reserves.filter((_, i) => i !== index);
      return {
        ...prev,
        reserves: newReserves,
        sansReserve: newReserves.length === 0,
      };
    });
  };

  const handleSave = useCallback(async () => {
    if (!pvApporteur) return;

    setIsSaving(true);
    try {
      updateFormData(pvApporteur.id, formData);
      toast.success('PV enregistré');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  }, [pvApporteur, formData, updateFormData]);

  const handleGoToSignature = () => {
    if (!pvApporteur) return;

    // Sauvegarder avant d'aller à la signature
    updateFormData(pvApporteur.id, formData);

    navigate(`/technicien/pv-apporteur/${dossierId}/signature`);
  };

  if (!navState && !pvApporteur) {
    return (
      <div className="container py-6">
        <Button variant="ghost" onClick={() => navigate(ROUTES.technicien.pvApporteur)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Card className="mt-4">
          <CardContent className="py-8 text-center text-muted-foreground">
            Dossier non trouvé
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.technicien.pvApporteur)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="p-2 rounded-lg bg-blue-500/10">
          <ClipboardCheck className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">PV de Réception</h1>
          <p className="text-sm text-muted-foreground">
            {navState?.projectRef || pvApporteur?.refDossier}
          </p>
        </div>
      </div>

      {/* Infos dossier (lecture seule) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informations dossier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{navState?.client || pvApporteur?.clientNom}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{navState?.adresse || pvApporteur?.clientAdresse || '–'}</span>
          </div>
          {(navState?.apporteur || pvApporteur?.apporteurNom) && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{navState?.apporteur || pvApporteur?.apporteurNom}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {navState?.date
                ? format(parseISO(navState.date), 'EEEE d MMMM yyyy', { locale: fr })
                : pvApporteur?.dateReception
                ? format(parseISO(pvApporteur.dateReception), 'EEEE d MMMM yyyy', { locale: fr })
                : '–'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Date et heure de réception */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Réception
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dateReception" className="text-xs">Date de réception</Label>
              <Input
                id="dateReception"
                type="date"
                value={formData.dateReception}
                onChange={(e) => setFormData((prev) => ({ ...prev, dateReception: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="heureReception" className="text-xs">Heure</Label>
              <Input
                id="heureReception"
                type="time"
                value={formData.heureReception}
                onChange={(e) => setFormData((prev) => ({ ...prev, heureReception: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Constats réalisés */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Constats réalisés
          </CardTitle>
          <CardDescription>Points vérifiés lors de la réception</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.constats.map((constat, index) => (
            <ConstatItem
              key={constat.id}
              constat={constat}
              onChange={(c) => handleUpdateConstat(index, c)}
              onRemove={() => handleRemoveConstat(index)}
            />
          ))}
          <Button type="button" variant="outline" onClick={handleAddConstat} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un constat
          </Button>
        </CardContent>
      </Card>

      {/* Réserves */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Réserves
              </CardTitle>
              <CardDescription>Points à corriger ou compléter</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="sansReserve" className="text-sm">Sans réserve</Label>
              <Switch
                id="sansReserve"
                checked={formData.sansReserve}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData((prev) => ({ ...prev, sansReserve: true, reserves: [] }));
                  } else {
                    setFormData((prev) => ({ ...prev, sansReserve: false }));
                  }
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!formData.sansReserve && (
            <>
              {formData.reserves.map((reserve, index) => (
                <ReserveItem
                  key={reserve.id}
                  reserve={reserve}
                  onChange={(r) => handleUpdateReserve(index, r)}
                  onRemove={() => handleRemoveReserve(index)}
                />
              ))}
              <Button type="button" variant="outline" onClick={handleAddReserve} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une réserve
              </Button>
            </>
          )}
          {formData.sansReserve && (
            <div className="text-center py-4 text-green-600 bg-green-50 rounded-lg dark:bg-green-950/20">
              <CheckSquare className="h-6 w-6 mx-auto mb-2" />
              <p className="font-medium">Réception sans réserve</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Photos</CardTitle>
          <CardDescription>Photos de la réception</CardDescription>
        </CardHeader>
        <CardContent>
          <PhotosPVSection
            photos={formData.photos}
            onChange={(photos) => setFormData((prev) => ({ ...prev, photos }))}
          />
        </CardContent>
      </Card>

      {/* Observations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Observations & Conclusion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              placeholder="Observations sur la réception..."
              value={formData.observations}
              onChange={(e) => setFormData((prev) => ({ ...prev, observations: e.target.value }))}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="conclusionGenerale">Conclusion générale</Label>
            <Textarea
              id="conclusionGenerale"
              placeholder="Conclusion du PV de réception..."
              value={formData.conclusionGenerale}
              onChange={(e) => setFormData((prev) => ({ ...prev, conclusionGenerale: e.target.value }))}
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
          <Button onClick={handleGoToSignature} className="flex-1 bg-blue-600 hover:bg-blue-700">
            <PenTool className="h-4 w-4 mr-2" />
            Signature
          </Button>
        </div>
      </div>
    </div>
  );
}

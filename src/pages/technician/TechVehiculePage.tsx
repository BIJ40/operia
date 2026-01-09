/**
 * Page Mon Véhicule - Infos véhicule du technicien
 */
import { useState } from 'react';
import { format, parseISO, differenceInDays, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  Car,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Send,
  Calendar,
  Fuel,
  Gauge,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMyVehicle } from '@/hooks/rh-employee/useMyVehicle';
import { useCreateRequest } from '@/hooks/rh-employee/useMyRequests';
import { toast } from 'sonner';

export default function TechVehiculePage() {
  const { data: vehicle, isLoading } = useMyVehicle();
  const { mutate: createRequest, isPending: isCreatingRequest } = useCreateRequest();
  const [modalType, setModalType] = useState<'anomaly' | 'request' | null>(null);
  const [requestCategory, setRequestCategory] = useState('');
  const [requestMessage, setRequestMessage] = useState('');

  const handleSubmitRequest = () => {
    if (!requestMessage.trim()) {
      toast.error("Veuillez saisir un message");
      return;
    }
    const isAnomaly = modalType === 'anomaly';
    const title = isAnomaly
      ? `Signalement véhicule: ${requestCategory || 'Anomalie'}`
      : `Demande véhicule: ${requestCategory || 'Autre'}`;
    const description = `Véhicule: ${vehicle?.registration || 'N/A'} - ${vehicle?.brand || ''} ${vehicle?.model || ''}\n\n${requestMessage}`;

    createRequest(
      {
        request_type: 'OTHER',
        payload: {
          title,
          description,
          vehicle_id: vehicle?.id,
          vehicle_registration: vehicle?.registration,
          category: requestCategory,
          is_anomaly: isAnomaly,
          is_vehicle_request: true,
        },
      },
      {
        onSuccess: () => {
          toast.success(isAnomaly ? "Signalement envoyé" : "Demande envoyée");
          setModalType(null);
          setRequestCategory('');
          setRequestMessage('');
        },
        onError: () => toast.error("Erreur lors de l'envoi"),
      }
    );
  };

  const DateBadge = ({ date }: { date: string | null }) => {
    if (!date) return <span className="text-xs text-muted-foreground">-</span>;
    const parsedDate = parseISO(date);
    const daysUntil = differenceInDays(parsedDate, new Date());
    const isOverdue = isBefore(parsedDate, new Date());
    let variant: 'default' | 'destructive' | 'secondary' = 'default';
    if (isOverdue || daysUntil <= 30) variant = 'destructive';
    else if (daysUntil <= 90) variant = 'secondary';
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs">{format(parsedDate, 'dd/MM/yy', { locale: fr })}</span>
        <Badge variant={variant} className="text-[10px] px-1 py-0">
          {isOverdue ? '!' : daysUntil <= 30 ? `${daysUntil}j` : 'OK'}
        </Badge>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header avec retour */}
      <div className="flex items-center gap-3">
        <Link to="/t/rh-parc">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold">Mon véhicule</h1>
          <p className="text-xs text-muted-foreground">Infos & échéances</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !vehicle ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Car className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-sm">Aucun véhicule assigné</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-destructive border-destructive"
              onClick={() => setModalType('anomaly')}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Signaler
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setModalType('request')}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Demande
            </Button>
          </div>

          {/* Info véhicule */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Immat.</span>
                <span className="font-mono font-medium">{vehicle.registration}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Véhicule</span>
                <span className="text-sm">
                  {vehicle.brand} {vehicle.model}
                </span>
              </div>
              {vehicle.mileage_km && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Gauge className="h-3 w-3" />
                    Km
                  </span>
                  <span className="text-sm">{vehicle.mileage_km.toLocaleString('fr-FR')}</span>
                </div>
              )}
              {vehicle.fuel_type && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Fuel className="h-3 w-3" />
                    Carburant
                  </span>
                  <span className="text-sm">{vehicle.fuel_type}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Échéances */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Échéances
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CT</span>
                <DateBadge date={vehicle.ct_due_at} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Révision</span>
                <DateBadge date={vehicle.next_revision_at} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalType !== null} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent className="max-w-[95vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>{modalType === 'anomaly' ? 'Signaler une anomalie' : 'Faire une demande'}</DialogTitle>
            <DialogDescription>
              {modalType === 'anomaly' ? 'Décrivez le problème' : 'Décrivez votre demande'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={requestCategory} onValueChange={setRequestCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                {modalType === 'anomaly' ? (
                  <>
                    <SelectItem value="panne">Panne</SelectItem>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="voyant">Voyant</SelectItem>
                    <SelectItem value="bruit">Bruit</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="entretien">Entretien</SelectItem>
                    <SelectItem value="nettoyage">Nettoyage</SelectItem>
                    <SelectItem value="accessoire">Accessoire</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Description..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalType(null)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitRequest} disabled={isCreatingRequest || !requestMessage.trim()}>
              <Send className="h-4 w-4 mr-1" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

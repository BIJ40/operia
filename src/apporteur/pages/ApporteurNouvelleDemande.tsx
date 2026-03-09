/**
 * ApporteurNouvelleDemande - Formulaire de création de demande d'intervention
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useApporteurSession } from '@/apporteur/contexts/ApporteurSessionContext';
import { useApporteurApi } from '@/apporteur/hooks/useApporteurApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { PlusCircle, Loader2, ArrowLeft, Home, User, Phone, Mail, MapPin, FileText, AlertTriangle } from 'lucide-react';

const REQUEST_TYPES = [
  { value: 'depannage', label: 'Dépannage urgent' },
  { value: 'travaux', label: 'Travaux' },
  { value: 'diagnostic', label: 'Diagnostic / Devis' },
  { value: 'autre', label: 'Autre' },
];

export default function ApporteurNouvelleDemande() {
  const { session, isAuthenticated, isLoading: isApporteurLoading, apporteurId, agencyId } = useApporteurSession();
  const { post } = useApporteurApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Form state - must be before any conditional returns (React hooks rules)
  const [formData, setFormData] = useState({
    requestType: '',
    urgency: 'normal',
    tenantLastName: '',
    tenantFirstName: '',
    tenantPhone: '',
    tenantEmail: '',
    ownerName: '',
    address: '',
    postalCode: '',
    city: '',
    description: '',
    availability: '',
    comments: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !session || !apporteurId || !agencyId) {
      toast.error('Erreur de session. Veuillez vous reconnecter.');
      return;
    }

    if (!formData.requestType || !formData.tenantLastName || !formData.tenantFirstName || !formData.address || !formData.description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const result = await post<{ success: boolean; id: string }>('/create-apporteur-request', {
        request_type: formData.requestType,
        urgency: formData.urgency,
        tenant_name: `${formData.tenantFirstName} ${formData.tenantLastName}`.trim(),
        tenant_phone: formData.tenantPhone || null,
        tenant_email: formData.tenantEmail || null,
        owner_name: formData.ownerName || null,
        address: formData.address,
        postal_code: formData.postalCode || null,
        city: formData.city || null,
        description: formData.description,
        availability: formData.availability || null,
        comments: formData.comments || null,
      });

      if (result.error) throw new Error(result.error);

      await queryClient.invalidateQueries({ queryKey: ['apporteur-demandes'] });
      
      toast.success('Demande envoyée avec succès');
      navigate('/apporteur/demandes');
    } catch (err) {
      console.error('Error creating request:', err);
      toast.error('Erreur lors de la création de la demande');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while context loads
  if (isApporteurLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show not authorized if not an apporteur user
  if (!isAuthenticated || !session) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Accès non autorisé
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Votre compte n'est pas configuré comme utilisateur apporteur. Veuillez contacter l'administrateur.
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/apporteur')}>
                  Retour
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-primary" />
            Nouvelle demande
          </h1>
          <p className="text-muted-foreground">
            Créer une demande d'intervention
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Type & Urgence */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Type de demande
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requestType">Type *</Label>
                <Select value={formData.requestType} onValueChange={(v) => handleChange('requestType', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="urgency">Urgence</Label>
                <Select value={formData.urgency} onValueChange={(v) => handleChange('urgency', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[hsl(var(--ap-danger))]" />
                        Urgent
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact locataire */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Contact locataire / occupant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenantLastName">Nom *</Label>
                <Input
                  id="tenantLastName"
                  value={formData.tenantLastName}
                  onChange={(e) => handleChange('tenantLastName', e.target.value)}
                  placeholder="Dupont"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantFirstName">Prénom *</Label>
                <Input
                  id="tenantFirstName"
                  value={formData.tenantFirstName}
                  onChange={(e) => handleChange('tenantFirstName', e.target.value)}
                  placeholder="Jean"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenantPhone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="tenantPhone"
                    type="tel"
                    value={formData.tenantPhone}
                    onChange={(e) => handleChange('tenantPhone', e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="tenantEmail"
                    type="email"
                    value={formData.tenantEmail}
                    onChange={(e) => handleChange('tenantEmail', e.target.value)}
                    placeholder="email@exemple.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerName">Nom du propriétaire (si différent)</Label>
              <Input
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) => handleChange('ownerName', e.target.value)}
                placeholder="Propriétaire"
              />
            </div>
          </CardContent>
        </Card>

        {/* Adresse */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Adresse d'intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Adresse *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="123 rue de la Paix"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Code postal</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                  placeholder="75001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Paris"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="w-4 h-4" />
              Description du problème
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description détaillée *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Décrivez le problème rencontré..."
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availability">Disponibilités du locataire</Label>
              <Input
                id="availability"
                value={formData.availability}
                onChange={(e) => handleChange('availability', e.target.value)}
                placeholder="Ex: Tous les matins, Lundi et Mercredi après-midi..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comments">Commentaires additionnels</Label>
              <Textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => handleChange('comments', e.target.value)}
                placeholder="Informations complémentaires..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                Envoyer la demande
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

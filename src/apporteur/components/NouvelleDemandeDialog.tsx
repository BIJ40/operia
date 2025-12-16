/**
 * NouvelleDemandeDialog - Dialog pour créer une demande d'intervention
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApporteurAuth } from '@/contexts/ApporteurAuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, User, Phone, Mail, MapPin, FileText, AlertTriangle, Home } from 'lucide-react';

const REQUEST_TYPES = [
  { value: 'depannage', label: 'Dépannage urgent' },
  { value: 'travaux', label: 'Travaux' },
  { value: 'diagnostic', label: 'Diagnostic / Devis' },
  { value: 'autre', label: 'Autre' },
];

interface NouvelleDemandeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NouvelleDemandeDialog({ open, onOpenChange }: NouvelleDemandeDialogProps) {
  const { apporteurUser, apporteurId, agencyId } = useApporteurAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    requestType: '',
    urgency: 'normal',
    tenantName: '',
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

  const resetForm = () => {
    setFormData({
      requestType: '',
      urgency: 'normal',
      tenantName: '',
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
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apporteurUser || !apporteurId || !agencyId) {
      toast.error('Erreur de session. Veuillez vous reconnecter.');
      return;
    }

    if (!formData.requestType || !formData.tenantName || !formData.address || !formData.description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('apporteur_intervention_requests')
        .insert({
          agency_id: agencyId,
          apporteur_id: apporteurId,
          apporteur_user_id: apporteurUser.id,
          request_type: formData.requestType,
          urgency: formData.urgency,
          tenant_name: formData.tenantName,
          tenant_phone: formData.tenantPhone || null,
          tenant_email: formData.tenantEmail || null,
          owner_name: formData.ownerName || null,
          address: formData.address,
          postal_code: formData.postalCode || null,
          city: formData.city || null,
          description: formData.description,
          availability: formData.availability || null,
          comments: formData.comments || null,
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;

      if (data?.id) {
        supabase.functions.invoke('notify-apporteur-request', {
          body: { request_id: data.id }
        }).catch(err => console.warn('Email notification failed:', err));
      }

      await queryClient.invalidateQueries({ queryKey: ['apporteur-demandes'] });
      
      toast.success('Demande envoyée avec succès');
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error('Error creating request:', err);
      toast.error('Erreur lors de la création de la demande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Nouvelle demande d'intervention
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type & Urgence */}
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Type de demande
            </p>
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
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        Urgent
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact locataire */}
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Contact locataire / occupant
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="tenantName">Nom Prénom *</Label>
                <Input
                  id="tenantName"
                  value={formData.tenantName}
                  onChange={(e) => handleChange('tenantName', e.target.value)}
                  placeholder="Jean Dupont"
                  required
                />
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
            </div>
          </div>

          {/* Adresse */}
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Adresse d'intervention
            </p>
            <div className="space-y-3">
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
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Home className="w-4 h-4" />
              Description du problème
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="description">Description détaillée *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Décrivez le problème rencontré..."
                  rows={3}
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
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Envoyer la demande'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Contact, Plus, MoreVertical, Star, Pencil, Trash2, Phone, Mail, Loader2 } from 'lucide-react';
import {
  useApporteurContacts,
  useCreateApporteurContact,
  useUpdateApporteurContact,
  useDeleteApporteurContact,
  useSetPrimaryContact,
  ApporteurContact,
} from '@/hooks/useApporteurContacts';

interface ApporteurContactsSectionProps {
  apporteurId: string;
  agencyId: string;
}

interface ContactFormData {
  first_name: string;
  last_name: string;
  fonction: string;
  phone: string;
  mobile: string;
  email: string;
  notes: string;
}

const emptyForm: ContactFormData = {
  first_name: '',
  last_name: '',
  fonction: '',
  phone: '',
  mobile: '',
  email: '',
  notes: '',
};

export function ApporteurContactsSection({ apporteurId, agencyId }: ApporteurContactsSectionProps) {
  const { data: contacts, isLoading } = useApporteurContacts(apporteurId);
  const createContact = useCreateApporteurContact();
  const updateContact = useUpdateApporteurContact();
  const deleteContact = useDeleteApporteurContact();
  const setPrimary = useSetPrimaryContact();

  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<ApporteurContact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);

  const openCreateDialog = () => {
    setEditingContact(null);
    setFormData(emptyForm);
    setShowDialog(true);
  };

  const openEditDialog = (contact: ApporteurContact) => {
    setEditingContact(contact);
    setFormData({
      first_name: contact.first_name,
      last_name: contact.last_name,
      fonction: contact.fonction || '',
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      email: contact.email || '',
      notes: contact.notes || '',
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) return;

    if (editingContact) {
      await updateContact.mutateAsync({
        id: editingContact.id,
        apporteurId,
        data: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          fonction: formData.fonction || null,
          phone: formData.phone || null,
          mobile: formData.mobile || null,
          email: formData.email || null,
          notes: formData.notes || null,
        },
      });
    } else {
      await createContact.mutateAsync({
        apporteur_id: apporteurId,
        agency_id: agencyId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        fonction: formData.fonction || undefined,
        phone: formData.phone || undefined,
        mobile: formData.mobile || undefined,
        email: formData.email || undefined,
        notes: formData.notes || undefined,
        is_primary: !contacts?.length, // First contact is primary
      });
    }

    setShowDialog(false);
    setFormData(emptyForm);
    setEditingContact(null);
  };

  const handleDelete = async (contact: ApporteurContact) => {
    if (confirm(`Supprimer le contact ${contact.first_name} ${contact.last_name} ?`)) {
      await deleteContact.mutateAsync({ id: contact.id, apporteurId });
    }
  };

  const handleSetPrimary = async (contact: ApporteurContact) => {
    await setPrimary.mutateAsync({ id: contact.id, apporteurId });
  };

  const isSubmitting = createContact.isPending || updateContact.isPending;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Contact className="h-4 w-4" />
              Contacts ({contacts?.length || 0})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : contacts && contacts.length > 0 ? (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-start justify-between p-3 rounded-md bg-muted/50 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">
                      {contact.first_name} {contact.last_name}
                    </p>
                    {contact.is_primary && (
                      <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">
                        <Star className="h-3 w-3 mr-1" />
                        Principal
                      </Badge>
                    )}
                  </div>
                  {contact.fonction && (
                    <p className="text-xs text-muted-foreground">{contact.fonction}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-1">
                    {contact.phone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                    )}
                    {contact.mobile && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.mobile}
                      </span>
                    )}
                    {contact.email && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </span>
                    )}
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    {!contact.is_primary && (
                      <DropdownMenuItem onClick={() => handleSetPrimary(contact)}>
                        <Star className="h-4 w-4 mr-2" />
                        Définir comme principal
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleDelete(contact)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun contact
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de création/édition */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Modifier le contact' : 'Nouveau contact'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prénom *</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Fonction</Label>
              <Input
                value={formData.fonction}
                onChange={(e) => setFormData({ ...formData, fonction: e.target.value })}
                placeholder="Ex: Gestionnaire, Comptable..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Téléphone fixe</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Mobile</Label>
                <Input
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informations complémentaires..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.first_name.trim() || !formData.last_name.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingContact ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

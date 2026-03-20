import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, Unlock, Save, User } from 'lucide-react';
import { useSignatureProfile, useUpsertSignatureProfile } from '@/hooks/useSignature';

interface Props { onComplete: () => void; }

export function SignatureProfileForm({ onComplete }: Props) {
  const { data: profile, isLoading } = useSignatureProfile();
  const upsert = useUpsertSignatureProfile();
  const [form, setForm] = useState({
    first_name: '', last_name: '', job_title: 'Directeur / Directrice',
    agency_name: '', phone: '', email: '', website: '', logo_url: '',
  });
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || '', last_name: profile.last_name || '',
        job_title: profile.job_title || 'Directeur / Directrice', agency_name: profile.agency_name || '',
        phone: profile.phone || '', email: profile.email || '',
        website: profile.website || '', logo_url: profile.logo_url || '',
      });
      setIsEditing(!profile.validated);
    }
  }, [profile]);

  const handleSave = async (validate = false) => {
    await upsert.mutateAsync({
      ...form, validated: validate,
      validated_at: validate ? new Date().toISOString() : undefined,
    } as any);
    if (validate) { setIsEditing(false); onComplete(); }
  };

  const isLocked = profile?.validated && !isEditing;
  if (isLoading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement…</div>;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
          <div><CardTitle className="text-lg">Profil Signature</CardTitle><CardDescription>Vos informations de contact pour la signature email</CardDescription></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLocked && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
            <Lock className="w-4 h-4" /><span>Profil validé et verrouillé.</span>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="ml-auto"><Unlock className="w-3.5 h-3.5 mr-1" /> Modifier</Button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Prénom</Label><Input value={form.first_name} disabled={isLocked} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Jean" /></div>
          <div className="space-y-1.5"><Label>Nom</Label><Input value={form.last_name} disabled={isLocked} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Dupont" /></div>
        </div>
        <div className="space-y-1.5"><Label>Fonction</Label><Input value={form.job_title} disabled={isLocked} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label>Agence</Label><Input value={form.agency_name} disabled={isLocked} onChange={e => setForm(f => ({ ...f, agency_name: e.target.value }))} placeholder="HelpConfort Landes" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Téléphone</Label><Input value={form.phone} disabled={isLocked} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="06 12 34 56 78" /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} disabled={isLocked} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jean@helpconfort.fr" /></div>
        </div>
        <div className="space-y-1.5"><Label>Site web</Label><Input value={form.website} disabled={isLocked} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://www.helpconfort.fr" /></div>
        <div className="space-y-1.5"><Label>URL du logo</Label><Input value={form.logo_url} disabled={isLocked} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." /></div>
        {!isLocked && (
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={upsert.isPending}><Save className="w-4 h-4 mr-1.5" /> Enregistrer brouillon</Button>
            <Button onClick={() => handleSave(true)} disabled={upsert.isPending || !form.first_name || !form.last_name || !form.agency_name || !form.phone || !form.email}>
              <Lock className="w-4 h-4 mr-1.5" /> Valider définitivement
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

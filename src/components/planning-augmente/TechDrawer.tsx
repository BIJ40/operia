/**
 * TechDrawer - Drawer pour éditer profil + compétences d'un technicien
 * Réutilisable dans Planif IA et Salariés
 */
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2, Plus, Trash2, Star } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTechnicianSkills,
  useTechnicianProfile,
  useUniversCatalog,
  useUpsertTechSkill,
  useDeleteTechSkill,
  useUpsertTechProfile,
  type TechSkill,
  type TechnicianProfileData,
} from '@/hooks/usePlanningAugmente';

interface TechDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorId: string | undefined;
  techName: string;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Lun', tue: 'Mar', wed: 'Mer', thu: 'Jeu', fri: 'Ven', sat: 'Sam', sun: 'Dim',
};

export function TechDrawer({ open, onOpenChange, collaboratorId, techName }: TechDrawerProps) {
  const qc = useQueryClient();
  const { data: skills, isLoading: skillsLoading } = useTechnicianSkills(collaboratorId);
  const { data: profile, isLoading: profileLoading } = useTechnicianProfile(collaboratorId);
  const { data: catalog } = useUniversCatalog();
  const upsertSkill = useUpsertTechSkill();
  const deleteSkill = useDeleteTechSkill();
  const upsertProfile = useUpsertTechProfile();

  const [newCode, setNewCode] = useState('');

  if (!collaboratorId) return null;

  const existingCodes = new Set((skills || []).map(s => s.univers_code));
  const availableCodes = (catalog || []).filter(c => !existingCodes.has(c.code));

  const handleAddSkill = async () => {
    if (!newCode || !collaboratorId) return;
    await upsertSkill.mutateAsync({ collaborator_id: collaboratorId, univers_code: newCode, level: 3, is_primary: false });
    qc.invalidateQueries({ queryKey: ['technician-skills', collaboratorId] });
    setNewCode('');
  };

  const handleDeleteSkill = async (code: string) => {
    if (!collaboratorId) return;
    await deleteSkill.mutateAsync({ collaboratorId, universCode: code });
    qc.invalidateQueries({ queryKey: ['technician-skills', collaboratorId] });
  };

  const handleUpdateSkill = async (skill: TechSkill, updates: Partial<TechSkill>) => {
    await upsertSkill.mutateAsync({
      collaborator_id: skill.collaborator_id,
      univers_code: skill.univers_code,
      level: updates.level ?? skill.level,
      is_primary: updates.is_primary ?? skill.is_primary,
    });
    qc.invalidateQueries({ queryKey: ['technician-skills', collaboratorId] });
  };

  const handleProfileUpdate = async (updates: Partial<TechnicianProfileData>) => {
    if (!collaboratorId) return;
    await upsertProfile.mutateAsync({ collaborator_id: collaboratorId, ...updates });
    qc.invalidateQueries({ queryKey: ['technician-profile', collaboratorId] });
  };

  const workDays = profile?.work_days ?? { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[480px]">
        <SheetHeader>
          <SheetTitle>{techName}</SheetTitle>
          <SheetDescription>Profil technique et compétences</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="competences" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="competences" className="flex-1 text-xs">Compétences</TabsTrigger>
            <TabsTrigger value="profil" className="flex-1 text-xs">Profil / Amplitude</TabsTrigger>
          </TabsList>

          {/* Compétences Tab */}
          <TabsContent value="competences" className="space-y-4 mt-3">
            {skillsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {(skills || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucune compétence définie</p>
                )}
                <div className="space-y-2">
                  {(skills || []).map(skill => {
                    const catItem = (catalog || []).find(c => c.code === skill.univers_code);
                    return (
                      <div key={skill.univers_code} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{catItem?.label || skill.univers_code}</span>
                            {skill.is_primary && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">Niveau</span>
                            <Slider
                              value={[skill.level]}
                              min={1} max={5} step={1}
                              onValueChange={([v]) => handleUpdateSkill(skill, { level: v })}
                              className="w-24"
                            />
                            <Badge variant="outline" className="text-[10px] px-1">{skill.level}/5</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => handleUpdateSkill(skill, { is_primary: !skill.is_primary })}
                            title={skill.is_primary ? 'Retirer primaire' : 'Marquer primaire'}
                          >
                            <Star className={`w-3.5 h-3.5 ${skill.is_primary ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => handleDeleteSkill(skill.univers_code)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add skill */}
                {availableCodes.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Select value={newCode} onValueChange={setNewCode}>
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Ajouter une compétence..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCodes.map(c => (
                          <SelectItem key={c.code} value={c.code} className="text-xs">{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleAddSkill} disabled={!newCode || upsertSkill.isPending}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profil" className="space-y-4 mt-3">
            {profileLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {/* Work days */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Jours travaillés</Label>
                  <div className="flex gap-1.5">
                    {Object.entries(DAY_LABELS).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => handleProfileUpdate({ work_days: { ...workDays, [key]: !workDays[key] } })}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          workDays[key]
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amplitude */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Début journée</Label>
                    <Input
                      type="time" className="h-8 text-xs"
                      defaultValue={profile?.day_start || '08:00'}
                      onBlur={(e) => handleProfileUpdate({ day_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fin journée</Label>
                    <Input
                      type="time" className="h-8 text-xs"
                      defaultValue={profile?.day_end || '17:30'}
                      onBlur={(e) => handleProfileUpdate({ day_end: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Début pause</Label>
                    <Input
                      type="time" className="h-8 text-xs"
                      defaultValue={profile?.lunch_start || '12:00'}
                      onBlur={(e) => handleProfileUpdate({ lunch_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fin pause</Label>
                    <Input
                      type="time" className="h-8 text-xs"
                      defaultValue={profile?.lunch_end || '13:30'}
                      onBlur={(e) => handleProfileUpdate({ lunch_end: e.target.value })}
                    />
                  </div>
                </div>

                {/* Base */}
                <div>
                  <Label className="text-xs text-muted-foreground">Base / Dépôt</Label>
                  <Input
                    className="h-8 text-xs"
                    defaultValue={profile?.home_base_label || 'Agence'}
                    onBlur={(e) => handleProfileUpdate({ home_base_label: e.target.value })}
                    placeholder="Ex: Agence Dax"
                  />
                </div>

                {/* Max drive */}
                <div>
                  <Label className="text-xs text-muted-foreground">Temps de route max/jour (min)</Label>
                  <Input
                    type="number" className="h-8 text-xs"
                    defaultValue={profile?.max_drive_minutes_per_day || 120}
                    onBlur={(e) => handleProfileUpdate({ max_drive_minutes_per_day: parseInt(e.target.value) || 120 })}
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

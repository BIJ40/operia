import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Save, Copy, Trash2, Wand2, MapPin, Sun, CalendarHeart, Building2, Paintbrush, Type } from 'lucide-react';
import type { SignatureConfig } from '@/hooks/useSignature';
import { cn } from '@/lib/utils';

const REGIONS = [
  { value: 'landes', label: 'Landes', icon: '🌊' },
  { value: 'pyrenees', label: 'Pyrénées', icon: '🏔️' },
  { value: 'paris', label: 'Paris / IDF', icon: '🗼' },
  { value: 'cote_basque', label: 'Côte Basque', icon: '🏖️' },
  { value: 'default', label: 'Standard', icon: '🏢' },
];

const SEASONS = [
  { value: 'auto', label: 'Auto', icon: '🔄' },
  { value: 'spring', label: 'Printemps', icon: '🌸' },
  { value: 'summer', label: 'Été', icon: '☀️' },
  { value: 'autumn', label: 'Automne', icon: '🍂' },
  { value: 'winter', label: 'Hiver', icon: '❄️' },
];

const EVENTS = [
  { value: 'noel', label: 'Noël', icon: '🎄' },
  { value: 'halloween', label: 'Halloween', icon: '🎃' },
  { value: 'saint_valentin', label: 'St Valentin', icon: '❤️' },
  { value: 'rentree', label: 'Rentrée', icon: '📐' },
];

const STATUSES = [
  { value: 'ouvert', label: 'Ouvert', color: 'bg-green-500' },
  { value: 'ferme', label: 'Fermé', color: 'bg-red-500' },
  { value: 'urgence', label: 'Urgence', color: 'bg-orange-500' },
  { value: 'dispo', label: 'Disponible', color: 'bg-blue-500' },
];

const STYLES = [
  { value: 'corporate', label: 'Corporate', desc: 'Clean & premium' },
  { value: 'futur', label: 'Futuriste', desc: 'Néon & glow' },
  { value: 'dessin', label: 'Dessin', desc: 'Contours & texture' },
  { value: 'peinture', label: 'Peinture', desc: 'Brush effect' },
  { value: 'minimal', label: 'Minimal', desc: 'Flat design' },
];

const TYPOS = [
  { value: 'corporate', label: 'Corporate', preview: 'Inter + Playfair' },
  { value: 'futur', label: 'Futuriste', preview: 'Orbitron' },
  { value: 'dessin', label: 'Manuscrit', preview: 'Caveat' },
  { value: 'premium', label: 'Premium', preview: 'Cinzel' },
  { value: 'minimal', label: 'Minimal', preview: 'Inter' },
];

interface Props {
  config: SignatureConfig;
  onChange: (updates: Partial<SignatureConfig>) => void;
  onSave: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isSaving: boolean;
}

export function SignatureControls({ config, onChange, onSave, onDuplicate, onDelete, isSaving }: Props) {
  const handleColorChange = useCallback((key: string, value: string) => {
    onChange({ color_palette: { ...config.color_palette, [key]: value } });
  }, [config.color_palette, onChange]);

  return (
    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
      <Card className="border-border/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Input value={config.name} onChange={e => onChange({ name: e.target.value })}
              className="font-semibold text-base border-none shadow-none px-0 h-8 focus-visible:ring-0" placeholder="Nom de la configuration" />
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={onSave} disabled={isSaving} className="h-8 w-8"><Save className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={onDuplicate} className="h-8 w-8"><Copy className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><Wand2 className="w-4 h-4 text-primary" /><span className="text-sm font-medium">Mode automatique</span></div>
          <Switch checked={config.auto_mode} onCheckedChange={v => onChange({ auto_mode: v })} />
        </CardContent>
      </Card>

      <Section icon={<MapPin className="w-4 h-4" />} title="Région">
        <div className="grid grid-cols-3 gap-2">
          {REGIONS.map(r => (
            <button key={r.value} onClick={() => onChange({ region: r.value })}
              className={cn("flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all",
                config.region === r.value ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-primary/30")}>
              <span className="text-lg">{r.icon}</span><span className="font-medium">{r.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section icon={<Sun className="w-4 h-4" />} title="Saison">
        <div className="flex flex-wrap gap-2">
          {SEASONS.map(s => (
            <button key={s.value} onClick={() => onChange({ season: s.value })} disabled={config.auto_mode}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                config.season === s.value ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30",
                config.auto_mode && "opacity-50 cursor-not-allowed")}>
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={<CalendarHeart className="w-4 h-4" />} title="Événement">
        <div className="flex flex-wrap gap-2">
          {EVENTS.map(e => (
            <button key={e.value} onClick={() => onChange({ temporal_event: config.temporal_event === e.value ? null : e.value })}
              disabled={config.auto_mode}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                config.temporal_event === e.value ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30",
                config.auto_mode && "opacity-50 cursor-not-allowed")}>
              <span>{e.icon}</span> {e.label}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={<Building2 className="w-4 h-4" />} title="Statut agence">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => onChange({ agency_status: s.value })}
              className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                config.agency_status === s.value ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30")}>
              <span className={cn("w-2 h-2 rounded-full", s.color)} />{s.label}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={<Paintbrush className="w-4 h-4" />} title="Style">
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map(s => (
            <button key={s.value} onClick={() => onChange({ style: s.value })}
              className={cn("p-3 rounded-xl border text-left transition-all",
                config.style === s.value ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-primary/30")}>
              <p className="text-xs font-semibold">{s.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
            </button>
          ))}
        </div>
      </Section>

      <Section icon={<Type className="w-4 h-4" />} title="Typographie">
        <Select value={config.typography} onValueChange={v => onChange({ typography: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPOS.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label} — <span className="text-muted-foreground">{t.preview}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      <Section icon={<Paintbrush className="w-4 h-4" />} title="Couleurs">
        <div className="grid grid-cols-2 gap-3">
          {(['primary', 'accent', 'text', 'bg'] as const).map(key => (
            <div key={key} className="flex items-center gap-2">
              <input type="color" value={config.color_palette?.[key] || '#1B3A5C'}
                onChange={e => handleColorChange(key, e.target.value)}
                className="w-8 h-8 rounded-lg border border-border/50 cursor-pointer" />
              <span className="text-xs capitalize text-muted-foreground">
                {key === 'bg' ? 'Fond' : key === 'text' ? 'Texte' : key === 'accent' ? 'Accent' : 'Principal'}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">{children}</CardContent>
    </Card>
  );
}

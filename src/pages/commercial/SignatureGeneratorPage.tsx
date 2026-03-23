import { useState, useMemo, useRef, useCallback } from 'react';
import { PenLine, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { SignatureProfileForm } from '@/components/commercial/signature/SignatureProfileForm';
import { SignatureControls } from '@/components/commercial/signature/SignatureControls';
import { SignatureCanvas } from '@/components/commercial/signature/SignatureCanvas';
import { SignatureExport } from '@/components/commercial/signature/SignatureExport';
import { SignatureConfigCard } from '@/components/commercial/signature/SignatureConfigCard';
import { generateSignaturePayload } from '@/components/commercial/signature/signatureEngine';
import {
  useSignatureProfile, useSignatureConfigs, useUpsertSignatureConfig,
  useDeleteSignatureConfig, type SignatureConfig, type SignatureProfile,
} from '@/hooks/useSignature';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_CONFIG: Omit<SignatureConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  name: 'Ma signature', region: 'default', season: 'auto', temporal_event: null,
  agency_status: 'ouvert', theme: 'premium', style: 'corporate', typography: 'corporate',
  color_palette: { primary: '#1B3A5C', accent: '#E8763A', text: '#1a1a1a', bg: '#ffffff' },
  auto_mode: false, is_default: false,
};

export default function SignatureGeneratorPage() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useSignatureProfile();
  const { data: configs = [] } = useSignatureConfigs();
  const upsertConfig = useUpsertSignatureConfig();
  const deleteConfig = useDeleteSignatureConfig();

  const [activeTab, setActiveTab] = useState<string>('profile');
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [localConfig, setLocalConfig] = useState<Partial<SignatureConfig>>({ ...DEFAULT_CONFIG });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Switch to generator tab once profile is validated
  const effectiveTab = activeTab === 'profile' && profile?.validated ? 'generator' : activeTab;

  const activeConfig = useMemo(() => {
    if (activeConfigId) {
      const found = configs.find(c => c.id === activeConfigId);
      if (found) return { ...found, ...localConfig };
    }
    return { ...DEFAULT_CONFIG, ...localConfig } as SignatureConfig;
  }, [activeConfigId, configs, localConfig]);

  const handleConfigChange = useCallback((updates: Partial<SignatureConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(async () => {
    const payload = { ...localConfig, id: activeConfigId || undefined };
    const result = await upsertConfig.mutateAsync(payload as any);
    setActiveConfigId(result.id);
    toast.success('Configuration sauvegardée');
  }, [localConfig, activeConfigId, upsertConfig]);

  const handleDuplicate = useCallback(async () => {
    const { id, ...rest } = localConfig as any;
    const result = await upsertConfig.mutateAsync({ ...rest, name: `${rest.name || 'Config'} (copie)` });
    setActiveConfigId(result.id);
    toast.success('Configuration dupliquée');
  }, [localConfig, upsertConfig]);

  const handleDelete = useCallback(async () => {
    if (!activeConfigId) return;
    await deleteConfig.mutateAsync(activeConfigId);
    setActiveConfigId(null);
    setLocalConfig({ ...DEFAULT_CONFIG });
  }, [activeConfigId, deleteConfig]);

  const handleSelectConfig = useCallback((c: SignatureConfig) => {
    setActiveConfigId(c.id);
    setLocalConfig(c);
  }, []);

  const handleNewConfig = useCallback(() => {
    setActiveConfigId(null);
    setLocalConfig({ ...DEFAULT_CONFIG, name: `Signature ${configs.length + 1}` });
  }, [configs.length]);

  const dummyProfile: SignatureProfile = profile || {
    id: '', user_id: '', first_name: 'Jean', last_name: 'Dupont',
    job_title: 'Directeur', agency_name: 'HelpConfort', phone: '06 00 00 00 00',
    email: 'jean@helpconfort.fr', website: 'https://www.helpconfort.fr',
    logo_url: null, validated: false, validated_at: null, created_at: '', updated_at: '',
  };

  const payload = useMemo(
    () => generateSignaturePayload(activeConfig as SignatureConfig, dummyProfile),
    [activeConfig, dummyProfile]
  );

  return (
    <div className="space-y-4">
      <Tabs value={effectiveTab} onValueChange={setActiveTab}>
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="profile" className="flex-1 gap-1.5"><PenLine className="w-4 h-4" /> Profil</TabsTrigger>
          <TabsTrigger value="generator" className="flex-1 gap-1.5"><Sparkles className="w-4 h-4" /> Générateur</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 max-w-2xl">
          <SignatureProfileForm onComplete={() => setActiveTab('generator')} />
        </TabsContent>

        <TabsContent value="generator" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-2 space-y-2">
              <Button variant="outline" size="sm" className="w-full" onClick={handleNewConfig}>
                <Plus className="w-4 h-4 mr-1" /> Nouvelle
              </Button>
              {configs.map(c => (
                <SignatureConfigCard key={c.id} config={c} isActive={activeConfigId === c.id} onClick={() => handleSelectConfig(c)} />
              ))}
            </div>
            <div className="lg:col-span-4">
              <SignatureControls config={activeConfig as SignatureConfig} onChange={handleConfigChange}
                onSave={handleSave} onDuplicate={handleDuplicate} onDelete={handleDelete} isSaving={upsertConfig.isPending} />
            </div>
            <div className="lg:col-span-6 space-y-4">
              <div className="sticky top-4">
                <div ref={canvasRef}><SignatureCanvas payload={payload} /></div>
                <div className="mt-4"><SignatureExport payload={payload} canvasRef={canvasRef} /></div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

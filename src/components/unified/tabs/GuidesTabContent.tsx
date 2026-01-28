/**
 * GuidesTabContent - Contenu de l'onglet "Guides"
 * Sous-onglets: Apogée, Apporteurs, HelpConfort, FAQ
 */

import { lazy, Suspense, useState } from 'react';
import { BookOpen, Users, Building2, HelpCircle, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ApogeeGuide = lazy(() => import('@/pages/ApogeeGuide'));
const ApporteurGuide = lazy(() => import('@/pages/ApporteurGuide'));
const HelpConfort = lazy(() => import('@/pages/HelpConfort'));

type GuideTab = 'apogee' | 'apporteurs' | 'helpconfort' | 'faq';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function GuidesTabContent() {
  const [activeGuide, setActiveGuide] = useState<GuideTab>('apogee');

  return (
    <div className="container mx-auto py-4 px-4">
      <Tabs value={activeGuide} onValueChange={(v) => setActiveGuide(v as GuideTab)}>
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="apogee" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Apogée</span>
          </TabsTrigger>
          <TabsTrigger value="apporteurs" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Apporteurs</span>
          </TabsTrigger>
          <TabsTrigger value="helpconfort" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">HelpConfort</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<LoadingFallback />}>
          <TabsContent value="apogee" className="mt-0">
            <ApogeeGuide />
          </TabsContent>
          
          <TabsContent value="apporteurs" className="mt-0">
            <ApporteurGuide />
          </TabsContent>
          
          <TabsContent value="helpconfort" className="mt-0">
            <HelpConfort />
          </TabsContent>
          
          <TabsContent value="faq" className="mt-0">
            <div className="text-center py-12 text-muted-foreground">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">FAQ</p>
              <p className="text-sm">Questions fréquentes (à venir)</p>
            </div>
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}

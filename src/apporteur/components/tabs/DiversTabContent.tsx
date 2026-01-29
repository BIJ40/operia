/**
 * DiversTabContent - Contenu de l'onglet Divers
 * Placeholder pour fonctionnalités futures (documents, FAQ, etc.)
 */

import { Card, CardContent } from '@/components/ui/card';
import { FileQuestion, FolderArchive, HelpCircle, Info } from 'lucide-react';

export default function DiversTabContent() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FolderArchive className="w-6 h-6 text-primary" />
          Divers
        </h1>
        <p className="text-muted-foreground">
          Ressources et informations complémentaires
        </p>
      </div>

      {/* Coming Soon Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <FileQuestion className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Documents</h3>
              <p className="text-sm text-muted-foreground">
                Accédez à vos documents et modèles
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Bientôt disponible
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">FAQ</h3>
              <p className="text-sm text-muted-foreground">
                Questions fréquentes et aide
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Bientôt disponible
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Info className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Informations</h3>
              <p className="text-sm text-muted-foreground">
                Actualités et communications
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Bientôt disponible
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

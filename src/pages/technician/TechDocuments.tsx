import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FileText, 
  Car, 
  HardHat, 
  Loader2, 
  Download,
  ChevronRight,
  File
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyDocuments, useDownloadDocument } from '@/hooks/rh-employee/useMyDocuments';
import { useTechnicianProfile } from '@/hooks/technician/useTechnicianProfile';
import { toast } from 'sonner';

export default function TechDocuments() {
  const { data: profile, isLoading: profileLoading } = useTechnicianProfile();
  const { data: documents = [], isLoading: docsLoading } = useMyDocuments();
  const { downloadDocument } = useDownloadDocument();
  const [downloading, setDownloading] = useState<string | null>(null);

  const isLoading = profileLoading || docsLoading;

  const handleDownload = async (filePath: string, fileName: string, docId: string) => {
    setDownloading(docId);
    try {
      await downloadDocument(filePath, fileName);
    } catch {
      toast.error('Erreur lors du téléchargement');
    }
    setDownloading(null);
  };

  // Group documents by type
  const rhDocs = documents.filter(d => ['fiche_paie', 'contrat', 'avenant', 'autre_rh'].includes(d.doc_type));
  const vehicleDocs = documents.filter(d => d.doc_type === 'vehicule');
  const epiDocs = documents.filter(d => d.doc_type === 'epi');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aucun profil salarié configuré
          </CardContent>
        </Card>
      </div>
    );
  }

  const DocList = ({ docs }: { docs: typeof documents }) => (
    <div className="divide-y divide-border">
      {docs.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Aucun document disponible
        </div>
      ) : (
        docs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{doc.title}</div>
                <div className="text-xs text-muted-foreground">
                  {doc.period_month && doc.period_year
                    ? `${format(new Date(doc.period_year, doc.period_month - 1), 'MMMM yyyy', { locale: fr })}`
                    : format(new Date(doc.created_at!), 'd MMM yyyy', { locale: fr })}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDownload(doc.file_path, doc.file_name, doc.id)}
              disabled={downloading === doc.id}
            >
              {downloading === doc.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Mes Documents
        </h1>
      </div>

      <Tabs defaultValue="rh" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rh" className="text-xs">
            <FileText className="h-4 w-4 mr-1" />
            RH
          </TabsTrigger>
          <TabsTrigger value="vehicle" className="text-xs">
            <Car className="h-4 w-4 mr-1" />
            Véhicule
          </TabsTrigger>
          <TabsTrigger value="epi" className="text-xs">
            <HardHat className="h-4 w-4 mr-1" />
            EPI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rh" className="mt-4">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Documents RH</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DocList docs={rhDocs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicle" className="mt-4">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Documents Véhicule</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DocList docs={vehicleDocs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="epi" className="mt-4">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Documents EPI</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DocList docs={epiDocs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

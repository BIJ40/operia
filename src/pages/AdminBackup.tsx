import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, FileJson, FileText, CheckCircle2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAdminBackup } from '@/hooks/use-admin-backup';
import { ExportCard, CategoryExportCard, CompleteBackupCard } from '@/components/admin/backup';

export default function AdminBackup() {
  const { isAdmin } = useAuth();
  const {
    apogeeCategories,
    apporteurCategories,
    selectedApogeeCategory,
    selectedApporteurCategory,
    setSelectedApogeeCategory,
    setSelectedApporteurCategory,
    exportingApogee,
    exportingApporteur,
    exporting,
    importing,
    lastBackup,
    exportApogeeData,
    exportApporteurData,
    exportTextOnly,
    exportSingleCategory,
    exportAllData,
    importData,
  } = useAdminBackup();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container max-w-6xl mx-auto p-8 space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <Database className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Sauvegarde & Restauration</h1>
      </div>

      {lastBackup && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Dernière sauvegarde complète : {lastBackup.toLocaleString('fr-FR')}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="structured" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="structured">Export Complet</TabsTrigger>
          <TabsTrigger value="single">Export Catégorie</TabsTrigger>
          <TabsTrigger value="complete">Sauvegarde Complète</TabsTrigger>
        </TabsList>

        <TabsContent value="structured" className="space-y-6">
          <Alert>
            <FileJson className="h-4 w-4" />
            <AlertDescription>
              Export lisible et structuré par catégories et sections. Format JSON facile à lire et éditer.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            <ExportCard
              title="Manuel Apogée"
              description="Export des catégories et sections du guide Apogée"
              onExportJson={exportApogeeData}
              onExportText={() => exportTextOnly('apogee')}
              isLoading={exportingApogee}
            />
            <ExportCard
              title="Guide Apporteur"
              description="Export des catégories et sections du guide Apporteur"
              onExportJson={exportApporteurData}
              onExportText={() => exportTextOnly('apporteur')}
              isLoading={exportingApporteur}
            />
          </div>
        </TabsContent>

        <TabsContent value="single" className="space-y-6">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Exportez une seule catégorie avec toutes ses sections en JSON ou texte brut.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            <CategoryExportCard
              title="Catégorie Apogée"
              description="Sélectionnez une catégorie du guide Apogée"
              categories={apogeeCategories}
              selectedCategory={selectedApogeeCategory}
              onCategoryChange={setSelectedApogeeCategory}
              onExportJson={() => exportSingleCategory('apogee', 'json')}
              onExportText={() => exportSingleCategory('apogee', 'txt')}
              isLoading={exportingApogee}
            />
            <CategoryExportCard
              title="Catégorie Apporteur"
              description="Sélectionnez une catégorie du guide Apporteur"
              categories={apporteurCategories}
              selectedCategory={selectedApporteurCategory}
              onCategoryChange={setSelectedApporteurCategory}
              onExportJson={() => exportSingleCategory('apporteur', 'json')}
              onExportText={() => exportSingleCategory('apporteur', 'txt')}
              isLoading={exportingApporteur}
            />
          </div>
        </TabsContent>

        <TabsContent value="complete" className="space-y-6">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              Sauvegarde technique complète incluant tous les champs de la base de données (blocks, documents, etc.)
            </AlertDescription>
          </Alert>

          <CompleteBackupCard
            onExport={exportAllData}
            onImport={importData}
            isExporting={exporting}
            isImporting={importing}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

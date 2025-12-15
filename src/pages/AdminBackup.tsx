import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, FileJson, FileText, CheckCircle2 } from 'lucide-react';
import { useAdminBackup } from '@/hooks/use-admin-backup';
import { ExportCard, CategoryExportCard, CompleteBackupCard } from '@/components/admin/backup';
import { usePersistedTab } from '@/hooks/usePersistedState';

// Note: L'accès à cette page est contrôlé par RoleGuard (N5+) dans App.tsx

export default function AdminBackup() {
  const {
    apogeeCategories,
    helpconfortCategories,
    apporteurCategories,
    selectedApogeeCategories,
    selectedHelpconfortCategories,
    selectedApporteurCategories,
    setSelectedApogeeCategories,
    setSelectedHelpconfortCategories,
    setSelectedApporteurCategories,
    exportingApogee,
    exportingHelpconfort,
    exportingApporteur,
    exporting,
    importing,
    lastBackup,
    exportApogeeData,
    exportHelpconfortData,
    exportApporteurData,
    exportTextOnly,
    exportSingleCategory,
    exportSingleCategoryPdf,
    exportMultipleCategoriesPdf,
    exportAllData,
    importData,
  } = useAdminBackup();

  const [activeTab, setActiveTab] = usePersistedTab('admin-backup-tab', 'structured');

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

          <div className="grid md:grid-cols-3 gap-6">
            <ExportCard
              title="Manuel Apogée"
              description="Export des catégories et sections du guide Apogée"
              onExportJson={exportApogeeData}
              onExportText={() => exportTextOnly('apogee')}
              isLoading={exportingApogee}
            />
            <ExportCard
              title="Guide HelpConfort"
              description="Export des catégories et sections du guide HelpConfort"
              onExportJson={exportHelpconfortData}
              onExportText={() => exportTextOnly('helpconfort')}
              isLoading={exportingHelpconfort}
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
              Exportez une ou plusieurs catégories avec toutes leurs sections en JSON, texte ou PDF avec images.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-3 gap-6">
            <CategoryExportCard
              title="Catégorie Apogée"
              description="Sélectionnez une ou plusieurs catégories du guide Apogée"
              categories={apogeeCategories}
              selectedCategories={selectedApogeeCategories}
              onCategoriesChange={setSelectedApogeeCategories}
              onExportJson={() => exportSingleCategory('apogee', 'json')}
              onExportText={() => exportSingleCategory('apogee', 'txt')}
              onExportPdf={() => exportSingleCategoryPdf('apogee')}
              onExportMultiplePdf={() => exportMultipleCategoriesPdf('apogee')}
              isLoading={exportingApogee}
            />
            <CategoryExportCard
              title="Catégorie HelpConfort"
              description="Sélectionnez une ou plusieurs catégories du guide HelpConfort"
              categories={helpconfortCategories}
              selectedCategories={selectedHelpconfortCategories}
              onCategoriesChange={setSelectedHelpconfortCategories}
              onExportJson={() => exportSingleCategory('helpconfort', 'json')}
              onExportText={() => exportSingleCategory('helpconfort', 'txt')}
              onExportPdf={() => exportSingleCategoryPdf('helpconfort')}
              onExportMultiplePdf={() => exportMultipleCategoriesPdf('helpconfort')}
              isLoading={exportingHelpconfort}
            />
            <CategoryExportCard
              title="Catégorie Apporteur"
              description="Sélectionnez une ou plusieurs catégories du guide Apporteur"
              categories={apporteurCategories}
              selectedCategories={selectedApporteurCategories}
              onCategoriesChange={setSelectedApporteurCategories}
              onExportJson={() => exportSingleCategory('apporteur', 'json')}
              onExportText={() => exportSingleCategory('apporteur', 'txt')}
              onExportPdf={() => exportSingleCategoryPdf('apporteur')}
              onExportMultiplePdf={() => exportMultipleCategoriesPdf('apporteur')}
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

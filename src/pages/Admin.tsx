import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, FolderOpen } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

// Configuration de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ 
    current: 0, 
    total: 0, 
    currentFile: '',
    status: '' as 'parsing' | 'uploading' | ''
  });
  const [migrationStatus, setMigrationStatus] = useState<{
    localCount: number;
    serverCount: number;
    isChecking: boolean;
    isMigrating: boolean;
  }>({ localCount: 0, serverCount: 0, isChecking: false, isMigrating: false });

  // Protection : rediriger si non admin
  if (!isAdmin) {
    navigate('/');
    toast({
      title: 'Accès refusé',
      description: 'Seuls les administrateurs peuvent accéder à cette page',
      variant: 'destructive'
    });
    return null;
  }

  // Fonction pour extraire le texte d'un PDF
  const extractPdfText = async (file: File): Promise<string> => {
    try {
      console.log(`🔍 Début extraction PDF: ${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      console.log(`📦 ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log(`📄 PDF chargé: ${pdf.numPages} pages`);
      
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
        console.log(`📃 Page ${pageNum}/${pdf.numPages}: ${pageText.length} caractères`);
      }
      
      console.log(`✅ Extraction terminée: ${fullText.length} caractères totaux`);
      return fullText.trim();
    } catch (error) {
      console.error('❌ Erreur extraction PDF:', error);
      throw new Error(`Impossible d'extraire le texte du PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  // Fonction pour extraire le texte d'un fichier Excel
  const extractExcelText = async (file: File): Promise<string> => {
    try {
      console.log(`🔍 Début extraction Excel: ${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      let fullText = '';
      
      // Parcourir toutes les feuilles
      workbook.SheetNames.forEach((sheetName, index) => {
        const sheet = workbook.Sheets[sheetName];
        
        // Convertir la feuille en CSV pour extraction texte
        const csv = XLSX.utils.sheet_to_csv(sheet);
        
        fullText += `=== Feuille ${index + 1}: ${sheetName} ===\n\n${csv}\n\n`;
      });
      
      console.log(`✅ Extraction Excel terminée: ${fullText.length} caractères`);
      return fullText.trim();
    } catch (error) {
      console.error('❌ Erreur extraction Excel:', error);
      throw new Error(`Impossible d'extraire le texte Excel: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setFiles(selectedFiles);
    await handleBatchUpload(selectedFiles);
  };

  const handleBatchUpload = async (selectedFiles: File[]) => {
    setIsLoading(true);
    setUploadProgress({ 
      current: 0, 
      total: selectedFiles.length, 
      currentFile: '', 
      status: '' 
    });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      setUploadProgress({ 
        current: i + 1, 
        total: selectedFiles.length,
        currentFile: file.name,
        status: 'parsing'
      });

      try {
        const fileType = file.type;
        const fileName = file.name.toLowerCase();
        let extractedContent = '';

        // Déterminer la catégorie automatiquement basée sur le nom du fichier
        let autoCategory = 'manuel';
        if (fileName.includes('api')) autoCategory = 'api';
        else if (fileName.includes('tarif')) autoCategory = 'tarifs';
        else if (fileName.includes('tuto') || fileName.includes('guide')) autoCategory = 'tutoriel';
        else if (fileName.includes('apporteur')) autoCategory = 'apporteurs';
        else if (fileName.includes('devis')) autoCategory = 'devis';
        else if (fileName.includes('fondament')) autoCategory = 'fondamentaux';

        // Parse le fichier
        console.log(`🔄 Traitement: ${file.name} (${fileType})`);
        
        if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
          // Extraction PDF côté client
          try {
            console.log(`📄 Extraction PDF: ${file.name}`);
            extractedContent = await extractPdfText(file);
            console.log(`✅ Contenu extrait: ${extractedContent.length} caractères`);
            
            if (!extractedContent || extractedContent.length === 0) {
              console.warn(`⚠️ Aucun texte dans ${file.name}`);
              extractedContent = `[PDF: ${file.name}] - PDF vide ou scanné (aucun texte détecté)`;
            }
          } catch (error) {
            console.error(`❌ Erreur extraction ${file.name}:`, error);
            extractedContent = `[PDF: ${file.name}] - Erreur d'extraction: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          }
        }
        else if (fileType === 'application/vnd.ms-excel' || 
                 fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                 fileName.endsWith('.xls') || 
                 fileName.endsWith('.xlsx')) {
          // Extraction Excel
          try {
            console.log(`📊 Extraction Excel: ${file.name}`);
            extractedContent = await extractExcelText(file);
            console.log(`✅ Contenu extrait: ${extractedContent.length} caractères`);
            
            if (!extractedContent || extractedContent.length === 0) {
              console.warn(`⚠️ Aucune donnée dans ${file.name}`);
              extractedContent = `[Excel: ${file.name}] - Fichier vide`;
            }
          } catch (error) {
            console.error(`❌ Erreur extraction ${file.name}:`, error);
            extractedContent = `[Excel: ${file.name}] - Erreur d'extraction: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          }
        }
        else if (fileType.startsWith('image/') || 
            ['.jpg', '.jpeg', '.png', '.webp'].some(ext => fileName.endsWith(ext))) {
          console.log(`🖼️ Image détectée: ${file.name}`);
          extractedContent = `[Image: ${file.name}] - Nécessite traitement manuel ou OCR`;
        } 
        else {
          // Fichier texte
          console.log(`📝 Fichier texte: ${file.name}`);
          const text = await file.text();
          extractedContent = text;
          console.log(`✅ Texte lu: ${extractedContent.length} caractères`);
        }

        console.log(`📊 Contenu final pour ${file.name}: ${extractedContent.length} caractères`);

        // Insérer dans la base
        setUploadProgress({ 
          current: i + 1, 
          total: selectedFiles.length,
          currentFile: file.name,
          status: 'uploading'
        });

        console.log(`💾 Insertion en base: ${file.name}`);
        const { error } = await supabase
          .from('knowledge_base')
          .insert({
            title: file.name.replace(/\.[^/.]+$/, ""),
            category: autoCategory,
            content: extractedContent,
            metadata: {
              originalFileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              uploadedAt: new Date().toISOString(),
            }
          });

        if (error) {
          console.error(`❌ Erreur insertion ${file.name}:`, error);
          throw error;
        }
        
        console.log(`✅ ${file.name} importé avec succès`);
        successCount++;

      } catch (error) {
        console.error(`Erreur pour ${file.name}:`, error);
        errorCount++;
      }
    }

    setIsLoading(false);
    setUploadProgress({ current: 0, total: 0, currentFile: '', status: '' });

    toast({
      title: 'Import terminé',
      description: `${successCount} document(s) importé(s) avec succès${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`,
    });

    // Réinitialiser
    setFiles([]);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Fonction pour vérifier le statut de la migration
  const checkMigrationStatus = async () => {
    setMigrationStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      // Charger les données locales
      const { openDB } = await import('idb');
      const db = await openDB('apogee-guide-db', 1);
      const localData = await db.get('appData', 'current');
      const localCount = localData?.blocks?.length || 0;

      // Charger les données du serveur
      const { data: serverBlocks, error } = await supabase
        .from('blocks' as any)
        .select('id');
      
      const serverCount = serverBlocks?.length || 0;

      setMigrationStatus({ 
        localCount, 
        serverCount, 
        isChecking: false, 
        isMigrating: false 
      });
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      setMigrationStatus(prev => ({ ...prev, isChecking: false }));
    }
  };

  // Fonction pour migrer les données
  const migrateData = async () => {
    setMigrationStatus(prev => ({ ...prev, isMigrating: true }));
    
    try {
      // Charger depuis IndexedDB
      const { openDB } = await import('idb');
      const db = await openDB('apogee-guide-db', 1);
      const localData = await db.get('appData', 'current');

      if (!localData || !localData.blocks || localData.blocks.length === 0) {
        toast({
          title: 'Aucune donnée',
          description: 'Aucune donnée à migrer depuis le cache local',
          variant: 'destructive'
        });
        setMigrationStatus(prev => ({ ...prev, isMigrating: false }));
        return;
      }

      console.log(`🔄 Migration de ${localData.blocks.length} blocs...`);
      console.log('Premier bloc exemple:', localData.blocks[0]);

      // Supprimer les données existantes
      const { error: deleteError } = await supabase
        .from('blocks' as any)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        console.error('Erreur suppression:', deleteError);
        throw new Error(`Suppression: ${deleteError.message}`);
      }

      // Préparer les blocs pour l'insertion
      const blocksToInsert = localData.blocks.map((block: any) => {
        const prepared = {
          id: block.id,
          type: block.type,
          title: block.title,
          content: block.content || '',
          icon: block.icon || null,
          color_preset: block.colorPreset || 'white',
          order: block.order || 0,
          slug: block.slug,
          parent_id: block.parentId || null,
          attachments: block.attachments || [],
          hide_from_sidebar: block.hideFromSidebar || false,
        };
        return prepared;
      });

      console.log('Nombre de blocs à insérer:', blocksToInsert.length);
      console.log('Premier bloc préparé:', blocksToInsert[0]);

      // Insérer tous les blocs
      const { data: insertedData, error: insertError } = await supabase
        .from('blocks' as any)
        .insert(blocksToInsert)
        .select();

      if (insertError) {
        console.error('❌ Erreur insertion complète:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        });
        throw new Error(`${insertError.message} (Code: ${insertError.code})`);
      }

      console.log('✅ Migration réussie !', insertedData?.length, 'blocs insérés');
      
      toast({
        title: 'Migration réussie !',
        description: `${localData.blocks.length} blocs migrés vers le serveur`,
      });

      await checkMigrationStatus();
    } catch (error) {
      console.error('❌ Erreur complète de migration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast({
        title: 'Erreur de migration',
        description: errorMessage,
        variant: 'destructive'
      });
      setMigrationStatus(prev => ({ ...prev, isMigrating: false }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}>
            ← Retour au guide
          </Button>
          <Button variant="outline" onClick={() => navigate('/documents')}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Gérer les documents
          </Button>
        </div>

        {/* Carte de migration des données */}
        <Card className="max-w-4xl mx-auto mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Migration des données vers le serveur
            </CardTitle>
            <CardDescription>
              Transférez vos données du cache local vers la base de données sécurisée
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-background">
                <div className="text-sm text-muted-foreground mb-1">Cache Local (Mac)</div>
                <div className="text-3xl font-bold">{migrationStatus.isChecking ? '...' : migrationStatus.localCount}</div>
                <div className="text-xs text-muted-foreground">blocs</div>
              </div>
              
              <div className="p-4 border rounded-lg bg-background">
                <div className="text-sm text-muted-foreground mb-1">Serveur (Accessible partout)</div>
                <div className="text-3xl font-bold text-primary">{migrationStatus.isChecking ? '...' : migrationStatus.serverCount}</div>
                <div className="text-xs text-muted-foreground">blocs</div>
              </div>
            </div>

            {migrationStatus.localCount > 0 && migrationStatus.serverCount === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500">
                  ⚠️ Vos données sont uniquement sur votre Mac. Migrez-les vers le serveur pour y accéder depuis n'importe quel appareil.
                </p>
              </div>
            )}

            {migrationStatus.serverCount > 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <p className="text-sm font-medium text-green-600 dark:text-green-500">
                  ✅ Vos données sont sauvegardées sur le serveur et accessibles depuis n'importe quel appareil.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Button 
                onClick={checkMigrationStatus}
                variant="outline"
                disabled={migrationStatus.isChecking}
                className="w-full"
              >
                {migrationStatus.isChecking ? 'Vérification...' : 'Vérifier le statut'}
              </Button>
              
              <Button 
                onClick={migrateData}
                disabled={migrationStatus.isMigrating || migrationStatus.isChecking || migrationStatus.localCount === 0}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {migrationStatus.isMigrating ? 'Migration en cours...' : 'Migrer vers le serveur'}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
              <p><strong>Comment ça marche :</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Cliquez sur "Vérifier le statut" pour voir combien de blocs vous avez</li>
                <li>Cliquez sur "Migrer" pour copier vos données vers le serveur</li>
                <li>Une fois migrées, vos données seront accessibles depuis n'importe quel appareil</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Import rapide de documents
            </CardTitle>
            <CardDescription>
              Importez vos fichiers - le titre, la catégorie et le contenu sont détectés automatiquement
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">
                  Sélectionnez vos fichiers
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".txt,.html,.csv,.json,.md,.pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx"
                    onChange={handleFileUpload}
                    className="flex-1"
                    disabled={isLoading}
                    multiple
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>✅ Formats acceptés : .txt, .html, .csv, .json, .md, .pdf, .xls, .xlsx, .jpg, .png, .webp</p>
                  <p>✅ Import multiple : sélectionnez plusieurs fichiers en une fois</p>
                  <p>✅ Détection automatique : titre (nom fichier), catégorie (mots-clés), contenu (extraction)</p>
                </div>
              </div>

              {uploadProgress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-primary">
                      {uploadProgress.status === 'parsing' ? '📄 Extraction...' : '📤 Envoi...'}
                    </span>
                    <span className="text-muted-foreground">
                      {uploadProgress.current} / {uploadProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-300 ease-in-out"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                  {uploadProgress.currentFile && (
                    <p className="text-xs text-muted-foreground truncate">
                      {uploadProgress.currentFile}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">📋 Détection automatique des catégories</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>api</strong> : fichiers contenant "api"</li>
                <li>• <strong>tarifs</strong> : fichiers contenant "tarif"</li>
                <li>• <strong>tutoriel</strong> : fichiers contenant "tuto" ou "guide"</li>
                <li>• <strong>apporteurs</strong> : fichiers contenant "apporteur"</li>
                <li>• <strong>devis</strong> : fichiers contenant "devis"</li>
                <li>• <strong>fondamentaux</strong> : fichiers contenant "fondament"</li>
                <li>• <strong>manuel</strong> : tous les autres fichiers</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-4xl mx-auto mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Besoin de modifier un document ?
            </CardTitle>
            <CardDescription>
              Cliquez sur "Gérer les documents" pour visualiser, rechercher, éditer ou supprimer les documents importés
            </CardDescription>
          </CardHeader>
        </Card>
    </div>
  );
}

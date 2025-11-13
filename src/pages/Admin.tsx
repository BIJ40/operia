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

/**
 * Page récapitulatif + export PDF du BI
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowLeft, 
  FileSignature, 
  Download, 
  CheckCircle, 
  Clock, 
  User, 
  MapPin,
  Wrench,
  Package,
  Camera,
  MessageSquare,
  PenTool
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { useBonIntervention } from '../hooks/useBonIntervention';
import { ROUTES } from '@/config/routes';

export default function BonInterventionRecap() {
  const navigate = useNavigate();
  const { interventionId } = useParams<{ interventionId: string }>();
  
  const { bonIntervention, markAsExported, calculateTempsPasse } = useBonIntervention(
    interventionId ? Number(interventionId) : undefined
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    if (!bonIntervention) return;

    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;
      const margin = 15;
      const lineHeight = 7;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('BON D\'INTERVENTION', pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Réf: ${bonIntervention.refDossier}`, pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Infos client
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMATIONS CLIENT', margin, y);
      y += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Client: ${bonIntervention.clientNom}`, margin, y);
      y += lineHeight;
      doc.text(`Adresse: ${bonIntervention.clientAdresse || '–'}`, margin, y);
      y += lineHeight;
      doc.text(`Date intervention: ${format(parseISO(bonIntervention.dateIntervention), 'dd/MM/yyyy', { locale: fr })}`, margin, y);
      y += lineHeight;
      doc.text(`Technicien: ${bonIntervention.technicienNom}`, margin, y);
      y += 10;

      // Horaires
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('HORAIRES', margin, y);
      y += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Départ agence: ${bonIntervention.heureDepart || '–'}`, margin, y);
      doc.text(`Arrivée: ${bonIntervention.heureArrivee || '–'}`, margin + 60, y);
      doc.text(`Fin: ${bonIntervention.heureFin || '–'}`, margin + 110, y);
      y += lineHeight;
      
      const tempsPasse = calculateTempsPasse(bonIntervention.heureArrivee, bonIntervention.heureFin);
      const tempsFormatted = tempsPasse > 0 
        ? `${Math.floor(tempsPasse / 60)}h${(tempsPasse % 60).toString().padStart(2, '0')}`
        : '–';
      doc.text(`Temps passé sur site: ${tempsFormatted}`, margin, y);
      y += 10;

      // Travaux
      if (bonIntervention.travaux.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TRAVAUX EFFECTUÉS', margin, y);
        y += lineHeight;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        bonIntervention.travaux.forEach((travail, index) => {
          const qte = travail.quantite ? ` (${travail.quantite} ${travail.unite || ''})` : '';
          doc.text(`${index + 1}. ${travail.description}${qte}`, margin, y);
          y += lineHeight;
          
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        });
        y += 5;
      }

      // Matériaux
      if (bonIntervention.materiaux.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('MATÉRIAUX UTILISÉS', margin, y);
        y += lineHeight;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        bonIntervention.materiaux.forEach((materiau) => {
          const ref = materiau.reference ? ` [${materiau.reference}]` : '';
          doc.text(`• ${materiau.designation}: ${materiau.quantite} ${materiau.unite}${ref}`, margin, y);
          y += lineHeight;
          
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        });
        y += 5;
      }

      // Observations
      if (bonIntervention.observations) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVATIONS', margin, y);
        y += lineHeight;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const obsLines = doc.splitTextToSize(bonIntervention.observations, pageWidth - 2 * margin);
        doc.text(obsLines, margin, y);
        y += obsLines.length * lineHeight + 5;
      }

      // Recommandations
      if (bonIntervention.recommandations) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('RECOMMANDATIONS', margin, y);
        y += lineHeight;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const recLines = doc.splitTextToSize(bonIntervention.recommandations, pageWidth - 2 * margin);
        doc.text(recLines, margin, y);
        y += recLines.length * lineHeight + 5;
      }

      // Signature
      if (bonIntervention.signatureClient) {
        if (y > 200) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('SIGNATURE CLIENT', margin, y);
        y += lineHeight;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Signataire: ${bonIntervention.signataireNom || '–'}`, margin, y);
        y += lineHeight;
        doc.text(`Date: ${bonIntervention.signatureDate ? format(parseISO(bonIntervention.signatureDate), 'dd/MM/yyyy à HH:mm', { locale: fr }) : '–'}`, margin, y);
        y += 10;

        // Image signature
        try {
          doc.addImage(bonIntervention.signatureClient, 'PNG', margin, y, 60, 30);
          y += 35;
        } catch (error) {
          console.error('Erreur ajout signature:', error);
        }
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );

      // Télécharger
      const fileName = `BI_${bonIntervention.refDossier}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(fileName);

      // Marquer comme exporté
      markAsExported(bonIntervention.id);
      
      toast.success('PDF généré avec succès');
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!bonIntervention) {
    return (
      <div className="container py-6">
        <Button variant="ghost" onClick={() => navigate(ROUTES.technicien.bonIntervention)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Card className="mt-4">
          <CardContent className="py-8 text-center text-muted-foreground">
            Bon d'intervention non trouvé
          </CardContent>
        </Card>
      </div>
    );
  }

  const tempsPasse = calculateTempsPasse(bonIntervention.heureArrivee, bonIntervention.heureFin);
  const tempsFormatted = tempsPasse > 0 
    ? `${Math.floor(tempsPasse / 60)}h${(tempsPasse % 60).toString().padStart(2, '0')}`
    : '–';

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.technicien.bonIntervention)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="p-2 rounded-lg bg-green-500/10">
          <FileSignature className="h-6 w-6 text-green-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Récapitulatif</h1>
          <p className="text-sm text-muted-foreground">
            {bonIntervention.refDossier}
          </p>
        </div>
        <Badge 
          variant="outline"
          className={
            bonIntervention.status === 'signed' 
              ? 'bg-green-50 text-green-700 border-green-200' 
              : bonIntervention.status === 'exported'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }
        >
          {bonIntervention.status === 'signed' && <CheckCircle className="h-3 w-3 mr-1" />}
          {bonIntervention.status === 'signed' ? 'Signé' : bonIntervention.status === 'exported' ? 'Exporté' : 'Brouillon'}
        </Badge>
      </div>

      {/* Client */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{bonIntervention.clientNom}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" />
            {bonIntervention.clientAdresse || '–'}
          </p>
        </CardContent>
      </Card>

      {/* Horaires */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            Horaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Départ</p>
              <p className="font-medium">{bonIntervention.heureDepart || '–'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Arrivée</p>
              <p className="font-medium">{bonIntervention.heureArrivee || '–'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fin</p>
              <p className="font-medium">{bonIntervention.heureFin || '–'}</p>
            </div>
          </div>
          <div className="mt-3 text-center p-2 bg-muted rounded">
            <span className="text-sm">Temps sur site: </span>
            <span className="font-bold">{tempsFormatted}</span>
          </div>
        </CardContent>
      </Card>

      {/* Travaux */}
      {bonIntervention.travaux.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Wrench className="h-4 w-4" />
              Travaux ({bonIntervention.travaux.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {bonIntervention.travaux.map((t, i) => (
                <li key={t.id} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>{t.description}</span>
                  {t.quantite && (
                    <span className="text-muted-foreground">({t.quantite} {t.unite})</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Matériaux */}
      {bonIntervention.materiaux.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Package className="h-4 w-4" />
              Matériaux ({bonIntervention.materiaux.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {bonIntervention.materiaux.map((m) => (
                <li key={m.id} className="text-sm flex items-center gap-2">
                  <span>•</span>
                  <span>{m.designation}</span>
                  <span className="text-muted-foreground">
                    {m.quantite} {m.unite}
                  </span>
                  {m.reference && (
                    <span className="text-xs text-muted-foreground">[{m.reference}]</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      {bonIntervention.photos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Camera className="h-4 w-4" />
              Photos ({bonIntervention.photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {bonIntervention.photos.slice(0, 4).map((p) => (
                <img 
                  key={p.id} 
                  src={p.dataUrl} 
                  alt={p.legende || 'Photo'} 
                  className="aspect-square object-cover rounded"
                />
              ))}
            </div>
            {bonIntervention.photos.length > 4 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                +{bonIntervention.photos.length - 4} autres photos
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Observations */}
      {bonIntervention.observations && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{bonIntervention.observations}</p>
          </CardContent>
        </Card>
      )}

      {/* Signature */}
      {bonIntervention.signatureClient && (
        <Card className="border-green-200 bg-green-50/30 dark:bg-green-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-green-700">
              <PenTool className="h-4 w-4" />
              Signature client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <img 
                src={bonIntervention.signatureClient} 
                alt="Signature" 
                className="h-16 bg-white rounded border"
              />
              <div>
                <p className="font-medium">{bonIntervention.signataireNom}</p>
                <p className="text-xs text-muted-foreground">
                  {bonIntervention.signatureDate && 
                    format(parseISO(bonIntervention.signatureDate), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => navigate(
            ROUTES.technicien.bonInterventionDetail.replace(':interventionId', interventionId!),
            { state: { intervention: { id: bonIntervention.interventionId } } }
          )}
        >
          Modifier
        </Button>
        <Button 
          onClick={generatePDF} 
          disabled={isGenerating}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? 'Génération...' : 'Télécharger PDF'}
        </Button>
      </div>
    </div>
  );
}

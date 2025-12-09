/**
 * Page récapitulatif + export PDF du PV Apporteur
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowLeft, 
  ClipboardCheck, 
  Download, 
  CheckCircle, 
  Clock, 
  User, 
  MapPin,
  CheckSquare,
  AlertTriangle,
  Camera,
  MessageSquare,
  PenTool,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { usePvApporteur } from '../hooks/usePvApporteur';
import { ROUTES } from '@/config/routes';

export default function PvApporteurRecap() {
  const navigate = useNavigate();
  const { dossierId } = useParams<{ dossierId: string }>();
  
  const { pvApporteur, markAsExported } = usePvApporteur(
    dossierId ? Number(dossierId) : undefined
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    if (!pvApporteur) return;

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
      doc.text('PROCÈS-VERBAL DE RÉCEPTION', pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Réf: ${pvApporteur.refDossier}`, pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Infos client
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMATIONS', margin, y);
      y += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Client: ${pvApporteur.clientNom}`, margin, y);
      y += lineHeight;
      doc.text(`Adresse: ${pvApporteur.clientAdresse || '–'}`, margin, y);
      y += lineHeight;
      if (pvApporteur.apporteurNom) {
        doc.text(`Apporteur: ${pvApporteur.apporteurNom}`, margin, y);
        y += lineHeight;
      }
      doc.text(`Date réception: ${pvApporteur.dateReception ? format(parseISO(pvApporteur.dateReception), 'dd/MM/yyyy', { locale: fr }) : '–'}`, margin, y);
      y += lineHeight;
      doc.text(`Représentant: ${pvApporteur.technicienNom}`, margin, y);
      y += 10;

      // Constats
      if (pvApporteur.constats.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('CONSTATS RÉALISÉS', margin, y);
        y += lineHeight;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        pvApporteur.constats.forEach((constat, index) => {
          const status = constat.conforme ? '✓' : '✗';
          doc.text(`${index + 1}. [${status}] ${constat.description}`, margin, y);
          y += lineHeight;
          
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        });
        y += 5;
      }

      // Réserves
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RÉSERVES', margin, y);
      y += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      if (pvApporteur.sansReserve) {
        doc.text('Réception sans réserve', margin, y);
        y += lineHeight;
      } else if (pvApporteur.reserves.length > 0) {
        pvApporteur.reserves.forEach((reserve) => {
          const status = reserve.estLevee ? '[Levée]' : '[À lever]';
          doc.text(`• ${status} ${reserve.description}`, margin, y);
          y += lineHeight;
          
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        });
      }
      y += 5;

      // Observations
      if (pvApporteur.observations) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVATIONS', margin, y);
        y += lineHeight;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const obsLines = doc.splitTextToSize(pvApporteur.observations, pageWidth - 2 * margin);
        doc.text(obsLines, margin, y);
        y += obsLines.length * lineHeight + 5;
      }

      // Conclusion
      if (pvApporteur.conclusionGenerale) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('CONCLUSION GÉNÉRALE', margin, y);
        y += lineHeight;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const concLines = doc.splitTextToSize(pvApporteur.conclusionGenerale, pageWidth - 2 * margin);
        doc.text(concLines, margin, y);
        y += concLines.length * lineHeight + 5;
      }

      // Signature
      if (pvApporteur.signatureClient) {
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
        doc.text(`Signataire: ${pvApporteur.signataireNom || '–'}`, margin, y);
        y += lineHeight;
        doc.text(`Date: ${pvApporteur.signatureDate ? format(parseISO(pvApporteur.signatureDate), 'dd/MM/yyyy à HH:mm', { locale: fr }) : '–'}`, margin, y);
        y += 10;

        // Image signature
        try {
          doc.addImage(pvApporteur.signatureClient, 'PNG', margin, y, 60, 30);
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
      const fileName = `PV_${pvApporteur.refDossier}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(fileName);

      // Marquer comme exporté
      markAsExported(pvApporteur.id);
      
      toast.success('PDF généré avec succès');
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!pvApporteur) {
    return (
      <div className="container py-6">
        <Button variant="ghost" onClick={() => navigate(ROUTES.technicien.pvApporteur)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Card className="mt-4">
          <CardContent className="py-8 text-center text-muted-foreground">
            PV non trouvé
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.technicien.pvApporteur)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="p-2 rounded-lg bg-blue-500/10">
          <ClipboardCheck className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Récapitulatif PV</h1>
          <p className="text-sm text-muted-foreground">
            {pvApporteur.refDossier}
          </p>
        </div>
        <Badge 
          variant="outline"
          className={
            pvApporteur.status === 'signed' 
              ? 'bg-blue-50 text-blue-700 border-blue-200' 
              : pvApporteur.status === 'exported'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }
        >
          {pvApporteur.status === 'signed' && <CheckCircle className="h-3 w-3 mr-1" />}
          {pvApporteur.status === 'signed' ? 'Signé' : pvApporteur.status === 'exported' ? 'Exporté' : 'Brouillon'}
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
          <p className="font-medium">{pvApporteur.clientNom}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" />
            {pvApporteur.clientAdresse || '–'}
          </p>
          {pvApporteur.apporteurNom && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Building2 className="h-3 w-3" />
              {pvApporteur.apporteurNom}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Réception */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            Réception
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">
                {pvApporteur.dateReception 
                  ? format(parseISO(pvApporteur.dateReception), 'dd/MM/yyyy', { locale: fr })
                  : '–'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Heure</p>
              <p className="font-medium">{pvApporteur.heureReception || '–'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Constats */}
      {pvApporteur.constats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <CheckSquare className="h-4 w-4" />
              Constats ({pvApporteur.constats.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {pvApporteur.constats.map((c, i) => (
                <li key={c.id} className="text-sm flex items-start gap-2">
                  <span className={c.conforme ? 'text-green-600' : 'text-red-600'}>
                    {c.conforme ? '✓' : '✗'}
                  </span>
                  <span>{c.description}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Réserves */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Réserves
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pvApporteur.sansReserve ? (
            <div className="text-center py-2 text-green-600 bg-green-50 rounded dark:bg-green-950/20">
              <CheckCircle className="h-5 w-5 mx-auto mb-1" />
              <p className="font-medium text-sm">Sans réserve</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {pvApporteur.reserves.map((r) => (
                <li key={r.id} className="text-sm flex items-center gap-2">
                  <span className={r.estLevee ? 'text-green-600' : 'text-amber-600'}>
                    {r.estLevee ? '✓' : '⚠'}
                  </span>
                  <span className={r.estLevee ? 'line-through text-muted-foreground' : ''}>
                    {r.description}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Photos */}
      {pvApporteur.photos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Camera className="h-4 w-4" />
              Photos ({pvApporteur.photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {pvApporteur.photos.slice(0, 4).map((p) => (
                <img 
                  key={p.id} 
                  src={p.dataUrl} 
                  alt={p.legende || 'Photo'} 
                  className="aspect-square object-cover rounded"
                />
              ))}
            </div>
            {pvApporteur.photos.length > 4 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                +{pvApporteur.photos.length - 4} autres photos
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Observations */}
      {pvApporteur.observations && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{pvApporteur.observations}</p>
          </CardContent>
        </Card>
      )}

      {/* Signature */}
      {pvApporteur.signatureClient && (
        <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
              <PenTool className="h-4 w-4" />
              Signature client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <img 
                src={pvApporteur.signatureClient} 
                alt="Signature" 
                className="h-16 bg-white rounded border"
              />
              <div>
                <p className="font-medium">{pvApporteur.signataireNom}</p>
                <p className="text-xs text-muted-foreground">
                  {pvApporteur.signatureDate && 
                    format(parseISO(pvApporteur.signatureDate), 'dd/MM/yyyy à HH:mm', { locale: fr })}
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
            `/technicien/pv-apporteur/${dossierId}`,
            { state: { dossierId: pvApporteur.dossierId } }
          )}
        >
          Modifier
        </Button>
        <Button 
          onClick={generatePDF} 
          disabled={isGenerating}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? 'Génération...' : 'Télécharger PDF'}
        </Button>
      </div>
    </div>
  );
}

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Code, ClipboardCopy, Mail } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import type { SignaturePayload } from './signatureEngine';
import { generateSignatureHTML } from './signatureEngine';

interface Props {
  payload: SignaturePayload;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function SignatureExport({ payload, canvasRef }: Props) {
  const downloadPNG = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `signature-${payload.profile.first_name}-${payload.profile.last_name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Image téléchargée');
    } catch { toast.error('Erreur lors du téléchargement'); }
  }, [canvasRef, payload.profile]);

  const copyHTML = useCallback(() => {
    const html = generateSignatureHTML(payload);
    navigator.clipboard.writeText(html).then(
      () => toast.success('HTML copié dans le presse-papier'),
      () => toast.error('Erreur de copie')
    );
  }, [payload]);

  const copyImage = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          toast.success('Image copiée');
        } catch { toast.error('Copie image non supportée'); }
      });
    } catch { toast.error('Erreur'); }
  }, [canvasRef]);

  const previewMail = useCallback(() => {
    const html = generateSignatureHTML(payload);
    const w = window.open('', '_blank', 'width=600,height=400');
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>Aperçu signature</title>
        <style>body{font-family:Arial,sans-serif;padding:40px;background:#f9fafb;}</style></head><body>
        <p style="color:#666;margin-bottom:24px;">Aperçu de votre signature email :</p>
        <div style="border-top:1px solid #e5e7eb;padding-top:16px;">${html}</div></body></html>`);
      w.document.close();
    }
  }, [payload]);

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={downloadPNG}><Download className="w-4 h-4 mr-1.5" />PNG Retina</Button>
      <Button variant="outline" size="sm" onClick={copyHTML}><Code className="w-4 h-4 mr-1.5" />Copier HTML</Button>
      <Button variant="outline" size="sm" onClick={copyImage}><ClipboardCopy className="w-4 h-4 mr-1.5" />Copier image</Button>
      <Button variant="outline" size="sm" onClick={previewMail}><Mail className="w-4 h-4 mr-1.5" />Aperçu mail</Button>
    </div>
  );
}

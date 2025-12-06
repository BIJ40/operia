/**
 * Modal pour afficher et télécharger le QR code d'un véhicule ou outil
 */

import { useRef } from 'react';
import QRCode from 'react-qr-code';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, Car, Package } from 'lucide-react';

interface QrCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetType: 'vehicle' | 'tool';
  assetName: string;
  qrToken: string;
}

export function QrCodeModal({
  open,
  onOpenChange,
  assetType,
  assetName,
  qrToken,
}: QrCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const qrUrl = `${window.location.origin}/qr/${qrToken}`;
  const Icon = assetType === 'vehicle' ? Car : Package;

  const handleDownload = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    // Convert SVG to PNG
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 300, 300);
      }

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `qr-${assetType}-${assetName.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${assetName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: system-ui, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
            }
            .asset-name {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 16px;
            }
            .asset-type {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            svg {
              width: 200px;
              height: 200px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="asset-type">${assetType === 'vehicle' ? 'Véhicule' : 'Matériel / EPI'}</div>
            <div class="asset-name">${assetName}</div>
            ${svgData}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            QR Code
          </DialogTitle>
          <DialogDescription>{assetName}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div
            ref={qrRef}
            className="rounded-lg border bg-white p-4"
          >
            <QRCode
              value={qrUrl}
              size={200}
              level="M"
            />
          </div>

          <p className="text-center text-xs text-muted-foreground max-w-[220px]">
            Scannez ce code pour accéder aux informations de maintenance de cet actif.
          </p>

          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              PNG
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';

interface ExportCardProps {
  title: string;
  description: string;
  onExportJson: () => void;
  onExportText: () => void;
  isLoading: boolean;
}

export function ExportCard({ title, description, onExportJson, onExportText, isLoading }: ExportCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={onExportJson} disabled={isLoading} className="w-full" size="lg">
          {isLoading ? 'Export en cours...' : 'Exporter JSON'}
        </Button>
        <Button onClick={onExportText} disabled={isLoading} className="w-full" size="lg" variant="outline">
          {isLoading ? 'Export en cours...' : 'Exporter Texte (.txt)'}
        </Button>
      </CardContent>
    </Card>
  );
}

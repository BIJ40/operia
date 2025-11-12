import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEditor } from '@/contexts/EditorContext';
import { Download, Upload, LogOut, Edit, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function EditorToolbar() {
  const { isAuthenticated, logout } = useAuth();
  const { isEditMode, setIsEditMode, exportData, importData } = useEditor();
  const { toast } = useToast();

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apogee-guide-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export réussi' });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        try {
          await importData(text);
        } catch (error) {
          toast({ title: 'Erreur d\'import', variant: 'destructive' });
        }
      }
    };
    input.click();
  };

  if (!isAuthenticated) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-lg border shadow-lg">
      <Button
        variant={isEditMode ? 'default' : 'outline'}
        size="sm"
        onClick={() => setIsEditMode(!isEditMode)}
      >
        {isEditMode ? <Eye className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
        {isEditMode ? 'Aperçu' : 'Éditer'}
      </Button>
      <Button variant="outline" size="sm" onClick={handleExport}>
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>
      <Button variant="outline" size="sm" onClick={handleImport}>
        <Upload className="w-4 h-4 mr-2" />
        Import
      </Button>
      <Button variant="outline" size="sm" onClick={logout}>
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  );
}

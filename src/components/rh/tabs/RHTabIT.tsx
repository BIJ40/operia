/**
 * Onglet IT & Accès (ultra sensible)
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Laptop, Shield, AlertTriangle, Plus, X } from 'lucide-react';
import { useUpdateItAccess } from '@/hooks/useRHSuivi';
import type { RHCollaborator } from '@/types/rh-suivi';

interface Props {
  collaborator: RHCollaborator;
}

const TOOLS_OPTIONS = [
  'Apogée', 'Email Pro', 'Teams', 'SharePoint', 'OneDrive', 
  'CRM', 'Compta', 'Planning', 'Stock', 'Facturation'
];

export function RHTabIT({ collaborator }: Props) {
  const itAccess = collaborator.it_access;
  const updateIt = useUpdateItAccess();
  
  const [form, setForm] = useState({
    acces_outils: itAccess?.acces_outils || [],
    identifiants_encrypted: itAccess?.identifiants_encrypted || '',
    notes_it: itAccess?.notes_it || '',
  });

  const [customTool, setCustomTool] = useState('');

  const handleSave = () => {
    updateIt.mutate({
      collaboratorId: collaborator.id,
      data: form,
    });
  };

  const toggleTool = (tool: string) => {
    setForm(f => ({
      ...f,
      acces_outils: f.acces_outils.includes(tool)
        ? f.acces_outils.filter(t => t !== tool)
        : [...f.acces_outils, tool],
    }));
  };

  const addCustomTool = () => {
    if (!customTool.trim()) return;
    if (!form.acces_outils.includes(customTool)) {
      setForm(f => ({
        ...f,
        acces_outils: [...f.acces_outils, customTool],
      }));
    }
    setCustomTool('');
  };

  const hasChanges = JSON.stringify(form) !== JSON.stringify({
    acces_outils: itAccess?.acces_outils || [],
    identifiants_encrypted: itAccess?.identifiants_encrypted || '',
    notes_it: itAccess?.notes_it || '',
  });

  return (
    <div className="space-y-6">
      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
        <div>
          <p className="font-medium text-yellow-800 dark:text-yellow-400">Données ultra sensibles</p>
          <p className="text-sm text-yellow-700 dark:text-yellow-500">
            Ces informations sont strictement confidentielles et réservées au responsable RH (N2+).
            Ne jamais partager ces données.
          </p>
        </div>
      </div>

      {/* Accès outils */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Laptop className="h-4 w-4" />
            Accès aux outils
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TOOLS_OPTIONS.map(tool => (
              <div key={tool} className="flex items-center space-x-2">
                <Checkbox
                  id={`tool-${tool}`}
                  checked={form.acces_outils.includes(tool)}
                  onCheckedChange={() => toggleTool(tool)}
                />
                <label
                  htmlFor={`tool-${tool}`}
                  className="text-sm cursor-pointer"
                >
                  {tool}
                </label>
              </div>
            ))}
          </div>

          {/* Outils personnalisés */}
          {form.acces_outils.filter(t => !TOOLS_OPTIONS.includes(t)).length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t">
              {form.acces_outils.filter(t => !TOOLS_OPTIONS.includes(t)).map(tool => (
                <Badge key={tool} variant="secondary" className="gap-1">
                  {tool}
                  <button onClick={() => toggleTool(tool)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Ajouter outil */}
          <div className="flex gap-2">
            <Input
              value={customTool}
              onChange={(e) => setCustomTool(e.target.value)}
              placeholder="Autre outil..."
              className="max-w-xs"
              onKeyDown={(e) => e.key === 'Enter' && addCustomTool()}
            />
            <Button variant="outline" size="icon" onClick={addCustomTool}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Identifiants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Identifiants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Notes identifiants</Label>
            <Textarea
              value={form.identifiants_encrypted}
              onChange={(e) => setForm(f => ({ ...f, identifiants_encrypted: e.target.value }))}
              placeholder="Informations d'identification (seront chiffrées)..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              ⚠️ Ces informations sont stockées de manière sécurisée.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notes IT */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes IT</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.notes_it}
            onChange={(e) => setForm(f => ({ ...f, notes_it: e.target.value }))}
            placeholder="Remarques IT, configurations spéciales..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={!hasChanges || updateIt.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}

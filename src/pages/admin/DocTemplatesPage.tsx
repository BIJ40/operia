import { useEffect, useState } from "react";
import { Plus, FileText, Upload, Trash2, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useDocTemplates,
  useCreateDocTemplate,
  useUpdateDocTemplate,
  useDeleteDocTemplate,
  useParseDocxTokens,
  DocTemplate,
} from "@/hooks/docgen/useDocTemplates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import TokenConfigEditor from "@/components/docgen/TokenConfigEditor";
import { TokenConfig, extractTokenNames } from "@/lib/docgen/tokenConfig";
import { usePersistedDialog } from "@/hooks/usePersistedState";

const CATEGORIES = [
  { value: "attestation", label: "Attestations" },
  { value: "contrat", label: "Contrats" },
  { value: "lettre", label: "Lettres" },
  { value: "formulaire", label: "Formulaires" },
  { value: "autre", label: "Autre" },
];

export default function DocTemplatesPage() {
  const { globalRole, agencyId } = useAuth();
  const { data: templates = [], isLoading } = useDocTemplates();
  const createTemplate = useCreateDocTemplate();
  const updateTemplate = useUpdateDocTemplate();
  const deleteTemplate = useDeleteDocTemplate();
  const parseTokens = useParseDocxTokens();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [isTokenConfigOpen, setTokenConfigOpen, tokenConfigTemplateId] =
    usePersistedDialog("doc-templates-token-config");
  const [editingTemplate, setEditingTemplate] = useState<DocTemplate | null>(null);

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "autre",
    scope: "global" as "global" | "agency",
    docx_storage_path: "",
    tokens: [] as (string | TokenConfig)[],
  });

  const isAdmin = globalRole === "platform_admin" || globalRole === "superadmin";

  // Restaure la popup de config au retour sur l'onglet navigateur (sessionStorage)
  useEffect(() => {
    if (!isTokenConfigOpen) return;
    if (!tokenConfigTemplateId) return;
    if (editingTemplate?.id === tokenConfigTemplateId) return;

    const template = templates.find((t) => t.id === tokenConfigTemplateId);
    if (template) {
      setEditingTemplate(template);
    } else {
      setTokenConfigOpen(false, null);
    }
  }, [isTokenConfigOpen, tokenConfigTemplateId, templates, editingTemplate?.id, setTokenConfigOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".docx")) {
      toast.error("Seuls les fichiers .docx sont acceptés");
      return;
    }

    setUploadingFile(true);

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const path = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("doc-templates")
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Parse tokens from the document
      const result = await parseTokens.mutateAsync(path);

      setNewTemplate(prev => ({
        ...prev,
        docx_storage_path: path,
        tokens: result.tokens,
      }));

      toast.success(`${result.count} tokens détectés`);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreate = async () => {
    if (!newTemplate.name || !newTemplate.docx_storage_path) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    await createTemplate.mutateAsync({
      name: newTemplate.name,
      description: newTemplate.description || undefined,
      category: newTemplate.category,
      scope: newTemplate.scope,
      docx_storage_path: newTemplate.docx_storage_path,
      tokens: newTemplate.tokens,
      agency_id: newTemplate.scope === "agency" ? agencyId : undefined,
    });

    setShowCreateDialog(false);
    setNewTemplate({
      name: "",
      description: "",
      category: "autre",
      scope: "global",
      docx_storage_path: "",
      tokens: [],
    });
  };

  const togglePublish = async (templateId: string, currentState: boolean) => {
    await updateTemplate.mutateAsync({
      id: templateId,
      is_published: !currentState,
    });
  };

  const handleSaveTokenConfigs = async (configs: TokenConfig[]) => {
    if (!editingTemplate) return;

    await updateTemplate.mutateAsync({
      id: editingTemplate.id,
      tokens: configs,
    });

    setEditingTemplate(null);
    setTokenConfigOpen(false, null);
  };

  const getTokenCount = (tokens: (string | TokenConfig)[]): number => {
    return extractTokenNames(tokens).length;
  };

  return (
    <div className="container mx-auto max-w-app py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Templates</h1>
          <p className="text-muted-foreground">
            Créez et gérez les templates de documents
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un template</DialogTitle>
              <DialogDescription>
                Uploadez un fichier DOCX avec des tokens entre doubles accolades
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du template *</Label>
                <Input
                  id="name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="Ex: Attestation de travail"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Description du template..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Portée</Label>
                  <Select
                    value={newTemplate.scope}
                    onValueChange={(v) => setNewTemplate({ ...newTemplate, scope: v as "global" | "agency" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isAdmin && <SelectItem value="global">Global (toutes agences)</SelectItem>}
                      <SelectItem value="agency">Agence uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fichier DOCX *</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept=".docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="docx-upload"
                  />
                  <label htmlFor="docx-upload" className="cursor-pointer">
                    {uploadingFile ? (
                      <div className="text-muted-foreground">Upload en cours...</div>
                    ) : newTemplate.docx_storage_path ? (
                      <div className="space-y-2">
                        <FileText className="h-8 w-8 mx-auto text-green-500" />
                        <p className="text-sm text-green-600">Fichier uploadé</p>
                        <p className="text-xs text-muted-foreground">
                          {newTemplate.tokens.length} tokens détectés
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Cliquez pour uploader un fichier .docx
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {newTemplate.tokens.length > 0 && (
                <div className="space-y-2">
                  <Label>Tokens détectés ({getTokenCount(newTemplate.tokens)})</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                    <div className="flex flex-wrap gap-1">
                      {extractTokenNames(newTemplate.tokens).map((token) => (
                        <Badge key={token} variant="secondary">
                          {`{{${token}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={createTemplate.isPending || !newTemplate.docx_storage_path}>
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates disponibles</CardTitle>
          <CardDescription>Liste des templates de documents configurés</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun template configuré</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Portée</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Publié</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.scope === "global" ? "default" : "secondary"}>
                        {template.scope === "global" ? "Global" : "Agence"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getTokenCount(template.tokens || [])}</TableCell>
                    <TableCell>
                      <Switch
                        checked={template.is_published}
                        onCheckedChange={() => togglePublish(template.id, template.is_published)}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(template.created_at), "dd MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTemplate(template);
                          setTokenConfigOpen(true, template.id);
                        }}
                        title="Configurer les champs"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTemplate.mutate(template.id)}
                        disabled={deleteTemplate.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Token Config Editor Dialog */}
      {editingTemplate && (
        <TokenConfigEditor
          open={isTokenConfigOpen && !!editingTemplate}
          onOpenChange={(open) => {
            if (!open) {
              // Radix peut "dismiss" au changement d'onglet navigateur (focus-out) : on ignore.
              if (document.hidden) return;
              setEditingTemplate(null);
              setTokenConfigOpen(false, null);
            }
          }}
          tokens={editingTemplate.tokens || []}
          templateName={editingTemplate.name}
          onSave={handleSaveTokenConfigs}
          isSaving={updateTemplate.isPending}
        />
      )}
    </div>
  );
}

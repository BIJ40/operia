import { useState } from "react";
import { Plus, FileText, Eye, Download, Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDocTemplates, DocTemplate } from "@/hooks/docgen/useDocTemplates";
import { useDocInstances, useCreateDocInstance, useDeleteDocInstance, DocInstance } from "@/hooks/docgen/useDocInstances";
import { useCollaborators } from "@/hooks/useCollaborators";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DocInstanceEditor from "@/components/docgen/DocInstanceEditor";

export default function DocGenPage() {
  const { data: templates = [], isLoading: loadingTemplates } = useDocTemplates();
  const { data: instances = [], isLoading: loadingInstances } = useDocInstances();
  const { collaborators = [] } = useCollaborators();
  const createInstance = useCreateDocInstance();
  const deleteInstance = useDeleteDocInstance();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<DocInstance | null>(null);
  const [newDoc, setNewDoc] = useState({
    name: "",
    template_id: "",
    collaborator_id: "",
  });

  const publishedTemplates = templates.filter(t => t.is_published);

  const handleCreate = async () => {
    if (!newDoc.name || !newDoc.template_id) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    await createInstance.mutateAsync({
      name: newDoc.name,
      template_id: newDoc.template_id,
      collaborator_id: newDoc.collaborator_id || undefined,
    });

    setShowCreateDialog(false);
    setNewDoc({ name: "", template_id: "", collaborator_id: "" });
  };

  const handleDownload = async (path: string | null, name: string) => {
    if (!path) return;

    const { data, error } = await supabase.storage
      .from("doc-generated")
      .createSignedUrl(path, 60);

    if (error) {
      toast.error("Erreur lors du téléchargement");
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Brouillon</Badge>;
      case "preview":
        return <Badge variant="outline">Aperçu</Badge>;
      case "finalized":
        return <Badge className="bg-green-500">Finalisé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (selectedInstance) {
    return (
      <DocInstanceEditor
        instance={selectedInstance}
        onBack={() => setSelectedInstance(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Génération de Documents</h2>
          <p className="text-sm text-muted-foreground">Créez des documents personnalisés à partir de templates</p>
        </div>
        <Button 
          disabled={publishedTemplates.length === 0}
          onClick={() => setShowCreateDialog(true)}
          className="rounded-xl bg-warm-orange/90 hover:bg-warm-orange text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau document
        </Button>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Créer un nouveau document</DialogTitle>
              <DialogDescription>
                Sélectionnez un template et remplissez les informations
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du document *</Label>
                <Input
                  id="name"
                  value={newDoc.name}
                  onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                  placeholder="Ex: Attestation de travail - Jean Dupont"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Template *</Label>
                <Select
                  value={newDoc.template_id}
                  onValueChange={(v) => setNewDoc({ ...newDoc, template_id: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner un template" />
                  </SelectTrigger>
                  <SelectContent>
                    {publishedTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="collaborator">Collaborateur (optionnel)</Label>
                <Select
                  value={newDoc.collaborator_id || "__NONE__"}
                  onValueChange={(v) => setNewDoc({ ...newDoc, collaborator_id: v === "__NONE__" ? "" : v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner un collaborateur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">Aucun</SelectItem>
                    {collaborators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="rounded-xl">
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={createInstance.isPending} className="rounded-xl">
                Créer
              </Button>
            </div>
          </DialogContent>
      </Dialog>

      {publishedTemplates.length === 0 && (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Aucun template disponible</h3>
            <p className="text-sm text-muted-foreground">
              Les templates doivent être créés et publiés par un administrateur
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-border/50 shadow-sm backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warm-orange/70 to-accent/50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            Mes documents
          </CardTitle>
          <CardDescription>Documents générés à partir des templates</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInstances ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : instances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun document généré
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-medium">Nom</TableHead>
                    <TableHead className="hidden sm:table-cell text-muted-foreground font-medium">Template</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Statut</TableHead>
                    <TableHead className="hidden sm:table-cell text-muted-foreground font-medium">Date</TableHead>
                    <TableHead className="text-right text-muted-foreground font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instances.map((instance) => (
                    <TableRow key={instance.id} className="border-border/30 hover:bg-muted/30">
                      <TableCell className="font-medium">{instance.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{instance.template?.name || "-"}</TableCell>
                      <TableCell>{getStatusBadge(instance.status)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {format(new Date(instance.created_at), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {instance.status !== "finalized" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedInstance(instance)}
                              title="Modifier"
                              className="rounded-lg hover:bg-warm-orange/10"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedInstance(instance)}
                            title="Voir"
                            className="rounded-lg hover:bg-warm-blue/10"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {instance.final_path && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(instance.final_path, instance.name)}
                              className="rounded-lg hover:bg-warm-green/10"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteInstance.mutate(instance.id)}
                            disabled={deleteInstance.isPending}
                            className="rounded-lg hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

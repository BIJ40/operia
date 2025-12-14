/**
 * Page back-office N2 - Gestion des demandes RH
 */
import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Loader2, 
  FileText, 
  Check, 
  X, 
  Download, 
  Eye,
  Send,
  FolderPlus,
  Search,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useAgencyRequests,
  useApproveRequest,
  useRejectRequest,
  useGenerateLetter,
  usePublishLetter,
  useGetLetterDownloadUrl,
  useAddLetterToVault,
  type RHRequestWithEmployee,
  type RequestStatus,
} from "@/hooks/rh-backoffice";

const STATUS_CONFIG: Record<RequestStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Brouillon", variant: "outline" },
  SUBMITTED: { label: "En attente", variant: "secondary" },
  IN_PROGRESS: { label: "En cours", variant: "default" },
  APPROVED: { label: "Approuvée", variant: "default" },
  REJECTED: { label: "Refusée", variant: "destructive" },
};

const TYPE_LABELS: Record<string, string> = {
  EPI_RENEWAL: "Renouvellement EPI",
  LEAVE: "Demande de congé",
  DOCUMENT: "Demande de document",
  OTHER: "Autre",
};

export default function DemandesRHPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "processed">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<RHRequestWithEmployee | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  // Queries
  const { data: pendingRequests = [], isLoading: loadingPending } = useAgencyRequests({
    status: ["SUBMITTED", "IN_PROGRESS"],
  });
  const { data: processedRequests = [], isLoading: loadingProcessed } = useAgencyRequests({
    status: ["APPROVED", "REJECTED"],
  });

  // Mutations
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const generateLetter = useGenerateLetter();
  const publishLetter = usePublishLetter();
  const getDownloadUrl = useGetLetterDownloadUrl();
  const addToVault = useAddLetterToVault();

  const requests = activeTab === "pending" ? pendingRequests : processedRequests;
  const isLoading = activeTab === "pending" ? loadingPending : loadingProcessed;

  const filteredRequests = requests.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const employeeName = `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.toLowerCase();
    return employeeName.includes(term) || TYPE_LABELS[r.request_type]?.toLowerCase().includes(term);
  });

  const handleApprove = useCallback(async () => {
    if (!selectedRequest) return;
    await approveRequest.mutateAsync({ requestId: selectedRequest.id });
    setSelectedRequest(null);
  }, [selectedRequest, approveRequest]);

  const handleReject = useCallback(async () => {
    if (!selectedRequest || !rejectComment.trim()) return;
    await rejectRequest.mutateAsync({ requestId: selectedRequest.id, comment: rejectComment });
    setRejectDialogOpen(false);
    setRejectComment("");
    setSelectedRequest(null);
  }, [selectedRequest, rejectComment, rejectRequest]);

  const handleGenerateLetter = useCallback(async () => {
    if (!selectedRequest) return;
    await generateLetter.mutateAsync(selectedRequest.id);
    // Refresh request data
    setSelectedRequest((prev) => prev ? { ...prev, generated_letter_path: "generated" } : null);
  }, [selectedRequest, generateLetter]);

  const handleDownloadLetter = useCallback(async () => {
    if (!selectedRequest) return;
    const result = await getDownloadUrl.mutateAsync(selectedRequest.id);
    if (result?.url) {
      window.open(result.url, "_blank");
    }
  }, [selectedRequest, getDownloadUrl]);

  const handlePublishLetter = useCallback(async () => {
    if (!selectedRequest) return;
    await publishLetter.mutateAsync(selectedRequest.id);
    setSelectedRequest((prev) => prev ? { ...prev, employee_can_download: true } : null);
  }, [selectedRequest, publishLetter]);

  const handleAddToVault = useCallback(async () => {
    if (!selectedRequest || !selectedRequest.employee?.id) return;
    await addToVault.mutateAsync({
      requestId: selectedRequest.id,
      collaboratorId: selectedRequest.employee.id,
    });
  }, [selectedRequest, addToVault]);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <PageHeader 
        title="Demandes RH" 
        backTo="/rh/suivi"
      />

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "processed")}>
        <TabsList>
          <TabsTrigger value="pending">
            En attente
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processed">Traitées</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucune demande {activeTab === "pending" ? "en attente" : "traitée"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <RequestCard 
                  key={request.id} 
                  request={request} 
                  onSelect={() => setSelectedRequest(request)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <Sheet open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedRequest && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {TYPE_LABELS[selectedRequest.request_type]}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Statut</span>
                  <Badge variant={STATUS_CONFIG[selectedRequest.status].variant}>
                    {STATUS_CONFIG[selectedRequest.status].label}
                  </Badge>
                </div>

                {/* Employee */}
                <div>
                  <span className="text-sm text-muted-foreground">Collaborateur</span>
                  <p className="font-medium">
                    {selectedRequest.employee?.first_name} {selectedRequest.employee?.last_name}
                  </p>
                  {selectedRequest.employee?.email && (
                    <p className="text-sm text-muted-foreground">{selectedRequest.employee.email}</p>
                  )}
                </div>

                {/* Date */}
                <div>
                  <span className="text-sm text-muted-foreground">Date de demande</span>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.created_at), "PPP à HH:mm", { locale: fr })}
                  </p>
                </div>

                {/* Payload */}
                {selectedRequest.payload && Object.keys(selectedRequest.payload).length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground mb-2 block">Détails</span>
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        {selectedRequest.payload.items && Array.isArray(selectedRequest.payload.items) && (
                          <div>
                            <span className="text-xs text-muted-foreground">Équipements demandés</span>
                            <ul className="list-disc pl-4 text-sm">
                              {(selectedRequest.payload.items as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {selectedRequest.payload.description && (
                          <div>
                            <span className="text-xs text-muted-foreground">Description</span>
                            <p className="text-sm">{String(selectedRequest.payload.description)}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Decision comment */}
                {selectedRequest.decision_comment && (
                  <div>
                    <span className="text-sm text-muted-foreground">Commentaire de décision</span>
                    <p className="text-sm bg-muted p-3 rounded-md mt-1">{selectedRequest.decision_comment}</p>
                  </div>
                )}

                {/* Letter status */}
                {selectedRequest.generated_letter_path && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Lettre générée</span>
                    </div>
                    {selectedRequest.employee_can_download && (
                      <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                        ✓ Disponible pour le salarié
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-4 border-t">
                  {selectedRequest.status === "SUBMITTED" && (
                    <>
                      <Button 
                        onClick={handleApprove} 
                        className="w-full"
                        disabled={approveRequest.isPending}
                      >
                        {approveRequest.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Approuver
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => setRejectDialogOpen(true)}
                        className="w-full"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Refuser
                      </Button>
                    </>
                  )}

                  {selectedRequest.status === "APPROVED" && (
                    <>
                      {!selectedRequest.generated_letter_path && (
                        <Button 
                          onClick={handleGenerateLetter}
                          className="w-full"
                          disabled={generateLetter.isPending}
                        >
                          {generateLetter.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4 mr-2" />
                          )}
                          Générer la lettre
                        </Button>
                      )}

                      {selectedRequest.generated_letter_path && (
                        <>
                          <Button 
                            variant="outline"
                            onClick={handleDownloadLetter}
                            className="w-full"
                            disabled={getDownloadUrl.isPending}
                          >
                            {getDownloadUrl.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            Télécharger la lettre
                          </Button>

                          {!selectedRequest.employee_can_download && (
                            <Button 
                              variant="secondary"
                              onClick={handlePublishLetter}
                              className="w-full"
                              disabled={publishLetter.isPending}
                            >
                              {publishLetter.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              Publier au salarié
                            </Button>
                          )}

                          <Button 
                            variant="outline"
                            onClick={handleAddToVault}
                            className="w-full"
                            disabled={addToVault.isPending}
                          >
                            {addToVault.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FolderPlus className="h-4 w-4 mr-2" />
                            )}
                            Ajouter au coffre RH
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Motif du refus (obligatoire)..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectComment.trim() || rejectRequest.isPending}
            >
              {rejectRequest.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Request card component
function RequestCard({ 
  request, 
  onSelect 
}: { 
  request: RHRequestWithEmployee; 
  onSelect: () => void;
}) {
  const statusConfig = STATUS_CONFIG[request.status];

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onSelect}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">
              {request.employee?.first_name} {request.employee?.last_name}
            </p>
            <p className="text-sm text-muted-foreground">
              {TYPE_LABELS[request.request_type]} • {format(new Date(request.created_at), "dd/MM/yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {request.generated_letter_path && (
            <Badge variant="outline" className="text-green-600">
              <FileText className="h-3 w-3 mr-1" />
              Lettre
            </Badge>
          )}
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

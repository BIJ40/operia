/**
 * Page Documents Technicien Mobile
 */
import { FileText, Download, FolderOpen, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyDocuments, useDownloadDocument, useMyCollaborator } from "@/hooks/rh-employee";
import { CollaboratorNotConfigured } from "@/components/rh-employee/CollaboratorNotConfigured";
import { DOCUMENT_TYPES } from "@/types/collaboratorDocument";

const getDocTypeLabel = (docType: string) => DOCUMENT_TYPES.find((dt) => dt.value === docType)?.label || docType;

export default function TechDocumentsPage() {
  const { data: collaborator, isLoading: isLoadingCollaborator } = useMyCollaborator();
  const { data: documents, isLoading } = useMyDocuments();
  const { downloadDocument } = useDownloadDocument();

  if (isLoadingCollaborator || isLoading) {
    return <div className="p-4 space-y-4"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>;
  }

  if (!collaborator) {
    return <div className="p-4 space-y-4"><Link to="/t/rh-parc"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link><CollaboratorNotConfigured /></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/t/rh-parc"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold flex-1">Mes documents</h1>
        <Badge variant="secondary"><FileText className="w-3 h-3 mr-1" />{documents?.length || 0}</Badge>
      </div>
      {!documents?.length ? (
        <Card><CardContent className="py-12 text-center"><FolderOpen className="w-10 h-10 mx-auto text-muted-foreground mb-2" /><p>Aucun document</p></CardContent></Card>
      ) : (
        <div className="space-y-2">{documents.map((doc) => (
          <Card key={doc.id}><CardContent className="p-3 flex items-center gap-3">
            <div className="flex-1"><p className="font-medium text-sm">{doc.title}</p><Badge variant="outline" className="text-xs">{getDocTypeLabel(doc.doc_type)}</Badge></div>
            <Button variant="ghost" size="icon" onClick={() => downloadDocument(doc.file_path, doc.file_name)}><Download className="w-4 h-4" /></Button>
          </CardContent></Card>
        ))}</div>
      )}
    </div>
  );
}

/**
 * Page Coffre-Fort RH - Documents visibles par le salarié
 */
import React from "react";
import { FileText, Download, Calendar, File, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyDocuments, useDownloadDocument, useMyCollaborator } from "@/hooks/rh-employee";
import { CollaboratorNotConfigured } from "@/components/rh-employee/CollaboratorNotConfigured";
import { DOCUMENT_TYPES } from "@/types/collaboratorDocument";

const getDocTypeLabel = (docType: string) => {
  const found = DOCUMENT_TYPES.find((dt) => dt.value === docType);
  return found?.label || docType;
};

const getDocTypeIcon = (docType: string) => {
  switch (docType) {
    case "PAYSLIP":
      return "💰";
    case "CONTRACT":
      return "📝";
    case "AVENANT":
      return "📄";
    case "ATTESTATION":
      return "📋";
    case "MEDICAL_VISIT":
      return "🏥";
    default:
      return "📁";
  }
};

export default function MesCoffreRHPage() {
  const { data: collaborator, isLoading: isLoadingCollaborator } = useMyCollaborator();
  const { data: documents, isLoading, error } = useMyDocuments();
  const { downloadDocument } = useDownloadDocument();

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      await downloadDocument(filePath, fileName);
    } catch (e) {
      console.error("Erreur téléchargement:", e);
    }
  };

  if (isLoadingCollaborator || isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="Mon Coffre-Fort RH"
          subtitle="Vos documents RH personnels"
          backTo="/rh"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Cas: pas de collaborateur lié
  if (!collaborator) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="Mon Coffre-Fort RH"
          subtitle="Vos documents RH personnels"
          backTo="/rh"
        />
        <CollaboratorNotConfigured />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <PageHeader
          title="Mon Coffre-Fort RH"
          subtitle="Vos documents RH personnels"
          backTo="/rh"
        />
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Erreur lors du chargement de vos documents.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Mon Coffre-Fort RH"
        subtitle="Vos documents RH personnels"
        backTo="/rh"
      />

      {/* Stats */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <FileText className="w-4 h-4 mr-2" />
          {documents?.length || 0} document{(documents?.length || 0) > 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Documents Grid */}
      {!documents || documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Aucun document disponible</h3>
            <p className="text-muted-foreground text-sm">
              Vos documents RH apparaîtront ici lorsqu'ils seront mis à disposition.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getDocTypeIcon(doc.doc_type)}</span>
                    <Badge variant="outline" className="text-xs">
                      {getDocTypeLabel(doc.doc_type)}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc.file_path, doc.file_name)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
                <CardTitle className="text-base mt-2">{doc.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {doc.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {doc.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {doc.period_month && doc.period_year && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(
                        new Date(doc.period_year, doc.period_month - 1),
                        "MMMM yyyy",
                        { locale: fr }
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <File className="w-3 h-3" />
                    {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} Ko` : "N/A"}
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDownload(doc.file_path, doc.file_name)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

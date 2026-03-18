/**
 * DocumentsSection — Upload + list + validate/reject project cost documents & salary documents.
 * Validation never auto-creates costs or profiles (Phase 2 manual workflow).
 */
import { useRef, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Check, X, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { listProjectCostDocuments, listSalaryDocuments, listCollaboratorsMinimal } from '@/repositories/profitabilityRepository';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import type { ProjectCostDocument, SalaryDocument, ValidationStatus } from '@/types/projectProfitability';

interface DocumentsSectionProps {
  projectId: string;
}

const VALIDATION_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-muted text-muted-foreground' },
  validated: { label: 'Validé', className: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Rejeté', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

function getFileName(path: string): string {
  return path.split('/').pop() ?? path;
}

export function DocumentsSection({ projectId }: DocumentsSectionProps) {
  const { agencyId } = useEffectiveAuth();
  const costFileRef = useRef<HTMLInputElement>(null);
  const salaryFileRef = useRef<HTMLInputElement>(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>('');

  const {
    uploadCostDocument,
    uploadSalaryDocument,
    validateCostDocument,
    validateSalaryDocument,
  } = useDocumentUpload(projectId);

  // Cost documents
  const { data: costDocs = [] } = useQuery<ProjectCostDocument[]>({
    queryKey: ['project-cost-documents', agencyId, projectId],
    enabled: !!agencyId && !!projectId,
    queryFn: () => listProjectCostDocuments(agencyId!, projectId),
  });

  // Salary documents
  const { data: salaryDocs = [] } = useQuery<SalaryDocument[]>({
    queryKey: ['salary-documents', agencyId],
    enabled: !!agencyId,
    queryFn: () => listSalaryDocuments(agencyId!),
  });

  // Collaborators for salary upload picker
  const { data: collaborators = [] } = useQuery({
    queryKey: ['collaborators-minimal', agencyId],
    enabled: !!agencyId,
    queryFn: () => listCollaboratorsMinimal(agencyId!),
  });

  const handleCostFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadCostDocument.mutate(file);
    if (costFileRef.current) costFileRef.current.value = '';
  };

  const handleSalaryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedCollaborator) {
      uploadSalaryDocument.mutate({ file, collaboratorId: selectedCollaborator });
    }
    if (salaryFileRef.current) salaryFileRef.current.value = '';
  };

  const handleValidateCostDoc = (id: string, status: ValidationStatus) => {
    validateCostDocument.mutate({ id, status });
  };

  const handleValidateSalaryDoc = (id: string, status: ValidationStatus) => {
    validateSalaryDocument.mutate({ id, status });
  };

  return (
    <div className="space-y-6">
      {/* ── Factures fournisseur ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Factures fournisseur</h4>
          <div>
            <input ref={costFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleCostFileChange} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => costFileRef.current?.click()}
              disabled={uploadCostDocument.isPending}
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              Uploader
            </Button>
          </div>
        </div>

        {costDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">Aucune facture uploadée</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fichier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costDocs.map((doc) => {
                const badge = VALIDATION_BADGE[doc.validation_status] ?? VALIDATION_BADGE.pending;
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="flex items-center gap-2 text-sm">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {getFileName(doc.file_path)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Facture fournisseur
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${badge.className}`}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {doc.validation_status !== 'validated' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleValidateCostDoc(doc.id, 'validated')} title="Valider">
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        )}
                        {doc.validation_status !== 'rejected' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleValidateCostDoc(doc.id, 'rejected')} title="Rejeter">
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Bulletins de salaire ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Bulletins de salaire</h4>
          <div className="flex items-center gap-2">
            <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Sélectionner un collaborateur" />
              </SelectTrigger>
              <SelectContent>
                {collaborators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.last_name} {c.first_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input ref={salaryFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleSalaryFileChange} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => salaryFileRef.current?.click()}
              disabled={!selectedCollaborator || uploadSalaryDocument.isPending}
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              Uploader
            </Button>
          </div>
        </div>

        {salaryDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">Aucun bulletin uploadé</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fichier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salaryDocs.map((doc) => {
                const badge = VALIDATION_BADGE[doc.validation_status] ?? VALIDATION_BADGE.pending;
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="flex items-center gap-2 text-sm">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {getFileName(doc.file_path)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                        Bulletin de salaire
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${badge.className}`}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {doc.validation_status !== 'validated' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleValidateSalaryDoc(doc.id, 'validated')} title="Valider">
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        )}
                        {doc.validation_status !== 'rejected' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleValidateSalaryDoc(doc.id, 'rejected')} title="Rejeter">
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

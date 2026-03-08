import React, { useState, useMemo } from "react";
import { useAgencyTechnicians, AgencyTechnician } from "@/hooks/useAgencyTechnicians";
import { useEpiCatalog, EpiCatalogItem, EPI_CATEGORIES } from "@/hooks/epi/useEpiCatalog";
import { useEpiAssignments, EpiAssignment, useCreateEpiAssignment, useUpdateEpiAssignment } from "@/hooks/epi/useEpiAssignments";
import { useAuthCore } from "@/contexts/AuthCoreContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Minus, HardHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { EpiCellEditDialog } from "./EpiCellEditDialog";
import { format } from "date-fns";
import { addDays } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
interface EpiAssignmentMatrixProps {
  agencyId: string;
}

type CellStatus = "assigned" | "missing" | "na" | "empty";

interface CellData {
  status: CellStatus;
  assignment?: EpiAssignment;
  isNA?: boolean;
}

// Store NA status in localStorage for now (could be moved to DB later)
const NA_STORAGE_KEY = "epi_na_cells";

function getNAKey(collaboratorId: string, epiId: string) {
  return `${collaboratorId}:${epiId}`;
}

function loadNACells(): Set<string> {
  try {
    const stored = localStorage.getItem(NA_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveNACells(cells: Set<string>) {
  localStorage.setItem(NA_STORAGE_KEY, JSON.stringify([...cells]));
}

export function EpiAssignmentMatrix({ agencyId }: EpiAssignmentMatrixProps) {
  const { user } = useAuth();
  // Use profiles (accounts) as source of truth, not collaborators table
  const { data: technicians = [], isLoading: techLoading } = useAgencyTechnicians({ agencyId });
  const { data: catalog = [], isLoading: catalogLoading } = useEpiCatalog(agencyId);
  const { data: assignments = [], isLoading: assignLoading } = useEpiAssignments({ agencyId, status: "active" });

  const createAssignment = useCreateEpiAssignment();
  const updateAssignment = useUpdateEpiAssignment();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    collaborator: { id: string; name: string };
    epiItem: EpiCatalogItem;
    assignment?: EpiAssignment;
  } | null>(null);

  const [naCells, setNACells] = useState<Set<string>>(loadNACells);

  // Technicians are already filtered by is_active in the hook
  const activeTechnicians = useMemo(() => technicians, [technicians]);

  // Sort EPI by category
  const sortedCatalog = useMemo(() => {
    return [...catalog].sort((a, b) => {
      const catA = EPI_CATEGORIES.findIndex(c => c.value === a.category);
      const catB = EPI_CATEGORIES.findIndex(c => c.value === b.category);
      if (catA !== catB) return catA - catB;
      return a.name.localeCompare(b.name);
    });
  }, [catalog]);

  // Build assignment map: collaboratorId -> epiId -> assignment
  const assignmentMap = useMemo(() => {
    const map = new Map<string, Map<string, EpiAssignment>>();
    assignments.forEach(a => {
      if (!map.has(a.user_id)) {
        map.set(a.user_id, new Map());
      }
      map.get(a.user_id)!.set(a.catalog_item_id, a);
    });
    return map;
  }, [assignments]);

  const getCellData = (collaboratorId: string, epiId: string): CellData => {
    const naKey = getNAKey(collaboratorId, epiId);
    if (naCells.has(naKey)) {
      return { status: "na", isNA: true };
    }
    
    const assignment = assignmentMap.get(collaboratorId)?.get(epiId);
    if (assignment) {
      return { status: "assigned", assignment };
    }
    
    return { status: "missing" };
  };

  const handleCellDoubleClick = (
    tech: AgencyTechnician,
    epiItem: EpiCatalogItem
  ) => {
    const assignment = assignmentMap.get(tech.id)?.get(epiItem.id);
    setSelectedCell({
      collaborator: { id: tech.id, name: `${tech.first_name} ${tech.last_name}` },
      epiItem,
      assignment,
    });
    setEditDialogOpen(true);
  };

  const handleSaveCell = async (data: {
    size?: string;
    assigned_at?: string;
    serial_number?: string;
    notes?: string;
  }) => {
    if (!selectedCell || !user?.id) return;

    const epiItem = selectedCell.epiItem;
    
    // Remove from NA if was NA
    const naKey = getNAKey(selectedCell.collaborator.id, epiItem.id);
    if (naCells.has(naKey)) {
      const newNA = new Set(naCells);
      newNA.delete(naKey);
      setNACells(newNA);
      saveNACells(newNA);
    }

    // Calculate expected renewal
    let expectedRenewal: string | null = null;
    if (epiItem.default_renewal_days && data.assigned_at) {
      expectedRenewal = format(
        addDays(new Date(data.assigned_at), epiItem.default_renewal_days),
        "yyyy-MM-dd'T'HH:mm:ss"
      );
    }

    if (selectedCell.assignment) {
      // Update existing
      await updateAssignment.mutateAsync({
        id: selectedCell.assignment.id,
        size: data.size || null,
        serial_number: data.serial_number || null,
        notes: data.notes || null,
        expected_renewal_at: expectedRenewal,
      });
    } else {
      // Create new
      await createAssignment.mutateAsync({
        agency_id: agencyId,
        user_id: selectedCell.collaborator.id,
        catalog_item_id: epiItem.id,
        size: data.size || null,
        serial_number: data.serial_number || null,
        assigned_by_user_id: user.id,
        notes: data.notes || null,
        expected_renewal_at: expectedRenewal,
      });
    }
  };

  const handleRemoveAssignment = async () => {
    if (!selectedCell?.assignment) return;
    await updateAssignment.mutateAsync({
      id: selectedCell.assignment.id,
      status: "returned",
      returned_at: new Date().toISOString(),
    });
  };

  const handleMarkNA = (value: boolean) => {
    if (!selectedCell) return;
    const naKey = getNAKey(selectedCell.collaborator.id, selectedCell.epiItem.id);
    const newNA = new Set(naCells);
    if (value) {
      newNA.add(naKey);
      // If there was an assignment, remove it
      if (selectedCell.assignment) {
        handleRemoveAssignment();
      }
    } else {
      newNA.delete(naKey);
    }
    setNACells(newNA);
    saveNACells(newNA);
  };

  const isLoading = techLoading || catalogLoading || assignLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (activeTechnicians.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <HardHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Aucun utilisateur actif avec un compte</p>
      </div>
    );
  }

  if (sortedCatalog.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <HardHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Aucun EPI dans le catalogue</p>
        <p className="text-sm">Ajoutez des EPI au catalogue d'abord</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold sticky left-0 bg-muted/50 z-10 min-w-[180px]">
                Technicien
              </TableHead>
              {sortedCatalog.map((epi) => {
                const catLabel = EPI_CATEGORIES.find(c => c.value === epi.category)?.label || epi.category;
                return (
                  <TableHead 
                    key={epi.id} 
                    className="text-center min-w-[100px] text-xs"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-semibold">{epi.name}</span>
                      <span className="text-muted-foreground text-[10px]">{catLabel}</span>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeTechnicians.map((tech) => (
              <TableRow key={tech.id} className="hover:bg-muted/30">
                <TableCell className="font-medium sticky left-0 bg-background z-10">
                  {tech.first_name} {tech.last_name}
                </TableCell>
                {sortedCatalog.map((epi) => {
                  const cellData = getCellData(tech.id, epi.id);
                  return (
                    <TableCell
                      key={epi.id}
                      className={cn(
                        "text-center cursor-pointer transition-colors p-2",
                        cellData.status === "assigned" && "bg-green-50 hover:bg-green-100",
                        cellData.status === "missing" && "bg-red-50 hover:bg-red-100",
                        cellData.status === "na" && "bg-muted hover:bg-muted/80"
                      )}
                      onDoubleClick={() => handleCellDoubleClick(tech, epi)}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center">
                            {cellData.status === "assigned" && (
                              <Check className="h-5 w-5 text-green-600" />
                            )}
                            {cellData.status === "missing" && (
                              <X className="h-5 w-5 text-red-500" />
                            )}
                            {cellData.status === "na" && (
                              <Minus className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {cellData.status === "assigned" && cellData.assignment && (
                            <div className="text-xs space-y-1">
                              <p className="font-medium">{epi.name}</p>
                              {cellData.assignment.size && <p>Taille: {cellData.assignment.size}</p>}
                              <p>Attribué le: {format(new Date(cellData.assignment.assigned_at), "dd/MM/yyyy")}</p>
                              {cellData.assignment.expected_renewal_at && (
                                <p>Renouvellement: {format(new Date(cellData.assignment.expected_renewal_at), "dd/MM/yyyy")}</p>
                              )}
                            </div>
                          )}
                          {cellData.status === "missing" && (
                            <p className="text-xs">Double-clic pour attribuer</p>
                          )}
                          {cellData.status === "na" && (
                            <p className="text-xs">Non applicable</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {selectedCell && (
        <EpiCellEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          collaboratorName={selectedCell.collaborator.name}
          epiItem={selectedCell.epiItem}
          existingAssignment={selectedCell.assignment}
          onSave={handleSaveCell}
          onRemove={selectedCell.assignment ? handleRemoveAssignment : undefined}
          onMarkNotApplicable={handleMarkNA}
          isNotApplicable={naCells.has(getNAKey(selectedCell.collaborator.id, selectedCell.epiItem.id))}
        />
      )}
    </TooltipProvider>
  );
}

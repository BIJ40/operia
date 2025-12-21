import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EquipmentItem, EQUIPMENT_CATEGORIES, EQUIPMENT_STATUSES } from "@/hooks/epi/useEquipmentInventory";
import { Wrench, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EquipmentTableProps {
  equipment: EquipmentItem[];
  agencyId: string;
  onEdit?: (item: EquipmentItem) => void;
  onDelete?: (item: EquipmentItem) => void;
}

export function EquipmentTable({ equipment, agencyId, onEdit, onDelete }: EquipmentTableProps) {
  if (equipment.length === 0) {
    return (
      <div className="text-center py-12">
        <Wrench className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          Aucun matériel enregistré
        </h3>
        <p className="text-sm text-muted-foreground">
          Ajoutez du matériel pour suivre votre inventaire.
        </p>
      </div>
    );
  }

  const getCategoryLabel = (category: string) => {
    return EQUIPMENT_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getStatusBadge = (status: string) => {
    const st = EQUIPMENT_STATUSES.find((s) => s.value === status);
    if (!st) return <Badge variant="outline">{status}</Badge>;
    return <Badge className={st.color}>{st.label}</Badge>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Catégorie</TableHead>
          <TableHead>Marque / Modèle</TableHead>
          <TableHead>N° série</TableHead>
          <TableHead>Emplacement</TableHead>
          <TableHead>État</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {equipment.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>
              <Badge variant="outline">{getCategoryLabel(item.category)}</Badge>
            </TableCell>
            <TableCell>
              {item.brand || item.model ? (
                <span className="text-sm text-muted-foreground">
                  {[item.brand, item.model].filter(Boolean).join(" ")}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              {item.serial_number ? (
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {item.serial_number}
                </code>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>{item.location || <span className="text-muted-foreground">-</span>}</TableCell>
            <TableCell>{getStatusBadge(item.status)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(item)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(item)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

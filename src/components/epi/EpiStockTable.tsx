import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EpiStock } from "@/hooks/epi/useEpiStock";
import { EPI_CATEGORIES } from "@/hooks/epi/useEpiCatalog";
import { AlertTriangle, Package } from "lucide-react";

interface EpiStockTableProps {
  stock: EpiStock[];
  agencyId: string;
}

export function EpiStockTable({ stock, agencyId }: EpiStockTableProps) {
  if (stock.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Aucun stock configuré</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Article</TableHead>
          <TableHead>Catégorie</TableHead>
          <TableHead>Taille</TableHead>
          <TableHead>Emplacement</TableHead>
          <TableHead className="text-right">Quantité</TableHead>
          <TableHead className="text-right">Seuil</TableHead>
          <TableHead>État</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stock.map((item) => {
          const category = EPI_CATEGORIES.find((c) => c.value === item.catalog_item?.category);
          const isLow = item.quantity <= item.reorder_threshold;
          const isEmpty = item.quantity === 0;

          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {item.catalog_item?.name}
              </TableCell>
              <TableCell>{category?.label}</TableCell>
              <TableCell>{item.size || "—"}</TableCell>
              <TableCell>{item.location || "—"}</TableCell>
              <TableCell className="text-right">
                <span className={isEmpty ? "text-red-600 font-bold" : isLow ? "text-orange-600 font-medium" : ""}>
                  {item.quantity}
                </span>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {item.reorder_threshold}
              </TableCell>
              <TableCell>
                {isEmpty ? (
                  <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                    <AlertTriangle className="h-3 w-3" />
                    Rupture
                  </Badge>
                ) : isLow ? (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-1 w-fit">
                    <AlertTriangle className="h-3 w-3" />
                    Stock bas
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    OK
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

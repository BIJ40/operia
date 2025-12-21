import React, { useMemo, useState } from "react";
import { ROUTES } from "@/config/routes";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HardHat, Plus, Search, Package, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEpiStock, useEpiStockLowAlert } from "@/hooks/epi/useEpiStock";
import { EpiStockTable } from "@/components/epi/EpiStockTable";
import { AddEpiStockDialog } from "@/components/epi/AddEpiStockDialog";

/**
 * Page Matériel & EPI
 * Route: /rh/epi
 */
export default function EPIPage() {
  const { agencyId, user, isAuthLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const effectiveAgencyId = agencyId || undefined;

  const { data: stock = [], isLoading: stockLoading } = useEpiStock(effectiveAgencyId);
  const { data: lowStock = [] } = useEpiStockLowAlert(effectiveAgencyId);

  const filteredStock = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stock;
    return stock.filter((s) => {
      const name = s.catalog_item?.name?.toLowerCase() || "";
      const category = s.catalog_item?.category?.toLowerCase() || "";
      const location = s.location?.toLowerCase() || "";
      const size = s.size?.toLowerCase() || "";
      return name.includes(q) || category.includes(q) || location.includes(q) || size.includes(q);
    });
  }, [stock, searchQuery]);

  const canAdd = !!effectiveAgencyId && !!user && !isAuthLoading;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Matériel & EPI"
        subtitle="Gestion du matériel et des équipements de protection individuelle"
        backTo={ROUTES.rh.index}
        backLabel="RH & PARC"
      />

      <AddEpiStockDialog open={addOpen} onOpenChange={setAddOpen} agencyId={effectiveAgencyId} />

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un équipement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="gap-2" onClick={() => setAddOpen(true)} disabled={!canAdd}>
          <Plus className="h-4 w-4" />
          Ajouter un équipement
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stock.length}</p>
              <p className="text-sm text-muted-foreground">Équipements</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-secondary">
              <HardHat className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredStock.length}</p>
              <p className="text-sm text-muted-foreground">Résultats</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{lowStock.length}</p>
              <p className="text-sm text-muted-foreground">Stock bas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Stock équipements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stockLoading ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : filteredStock.length === 0 ? (
            <div className="text-center py-12">
              <HardHat className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Aucun équipement enregistré
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ajoutez votre premier équipement pour démarrer le suivi du stock.
              </p>
              <Button variant="outline" className="gap-2" onClick={() => setAddOpen(true)} disabled={!canAdd}>
                <Plus className="h-4 w-4" />
                Ajouter le premier équipement
              </Button>
            </div>
          ) : (
            <EpiStockTable stock={filteredStock} agencyId={effectiveAgencyId!} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

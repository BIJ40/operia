import React, { useMemo, useState } from "react";
import { ROUTES } from "@/config/routes";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  HardHat, 
  Plus, 
  Search, 
  Package, 
  AlertTriangle, 
  Wrench,
  Users,
  Settings
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEpiStock, useEpiStockLowAlert } from "@/hooks/epi/useEpiStock";
import { useEquipmentInventory } from "@/hooks/epi/useEquipmentInventory";
import { useEpiCatalog } from "@/hooks/epi/useEpiCatalog";
import { EpiStockTable } from "@/components/epi/EpiStockTable";
import { EquipmentTable } from "@/components/epi/EquipmentTable";
import { AddEpiStockDialog } from "@/components/epi/AddEpiStockDialog";
import { AddEquipmentDialog } from "@/components/epi/AddEquipmentDialog";
import { AddEpiCatalogDialog } from "@/components/epi/AddEpiCatalogDialog";
import { N2EpiDashboard } from "@/components/epi/N2EpiDashboard";

/**
 * Page Matériel & EPI
 * Route: /rh/epi
 */
export default function EPIPage() {
  const { agencyId, user, isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("epi");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialogs
  const [addEpiStockOpen, setAddEpiStockOpen] = useState(false);
  const [addEpiCatalogOpen, setAddEpiCatalogOpen] = useState(false);
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false);

  const effectiveAgencyId = agencyId || undefined;

  // EPI data
  const { data: stock = [], isLoading: stockLoading } = useEpiStock(effectiveAgencyId);
  const { data: lowStock = [] } = useEpiStockLowAlert(effectiveAgencyId);
  const { data: catalog = [] } = useEpiCatalog(effectiveAgencyId);
  
  // Equipment data
  const { data: equipment = [], isLoading: equipmentLoading } = useEquipmentInventory(effectiveAgencyId);

  // Filter EPI stock
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

  // Filter Equipment
  const filteredEquipment = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return equipment;
    return equipment.filter((e) => {
      const name = e.name?.toLowerCase() || "";
      const category = e.category?.toLowerCase() || "";
      const brand = e.brand?.toLowerCase() || "";
      const model = e.model?.toLowerCase() || "";
      const location = e.location?.toLowerCase() || "";
      return name.includes(q) || category.includes(q) || brand.includes(q) || model.includes(q) || location.includes(q);
    });
  }, [equipment, searchQuery]);

  const canAdd = !!effectiveAgencyId && !!user && !isAuthLoading;

  // Count equipment by status
  const equipmentFonctionnel = equipment.filter((e) => e.status === "fonctionnel").length;
  const equipmentHS = equipment.filter((e) => e.status === "hs" || e.status === "perdu").length;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Matériel & EPI"
        subtitle="Gestion du matériel et des équipements de protection individuelle"
        backTo={ROUTES.rh.index}
        backLabel="RH & PARC"
      />

      {/* Dialogs */}
      <AddEpiStockDialog open={addEpiStockOpen} onOpenChange={setAddEpiStockOpen} agencyId={effectiveAgencyId} />
      <AddEpiCatalogDialog open={addEpiCatalogOpen} onOpenChange={setAddEpiCatalogOpen} agencyId={effectiveAgencyId} />
      <AddEquipmentDialog open={addEquipmentOpen} onOpenChange={setAddEquipmentOpen} agencyId={effectiveAgencyId} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <TabsList>
            <TabsTrigger value="epi" className="gap-2">
              <HardHat className="h-4 w-4" />
              EPI
              {lowStock.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {lowStock.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="materiel" className="gap-2">
              <Wrench className="h-4 w-4" />
              Matériel
              {equipmentHS > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {equipmentHS}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="gestion" className="gap-2">
              <Users className="h-4 w-4" />
              Gestion EPI
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {activeTab === "epi" && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  onClick={() => setAddEpiCatalogOpen(true)} 
                  disabled={!canAdd}
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Nouvel EPI</span>
                </Button>
                <Button className="gap-2" onClick={() => setAddEpiStockOpen(true)} disabled={!canAdd}>
                  <Plus className="h-4 w-4" />
                  Ajouter au stock
                </Button>
              </div>
            )}
            
            {activeTab === "materiel" && (
              <Button className="gap-2" onClick={() => setAddEquipmentOpen(true)} disabled={!canAdd}>
                <Plus className="h-4 w-4" />
                Ajouter un matériel
              </Button>
            )}
          </div>
        </div>

        {/* EPI Tab */}
        <TabsContent value="epi" className="space-y-6 mt-0">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{catalog.length}</p>
                  <p className="text-sm text-muted-foreground">Types d'EPI</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-secondary">
                  <HardHat className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stock.length}</p>
                  <p className="text-sm text-muted-foreground">En stock</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-50">
                  <Search className="h-6 w-6 text-blue-600" />
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

          {/* Stock Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5" />
                Stock EPI
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockLoading ? (
                <div className="text-sm text-muted-foreground">Chargement…</div>
              ) : filteredStock.length === 0 ? (
                <div className="text-center py-12">
                  <HardHat className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Aucun EPI en stock
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ajoutez des EPI au stock pour démarrer le suivi.
                  </p>
                  <Button variant="outline" className="gap-2" onClick={() => setAddEpiStockOpen(true)} disabled={!canAdd}>
                    <Plus className="h-4 w-4" />
                    Ajouter le premier EPI
                  </Button>
                </div>
              ) : (
                <EpiStockTable stock={filteredStock} agencyId={effectiveAgencyId!} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matériel Tab */}
        <TabsContent value="materiel" className="space-y-6 mt-0">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Wrench className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{equipment.length}</p>
                  <p className="text-sm text-muted-foreground">Total matériels</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-50">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{equipmentFonctionnel}</p>
                  <p className="text-sm text-muted-foreground">Fonctionnels</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-50">
                  <Search className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredEquipment.length}</p>
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
                  <p className="text-2xl font-bold">{equipmentHS}</p>
                  <p className="text-sm text-muted-foreground">HS / Perdu</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Equipment Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Inventaire matériel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {equipmentLoading ? (
                <div className="text-sm text-muted-foreground">Chargement…</div>
              ) : (
                <EquipmentTable 
                  equipment={filteredEquipment} 
                  agencyId={effectiveAgencyId!}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gestion EPI Tab (N2 Dashboard) */}
        <TabsContent value="gestion" className="mt-0">
          {effectiveAgencyId && user?.id ? (
            <N2EpiDashboard agencyId={effectiveAgencyId} currentUserId={user.id} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Chargement...
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Admin Helpi - Moteur de connaissance unifié
 * Interface d'administration pour l'indexation et la recherche RAG
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usePersistedTab } from "@/hooks/usePersistedTab";
import { HelpiDashboardTab } from "@/components/admin/helpi/HelpiDashboardTab";
import { HelpiIndexerTab } from "@/components/admin/helpi/HelpiIndexerTab";
import { HelpiTesterTab } from "@/components/admin/helpi/HelpiTesterTab";
import { HelpiConfigTab } from "@/components/admin/helpi/HelpiConfigTab";
import { Brain } from "lucide-react";

export default function AdminHelpi() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = usePersistedTab("helpi-admin-tab", "dashboard");

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Helpi – Moteur de connaissance</h1>
          <p className="text-sm text-muted-foreground">
            Indexation et recherche RAG unifiée pour guides, documents et FAQ
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="indexer">Indexer</TabsTrigger>
          <TabsTrigger value="tester">Tester</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <HelpiDashboardTab />
        </TabsContent>

        <TabsContent value="indexer" className="mt-6">
          <HelpiIndexerTab />
        </TabsContent>

        <TabsContent value="tester" className="mt-6">
          <HelpiTesterTab />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <HelpiConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

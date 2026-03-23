/**
 * Admin Helpi - Moteur de connaissance unifié
 * Interface d'administration pour l'indexation et la recherche RAG
 * Fusionné avec AdminChatbotRag
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usePersistedTab } from "@/hooks/usePersistedTab";
import { 
  HelpiDashboardTab, 
  HelpiIndexerTab, 
  HelpiTesterTab, 
  HelpiConfigTab,
  HelpiQuestionsTab,
  HelpiGapsTab,
  HelpiStatsTab,
  HelpiIngestionTab,
} from "@/components/admin/helpi";
import { Brain } from "lucide-react";

export default function AdminHelpi() {
  const { hasGlobalRole } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = usePersistedTab("helpi-admin-tab", "dashboard");
  
  // V2: Vérification par rôle global
  const canAccess = hasGlobalRole('platform_admin');

  useEffect(() => {
    if (!canAccess) {
      navigate("/");
    }
  }, [canAccess, navigate]);

  if (!canAccess) return null;

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Helpi – Moteur de connaissance</h1>
          <p className="text-sm text-muted-foreground">
            Indexation, recherche RAG unifiée et gestion des questions
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 lg:w-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="indexer">Indexer</TabsTrigger>
          <TabsTrigger value="tester">Tester</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="gaps">Lacunes</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="ingestion">Ingestion</TabsTrigger>
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

        <TabsContent value="questions" className="mt-6">
          <HelpiQuestionsTab />
        </TabsContent>

        <TabsContent value="gaps" className="mt-6">
          <HelpiGapsTab />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <HelpiStatsTab />
        </TabsContent>

        <TabsContent value="ingestion" className="mt-6">
          <HelpiIngestionTab />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <HelpiConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

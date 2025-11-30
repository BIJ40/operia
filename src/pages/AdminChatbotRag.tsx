import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, FileText, Database, MessageSquare, Bug, FolderTree, BarChart3, HelpCircle, Activity } from 'lucide-react';

// Import tab components
import { 
  RagSourcesTab, 
  RagDocumentsTab, 
  RagIndexTab, 
  RagQuestionsTab, 
  RagDebugTab,
  RagCoverageTab,
  RagGapsTab,
  RagStatsTab,
} from '@/components/admin/chatbot-rag';

export default function AdminChatbotRag() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('sources');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bot className="w-8 h-8 text-helpconfort-blue" />
          Chatbot & RAG
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestion centralisée du chatbot Mme MICHU et de l'index RAG
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-6">
          <TabsTrigger value="sources" className="gap-1">
            <FolderTree className="w-4 h-4" />
            <span className="hidden sm:inline">Sources</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="index" className="gap-1">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Index</span>
          </TabsTrigger>
          <TabsTrigger value="coverage" className="gap-1">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Couverture</span>
          </TabsTrigger>
          <TabsTrigger value="gaps" className="gap-1">
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Lacunes</span>
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-1">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Questions</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="debug" className="gap-1">
            <Bug className="w-4 h-4" />
            <span className="hidden sm:inline">Debug</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
          <RagSourcesTab />
        </TabsContent>

        <TabsContent value="documents">
          <RagDocumentsTab />
        </TabsContent>

        <TabsContent value="index">
          <RagIndexTab />
        </TabsContent>

        <TabsContent value="coverage">
          <RagCoverageTab />
        </TabsContent>

        <TabsContent value="gaps">
          <RagGapsTab />
        </TabsContent>

        <TabsContent value="questions">
          <RagQuestionsTab />
        </TabsContent>

        <TabsContent value="stats">
          <RagStatsTab />
        </TabsContent>

        <TabsContent value="debug">
          <RagDebugTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

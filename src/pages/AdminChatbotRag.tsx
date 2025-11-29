import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, FileText, Database, MessageSquare, Bug, FolderTree } from 'lucide-react';

// Import tab components
import { RagSourcesTab } from '@/components/admin/chatbot-rag/RagSourcesTab';
import { RagDocumentsTab } from '@/components/admin/chatbot-rag/RagDocumentsTab';
import { RagIndexTab } from '@/components/admin/chatbot-rag/RagIndexTab';
import { RagQuestionsTab } from '@/components/admin/chatbot-rag/RagQuestionsTab';
import { RagDebugTab } from '@/components/admin/chatbot-rag/RagDebugTab';

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
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="sources" className="gap-2">
            <FolderTree className="w-4 h-4" />
            Sources
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="index" className="gap-2">
            <Database className="w-4 h-4" />
            Index
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="debug" className="gap-2">
            <Bug className="w-4 h-4" />
            Debug
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

        <TabsContent value="questions">
          <RagQuestionsTab />
        </TabsContent>

        <TabsContent value="debug">
          <RagDebugTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

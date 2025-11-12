import { useParams, Navigate } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';
import { Sidebar } from '@/components/Sidebar';
import { EditorToolbar } from '@/components/EditorToolbar';
import { Card } from '@/components/ui/card';
import * as Icons from 'lucide-react';

export default function BlockDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { blocks } = useEditor();

  const block = blocks.find((b) => b.slug === slug);

  if (!block) {
    return <Navigate to="/" replace />;
  }

  const IconComponent = block.icon && (Icons as any)[block.icon]
    ? (Icons as any)[block.icon]
    : null;
  const Icon = IconComponent as React.ComponentType<{ className?: string }> | null;

  const subBlocks = blocks.filter((b) => b.parentId === block.id);

  return (
    <div className="flex min-h-screen">
      <Sidebar blocks={blocks} currentBlockId={block.id} />
      
      <div className="flex-1">
        <EditorToolbar />
        
        <main className="container mx-auto px-8 py-8">
          <Card className="p-8 mb-6">
            <div className="flex items-start gap-4">
              {Icon && (
                <div className="flex-shrink-0">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-4">{block.title}</h1>
                <div
                  className="prose prose-lg dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: block.content }}
                />
              </div>
            </div>
          </Card>

          {subBlocks.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Sous-sections</h2>
              {subBlocks.map((subBlock) => (
                <Card key={subBlock.id} className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{subBlock.title}</h3>
                  <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: subBlock.content }}
                  />
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

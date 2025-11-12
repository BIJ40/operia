import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { useEditor } from '@/contexts/EditorContext';

export function Header() {
  const { blocks } = useEditor();
  
  // Find FAQ category
  const faqCategory = blocks.find(
    b => b.type === 'category' && b.title.toLowerCase().includes('faq')
  );

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-foreground hover:opacity-80 transition-opacity">
          GUIDE
        </Link>
        
        {faqCategory && (
          <Link 
            to={`/category/${faqCategory.slug}`}
            className="hover:opacity-80 transition-opacity"
          >
            <HelpCircle className="w-8 h-8 text-primary" />
          </Link>
        )}
      </div>
    </header>
  );
}

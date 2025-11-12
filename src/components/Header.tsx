import { Link } from 'react-router-dom';
import { HelpCircle, Home } from 'lucide-react';
import { useEditor } from '@/contexts/EditorContext';

export function Header() {
  const { blocks } = useEditor();
  
  // Find FAQ category
  const faqCategory = blocks.find(
    b => b.type === 'category' && b.title.toLowerCase().includes('faq')
  );

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <Link 
          to="/" 
          className="flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-lg hover:shadow-md transition-all"
        >
          <Home className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">GUIDE</span>
        </Link>
        
        {faqCategory && (
          <Link 
            to={`/category/${faqCategory.slug}`}
            className="flex items-center gap-2 px-4 py-2 bg-card border-2 rounded-lg hover:shadow-md transition-all"
          >
            <HelpCircle className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">FAQ</span>
          </Link>
        )}
      </div>
    </header>
  );
}

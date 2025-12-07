/**
 * DashboardWidgets - Page de gestion des widgets
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { WidgetLibrary } from '@/components/dashboard/WidgetLibrary';
import { ArrowLeft, LayoutGrid } from 'lucide-react';

export default function DashboardWidgets() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" />
            Bibliothèque de Widgets
          </h1>
          <p className="text-muted-foreground">
            Ajoutez ou retirez des widgets de votre dashboard
          </p>
        </div>
      </div>

      <WidgetLibrary />
    </div>
  );
}

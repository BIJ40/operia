import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo: string;
  backLabel?: string;
  rightElement?: React.ReactNode;
  className?: string;
}

/**
 * Composant PageHeader unifié pour toutes les pages
 * - Lien retour vers page parente
 * - Titre en bleu à gauche
 * - Élément optionnel à droite (filtre, sélecteur, etc.)
 */
export function PageHeader({ 
  title, 
  subtitle, 
  backTo, 
  backLabel = "Retour", 
  rightElement,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Lien retour */}
      <Link 
        to={backTo}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>{backLabel}</span>
      </Link>
      
      {/* Ligne titre + élément droit */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-helpconfort-blue-dark to-helpconfort-blue-lighter bg-clip-text text-transparent">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {rightElement && (
          <div className="shrink-0">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}

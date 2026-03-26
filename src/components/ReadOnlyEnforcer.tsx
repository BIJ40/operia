/**
 * ReadOnlyEnforcer - Composant global qui bloque TOUTES les actions de mutation
 * quand l'utilisateur est en mode lecture seule.
 * 
 * Stratégie multi-couches :
 * 1. Attribut data-read-only sur <body> → CSS global désactive les éléments interactifs
 * 2. Intercepte les soumissions de formulaires
 * 3. Intercepte les clics sur les boutons d'action (sauf navigation)
 * 4. Affiche un bandeau permanent "Mode lecture seule"
 */

import { useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';

const READONLY_TOAST_ID = 'global-read-only-block';

function showReadOnlyToast() {
  toast.info('🔒 Mode lecture seule — cette action est désactivée.', {
    id: READONLY_TOAST_ID,
    duration: 2500,
  });
}

export function ReadOnlyEnforcer() {
  const { isReadOnly } = useProfile();
  const { isAuthLoading } = useAuthCore();

  useEffect(() => {
    if (isAuthLoading) return;

    if (isReadOnly) {
      document.body.setAttribute('data-read-only', 'true');
    } else {
      document.body.removeAttribute('data-read-only');
    }

    return () => {
      document.body.removeAttribute('data-read-only');
    };
  }, [isReadOnly, isAuthLoading]);

  // Intercept form submissions globally
  useEffect(() => {
    if (!isReadOnly) return;

    const handleSubmit = (e: Event) => {
      const target = e.target as HTMLElement;
      // Allow search forms and login forms
      if (target.closest('[data-readonly-exempt]')) return;
      
      e.preventDefault();
      e.stopPropagation();
      showReadOnlyToast();
    };

    document.addEventListener('submit', handleSubmit, true);
    return () => document.removeEventListener('submit', handleSubmit, true);
  }, [isReadOnly]);

  // Intercept clicks on action buttons
  useEffect(() => {
    if (!isReadOnly) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('button, [role="button"], [role="menuitem"]') as HTMLElement | null;
      
      if (!button) return;
      // Allow links and buttons inside prose content (guide content, not mutation actions)
      if (button.closest('.prose')) return;
      // Allow exempt elements (navigation, tabs, accordions, search, filters, collapsibles)
      if (button.closest('[data-readonly-exempt]')) return;
      if (button.closest('nav')) return;
      if (button.closest('[role="tablist"]')) return;
      if (button.closest('[data-radix-collection-item]') && button.closest('[role="tablist"]')) return;
      
      // Allow dialog close buttons
      if (button.closest('[data-dismiss]') || button.getAttribute('aria-label')?.includes('Close')) return;
      // Allow accordion triggers, collapsible triggers, tabs
      if (button.hasAttribute('data-radix-collection-item')) return;
      if (button.getAttribute('data-state') === 'open' || button.getAttribute('data-state') === 'closed') {
        // Could be accordion/collapsible - check if it's inside a navigation context
        const isAccordion = button.closest('[data-orientation]');
        const isCollapsible = button.getAttribute('aria-expanded') !== null && !button.closest('form');
        if (isAccordion || isCollapsible) return;
      }
      // Allow select triggers and dropdown triggers (for viewing/filtering)
      if (button.closest('[role="combobox"]') || button.getAttribute('role') === 'combobox') return;
      // Allow sidebar navigation
      if (button.closest('aside')) return;
      // Allow scroll buttons and pagination (read-only navigation)
      if (button.closest('[data-readonly-exempt]')) return;
      
      // Determine if this is a "mutation" button
      const buttonText = button.textContent?.toLowerCase() || '';
      const isMutationButton = 
        buttonText.includes('supprimer') ||
        buttonText.includes('delete') ||
        buttonText.includes('créer') ||
        buttonText.includes('create') ||
        buttonText.includes('enregistrer') ||
        buttonText.includes('sauvegarder') ||
        buttonText.includes('save') ||
        buttonText.includes('modifier') ||
        buttonText.includes('edit') ||
        buttonText.includes('ajouter') ||
        buttonText.includes('add') ||
        buttonText.includes('confirmer') ||
        buttonText.includes('valider') ||
        buttonText.includes('archiver') ||
        buttonText.includes('désactiver') ||
        buttonText.includes('réactiver') ||
        buttonText.includes('importer') ||
        buttonText.includes('exporter') ||
        buttonText.includes('publier') ||
        buttonText.includes('upload') ||
        buttonText.includes('télécharger') ||
        buttonText.includes('envoyer') ||
        buttonText.includes('submit');

      // Also block buttons with destructive/primary variant that aren't navigation
      const isDestructive = button.classList.contains('bg-destructive') || 
        button.closest('.bg-destructive');
      
      // Block if it's clearly a mutation button, or if it has type="submit"
      const isSubmitButton = button.getAttribute('type') === 'submit';
      
      // Block icon-only action buttons (edit, delete, etc.)
      const hasActionIcon = button.querySelector('.lucide-trash, .lucide-trash-2, .lucide-pencil, .lucide-plus, .lucide-save, .lucide-upload, .lucide-send');
      
      if (isMutationButton || isDestructive || isSubmitButton || hasActionIcon) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showReadOnlyToast();
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isReadOnly]);

  if (!isReadOnly) return null;

  // Floating read-only banner
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] bg-accent text-accent-foreground px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium pointer-events-none select-none animate-in fade-in slide-in-from-bottom-4">
      <Eye className="w-4 h-4" />
      Mode lecture seule — Aucune modification possible
    </div>
  );
}

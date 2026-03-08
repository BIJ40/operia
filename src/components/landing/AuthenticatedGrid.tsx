import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useProfile } from '@/contexts/ProfileContext';
import helpConfortServicesImg from '@/assets/help-confort-services.png';
import { MesIndicateursCard } from '@/components/landing/MesIndicateursCard';
import { ActionsAMenerCard } from '@/components/landing/ActionsAMenerCard';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCard } from './SortableCard';
import { HomeCard, ColorPreset, getColorClass, getIconComponent } from './types';

interface AuthenticatedGridProps {
  homeCards: HomeCard[];
  isEditMode: boolean;
  isAdmin: boolean;
  editingId: string | null;
  editTitle: string;
  editDescription: string;
  editLink: string;
  editIcon: string;
  editColor: ColorPreset;
  onEditTitleChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditLinkChange: (value: string) => void;
  onEditIconChange: (value: string) => void;
  onEditColorChange: (value: ColorPreset) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
}

export function AuthenticatedGrid({
  homeCards,
  isEditMode,
  isAdmin,
  editingId,
  editTitle,
  editDescription,
  editLink,
  editIcon,
  editColor,
  onEditTitleChange,
  onEditDescriptionChange,
  onEditLinkChange,
  onEditIconChange,
  onEditColorChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onDragEnd,
}: AuthenticatedGridProps) {
  const { toast } = useToast();
  const { hasAccessToScope } = usePermissions();
  const { agence } = useProfile();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const IconComponent = (iconName: string) => getIconComponent(iconName, Icons);

  const logoCard = homeCards.find(c => c.is_logo);
  const actionsCard = homeCards.find(c => 
    c.link?.includes('/actions-a-mener') || 
    (c.title?.toLowerCase().includes('actions') && c.title?.toLowerCase().includes('mener'))
  );
  const cardsWithoutLogoAndActions = homeCards.filter(c => 
    !c.is_logo && c.id !== actionsCard?.id
  );
  
  const supportCardIndex = cardsWithoutLogoAndActions.findIndex(c => 
    c.title?.toLowerCase().includes('support') || 
    c.title?.toLowerCase().includes('demande') ||
    c.link?.includes('/mes-demandes') ||
    c.link?.includes('/support')
  );

  // Mode édition admin
  if (isEditMode && isAdmin) {
    const reorderedCards = [...cardsWithoutLogoAndActions];
    if (actionsCard && supportCardIndex !== -1) {
      reorderedCards.splice(supportCardIndex + 1, 0, actionsCard);
    } else if (actionsCard) {
      reorderedCards.push(actionsCard);
    }

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={reorderedCards.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {reorderedCards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                editingId={editingId}
                editTitle={editTitle}
                editDescription={editDescription}
                editLink={editLink}
                editIcon={editIcon}
                editColor={editColor}
                isEditMode={isEditMode}
                onEditTitleChange={onEditTitleChange}
                onEditDescriptionChange={onEditDescriptionChange}
                onEditLinkChange={onEditLinkChange}
                onEditIconChange={onEditIconChange}
                onEditColorChange={onEditColorChange}
                onSave={onSave}
                onCancel={onCancel}
                onEdit={onEdit}
                onDelete={onDelete}
                getColorClass={getColorClass}
                IconComponent={IconComponent}
              />
            ))}
          </div>
        </SortableContext>
        
        {/* Logo FIXE en dessous de toute la grille - centré */}
        {logoCard && (
          <div className="flex justify-center mt-6">
            <div className="w-full max-w-md">
              <div className="relative">
                <div className="absolute top-2 left-2 bg-yellow-100 dark:bg-yellow-900 rounded px-2 py-1 z-10 text-xs font-semibold text-yellow-800 dark:text-yellow-200">
                  🔒 FIXÉ
                </div>
                <img
                  src={helpConfortServicesImg}
                  alt={logoCard.title}
                  className="w-full h-auto pointer-events-none select-none opacity-90"
                  draggable="false"
                />
              </div>
            </div>
          </div>
        )}
      </DndContext>
    );
  }

  // Mode lecture
  const regularCards = homeCards.filter(c => !c.is_logo && c.id !== actionsCard?.id);
  const allElements: JSX.Element[] = [];
  let actionsRendered = false;

  regularCards.forEach((currentCard, index) => {
    const Icon = IconComponent(currentCard.icon || 'BookOpen');
    const isLarge = (currentCard.size === 'large');
    
    const isSupportCard = currentCard.title?.toLowerCase().includes('support') || 
      currentCard.title?.toLowerCase().includes('demande') ||
      currentCard.link?.includes('/mes-demandes') ||
      currentCard.link?.includes('/support');
    
    if (isSupportCard && logoCard) {
      const isLocked = false;
      
      const supportElement = isLocked ? (
        <div
          onClick={() => {
            toast({
              title: 'Accès restreint',
              description: "Vous n'avez pas les permissions pour accéder à cette section",
              variant: 'destructive',
            });
          }}
          className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-full px-4 py-2 hover:shadow-lg hover:border-primary/40 transition-all duration-300 cursor-pointer opacity-60 flex items-center gap-2"
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Lock className="w-8 h-8 text-destructive drop-shadow-lg" />
          </div>
          <Icon className="w-12 h-12 text-primary flex-shrink-0 opacity-50" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{currentCard.title}</h2>
            <p className="text-xs text-muted-foreground truncate">{currentCard.description}</p>
          </div>
        </div>
      ) : (
        <Link
          to={currentCard.link || '#'}
          className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-full px-4 py-2 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 flex items-center gap-2"
        >
          <Icon className="w-12 h-12 text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{currentCard.title}</h2>
            <p className="text-xs text-muted-foreground truncate">{currentCard.description}</p>
          </div>
        </Link>
      );
      
      allElements.push(
        <div key={currentCard.id} className="flex flex-col gap-3 min-h-[240px]">
          {supportElement}
          <div className="flex-1 flex items-center justify-center p-2">
            <img 
              src={helpConfortServicesImg} 
              alt="Help Confort Services" 
              className="w-full max-w-[180px] h-auto object-contain opacity-90"
              draggable="false"
            />
          </div>
        </div>
      );
    } else if (currentCard.link?.includes('/mes-indicateurs')) {
      const scope = 'mes_indicateurs';
      const isLocked = !hasAccessToScope(scope) || !agence;
      
      if (!isLocked && agence) {
        allElements.push(
          <div key={currentCard.id} className={isLarge ? "min-h-[240px]" : ""}>
            <ApiToggleProvider>
              <AgencyProvider>
                <MesIndicateursCard />
              </AgencyProvider>
            </ApiToggleProvider>
          </div>
        );
      } else {
        allElements.push(
          <div
            key={currentCard.id}
            onClick={() => {
              toast({
                title: 'Accès restreint',
                description: "Vous n'avez pas les permissions pour accéder à cette section",
                variant: 'destructive',
              });
            }}
            className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl p-4 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 cursor-pointer opacity-60 min-h-[240px] flex items-center justify-center"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Lock className="w-12 h-12 text-destructive drop-shadow-lg" />
            </div>
          </div>
        );
      }
    } else {
      let scope: 'apogee' | 'apporteurs' | 'helpconfort' | 'mes_indicateurs' | null = null;
      if (currentCard.link?.includes('/apogee')) scope = 'apogee';
      else if (currentCard.link?.includes('/apporteur')) scope = 'apporteurs';
      else if (currentCard.link?.includes('/helpconfort')) scope = 'helpconfort';
      
      const isLocked = scope ? !hasAccessToScope(scope) : false;

      const baseClassName = isLarge
        ? "group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl p-6 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 min-h-[240px] flex flex-col"
        : "group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-full px-4 py-2 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 flex items-center gap-2";
      
      if (isLocked) {
        allElements.push(
          <div
            key={currentCard.id}
            onClick={() => {
              toast({
                title: 'Accès restreint',
                description: "Vous n'avez pas les permissions pour accéder à cette section",
                variant: 'destructive',
              });
            }}
            className={`${baseClassName} cursor-pointer opacity-60`}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Lock className="w-12 h-12 text-destructive drop-shadow-lg" />
            </div>
            <Icon className={isLarge ? "w-12 h-12 text-primary mb-4 opacity-50" : "w-12 h-12 text-primary flex-shrink-0 opacity-50"} />
            <div className={isLarge ? "" : "flex-1 min-w-0"}>
              <h2 className={isLarge ? "text-xl font-bold text-foreground mb-2" : "text-lg font-bold text-foreground truncate"}>{currentCard.title}</h2>
              <p className={isLarge ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground truncate"}>{currentCard.description}</p>
            </div>
          </div>
        );
      } else if (currentCard.link && currentCard.link !== '#') {
        const isDiffusion = currentCard.link?.includes('diffusion');
        
        allElements.push(
          <Link
            key={currentCard.id}
            to={currentCard.link}
            className={`${baseClassName} relative`}
          >
            {isDiffusion && (
              <span className={`absolute text-[10px] font-medium bg-orange-500 text-white px-2 py-0.5 rounded-full z-10 ${isLarge ? 'top-2 right-2' : 'top-1/2 -translate-y-1/2 right-3'}`}>
                En cours
              </span>
            )}
            <Icon className={isLarge ? "w-12 h-12 text-primary mb-4" : "w-12 h-12 text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300"} />
            <div className={isLarge ? "" : "flex-1 min-w-0"}>
              <h2 className={isLarge ? "text-xl font-bold text-foreground mb-2" : "text-lg font-bold text-foreground truncate"}>{currentCard.title}</h2>
              <p className={isLarge ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground truncate"}>{currentCard.description}</p>
            </div>
          </Link>
        );
      } else {
        allElements.push(
          <div key={currentCard.id} className={baseClassName}>
            <Icon className={isLarge ? "w-12 h-12 text-primary mb-4" : "w-12 h-12 text-primary flex-shrink-0"} />
            <div className={isLarge ? "" : "flex-1 min-w-0"}>
              <h2 className={isLarge ? "text-xl font-bold text-foreground mb-2" : "text-lg font-bold text-foreground truncate"}>{currentCard.title}</h2>
              <p className={isLarge ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground truncate"}>{currentCard.description}</p>
            </div>
          </div>
        );
      }
    }
    
    // Après "Mes demandes de support", insérer Actions à mener
    if (index === supportCardIndex && !actionsRendered) {
      if (actionsCard) {
        const isLocked = !agence;
        
        if (!isLocked && agence) {
          allElements.push(
            <div key={actionsCard.id} className="min-h-[240px]">
              <ApiToggleProvider>
                <AgencyProvider>
                  <ActionsAMenerCard />
                </AgencyProvider>
              </ApiToggleProvider>
            </div>
          );
        } else {
          allElements.push(
            <div
              key={actionsCard.id}
              onClick={() => {
                toast({
                  title: 'Accès restreint',
                  description: 'Vous devez être rattaché à une agence',
                  variant: 'destructive',
                });
              }}
              className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20 rounded-2xl p-4 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 cursor-pointer opacity-60 min-h-[240px] flex items-center justify-center"
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Lock className="w-12 h-12 text-destructive drop-shadow-lg" />
              </div>
            </div>
          );
        }
        actionsRendered = true;
      }
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
      {allElements}
    </div>
  );
}

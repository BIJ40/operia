import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableAccordionItemProps } from './types';
import { HiddenTitleSection } from './HiddenTitleSection';
import { TipsSection } from './TipsSection';
import { AccordionSection } from './AccordionSection';

export function CategorySortableItem({
  section,
  category,
  isEditMode,
  canEdit,
  availableCategories,
  editingId,
  scope,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveToCategory,
  onAddSection,
  onAddTips,
}: SortableAccordionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: editingId === section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  // Si hideTitle est activé et ce n'est pas un TIPS ni une section figée
  if (section.hideTitle && !section.isSingleSection && section.contentType !== 'tips') {
    return (
      <div ref={setNodeRef} style={style} className="mb-4">
        <HiddenTitleSection
          section={section}
          category={category}
          isEditMode={isEditMode}
          canEdit={canEdit}
          availableCategories={availableCategories}
          dragAttributes={attributes}
          dragListeners={listeners}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onMoveToCategory={onMoveToCategory}
          onAddSection={onAddSection}
          onAddTips={onAddTips}
        />
      </div>
    );
  }

  // Si c'est une section figée OU un TIPS
  if (section.isSingleSection || section.contentType === 'tips') {
    return (
      <div ref={setNodeRef} style={style} className="mb-4">
        <TipsSection
          section={section}
          category={category}
          isEditMode={isEditMode}
          canEdit={canEdit}
          availableCategories={availableCategories}
          scope={scope}
          dragAttributes={attributes}
          dragListeners={listeners}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onMoveToCategory={onMoveToCategory}
          onAddSection={onAddSection}
          onAddTips={onAddTips}
        />
      </div>
    );
  }

  // Section accordéon standard
  return (
    <div ref={setNodeRef} style={style}>
      <AccordionSection
        section={section}
        category={category}
        isEditMode={isEditMode}
        canEdit={canEdit}
        availableCategories={availableCategories}
        scope={scope}
        dragAttributes={attributes}
        dragListeners={listeners}
        onEdit={onEdit}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveToCategory={onMoveToCategory}
        onAddSection={onAddSection}
        onAddTips={onAddTips}
      />
    </div>
  );
}

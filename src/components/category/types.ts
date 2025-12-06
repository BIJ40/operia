import { Block, ColorPreset, TipsType } from '@/types/block';

export type CategoryScope = 'apogee' | 'helpconfort' | 'apporteurs';

export interface Section extends Block {
  contentType?: 'section' | 'tips';
  tipsType?: TipsType;
  summary?: string;
  showSummary?: boolean;
  hideTitle?: boolean;
  isSingleSection?: boolean;
}

export interface CategoryBlock extends Block {
  type: 'category';
}

export interface SectionEditData {
  title: string;
  content: string;
  colorPreset: ColorPreset;
  hideFromSidebar: boolean;
  isSingleSection?: boolean;
}

export interface SortableAccordionItemProps {
  section: Section;
  category: CategoryBlock;
  isEditMode: boolean;
  /** V2: Renamed from isAdmin - indicates if user can edit content */
  canEdit: boolean;
  availableCategories: Block[];
  editingId: string | null;
  scope: CategoryScope;
  onEdit: (sectionId: string) => void;
  onDelete: (sectionId: string) => void;
  onDuplicate: (sectionId: string) => void;
  onMoveToCategory: (sectionId: string, categoryId: string) => void;
  onAddSection: (afterSectionId: string) => void;
  onAddTips: (afterSectionId: string) => void;
}

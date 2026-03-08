import React from 'react';

export type ColorPreset = 'red' | 'blanc' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export interface HomeCard {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: string;
  color_preset: ColorPreset;
  display_order: number;
  is_logo?: boolean;
  size?: 'normal' | 'large';
}

export interface SortableCardProps {
  card: HomeCard;
  editingId: string | null;
  editTitle: string;
  editDescription: string;
  editLink: string;
  editIcon: string;
  editColor: ColorPreset;
  isEditMode: boolean;
  onEditTitleChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditLinkChange: (value: string) => void;
  onEditIconChange: (value: string) => void;
  onEditColorChange: (value: ColorPreset) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  getColorClass: (color?: ColorPreset) => string;
  IconComponent: (iconName: string) => React.ComponentType<{ className?: string }> | undefined;
}

export const getColorClass = (color?: ColorPreset) => {
  const colors = {
    red: 'bg-red-50 border-red-200 hover:border-red-300',
    blanc: 'bg-white border-gray-300 hover:border-gray-400',
    blue: 'bg-blue-50 border-blue-200 hover:border-blue-300',
    green: 'bg-green-50 border-green-200 hover:border-green-300',
    yellow: 'bg-yellow-50 border-yellow-200 hover:border-yellow-300',
    purple: 'bg-purple-50 border-purple-200 hover:border-purple-300',
    orange: 'bg-orange-50 border-orange-200 hover:border-orange-300',
  };
  return colors[color || 'blue'] || colors.blue;
};

export const getIconComponent = (iconName: string, Icons: Record<string, React.ComponentType<{ className?: string }>>) => {
  return Icons[iconName] || Icons.BookOpen;
};

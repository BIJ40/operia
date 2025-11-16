export type ColorPreset = "white" | "blanc" | "gray" | "green" | "yellow" | "red" | "blue" | "purple" | "pink" | "orange" | "cyan" | "indigo" | "teal" | "rose";
export type BlockType = "category" | "subcategory" | "section" | "home_card";

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

export type ContentType = 'section' | 'tips';
export type TipsType = 'danger' | 'warning' | 'success' | 'information';

export interface Block {
  id: string;
  type: BlockType;
  title: string;
  content: string;
  icon?: string;
  colorPreset: ColorPreset;
  order: number;
  slug: string;
  parentId?: string;
  attachments: Attachment[];
  hideFromSidebar?: boolean;
  showTitleOnCard?: boolean;
  showTitleInMenu?: boolean;
  isSingleSection?: boolean;
  contentType?: ContentType;
  tipsType?: TipsType;
  summary?: string;
  showSummary?: boolean;
}

export interface AppData {
  blocks: Block[];
  version: string;
  lastModified: number;
}

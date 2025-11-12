export type ColorPreset = "good" | "tip" | "bad" | "none";
export type BlockSize = "sm" | "md" | "lg" | "xl";

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface Block {
  id: string;
  type: string;
  title: string;
  content: string; // JSON from TipTap editor
  icon?: string; // lucide icon name
  colorPreset: ColorPreset;
  order: number;
  size: BlockSize;
  slug?: string;
  pinned: boolean;
  attachments: Attachment[];
  parentId?: string; // For sub-blocks
}

export interface AppData {
  blocks: Block[];
  version: string;
  lastModified: number;
}

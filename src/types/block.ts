export type ColorPreset = "white" | "blanc" | "gray" | "green" | "yellow" | "red" | "blue" | "purple" | "pink" | "orange" | "cyan" | "indigo" | "teal" | "rose";
export type BlockType = "category" | "section";

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

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
}

export interface AppData {
  blocks: Block[];
  version: string;
  lastModified: number;
}

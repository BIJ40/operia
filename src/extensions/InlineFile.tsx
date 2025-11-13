import { Node, mergeAttributes } from '@tiptap/core';

export interface InlineFileOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineFile: {
      setInlineFile: (options: { src: string; filename: string }) => ReturnType;
    };
  }
}

export const InlineFile = Node.create<InlineFileOptions>({
  name: 'inlineFile',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      filename: {
        default: 'fichier',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-inline-file]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const fileExtension = HTMLAttributes.filename?.split('.').pop()?.toUpperCase() || 'FILE';
    
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-inline-file': '',
        class: 'inline-block my-4',
      }),
      [
        'a',
        {
          href: HTMLAttributes.src,
          download: HTMLAttributes.filename,
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-accent transition-all max-w-xs',
        },
        [
          'div',
          { class: 'w-16 h-16 bg-primary/10 rounded flex items-center justify-center' },
          ['span', { class: 'text-2xl font-bold text-primary' }, '📎'],
        ],
        [
          'div',
          { class: 'text-center' },
          ['div', { class: 'text-xs font-medium text-primary' }, fileExtension],
          ['div', { class: 'text-sm text-muted-foreground truncate max-w-[200px]' }, HTMLAttributes.filename],
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setInlineFile:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

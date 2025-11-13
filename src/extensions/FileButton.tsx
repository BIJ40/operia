import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface FileButtonOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileButton: {
      setFileButton: (options: { src: string; label: string; filename: string }) => ReturnType;
    };
  }
}

export const FileButton = Node.create<FileButtonOptions>({
  name: 'fileButton',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      label: {
        default: 'Voir',
      },
      filename: {
        default: 'fichier',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-file-button]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-file-button': '',
        href: HTMLAttributes.src,
        download: HTMLAttributes.filename,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'inline-flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm font-medium',
      }),
      ['span', { class: 'text-xs' }, '📎'],
      ['span', {}, HTMLAttributes.label],
    ];
  },

  addCommands() {
    return {
      setFileButton:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('fileButtonHandler'),
        props: {
          handleDOMEvents: {
            click(view, event) {
              const target = event.target as HTMLElement;
              const link = target.closest('a[data-file-button]') as HTMLAnchorElement;
              
              if (link) {
                event.preventDefault();
                event.stopPropagation();
                // Le téléchargement se fera via l'attribut download du lien
                window.open(link.href, '_blank');
                return true;
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});

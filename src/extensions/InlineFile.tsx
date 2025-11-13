import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { FilePreview } from '@/components/FilePreview';

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

  addNodeView() {
    return ReactNodeViewRenderer(({ node }) => {
      return (
        <NodeViewWrapper className="inline-block my-4">
          <FilePreview src={node.attrs.src} filename={node.attrs.filename} />
        </NodeViewWrapper>
      );
    });
  },
});

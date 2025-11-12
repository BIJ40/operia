import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { NodeViewProps } from '@tiptap/core';

export interface ImageButtonOptions {
  HTMLAttributes: Record<string, any>;
}

const ImageButtonComponent = ({ node }: NodeViewProps) => {
  const imageUrl = node.attrs.src;
  
  return (
    <NodeViewWrapper>
      <div style={{ margin: '16px 0' }}>
        <button 
          data-image-modal={imageUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          <span style={{ fontSize: '18px' }}>👁️</span> Voir l'image
        </button>
      </div>
    </NodeViewWrapper>
  );
};

export const ImageButton = Node.create<ImageButtonOptions>({
  name: 'imageButton',
  group: 'block',
  atom: true,
  
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-src'),
        renderHTML: (attributes) => {
          return {
            'data-src': attributes.src,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-image-button]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          const src = element.getAttribute('data-src');
          return { src };
        },
      },
      // Reconnaître les anciens boutons HTML
      {
        tag: 'button[data-image-modal]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          const src = element.getAttribute('data-image-modal');
          return { src };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-image-button': '' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageButtonComponent);
  },
});

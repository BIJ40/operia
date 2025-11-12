import { Node, mergeAttributes } from '@tiptap/core';

export interface ImageButtonOptions {
  HTMLAttributes: Record<string, any>;
}

export const ImageButton = Node.create<ImageButtonOptions>({
  name: 'imageButton',
  group: 'block',
  atom: true,
  
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          // Essayer plusieurs attributs
          return element.getAttribute('data-src') || 
                 element.querySelector('button')?.getAttribute('data-image-modal') || 
                 null;
        },
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
      },
      // Reconnaître les anciens boutons HTML directs
      {
        tag: 'div',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          const button = element.querySelector('button[data-image-modal]');
          if (button) {
            const src = button.getAttribute('data-image-modal');
            return src ? { src } : false;
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src;
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 
        'data-image-button': '',
        style: 'margin: 16px 0;'
      }),
      [
        'button',
        {
          'data-image-modal': src,
          style: 'display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: #3b82f6; color: white; border-radius: 6px; border: none; cursor: pointer; font-weight: 500;'
        },
        ['span', { style: 'font-size: 18px;' }, '👁️'],
        ' Voir l\'image'
      ]
    ];
  },
});


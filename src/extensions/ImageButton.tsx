import { Node, mergeAttributes } from '@tiptap/core';

export interface ImageButtonOptions {
  HTMLAttributes: Record<string, any>;
}

export const ImageButton = Node.create<ImageButtonOptions>({
  name: 'imageButton',
  group: 'inline',
  inline: true,
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
      label: {
        default: 'Voir',
        parseHTML: (element) => {
          return element.getAttribute('data-label') || 
                 element.querySelector('button')?.textContent?.trim().replace('👁️', '').trim() || 
                 'Voir';
        },
        renderHTML: (attributes) => {
          return {
            'data-label': attributes.label || 'Voir',
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-image-button]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          
          const src = element.getAttribute('data-src');
          const label = element.getAttribute('data-label') || 'Voir';
          
          return src ? { src, label } : false;
        },
      },
      // Reconnaître les anciens formats (div)
      {
        tag: 'div[data-image-button]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          
          let src = element.getAttribute('data-src');
          const label = element.getAttribute('data-label') || 'Voir';
          
          if (!src) {
            const button = element.querySelector('button[data-image-modal]');
            if (button) {
              src = button.getAttribute('data-image-modal');
            }
          }
          
          return src ? { src, label } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src || HTMLAttributes['data-src'];
    const label = HTMLAttributes.label || HTMLAttributes['data-label'] || 'Voir';
    return [
      'span',
      { 
        'data-image-button': '',
        'data-src': src,
        'data-label': label,
        style: 'display: inline-block; vertical-align: middle; margin: 0 4px;'
      },
      [
        'button',
        {
          'data-image-modal': src,
          type: 'button',
          class: 'image-preview-btn',
          style: 'display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: transparent; color: #3b82f6; border: 1px solid #e5e7eb; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s ease; vertical-align: middle;'
        },
        ['span', { style: 'font-size: 14px;' }, '👁️'],
        ' ' + label
      ]
    ];
  },
});


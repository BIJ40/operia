import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { NodeViewProps } from '@tiptap/core';

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (type: 'warning' | 'info' | 'tip' | 'danger') => ReturnType;
    };
  }
}

const CalloutComponent = ({ node, deleteNode }: NodeViewProps) => {
  const type = node.attrs.type as 'warning' | 'info' | 'tip' | 'danger';
  
  const styles = {
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-l-yellow-500',
      icon: '⚠️',
      label: 'Attention',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-l-blue-500',
      icon: 'ℹ️',
      label: 'Information',
    },
    tip: {
      bg: 'bg-green-50',
      border: 'border-l-green-500',
      icon: '💡',
      label: 'Astuce',
    },
    danger: {
      bg: 'bg-red-50',
      border: 'border-l-red-500',
      icon: '🚨',
      label: 'Danger',
    },
  };

  const style = styles[type];

  return (
    <NodeViewWrapper>
      <div className={`${style.bg} ${style.border} border-l-4 p-4 rounded-lg my-4 relative group`}>
        <div className="font-bold mb-2">
          <span className="mr-2">{style.icon}</span>
          {style.label}
        </div>
        <NodeViewContent as="div" className="text-sm text-gray-800 [&>p]:my-1" />
      </div>
    </NodeViewWrapper>
  );
};

export const Callout = Node.create<CalloutOptions>({
  name: 'callout',
  group: 'block',
  content: 'block+',
  
  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-type'),
        renderHTML: (attributes) => {
          return {
            'data-type': attributes.type,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutComponent);
  },

  addCommands() {
    return {
      setCallout:
        (type) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { type },
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Votre texte ici...',
                  },
                ],
              },
            ],
          });
        },
    };
  },
});

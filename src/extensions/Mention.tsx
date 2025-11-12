import { Node, mergeAttributes } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import { MentionList } from '@/components/MentionList';
import { MentionSuggestion } from '@/lib/mentions';
import tippy, { Instance as TippyInstance } from 'tippy.js';

export const Mention = Node.create({
  name: 'mention',

  addOptions() {
    return {
      HTMLAttributes: {},
      renderLabel({ node }) {
        return `${node.attrs.prefix}${node.attrs.label}`;
      },
      suggestion: {
        char: '',
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: props,
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run();
        },
      },
    };
  },

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-id': attributes.id,
          };
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) {
            return {};
          }
          return {
            'data-label': attributes.label,
          };
        },
      },
      prefix: {
        default: '@',
        parseHTML: element => element.getAttribute('data-prefix'),
        renderHTML: attributes => {
          if (!attributes.prefix) {
            return {};
          }
          return {
            'data-prefix': attributes.prefix,
          };
        },
      },
      slug: {
        default: null,
      },
      categorySlug: {
        default: null,
      },
      type: {
        default: 'category',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-mention]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-mention': '', 'class': 'mention' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      this.options.renderLabel({
        options: this.options,
        node,
      }),
    ];
  },

  renderText({ node }) {
    return this.options.renderLabel({
      options: this.options,
      node,
    });
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isMention = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isMention = true;
              tr.insertText('', pos, pos + node.nodeSize);

              return false;
            }
          });

          return isMention;
        }),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export function createMentionSuggestion(
  items: MentionSuggestion[],
  prefix: '@' | '#'
): Omit<SuggestionOptions, 'editor'> {
  return {
    char: prefix,
    items: ({ query }) => {
      return items
        .filter(item =>
          item.label.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10);
    },
    render: () => {
      let component: ReactRenderer<any>;
      let popup: TippyInstance[];

      return {
        onStart: props => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as any,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },

        onUpdate(props) {
          component.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup[0].setProps({
            getReferenceClientRect: props.clientRect as any,
          });
        },

        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            popup[0].hide();
            return true;
          }

          return component.ref?.onKeyDown(props);
        },

        onExit() {
          popup[0].destroy();
          component.destroy();
        },
      };
    },
    command: ({ editor, range, props }) => {
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: 'mention',
            attrs: {
              id: props.id,
              label: props.label,
              prefix,
              slug: props.slug,
              categorySlug: props.categorySlug,
              type: props.type,
            },
          },
          {
            type: 'text',
            text: ' ',
          },
        ])
        .run();
    },
  };
}

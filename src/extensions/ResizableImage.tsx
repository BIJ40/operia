import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react';
import { useState, useRef, useEffect } from 'react';

const ResizableImageComponent = ({ node, updateAttributes, selected }: ReactNodeViewProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: node.attrs.width || 300,
    height: node.attrs.height || 200,
  });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const aspectRatioRef = useRef(1);
  const currentDimensionsRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (imageRef.current && !node.attrs.width) {
      // Get natural dimensions on first load
      const img = imageRef.current;
      if (img.complete) {
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        aspectRatioRef.current = aspectRatio;
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        updateAttributes({ width: img.naturalWidth, height: img.naturalHeight });
      } else {
        img.onload = () => {
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          aspectRatioRef.current = aspectRatio;
          setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          updateAttributes({ width: img.naturalWidth, height: img.naturalHeight });
        };
      }
    } else if (node.attrs.width && node.attrs.height) {
      aspectRatioRef.current = node.attrs.width / node.attrs.height;
      setDimensions({ width: node.attrs.width, height: node.attrs.height });
    }
  }, [node.attrs.src]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: dimensions.width,
      height: dimensions.height,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startPosRef.current.x;
      const deltaY = moveEvent.clientY - startPosRef.current.y;
      
      // Use the larger delta to maintain aspect ratio
      const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      
      const newWidth = Math.max(50, startPosRef.current.width + delta);
      const newHeight = newWidth / aspectRatioRef.current;

      // Store in ref for immediate access
      currentDimensionsRef.current = { width: newWidth, height: newHeight };
      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      
      // Use the ref values which are up-to-date
      const finalWidth = Math.round(currentDimensionsRef.current.width);
      const finalHeight = Math.round(currentDimensionsRef.current.height);
      
      // Update attributes with the final dimensions
      updateAttributes({ width: finalWidth, height: finalHeight });
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <NodeViewWrapper className="resizable-image-wrapper inline-block relative">
      <div
        ref={containerRef}
        className={`relative inline-block group ${selected ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          title={node.attrs.title || ''}
          className="max-w-full h-auto rounded-lg block"
          style={{ width: dimensions.width, height: dimensions.height }}
          draggable={false}
        />
        
        {/* Bouton "Voir l'image" qui apparaît au survol */}
        <button
          data-image-modal={node.attrs.src}
          className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity shadow-lg flex items-center gap-1"
          type="button"
        >
          <span>👁️</span>
          <span>Voir</span>
        </button>
        
        {selected && (
          <>
            {/* Corner resize handles */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full cursor-se-resize border-2 border-background shadow-md"
              style={{ transform: 'translate(50%, 50%)' }}
              onMouseDown={handleMouseDown}
            />
            <div
              className="absolute top-0 right-0 w-4 h-4 bg-primary rounded-full cursor-ne-resize border-2 border-background shadow-md"
              style={{ transform: 'translate(50%, -50%)' }}
              onMouseDown={handleMouseDown}
            />
            <div
              className="absolute bottom-0 left-0 w-4 h-4 bg-primary rounded-full cursor-sw-resize border-2 border-background shadow-md"
              style={{ transform: 'translate(-50%, 50%)' }}
              onMouseDown={handleMouseDown}
            />
            <div
              className="absolute top-0 left-0 w-4 h-4 bg-primary rounded-full cursor-nw-resize border-2 border-background shadow-md"
              style={{ transform: 'translate(-50%, -50%)' }}
              onMouseDown={handleMouseDown}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const ResizableImage = Node.create({
  name: 'resizableImage',

  group: 'inline',
  
  inline: true,

  draggable: false,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => element.getAttribute('src'),
        renderHTML: attributes => {
          if (!attributes.src) {
            return {};
          }
          return { src: attributes.src };
        },
      },
      alt: {
        default: null,
        parseHTML: element => element.getAttribute('alt'),
        renderHTML: attributes => {
          if (!attributes.alt) {
            return {};
          }
          return { alt: attributes.alt };
        },
      },
      title: {
        default: null,
        parseHTML: element => element.getAttribute('title'),
        renderHTML: attributes => {
          if (!attributes.title) {
            return {};
          }
          return { title: attributes.title };
        },
      },
      width: {
        default: null,
        parseHTML: element => {
          const width = element.getAttribute('width');
          return width ? parseInt(width, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          const height = element.getAttribute('height');
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return { height: attributes.height };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          
          const width = element.getAttribute('width');
          const height = element.getAttribute('height');
          const src = element.getAttribute('src');
          const alt = element.getAttribute('alt');
          const title = element.getAttribute('title');
          
          return {
            src,
            alt,
            title,
            width: width ? parseInt(width, 10) : null,
            height: height ? parseInt(height, 10) : null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { class: 'rounded-lg' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});

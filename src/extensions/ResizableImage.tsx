import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react';
import { useState, useRef, useEffect } from 'react';

interface ExtendedNodeViewProps extends ReactNodeViewProps {
  editor: any;
  getPos: () => number | undefined;
  deleteNode: () => void;
}

const ResizableImageComponent = ({ node, updateAttributes, selected, editor, getPos, deleteNode }: ExtendedNodeViewProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreviewPos, setDragPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [hasError, setHasError] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: node.attrs.width || 300,
    height: node.attrs.height || 200,
  });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const aspectRatioRef = useRef(1);
  const currentDimensionsRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (imageRef.current && !node.attrs.width) {
      // Get natural dimensions on first load
      const img = imageRef.current;
      const loadHandler = () => {
        if (img.naturalWidth && img.naturalHeight) {
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          aspectRatioRef.current = aspectRatio;
          const newWidth = img.naturalWidth;
          const newHeight = img.naturalHeight;
          setDimensions({ width: newWidth, height: newHeight });
          updateAttributes({ width: newWidth, height: newHeight });
        }
      };

      if (img.complete && img.naturalWidth) {
        loadHandler();
      } else {
        img.addEventListener('load', loadHandler);
        return () => img.removeEventListener('load', loadHandler);
      }
    } else if (node.attrs.width && node.attrs.height) {
      aspectRatioRef.current = node.attrs.width / node.attrs.height;
      setDimensions({ width: node.attrs.width, height: node.attrs.height });
    }
  }, [node.attrs.src, node.attrs.width, node.attrs.height]);

  
  const handleDragStart = (e: React.MouseEvent) => {
    if (isResizing) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY
    };

    const handleDragMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const editorView = editor.view;
      const coords = editorView.posAtCoords({ left: e.clientX, top: e.clientY });
      
      if (coords) {
        // Obtenir les coordonnées du DOM pour cette position
        const domCoords = editorView.coordsAtPos(coords.pos);
        setDragPreviewPos({ x: domCoords.left, y: domCoords.top });
      }
    };

    const handleDragEnd = (e: MouseEvent) => {
      setIsDragging(false);
      setDragPreviewPos(null);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);

      // Trouver la position dans l'éditeur
      const pos = getPos();
      if (typeof pos !== 'number') return;

      const editorView = editor.view;
      const editorRect = editorView.dom.getBoundingClientRect();
      
      // Vérifier que le drop est bien dans l'éditeur
      if (e.clientX < editorRect.left || 
          e.clientX > editorRect.right || 
          e.clientY < editorRect.top || 
          e.clientY > editorRect.bottom) {
        // Drop en dehors de l'éditeur - annuler
        return;
      }
      
      const coords = editorView.posAtCoords({ left: e.clientX, top: e.clientY });
      
      if (coords && coords.pos >= 0 && coords.pos <= editorView.state.doc.content.size) {
        const { state, dispatch } = editorView;
        const nodeSize = node.nodeSize;
        const tr = state.tr;
        
        tr.delete(pos, pos + nodeSize);
        
        let newPos = coords.pos;
        if (newPos > pos) {
          newPos -= nodeSize;
        }
        
        // Valider que la nouvelle position est valide
        if (newPos >= 0 && newPos <= tr.doc.content.size) {
          tr.insert(newPos, node);
          dispatch(tr);
        }
      }
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleMouseDown = (e: React.MouseEvent, corner: string) => {
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
      
      // Calculate delta based on corner
      let delta = 0;
      if (corner === 'bottom-right') {
        delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      } else if (corner === 'bottom-left') {
        delta = Math.abs(deltaX) > Math.abs(deltaY) ? -deltaX : deltaY;
      } else if (corner === 'top-right') {
        delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : -deltaY;
      } else if (corner === 'top-left') {
        delta = Math.abs(deltaX) > Math.abs(deltaY) ? -deltaX : -deltaY;
      }
      
      const newWidth = Math.max(50, startPosRef.current.width + delta);
      const newHeight = newWidth / aspectRatioRef.current;

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
    <>
      <NodeViewWrapper
        className="react-component"
        data-drag-handle
        style={{
          cursor: isDragging ? 'grabbing' : (selected ? 'grab' : 'default'),
          display: 'inline-block',
          margin: 0,
          padding: 0,
          width: dimensions.width,
          height: dimensions.height,
          verticalAlign: 'baseline'
        }}
      >
        <div
          ref={containerRef}
          className={`relative group ${isDragging ? 'opacity-30' : ''}`}
          style={{ 
            width: dimensions.width, 
            height: dimensions.height,
            outline: selected ? '2px solid hsl(var(--primary))' : 'none',
            outlineOffset: '0px',
            borderRadius: '0.5rem',
            display: 'block'
          }}
          onMouseDown={selected ? handleDragStart : undefined}
        >
        {hasError ? (
          <div 
            className="flex items-center justify-center bg-muted text-muted-foreground rounded-lg"
            style={{ width: dimensions.width, height: dimensions.height }}
          >
            <div className="text-center p-4">
              <span className="text-2xl mb-2">⚠️</span>
              <p className="text-sm">Image non disponible</p>
            </div>
          </div>
        ) : (
          <img
            ref={imageRef}
            src={node.attrs.src}
            alt={node.attrs.alt || ''}
            title={node.attrs.title || ''}
            className="max-w-full h-auto rounded-lg block"
            style={{ 
              width: dimensions.width, 
              height: dimensions.height,
              maxWidth: '100%'
            }}
            draggable={false}
            data-no-modal="true"
            onError={() => setHasError(true)}
          />
        )}
        
        {selected && (
          <>
            {/* Corner resize handles */}
            <div
              className="absolute bg-primary rounded-full cursor-se-resize border-2 border-background shadow-md z-10"
              style={{ 
                width: '12px', 
                height: '12px',
                bottom: '-6px',
                right: '-6px',
                boxSizing: 'content-box'
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, 'bottom-right');
              }}
            />
            <div
              className="absolute bg-primary rounded-full cursor-ne-resize border-2 border-background shadow-md z-10"
              style={{ 
                width: '12px', 
                height: '12px',
                top: '-6px',
                right: '-6px',
                boxSizing: 'content-box'
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, 'top-right');
              }}
            />
            <div
              className="absolute bg-primary rounded-full cursor-sw-resize border-2 border-background shadow-md z-10"
              style={{ 
                width: '12px', 
                height: '12px',
                bottom: '-6px',
                left: '-6px',
                boxSizing: 'content-box'
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, 'bottom-left');
              }}
            />
            <div
              className="absolute bg-primary rounded-full cursor-nw-resize border-2 border-background shadow-md z-10"
              style={{ 
                width: '12px', 
                height: '12px',
                top: '-6px',
                left: '-6px',
                boxSizing: 'content-box'
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, 'top-left');
              }}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  </>
  );
};

export const ResizableImage = Node.create({
  name: 'resizableImage',

  group: 'inline',
  
  inline: true,

  draggable: true,

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
    return ['img', mergeAttributes(HTMLAttributes, { 
      class: 'rounded-lg'
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
